import { monitor } from "./monitor";
import { randomChaos } from "./chaos_monkey";
import { tx_sender } from "./tx_sender";

setInterval(monitor, 5 * 60 * 1000);
setInterval(randomChaos, 5 * 60 * 1000);
setInterval(tx_sender, 1000);
