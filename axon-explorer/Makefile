.DEFAULT_GOAL:=help
help: ## Display this help
			@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m\033[0m\n\nTargets:\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

start: ## Start axon explorer
	ansible-playbook explorer.yml --tags dwon,config,build,up

stop: ## Stop axon explorer
	ansible-playbook explorer.yml --tags down

