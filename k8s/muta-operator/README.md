## Muta Operator
Muta Operator manages Muta nodes on kubernetes by Muta CRD(Custom Resource Definitions)

## Features
- Automatically creates a muta chain with the specified number of nodes.
- Allows you to specify and combine multiple chaos network attacks (option)
- Automatically allows a cronjob to stress test the chain (option).
## Install on kubernetes (macOS)
```sh
// install operator-sdk
$ brew install operator-sdk

$ git clone https://github.com/nervosnetwork/muta-devops
$ cd muta-devops/k8s/muta-operator
// build image
$ make

// install to kubernetes
$ kubectl create ns mutadev
$ kubectl -f deploy/crds
$ kubectl -f deploy

// check if the installation is complete.
$ kubectl get pods -n mutadev
NAME                                 READY   STATUS    RESTARTS   AGE
muta-operator-66c8bd6568-l5dt8 1/1     1/1   Running     0        152m

$ kubectl get StatefulSet -n mutadev
NAME                   READY   AGE
muta-example-0         1/1     3h51m
muta-example-1         1/1     3h51m
muta-example-2         1/1     3h51m
muta-example-3         1/1     3h51m
```

## Deploy your muta chain to kubernetes
Muta CRD temaplte https://github.com/nervosnetwork/muta-devops/blob/muta-operator/k8s/muta-operator/deploy/crds/nervos.org_v1alpha1_muta_cr.yaml
```sh
// 1. Edit your own muta CRD from template
...

// 2. Create your crd to kubernetes cluster
$ kubectl create -f your_muta_crd.yaml
```
