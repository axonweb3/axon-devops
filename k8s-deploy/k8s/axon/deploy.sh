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

#delete sts
k delete -f /home/ckb/axon-devops/k8s-deploy/k8s/axon/axon1-statefulset.yaml
k delete -f /home/ckb/axon-devops/k8s-deploy/k8s/axon/axon2-statefulset.yaml
k delete -f /home/ckb/axon-devops/k8s-deploy/k8s/axon/axon3-statefulset.yaml
k delete -f /home/ckb/axon-devops/k8s-deploy/k8s/axon/axon4-statefulset.yaml

#delete pvcs
k delete pvc data1-axon1-0 -n axon
k delete pvc data2-axon2-0 -n axon
k delete pvc data3-axon3-0 -n axon
k delete pvc data4-axon4-0 -n axon

# create sts
k apply -f /home/ckb/axon-devops/k8s-deploy/k8s/axon/axon1-statefulset.yaml
k apply -f /home/ckb/axon-devops/k8s-deploy/k8s/axon/axon2-statefulset.yaml
k apply -f /home/ckb/axon-devops/k8s-deploy/k8s/axon/axon3-statefulset.yaml
k apply -f /home/ckb/axon-devops/k8s-deploy/k8s/axon/axon4-statefulset.yaml
k apply -f /home/ckb/axon-devops/k8s-deploy/k8s/axon/axon-chain.yaml

