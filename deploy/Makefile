.DEFAULT_GOAL:=help
help: ## Display this help
				@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m\033[0m\n\nTargets:\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

deploy: ## Deploy axon
	ansible-playbook build.yml --tags build && ansible-playbook -i axon_node.yml deploy.yml --tags deploy,shutdown,start 

clean: ## Clean axon data
	ansible-playbook -i axon_node.yml deploy.yml --tags shutdown,clean 

start: ## Start axon
	ansible-playbook -i axon_node.yml deploy.yml --tags start

stop: ## Stop axon
	ansible-playbook -i axon_node.yml deploy.yml --tags shutdown

config: ## Update axon config
	ansible-playbook -i axon_node.yml deploy.yml --tags config

build: ## Build axon binary
	ansible-playbook build.yml --tags build

check: ## View the axon process
	ansible -i axon_node.yml axon -m shell -a "ps -ef  | grep axon"

block: ##View the block height of the current node
	ansible-playbook -i axon_node.yml deploy.yml --tags block_number

