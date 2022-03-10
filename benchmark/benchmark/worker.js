const Benchmark = require('./benchmark')

module.exports = (async (info) => {
    let benchmark = new Benchmark(info)
    return await benchmark.exec().catch((err) => console.log(err))
});
