const Web3 = require('web3')
const { WaitableBatchRequest } = require('./utils');
const AccountFactory = require('./account_factory')
const logger = require('./logger');
const ethers = require('ethers');

class Benchmark {
    constructor(info) {
        let private_key = info.private_key
        this.config = {
                http_endpoint: info.config.http_endpoint,
                private_key : private_key,
                continuous_benchmark: info.config.continuous_benchmark,
                benchmark_time: info.config.benchmark_time,
                batch_size: info.config.batch_size,
                id: info.config.id,
                token: info.config.token,
                chain_id: info.config.chain_id,
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

        this.web3 = new Web3(new Web3.providers.HttpProvider(info.config.http_endpoint))
        this.account = this.web3.eth.accounts.privateKeyToAccount(private_key)
        this.web3.eth.defaultAccount = this.account.address


    }

    async exec() {
        await this.start()
        await this.send_txs()
        await this.end();

        return this.benchmark_info
    }

    async start() {
        this.benchmark_info.total_time = 0;
        this.benchmark_info.start_time = performance.now();
        this.benchmark_info.nonce = await this.web3.eth.getTransactionCount(this.account.address);
        this.accounts = [];
        const accountFactory = new AccountFactory()
        for (let i = 0; i < 20; i++) {
            let accounts = await accountFactory.get_accounts(this.config, 10000000, 50);
            for (const account of accounts) {
                this.accounts.push(account)
            }
        }

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
        for (const account of this.accounts) {
            let nonce = await this.web3.eth.getTransactionCount(account.address);
            const txs = new WaitableBatchRequest(this.web3);

            for (let i = 0; i < this.config.batch_size; i++) {
                let tx = {
                    "to": '0x5cf83df52a32165a7f392168ac009b168c9e8915',
                    "type": 2,
                    "value": ethers.utils.parseEther("0.0001"),
                    "maxPriorityFeePerGas": ethers.utils.parseUnits('2', 'gwei'),
                    "maxFeePerGas": ethers.utils.parseUnits('2', 'gwei'),
                    "gasLimit": 21000,
                    "nonce": nonce,
                    "chainId": this.config.chain_id
                }
                let signed_tx = await account.signTransaction(tx);
                txs.add(this.web3.eth.sendSignedTransaction.request(signed_tx.rawTransaction, (err, res) => {
                    if (err) {
                        this.benchmark_info.fail_tx += 1
                        if(!err.toString().includes('ReachLimit')) {
                            logger.error("send tx err: ", err)
                        }
                    }
                    else this.benchmark_info.success_tx += 1
                }), signed_tx.transactionHash);

                nonce += 1;
            }

            await txs.execute()
            await txs.waitFinished();
        }

    }

}

module.exports = Benchmark
