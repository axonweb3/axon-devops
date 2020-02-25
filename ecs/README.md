# 阿里云 ECS 机器申请/链部署脚本

首先确认 ./res/id_rsa, ./res/id_rsa.pub, ./res/secret.toml 三个文件是否存在, 且 secret.toml 配置正确.

```toml
[aliyun]
access_key = ""
access_secret = ""
ecs_password = ""
private_key = "./res/id_rsa.pub"

[telegram]
chat_id = ""
token = ""
```

## 申请机器

1. 配置 ./res/config.toml, 填写节点信息, 比如如下是申请两个杭州节点

```toml
[[ecs.node]]
region_id = "cn-hangzhou"
image = "ubuntu_18_04_x64_20G_alibase_20191225.vhd"
instance_type = "ecs.g6.large"
internet_max_bandwidth_out = 100

[[ecs.node]]
# https://www.alibabacloud.com/help/tc/doc-detail/40654.html
region_id = "cn-hangzhou"
image = "ubuntu_18_04_x64_20G_alibase_20191225.vhd"
instance_type = "ecs.g6.large"
internet_max_bandwidth_out = 100
```
2. `python3 ./src/main.py ecs_make`. 命令执行完后机器的信息保存在 ./db/instance_list.json 内, 包括公网/内网 IP 等信息. 机器开机需要一段时间, 等待 30s 左右即可 ssh 进入机器.
3. 销毁机器采用 `python3 ./src/main.py ecs_free` 即可.

## 部署节点

1. 配置 config.toml 中 muta 项目地址, 并手动切换到需要构建发布的分支.
2. `python3 ./src/main.py build_muta_binary`: 构建二进制
3. `python3 ./src/main.py build_muta_config_request`: 构建配置文件生成请求
4. `python3 ./src/main.py build_muta_config`: 构建配置文件
5. `python3 ./src/main.py deploy_binary`: 打包二进制和配置文件到远端机器
6. `python3 ./src/main.py deploy_run`: 启动 muta(在启动时会自动杀死旧的链)

## 压测

1. 首先安装 muta-bench 工具: `npm i -g muta-bench@xx`
2. `python3 ./src/main.py oam_bench ANY_NAME http://127.0.0.1:8080/graphql`, 压测数据会定时发送到 tg.

## 链信息监控

监控节点的高度, 内存占用信息等数据并定时发送至 tg. 程序会读取 instance_list.json 中的公网地址信息, 并使用 muta-sdk 定时查询节点高度, 同时使用 ssh 方式获取机器内存占用信息.

```sh
$ cd monitor
$ node index.js ../../res/db/instance_list.json
```
