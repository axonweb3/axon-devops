const path = require('path');
const Piscina = require('piscina');
const { MessageEmbed, WebhookClient } = require('discord.js')
const Web3 = require('web3')
const AccountFactory = require('./account_factory')

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
    }

    async run() {
        this.log_benchmark_config_info()
        await this.start()
        await this.exec()
        await this.end()
        this.log_benchmark_res()
        await this.send_discord()

    }

    async exec() {
        let accountFactory = new AccountFactory()
        let accounts = await accountFactory.get_accounts(this.config)

        const piscina = new Piscina({
            filename: path.resolve(__dirname, 'worker.js')
        })

        let tasks = []
        for (const index in accounts) {
            tasks.push(piscina.run({config: {...this.config}, private_key: accounts[index].privateKey}))
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
        for (let i = this.benchmark_info.start_block_number; i <= this.benchmark_info.end_block_number; i++) {
            let block = await this.web3.eth.getBlock(i)
            this.benchmark_info.transfer_count += block.transactions.length
        }
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