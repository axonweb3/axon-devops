const Web3 = require('web3');
const logger = require('./logger');

class AccountFactory {
    async get_accounts(config) {

        let web3 = new Web3(new Web3.providers.HttpProvider(config.http_endpoint));
        let account = web3.eth.accounts.privateKeyToAccount(config.private_key);
        web3.eth.defaultAccount = account.address;

        let accounts = [];
        for (let i = 0; i < config.thread_num;) {
            try {
                const benchmark_account = web3.eth.accounts.create();
                const nonce = await web3.eth.getTransactionCount(account.address) + 1
                let tx = {
                    "to": benchmark_account.address,
                    "type": 2,
                    "value": 10000000000000000,
                    "maxPriorityFeePerGas": 3,
                    "maxFeePerGas": 3,
                    "gasLimit": 21000,
                    "nonce": nonce,
                    "chainId": 5
                };

                let signed_tx = await account.signTransaction(tx);
                await web3.eth.sendSignedTransaction(signed_tx.rawTransaction);

                accounts.push(benchmark_account);
                i = accounts.length;
            } catch (e) {
                logger.error("create account tx err: ", e);
            }
        }

        console.log("create account tx success");

        return accounts;
    }
}

module.exports = AccountFactory;
