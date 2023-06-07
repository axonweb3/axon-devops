.DEFAULT_GOAL:=help
help: ## Display this help
			@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m\033[0m\n\nTargets:\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

monitor-deploy: ## Deploy monitor
	ansible-playbook -i hosts deploy_monitor.yml --tags config,down,start 

monitor-clean: ## Clean monitor
	ansible-playbook -i hosts deploy_monitor.yml --tags down,clean

agent-deploy: ## Deploy monitor agent
	ansible-playbook -i hosts deploy_monitor_agent.yml --tags config,down,start 

agent-clean: ## Clean monitor agent
	ansible-playbook -i hosts deploy_monitor_agent.yml --tags down,clean
