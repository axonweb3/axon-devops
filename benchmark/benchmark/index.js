const Runner = require('./src/runner')
const config = require('./config.json')
var bip39 = require('bip39')
const { hdkey } = require('ethereumjs-wallet')
const util = require('ethereumjs-util')
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

    const seed = await bip39.mnemonicToSeedSync("test test test test test test test test test test test junk")
    const hdWallet = hdkey.fromMasterSeed(seed)
    const key = hdWallet.derivePath("m/44'/60'/0'/0/0")

    config.private_key = util.bufferToHex(key._hdkey._privateKey)

}
(async () => {
    await init_config();
    let runner = new Runner(config)
    await runner.run()
})()
