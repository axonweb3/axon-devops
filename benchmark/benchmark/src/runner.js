const path = require("path");
const Piscina = require("piscina");
const { MessageEmbed, WebhookClient } = require("discord.js")
const ethers = require("ethers");
const fs = require("fs");
const NonceManager = require("./nonceManager");
const logger = require("./logger");

const { createPool } = require("./uniswapV3_benchmark");
const AccountFactory = require("./account_factory");

const MINT_TOKEN_AMOUNT = 1000000;

async function genApproveERC20Txs(contract, to, accountsWithTxs) {
    await Promise.all(accountsWithTxs.map(async ({ account, txs }) => {
        txs.push(await contract.connect(account.signer)
            .populateTransaction
            .approve(
                to,
                ethers.constants.MaxUint256,
            ),
        );
    }));

    return contract;
}

async function genMintERC20Txs(contract, accountsWithTxs) {
    await Promise.all(accountsWithTxs.map(async ({ account, txs }) => {
        txs.push(await contract.connect(account.signer)
            .populateTransaction
            .mint(
                account.address,
                MINT_TOKEN_AMOUNT,
            ),
        );
    }));

    return contract;
}

async function ensureTxsSent(provider, accountsWithTxs, batchSize) {
    const total = accountsWithTxs.reduce((tot, { txs }) => tot + txs.length, 0);
    let totalSent = 0;

    logger.info(`[Preparing] Sending ${total} txs...`);
    while (totalSent !== total) {
        let sentThisRound = 0;
        const errorThisRound = [];

        const sendingTxs = accountsWithTxs.map(({ account, txs }, i) => {
            if (sentThisRound >= batchSize) {
                return;
            }
            accountsWithTxs[i].txs = [];
            const sendingTxs = txs.map((tx) => {
                if (sentThisRound >= batchSize) {
                    accountsWithTxs[i].txs.push(tx);
                    return;
                }
                sentThisRound += 1;
                return account.signer
                    .sendTransaction({
                        ...tx,
                        nonce: account.getNonce(),
                    })
                    .then(({ hash }) => provider.waitForTransaction(hash, 1, 20000).then(() => hash))
                    .then((hash) => {
                        logger.debug(`[Preparing] Transaction ${hash} Sent`);
                        totalSent += 1;
                    })
                    .catch((err) => {
                        logger.error(err);
                        accountsWithTxs[i].txs.push(tx);
                        errorThisRound.push(i);
                    });
            });
            return Promise.all(sendingTxs);
        });
        await Promise.all(sendingTxs);

        if (errorThisRound.length !== 0) {
            const updatingNonces = errorThisRound
                .filter((e, i) => errorThisRound.indexOf(e) === i)  // Only distinct
                .map((e) => accountsWithTxs[e].account.updateNonce().catch((err) => logger.error(err)));
            await Promise.all(updatingNonces);
        }
        logger.info(`[Preparing] Transactions sent ${totalSent}/${total}`);
    }
}

class Runner {
    constructor(config) {
        this.config = config
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

        this.contracts = {};

        this.provider = new ethers.providers.JsonRpcBatchProvider(config.http_endpoint);
        this.signer = new NonceManager(
            new ethers.Wallet(config.private_key, this.provider),
        );

        this.chainId = 0;

        this.accounts = [];
    }

    hasCase(name) {
        return Object.keys(this.config.benchmark_cases)
            .some((k) => k.includes(name));
    }

    async deployContract(jsonPath, name, args) {
        logger.info(`[Preparing] Deploying contract ${name}...`);
        const contractJson = require(jsonPath);

        const factory = new ethers.ContractFactory(
            contractJson.abi,
            contractJson.bytecode,
            this.signer.signer,
        )
        const instance = await factory.deploy(...args, { nonce: this.signer.getNonce() });
        await instance.deployTransaction.wait();

        const { address } = instance;
        this.contracts[name] = address;
        logger.info(`[Preparing] Contract ${name} deployed to ${address}`);

        return instance;
    }

