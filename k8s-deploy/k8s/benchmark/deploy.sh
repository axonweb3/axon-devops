#!/bin/sh
# create configmap for axon
kubectl delete configmap config-benchmark -n axon-benchmark


kubectl create configmap config-benchmark --from-file=/home/ckb/axon-devops/k8s-deploy/k8s/benchmark/configap/config.json -n axon-benchmark


#delete deployment
k delete -f /home/ckb/axon-devops/k8s-deploy/k8s/benchmark/axon-benchmark.yaml


#delete svc
k delete -f /home/ckb/axon-devops/k8s-deploy/k8s/benchmark/axon-chain-to-axon-ns.yaml


# create svc & deployment
k apply -f /home/ckb/axon-devops/k8s-deploy/k8s/benchmark/axon-chain-to-axon-ns.yaml
k apply -f /home/ckb/axon-devops/k8s-deploy/k8s/benchmark/axon-benchmark.yaml