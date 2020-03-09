# Auth

为 k8s dashboard, kibana, grafana 提供统一的公网鉴权与入口.

```sh
$ ./frontauth -user muta -pass mutapass -l :4001 -dashboard [DASHBOARD_ADDR] -grafana [GRAFANA_ADDR] -kibana [KIBANA_ADDR] -token [K8S_CLIENT_TOKEN]
```
