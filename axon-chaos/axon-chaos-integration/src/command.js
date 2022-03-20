const WaitChaosRes = require('./wait_chaos_res')
const child_process = require('child_process')

class Command {

    constructor(chaos_url) {
        this.chaos_url = chaos_url
    }

    async wait_chaos_integration_res() {
        const waitChaosRes = new WaitChaosRes(this.chaos_url)
        return await waitChaosRes.wait()
    }

    apply_chaos_integration() {
        const exec = child_process.execSync

        let apply_chaos_res, apply_benchmark_res, apply_axon_res
        try {
            apply_axon_res = exec('kubectl apply -f /home/ckb/axon-devops/k8s-deploy/k8s/axon')
        } catch (e) {
            apply_axon_res = e
        }

        try {
            apply_benchmark_res =
                exec(
                    'kubectl apply -f /home/ckb/axon-devops/k8s-deploy/k8s/benchmark/axon-benchmark.yaml')
        } catch (e) {
            apply_benchmark_res = e
        }

        try {
            apply_chaos_res =
                exec('kubectl apply -f /home/ckb/axon-devops/axon-chaos/axon-chaos.yaml')
        } catch (e) {
            apply_chaos_res = e
        }

        console.log(`apply axon res: ${apply_axon_res.toString()}`);
        console.log(`apply benchmark res: ${apply_benchmark_res.toString()}`);
        console.log(`apply chaos res: ${apply_chaos_res.toString()}`);
    }

    kill_chaos_integration() {
        const exec = child_process.execSync

        let kill_chaos_res, kill_benchmark_res, kill_axon_res
        try {
            kill_chaos_res =
                exec('kubectl delete -f /home/ckb/axon-devops/axon-chaos/axon-chaos.yaml')
        } catch (e) {
            kill_chaos_res = e
        }

        console.log(`kill chaos res: ${kill_chaos_res.toString()}`);
    
    }
}

module.exports = Command
