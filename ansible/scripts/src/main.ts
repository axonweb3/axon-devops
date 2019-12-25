import { monitor } from "./monitor";
import { randomChaos } from "./chaos_monkey";
import { tx_sender } from "./tx_sender";
import { log, CHAIN_META } from "./utils";

log("start_scripts", { chain: CHAIN_META.chain_id }, "info", true);
setInterval(monitor, 5 * 60 * 1000);
setInterval(randomChaos, 5 * 60 * 1000);
setInterval(tx_sender, 1000);
