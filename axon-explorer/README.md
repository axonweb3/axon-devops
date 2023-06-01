# Deploy Axon Explorer
Please check your docker-compose version, should be latest.

```
docker-compose --version
docker-compose version 1.29.2, build 5becea4c
```

## Configuration of the deployment

### Step 1
```shell
cd axon-devops/axon-explorer
```

### Step 2
```shell
vim config.yml
```

```
Editor config.yml


deploy_path: "/home/ckb/axon_explorer"
explorer_repo: "https://github.com/Magickbase/blockscan.git"
explorer_branch: "main"
jsonrpc_http_url: "http://xxxx.xxx.xxx.xxx:8000"
jsonrpc_trace_url: "http://xxxx.xxx.xxx.xxx:8000"
postgres_user: postgres
postgres_password: postgres
posgres_port: "5432"
blockscan_port: "8190"                                           
```

Please modify these fields

`deploy_path`: explorer deploy path

`explorer_repo`: git address of axon explorer 

`explorer_branch`: git brnach of axon explorer 

`jsonrpc_http_url`: Http address of axon rpc

`jsonrpc_trace_url`: Http address of axon rpc

`postgres_user`: Posgres db user

`postgres_password`: Posgres db password

`posgres_port`: The port of posgres db

`blockscan_port`: explorer http port



## Instructions for use
### start
```shell
make start
```
### stop
```shell
make stop
```
### Visit the explorer website 
http://192.168.1.100:8190   # 192.168.1.100 is your server ip , 8190 is your blockscan_port
