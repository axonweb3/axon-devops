# use hardhat tool  to test and compile solidity contract
#### axon uniswap contract case: suggest vscode open this project.
```shell
$ cd ~
$ git clone https://github.com/nervosnetwork/axon-devops.git
$ cd axon-devops/uni-test
$ npm install
```
## start a hardhat evm node
```shell
$ npx hardhat node
```
#
## compile all contracts
```shell
$ npx hardhat compile
```
#
## test uniswap contracts
```shell
$ npx hardhat run scripts/test-uniswap-script.js
```
#

## publish contracts to axon
```shell
$ cd ../uni-contract-deploy
$ npm install
```
modify deployed network node address setting in the config.yml as following  image shown.

![1642397938(1)](https://user-images.githubusercontent.com/18735238/149713785-7f2c2898-74d6-4334-a599-27afda81637f.jpg)

```shell
$ node templates/deploy.js
```

# deploy uni interface
```shell
$ cd uni-interface-deploy && make deploy 
```

## metamask network
name: GÖRLI
chain id: 5



## Reference
[Reference Links](https://segmentfault.com/a/1190000040401731)
