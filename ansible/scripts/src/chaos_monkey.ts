import { DOCKER_COMPOSE_CONFIG, logger, logAndNotify } from "./utils";
import { exec } from "child_process";
const uuidv1 = require("uuid/v1");

const TARGETS = Object.entries(DOCKER_COMPOSE_CONFIG.services)
  .filter(entry => entry[0] !== "scripts")
  .map(entry => entry[1]["container_name"]);

/**
 * - duration: e.g. '30s', unit can be 'ms/s/m/h'
 * - target: container name, e.g. 'bft_node1'
 * - Supported actions and extra params:
 *   - net_delay
 *     - time: delay time in milliseconds, e.g. 3000
 *   - net_loss
 *     - percent: loss percent, e.g. 50
 *   - net_dup
 *     - percent: duplicate percent, e.g. 50
 *   - net_corrupt
 *     - percent: corrupt percent, e.g. 50
 *   - pause
 *
 * examples:
 *   - {action: 'net_delay', duration: '10s', target: 'bft_node1', params: {time: 3000}}
 *   - {action: 'net_loss', duration: '10s', target: 'bft_node1', params: {percent: 80}}
 *   - {action: 'net_dup', duration: '10s', target: 'bft_node1', params: {percent: 80}}
 *   - {action: 'net_corrupt', duration: '10s', target: 'bft_node2', params: {percent: 40}}
 *   - {action: 'pause', duration: '10s', target: 'bft_node1', params: {}}
 */
interface Action {
  action: string;
  duration: string;
  target: string;
  params: object;
}

const ACTIONS = ["net_delay", "net_loss", "net_dup", "net_corrupt", "pause"];

function choose(choices) {
  let index = Math.floor(Math.random() * choices.length);
  return choices[index];
}

// gen a random int between a and b
function randomInt(a: number, b: number): number {
  return Math.floor(Math.random() * (b - a)) + a;
}

function genRandomAction() {
  let action = choose(ACTIONS);
  let params = {};
  if (["net_loss", "net_dup", "net_corrupt"].includes(action)) {
    params["percent"] = randomInt(30, 80);
  } else if (action === "net_delay") {
    params["time"] = randomInt(1000, 3000);
  }
  let duration = "1m";
  let target = choose(TARGETS);
  let result = {
    action,
    duration,
    target,
    params
  };
  return result;
}

async function runAction(action: Action) {
  let cmd = "";
  if (action.action === "net_delay") {
    cmd = `pumba netem --duration ${action.duration} delay --time ${action.params["time"]} ${action.target}`;
  } else if (action.action === "net_loss") {
    cmd = `pumba netem --duration ${action.duration} loss --percent ${action.params["percent"]} ${action.target}`;
  } else if (action.action === "net_dup") {
    cmd = `pumba netem --duration ${action.duration} duplicate --percent ${action.params["percent"]} ${action.target}`;
  } else if (action.action === "net_corrupt") {
    cmd = `pumba netem --duration ${action.duration} corrupt --percent ${action.params["percent"]} ${action.target}`;
  } else if (action.action === "pause") {
    cmd = `pumba pause --duration ${action.duration} ${action.target}`;
  } else {
    throw `action [${action.action}] not support!`;
  }
  const action_id = uuidv1();
  logger.info({ name: "chaos_action_start", cmd, action, action_id });

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      logAndNotify(
        "chaos_action_fail",
        { action_id, action, cmd, stdout, stderr },
        "error"
      );
    } else {
      logAndNotify("chaos_action_success", { action_id, action, cmd });
    }
  });
}

export async function randomChaos() {
  let action = genRandomAction();
  runAction(action);
}

// setInterval(randomChaos, 5000);
