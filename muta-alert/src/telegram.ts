import { Agent } from 'http';
import SocksAgent from 'socks5-https-client/lib/Agent';
import { Telegram } from 'telegraf';
import { URL } from 'url';

export function getAgent(): Agent | null {
  const proxy = process.env.HTTPS_PROXY || process.env.HTTP_RPOXY;
  if (!proxy) return null;

  const url = new URL(proxy);

  if (url.protocol.startsWith('socks5')) {
    return new SocksAgent({
      socksHost: url.hostname,
      socksPort: url.port,
    });
  }

  throw new Error('only socks5 proxy supported now');
}

export function getTelegramBotInstance(): Telegram {
  const agent = getAgent();
  return new Telegram(process.env.BOT_TOKEN, {
    ...(agent ? { agent } : {}),
  });
}
