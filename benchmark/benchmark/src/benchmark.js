const ethers = require("ethers");

class Benchmark {
    constructor(info) {
    }

    async gen_tx(account) {
        const tx = await account.signer.populateTransaction({
            to: "0x5cf83df52a32165a7f392168ac009b168c9e8915",
            value: ethers.utils.parseEther("0.0001"),
            nonce: account.getNonce(),
        });
        return account.signer.signTransaction(tx);
    }
}

module.exports = Benchmark
