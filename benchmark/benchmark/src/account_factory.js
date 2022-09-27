const logger = require("./logger");
const ethers = require("ethers");
const NonceManager = require("./nonceManager");

class AccountFactory {
    constructor(signer, provider) {
        this.signer = signer;
        this.provider = provider;
    }

    async get_accounts(value, accountNum) {
        const accounts = [];
        while (accounts.length < accountNum) {
            const txs = await Promise.all(Array.from(
                Array(accountNum - accounts.length),
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
                    }).then((res) => [res, account]);
                },
            ));

            await Promise.all(
                txs.map(
                    async ([res, acc]) => {
                        try {
                            await res.wait();
                            accounts.push(acc);
                        } catch (err) {
                            logger.error("create account tx err: ", err);
                        }
                    },
                ),
            );
        }

        await Promise.all(accounts.map((acc) => acc.initNonce()));

        return accounts;
    }
}

module.exports = AccountFactory;
