const logger = require("./logger");
const ethers = require("ethers");
const NonceManager = require("./nonceManager");

module.exports = (async (info) => {
    const benchmarkInfo = {
        transfer_count: 0,
        success_tx: 0,
        fail_tx: 0,
    };
    const provider = new ethers.providers.JsonRpcBatchProvider(info.config.http_endpoint);
    const accounts = info.accounts.map((p) => new NonceManager(new ethers.Wallet(p, provider)));
    await Promise.all(accounts.map((acc) => acc.initNonce()));

    const benchmarkCases = await Promise.all(Object.entries(info.config.benchmark_cases)
        .map(async ([name, share], i) => {
            logger.info(`[Thread ${info.index}] ${name} ${share}`);
            const BenchmarkCase = require(name);
            return {
                instance: new BenchmarkCase({
                    config: info.config,
                    contracts: info.contracts,
                    accounts: accounts.slice(
                        i * info.config.accounts_num,
                        (i + 1) * info.config.accounts_num,
                    ),
                }),
                share,
            };
        }));

    const totalShare = benchmarkCases.reduce((tot, i) => tot + i.share, 0);

    const startTime = performance.now();
    let totalTime = 0;
    while (
        info.config.continuous_benchmark
        || info.config.benchmark_time > totalTime
    ) {
        let failedCount = 0;

        const txs = (await Promise.all(Array.from(
            Array(info.config.batch_size),
            (_, i) => {
                let j = 0;
                let targetShare = totalShare * i / info.config.batch_size;
                for (; j < benchmarkCases.length; j += 1) {
                    if (targetShare < 0) {
                        break;
                    }
                    targetShare -= benchmarkCases[j].share;
                }
                return benchmarkCases[j - 1].instance
                    .gen_tx()
                    .catch((err)=> {
                        failedCount += 1;
                        logger.error(err);
                        return undefined;
                    });
            },
        ))).filter((tx) => tx !== undefined);

        const responses = (await Promise.all(
            txs.map((tx) => provider
                .sendTransaction(tx)
                .catch((err) => {
                    failedCount += 1;
                    logger.error(err);
                    return undefined;
                },
                ),
            ))).filter((r) => r !== undefined);

        if (info.config.wait_for_tx_mined) {
            await Promise.all(
                responses.map(async (res) => {
                    try {
                        await res.wait();
                        logger.debug(`Transaction ${res.hash} Sent`);
                    } catch (err) {
                        failedCount += 1;
                        logger.error(err);
                    }
                }),
            );
        } else {
            responses.forEach((res) => logger.debug(`Transaction ${res.hash} Sent`));
        }

        const successedCount = info.config.batch_size - failedCount;

        benchmarkInfo.fail_tx += failedCount;
        benchmarkInfo.success_tx += successedCount;
        benchmarkInfo.transfer_count = benchmarkInfo.success_tx + benchmarkInfo.fail_tx;

        logger.debug(`[Thread ${info.index}] Transactions sent ${benchmarkInfo.success_tx}(+${successedCount})/${benchmarkInfo.transfer_count}(+${info.config.batch_size}).`);

        totalTime = performance.now() - startTime;
    }

    return benchmarkInfo;
});
