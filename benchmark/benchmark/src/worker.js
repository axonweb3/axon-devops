module.exports = (async (info) => {
    const BenchmarkCase = require(info.benchmarkCase);

    let benchmarkCase = new BenchmarkCase(info);
    return await benchmarkCase.exec().catch((err) => console.log(err));
});
