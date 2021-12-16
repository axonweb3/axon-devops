import { CHAIN_ID, CHAIN_META, logger, URLS, log } from "./utils";
const { Muta, utils, AssetService } = require("muta-sdk");

let latest_epoch_id = 0;

export async function monitor() {
  const current_epoch_ids = await Promise.all(
    URLS.map(async url => {
      const muta = new Muta({
        endpoint: url,
        chainId: CHAIN_ID
      });
      try {
        return await muta.client.getEpochHeight();
      } catch (error) {
        logger.error({ name: "fail_to_get_epoch_id", error, url });
        return -1;
      }
    })
  );
  logger.info({ name: "latest_epoch_ids", current_epoch_ids });
  const current_epoch_id = Math.max(...current_epoch_ids);
  if (current_epoch_id <= latest_epoch_id) {
    const context = {
      latest_epoch_id,
      current_epoch_ids,
    };
    log("chain_stops", context, "error", true);
  } else {
    latest_epoch_id = current_epoch_id;
  }
}

// setInterval(monitor, 5000);
