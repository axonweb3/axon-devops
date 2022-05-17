# Deploy Benchmark
Requires nodejs、yarn、[nginx](../axon-nginx/README.md)
## Configuration of the deployment

### Step 1
```shell
$ cd axon-devops/axon-benchmark/benchmark
```

### Step 2
```shell
$ yarn install
```

### Step 3

```shell
$ vim config.json 
```

Editor config.json

```conf
{
    "http_endpoint": "http://127.0.0.1:8000",
    "private_key" : "0x37aa0f893d05914a4def0460c0a984d3611546cfb26924d7a7ca6e0db9950a2d",
    "continuous_benchmark": false,
    "benchmark_time": 60000,
    "batch_size": 100,
    "thread_num": 10,
    "id": "936501604767629344",
    "token": "Fha8Hn6C31VEu3wL5XejIVGocTXiQbJ6HabAC5sLtHHwvqQ63iXj1FmOkH_FVN4mTZwQ",
    "benchmark_cases": ["./benchmark", "./contract_benchmark"]
}
                                               
```
`http_endpoint`: Http address of axon rpc

`private_key`: Private Key

`continuous_benchmark`: Whether to continue benchmark testing

`batch_size`: Number of transactions sent per time

`thread_num`: Number of threads sending transactions

`benchmark_time`: When continuous_benchmark is false, the duration of the benchmark test

`id`: discord webhook's id(When continuous_benchmark is false, the results are pushed to discord)

`token` discord webhook's token(When continuous_benchmark is false, the results are pushed to discord)

`benchmark_cases`: Use cases for benchmark

## Instructions for use
### start
```shell
$ nohup yarn start &
```

### Modify specified parameters via pass-through
The passed parameters will replace the configuration of the corresponding key in config.json
```shell
$ nohup node index.js --benchmark_cases="['./benchmark']" &
```
