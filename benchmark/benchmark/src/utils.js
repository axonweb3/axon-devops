async function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms)
    })
}

async function waitForTransaction(web3, hash) {
    for (let retry_count = 0; retry_count < 5; retry_count += 1) {
        try {
            const receipt = await web3.eth.getTransactionReceipt(hash);

            if (receipt) {
                return true;
            }
        } catch(_) {}

        await sleep(1000);
    }

    return false;
}

class WaitableBatchRequest {
    constructor(web3) {
        this.web3 = web3;
        this.batch = new web3.BatchRequest();
        this.tasks = [];
        this.txHashes = [];
    }

    add(request, hash) {
        let task = new Promise((resolve) => {
            let callback = request.callback;
            request.callback = (err, res) => {
                if (!err) {
                    this.txHashes.push(hash);
                }
                callback(err, res);
                resolve();
            }
            this.batch.add(request)
        });

        this.tasks.push(task);
    }

    async execute() {
        await this.batch.execute();
    }

    waitFinished() {
        return Promise.all(this.tasks);
    }

    async waitConfirmed() {
        const res = await Promise.all(
            this.txHashes.map((hash) => waitForTransaction(this.web3, hash)),
        );
        return res.every((r) => r);
    }
}

module.exports = { sleep, waitForTransaction, WaitableBatchRequest };
