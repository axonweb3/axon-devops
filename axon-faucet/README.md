# Deploy Axon Faucet

Please check your docker-compose version, should be latest.

```
docker-compose --version
docker-compose version 1.29.2, build 5becea4c
```

## Configuration of the deployment

### Step 1
```shell
$ cd axon-devops/axon-faucet
```

### Step 2
```shell
$ vim confit.yml
```


```

Editor config.yml

```yml
deploy_path: "/home/ckb/axon-faucet"
faucet_repo: "https://github.com/axonweb3/axon-faucet.git"
faucet_branch: "master"
axon_faucet_rpc_url: http://xxxx.xxx.xxx.xxx:8000
axon_faucet_claim_value: 1000000000000000000
react_app_backend_point: http://xxxx.xxx.xxx.xxx:8501
mongodb_password: mongodbpassword
mongodb_url: mongodb://root:mongodbpassword@faucet-mongo:27017


                                               
```
`deploy_path`: explorer deploy path

`faucet_repo`: git address of axon explorer 

`faucet_branch`: git brnach of axon explorer 

`axon_faucet_rpc_url`: Http address of axon rpc

`axon_faucet_claim_value`: faucet claim value

`react_app_backend_point`: faucet app backend point

`mongodb_password`: mongo db password

`mongodb_url`: URL address of mongo db




## Instructions for use
### start
```shell
$ make start
```
### stop
```shell
$ make stop
```

