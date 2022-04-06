const Web3 = require('web3')
const { WaitableBatchRequest } = require('./utils');

class AccountFactory {
    async get_accounts(config) {

        let web3 = new Web3(new Web3.providers.HttpProvider(config.http_endpoint))
        let account = web3.eth.accounts.privateKeyToAccount(config.private_key)
        web3.eth.defaultAccount = account.address

        let nonce = await web3.eth.getTransactionCount(account.address)

        let accounts = []
        let batch_request = new WaitableBatchRequest(web3);
        for (let i = 0; i < config.thread_num; i++) {
            let benchmark_account = web3.eth.accounts.create()

            nonce += 1
            let tx = {
                "to": benchmark_account.address,
                "type": 2,
                "value": 10000000000000000,
                "maxPriorityFeePerGas": 3,
                "maxFeePerGas": 3,
                "gasLimit": 21000,
                "nonce": nonce,
                "chainId": 5
            }
            let signed_tx = await account.signTransaction(tx)
            batch_request.add(web3.eth.sendSignedTransaction.request(signed_tx.rawTransaction, (err, res) => {
                if (err) console.log(err)
                else accounts.push(benchmark_account)
            }), signed_tx.transactionHash);
        }

        await batch_request.execute()
        await batch_request.waitFinished();
        await batch_request.waitConfirmed();

        return accounts
    }
}

module.exports = AccountFactory
