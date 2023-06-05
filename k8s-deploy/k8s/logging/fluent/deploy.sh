#!/usr/bin/env bash

function clean() {
    set +e
    echo "DEBUG" "Clean env to delete old fluent, please wait..."

    (kubectl get DaemonSet -n "logging" -o json | jq --raw-output '.items[].metadata.name' | grep -E "^fluentd" || true) | while read -r name; do
        kubectl delete DaemonSet "$name" -n "logging">/dev/null 2>&1
    done
    (kubectl get cm -n "logging" -o json | jq --raw-output '.items[].metadata.name' | grep -v "^kube" || true) | while read -r name; do
        kubectl delete cm "$name" -n "logging">/dev/null 2>&1
    done
    kubectl delete namespace logging
}
function create_configmap() {
    kubectl create namespace logging
    kubectl create configmap fluentd-config --from-file=./logging/fluent/fluentd-configmap.yaml -n logging

}
function deploy_fluentd(){
    kubectl apply -f ./logging/fluent/fluentd-daemonset.yaml
    echo "DEBUG" "waiting for fluntd running..."
    sleep 120
    fluentd_running_num=`kubectl get pod -n logging | grep -i "fluentd" |grep -ci "running"`
    if [[ $fluentd_running_num -lt 4 ]]; then
       echo "fluentd not stable,please have a check"
    else
       echo "fluentd running"
    fi
}


function main() {
    case $1 in
        "deploy")
            create_configmap
            deploy_fluentd
            ;;
        "deploy_fluentd")
            deploy_fluentd
            ;;
        "create_configmap")
            create_configmap
            ;;
        "clean")
            clean
            ;;
        esac
}

main $*

