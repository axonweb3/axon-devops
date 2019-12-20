import { URLS, CHAIN_ID, logger } from "./utils";
import { Muta } from "muta-sdk";

const from_addr = "0x103e9b982b443592ffc3d4c2a484c220fb3e29e2e4";
const from_pk =
  "0x1ab5dfb50a38643ad8bbcbb27145825ddba65e67c72ec9bb643b72e190a27509";
const to_addr = "0x100000000000000000000000000000000000000001";
const asset_id =
  "0xfee0decb4f6a76d402f200b5642a9236ba455c22aa80ef82d69fc70ea5ba20b5";

// keep sending tx to every node
export async function tx_sender() {
  URLS.map(async url => {
    const muta = new Muta({
      endpoint: url,
      chainId: CHAIN_ID
    });
    const account = muta.accountFromPrivateKey(from_pk);
    const tx = await muta.client.prepareTransferTransaction({
      carryingAmount: "0x01",
      carryingAssetId: asset_id,
      receiver: to_addr
    });
    const signedTx = account.signTransaction(tx);
    try {
      const send_transfer_tx_result = await muta.client.sendTransferTransaction(
        signedTx
      );
      // logger.info({ name: "send_tx", url, send_transfer_tx_result });
    } catch (error) {
      logger.error({ name: "fail_to_send_tx", error, url });
    }
  });
}

// setInterval(tx_sender, 1000);
