const { MessageEmbed, WebhookClient } = require('discord.js')
const Web3 = require('web3')

class Benchmark {
    constructor(config) {
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
        this.account = this.web3.eth.accounts.privateKeyToAccount(config.private_key)
        this.web3.eth.defaultAccount = this.account.address

        this.discord = new WebhookClient({ id: config.id, token: config.token })

    }

    async exec() {
        this.log_benchmark_config_info()
        await this.start()
        await this.send_txs()
        await this.end();
        this.log_benchmark_res()
        await this.send_discord()

    }

    async start() {
        this.benchmark_info.total_time = 0
        this.benchmark_info.start_time = performance.now()
        this.benchmark_info.start_block_number = await this.web3.eth.getBlockNumber()
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
                "value": 100,
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

    get_success_rate() {
        return (this.benchmark_info.success_tx / (this.benchmark_info.success_tx + this.benchmark_info.fail_tx)) * 100
    }

    get_average_time_elapsed() {
        return Math.max(this.benchmark_info.transfer_count, 1) / (this.benchmark_info.total_time / 1000)
    }

    async send_discord() {
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
            .addField("transfer rate:", `${this.get_success_rate().toFixed(2)}% (${this.benchmark_info.success_tx}/${this.benchmark_info.success_tx + this.benchmark_info.fail_tx})`);
    }

    log_benchmark_config_info() {
        console.log('\n/////////////////////////////////////////////////////')
        console.log(`privkey: ${this.config.private_key}`)
        console.log(`address: ${this.web3.eth.defaultAccount}`)
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
        console.log('transfer rate:', `${this.get_success_rate().toFixed(2)}% (${this.benchmark_info.success_tx}/${this.benchmark_info.success_tx + this.benchmark_info.fail_tx})`)
        console.log('/////////////////////////////////////////////////////\n')
    }
}

module.exports = Benchmark

