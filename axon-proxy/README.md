# Deploy Axon Proxy
Please check your docker-compose version, should be latest.

```
docker-compose --version
docker-compose version 1.29.2, build 5becea4c
```

## Configuration of the deployment

### Step 1
```shell
cd axon-devops/axon-proxy
```

### Step 2
```shell
vim config.yml
```

```
Editor config.yml


deploy_path: "/home/ckb/axon_proxy"
proxy_repo: "https://github.com/axonweb3/axon-proxy.git"
proxy_branch: "main"                                          
```

Please modify these fields

`deploy_path`: proxy deploy path

`proxy_repo`: git address of axon proxy 

`proxy_branch`: git brnach of axon proxy 


## Instructions for use
### start
```shell
make start
```
### stop
```shell
make stop
```
### How to use it 
Send the HTTP or WebSocket request to http://192.168.1.100:8011   # 192.168.1.100 is your server ip , 8011 is your proxy port that config in config.toml
