const logger = require('./logger');
const ethers = require('ethers');
const { NonceManager } = require("@ethersproject/experimental");

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
                    account.address = account.signer.address;

                    return this.signer.sendTransaction({
                        to: account.address,
                        value: ethers.utils.parseEther(String(value)),
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

        return accounts;
    }
}

module.exports = AccountFactory;
