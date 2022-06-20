const Runner = require('./src/runner')
const config = require('./config.json')
const { ethers } = require('ethers')
const args = require('minimist')(process.argv.slice(2))


async function init_config() {
    
    if(args['http_endpoint']) {
        config.http_endpoint = args['http_endpoint']
    }

    if(args['continuous_benchmark']) {
        config.continuous_benchmark = args['continuous_benchmark']
    }


    if(args['benchmark_time']) {
        config.benchmark_time = args['benchmark_time']
    }


    if(args['batch_size']) {
        config.batch_size = args['batch_size']
    }


    if(args['thread_num']) {
        config.thread_num = args['thread_num']
    }


    if(args['id']) {
        config.id = args['id']
    }


    if(args['token']) {
        config.token = args['token']
    }

    if(args['mnemonic']) {
        config.mnemonic = args['token'];
    }


    if(args['benchmark_cases']) {
        config.benchmark_cases = eval(args['benchmark_cases'])
    }

    const hdNode = ethers.utils.HDNode.fromMnemonic(config.mnemonic);
    let subNode = hdNode.derivePath("m/44'/60'/0'/0/0");
    config.private_key = subNode.privateKey;

}
(async () => {
    await init_config();
    let runner = new Runner(config)
    await runner.run()
})()
