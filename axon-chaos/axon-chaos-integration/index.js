const Command = require('./src/command');
const sleep = require('./src/sleep');


let args = process.argv.slice(2)
let chaos_url = args[0] || 'https://localhost:8080'

async function run(chaos_url) {
    const cmd = new Command(chaos_url)
    cmd.kill_chaos_integration()
    await sleep(120000)
    cmd.apply_chaos_integration()
    const res = await cmd.wait_chaos_integration_res()
    if(res) {
        cmd.kill_chaos_integration()
    } else {
        console.log("chaos has been cancelled ！！！！！！！！！！！！！！！！！")
    }

}


run(chaos_url)
