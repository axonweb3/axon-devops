.DEFAULT_GOAL:=help
height := `curl -s -H 'content-type: application/json' --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":2}' http://127.0.0.1:8000 | awk -F"[:\"]+" '{print $$6}' |xargs printf %d`
axon_verson := `docker-compose exec axon1 ./axon --version`

help: ## Display this help
		@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m\033[0m\n\nTargets:\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

clean: ## Clean up axon data and logs
	make stop
	@rm -rf ./devtools/chain/data1 ./devtools/chain/data2 ./devtools/chain/data3 ./devtools/chain/data4
	@rm -rf ./logs1 ./logs2 ./logs3 ./logs4

start: ## Start axon nodes
	docker-compose up -d

stop: ## Stop axon nodes
	docker-compose down

status: ## Show axon containers
	docker-compose ps

height: ## Show axon chain block height
	@echo "Current chain block height" $(height)

version: ## Show axon version
	@echo $(axon_verson)

