# deploy Uniswap v2
Requires ansible nodejs yarn to be installed 
## deploy contract 
### step 1
```shell
$ cd axon-devops/uni/uni-v2-contract-deploy
```
### step 2
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
### step 3
```shell
$ make deploy
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

# deploy Uniswap v3
Requires ansible nodejs yarn to be installed 
## deploy contract 
### step 1
```shell
$ cd axon-devops/uni/uni-v3-contract-deploy
```
### step 2
```shell
$ vim config.yml
```
Editor config.yml

```yml
deploy_path: "./uni-v3-contract/deploy"                # deploy path
node_address: "http://localhost:8000"                  # axon node address
hex_private_key: "0x37aa0f893d05914a4def0460c0a984d3611546cfb26924d7a7ca6e0db9950a2d" # Your private key
hex_pub_address: "0x8ab0cf264df99d83525e9e11c7e4db01558ae1b1"        # Your account address
```
### step 3
```shell
$ make deploy
```
## deploy interface
### step 1
```shell
$ cd axon-devops/uni/uni-v3-interface-deploy
```
### step 2
```shell
$ vim config.yml
```
Editor config.yml

```yml
deploy_path: "./axon/uni-v3"                  # deploy path
listen_on_port: 8199                          # listen on port
```
### step 1
```shell
$ make deploy
```
