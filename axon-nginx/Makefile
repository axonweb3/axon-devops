.DEFAULT_GOAL:=help
help: ## Display this help
			@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m\033[0m\n\nTargets:\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

start: ## Start nginx
	ansible-playbook deploy.yml --tags down,config,start 

clean: ## Cleanup Log
	ansible-playbook deploy.yml --tags down,clean 

stop: ## Stop nginx
	ansible-playbook deploy.yml --tags down

config: ## Update config
	ansible-playbook deploy.yml --tags config

