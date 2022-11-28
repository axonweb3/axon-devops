
<!-- TOC -->

- [axon benchmark 部署](#axon-benchmark-部署)
  - [工程目录结构](#工程目录结构)
  - [benchmark 详解](#benchmark-详解)
    - [主要 benchmark 如下:](#主要-benchmark-如下)
    - [benchmark 目录](#benchmark-目录)
    - [src](#src)
    - [index.js](#index.js)
    - [Dockerfile](#Dockerfile)
    - [config.json](#config.json)
  - [benchmark-monitor 详解](#benchmark-monitor-详解)
    - [benchmark-monitor 目录](#benchmark-monitor-目录)
      - [docker-compose.yml](#docker-compose.yml)
      - [config 目录](#config-目录)
  - [deploy 详解](#deploy-详解)
    - [主要文件如下:](#主要文件如下)
    - [deploy 目录](#deploy-目录)
      - [Makefile](#Makefile)
      - [config.yml](#config.yml)
      - [hosts](#hosts)
      - [deploy.yml](#deploy.yml)
      - [docker-compose.yml](#docker-compose.yml-1)
      - [node_batchsize_threadnum.yml](#node_batchsize_threadnum.yml)
      - [templates 目录](#templates-目录)
        - [config.json](#config.json-1)
  - [部署步骤](#部署步骤)
    - [make 命令一键部署](#make-命令一键部署)
    - [nodejs-启动](#nodejs-启动)

<!-- /TOC -->

<a id="markdown-axon-benchmark-部署" name="axon-becnhmark-部署"></a>
# axon benchmark 部署


<a id="markdown-工程目录结构" name="工程目录结构"></a>
## 工程目录结构
```
apm
|
|___ benchmark
|    |___ src
|    |___ config.json
|    |___ Dockerfile
|    |___ index.js
|    
|
|___ benchmark-monitor
|    |___ docker-compose.yml
|    |___ config
|        |
|        |___ filebeat.yml
|  
|
|___ deploy
     |___ Makefile
     |___ deploy.yml
     |___ hosts
     |___ config.yml
     |___ node_batchsize_threadnum.yml
     |___ docker-compose.yml
     |___ ansible.cfg
     |___ templates
     |    |___ config.json
```

其中 benchmark 为 axon benchmark 主要程序

benchmark-monitor 部署在每一台benchmark机器上，收集benchmark 日志，并发送给ES

benchmark 与benchmark-monitor 都可以通过make 命令部署，在deploy 下； 也可以用nodejs 单独起benchmark，在benchmark 下。


<a id="markdown-benchmark-详解" name="benchmark-详解"></a>
## benchmark 详解
benchmark 为axon 压测的主要程序

<a id="markdown-主要-benchmark-如下" name="主要-benchmark-如下"></a>
### 主要 benchmark 如下:

| benchmark | 功能 |
| --- | --- |
| src | axon 压测主要程序 |
| config.json | axon 压力测试的配置参数|
| Dockerfile | 用于构建axon 压测镜像 |
| index.js | axon 压测入口文件 |

<a id="markdown-benchmark-目录" name="benchmark-目录"></a>
### benchmark 目录
```
|___ benchmark
     |___ src
     |___ config.json
     |___ Dockerfile
     |___ index.js
 
```



<a id="markdown-src" name="src"></a>
### src
axon 压测主要程序


<a id="index.js" name="index.js"></a>
### index.js
axon benchmark 入口文件


<a id="Dockerfile" name="Dockerfile"></a>
### Dockerfile
用于构建axon benchmark 镜像

```Dockerfile
FROM node:16-slim

WORKDIR /benchmark

ADD ./ .

RUN yarn install


CMD [ "node", "/benchmark/index.js" ]
```

<a id="markdown-config.json" name="config.json"></a>
### config.json
axon 压测主要配置参数

```config.json
# axon 压测配置参数
{
    "http_endpoint": "http://#internal_ip:8000",
    # Axon RPC address
    "chain_id": 2022,
    # Axon chain id
    "mnemonic": "test test test test test test test test test test test junk",
    #助记词字符串
    "uniswapFactoryAddress": "0x21915b79E1d334499272521a3508061354D13FF0",
    #Uniswap 合约压测需要，部署Uniswap之后的v3CoreFactoryAddress的value
    "uniswapNonfungiblePositionManagerAddress": "0xf4AE7E15B1012edceD8103510eeB560a9343AFd3",
    #Uniswap 合约压测需要，部署Uniswap之后的nonfungibleTokenPositionManagerAddress的value
    "uniswapSwapRouterAddress": "0x18eb8AF587dcd7E4F575040F6D800a6B5Cef6CAf",
    #Uniswap 合约压测需要，部署Uniswap之后的swapRouter02的value
    "mnemonic_index": 0,
    # 助记词 index
    "continuous_benchmark": false,
    # 是否持续压测
    "benchmark_time": 60000,
    # 当continuous_benchmark 为false时，benchmark 持续时间
    "batch_size": #batch_size,
    # 每次发送的事务数
    "thread_num": #thread_num,
    # 发送事物的线程数
    "id": "936501604767629344",
    # discord webhook id
    "token": "#token",
    # dicord webhook token
    "benchmark_cases": {
        "./benchmark": 1,
        "./contract_benchmark": 1,
        "./uniswapV3_benchmark": 1
    },
    # 压测用例，普通压测或者合约压测或者uniswapV3 压测
    "log_level": "info",
    # benchmark 压测的log 级别，debug 或者info
    "max_tps": 0,
    #用来指定发交易的速度上限， <= 0 为无限制。
    方便控制速度不把交易池塞满了
    "state_file": "./state/state.json"
    #压测开始先把Prepare 结果存到文件里，然后退出。再二次运行检测到有这个文件，自动读取然后开始压测
}
```


<a id="markdown-benchmark-monitor-详解" name="benchmark-monitor-详解"></a>
## Benchmark Monitor 详解
使用 docker-compose 的方式部署 benchmark monitor

<a id="markdown-benchmark-monitor-目录" name="benchmark-monitor-目录"></a>
### benchmark-monitor 目录
```
|___ benchmark-monitor
     |___ docker-compose.yml
     |___ config
          |___ filebeat
          |    |___ filebeat.yaml
```

<a id="markdown-docker-compose.yml" name="docker-compose.yml"></a>
### docker-compose.yml
benchmark-monitor 所使用的组件, 可以直接使用


<a id="markdown-config-目录" name="config-目录"></a>
### config 目录
benchmark monitor 的 filebeat 配置文件

```yml
filebeat.inputs:

- type: log
  enabled: true
  paths:
    - '/usr/share/filebeat/logs/*log' 
    #Filebeat 将收集目录/usr/share/filebeat/logs/ 中以.log结尾的所有文件
  
  fields_under_root: true
  # 自定义字段将作为顶级字段存储在输出文档中
  fields_under_root: true
  # 指定现有键是被解码的 JSON 对象中的键覆盖。
  ignore_older: 5m
  # Filebeat 将忽略在指定时间跨度之前修改的所有文件。
  scan_frequency: 1s
  # Filebeat 在指定用于收集的路径中检查新文件的频率。
output.elasticsearch:
  # filebeat 发送日志到elasticsearch
   hosts: ["ES_ADDRESS:9200"]
   # elasticsearch host
   indices:
    - index: "benchmark-%{[agent.version]}-%{+yyyy.MM.dd}"
   # 用于在grafaba 创建datasource 的索引，benchmark-*可以搜到log
```

<a id="markdown-deploy-详解" name="deploy-详解"></a>
## deploy 详解
部署 benchmark/benchmark-monitor 脚本、参数以及ansibel 文件 

<a id="markdown-主要-文件-如下" name="主要-文件-如下"></a>
### 主要文件如下:

| 文件 | 功能 |
| --- | --- |
| Makefile | 部署benchmark/benchmark-monitor make 命令 |
| config.yml | ansible 部署axon benchmark时所需的配置文件 |
| deploy.yml | benchmark/benchmark-monitor 部署时ansible 所需要执行的具体步骤 |
| docker-compose.yml | benchmark docker 启动文件|
| hosts | benchmark/benchmark-monitor 部署时指定的axon node 地址 |
| node_batchsize_threadnum.yml | benchmark 部署时，根据hostname来替换config.json,以达到不同的axon node 随机压测的目的 |
| templates目录 | 主要存放benchmark 启动所需要的config.json ｜


<a id="markdown-deploy-目录" name="deploy-目录"></a>
### deploy 目录
```
___ deploy
     |___ Makefile
     |___ deploy.yml
     |___ config.yml
     |___ hosts
     |___ node_batchsize_threadnum.yml
     |___ docker-compose.yml
     |___ templates
     |    |___ config.json
 
```

<a id="markdown-Makefile" name="Makefile"></a>
### Makefile
benchmark 和benchmark-monitor 部署命令

<a id="markdown-deploy.yml" name="deploy.yml"></a>
### deploy.yml
benchmark 以及benchmark-monitor ansibel 执行脚本

```yml
#  benchmark 以及benchmark-monitor部署
---
- name: axon benchmark
  #Task name
  hosts: benchmark_node
  #该值配置在 hosts 文件中
  remote_user: ckb
  become: yes
  become_method: sudo
```

<a id="markdown-docker-compose.yml" name="docker-compose.yml-1"></a>
### docker-compose.yml-1
启动benchmark组件文件，不能直接使用.如果需要直接使用，需检查docker-compose file,去准备config.json


<a id="markdown-hosts" name="hosts"></a>
### hosts
用于执行benchmark 以及benchmark-monitor deploy 配置

```host

# benchmark 以及benchmark-monitor deploy 配置

[benchmark] 
# benchmark  部署跟随axon agent，此处指定axon node ip
XXX.XXX.XXX.XXX
XXX.XXX.XXX.XXX
XXX.XXX.XXX.XXX
XXX.XXX.XXX.XXX
```
<a id="markdown-node_batchsize_threadnum.yml" name="node_batchsize_threadnum.yml"></a>
### node_batchsize_threadnum.yml
压测的batch_size以及thread_num 设置，ansible 部署benchmark 时，会根据hostname 替换config.json，使benchmark启动参数随机

```yml
hostname-xxx: 49/20/0
# 49为batch_size，20为thread_num,0为mnemonic_index. 
hostname-xxx: 20/15/1
hostname-xxx: 20/10/2
hostname-xxx: 15/15/3
```

<a id="markdown-config.yml" name="config.yml"></a>
### config.yml 
部署benchmark 时，ansible 执行时需要的一些变量

```yaml
# agent
benchmark_dir: /home/ckb/axon-devops
#cpoy 到目标机器时存放文件的位置
benchmark_monitor_dir: /home/ckb/axon-benchmark-monitor
#cpoy 到目标机器时,axon benchmark monitor存放文件的位置
es_address: xxx.xxx.xxx.xxx
# elasticsearch 部署的内网ip地址
token: "xxxxxxxxxx"
# discord webhook token
```

<a id="markdown-templates-目录" name="templates-目录"></a>
### templates 目录

该目录主要存放 axon benchmark 启动所欲要的配置参数文件。主要需要配置 为config.json

<a id="markdown-config.json" name="config.json-1"></a>
#### config.json-1

##### 
docker-compose 启动benchmark 时，所需要的配置文件

```config.json
# axon 压测配置参数
{
    "http_endpoint": "http://#internal_ip:8000",
    # Axon RPC address
    "chain_id": 2022,
    # Axon chain id
    "mnemonic": "test test test test test test test test test test test junk",
    #助记词字符串
    "uniswapFactoryAddress": "0x21915b79E1d334499272521a3508061354D13FF0",
    #Uniswap 合约压测需要，部署Uniswap之后的v3CoreFactoryAddress的value
    "uniswapNonfungiblePositionManagerAddress": "0xf4AE7E15B1012edceD8103510eeB560a9343AFd3",
    #Uniswap 合约压测需要，部署Uniswap之后的nonfungibleTokenPositionManagerAddress的value
    "uniswapSwapRouterAddress": "0x18eb8AF587dcd7E4F575040F6D800a6B5Cef6CAf",
    #Uniswap 合约压测需要，部署Uniswap之后的swapRouter02的value
    "mnemonic_index": 0,
    # 助记词 index
    "continuous_benchmark": false,
    # 是否持续压测
    "benchmark_time": 60000,
    # 当continuous_benchmark 为false时，benchmark 持续时间
    "batch_size": #batch_size,
    # 每次发送的事务数
    "thread_num": #thread_num,
    # 发送事物的线程数
    "id": "936501604767629344",
    # discord webhook id
    "token": "#token",
    # dicord webhook token
    "benchmark_cases": {
        "./benchmark": 1,
        "./contract_benchmark": 1,
        "./uniswapV3_benchmark": 1
    },
    # 压测用例，普通压测或者合约压测或者uniswapV3 压测
    "log_level": "info",
    # benchmark 压测的log 级别，debug 或者info
    "max_tps": 0,
    #用来指定发交易的速度上限， <= 0 为无限制。
    方便控制速度不把交易池塞满了
    "state_file": "./state/state.json"
    #压测开始先把Prepare 结果存到文件里，然后退出。再二次运行检测到有这个文件，自动读取然后开始压测
}
```

===========
<a id="markdown-部署步骤" name="部署步骤"></a>
## 部署步骤

<a id="markdown-make-命令一键部署" name="make-命令一键部署"></a>
### make-命令一键部署 
copy axon-devops 目录到指定机器上
```shell
$ git clone https://github.com/nervosnetwork/axon-devops
$ cd axon-devops/benchmark/deploy
```

按照上述 benchmark、benchmark-monitor 与deploy  详解文档描述修改以下文件
- hosts
- node_batchsize_threadnum.yml
- config.yml

如果是Uniswap v3压测，请先参考[Uniswap v3部署](https://github.com/axonweb3/axon-devops/blob/main/uni/README.md#v3-deploy)来部署uniswap，并将输出暂存，以便修改压测config.json

之后使用 make 命令 启动/停止服务
```shell
$ cd axon-devops/benchmark/deploy
$ make clean #停止benchmark 以及benhmark-monitor服务，并清理日志
$ make benchmark-start # 启动benchmark服务
$ make benchmark-monitor-deploy# 启动benchmark-monitor服务
```
使用 docker-compose 命令查看服务是否启动
```shell
$ docker-compose ps
```


<a id="markdown-nodejs 启动" name="nodejs-启动"></a>
### nodejs-启动
copy axon-devops 目录到指定机器上
```shell
$ git clone https://github.com/nervosnetwork/axon-devops
$ cd axon-devops/benchmark/deploy
```

检查nodejs、yarn 是否安装，并且为最新版本

进入到benchmark 目录
```shell
$ cd axon-devops/axon-benchmark/benchmark
```

安装nodejs 依赖
```shell
$ yarn install
```

编辑config.json, 参考[config.json](#config.json)
```shell
$ vim config.json 
```

启动benchmark
```shell
$ nohup node index.js --benchmark_cases="['./benchmark']" &
```



