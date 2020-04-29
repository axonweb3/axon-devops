import * as fs from 'fs';
import { promisify } from 'util';
import * as child_process from 'child_process';

import * as probot from "probot";
import * as shell from 'shelljs';
import * as k8s from '@kubernetes/client-node';
import * as mutasdk from "muta-sdk";
import * as config from './config';

const cAction = ['opened', 'synchronize'];
const cBranch = ['master'];
const cData = '/tmp/';
const cTimeout = 2 * 3800 * 1000;
const cSteps = 4 * 6;
const cSleep = 5 * 60 * 1000;

var vData = new Map<string, Array<{ stop: boolean, data: Array<any> }>>();

const kc = new k8s.KubeConfig();
kc.loadFromFile(config.KUBE_CONFIG);
const k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api);

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const execAsync = promisify(shell.exec);

async function getBenchResult(name: string) {
  const r = await k8sCoreApi.listNamespacedPod("mutadev")

  var n = 0;

  while (true) {
    for (const e of r.body.items) {
      if ((e.spec!.containers[0].image!.startsWith("mutadev/muta-benchmark")) && (e.metadata!.name!.startsWith(name))) {
        if (e.status!.conditions![0].reason === 'PodCompleted') {
          const a = (await k8sCoreApi.readNamespacedPodLog(e.metadata!.name!, 'mutadev')).body;
          const b = a.split('\n').filter(e => e);
          const c = JSON.parse(b[b.length - 1]);
          var s = 0;
          for (const e of c.blocks) {
            s += e[2];
          }
          c.avg_round = s / c.blocks.length;
          c.blocks = undefined;
          c.start = undefined;
          c.end = undefined;
          return c;
        }
      }
    }
    n += 1
    if (n > 64) {
      return {}
    }
    await new Promise(resolve => setTimeout(resolve, 60 * 1000));
  }
}


async function getNodeData(name) {
  var res = await k8sCoreApi.readNamespacedService(name, config.KUBE_NAMESPACE);
  var dst = function (): string {
    if (config.KUBE_NETWORK_REQ === 0) {
      return `http://${config.KUBE_PROXY}/api/v1/namespaces/mutadev/services/${res.body.metadata?.name}:api/proxy/graphql`
    } else if (config.KUBE_NETWORK_REQ === 1) {
      var apiPort = 0;
      res.body.spec?.ports?.forEach((e) => {
        if (e.name == 'api') {
          apiPort = e.port;
        }
      })
      return 'http://' + res.body.spec?.clusterIP + ':' + apiPort + '/graphql';
    } else {
      var apiPort = 0;
      res.body.spec?.ports?.forEach((e) => {
        if (e.name == 'api') {
          apiPort = e.nodePort!;
        }
      })
      return 'http://' + config.KUBE_HOST + ':' + apiPort + '/graphql';
    }
  }()
  var sdk = new mutasdk.Muta({
    endpoint: dst,
    chainId: 'b6a4d7da21443f5e816e8700eea87610e6d769657d6b8ec73028457bf2ca4036',
  }).client();

  var ret = {
    height: 0,
  };
  try {
    ret.height = await sdk.getLatestBlockHeight();
    console.log(dst, ret.height);
  } catch (err) {
    console.log(dst, err);
  }
  return ret;
}

async function getNodeDataList(prefix: string) {
  var running = new Map();
  var res = await k8sCoreApi.listNamespacedService(config.KUBE_NAMESPACE);

  for await (const e of res.body.items) {
    if (!e.metadata?.name?.startsWith(prefix)) {
      continue
    }
    const data = await getNodeData(e.metadata.name);
    running.set(e.metadata.name, data);
  }
  return running
}

export async function buildChainByIssueComment(context: probot.Context) {
  // Example of body:
  // https://github.com/nervosnetwork/muta/branch/master/commid/bb04d2c961110276d38cf0e07239d5e72e8125a8
  if (!context.payload.comment.body.startsWith('https://')) {
    return
  }
  const seps = context.payload.comment.body.slice(8).split('/');
  const repoAddr = 'https://' + seps[0] + '/' + seps[1] + '/' + seps[2];
  const branch = seps[4];
  const commit = seps[6];
  const timeout = parseInt(seps[8])
  setTimeout(async function () {
    try {
      runOnK8s(context, repoAddr, branch, commit, "muta-" + commit, "muta-" + commit, timeout * 3600 * 1000);
    } catch (err) {
      console.log(err)
    }
  }, 1000)
}

