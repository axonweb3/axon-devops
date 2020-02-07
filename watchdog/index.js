const k8s = require('@kubernetes/client-node');
const mutasdk = require("muta-sdk");
const request = require("request-promise-native");

const cUseProxy = process.env.USE_PROXY !== undefined;
const cProxyHostPort = process.env.PROXY_HOSTPORT;
const cTgToken = process.env.TG_TOKEN;
const cChatID = process.env.CHAT_ID;
const cDuration = process.env.DURATION ? parseInt(process.env.DURATION) : 300;

const kc = new k8s.KubeConfig();
kc.loadFromFile('./config/kube.config');

const k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api);

var records = new Map();

async function warn(text) {
    console.log(text)
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

async function once() {
    console.log(new Date(), "Check once")
    var running = new Map();
    var created = new Map();
    var deleted = new Map();
    var stopped = new Map();

    var res = await k8sCoreApi.listNamespacedService('mutadev');

    for await (const e of res.body.items.filter((e) => {
        return e.metadata.ownerReferences[0].kind === 'Muta'
    })) {
        var apiPort = 0;
        e.spec.ports.forEach((e) => {
            if (e.name == 'api') {
                apiPort = e.port;
            }
        })
        var dst = '';
        if (cUseProxy) {
            dst = `http://${cProxyHostPort}/api/v1/namespaces/mutadev/services/${e.metadata.name}:api/proxy/`
        } else {
            dst = 'http://' + e.spec.clusterIP + ':' + apiPort + '/'
        }
        var sdk = new mutasdk.Muta({
            endpoint: dst + 'graphql',
        }).client;

        running.set(e.metadata.name, {});

        var res = await sdk.getLatestBlockHeight();
        running.get(e.metadata.name).height = res;
        running.get(e.metadata.name).labels = e.metadata.labels['muta.nervos.org'];
    }

    Array.from(running.keys()).forEach((e) => {
        if (!records.has(e)) {
            created.set(e, running.get(e))
        }
    })
    Array.from(records.keys()).forEach((e) => {
        if (!running.has(e)) {
            deleted.set(e, running.get(e))
        }
    })
    Array.from(running.keys()).forEach((e) => {
        if (records.has(e) && running.get(e).length === records.get(e).length) {
            stopped.set(e, running.get(e))
        }
    })

    var msg = {};
    for (const [k, v] of stopped.entries()) {
        const l = v.labels;
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

async function main() {
    await once()
    setInterval(once, cDuration * 1000)
}

main()
