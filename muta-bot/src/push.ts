import * as path from "path";
import queue from "async/queue";
import * as shell from "shelljs";

import config from "./config";

const mutaPath = path.join(__dirname, "../muta");

const pushQueue = queue(async function(payload, callback) {
  if (
    payload.repository.full_name !== config.code_repo &&
    payload.ref !== "refs/heads/" + config.code_branch
  ) {
    return;
  }

  const child = shell.exec(
    `cd ${mutaPath} && git pull origin ${config.code_branch} && make docker-build && make docker-push`,
    { async: true }
  );
  child.stdout.on("data", function(data) {
    console.log(data);
  });

  child.stderr.on("data", function(data) {
    console.error(data);
  });

  callback();
}, 1);

export async function pushHandler(payload) {
  pushQueue.push(payload);
}
