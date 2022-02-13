const config = require('./config.json')
const { MessageEmbed, WebhookClient } = require('discord.js')
const Web3 = require('web3')
const httpProvider = new Web3.providers.HttpProvider(config.http_endpoint)
const web3 = new Web3(httpProvider)
const webhookClient = new WebhookClient({ id: config.id, token: config.token })


let success_tx = 0
let fail_tx = 0

let account = web3.eth.accounts.privateKeyToAccount(config.privkey)
web3.eth.defaultAccount = account.address
console.log('\n/////////////////////////////////////////////////////')
console.log(`privkey: ${config.privkey}`)
console.log(`address: ${web3.eth.defaultAccount}`)
console.log('benchmark time:', config.benchmark_time, 'ms')
console.log(`endpoint: ${config.http_endpoint}`)
console.log('/////////////////////////////////////////////////////\n')
console.log('waiting...')

function fuse(timeout_ms) {
	return new Promise((resolve, _) => {
		setTimeout(() => {
			resolve()
		}, timeout_ms)
	})
}

async function benchmark(benchmark_ms) {
	let start_time = performance.now()
	let start_block_number = await web3.eth.getBlockNumber()
	let nonce = await web3.eth.getTransactionCount(web3.eth.defaultAccount)
	while (benchmark_ms > 0) {
		let awaits = []
		for (let i = 0; i < 1000; i++) {
			nonce += 1
			awaits.push(transfer(nonce))
		}
		let step_time = performance.now()
		await Promise.any([Promise.all(awaits), fuse(benchmark_ms)])
		benchmark_ms -= performance.now() - step_time
	}
	let end_block_number = await web3.eth.getBlockNumber()

	let elapsed_time = performance.now() - start_time
    let transfer_count = 0
	for (let i = start_block_number; i <= end_block_number; i++) {
		let block = await web3.eth.getBlock(i)
		transfer_count += block.transactions.length
	}
	let average_time_elapsed = elapsed_time / Math.max(transfer_count, 1)
	let success_rate = (success_tx / (success_tx + fail_tx)) * 100
	console.log('\n/////////////////////////////////////////////////////')
	console.log('benchmark time: ', config.benchmark_time, 'ms')
	console.log('transaction count:', transfer_count)
	console.log('average transfer time:', average_time_elapsed, 'ms')
	console.log('transfer rate:', `${success_rate.toFixed(2)}% (${success_tx}/${success_tx + fail_tx})`)
	console.log('/////////////////////////////////////////////////////\n')

	const embed = new MessageEmbed()
	.setTitle('axon benchmark')
	.setColor('#0099ff')
	.addField("benchmark time:", `${config.benchmark_time}`)
	.addField("transaction count:", `${transfer_count}`)
	.addField("TPS:", `${average_time_elapsed * 100}`)
	.addField("transfer rate:", `${success_rate.toFixed(2)}% (${success_tx}/${success_tx + fail_tx})`)

	webhookClient.send({
		content: ' ',
		username: 'axon-benchmark',
		avatarURL: 'https://i.imgur.com/AfFp7pu.png',
		embeds: [embed],
	})

}

async function transfer(nonce) {
	let tx = {
		"to": '0x5cf83df52a32165a7f392168ac009b168c9e8915',
		"type": 2,
		"value": 100,
		"maxPriorityFeePerGas": 3,
		"maxFeePerGas": 3,
		"gasLimit": 21000,
		"nonce": nonce,
		"chainId": 5
	}
	let signed_tx = await account.signTransaction(tx)
	let result = await web3.eth.sendSignedTransaction(signed_tx.rawTransaction).catch(error => {
		// console.error(error)
		// console.error(`[error] raw_tx = ${signed_tx.rawTransaction}`)
	})
	if (result) {
		success_tx += 1
	} else {
		fail_tx += 1
	}
}

benchmark(config.benchmark_time)
