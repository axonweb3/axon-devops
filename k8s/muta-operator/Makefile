all:
	operator-sdk generate k8s
	operator-sdk build docker.io/mutadev/muta-operator
	docker push docker.io/mutadev/muta-operator
	sed -i "" 's|REPLACE_IMAGE|docker.io/mutadev/muta-operator|g' deploy/operator.yaml
