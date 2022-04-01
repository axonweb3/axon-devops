# deploy Uniswap v2

Requires ansible nodejs yarn to be installed 

## deploy contract 
### step 1
```shell
$ cd axon-devops/uni/uni-v2-contract-deploy
```

### step 2
```shell
$ yarn install
```


### step 3

```shell
$ vim scripts/config.json
```

Editor config.json

```json
{
    "node_address": "http://127.0.0.1:8000", // Axon node address
    "hex_private_key": "0x37aa0f893d05914a4def0460c0a984d3611546cfb26924d7a7ca6e0db9950a2d" // Your private key
}
```


### step 4

```shell
$ yarn deploy
```

## deploy interface
### step 1
```shell
$ cd axon-devops/uni/uni-v2-interface-deploy
```

### step 2
```shell
$ vim config.yml
```
Editor config.yml

```yml
deploy_path: "/home/axon/uni-v2"              # deploy path
listen_on_port: 8190                          # listen on port
```


### step 3

```shell
$ make deploy
```
