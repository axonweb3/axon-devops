import Web3 from 'web3'
import {Account} from "web3-core";
import {TransactionReceipt} from "web3-eth";



export default class Web3Client {
    private web3: Web3
    private account: Account
    constructor(endpoint: string, privateKey: string) {
        this.web3 = new Web3(new Web3.providers.HttpProvider(endpoint, { timeout: 1000 * 30 }) )
        this.account = this.web3.eth.accounts.privateKeyToAccount(privateKey)
    }

    async getReceipt(hash: string): Promise<TransactionReceipt> {
        await this.sleep(10000)
        return this.web3.eth.getTransactionReceipt(hash)

    }

    async getNonce(): Promise<number> {
        return await this.web3.eth.getTransactionCount(this.account.address) + 1
    }

    async sleep(interval: number) {
        const start = (new Date()).getTime();
        while ((new Date()).getTime() - start < interval) {
            continue;
        }
    }
}


