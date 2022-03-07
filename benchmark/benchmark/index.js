const Benchmark = require('./benchmark')
const config = require('./config.json')


function benchmark(endpoint) {
    let args = process.argv.splice(2)
    if(args.length != 0) {
        config.http_endpoint = args[0]

        if(args[1] != undefined) {
            config.continuous_benchmark = args[1].toLowerCase() == "true" ? true : false
        }

        if(args[2] != undefined) {
            config.benchmark_time = Number(args[2])
        }

        if(args[3] != undefined) {
            config.batch_size = Number(args[3])
        }

        if(args[4] != undefined) {
            config.id = args[4]
        }

        if(args[5] != undefined) {
            config.token = args[5]
        }
    }

    let benchmark = new Benchmark(config)
    benchmark.exec().catch((err) => console.log(err))
}

benchmark()

