#!/usr/bin/env bash

function clean() {
    set +e
    echo "DEBUG" "Clean env to delete old axon benchmarks, please wait..."

    (kubectl get Deployment -n "axon-benchmark" -o json | jq --raw-output '.items[].metadata.name' | grep -E "^axon" || true) | while read -r name; do
        kubectl delete Deployment "$name" -n "axon-benchmark">/dev/null 2>&1
    done
    (kubectl get cm -n "axon-benchmark" -o json | jq --raw-output '.items[].metadata.name' | grep -v "^kube" || true) | while read -r name; do
        kubectl delete cm "$name" -n "axon-benchmark">/dev/null 2>&1
    done
    (kubectl get svc -n "axon-benchmark" -o json | jq --raw-output '.items[].metadata.name' | grep -E "^axon" || true) | while read -r name; do
        kubectl delete svc "$name" -n "axon-benchmark">/dev/null 2>&1
    done
}
function create_configmap() {
    echo "DEBUG" "create configmap for axon benchmark, please wait..."
    kubectl create configmap config-benchmark --from-file=/home/ckb/axon-devops/k8s-deploy/k8s/benchmark/configmap/config.json -n axon-benchmark
   
}
function deploy_axon_benchmark(){
    echo "DEBUG" "deploy axon benchmark, please wait..."
    # create svc & deployment
    kubectl apply -f /home/ckb/axon-devops/k8s-deploy/k8s/benchmark/axon-chain-to-axon-ns.yaml
    kubectl apply -f /home/ckb/axon-devops/k8s-deploy/k8s/benchmark/axon-benchmark.yaml
    echo "DEBUG" "waiting for axon benchmark running..."
    sleep 60
    axon_benchmark_num=`kubectl get pod -n axon-benchmark | grep -i "axon" |grep -ci "running"`
    if [[ $axon_benchmark_num -lt 1 ]]; then
       echo "axon benchmark not stable,please have a check"
    else
       echo "axon benchmark running"
    fi
}


function main() {
    case $1 in
        "deploy")
            create_configmap
            deploy_axon_benchmark
            ;;
        "deploy_axon_benchmark")
            deploy_axon_benchmark
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

