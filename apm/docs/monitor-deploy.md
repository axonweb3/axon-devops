
<!-- TOC -->

- [axon monitor 部署](#axon-monitor-部署)
  - [架构](#架构)
  - [工程目录结构](#工程目录结构)
  - [Agent 详解](#agent-详解)
    - [主要 agent 如下:](#主要-agent-如下)
    - [agent 目录](#agent-目录)
    - [docker-compose.yml](#docker-composeyml)
    - [.env](#env)
    - [config 目录](#config-目录)
  - [Monitor 详解](#monitor-详解)
    - [主要服务如下:](#主要服务如下)
    - [monitor 目录](#monitor-目录)
    - [docker-compose.yml](#docker-composeyml-1)
    - [config 目录](#config-目录-1)
      - [grafana](#grafana)
        - [dashboard](#dashboard)
        - [provisioning](#provisioning)
        - [grafana.ini](#grafanaini)
      - [Elasticsearch](#Elasticsearch)
      - [promethues](#promethues)
        - [prometheus.yml](#prometheusyml)
  - [deploy 详解](#deploy-详解)
    - [主要文件如下:](#主要文件如下)
    - [deploy 目录](#deploy-目录)
    - [deploy_monitor.yml](#deploy_monitor.yml)
    - [deploy_monitor_agent.yml](#deploy_monitor_agent.yml)
    - [hosts](#hosts)
    - [init_config.sh](#init_config.sh)
    - [roles 目录](#roles-目录)
        - [roles/agent/vars/main.yml](#roles/agent/vars/main.yml)
        - [roles/monitor/vars/main.yml](#roles/monitor/vars/main.yml)
  - [部署步骤](#部署步骤)
    - [monitor](#monitor)
    - [agent](#agent)

<!-- /TOC -->

<a id="markdown-axon-monitor-部署" name="axon-monitor-部署"></a>
# axon monitor 部署

<a id="markdown-架构" name="架构"></a>
## 架构
![](./asset/架构.jpg)

<a id="markdown-工程目录结构" name="工程目录结构"></a>
## 工程目录结构
```
apm
|
|___ agent
|    |___ .env.example
|    |___ docker-compose.yml
|    |___ config
|          |___ filebeat
|               |___ filebeat.yml
|
|___ monitor
|    |___ docker-compose.yml
|    |___ config
|        |___ grafana
|        |    |___ grafana.ini
|        |    |___ dashboards
|        |    |    |___ axon-benchmark.json
|        |    |    |___ axon-node.json
|        |    |
|        |    |___ provisioning
|        |          |___ dashboards
|        |          |    |___ dashboards.yaml
|        |          |
|        |          |___ datasources
|        |          |    |___ datasources.yaml   
|        |          |
|        |          |___ notifiers
|        |               |___ notifiers.yaml                    
|        |
|        |___ Elasticsearch
|        |
|        |___ promethues
|             |___ prometheus.yml
|  
|
|___ deploy
     |___ Makefile
     |___ deploy_monitor.yml
     |___ deploy_monitor_agent.yml
     |___ hosts
     |___ init_config.sh
     |___ roles
     |    |___ agent
     |       |___ task
                |___ main.yml
     |       |___ vars
                |___ main.yml
     |   |___ monitor
     |         |___ task
                  |___ main.yml
     |         |___ vars
                  |___ main.yml

```

其中 agent 主要跟随 axon 部署，负责采集信息

monitor 需要一台机器部署，主要运行目前的监控服务

monitor 与agent 都通过make 命令部署，在deploy 下


<a id="markdown-agent-详解" name="agent-详解"></a>
## Agent 详解
agent 主要跟随 axon 部署，主要用于采集 axon 的监控指标

<a id="markdown-主要-agent-如下" name="主要-agent-如下"></a>
### 主要 agent 如下:

| agent | 功能 | 参考 |
| --- | --- | --- |
| node-exporter | 采集机器信息(cpu, 内存等) | [node-exporter](https://github.com/prometheus/node_exporter) |
| jaeger-agent | tracing | [jaeger-agent](https://www.jaegertracing.io/docs/1.16/getting-started/#all-in-one) |
| filebeat-agent | 采集日志 | [filebeat-agent](https://www.elastic.co/guide/en/beats/filebeat/current/index.html) |

<a id="markdown-agent-目录" name="agent-目录"></a>
### agent 目录
```
|___ agent
     |___ .env.example
     |___ docker-compose.yml
     |___ config
           |___ filebeat
                |___ filebeat.yml
 
```



<a id="markdown-docker-composeyml" name="docker-composeyml"></a>
### docker-compose.yml
axon node 采集端程序, 内部配置在 .env.example

<a id="markdown-env" name="env"></a>
### .env
用于配置采集端的 docker-compose 环境变量

```env
# 该配置用于给 jaeger server push 数据
# 配置为 jaeger-collector 的 ip port
# 对应 monitor docker-compose 中的 jaeger-collector 服务
JACGER_COLLECTOR_IP=jaeger-collector:14250

# 该配置用于和 axon 交互
# 配置文件地址: https://github.com/nervosnetwork/axon/blob/main/devtools/chain/config.toml
# 关联 [apm] tracing_address 参数
JACGER_AGENT_PORT=6831

# 该配置用于给 filebeat 采集日志用
# 配置文件地址: https://github.com/nervosnetwork/axon/blob/main/devtools/chain/config.toml
# 关联 [logger] log_path 参数
AXON_LOG_PATH=axon/logs

# 该配置用于将AXON_LOG_PATH mount 到filebeat
# 配置文件地址: https://github.com/nervosnetwork/axon-devops/blob/21f6ea2bb2c9336ba6d640b302600753efe012af/apm/agent/docker-compose.yml#L50
# volumes: - ${AXON_LOG_PATH}:/usr/share/filebeat/logs
```



<a id="markdown-config-目录" name="config-目录"></a>
### config 目录
该目录主要存放 agent 的配置，目前测试环境的版本比较简单，只需要配置 filebeat 的配置文件 filebeat.yml 即可
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
    - index: "axon-%{[agent.version]}-%{+yyyy.MM.dd}"
   # 用于在grafaba 创建datasource 的索引，axon-*可以搜到log
```

<a id="markdown-monitor-详解" name="monitor-详解"></a>
## Monitor 详解
目前 axon 测试环境使用 docker-compose 的方式部署 monitor

<a id="markdown-主要服务如下" name="主要服务如下"></a>
### 主要服务如下:

| 服务名 | 功能 | 参考 |
| --- | --- | --- |
| grafana | dashboard，监控，日志查看，告警配置 | [grafana](https://grafana.com/docs/grafana/latest/) |
| promethues | metric 存储 | [promethues](https://prometheus.io/docs/introduction/overview/) |
| elasticsearch | 日志存储 | [elasticsearch](https://www.elastic.co/guide/en/elasticsearch/reference/current/setup.html) |
| jaeger | tracing 存储 | [jaeger](https://github.com/jaegertracing/jaeger) |


<a id="markdown-monitor-目录" name="monitor-目录"></a>
### monitor 目录
```
|___ monitor
     |___ docker-compose.yml
     |___ config
          |___ grafana
          |    |___ grafana.ini
          |    |___ dashboards
          |    |    |___ axon-benchmark.json
          |    |    |___ axon-node.json
          |    |
          |    |___ provisioning
          |          |___ dashboards
          |          |    |___ dashboards.yaml
          |          |
          |          |___ datasources
          |          |    |___ datasources.yaml   
          |          |
          |          |___ notifiers
          |               |___ notifiers.yaml                    
          |
          |___ elasticsearch
          |
          |
          |___ promethues
               |___ prometheus.yml
```
<a id="markdown-docker-composeyml-1" name="docker-composeyml-1"></a>
### docker-compose.yml
monitor 所使用的组件, 可以直接使用

<a id="markdown-config-目录-1" name="config-目录-1"></a>
### config 目录
monitor 的 config 较多，以下按顺序描述每个目录的功能和文件内容
<a id="markdown-grafana" name="grafana"></a>
#### grafana
该目录主要存在两个子目录和一个配置文件
1. dashboards 放置 dashboard 模板
2. provisioning 初始化数据源、指定初始化 dashboard 的配置文件位置、初始化告警推送配置
3. grafana.ini  Grafana 的配置文件 

<a id="markdown-dashboard" name="dashboard"></a>
##### dashboard
dashboard 的配置基本是固定的并不需要修改，直接使用即可

<a id="markdown-provisioning" name="provisioning"></a>
##### provisioning
dashboards 和 datasources 目录无需修改，
notifiers 目录下的 notifiers.yaml 文件用于配置告警信息推送
```yaml
apiVersion: 1

notifiers:
  # webhook模板
  - name: notification-webhook
    type: webhook
    uid: notification-telegram
    org_id: 1
    is_default: false
    settings:
      url: http://47.56.233.149:4000/bot
```
[provisioning 配置参考](https://grafana.com/docs/grafana/latest/administration/provisioning/)


<a id="markdown-grafanaini" name="grafanaini"></a>
##### grafana.ini
和 grafana 相关的配置，目前比较主要的配置有 `[external_image_storage]`, 主要用于配合 alert 的 include image 功能(最少选一个否则 include image 功能不会生效)
```ini
#################################### External image storage ##########################
[external_image_storage]
# Used for uploading images to public servers so they can be included in slack/email messages.
# you can choose between (s3, webdav, gcs, azure_blob, local)
provider = local
```
[external_image_storage 配置参考](https://grafana.com/docs/grafana/latest/administration/configuration/#external_image_storage)


<a id="markdown-elasticsearch" name="elasticsearch"></a>
#### elasticsearch

##### 
帮助搜索和分析log
```yaml
```



<a id="markdown-promethues" name="promethues"></a>
#### promethues
<a id="markdown-prometheusyml" name="prometheusyml"></a>
##### prometheus.yml
该文件主要是 promethues 的运行配置，里面 job 部分为拉取配置
```yaml
# my global config
global:
  scrape_interval:     5s # Set the scrape interval to every 15 seconds. Default is every 1 minute.
  evaluation_interval: 5s # Evaluate rules every 15 seconds. The default is every 1 minute.
  scrape_timeout:         5s
  # scrape_timeout is set to the global default (10s).

# Alertmanager configuration
alerting:
  alertmanagers:
  - static_configs:
    - targets:
      # - alertmanager:9093

# Load rules once and periodically evaluate them according to the global 'evaluation_interval'.
rule_files:
  # - "node_down.yml"
  # - "simulator_alert_rules.yml"
  # - "second_rules.yml"

# A scrape configuration containing exactly one endpoint to scrape:
# Here it's Prometheus itself.
scrape_configs:
  # The job name is added as a label `job=<job_name>` to any timeseries scraped from this config.
  # Prometheus server 状态监控
  - job_name: 'prometheus'
    static_configs:
    - targets: ['127.0.0.1:9090']

  # 配置为 axon-jaeger-collector 和  axon-jaeger-query 所在 ip，端口和例子如下
  # Jaeger server 状态监控
  - job_name: 'jaeger'
    static_configs:
    - targets: ['axon-jaeger-collector:14269','axon-jaeger-query:16687']

  # 这里配置所有 axon 节点， ['node_id_1:14271, 'node_ip_2:14271', 'node_ip_3:14271']
  # Jaeger 采集端状态监控
  - job_name: 'jaeger_agent'
    static_configs:
    - targets: [jaeger_agent_ip]  

  # 这里配置所有 axon 节点， ['node_id_1:9100, 'node_ip_2:9100', 'node_ip_3:9100']
  # Node_exporter 采集端状态监控
  - job_name: 'node_exporter'
    static_configs:
    - targets: [node_exporter_ip]
  
  # 这里配置所有 axon 节点， ['node_id_1:8000', 'node_ip_2:8000', 'node_ip_3:8000']
  # axon 应用的状态监控
  - job_name: 'axon_exporter'
    static_configs:
    - targets: ['axon_exporter_ip:8000']

```
+++++++++++
<a id="markdown-deploy-详解" name="deploy-详解"></a>
## deploy 详解
部署 monitor/monitor agent 脚本、参数以及ansibel task/vars 文件 

<a id="markdown-主要-文件-如下" name="主要-文件-如下"></a>
### 主要文件如下:

| 文件 | 功能 | 参考 |
| --- | --- | --- |
| Makefile | 部署monitor/monitor agent make 命令 | |
| deploy-monitor.yml | monitor 部署时ansible 主文件 | |
| deploy_monitor_agent.yml | monitor agent 部署时ansible 主文件 |  |
| hosts | mmonitor agent 部署时 指定的axon node 地址 |  |
| init_config.sh | monitor 部署时替换文件的脚本 |  |
| roles目录 | 主要存放monitor 部署与 mmonitor agent 部署时 的ansible 执行具体task 与所需vars |  |


<a id="markdown-deploy-目录" name="deploy-目录"></a>
### deploy 目录
```
___ deploy
     |___ Makefile
     |___ deploy_monitor.yml
     |___ deploy_monitor_agent.yml
     |___ hosts
     |___ init_config.sh
     |___ roles
     |    |___ agent
     |       |___ task
                |___ main.yml
     |       |___ vars
                |___ main.yml
     |   |___ monitor
     |         |___ task
                  |___ main.yml
     |         |___ vars
                  |___ main.yml
 
```

<a id="markdown-Makefile" name="Makefile"></a>
### Makefile
monitor和agent 部署命令

<a id="markdown-deploy_monitor.yml" name="deploy_monitor.yml"></a>
### deploy_monitor.yml
用于monitor deploy

```yml
# 该配置用于 monitor 部署
- name: Deploy monitor
  #ansible task name
  hosts: localhost
  #monitor 部署机器
  become: yes
  become_method: sudo
  roles:
  #monitor deploy roles 选择
  - monitor
```

<a id="markdown-deploy_monitor_agent.yml" name="deploy_monitor_agent.yml"></a>
### deploy_monitor_agent.yml
用于monitor agent deploy

```yml
#   monitor agent部署
---
- name: Deploy agent
  #Task name
  hosts: axon_node
  #该值配置在 hosts 文件中
  remote_user: ckb
  become: yes
  become_method: sudo
  roles:
  #monitor agent deploy roles选择
  - agent
```

<a id="markdown-hosts" name="hosts"></a>
### hosts
用于执行monitor agent deploy 配置

```host

# monitor agent deploy 配置

[axon_node] 
# monitor agent 部署跟随axon agent，此处指定axon node ip
XXX.XXX.XXX.XXX
XXX.XXX.XXX.XXX
XXX.XXX.XXX.XXX
XXX.XXX.XXX.XXX

[prometheus_server]
# prometheus_server
xxx.xxx.xxx.xxx

[allhost:children]
axon_node
prometheus_server
```
<a id="markdown-init_config.sh" name="init_config.sh"></a>
### init_config.sh
monitor deploy 时替换配置文件

<a id="markdown-roles-目录" name="roles-目录"></a>
### roles 目录

该目录主要存放 monitor以及 monitor agent 的ansible task 执行以及vars配置。主要需要配置 以下两个文件


<a id="markdown-roles/agent/vars/main.yml" name="roles/agent/vars/main.yml"></a>
#### roles/agent/vars/main.yml

##### 
部署agent 时，ansible 执行时需要的一些变量
```yaml
monitor_agent_dir: /home/ckb/axon-apm-agent
#cpoy 到目标机器时存放文件的位置
log_path: \/home\/ckb\/axon\/logs
#axon 的日志目录，所以必须与axon deploy 的目录一致
es_address: XXX.XX.XX.XX
# elasticsearch 部署的内网ip地址
```

<a id="markdown-roles/monitor/vars/main.yml" name="roles/monitor/vars/main.yml"></a>
#### roles/monitor/vars/main.yml

##### 
部署monitor 时，ansible 执行时需要变量
```yaml
monitor_dir: /home/ckb/axon-monitor
# 部署monitor 时，ansible copy 文件的目标目录
```


===========
<a id="markdown-部署步骤" name="部署步骤"></a>
## 部署步骤
<a id="markdown-monitor" name="monitor"></a>
### monitor 
copy axon-devops 目录到指定机器上
```shell
$ git clone https://github.com/nervosnetwork/axon-devops
$ cd axon-devops/apm/monitor
```

按照上述 monitor 与deploy  详解文档描述修改以下文件
- prometheus.yml
- roles/monitor/vars/main.yml

之后使用 make 命令 启动/停止服务
```shell
$ cd axon-devops/apm/deploy
$ make monitor-clean #停止monitor服务
$ make monitor-deploy # 启动monitor服务
```
使用 docker-compose 命令查看服务是否启动
```shell
$ docker-compose ps
```
所有服务都为 up 状态时, 访问浏览器查看对应监控平台

grafana
```http
http://grafana_ip:3000
```

jaeger 地址
```http
http://jarger_ip:16686
```

<a id="markdown-agent" name="agent"></a>
### agent 

copy axon-devops 目录到 指定机器上 
```shell
$ git clone https://github.com/nervosnetwork/axon-devops
$ cd axon-devops/apm/agent
```

修改 .env.example 为 .env, 并按照上述 agent 与deploy 详解文档描述修改以下文件

- .env
- filebeat.yml
- axon-devops/apm/deploy/roles/agent/vars/main.yaml
- axon-devops/apm/deploy/hosts


之后使用 make 清理/启动 agent服务
```shell
$ cd axon-devops/apm/deploy
$ make clean #清理 axon monitor agent 
$ make deploy #部署 axon monitor agent  
```
使用 docker-compose 命令查看服务是否启动
```shell
$ docker-compose ps
```
所有服务都为 up 状态时, 访问浏览器可以查看对应监控指标

