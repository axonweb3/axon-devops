import { program } from 'commander'
import { Wallet } from '@ethersproject/wallet'
import { JsonRpcProvider, TransactionReceipt } from '@ethersproject/providers'
import { AddressZero } from '@ethersproject/constants'
import { getAddress } from '@ethersproject/address'
import fs from 'fs'
import deploy from './src/deploy'
import { MigrationState } from './src/migrations'
import { asciiStringToBytes32 } from './src/util/asciiStringToBytes32'
import { version } from './package.json'
import { syncBuiltinESMExports } from 'module'
const Web3 = require('web3')
program
  .requiredOption('-pk, --private-key <string>', 'Private key used to deploy all contracts')
  .requiredOption('-j, --json-rpc <url>', 'JSON RPC URL where the program should be deployed')
  .requiredOption('-w9, --weth9-address <address>', 'Address of the WETH9 contract on this chain')
  .requiredOption('-ncl, --native-currency-label <string>', 'Native currency label, e.g. ETH')
  .requiredOption(
    '-o, --owner-address <address>',
    'Contract address that will own the deployed artifacts after the script runs'
  )
  .option('-s, --state <path>', 'Path to the JSON file containing the migrations state (optional)', './state.json')
  .option('-v2, --v2-core-factory-address <address>', 'The V2 core factory address used in the swap router (optional)')
  .option('-g, --gas-price <number>', 'The gas price to pay in GWEI for each transaction (optional)')
  .option('-c, --confirmations <number>', 'How many confirmations to wait for after each transaction (optional)', '2')

program.name('npx @uniswap/deploy-v3').version(version).parse(process.argv)

if (!/^0x[a-zA-Z0-9]{64}$/.test(program.privateKey)) {
  console.error('Invalid private key!')
  process.exit(1)
}

let url: URL
let privateKey: string
try {
  url = new URL(program.jsonRpc)
  privateKey = program.privateKey;
} catch (error) {
  console.error('Invalid JSON privateKey ', (error as Error).message)
  process.exit(1)
}

let jsonRpc: string
try {
  url = new URL(program.jsonRpc)
  jsonRpc = program.jsonRpc;
} catch (error) {
  console.error('Invalid JSON RPC URL', (error as Error).message)
  process.exit(1)
}

let gasPrice: number | undefined
try {
  gasPrice = program.gasPrice ? parseInt(program.gasPrice) : undefined
} catch (error) {
  console.error('Failed to parse gas price', (error as Error).message)
  process.exit(1)
}

let confirmations: number
try {
  confirmations = parseInt(program.confirmations)
} catch (error) {
  console.error('Failed to parse confirmations', (error as Error).message)
  process.exit(1)
}

let nativeCurrencyLabelBytes: string
try {
  nativeCurrencyLabelBytes = asciiStringToBytes32(program.nativeCurrencyLabel)
} catch (error) {
  console.error('Invalid native currency label', (error as Error).message)
  process.exit(1)
}

let weth9Address: string
try {
  weth9Address = getAddress(program.weth9Address)
} catch (error) {
  console.error('Invalid WETH9 address', (error as Error).message)
  process.exit(1)
}

let v2CoreFactoryAddress: string
if (typeof program.v2CoreFactoryAddress === 'undefined') {
  v2CoreFactoryAddress = AddressZero
} else {
  try {
    v2CoreFactoryAddress = getAddress(program.v2CoreFactoryAddress)
  } catch (error) {
    console.error('Invalid V2 factory address', (error as Error).message)
    process.exit(1)
  }
}

let ownerAddress: string
try {
  ownerAddress = getAddress(program.ownerAddress)
} catch (error) {
  console.error('Invalid owner address', (error as Error).message)
  process.exit(1)
}

const wallet = new Wallet(program.privateKey, new JsonRpcProvider({ url: url.href }))

let state: MigrationState
if (fs.existsSync(program.state)) {
  try {
    state = JSON.parse(fs.readFileSync(program.state, { encoding: 'utf8' }))
  } catch (error) {
    console.error('Failed to load and parse migration state file', (error as Error).message)
    process.exit(1)
  }
} else {
  state = {}
}

let finalState: MigrationState
const onStateChange = async (newState: MigrationState): Promise<void> => {
  fs.writeFileSync(program.state, JSON.stringify(newState))
  finalState = newState
}
function sleep() {
  var start = (new Date()).getTime();
  while ((new Date()).getTime() - start < 5000) {
    // 使用  continue 实现；
    continue;
  }
}

async function run() {
  let step = 1
  const results = []
  const generator = deploy({
    signer: wallet,
    gasPrice,
    nativeCurrencyLabelBytes,
    v2CoreFactoryAddress,
    ownerAddress,
    weth9Address,
    initialState: state,
    onStateChange,
    jsonRpc,
    privateKey
  })

  const options = { timeout: 1000 * 30 }
  const web3 = new Web3(new Web3.providers.HttpProvider(jsonRpc, options))
  for await (const result of generator) {


    // sleep();
    // var receipt = await web3.eth.getTransactionReceipt(result[0].hash);

    // console.log(result[0].hash);
    // if (receipt != null) {
    //   result[0].address = receipt.contractAddress;
    // }
    console.log(`Step ${step++} complete`, result)

    results.push(result)

    // wait 15 minutes for any transactions sent in the step
    await Promise.all(
      result.map(
        (stepResult): Promise<TransactionReceipt | true> => {
          if (stepResult.hash) {
            return wallet.provider.waitForTransaction(stepResult.hash, confirmations, /* 15 minutes */ 1000 * 60 * 15)
          } else {
            return Promise.resolve(true)
          }
        }
      )
    )
  }

  return results
}

run()
  .then((results) => {
    console.log('Deployment succeeded')
    console.log(JSON.stringify(results))
    console.log('Final state')
    console.log(JSON.stringify(finalState))
    process.exit(0)
  })
  .catch((error) => {
    console.error('Deployment failed', error)
    console.log('Final state')
    console.log(JSON.stringify(finalState))
    process.exit(1)
  })
