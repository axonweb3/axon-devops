const Web3 = require('web3')

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
    }

    async end() {
        this.benchmark_info.end_block_number = await this.web3.eth.getBlockNumber()
        for (let i = this.benchmark_info.start_block_number; i <= this.benchmark_info.end_block_number; i++) {
            let block = await this.web3.eth.getBlock(i)
            this.benchmark_info.transfer_count += block.transactions.length
        }
    }

    async send_txs() {
        while (this.config.continuous_benchmark || this.config.benchmark_time > this.benchmark_info.total_time) {
            let txs = await this.gen_batch_transactions();
            await txs.execute()
            this.benchmark_info.total_time = (performance.now() - this.benchmark_info.start_time)
        }
    }

    async gen_batch_transactions() {
        let txs = new this.web3.BatchRequest();
        for (let i = 0; i < this.config.batch_size; i++) {
            this.benchmark_info.nonce += 1
            let tx = {
                "to": '0x5cf83df52a32165a7f392168ac009b168c9e8915',
                "type": 2,
                "value": 1,
                "maxPriorityFeePerGas": 3,
                "maxFeePerGas": 3,
                "gasLimit": 21000,
                "nonce": this.benchmark_info.nonce,
                "chainId": 5
            }
            let signed_tx = await this.account.signTransaction(tx)
            txs.add(this.web3.eth.sendSignedTransaction.request(signed_tx.rawTransaction, (err, res) => {
                if (err) this.benchmark_info.fail_tx += 1
                else this.benchmark_info.success_tx += 1
            }))
        }

        return txs
    }

}

module.exports = Benchmark

