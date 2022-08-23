const Web3 = require('web3')
const AccountFactory = require('./account_factory')
const logger = require('./logger');
const ethers = require('ethers');

class Benchmark {
    constructor(info) {
        this.config = info.config;

        this.web3 = new Web3(new Web3.providers.HttpProvider(info.config.http_endpoint))

        this.accounts = [];
        this.index = 0;
    }

    async prepare() {
        console.log('preparing for benchmark.js...');

        const accountFactory = new AccountFactory()
        this.accounts = await accountFactory.get_accounts(this.config, 10000000, this.config.accounts_num);

        console.log('\nbenchmark.js prepared');
    }

    async gen_tx() {
        const index = this.index;
        this.index += 1;

        const account = this.accounts[index % this.accounts.length];
        const nonce = await this.web3.eth.getTransactionCount(account.address);

        let tx = {
            to: '0x5cf83df52a32165a7f392168ac009b168c9e8915',
            type: 2,
            value: ethers.utils.parseEther("0.0001"),
            maxPriorityFeePerGas: ethers.utils.parseUnits('2', 'gwei'),
            maxFeePerGas: ethers.utils.parseUnits('2', 'gwei'),
            gasLimit: 21000,
            nonce: nonce + 1,
            chainId: this.config.chainId,
        };

        return account.signTransaction(tx);
    }
}

module.exports = Benchmark
