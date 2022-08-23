const Web3 = require('web3')
const { WaitableBatchRequest, sleep } = require('./utils');
const logger = require('./logger')
const ethers = require('ethers');

class AccountFactory {
    async get_accounts(config, value, account_num) {

        let web3 = new Web3(new Web3.providers.HttpProvider(config.http_endpoint));
        let account = web3.eth.accounts.privateKeyToAccount(config.private_key);
        web3.eth.defaultAccount = account.address;

        let accounts = []
        while (accounts.length < account_num) {
            let nonce = await web3.eth.getTransactionCount(account.address);
            let batch_request = new WaitableBatchRequest(web3);
            let tempAccounts = [];

            for (let i = 0; i < account_num - accounts.length; i++) {
                let benchmark_account = web3.eth.accounts.create()
                let tx = {
                    "to": benchmark_account.address,
                    "type": 2,
                    "value": ethers.utils.parseEther(value.toString()).toString(),
                    "maxPriorityFeePerGas": ethers.utils.parseUnits('1', 'gwei').toString(),
                    "maxFeePerGas": ethers.utils.parseUnits('2', 'gwei').toString(),
                    "gasLimit": 2100000,
                    "nonce": nonce,
                    "chainId": config.chain_id
                }
                let signed_tx = await account.signTransaction(tx)
                batch_request.add(web3.eth.sendSignedTransaction.request(signed_tx.rawTransaction, (err, res) => {
                    if (err) logger.error("create account tx err: ", err)
                    else tempAccounts.push(benchmark_account)
                }), signed_tx.transactionHash);

                nonce += 1;
            }

            await batch_request.execute();
            await batch_request.waitFinished();
            await batch_request.waitConfirmed();

            for (const tempAccount of tempAccounts) {
                const balance = await web3.eth.getBalance(tempAccount.address);
                if(balance != 0) {
                    accounts.push(tempAccount);
                }

            }

        }

        return accounts
    }
}

module.exports = AccountFactory