async function runOnK8s(
  context: probot.Context,
  remoteRepoAddress: string,
  remoteBranch: string,
  commitID: string | undefined,
  destName: string,
  kubeName: string | undefined,
  timeout: number,
) {
  await context.github.issues.createComment(
    context.issue({ body: "Accept request." })
  );
  await execAsync(`git clone -b ${remoteBranch} ${remoteRepoAddress} ${destName}`, { cwd: cData })
  if (commitID !== undefined) {
    await execAsync(`git checkout ${commitID}`, { cwd: cData + '/' + destName })
  } else {
    var _code, output = await execAsync('git rev-parse --short HEAD', { cwd: cData + '/' + destName });
    commitID = output.trim()
  }
  await execAsync('make docker-build', { cwd: cData + '/' + destName });
  await execAsync('make docker-push', { cwd: cData + '/' + destName });
  shell.rm('-rf', cData + '/' + destName);

  var txt = "";
  if (!kubeName) {
    kubeName = 'muta-' + commitID;
  }
  txt = String(fs.readFileSync('kube-template.yaml'));
  txt = txt.replace('mutadev/muta:latest', 'mutadev/muta:' + commitID);
  txt = txt.replace('muta-example', kubeName);
  fs.writeFileSync(`${config.ROOT_K8SYAML_PATH}/kube_${commitID}.yaml`, txt);
  try {
    await execAsync(`kubectl delete -n mutadev muta.nervos.org ${kubeName}`);
  } catch (err) {
    // Safe to ignore
  }
  await sleep(60 * 1000);
  await execAsync(`kubectl apply -f ${config.ROOT_K8SYAML_PATH}/kube_${commitID}.yaml`);

  setTimeout(async function () {
    await execAsync(`kubectl delete -f ${config.ROOT_K8SYAML_PATH}/kube_${commitID}.yaml`);
  }, timeout)

  if (!vData.has(kubeName)) {
    vData.set(kubeName, new Array());
  }
  for (var e of vData.get(kubeName)!) {
    e.stop = true;
  }
  const vDataIndex = vData.get(kubeName)!.push({ stop: false, data: new Array() }) - 1;

  await context.github.issues.createComment(
    context.issue({ body: `Docker builded. "mutadev/muta:${commitID}"\nRun chaos test on k8s named "${kubeName}"\nTest lasts 2 hours` })
  );
  await sleep(60 * 1000);

  for (var i = 0; i < cSteps; i++) {
    var line = new Array();
    const date = new Date().toISOString();
    line.push(date);

    var running = await getNodeDataList(kubeName);
    for (const k of Array.from(running.keys())) {
      line.push(running.get(k).height);
    }
    vData.get(kubeName)![vDataIndex].data.push(line);
    await sleep(cSleep);
  }

  if (!vData.get(kubeName)![vDataIndex].stop && vData.get(kubeName)![vDataIndex].data.length !== 0) {
    const lineLength = vData.get(kubeName)![vDataIndex].data[0].length

    const headLine = new Array();
    headLine.push(`Date(${kubeName})`);
    for (var i = 1; i < lineLength; i++) {
      headLine.push(i);
    }
    const prefixLine = new Array();
    for (var i = 0; i < lineLength; i++) {
      prefixLine.push('---');
    }
    txt = '';
    for (const line of vData.get(kubeName)![vDataIndex].data) {
      txt += line.join('|')
      txt += '\n';
    }
    const benchout = await getBenchResult(kubeName);
    txt = headLine.join('|') + '\n' + prefixLine.join('|') + '\n' + txt + '\n\n'
    txt = txt + `tx_block|sec_block|tx_sec|avg_round\n---|---|---|---\n${benchout.tx_block}|${benchout.sec_block}|${benchout.tx_sec}|${benchout.avg_round}`

    await context.github.issues.createComment(
      context.issue({ body: txt })
    );
    vData.delete(kubeName);
  }
}

export async function pullRequestHandler(context: probot.Context) {
  const payload = context.payload;
  if (payload.pull_request.base.repo.full_name !== config.CODE_REPO) {
    console.log('Ignore, repo is', payload.pull_request.base.repo.full_name)
    return
  }
  if (!cAction.includes(payload.action)) {
    console.log('Ignore, action is', payload.action)
    return
  }
  if (!cBranch.includes(payload.pull_request.base.ref)) {
    console.log('Ignore, base branch is not master')
    return
  }

  const remoteRepoAddress = payload.pull_request.head.repo.clone_url;
  const remoteBranch = payload.pull_request.head.ref;
  const remoteSha = payload.pull_request.head.sha;
  const repoPullRequestNumber = payload.pull_request.number;
  const repoName = payload.pull_request.head.repo.name;
  const kubeName = 'muta-pr' + repoPullRequestNumber;
  const destPath = `${repoName}_pr${repoPullRequestNumber}_${remoteSha}`;

  console.log('Remote repo address is', remoteRepoAddress);
  console.log('Remote branch is', remoteBranch);

  setTimeout(async function () {
    try {
      runOnK8s(context, remoteRepoAddress, remoteBranch, undefined, destPath, kubeName, cTimeout);
    } catch (err) {
      console.log(err)
    }
  }, 1000)
}


function init() {
  fs.readdirSync(config.ROOT_K8SYAML_PATH).forEach(file => {
    console.log(`find ${file}, try release it`)
    child_process.exec(`kubectl delete -f ${file}`, { cwd: config.ROOT_K8SYAML_PATH }, (err, stdout, stderr) => {
      if (err) { console.log(err) }
      child_process.exec(`rm ${file}`, { cwd: config.ROOT_K8SYAML_PATH }, (err, stdout, stderr) => {
        if (err) { console.log(err) }
      });
    });
  });
}

init();
