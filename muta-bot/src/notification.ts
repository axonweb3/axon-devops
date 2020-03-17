import * as config from './config'

import {TelegramClient} from 'messaging-api-telegram'

export default function (text) {
  if (!config.TELEGRAM_BOT_KEY) {
    throw new Error('cannot find TELEGRAM_BOT_KEY config')
  }


  const chat_id = config.TELEGRAM_CHAT_ID

  const client = TelegramClient.connect(config.TELEGRAM_BOT_KEY)

  client.sendMessage(
    chat_id,
    text,
    {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
      disable_notification: false,
    }
  );
}
