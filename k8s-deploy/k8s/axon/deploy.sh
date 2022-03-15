#!/bin/sh
# create configmap for axon
kubectl delete configmap node1-toml -n axon
kubectl delete configmap node2-toml -n axon
kubectl delete configmap node3-toml -n axon
kubectl delete configmap node4-toml -n axon
kubectl delete configmap genesis -n axon

kubectl create configmap node1-toml --from-file=/home/ckb/axon-devops/k8s-deploy/k8s/axon/axon-config/node_1.toml -n axon
kubectl create configmap node2-toml --from-file=/home/ckb/axon-devops/k8s-deploy/k8s/axon/axon-config/node_2.toml -n axon
kubectl create configmap node3-toml --from-file=/home/ckb/axon-devops/k8s-deploy/k8s/axon/axon-config/node_3.toml -n axon
kubectl create configmap node4-toml --from-file=/home/ckb/axon-devops/k8s-deploy/k8s/axon/axon-config/node_4.toml -n axon
kubectl create configmap genesis --from-file=/home/ckb/axon-devops/k8s-deploy/k8s/axon/axon-config/genesis.json -n axon

# create sts
k apply -f /home/ckb/axon-devops/k8s-deploy/k8s/axon/axon1-deployment.yaml
k apply -f /home/ckb/axon-devops/k8s-deploy/k8s/axon/axon2-deployment.yaml
k apply -f /home/ckb/axon-devops/k8s-deploy/k8s/axon/axon3-deployment.yaml
k apply -f /home/ckb/axon-devops/k8s-deploy/k8s/axon/axon4-deployment.yaml
k apply -f /home/ckb/axon-devops/k8s-deploy/k8s/axon/axon-chain.yaml

