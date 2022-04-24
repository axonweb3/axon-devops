# Axon CLI
1. build axon on your own machine in the axon project. Replace the Dockerfile of axon project with the one under axon-cli/Dockerfile.
    docker build -t axon:v1 .

2. build axon-cli on your own machine.
    cargon build --release

3. run axon-cli with correct parameters. For example,
../target/debug/axon-cli --mount=/home/wenyuan/git/axon-devops/axon-cli/devtools --data=/home/wenyuan/git/axon-devops/axon-cli/devtools/chain --bench=/home/wenyuan/git/axon-devops/benchmark/benchmark
   You have to config mount path and chain data path explicitly.

4. after axon-cli gets run. You have 4 commands to exeute.
Before the start of docker containers, you have to enable tcp port for docker(0.0.0.0:2375 in this case).
1). start, you can start 4 docker axon nodes.
2). stop, stop the 4 docker nodes just started.
3). rm, remove the 4 docker containers just created.
4). delete, delete chain data under the path specified by parameter --data.

5. to be sure of the correctness. You can check by the following commands:
1) check the liveness of axon nodes
root@yoga:# docker ps
CONTAINER ID   IMAGE     COMMAND                  CREATED          STATUS          PORTS     NAMES
d82bf78d05cc   axon:v1   "./axon -c=/app/devt…"   41 seconds ago   Up 38 seconds             axon1
3cdd6cab7077   axon:v1   "./axon -c=/app/devt…"   41 seconds ago   Up 38 seconds             axon3
303bd01e6bd6   axon:v1   "./axon -c=/app/devt…"   41 seconds ago   Up 37 seconds             axon2
e54ad14dbb24   axon:v1   "./axon -c=/app/devt…"   41 seconds ago   Up 37 seconds             axon4
2) check the axon logs
root@yoga:~# docker logs axon4 | grep height
[2022-04-12T00:58:52.340656848+00:00 INFO core_network::outbound::gossip] no trace id found for gossip /gossip/consensus/broadcast_height
[2022-04-12T00:58:52.341000035+00:00 INFO overlord::state::process] overlord: start from wal wal info height 472, round 1, step Propose
[2022-04-12T00:58:52.341056842+00:00 INFO overlord::state::process] Overlord: "027ffd6a6a231561f2afe5878b1c743323b34263d16787130b1815fe35649b0bf5" become leader, height 472, round 1
[2022-04-12T00:58:54.342405157+00:00 INFO core_network::outbound::gossip] no trace id found for gossip /gossip/consensus/broadcast_height
it's easy to find the chain height has grown to height 472, and if you check it later, you can find the height is larger than the current 472.
3) check the network connect between the nodes.
    docker exec -it axon1 /bin/bash
    apt install net-tools
    apt install iputils-ping
    ping axon2 without timeout like following:
root@6f816d8be4b7:/app# ping axon2
PING axon2 (172.18.0.2) 56(84) bytes of data.
64 bytes from axon2.axon-cli_axon-net (172.18.0.2): icmp_seq=1 ttl=64 time=0.298 ms
64 bytes from axon2.axon-cli_axon-net (172.18.0.2): icmp_seq=2 ttl=64 time=0.074 ms

or  netstat -tnp | grep axon show 3 other nodes like following:
root@6f816d8be4b7:/app# netstat -tnp | grep axon
tcp        0      0 172.18.0.3:8001         172.18.0.2:8001         ESTABLISHED 1/./axon
tcp        0      0 172.18.0.3:8001         172.18.0.5:8001         ESTABLISHED 1/./axon
tcp        0      0 172.18.0.3:8001         172.18.0.4:8001         ESTABLISHED 1/./axon