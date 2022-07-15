const Web3 = require('web3');
const { WaitableBatchRequest } = require('./utils');
const ERC20JSON = require('./ERC20.json');
const AccountFactory = require('./account_factory');
const logger = require('./logger');

class Benchmark {
    constructor(info) {
        let config = info.config
        let private_key = info.private_key
        this.config = {
                http_endpoint: config.http_endpoint,
                private_key : config.private_key,
                continuous_benchmark: config.continuous_benchmark,
                benchmark_time: config.benchmark_time,
                batch_size: config.batch_size,
                id: config.id,
                token: config.token,
        }

        this.benchmark_info = {
            success_tx: 0,
            fail_tx: 0,
            transfer_count: 0,
            start_block_number: 0,
            end_block_number: 0,
            total_time: 0,
            nonce: 0,
        }

        this.web3 = new Web3(new Web3.providers.HttpProvider(config.http_endpoint))
        this.account = this.web3.eth.accounts.privateKeyToAccount(private_key)
        this.web3.eth.defaultAccount = this.account.address

        this.contract = new this.web3.eth.Contract(ERC20JSON.abi, info.contracts["ERC20"]);
    }

    async exec() {
        await this.start()
        await this.send_txs()
        await this.end();

        return this.benchmark_info
    }

    async start() {
        this.benchmark_info.total_time = 0
        this.benchmark_info.start_time = performance.now()
        this.benchmark_info.nonce = await this.web3.eth.getTransactionCount(this.account.address)
        this.accounts = [];
        const accountFactory = new AccountFactory()
        for (let i = 0; i < 2; i++) {
            let accounts = await accountFactory.get_accounts(this.config, 10000000000000, 20);
            for (const account of accounts) {
                this.accounts.push(account)
            }
        }

        console.log(this.accounts)
    }

    async end() {
        this.benchmark_info.transfer_count = this.benchmark_info.success_tx + this.benchmark_info.fail_tx;
    }

    async send_txs() {
        while (this.config.continuous_benchmark || this.config.benchmark_time > this.benchmark_info.total_time) {
            await this.send_batch_transactions();
            this.benchmark_info.total_time = (performance.now() - this.benchmark_info.start_time)
        }
    }

    async send_batch_transactions() {
        let idx = 0;
        while (idx < this.accounts.length) {
            let nonce = await this.web3.eth.getTransactionCount(this.accounts[idx].address);
            let txs = new WaitableBatchRequest(this.web3);
            for (let i = 0; i < this.config.batch_size; i++) {
                let tx = {
                    "from": this.account.address,
                    "to": this.contract.options.address,
                    "gasLimit": 200000,
                    "maxPriorityFeePerGas": 3,
                    "maxFeePerGas": 3,
                    "nonce": this.benchmark_info.nonce,
                    "data": this.contract.methods.transfer('0x5cf83df52a32165a7f392168ac009b168c9e8915', 0).encodeABI(),
                }
                let signed_tx = await this.this.accounts[idx].signTransaction(tx)
                txs.add(this.web3.eth.sendSignedTransaction.request(signed_tx.rawTransaction, (err, res) => {
                    if (err) {
                        this.benchmark_info.fail_tx += 1
                        if (!err.toString().includes('ReachLimit')) {
                            logger.error("send tx err: ", err)
                        }
                    } else this.benchmark_info.success_tx += 1
                }), signed_tx.transactionHash);

                this.benchmark_info.nonce += 1;
            }

            await txs.execute()
            await txs.waitFinished();
            this.benchmark_info.nonce = await this.web3.eth.getTransactionCount(this.account.address);
        }
    }

}

module.exports = Benchmark
