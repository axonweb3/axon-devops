const ethers = require("ethers");
const logger = require("./logger");

class Benchmark {
    constructor(info) {
        this.index = 0;
        this.accounts = info.accounts;
    }

    async gen_tx() {
        const index = this.index;
        this.index += 1;

        const account = this.accounts[index % this.accounts.length];

        const tx = await account.signer.populateTransaction({
            to: "0x5cf83df52a32165a7f392168ac009b168c9e8915",
            value: ethers.utils.parseEther("0.0001"),
            nonce: account.getNonce(),
        });
        logger.debug(tx);
        return account.signer.signTransaction(tx);
    }
}

module.exports = Benchmark
