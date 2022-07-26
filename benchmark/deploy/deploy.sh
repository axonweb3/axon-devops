#!/bin/sh

start_benchmark() {
    pids=`ps -ef | grep '/home/ckb/axon-devops/benchmark/benchmark/index.js --benchmark_cases'  | grep -v 'grep' | awk '{print $2}'`
    echo $pids

    for pid in $pids
    do
      echo "Kill benchmark with pid of $pid"
      kill -9 $pid
    done

    if [ ! -n "$1" ];then
        nohup node /home/ckb/axon-devops/benchmark/benchmark/index.js --benchmark_cases="['./benchmark']" &
    else
        node $1
    fi
}
start_contract_benchmark() {
    pids=`ps -ef | grep '/home/ckb/axon-devops/benchmark/benchmark/index.js --benchmark_cases'  | grep -v 'grep' | awk '{print $2}'`
    echo $pids

    for pid in $pids
    do
      echo "Kill benchmark with pid of $pid"
      kill -9 $pid
    done

    if [ ! -n "$1" ];then
        nohup node /home/ckb/axon-devops/benchmark/benchmark/index.js --benchmark_cases="['./contract_benchmark']" &
    else
        node $1
    fi
}

main() {
    case $1 in
        "benchmark")
            start_benchmark
            ;;
        "contract_benchmark")
            start_contract_benchmark
            ;;
        esac
}

main $*
