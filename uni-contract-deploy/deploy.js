const Web3 = require('web3')
const WETH9 = require('./build/WETH9.json')
const UniswapV2Pair = require('./build/UniswapV2Pair.json')
const UniswapV2Factory = require('./build/UniswapV2Factory.json')
const UniswapV2Router01 = require('./build/UniswapV2Router01.json')
const UniswapV2Router02 = require('./build/UniswapV2Router02.json')

const endpoint = 'http://node_address7:8000';
const hexPrivateKey = '0x95500289866f83502cc1fb894ef5e2b840ca5f867cc9e84ab32fb8872b5dd36c';

async function sendTransaction(web3, chainId, account, data, nonce, gasPrice) {
    const tx = {
        type: 2,
        nonce: nonce,
        // to: "0x8D97689C9818892B700e27F316cc3E41e17fBeb9", // Address to send to
        maxPriorityFeePerGas: 215573697772, // Recommended maxPriorityFeePerGas
        maxFeePerGas: 215573697772, // Recommended maxFeePerGas
        // value: ethers.utils.parseEther("0.01"), // .01 ETH
        gasLimit: web3.utils.stringToHex("21000"), // basic transaction costs exactly 21000
        chainId: 1337, // Ethereum network id
        data: data
    };
    const transaction = await account.signTransaction(tx)
    return web3.eth.sendSignedTransaction(transaction.rawTransaction)
}

(async () => {
    const options = { timeout: 1000 * 30 }
    const web3 = new Web3(new Web3.providers.HttpProvider(endpoint, options))
    const account = web3.eth.accounts.privateKeyToAccount(hexPrivateKey)

    const chainId = await web3.eth.getChainId()
    const gasPrice = await web3.eth.getGasPrice()
    let nonce = await web3.eth.getTransactionCount(account.address) + 1

    // deploy WETH contract
    let weth = null
    {
        const contract = new web3.eth.Contract(WETH9.abi)
        const data = contract.deploy({ data: WETH9.bytecode }).encodeABI()
        const receipt = await sendTransaction(web3, chainId, account, data, nonce, gasPrice)
        console.info('WETH:', weth = receipt.contractAddress)
        nonce = nonce + 1
    }


    // deploy UniswapV2Factory contract
    let factory = null
    {
        const contract = new web3.eth.Contract(UniswapV2Factory.abi)
        const options = { data: UniswapV2Factory.bytecode, arguments: [account.address] }
        const data = contract.deploy(options).encodeABI()
        const receipt = await sendTransaction(web3, chainId, account, data, nonce, gasPrice)
        console.info('UniswapV2Factory:', factory = receipt.contractAddress)
        nonce = nonce + 1
    }

    // deploy UniswapV2Router01 contract
    {
        const contract = new web3.eth.Contract(UniswapV2Router01.abi)
        const options = { data: UniswapV2Router01.bytecode, arguments: [factory, weth] }
        const data = contract.deploy(options).encodeABI()
        const receipt = await sendTransaction(web3, chainId, account, data, nonce, gasPrice)
        console.info('UniswapV2Router01:', receipt.contractAddress)
        nonce = nonce + 1
    }

    // deploy UniswapV2Router02 contract
    {
        const contract = new web3.eth.Contract(UniswapV2Router02.abi)
        const options = { data: UniswapV2Router02.bytecode, arguments: [factory, weth] }
        const data = contract.deploy(options).encodeABI()
        const receipt = await sendTransaction(web3, chainId, account, data, nonce, gasPrice)
        console.info('UniswapV2Router02:', receipt.contractAddress)
        nonce = nonce + 1
    }

    let data = UniswapV2Pair.bytecode
    if (!data.startsWith('0x')) data = '0x' + data
    console.info('INIT_CODE_HASH:', web3.utils.keccak256(data))
})()