    async prepare() {
        await this.signer.updateNonce();

        // Reduce network usage
        const [network, feeData] = await Promise.all([
            this.provider.getNetwork(),
            this.provider.getFeeData(),
        ]);
        this.provider.getNetwork = async () => network;
        this.provider.getFeeData = async () => feeData;
        this.provider.estimateGas = async () => ethers.BigNumber.from(1000000);
        this.provider.getGasPrice = async () => feeData.gasPrice;

        this.chainId = network.chainId;

        try {
            const content = JSON.parse(fs.readFileSync(this.config.state_file));
            this.contracts = content.contracts;
            this.accounts = await Promise.all(content.accounts.map((pk) => {
                const acc = new NonceManager(new ethers.Wallet(pk, this.provider));
                return acc.updateNonce().then(() => acc);
            }));
        } catch (err) { }

        let gotNew = false;

        const totalAccountsNum = this.config.thread_num * this.config.accounts_num;
        if (this.accounts.length < totalAccountsNum) {
            gotNew = true;
            const accountFactory = new AccountFactory(
                this.signer,
                this.provider,
            );
            this.accounts = this.accounts.concat(
                await accountFactory.get_accounts(
                    10000000,
                    this.config.thread_num * this.config.accounts_num,
                    this.config,
                ),
            );
        }

        const args = [
            "Name",
            "Symbol",
            this.signer.address,
            MINT_TOKEN_AMOUNT,
        ];

        const deployingTokens = [];
        const accountsWithTxs = this.accounts.map((account) => ({ account, txs: [] }));
        accountsWithTxs.push({ account: this.signer, txs: [] });

        if (
            this.hasCase("/contract_benchmark")
            && !this.contracts.ERC20
        ) {
            gotNew = true;
            const deployingERC20 = this.deployContract(
                "./ERC20.json",
                "ERC20",
                args,
            )
                .then((c) => genMintERC20Txs(c, accountsWithTxs));

            deployingTokens.push(deployingERC20);
        }

        if (
            this.hasCase("/uniswapV3_benchmark")
            && !this.contracts.Token0
            && !this.contracts.Token1
        ) {
            gotNew = true;
            const deployUniswapToken = async (tokenName) => {
                return this.deployContract(
                    "./ERC20.json",
                    tokenName,
                    args,
                )
                    .then((c) => genMintERC20Txs(c, accountsWithTxs))
                    .then((c) => genApproveERC20Txs(
                        c,
                        this.config.uniswapNonfungiblePositionManagerAddress,
                        accountsWithTxs,
                    ))
                    .then((c) => genApproveERC20Txs(
                        c,
                        this.config.uniswapSwapRouterAddress,
                        accountsWithTxs,
                    ));
            };
            const deployingToken0 = deployUniswapToken("Token0");
            const deployingToken1 = deployUniswapToken("Token1");
            deployingTokens.push(deployingToken0);
            deployingTokens.push(deployingToken1);
        }

        await Promise.all(deployingTokens);

        await ensureTxsSent(this.provider, accountsWithTxs, 5000);

        if (
            this.hasCase("/uniswapV3_benchmark")
            && !this.contracts.UniswapV3Pool
        ) {
            gotNew = true;
            const pool = await createPool({
                token0: this.contracts.Token0,
                token1: this.contracts.Token1,
                chainId: this.chainId,
                uniswapNonfungiblePositionManagerAddress: this.config.uniswapNonfungiblePositionManagerAddress,
                nonceSigner: this.signer,
            });
            this.contracts["UniswapV3Pool"] = pool;
        }

        if (gotNew) {
            const content = JSON.stringify({
                contracts: this.contracts,
                accounts: this.accounts.map((acc) => acc.signer._signingKey().privateKey),
            });
            fs.writeFileSync(this.config.state_file, content);
            logger.info("[Preparing] Prepared");
            process.exit(0);
        }
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
            filename: path.resolve(__dirname, "worker.js")
        })

        let tasks = []
        for (let i = 0; i < this.config.thread_num; i += 1) {
            tasks.push(
                piscina.run({
                    contracts: this.contracts,
                    config: {
                        ...this.config,
                    },
                    accounts: this.accounts.slice(
                        i * this.config.accounts_num,
                        (i + 1) * this.config.accounts_num,
                    ).map((acc) => acc.signer._signingKey().privateKey),
                    index: i,
                })
            )
        }

        this.benchmark_info.res = await Promise.all(tasks);
    }

    async start() {
        this.benchmark_info.start_block_number = await this.provider.getBlockNumber();
        this.benchmark_info.start_time = performance.now()

    }

    async end() {
        this.benchmark_info.end_time = performance.now()
        this.benchmark_info.end_block_number = await this.provider.getBlockNumber()
        this.benchmark_info.transfer_count = this.benchmark_info.res.reduce((total, res) => total + res.transfer_count, 0)
        this.benchmark_info.success_transfer_count = this.benchmark_info.res.reduce((total, res) => total + res.success_tx, 0)
        this.benchmark_info.fail_transfer_count = this.benchmark_info.res.reduce((total, res) => total + res.fail_tx, 0)
        this.benchmark_info.total_time = this.benchmark_info.end_time - this.benchmark_info.start_time
    }

    get_success_rate() {
        return (this.benchmark_info.success_transfer_count * 100) / this.benchmark_info.transfer_count;
    }

    get_average_time_elapsed() {
        return Math.max(this.benchmark_info.success_transfer_count, 1) / (this.benchmark_info.total_time / 1000)
    }

    async send_discord() {

        if (!this.config.token || !this.config.id) {
            return;
        }

        const embed = this.get_message_embed();
        await this.discord.send({
            content: " ",
            username: "axon-benchmark",
            avatarURL: "https://i.imgur.com/AfFp7pu.png",
            embeds: [embed],
        })
    }

    get_message_embed() {
        return new MessageEmbed()
            .setTitle("axon benchmark")
            .setColor("#0099ff")
            .addField("benchmark time:", `${this.benchmark_info.total_time}`)
            .addField("start height:", `${this.benchmark_info.start_block_number}`)
            .addField("end height:", `${this.benchmark_info.end_block_number}`)
            .addField("successed transaction count:", `${this.benchmark_info.success_transfer_count}`)
            .addField("TPS:", `${this.get_average_time_elapsed()}`)
            .addField("success rate:", `${this.get_success_rate().toFixed(2)}`);
    }

    log_benchmark_config_info() {
        logger.info("/////////////////////////////////////////////////////")
        const time = this.config.continuous_benchmark ? "infinity" : `${this.config.benchmark_time}ms`;
        logger.info(`benchmark time: ${time}`)
        logger.info(`endpoint: ${this.config.http_endpoint}`)
        logger.info("/////////////////////////////////////////////////////")
    }

    log_benchmark_res() {
        logger.info("/////////////////////////////////////////////////////")
        logger.info("benchmark time: ", this.benchmark_info.total_time, "ms")
        logger.info("successed transaction count:", this.benchmark_info.success_transfer_count)
        logger.info("TPS:", this.get_average_time_elapsed(), "ms")
        logger.info("success rate:", `${this.get_success_rate().toFixed(2)}`)
        logger.info("/////////////////////////////////////////////////////")
    }
}

module.exports = Runner
