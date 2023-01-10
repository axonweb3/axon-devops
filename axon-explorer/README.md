# Deploy Axon Explorer
Requires Postgres. PostgreSQL with docker-compose [docker-compose-pg-only.yml](templates/postgres-docker-compose.yml).

Please check your docker-compose version, should be latest.

```
docker-compose --version
docker-compose version 1.29.2, build 5becea4c
```

## Configuration of the deployment

### Step 1
```shell
$ cd axon-devops/axon-explorer
```

### Step 2
```shell
$ vim config.yml
```


```

Editor config.yml

```yml
deploy_path: "/home/ckb/axon_explorer"
explorer_repo: "https://github.com/Magickbase/axon_explorer.git"
explorer_branch: "main"
ETHEREUM_JSONRPC_HTTP_URL: "http://xxxx.xxx.xxx.xxx:8000"
ETHEREUM_JSONRPC_TRACE_URL: "http://xxxx.xxx.xxx.xxx:8000"
DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:5432/axon_explorer?ssl=false" 


                                               
```
`deploy_path`: explorer deploy path

`explorer_repo`: git address of axon explorer 

`explorer_branch`: git brnach of axon explorer 

`jsonrpc_http_url`: Http address of axon rpc

`jsonrpc_trace_url`: Http address of axon rpc

`postgres_user`: Posgres db user

`postgres_password`: Posgres db password

`postgres_ip`: IP address of posgres db

`posgres_port`: The port of posgres db



## Instructions for use
### start
```shell
$ make start
```
### stop
```shell
$ make stop
```

