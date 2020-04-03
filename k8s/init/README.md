# CheckList

- ssh 公钥迁移. 现有机器的 /root/.ssh 复制到新机器即可.
- 常用编程环境安装
  - rust
  - nodejs
  - golang
  - python3
- k8s admin 账号, 保证 k8s, kibana, grafana 系统正常运行
- 日志收集系统部署, 已写配置文件, 需要微调部分参数, 可参见 README.md. https://github.com/nervosnetwork/muta-devops/tree/master/k8s/fluentd-elasticsearch
- grafana 参照官方文档部署即可
- k8s 公网鉴权系统 frontauth 系统正常运行. https://github.com/nervosnetwork/muta-devops/tree/master/k8s/frontauth.
- 保证 muta-bot 正常运行
  - muta-bot 数据迁移. 将 /root/.muta-bot 文件夹拷贝至新目录即可. `NODE_ENV=prod npm -- start`
- 科学上网

# Steps

1. 创建 admin 账号

```yaml
kind: ClusterRoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: admin
  annotations:
    rbac.authorization.kubernetes.io/autoupdate: "true"
roleRef:
  kind: ClusterRole
  name: cluster-admin
  apiGroup: rbac.authorization.k8s.io
subjects:
- kind: ServiceAccount
  name: admin
  namespace: kube-system
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: admin
  namespace: kube-system
  labels:
    kubernetes.io/cluster-service: "true"
    addonmanager.kubernetes.io/mode: Reconcile
```

创建, 查找与获取 Token

```sh
$ kubectl apply -f admin_role.yaml
$ kubectl -n kube-system get secret  | grep admin
$ kubectl -n kube-system describe secret admin-token-cdqws
# eyJhbGciOi ... xbaLOuqxHbvu8Rw
```

2. 代理 k8s dashboard 访问

首先安装 dashboard: [https://github.com/kubernetes/dashboard](https://github.com/kubernetes/dashboard), 注意的是在 dashboard 的配置文件的启动参数种加上 `--enable-insecure-login` 参数.

```sh
$ cd /muta-devops/k8s/frontauth
$ go build
```

```sh
$ ./main -l :4001 -dashboard DASHBOARD_ADDRESS -user USERNAME -pass PASSWORD -token ADMIN_TOKEN
# DASHBOARD_ADDRESS: dashboard 地址, 使用 kubectl get -n kubernetes-dashboard services 查找
# USERNAME: 前端鉴权的用户名, 可随意
# PASSWORD: 前端鉴权的密码, 可随意
# ADMIN_TOKEN: 上一步获取到的 admin token
```

此时 k8s dashboard 可以通过 :4001 端口访问.

3. grafana 监控

[https://github.com/coreos/kube-prometheus](https://github.com/coreos/kube-prometheus)

4. watchdog

从这里开始就是 muta 项目相关的工具了...

```sh
$ cd /muta-devops/watchdog
# 创建 config map
$ kubectl create -n mutadev configmap kubeconfig --from-file=kube.config=/root/.kube/config
# 修改 yaml 文件, 填入正确的 CHAT_ID, TELEGREM_TOKEN
$ kubectl -n mutadev apply -f kube.yaml
```

5. es-crontab-clean

kibana 日志自动清理工具, 只保留 3 天日志.

```sh
$ cd /muta-devops/k8s/es-crontab-clean
$ kubectl apply -f kube.yaml
```
