const logger = require("./logger");
const ethers = require("ethers");
const NonceManager = require("./nonceManager");

class AccountFactory {
    constructor(signer, provider) {
        this.signer = signer;
        this.provider = provider;
    }

    async get_accounts(value, accountNum) {
        logger.info(`[Account Factory] Creating ${accountNum} accounts...`);

        const accounts = [];
        while (accounts.length < accountNum) {
            const leftCount = accountNum - accounts.length;
            let txs = (await Promise.all(Array.from(
                Array(Math.min(leftCount, 65)),
                () => {
                    const account = new NonceManager(
                        ethers.Wallet
                            .createRandom()
                            .connect(this.provider),
                    );

                    return this.signer.signer.sendTransaction({
                        to: account.address,
                        value: ethers.utils.parseEther(String(value)),
                        nonce: this.signer.getNonce(),
                    })
                        .then((res) => [res, account])
                        .catch((err) => {
                            logger.error("[Account Factory] ", err);
                            return undefined;
                        });
                },
            ))).filter((r) => r !== undefined);

            await Promise.all(
                txs.map(
                    async ([res, acc]) => {
                        try {
                            await this.provider.waitForTransaction(res.hash, 1, 20000);
                            logger.debug(`[Account Factory] Transaction ${res.hash} Sent`);
                            accounts.push(acc);
                        } catch (err) {
                            if (err.code === "TIMEOUT") {
                                logger.error(`[Account Factory] Create account tx ${res.hash} timeout`);
                                return;
                            }
                            logger.error("[Account Factory] Create account tx err: ", err);
                        }
                    },
                ),
            );

            logger.info(`[Account Factory] ${accounts.length}/${accountNum} accounts created`);

            await this.signer.updateNonce();
        }

        await Promise.all(accounts.map((acc) => acc.updateNonce()));

        return accounts;
    }
}

module.exports = AccountFactory;
