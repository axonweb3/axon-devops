.DEFAULT_GOAL:=help
help: ## Display this help
			@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m\033[0m\n\nTargets:\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)
SHELL = bash
axon-deploy: ## Deploy axon
	./axon/deploy.sh deploy

axon-clean: ## Clean axon
	./axon/deploy.sh clean

benchmark-deploy: ## Deploy benchmark
	./benchmark/deploy.sh deploy

benchmark-clean: ## Clean benchmark
	./benchmark/deploy.sh clean

fluntd-deploy: ## Deploy fluntd
	./logging/fluent/deploy.sh deploy

fluntd-clean: ## Clean fluntd
	./logging/fluent/deploy.sh clean
