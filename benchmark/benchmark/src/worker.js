const logger = require("./logger");
const ethers = require("ethers");
const { NonceManager } = require("@ethersproject/experimental");

module.exports = (async (info) => {
    const benchmarkInfo = {
        transfer_count: 0,
        success_tx: 0,
        fail_tx: 0,
    };
    const provider = new ethers.providers.JsonRpcBatchProvider(info.config.http_endpoint);
    const accounts = info.accounts.map(
        (p) => {
            const signer = new NonceManager(new ethers.Wallet(p, provider));
            signer.address = signer.signer.address;
            return signer;
        },
    );

    const benchmarkCases = await Promise.all(Object.entries(info.config.benchmark_cases)
        .map(async ([name, share], i) => {
            console.log(name, share);
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
        const txs = (await Promise.all(Array.from(
            Array(info.config.batch_size),
            async (_, i) => {
                let j = 0;
                let targetShare = totalShare * i / info.config.batch_size;
                for (; j < benchmarkCases.length; j += 1) {
                    if (targetShare < 0) {
                        break;
                    }
                    targetShare -= benchmarkCases[j].share;
                }
                try {
                    return await benchmarkCases[j - 1].instance.gen_tx();
                } catch (err) {
                    benchmarkInfo.fail_tx += 1;
                    console.log(err);
                    logger.error(err);
                    return undefined;
                }
            },
        ))).filter((tx) => tx !== undefined);

        const responses = (await Promise.all(
            txs.map((tx) => provider
                .sendTransaction(tx)
                .catch((err) => {
                    benchmarkInfo.fail_tx += 1;
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
                        benchmarkInfo.success_tx += 1;
                    } catch (err) {
                        benchmarkInfo.fail_tx += 1;
                        logger.error(err);
                    }
                }),
            );
        } else {
            benchmarkInfo.success_tx += responses.length;
        }

        totalTime = performance.now() - startTime;
    }

    benchmarkInfo.transfer_count = benchmarkInfo.success_tx + benchmarkInfo.fail_tx;
    return benchmarkInfo;
});
