#! /bin/bash

pids=`ps -ef | grep /home/ckb/axon-devops/benchmark/benchmark/index.js  | grep -v 'grep' | awk '{print $2}'`
echo $pids

for pid in $pids
do
    echo "Kill benchmark with pid of $pid"
    kill -9 $pid
done

if [ ! -n "$1" ];then
        node /home/ckb/axon-devops/benchmark/benchmark/index.js
else
        node $1
fi
