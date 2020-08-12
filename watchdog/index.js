const k8s = require('@kubernetes/client-node');
const { Muta } = require("@mutadev/muta-sdk");
const timestring = require('timestring')

const WATCH_DURATION = process.env.WATCH_DURATION ? process.env.WATCH_DURATION : "3h";
const APP_NAMESPACE = process.env.APP_NAMESPACE ? process.env.APP_NAMESPACE : 'mutadev';
const APP_NAME = process.env.APP_NAME;
const APP_PORT = process.env.APP_PORT ? process.env.APP_PORT : '8080';
const APP_GRAPHQL_URL = process.env.APP_GRAPHQL_URL ? process.env.APP_GRAPHQL_URL : 'graphql';
const APP_CHAIN_ID = process.env.APP_CHAIN_ID ? process.env.APP_CHAIN_ID : "0xb6a4d7da21443f5e816e8700eea87610e6d769657d6b8ec73028457bf2ca4036";

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api);

async function run() {
    console.log(process.env);
    console.log("watchdog start, first sleep 5m");
    await sleep(timestring("5m") * 1000);

    const nodeEndpoints = await getNodeEndPoints(APP_NAMESPACE, APP_NAME, APP_GRAPHQL_URL, APP_PORT);

    if (nodeEndpoints.length === 0) {
        throw new Error(`find empty endpoint, the app is ${APP_NAME}`);
    }

    console.log(`all node endpoints:\n${nodeEndpoints.join("\n")}`);

    runCheckStatus(nodeEndpoints).catch(e => {
        console.error(`[check status] ${e}`);
        process.exit(1);
    })

    setTimeout(() => {
        console.log("success exit");
        process.exit(0);
    }, timestring(WATCH_DURATION) * 1000)
}

run().catch(console.error);

async function getNodeEndPoints(ns, appName, graphql, appPort) {
    const res = await k8sCoreApi.listNamespacedService(ns);
    const services = res.body.items.filter(e => e.metadata.name.startsWith(appName));

    const nodeEndpoints = services.map(service => `http://${service.metadata.name}.${ns}:${appPort}/${graphql}`);
    return nodeEndpoints;
}

async function runCheckStatus(nodeEndpoints) {
    const clients = nodeEndpoints.map(point => {
        return new Muta({
            endpoint: point,
            chainId: APP_CHAIN_ID
        }).client();
    });

    while (true) {
        let last_list_height = Array.from({ length: clients.length }).fill(0);

        const list_height = await retryGetHeight(clients);

        console.log(`[status] the height of all node ${list_height}`);

        for (let i = 0; i < list_height; i++) {
            let last_height = last_list_height[i];
            let height = list_height[i];

            if (last_height == height) {
                throw new Error(`chain stop: last height ${last_height}, current height ${height}`);
            }
        }

        await sleep(1000 * 10); // sleep 10s
    }
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function retryGetHeight(clients) {
    const iter = Array.from({ length: 60 }).map((_ele, i) => i);

    for (const counter of iter) {
        try {
            const list_height = await Promise.all(clients.map(client => client.getLatestBlockHeight()));
            return list_height;
        } catch (err) {
            console.error(`[status]: get height error ${err} counter ${counter}`);

            if (counter >= iter.length) {
                console.error("[status]: retry reach limit");
                throw err;
            }

            await sleep(1000 * 10); // sleep 10s
        }
    }
}
