# Muta-alerting

a Telegram alerting bot, works with [Alertmanager](https://prometheus.io/docs/alerting/alertmanager/)

## Quick Start

### Build the project

```
git clone https://github.com/homura/muta-alert.git
cd muta-alert
npm i
npm run build
```

### Create a `.env`

```
# server listening port
ALERTING_PORT=5001

# telegram bot token
BOT_TOKEN=

# group chat id
CHAT_ID=-359650433

# proxy, now only socks5 protocol supported
HTTPS_PROXY=socks5://127.0.0.1:1080
```

### Start the server

```
npm run start
# 🚀 server start at http://127.0.0.1:5001
```

## Prometheus alert configuration example

prometheus.yaml
```yaml
  rules:

  # Alert for large round found
  - alert: LargeRoundFound
    expr: overlord_processing_round_count > 3
    for: 20s
    labels:
      severity: page
    annotations:
      summary: "Over {{ $labels.round }} round"
      description: "{{ $labels.blockHeight }} processing over {{ $labels.round }} round, @foo @bar, please take a look"
```
