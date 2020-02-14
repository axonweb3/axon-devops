const k8s = require('@kubernetes/client-node');
const mutasdk = require("muta-sdk");
const request = require("request-promise-native");

const cUseProxy = process.env.USE_PROXY !== undefined;
const cProxyHostPort = process.env.PROXY_HOSTPORT;
const cTgToken = process.env.TG_TOKEN;
const cChatID = process.env.CHAT_ID;
const cDuration = process.env.DURATION ? parseInt(process.env.DURATION) : 300;
const cNameSpace = 'mutadev';
const cMute = process.env.MUTE ? true : false;

const kc = new k8s.KubeConfig();
kc.loadFromFile('./config/kube.config');

const k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api);

async function warn(text) {
    console.log(text);
    if (cMute) {
        return
    }
    var ic = 0;
    while (text.length > ic) {
        await request.post({
            url: `https://api.telegram.org/bot${cTgToken}/sendMessage`,
            form: {
                chat_id: cChatID,
                text: text.substring(ic, ic + 4096),
            }
        });
        ic = ic + 4096;
    }
}

function formatData(nodeData) {
    return nodeData.height;
}

async function getNodeData(name) {
    var res = await k8sCoreApi.readNamespacedService(name, cNameSpace);

    var apiPort = 0;
    res.body.spec.ports.forEach((e) => {
        if (e.name == 'api') {
            apiPort = e.port;
        }
    })
    var tagName = res.body.metadata.labels['muta.nervos.org']

    var dst = '';
    if (cUseProxy) {
        dst = `http://${cProxyHostPort}/api/v1/namespaces/mutadev/services/${res.body.metadata.name}:api/proxy/`
    } else {
        dst = 'http://' + res.body.spec.clusterIP + ':' + apiPort + '/'
    }
    var sdk = new mutasdk.Muta({
        endpoint: dst + 'graphql',
    }).client;

    var ret = {};
    ret.tagName = tagName;
    try {
        var res = await sdk.getLatestBlockHeight();
        ret.height = res;
    } catch (err) {
    }
    return ret;
}

async function getNodeDataList() {
    var running = new Map();
    var res = await k8sCoreApi.listNamespacedService(cNameSpace);

    for await (const e of res.body.items.filter((e) => {
        return e.metadata.ownerReferences[0].kind === 'Muta'
    })) {
        const data = await getNodeData(e.metadata.name);
        running.set(e.metadata.name, data);
    }
    return running
}

var records = new Map();
async function watch_stopped() {
    console.log(new Date(), "Watch stopped")
    var running = await getNodeDataList()
    var stopped = new Map();

    Array.from(running.keys()).forEach((e) => {
        if (records.has(e) && running.get(e).height === records.get(e).height) {
            stopped.set(e, running.get(e))
        }
    })

    var msg = {};
    for (const [k, v] of stopped.entries()) {
        const l = v.tagName;
        if (!(l in msg)) {
            msg[l] = {};
        }
        msg[l][k] = v.height;
    }

    if (Array.from(stopped.keys()).length !== 0) {
        await warn(JSON.stringify({
            'stopped': msg,
        }, undefined, 4))
    }
    records = running;
}

async function watch_alldata() {
    var running = await getNodeDataList();
    var msg = {};
    for (const [k, v] of running.entries()) {
        const l = v.tagName;
        if (!(l in msg)) {
            msg[l] = {};
        }
        msg[l][k] = v.height;
    }

    if (Array.from(running.keys()).length !== 0) {
        await warn(JSON.stringify({
            'running': msg,
        }, undefined, 4))
    }
}

async function watch_request() {
    var update_id = 0;
    while (true) {
        console.log(new Date(), "Watch request")
        const offset = update_id + 1;
        const res = await request.get(`https://api.telegram.org/bot${cTgToken}/getUpdates?offset=${offset}&timeout=300`);
        const data = JSON.parse(res);

        for (const e of data.result) {
            update_id = e.update_id;
            message = e.message;
            if (!message) {
                continue
            }
            if (!message.text) {
                continue
            }
            const args = message.text.split(' ');

            if (args[0] === '/get-node') {
                const nodename = args[1]
                if (!nodename) {
                    continue
                }
                await warn(JSON.stringify(await getNodeData(nodename), undefined, 4))
            }
            if (args[0] === '/get-node-all') {
                const l = await getNodeDataList();
                const b = new Map(Array.from(l.entries()));
                const m = {};
                for (const [k, v] of b.entries()) {
                    m[k] = formatData(v);
                }
                await warn(JSON.stringify(m, undefined, 4));
            }
            if (args[0] === '/get-node-list') {
                const tagsname = args[1]
                if (!tagsname) {
                    continue
                }
                const l = await getNodeDataList();
                const b = new Map(Array.from(l.entries()).filter(e => e[1].tagName === tagsname));
                const m = {};
                for (const [k, v] of b.entries()) {
                    m[k] = formatData(v);
                }
                await warn(JSON.stringify(m, undefined, 4));
            }
            if (args[0] === '/help') {
                await warn('/get-node [node-name]\r\n/get-node-all\r\n/get-node-list [node-tags]');
            }
        }
    }
}

async function main() {
    await watch_stopped()
    setInterval(watch_stopped, cDuration * 1000)
    setInterval(watch_alldata, cDuration * 6 * 1000)
    watch_request()
}

main()
