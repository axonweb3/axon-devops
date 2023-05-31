.DEFAULT_GOAL:=help
server_port := `cat ./config.yml  | grep axon_faucet_server_port |awk -F"\"" '{print $$2}'`
help: ## Display this help
		@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m\033[0m\n\nTargets:\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

start: ## Start axon faucet
	ansible-playbook deploy.yml --tags dwon,config,up

stop: ## Stop axon faucet
	ansible-playbook deploy.yml --tags down

restart: ## Restart axon facuet
	ansible-playbook deploy.yml --tags down,up

init: ## Mnemonic initialization
	curl http://localhost:$(server_port)/api/import-mnemonic?mnemonic=test%20test%20test%20test%20test%20test%20test%20test%20test%20test%20test%20junk

