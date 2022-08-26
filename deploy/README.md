
<!-- TOC -->

- [axon 部署](#axon-部署)
  - [目录结构](#目录结构)
    - [templates 目录](#templates-目录)
      - [config.toml](#config.toml)
      - [genesis.json](#genesis.json)
      - [default.db-options](#default.db-options)
    - [ansible.cfg](#ansible.cfg)
    - [hosts](#hosts)
    - [node_priv_key.yml](#node_priv_key.yml)
    - [config.yml](#config.yml)
    - [build.yml](#build.yml)
    - [deploy.yml](#deploy.yml)
  - [部署步骤](#部署步骤)

<!-- /TOC -->

<a id="markdown-axon-部署" name="axon-部署"></a>
# axon 部署

<a id="markdown-目录结构" name="目录结构"></a>
## 目录结构
```
deploy
|
|___ templates
|    |___ config.toml
|    |___ genesis.json
|    |___ default.db-options
|___ ansible.cfg
|___ build.yml
|___ config.yml
|___ deploy.yml
|___ hosts
|___ Makefile
|___ node_priv_key.yml

```

<a id="markdown-templates-目录" name="templates-目录"></a>
### templates 目录
该目录放置axon 启动的配置文件，与 [axonweb3/axon](https://github.com/axonweb3/axon/tree/main/devtools/chain) 下的同名文件保持一致

****

<a id="markdown-config.toml" name="config.toml"></a>
#### config.toml
[配置文件，基本与 axon 保持一致](https://github.com/axonweb3/axon/blob/main/devtools/chain/config.toml)

`私钥替换` 
[修改私钥为 #private_key 后续部署脚本会根据配置替换](https://github.com/axonweb3/axon-devops/blob/main/deploy/templates/config.toml#L2)

`p2p boot 节点替换` [替换 boot ip 为 #bootstraps, 后续部署脚本会根据配置哦替换](https://github.com/axonweb3/axon-devops/blob/main/deploy/templates/config.toml#L34)

****

<a id="markdown-genesis.json" name="genesis.json"></a>
#### genesis.json
[创世块配置，与 axon genesis_multi_nodes.json 配置保持一致](https://github.com/axonweb3/axon/blob/main/devtools/chain/nodes/genesis_multi_nodes.json)

****

<a id="markdown-default.db-options" name="default.db-options"></a>
#### default.db-options

```default.db-options
RocksDB 默认配置文件, 这个文件需要和 config.toml 在一个目录。
默认在 config 目录搜，如果不存在就 default。
该配置文件保持与axonweb3/axon 下同名文件保持一致
```
****

<a id="markdown-ansible.cfg" name="ansible.cfg"></a>
### ansible.cfg
ansible 配置文件

```ansible.cfg
# ansible inventory 文件路径,指定为同目录下的 hosts 文件
inventory = hosts

# false，关闭第一次使用 ansible 连接客户端是输入命令提示
host_key_checking：False
```
****

<a id="markdown-hosts" name="hosts"></a>
### hosts
ansible 部署axon 节点的host list

```hosts
[axon]
xxx.xxx.xxx.xxx 
xxx.xxx.xxx.xxx 
xxx.xxx.xxx.xxx
xxx.xxx.xxx.xxx
```
****

<a id="markdown-node_priv_key.yml" name="node_priv_key.yml"></a>
### node_priv_key.yml
Register private key.

key 是部署节点的 hostname，value 来自 [devtools/chain/nodes](https://github.com//axon/tree/main/devtools/chain/nodes) 的 node_*.toml 中的 privkey

```node_priv_key.yml
xxx.xxx.xxx.xxx: "0x21716c9844c7e0548b62c5a0720923c70ca74d92278a217ff2b23699d6888110"
xxx.xxx.xxx.xxx: "0x249b518f72f8e40d994796c68529c7348bafa58ede900be9840c48c7e1e38434"
xxx.xxx.xxx.xxx: "0xd77ca0ba1c280bbd62409af4aec68560c913a1a8794d33317e8344969eb43265"
xxx.xxx.xxx.xxx: "0x3f37a142b0d5339da9dd4c16deda3d326b05d82c16f8ab68db41f6774ebda1d1"
```

****

<a id="markdown-config.yml" name="config.yml"></a>
### config.yml
ansible 部署axon时所需的axon的配置文件

```config.yml
# 部署axon 时目标机器存放axon的位置
deploy_path: "/home/ckb/axon"

# axon code repo
axon_repo: "https://github.com/axonweb3/axon.git"

# build axon 指定的 branch、tag 等
axon_branch: "main"

# 任意一个节点的ip
bootstraps: "xxx.xxx.xxx.xxx"

# mercury 的节点 ip, 当前版本不用
mercury_uri: "http://127.0.0.1"

# 开启跨链的开关, 当前版本不用
enable_cross_client: "false"

enable_profile: "false"
enable_profile_debug: "false"

# jemalloc 用来分析内存，生成jemalloc 分析文件
enable_jemalloc: "false"
```

****

<a id="markdown-build.yml" name="build.yml"></a>
### build.yml
ansible tasks，用于 build axon 的所有任务，包括pull code，build axon
****
<a id="markdown-deploy.yml" name="deploy.yml"></a>
### deploy.yml
ansible tasks，用于deploy axon 的所有任务，包括copy axon 相关文件到目标机器，配置，启动和停止axon服务

****

<a id="markdown-部署步骤" name="部署步骤"></a>
## 部署步骤
<a id="markdown-axon-deploy" name="axon-deploy"></a>
### axon-deploy 
copy axon-devops 目录到指定机器上
```shell
$ git clone https://github.com/axonweb3/axon-devops
$ cd axon-devops/deploy
```

按照上述 deploy  详解文档描述修改以下文件
- config.yml
- hosts
- node_priv_key.yml

之后使用 make 命令 启动/停止服务
```shell
$ cd axon-devops/deploy
$ make clean  # 停止axon 服务并清理数据
$ make deploy # build axon 并启动axon服务
```

检查 axon 在各个节点的进程是否运行
```shell
$ make check
```

其余命令
```shell
$ make start  # 启动 axon
$ make stop   # 停止 axon
$ make build  # 构建 axon
```


