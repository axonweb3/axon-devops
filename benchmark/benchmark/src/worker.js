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
    // Reduce network usage
    const [network, feeData] = await Promise.all([
        provider.getNetwork(),
        provider.getFeeData(),
    ]);
    provider.getNetwork = async () => network;
    provider.getFeeData = async () => feeData;
    provider.estimateGas = async () => ethers.BigNumber.from(1000000);
    provider.getGasPrice = async () => feeData.gasPrice;

    const accounts = info.accounts.map((p) => new NonceManager(new ethers.Wallet(p, provider)));
    let accountIndex = 0;

    const benchmarkCases = await Promise.all(Object.entries(info.config.benchmark_cases)
        .map(async ([name, share]) => {
            const BenchmarkCase = require(name);
            const instance = new BenchmarkCase({
                config: info.config,
                contracts: info.contracts,
                provider,
            });
            if (instance.prepare) {
                await instance.prepare();
            }
            return { name, instance, share };
        }));

    const totalShare = benchmarkCases.reduce((tot, i) => tot + i.share, 0);
    const txNums = benchmarkCases.map(({ name, share }, i) => {
        const shareBefore = benchmarkCases.slice(0, i).reduce((tot, i) => tot + i.share, 0);
        const txsBefore = Math.floor(info.config.batch_size * shareBefore / totalShare);
        const txNum = Math.floor(info.config.batch_size * (shareBefore + share) / totalShare) - txsBefore;
        logger.info(`[Thread ${info.index}] ${name} ${txNum}/${info.config.batch_size}`);
        return txNum;
    });

    const startTime = performance.now();
    let totalTime = 0;
    while (
        info.config.continuous_benchmark
        || info.config.benchmark_time > totalTime
    ) {
        // Init nonces
        const endIndex = accountIndex + info.config.batch_size;
        let accountsToUse;
        if (info.config.batch_size >= accounts.length) {
            accountsToUse = accounts;
        } else {
            accountsToUse = accounts.slice(accountIndex, endIndex);
            if (endIndex > accounts.length) {
                accountsToUse = accountsToUse.concat(
                    accounts.slice(0, endIndex - accounts.length),
                );
            }
        }

        // Calculate sent tx number by nonce difference
        const newTxCounts = await Promise.all(accountsToUse.map((acc) => acc.updateNonce()
            .catch((err) => {
                logger.error(`[Thread ${info.index}] `, err);
                return 0;
            }),
        ));
        benchmarkInfo.success_tx += newTxCounts.reduce((tot, i) => tot + i, 0);

        // Generate txs to be sent
        const txs = (await Promise.all(Array.from(
            Array(info.config.batch_size),
            (_, i) => {
                let j = 0;
                let txCount = 0;
                for (; j < txNums.length; j += 1) {
                    txCount += txNums[j];
                    if (txCount > i) {
                        break;
                    }
                }
                return benchmarkCases[j].instance
                    .gen_tx(accounts[(accountIndex + i) % accounts.length])
                    .catch((err) => {
                        benchmarkInfo.fail_tx += 1;
                        logger.error(`[Thread ${info.index}] `, err);
                        return undefined;
                    });
            },
        ))).filter((tx) => tx !== undefined);

        // Send txs
        (await Promise.all(
            txs.map((tx) => provider
                .perform("sendTransaction", { signedTransaction: tx })
                .catch((err) => {
                    benchmarkInfo.fail_tx += 1;
                    logger.error(`[Thread ${info.index}] `, err);
                    return undefined;
                }),
            ),
        ))
            .filter((tx) => tx !== undefined)
            .forEach((hash) => logger.debug(`[Thread ${info.index}] Transaction ${hash} Sent`));

        // Preapre for next round
        accountIndex = endIndex % accounts.length;

        benchmarkInfo.transfer_count += info.config.batch_size;
        logger.info(`[Thread ${info.index}] Transactions sent ${benchmarkInfo.success_tx}/${benchmarkInfo.transfer_count}`);

        totalTime = performance.now() - startTime;
    }

    return benchmarkInfo;
});
