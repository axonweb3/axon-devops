# Deploy Uniswap
Requires ansible、nodejs、yarn、docker、docker-compose to be installed 
## Configuration of the deployment

### Step 1
```shell
$ cd axon-devops/uni
```

### Step 2
```shell
$ vim scripts/config.yml
```
Editor config.yml
```yml
deploy_path: "./axon/uni-v2"                                                            # deploy path
v3_contract_deploy_path: "./axon/deploy-v3"                                       # v3 contract compile path（git pull path）
node_address: "http://127.0.0.1:8000"                                                   # Axon node address
hex_private_key: "0x37aa0f893d05914a4def0460c0a984d3611546cfb26924d7a7ca6e0db9950a2d"   # Your private key
hex_pub_address: "0x8ab0cf264df99d83525e9e11c7e4db01558ae1b1"                           # Your public address
listening_port: "8300"                                                                  # listening port
WETH: 
"0xb00d616B820C39619Ee29e5144D0226Cf8B5c15A"                                # WETH
```

## make command

### v2-deploy
`v2-deploy` clears the data and starts the uni-interface
```shell
$ make v2-deploy
```

### v2-start
Start uni-interface 
```shell
$ make v2-start
```

### v2-stop
Stop uni-interface 
```shell
$ make v2-stop
```

### v3-deploy
`v3-deploy` clears the data and starts the uni-interface
```shell
$ make v3-deploy
```

