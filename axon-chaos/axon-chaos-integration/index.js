const Command = require('./src/command');
const sleep = require('./src/sleep');


let args = process.argv.slice(2)
let chaos_url = args[0] || 'https://localhost:8080'

async function run(chaos_url) {
    const cmd = new Command(chaos_url)
    cmd.kill_chaos_integration()
    sleep(120000)
    cmd.apply_chaos_integration()
    await cmd.wait_chaos_integration_res()
    cmd.kill_chaos_integration()
}


run(chaos_url)
