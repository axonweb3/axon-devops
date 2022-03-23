const Web3 = require("web3");
const fs = require("fs");
const yaml = require("js-yaml");

const WETH9 = require("../uni-v2-test/artifacts/contracts/Weth.sol/WETH9.json");
const UniswapV2Factory = require("../uni-v2-test/artifacts/contracts/Factory.sol/UniswapV2Factory.json");
const UniswapV2Router02 = require("../uni-v2-test/artifacts/contracts/UniswapV2Router02.sol/UniswapV2Router02.json");
const Multicall = require("../uni-v2-test/artifacts/contracts/MultilCall.sol/Multicall.json");

const configdata = fs.readFileSync("config.yml", "utf8");
const configsetting = yaml.load(configdata);
const endpoint = configsetting.node_address;
const hexPrivateKey = configsetting.hex_private_key;

async function sendTransaction(web3, chainId, account, data, nonce) {
  const tx = {
    type: 2,
    nonce,
    maxPriorityFeePerGas: 250, // Recommended maxPriorityFeePerGas
    maxFeePerGas: 250, // Recommended maxFeePerGas
    gasLimit: web3.utils.stringToHex("21000"), // basic transaction costs exactly 21000
    chainId: 5, // Ethereum network id
    data,
  };
  const transaction = await account.signTransaction(tx);
  return web3.eth.sendSignedTransaction(transaction.rawTransaction);
}

(async () => {
  const options = { timeout: 1000 * 30 };
  const web3 = new Web3(new Web3.providers.HttpProvider(endpoint, options));
  const account = web3.eth.accounts.privateKeyToAccount(hexPrivateKey);

  const chainId = await web3.eth.getChainId();
  let nonce = (await web3.eth.getTransactionCount(account.address)) + 1;

  const contractAddress = {
    WETH: "",
    WETH_TX_HASH: "",
    UniswapV2Factory: "",
    UniswapV2Factory_TX_HASH: "",
    UniswapV2Router02: "",
    UniswapV2Router02_TX_HASH: "",
    Multicall: "",
    Multicall_TX_HASH: "",
    InitCodeHash:
      "0xfe5c25035eb1580fcbc8496a5d5423870718fac54c9d582b43039dbce6afc72f",
  };

  // deploy Multicall contract
  {
    const contract = new web3.eth.Contract(Multicall.abi);
    const data = contract.deploy({ data: Multicall.bytecode }).encodeABI();
    const receipt = await sendTransaction(
      web3,
      chainId,
      account,
      data,
      nonce,
    );
    nonce += 1;
    contractAddress.Multicall = receipt.contractAddress;
    contractAddress.Multicall_TX_HASH = receipt.transactionHash;
  }

  // deploy WETH contract
  {
    const contract = new web3.eth.Contract(WETH9.abi);
    const data = contract.deploy({ data: WETH9.bytecode }).encodeABI();
    const receipt = await sendTransaction(
      web3,
      chainId,
      account,
      data,
      nonce,
    );
    nonce += 1;
    contractAddress.WETH = receipt.contractAddress;
    contractAddress.WETH_TX_HASH = receipt.transactionHash;
  }

  // deploy UniswapV2Factory contract
  {
    const contract = new web3.eth.Contract(UniswapV2Factory.abi);
    const txOptions = {
      data: UniswapV2Factory.bytecode,
      arguments: [account.address],
    };
    const data = contract.deploy(txOptions).encodeABI();
    const receipt = await sendTransaction(
      web3,
      chainId,
      account,
      data,
      nonce,
    );
    nonce += 1;
    contractAddress.UniswapV2Factory = receipt.contractAddress;
    contractAddress.UniswapV2Factory_TX_HASH = receipt.transactionHash;
  }

  // deploy UniswapV2Router02 contract
  {
    const contract = new web3.eth.Contract(UniswapV2Router02.abi);
    const txOptions = {
      data: UniswapV2Router02.bytecode,
      arguments: [contractAddress.UniswapV2Factory, contractAddress.WETH],
    };
    const data = contract.deploy(txOptions).encodeABI();
    const receipt = await sendTransaction(
      web3,
      chainId,
      account,
      data,
      nonce,
    );
    nonce += 1;
    contractAddress.UniswapV2Router02 = receipt.contractAddress;
    contractAddress.UniswapV2Router02_TX_HASH = receipt.transactionHash;
  }
  console.log(contractAddress);
  const yamlStr = yaml.dump(contractAddress);
  fs.writeFileSync("contract_Uni_V2_Address.yaml", yamlStr, "utf8");
})();
