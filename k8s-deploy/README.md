
<!-- TOC -->

- [axon k8s 部署](#axon-k8s-部署)
  - [目录结构](#目录结构)
    - [axon-目录](#axon-目录)
      - [axon1-statefulset.yaml](#axon1-statefulset.yaml)
      - [axon2-statefulset.yaml](#axon2-statefulset.yaml)
      - [axon3-statefulset.yaml](#axon3-statefulset.yaml)
      - [axon4-statefulset.yaml](#axon4-statefulset.yaml)
      - [axon-chain.yaml](#axon-chain.yaml)
      - [deploy.sh](#deploy.sh)
      - [axon-config-目录](#axon-config-目录)
        - [genesis.json](#genesis.json)
        - [node_1.toml](#node_1.toml)
        - [node_2.toml](#node_2.toml)
        - [node_3.toml](#node_3.toml)
        - [node_4.toml](#node_4.toml)
        - [default.db-options](#default.db-options)
    - [axon-benchmark-目录](#axon-benchmark-目录)
      - [axon-benchmark.yaml](#axon-benchmark.yaml)
      - [axon-chain-to-axon-ns.yaml](#axon-chain-to-axon-ns.yaml)
      - [deploy.sh](#benchmark_deploy.sh)
      - [axon-benchmark-configmap-目录](#axon-benchmark-configmap-目录)
        - [config.json](#config.json)
    - [axon-fluntd-目录](#axon-fluntd-目录)
      - [fluentd-daemonset.yaml](#fluentd-daemonset.yaml)
      - [fluentd-configmap.yaml](#fluentd-configmap.yaml)
      - [deploy.sh](#fluentd-deploy.sh)
  - [部署步骤](#部署步骤)
    - [axon-k8s-部署步骤](#axon-k8s-部署步骤)
    - [axon-k8s-benchmark-部署步骤](#axon-k8s-benchmark-部署步骤)
    - [axon-k8s-fluentd-部署步骤](#axon-k8s-fluentd-部署步骤)

<!-- /TOC -->

<a id="markdown-axon-k8s-部署" name="axon-k8s-部署"></a>
# axon 部署

<a id="markdown-目录结构" name="目录结构"></a>
## 目录结构
```
k8s-deploy
|
|___ k8s
|    |___ axon
|        |____axon-config
|           |____genesis.json
|           |____node_1.toml
|           |____node_2.toml
|           |____node_3.toml
|           |____node_4.toml
|        |____axon-chain.yaml
|        |____axon1-statefulset.yaml
|        |____axon2-statefulset.yaml
|        |____axon3-statefulset.yaml
|        |____axon4-statefulset.yaml
|        |____deploy.sh
|    |___ benchmark
|        |____configmap
|           |____config.json
|        |____axon-benchmark.yaml
|        |____axon-chain-to-axon-ns.yaml
|        |____deploy.sh
|    |___ eks
|        |fluent
|           |deploy.sh
|           |____fluentd-configmap.yaml
|           |____fluentd-daemonset.yaml
|    |___ ingress
|        |____axon-ingress.yaml
|___ Makefile

```

<a id="markdown-axon-目录" name="axon-目录"></a>
### axon 目录.
```
    |___ axon
       |____axon-config
          |____genesis.json
          |____node_1.toml
          |____node_2.toml
          |____node_3.toml
          |____node_4.toml
       |____axon-chain.yaml
       |____axon1-statefulset.yaml
       |____axon2-statefulset.yaml
       |____axon3-statefulset.yaml
       |____axon4-statefulset.yaml
       |____deploy.sh
 
```

<a id="markdown-axon1-statefulset.yaml" name="axon1-statefulset.yaml"></a>
### axon1-statefulset.yaml
k8s axon node1 部署文件.

[axon1-statefulset.yaml](https://github.com/nervosnetwork/axon-devops/blob/main/k8s-deploy/k8s/axon/axon1-statefulset.yaml)

<a id="markdown-axon2-statefulset.yaml" name="axon2-statefulset.yaml"></a>
### axon2-statefulset.yaml
k8s axon node2 部署文件.

[axon2-statefulset.yaml](https://github.com/nervosnetwork/axon-devops/blob/main/k8s-deploy/k8s/axon/axon2-statefulset.yaml)

<a id="markdown-axon3-statefulset.yaml" name="axon3-statefulset.yaml"></a>
### axon3-statefulset.yaml
k8s axon node3 部署文件.

[axon3-statefulset.yaml](https://github.com/nervosnetwork/axon-devops/blob/main/k8s-deploy/k8s/axon/axon3-statefulset.yaml)

<a id="markdown-axon4-statefulset.yaml" name="axon4-statefulset.yaml"></a>
### axon4-statefulset.yaml
k8s axon node4 部署文件.

[axon4-statefulset.yaml](https://github.com/nervosnetwork/axon-devops/blob/main/k8s-deploy/k8s/axon/axon4-statefulset.yaml)

<a id="markdown-axon-chain.yaml" name="aaxon-chain.yaml"></a>
### axon-chain.yaml
创建axon service，做负载，用于benchmark 访问axon

[axon-chain.yaml](https://github.com/nervosnetwork/axon-devops/blob/main/k8s-deploy/k8s/axon/axon-chain.yaml)

<a id="markdown-deploy.sh" name="deploy.sh"></a>
### deploy.sh

脚本提供部署、清除axon以及axon相关服务
[deploy.sh](https://github.com/nervosnetwork/axon-devops/blob/main/k8s-deploy/k8s/axon/deploy.sh)




<a id="markdown-axon-config-目录" name="axon-config-目录"></a>
### axon config 目录
该目录主要存放 deploy axon时，axon 所需要的配置
<a id="markdown-genesis.json" name="genesis.json"></a>
### genesis.json

axon部署所需的配置文件，与[nervosnetwork/axon]下的同名文件保持一致。

[genesis.json](https://github.com/nervosnetwork/axon/blob/main/devtools/chain/genesis_single_node.json)


<a id="markdown-node_1.toml" name="node_1.toml"></a>
### node_1.toml

axon部署所需的配置文件，与[nervosnetwork/axon]下的同名文件保持一致。

[node_1.toml](https://github.com/nervosnetwork/axon/blob/main/devtools/chain/k8s/node_1.toml)

<a id="markdown-node_2.toml" name="node_2.toml"></a>
### node_2.toml

axon部署所需的配置文件，与[nervosnetwork/axon]下的同名文件保持一致。

[node_2.toml](https://github.com/nervosnetwork/axon/blob/main/devtools/chain/k8s/node_2.toml)

<a id="markdown-node_3.toml" name="node_3.toml"></a>
### node_3.toml

axon部署所需的配置文件，与[nervosnetwork/axon]下的同名文件保持一致。

[node_3.toml](https://github.com/nervosnetwork/axon/blob/main/devtools/chain/k8s/node_3.toml)

<a id="markdown-node_4.toml" name="node_4.toml"></a>
### node_4.toml

axon部署所需的配置文件，与[nervosnetwork/axon]下的同名文件保持一致。

[node_4.toml](https://github.com/nervosnetwork/axon/blob/main/devtools/chain/k8s/node_4.toml)

<a id="markdown-default.db-options" name="default.db-options"></a>
### default.db-options
RocksDB 默认配置文件。这个文件需要和 node.toml 在一个目录。默认在 config 目录搜，如果不存在就 default。该配置文件保持与nervosnetwork/axon 下同名文件保持一致

[default.db-options](https://github.com/nervosnetwork/axon/blob/main/devtools/chain/default.db-options)

<a id="markdown-axon-benchmark-目录" name="axon-benchmark-目录"></a>
### axon-benchmark-目录
该目录主要存放 k8s axon benchmark 部署文件

<a id="markdown-axon-benchmark.yaml" name="axon-benchmark.yaml"></a>
### axon-benchmark.yaml
k8s axon benchmark 部署文件.

[axon-benchmark](https://github.com/nervosnetwork/axon-devops/blob/main/k8s-deploy/k8s/benchmark/axon-benchmark.yaml)

<a id="markdown-axon-chain-to-axon-ns.yaml" name="axon-chain-to-axon-ns.yaml"></a>
### axon-chain-to-axon-ns.yaml
k8s axon benchmark 跨namespace 访问axon 的service 部署文件.

[axon-chain-to-axon-ns.yaml](https://github.com/nervosnetwork/axon-devops/blob/main/k8s-deploy/k8s/benchmark/axon-chain-to-axon-ns.yaml)

<a id="markdown-deploy.sh" name="deploy.sh"></a>
### benchmark_deploy.sh

脚本提供部署、清除axon benchmark 以及axon benchmark相关服务
[deploy.sh](https://github.com/nervosnetwork/axon-devops/blob/main/k8s-deploy/k8s/benchmark/deploy.sh)

<a id="markdown-benchmark-configmap-目录" name="benchmark-configmap-目录"></a>
### axon-benchmark-configmap-目录
该目录主要存放 deploy axon benchmark时所需要的配置
<a id="markdown-config.json" name="config.json"></a>
### config.json

axon benchmark部署所需的配置文件
```json

{
    "http_endpoint": "http://axon-chain:8000",
    # Http address of axon rpc
    "private_key" : "0x37aa0f893d05914a4def0460c0a984d3611546cfb26924d7a7ca6e0db9950a2d",
    #Private Key
    "continuous_benchmark": true,
    #Whether to continue benchmark testing
    "benchmark_time": 60000,
    #When continuous_benchmark is false, the duration of the benchmark test
    "batch_size": 150,
    #Number of transactions sent per time
    "thread_num": 120,
    # Number of threads sending transactions
    "id": "936501604767629344",
    #discord webhook's id(When continuous_benchmark is false, the results are pushed to discord)
    "token": "",
    #discord webhook's token(When continuous_benchmark is false, the results are pushed to discord)
    "benchmark_cases": ["./benchmark", "./contract_benchmark"]
    #Use cases for benchmark
}

```
<a id="markdown-fluntd-目录" name="fluntd-目录"></a>
### axon-fluntd-目录
该目录主要存放fluntd部署文件，用于收集axon node 的logs，并发送到ES。

<a id="markdown-fluentd-daemonset.yaml" name="fluentd-daemonset.yaml"></a>
### fluentd-daemonset.yaml
k8s 部署fluentd 的部署文件.

[fluentd-daemonset.yaml](https://github.com/nervosnetwork/axon-devops/blob/main/k8s-deploy/k8s/eks/fluent/fluentd-daemonset.yaml)

<a id="markdown-fluentd-configmap.yaml" name="fluentd-configmap.yaml"></a>
### fluentd-configmap.yaml
k8s 部署fluentd 所需要的配置文件

[fluentd-configmap.yaml](https://github.com/nervosnetwork/axon-devops/blob/main/k8s-deploy/k8s/eks/fluent/fluentd-configmap.yaml)

<a id="markdown-deploy.sh" name="deploy.sh"></a>
### fluentd-deploy.sh

脚本提供部署、清除fluentd 相关服务
[deploy.sh](https://github.com/nervosnetwork/axon-devops/blob/main/k8s-deploy/k8s/eks/fluent/deploy.sh)



<a id="markdown-axon 部署步骤" name="axon 部署步骤"></a>
## 部署步骤

<a id="markdown-axon-k8s-部署步骤" name="axon-k8s-部署步骤"></a>
### pre-requried 
安装 ingress-controller。 参考官方文档[ingress](https://kubernetes.io/zh/docs/concepts/services-networking/ingress/)

### axon-k8s-部署步骤 
copy axon-devops 目录到指定机器上
```shell
$ git clone https://github.com/nervosnetwork/axon-devops
$ cd axon-devops/k8s-deploy/k8s
```

按照上述 k8s deploy 详解文档描述确认一下文件是否需要修改
- node_1.toml
- node_2.toml
- node_3.toml
- node_4.toml
- genesis.json
- default.db-options


之后使用 make 命令 启动/停止服务
```shell
$ cd axon-devops/k8s-deploy/k8s
$ make axon-clean #停止axon 服务并清理数据
$ make axon-deploy # 启动axon服务
```
查看axon 是否启动成功。 deploy 时脚本会等2分钟，然后检查pod running 的数量，当不等于4时会提示部署失败，请注意部署时的log。
```shell
$ kubectl get pod -n axon
```


<a id="markdown-axon-k8s-benchmark-部署步骤" name="axon-k8s-benchmark-部署步骤"></a>
## axon-k8s-benchmark-部署步骤
copy axon-devops 目录到指定机器上
```shell
$ git clone https://github.com/nervosnetwork/axon-devops
$ cd axon-devops/k8s-deploy/k8s
```

按照上述 k8s benchmark deploy 详解文档修改以下文件
- config.json


之后使用 make 命令 启动/停止服务
```shell
$ cd axon-devops/k8s-deploy/k8s
$ make benchmark-clean #停止axon benchmark服务并清理数据
$ make benchmark-deploy # 启动axon benchmark服务
```
查看axon 是否启动成功。 deploy 时脚本会等2分钟，然后检查pod running 的数量，当不等于1时会提示部署失败，请注意部署时的log。
```shell
$ kubectl get pod -n axon-benchmark
```

<a id="markdown-axon-k8s-fluentd-部署步骤" name="axon-k8s-fluentd-部署步骤"></a>
## axon-k8s-fluentd-部署步骤
copy axon-devops 目录到指定机器上
```shell
$ git clone https://github.com/nervosnetwork/axon-devops
$ cd axon-devops/k8s-deploy/k8s
```

fluentd 按照官方文档安装，用于收集axon 各个节点的日志，并发送到es。 暂时只需要确认config 文件中的es host 和port 是否需要修改
- fluentd-configmap.yaml


之后使用 make 命令 启动/停止服务
```shell
$ cd axon-devops/k8s-deploy/k8s
$ make fluentd-clean #停止fluentd服务并清理数据
$ make fluentd-deploy # 启动fluentd服务
```
查看axon 是否启动成功。 deploy 时脚本会等2分钟，然后检查pod running 的数量，当不等于1时会提示部署失败，请注意部署时的log。
```shell
$ kubectl get pod -n logging
```