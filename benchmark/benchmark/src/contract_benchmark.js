const ERC20JSON = require("./ERC20.json");
const ethers = require("ethers");
const logger = require("./logger");

class Benchmark {
    constructor(info) {
        this.config = info.config;

        this.contract = new ethers.Contract(
            info.contracts["ERC20"],
            ERC20JSON.abi,
        );
    }

    async gen_tx(account) {
        const rawTx = await this.contract
            .connect(account.signer)
            .populateTransaction
            .transfer("0x5cf83df52a32165a7f392168ac009b168c9e8915", 0, { nonce: account.getNonce() });

        const tx = await account.signer.populateTransaction(rawTx);

        return account.signer.signTransaction(tx);
    }
}

module.exports = Benchmark
