
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
该目录放置axon 启动的配置文件，与[nervosnetwork/axon](https://github.com/nervosnetwork/axon/tree/main/devtools/chain) 下的同名文件保持一致


<a id="markdown-config.toml" name="config.toml"></a>
### config.toml
axon 启动所需的配置文件

```config.toml
该配置文件保持与nervosnetwork/axon 下同名文件保持一致
```
<a id="markdown-genesis.json" name="genesis.json"></a>
### genesis.json

axon 启动所需的配置文件
```genesis.json
该配置文件保持与nervosnetwork/axon 下同名文件保持一致
```
<a id="markdown-default.db-options" name="default.db-options"></a>
### default.db-options

```default.db-options
RocksDB 默认配置文件。这个文件需要和 config.toml 在一个目录。默认在 config 目录搜，如果不存在就 default。该配置文件保持与nervosnetwork/axon 下同名文件保持一致
```

<a id="markdown-ansible.cfg" name="ansible.cfg"></a>
### ansible.cfg
ansible 配置文件

```ansible.cfg
# ansible 配置文件
inventory = hosts
#ansible inventory文件路径,指定为同目录下的hosts 文件
host_key_checking：False
# false，关闭第一次使用ansible连接客户端是输入命令提示
```
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
<a id="markdown-node_priv_key.yml" name="node_priv_key.yml"></a>
### node_priv_key.yml
Register private key.

key是部署节点的hostname，value 来自 [devtools/chain/nodes](https://github.com/nervosnetwork/axon/tree/main/devtools/chain/nodes)的node_*.toml中的privkey

```node_priv_key.yml
xxx.xxx.xxx.xxx: "0x21716c9844c7e0548b62c5a0720923c70ca74d92278a217ff2b23699d6888110"
xxx.xxx.xxx.xxx: "0x249b518f72f8e40d994796c68529c7348bafa58ede900be9840c48c7e1e38434"
xxx.xxx.xxx.xxx: "0xd77ca0ba1c280bbd62409af4aec68560c913a1a8794d33317e8344969eb43265"
xxx.xxx.xxx.xxx: "0x3f37a142b0d5339da9dd4c16deda3d326b05d82c16f8ab68db41f6774ebda1d1"


```


<a id="markdown-config.yml" name="config.yml"></a>
### config.yml
ansible 部署axon时所需的axon的配置文件

```config.yml
deploy_path: "/home/ckb/axon"
#部署axon 时目标机器存放axon的位置
axon_repo: "https://github.com/nervosnetwork/axon.git"
# axon code repo
axon_branch: "main"
# build axon 指定的branch
bootstraps: "xxx.xxx.xxx.xxx"
# 任意一个节点的ip
mercury_uri: "http://127.0.0.1"
#127.0.0.1
enable_cross_client: "false"
enable_profile: "false"
enable_profile_debug: "false"
enable_jemalloc: "false"
#jemalloc 用来分析内存，生成jemalloc 分析文件
```
<a id="markdown-build.yml" name="build.yml"></a>
### build.yml
ansible tasks，用于build axon 的所有任务，包括pull code，build axon

<a id="markdown-deploy.yml" name="deploy.yml"></a>
### deploy.yml
ansible tasks，用于deploy axon 的所有任务，包括copy axon 相关文件到目标机器，配置，启动和停止axon服务



<a id="markdown-部署步骤" name="部署步骤"></a>
## 部署步骤
<a id="markdown-axon-deploy" name="axon-deploy"></a>
### axon-deploy 
copy axon-devops 目录到指定机器上
```shell
$ git clone https://github.com/nervosnetwork/axon-devops
$ cd axon-devops/deploy
```

按照上述 deploy  详解文档描述修改以下文件
- config.yml
- hosts
- node_priv_key.yml

之后使用 make 命令 启动/停止服务
```shell
$ cd axon-devops/deploy
$ make clean #停止axon 服务并清理数据
$ make deploy # 启动axon服务
```
到各个节点去查看服务是否启动
```shell
$ ps -ef |grep axon
```


