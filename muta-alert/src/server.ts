import bodyParser from 'body-parser';
import express from 'express';
import { getTelegramBotInstance } from './telegram';

const app = express();

app.use(bodyParser.json({ type: 'application/json' }));
app.use(bodyParser.urlencoded({ extended: true }));

function renderAlerting(alert) {
  const annotations = alert.annotations ?? {};
  const { alertname, instance, job } = alert.labels ?? {};
  return `**${alertname}-${instance}-${job}**

**${annotations.summary}**

${annotations.description}

\`\`\`json
${JSON.stringify(alert.labels, null, 2)}
\`\`\`
  `;
}

const telegram = getTelegramBotInstance();

app.post('/', async (req, res) => {
  await telegram.sendMessage(
    process.env.CHAT_ID,
    req.body.alerts.map(renderAlerting).join('\n'),
    { parse_mode: 'Markdown' },
  );
  res.send('');
});

const port = process.env.ALERTING_PORT;
app.listen(port, () => {
  console.log(`🚀 server start at http://127.0.0.1:${port}`);
});
