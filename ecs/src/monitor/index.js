const program = require("commander");
const mutasdk = require("muta-sdk");
const fs = require("fs");
const toml = require("toml");
const request = require("request-promise-native");
const child_process = require("child_process");

const { args } = program
    .option("-d --duration [duration]", "number of second", 300)
    .parse(process.argv);

const opts = program.opts();
const path_list = args[0] ? args : ["../../res/db/instance_list.json"]

const secret = toml.parse(fs.readFileSync("../../res/secret.toml"))

async function warn(text) {
    console.log(text);
    var ic = 0;
    while (text.length > ic) {
        await request.post({
            url: `https://api.telegram.org/bot${secret.telegram.token}/sendMessage`,
            form: {
                chat_id: secret.telegram.chat_id,
                text: text.substring(ic, ic + 4096),
            }
        });
        ic = ic + 4096;
    }
}

async function main() {
    const func = async () => {
        for await (const path of path_list) {
            let instance_list = JSON.parse(fs.readFileSync(path));
            let text = "----------\r\n"
            for await (const e of instance_list) {
                const ip = e.PublicIpAddress.IpAddress[0];
                var sdk = new mutasdk.Muta({
                    endpoint: "http://" + ip + ":8000" + '/graphql',
                }).client;
                try {
                    var res = await sdk.getLatestBlockHeight();
                    text = text + ip + " " + res;
                } catch (err) {
                    console.log(err);
                }
                const stdout = child_process.execSync(`ssh -o "StrictHostKeyChecking no" -i ../../res/id_rsa root@${ip} "free -h | head -n 2 | tail -n 1"`)
                text = text + " " + String(stdout).split(" ").filter(e => e !== "")[2];
                text = text + "\n";
            }
            warn(text)
        }
    }
    func()
    setInterval(func, opts.duration * 1000);
}

main()
