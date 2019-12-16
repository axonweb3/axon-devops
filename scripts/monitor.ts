import { muta, delay, client, CHAIN_ID } from "./utils";
import { Muta } from "muta-sdk";

const urls = ['127.0.0.1:8001', '127.0.0.1:8002'];  // check urls, get the max height result
const INTERVAL = 4000;  // check interval, ms

async function monitor(urls, interval: number = INTERVAL) {
  const clients = urls.map(url => {
    new Muta({
      endpoint: url,
      chainId: CHAIN_ID
    })
  });

}

async function main() {
  const muta_client = muta.client;
  for (let i = 0; i < 10; i++) {
    await delay(3000);
    const height = await muta_client.getEpochHeight();
    console.log(height);
  }
}

setInterval(function() {
  console.log("timer that keeps nodejs processing running");
}, INTERVAL);