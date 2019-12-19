# MUTA Overlord monitor platform

Get a muta chain with associated monitor platform in a few simple steps.

Features:
- Run a chain with specific number of nodes with specific commit version.
- Elasticsearch, kibana and fluent-bit runs with the chain. All logs and metrics will be sent to Elasticsearch and also preserved on your disk.
- A transaction sender will send transactions to every node continuously. The default interval is 1 second.
- A monitor will watch the chain. If the epoch id is not increasing in 5 minutes, it will log and send notification to telegram.
- A chaos monkey will randomly do some actions like pause nodes, delay networks, duplicate networks every 5 minutes.


## Quick Start

1. Prepare a machine with ubuntu 18. It can be a virtual machine, a physical machine or an ecs as long as you can ssh into it with user `muta`. We refer it as monitor machine below.
2. Install ansible in your machine.
3. Modify your ssh config or the hosts file `muta-dev` line with necessary information, make sure you can get success with `make test` command.
4. Modify the `.env.example` to `.env`, and edit the content with your telegram bot token and group chat id, you can get notification when the chain stops or the chaos monkey
5. Run `make` and you will get the chain and monitor platform.


- The chain runs in docker with ip `174.20.0.101` ~ `174.20.0.254`. The default node number is 4. You can change it in `muta.yml` vars.
- The `elasticsearch` runs on `4001` port. Use command `curl "127.0.0.1:4001/_cat/indices?v"` to test on your monitor machine.
- The `kibana` runs on `4002` port. Visit `127.0.0.1:4002` to interact with it.