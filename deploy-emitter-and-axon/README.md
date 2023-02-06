# Deploy axon & emitter
Requires ansible,cargo 

install ansible
```
sudo apt-add-repository ppa:ansible/ansible
sudo apt update
sudo apt install ansible
```
Please check your cargo version, should be 1.65+.
```
cargo --version
cargo 1.67.0 (8ecd4f20a 2023-01-10)
```

## Configuration of the deployment

### Step 1
```shell
$ cd deploy-emitter-and-axon
```

### Step 2
```shell
$ vim config.yml
```

Editor config.yml

```yml
axon_deploy_path: "/home/ckb/axon"
axon_repo: "https://github.com/felicityin/axon.git"
axon_branch: "verify-cell-visitor"
axon_node_service: "axon-node.service"
emitter_deploy_path: "/home/ckb/emitter"
emitter_repo: "https://github.com/felicityin/emitter.git"
emitter_branch: "send-eth-tx"
emitter_node_service: "emitter-node.service"

```

`axon_deploy_path`: axon deploy path

`axon_repo`: git address of axon  

`axon_branch`: git brnach of axon 

`axon_node_service`: The systemctl service name of axon

`emitter_deploy_path`: emitter deploy path

`emitter_repo`: git address of emitter  

`emitter_branch`: git brnach of emitter 

`emitter_node_service`: The name of emitter service

### Step 3
```shell
$ vim hosts
```

Editor hosts

```hosts
[axon]
xxx.xxx.xxx.xxx

[emitter]
xxx.xxx.xxx.xxx               
```

`[axon]`: Specify axon node ip

`[emitter]`: Specify emitter node ip


### Step 4
change the remote user in deploy_axon.yml and deploy_emitter.yml

```shell

sed -i 's/remote_user: .*$/remote_user: {{remote axon node user}}/g'  deploy_axon.yml

sed -i 's/remote_user: .*$/remote_user: {{remote emitter node user}}/g'  deploy_emitter.yml
```



## Instructions for use
### deploy axon
```shell
$ make axon-deploy
```
### stop axon
```shell
$ make axon-stop
```
### clean axon data
```shell
$ make axon-clean
```
### deploy emitter
```shell
$ make emitter-deploy
```

### register emitter
```shell
$ echo '{
    "id": 2,
    "jsonrpc": "2.0",
    "method": "register",
    "params": [
        {
            "script": {
                "code_hash": "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8",
                "hash_type": "type",
                "args": "0x5989ae415bb667931a99896e5fbbfad9ba53a223"
            },
            "script_type": "lock"
        },
        "0x0"
    ]
}' \
| curl -H 'content-type: application/json' -d @- \
http://127.0.0.1:8120
```

### stop emitter
```shell
$ make emitter-stop
```
### clean  emitter data 
```shell
$ make emitter-clean
```

