const path = require('path');
const Piscina = require('piscina');
const { MessageEmbed, WebhookClient } = require('discord.js')
const Web3 = require('web3')
const AccountFactory = require('./account_factory')
const logger = require('./logger')
const ethers = require('ethers');


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
    }

    async sendDeploymentContract(contract, contractJson) {
        return new Promise(async (resolve) => {
            const instance = await contract
                .deploy({
                    data: contractJson.bytecode,
                    arguments: ["Name", "Symbol"],
                })
                .send({
                    from: this.account.address,
                    nonce: (await this.web3.eth.getTransactionCount(this.account.address)),
                    gas: 2000000,
                });
            resolve(instance);
        });
    }

    async deployContract(jsonPath, name) {
        try {
            console.log("\ndeploying contract: ", name);
            const contractJson = require(jsonPath);

            const contract = new this.web3.eth.Contract(contractJson.abi);
            const instance = await this.sendDeploymentContract(contract, contractJson);

            this.contracts[name] = instance.options.address;
            console.log(`contract ${name} deployed to ${instance.options.address}`);
        } catch (e) {
            logger.error("deploy contract err: ", e)
            await this.deployContract(jsonPath, name)
        }
    }

    async run() {
        // let tasks = [];
        this.log_benchmark_config_info()
        await this.prepare()
        for (let i in this.config.benchmark_cases) {
            let benchmarkCase = this.config.benchmark_cases[i];
            console.log(`benchmark case ${i}: ${benchmarkCase}`);
            await this.start()
            await this.exec(benchmarkCase)
            await this.end()
            this.log_benchmark_res()
            await this.send_discord()
        }
    }

    async prepare() {
        console.log('preparing...');
        await this.deployContract("./ERC20.json", "ERC20");
        console.log('\nprepared');
    }

    async exec(benchmarkCase) {
        let accountFactory = new AccountFactory()
        let accounts = await accountFactory.get_accounts(this.config, 100000000000, this.config.thread_num)

        const piscina = new Piscina({
            filename: path.resolve(__dirname, 'worker.js')
        })

        let tasks = []
        for (const index in accounts) {
            tasks.push(piscina.run({benchmarkCase, contracts: this.contracts, config: {...this.config}, private_key: accounts[index].privateKey}))
        }

        const res = await Promise.all(tasks)
        this.benchmark_info.res = res
    }

    async start() {
        this.benchmark_info.start_block_number = await this.web3.eth.getBlockNumber()
        this.benchmark_info.start_time = performance.now()

    }

    async end() {
        this.benchmark_info.end_time = performance.now()
        this.benchmark_info.end_block_number = await this.web3.eth.getBlockNumber()
        this.benchmark_info.transfer_count = this.benchmark_info.res.reduce((total, res) => res.transfer_count)
        this.benchmark_info.success_transfer_count = this.benchmark_info.res.reduce((total, res) => res.success_tx)
        this.benchmark_info.fail_transfer_count = this.benchmark_info.res.reduce((total, res) => res.fail_tx)
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
