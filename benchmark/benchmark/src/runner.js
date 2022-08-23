const path = require('path');
const Piscina = require('piscina');
const { MessageEmbed, WebhookClient } = require('discord.js')
const Web3 = require('web3')
const AccountFactory = require('./account_factory')
const logger = require('./logger')
const ethers = require('ethers');
const { abi: ERC20ABI } = require("./ERC20.json");

const { createPool } = require('./uniswapV3_benchmark');

class Runner {

    constructor(config) {
        this.config = config
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.http_endpoint))
        this.discord = new WebhookClient({ id: config.id, token: config.token })

        this.benchmark_info = {
            start_time: 0,
            end_time: 0,
            transfer_count: 0,
            success_transfer_count: 0,
            fail_transfer_count: 0,
            start_block_number: 0,
            end_block_number: 0,
            total_time: 0,
            res: [],
        }

        this.account = this.web3.eth.accounts.wallet.add(this.config.private_key);
        this.contracts = {};

        this.provider = new ethers.providers.JsonRpcProvider(config.http_endpoint);
        this.signer = new ethers.Wallet(config.private_key, this.provider);

        this.chainId = 0;
    }

    async getNonce() {
        return this.web3.eth.getTransactionCount(this.account.address);
    }

    async sendDeploymentContract(contract, contractJson, args, gNonce) {
        const nonce = gNonce || await this.getNonce();

        return contract
            .deploy({
                data: contractJson.bytecode,
                arguments: args,
            })
            .send({
                from: this.account.address,
                nonce,
                gas: 2000000,
            });
    }

    async deployContract(jsonPath, name, args, gNonce) {
        try {
            console.log("\ndeploying contract: ", name);
            const contractJson = require(jsonPath);

            const contract = new this.web3.eth.Contract(contractJson.abi);
            const instance = await this.sendDeploymentContract(
                contract,
                contractJson,
                args,
                gNonce,
            );

            const { address } = instance.options;
            this.contracts[name] = address;
            console.log(`\ncontract ${name} deployed to ${address}`);

            return address;
        } catch (e) {
            logger.error("deploy contract err: ", e)
            console.log(e);
            await this.deployContract(jsonPath, name, args, gNonce)
        }
    }

    async approveERC20({ address, signer, to, nonce }) {
        const contract = new ethers.Contract(address, ERC20ABI, signer);
        await (await contract.approve(
            to,
            ethers.constants.MaxUint256.toString(),
            { nonce },
        )).wait();

        console.log(`\napproved ${address} from ${signer.address} to ${to}`);
    }

    async prepare() {
        console.log('preparing...');

        const nonce = await this.getNonce();
        this.chainId = (await this.provider.getNetwork()).chainId;

        const args = [
            "Name",
            "Symbol",
            this.signer.address,
            ethers.constants.MaxUint256.toString(),
        ];
        const [token0, token1] = await Promise.all([
            this.deployContract("./ERC20.json", "Token0", args, nonce),
            this.deployContract("./ERC20.json", "Token1", args, nonce + 1),
            this.deployContract("./ERC20.json", "ERC20", args, nonce + 2),
        ]);

        await Promise.all([
            this.approveERC20({
                address: token0,
                to: this.config.uniswapNonfungiblePositionManagerAddress,
                signer: this.signer,
                nonce: nonce + 3,
            }),
            this.approveERC20({
                address: token1,
                to: this.config.uniswapNonfungiblePositionManagerAddress,
                signer: this.signer,
                nonce: nonce + 4,
            }),
            this.approveERC20({
                address: token0,
                to: this.config.uniswapSwapRouterAddress,
                signer: this.signer,
                nonce: nonce + 5,
            }),
            this.approveERC20({
                address: token1,
                to: this.config.uniswapSwapRouterAddress,
                signer: this.signer,
                nonce: nonce + 6,
            }),
        ]);

        const pool = await createPool({
            token0,
            token1,
            chainId: this.chainId,
            uniswapNonfungiblePositionManagerAddress: this.config.uniswapNonfungiblePositionManagerAddress,
            signer: this.signer,
        });
        this.contracts["UniswapV3Pool"] = pool;

        console.log('\nprepared');
    }

    async run() {
        // let tasks = [];
        this.log_benchmark_config_info()
        await this.prepare()

        await this.start()
        await this.exec()
        await this.end()
        this.log_benchmark_res()
        await this.send_discord()
    }

    async exec() {
        const piscina = new Piscina({
            filename: path.resolve(__dirname, 'worker.js')
        })

        let tasks = []
        for (let i = 0; i < this.config.thread_num; i += 1) {
            tasks.push(
                piscina.run({
                    contracts: this.contracts,
                    config: {...this.config}
                })
            )
        }

        this.benchmark_info.res = await Promise.all(tasks);
    }

    async start() {
        this.benchmark_info.start_block_number = await this.web3.eth.getBlockNumber()
        this.benchmark_info.start_time = performance.now()

    }

    async end() {
        this.benchmark_info.end_time = performance.now()
        this.benchmark_info.end_block_number = await this.web3.eth.getBlockNumber()
        this.benchmark_info.transfer_count = this.benchmark_info.res.reduce((total, res) => total + res.transfer_count, 0)
        this.benchmark_info.success_transfer_count = this.benchmark_info.res.reduce((total, res) => total + res.success_tx, 0)
        this.benchmark_info.fail_transfer_count = this.benchmark_info.res.reduce((total, res) => total + res.fail_tx, 0)
        this.benchmark_info.total_time = this.benchmark_info.end_time - this.benchmark_info.start_time
    }

    get_success_rate() {
        return (this.benchmark_info.success_transfer_count / (this.benchmark_info.success_transfer_count + this.benchmark_info.fail_transfer_count)) * 100
    }

    get_average_time_elapsed() {
        return Math.max(this.benchmark_info.transfer_count, 1) / (this.benchmark_info.total_time / 1000)
    }

    async send_discord() {

        if(!this.config.token || !this.config.id) {
            return;
        }

        const embed = this.get_message_embed();
        await this.discord.send({
            content: ' ',
            username: 'axon-benchmark',
            avatarURL: 'https://i.imgur.com/AfFp7pu.png',
            embeds: [embed],
        })
    }

    get_message_embed() {
        return new MessageEmbed()
            .setTitle('axon benchmark')
            .setColor('#0099ff')
            .addField("benchmark time:", `${this.benchmark_info.total_time}`)
            .addField("start height:", `${this.benchmark_info.start_block_number}`)
            .addField("end height:", `${this.benchmark_info.end_block_number}`)
            .addField("transaction count:", `${this.benchmark_info.transfer_count}`)
            .addField("TPS:", `${this.get_average_time_elapsed()}`)
            .addField("transfer rate:", `${this.get_success_rate().toFixed(2)}`);
    }

    log_benchmark_config_info() {
        console.log('\n/////////////////////////////////////////////////////')
        console.log('benchmark time:', this.config.benchmark_time, 'ms')
        console.log(`endpoint: ${this.config.http_endpoint}`)
        console.log('/////////////////////////////////////////////////////\n')
        console.log('waiting...')
    }

    log_benchmark_res() {
        console.log('\n/////////////////////////////////////////////////////')
        console.log('benchmark time: ', this.benchmark_info.total_time, 'ms')
        console.log('transaction count:', this.benchmark_info.transfer_count)
        console.log('TPS:', this.get_average_time_elapsed(), 'ms')
        console.log('transfer rate:', `${this.get_success_rate().toFixed(2)}`)
        console.log('/////////////////////////////////////////////////////\n')
    }
}

module.exports = Runner
