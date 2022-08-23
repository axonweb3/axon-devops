const logger = require('./logger')
const Web3 = require('web3');
const { WaitableBatchRequest } = require('./utils');

module.exports = (async (info) => {
    const web3 = new Web3(new Web3.providers.HttpProvider(info.config.http_endpoint));
    const benchmarkInfo = {
        transfer_count: 0,
        success_tx: 0,
        fail_tx: 0,
    };

    benchmarkCases = await Promise.all(Object.entries(info.config.benchmark_cases)
        .map(async ([name, share]) => {
            console.log(name, share);
            const BenchmarkCase = require(name);
            return {
                instance: new BenchmarkCase({
                    config: info.config,
                    contracts: info.contracts,
                }),
                share,
            };
        }));

    const totalShare = benchmarkCases.reduce((tot, i) => tot + i.share, 0);
    for (const index in benchmarkCases) {
        await benchmarkCases[index].instance.prepare();
    }

    const startTime = performance.now();
    let totalTime = 0;
    while (
        info.config.continuous_benchmark
        || info.config.benchmark_time > totalTime
    ) {
        const txs = new WaitableBatchRequest(web3);
        for (let i = 0; i < info.config.batch_size; i += 1) {
            let j = 0;
            let targetShare = totalShare * i / info.config.batch_size;
            for (; j < benchmarkCases.length; j += 1) {
                if (targetShare < 0) {
                    break;
                }
                targetShare -= benchmarkCases[j].share;
            }
            const signed_tx = await benchmarkCases[j - 1].instance.gen_tx();

            txs.add(web3.eth.sendSignedTransaction.request(signed_tx.rawTransaction, (err, res) => {
                if (err) {
                    benchmarkInfo.fail_tx += 1
                    if(!err.toString().includes('ReachLimit')) {
                        logger.error("send tx err: ", err)
                    }
                } else {
                    benchmarkInfo.success_tx += 1
                }
            }), signed_tx.transactionHash);
        }

        await txs.execute()
        await txs.waitFinished();

        totalTime = performance.now() - startTime;
    }

    benchmarkInfo.transfer_count = benchmarkInfo.success_tx + benchmarkInfo.fail_tx;
    return benchmarkInfo;
});
