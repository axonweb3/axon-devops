const Web3 = require('web3');
const ERC20JSON = require('./ERC20.json');
const AccountFactory = require('./account_factory');
const logger = require('./logger');
const ethers = require('ethers');

class Benchmark {
    constructor(info) {
        this.config = info.config;

        this.web3 = new Web3(new Web3.providers.HttpProvider(info.config.http_endpoint));

        this.contract = new this.web3.eth.Contract(ERC20JSON.abi, info.contracts["ERC20"]);

        this.accounts = [];
        this.index = 0;
    }

    async prepare() {
        console.log('preparing for contract_benchmark.js...');

        const accountFactory = new AccountFactory()
        this.accounts = await accountFactory.get_accounts(this.config, 10000000, this.config.accounts_num);

        console.log('\ncontract_benchmark.js prepared');
    }

    async gen_tx() {
        const index = this.index;
        this.index += 1;

        const account = this.accounts[index % this.accounts.length];
        const nonce = await this.web3.eth.getTransactionCount(account.address);

        let tx = {
            from: account.address,
            to: this.contract.options.address,
            maxPriorityFeePerGas: ethers.utils.parseUnits('2', 'gwei').toString(),
            maxFeePerGas: ethers.utils.parseUnits('2', 'gwei').toString(),
            gasLimit: 60000,
            nonce: nonce + 1,
            data: this.contract.methods.transfer('0x5cf83df52a32165a7f392168ac009b168c9e8915', 0).encodeABI(),
        };

        return account.signTransaction(tx);
    }
}

module.exports = Benchmark
