import { URLS, CHAIN_ID, logger } from "./utils";
const { Muta, utils, AssetService } = require("muta-sdk");

const from_addr = "f8389d774afdad8755ef8e629e5a154fddc6325a";
const from_pk =
  "45c56be699dca666191ad3446897e0f480da234da896270202514a0e1a587c3f";
const to_addr = "0000000000000000000000000000000000000001";
const asset_id =
  "f56924db538e77bb5951eb5ff0d02b88983c49c45eea30e8ae3e7234b311436c";

// keep sending tx to every node
export async function tx_sender() {
  URLS.map(async url => {
    const muta = new Muta({
      endpoint: url,
      chainId: CHAIN_ID,
    });
    const client = muta.client;
    const account = muta.accountFromPrivateKey(from_pk);
    const service = new AssetService(client, account);
    try {
      const transferHash = await service.transfer({
        asset_id,
        to: to_addr,
        value: 1
      });
      logger.info({ name: "send_tx", url, transferHash });
    } catch (error) {
      logger.error({ name: "fail_to_send_tx", error, url });
    }
    // const balance2 = await service.getBalance(asset_id, to_addr);
    // console.log(balance2);
  });
}

// setInterval(tx_sender, 1000);
