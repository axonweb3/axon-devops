class NonceManager {
    constructor(signer) {
        this.signer = signer;
        this.nonce = null;
        this.delta = 0;
        this.address = signer.address;
    }

    async updateNonce() {
        const oldNonce = this.nonce;
        this.nonce = await this.signer.getTransactionCount("pending");
        this.delta = 0;
        if (oldNonce === null) {
            return 0;
        }
        return this.nonce - oldNonce;
    }
    
    getNonce() {
        if (this.nonce === null) {
            return null;
        }
        this.delta += 1;
        return this.nonce + this.delta - 1;
    }
}

module.exports = NonceManager;
