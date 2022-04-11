const Runner = require('./src/runner')
const config = require('./config.json')
const args = require('minimist')(process.argv.slice(2))


function init_config() {
    
    if(args['http_endpoint']) {
        config.http_endpoint = args['http_endpoint']
    }

    if(args['private_key']) {
        config.private_key = args['private_key']
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


    if(args['benchmark_cases']) {
        config.benchmark_cases = eval(args['benchmark_cases'])
    }

}
(async () => {
    init_config();
    let runner = new Runner(config)
    await runner.run()
})()
