#!/bin/sh
kubectl delete -f ./axon-chaos.yaml
sleep 120
kubectl apply -f ./axon-chaos.yaml

