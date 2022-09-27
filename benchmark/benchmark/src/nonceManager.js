class NonceManager {
    constructor(signer) {
        this.signer = signer;
        this.nonce = null;
        this.address = signer.address;
    }

    async initNonce() {
        this.nonce = await this.signer.getTransactionCount("pending");
    }
    
    getNonce() {
        const nonce = this.nonce;
        this.nonce += 1;
        return nonce;
    }
}

module.exports = NonceManager;
