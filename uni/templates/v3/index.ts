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
import Web3Client from "./src/util/web3-utils";

program
  .requiredOption('-pk, --private-key <string>', 'The private key used to deploy all contracts')
  .requiredOption('-j, --json-rpc <url>', 'The JSON RPC URL where the program should be deployed')
  .requiredOption('-s, --state <path>', 'Path to the JSON file containing the migrations state')
  .requiredOption('-w9, --weth9-address <address>', 'The address of the WETH9 contract to use')
  .requiredOption('-ncl, --native-currency-label <string>', 'The label of the native currency, e.g. ETH')
  .requiredOption('-v2, --v2-core-factory-address <address>', 'The V2 core factory address used in the swap router')
  .requiredOption(
    '-o, --owner-address <address>',
    'The address of the contract that will own the deployed artifacts after the migration runs'
  )
  .option('-g, --gas-price <number>', 'The gas price to pay in GWEI for each transaction')
  .option('-c, --confirmations <number>', 'How many confirmations to wait for after each transaction', '2')

program.name('npx @uniswap/deploy-v3').version(version).parse(process.argv)

if (!/^0x[a-zA-Z0-9]{64}$/.test(program.privateKey)) {
  console.error('Invalid private key!')
  process.exit(1)
}

let url: URL
try {
  url = new URL(program.jsonRpc)
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
export const web3Client = new Web3Client(program.jsonRpc, program.privateKey)

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
  })

  for await (const result of generator) {
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
