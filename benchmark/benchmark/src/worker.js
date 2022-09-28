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
    const [network, feeData] = await Promise.all([
        provider.getNetwork(),
        provider.getFeeData(),
    ]);
    provider.getNetwork = async () => network;
    provider.getFeeData = async () => feeData;

    const accounts = info.accounts.map((p) => new NonceManager(new ethers.Wallet(p, provider)));
    let accountIndex = 0;
    await Promise.all(accounts.map((acc) => acc.initNonce()));

    const benchmarkCases = await Promise.all(Object.entries(info.config.benchmark_cases)
        .map(async ([name, share]) => {
            logger.info(`[Thread ${info.index}] ${name} ${share}`);
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
    const txNums = benchmarkCases.map(({ share }, i) => {
        const shareBefore = benchmarkCases.slice(0, i).reduce((tot, i) => tot + i.share, 0);
        const txsBefore = Math.floor(info.config.batch_size * shareBefore / totalShare);
        return Math.floor(info.config.batch_size * (shareBefore + share) / totalShare) - txsBefore;
    });

    const startTime = performance.now();
    let totalTime = 0;
    while (
        info.config.continuous_benchmark
        || info.config.benchmark_time > totalTime
    ) {
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
                    .gen_tx(accounts[accountIndex + i])
                    .catch((err)=> {
                        benchmarkInfo.fail_tx += 1;
                        logger.error(err);
                        return undefined;
                    });
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

        responses.map(async (res) => {
            try {
                await provider.waitForTransaction(res.hash, 1, 10000);
                benchmarkInfo.success_tx += 1;
                logger.debug(`Transaction ${res.hash} Sent`);
            } catch (err) {
                benchmarkInfo.fail_tx += 1;
                if (err.code === "TIMEOUT") {
                    logger.error(`Transaction ${res.hash} timeout`);
                    return;
                }
                logger.error(err);
            }
        });

        const endIndex = accountIndex + info.config.batch_size;
        let usedAccounts;
        if (info.config.batch_size >= accounts.length) {
            usedAccounts = accounts
        } else {
            usedAccounts = accounts.slice(accountIndex, endIndex);
            if (endIndex > accounts.length) {
                usedAccounts = usedAccounts.concat(
                    accounts.slice(0, endIndex - accounts.length),
                );
            }
        }
        await Promise.all(usedAccounts.map((acc) => acc.initNonce()));
        accountIndex = endIndex % accounts.length;

        benchmarkInfo.transfer_count = benchmarkInfo.success_tx + benchmarkInfo.fail_tx;
        logger.debug(`[Thread ${info.index}] Transactions sent ${benchmarkInfo.success_tx}/${benchmarkInfo.transfer_count}.`);

        totalTime = performance.now() - startTime;
    }

    return benchmarkInfo;
});
