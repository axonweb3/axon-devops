import { Contract, ContractInterface, ContractFactory } from '@ethersproject/contracts'
import { MigrationConfig, MigrationState, MigrationStep } from '../../migrations'
import linkLibraries from '../../util/linkLibraries'
import sleep from './sleep'
const Web3 = require('web3')
type ConstructorArgs = (string | number | string[] | number[])[]

export default function createDeployContractStep({
  key,
  artifact: { contractName, abi, bytecode, linkReferences },
  computeLibraries,
  computeArguments,
}: {
  key: keyof MigrationState
  artifact: {
    contractName: string
    abi: ContractInterface
    bytecode: string
    linkReferences?: { [fileName: string]: { [contractName: string]: { length: number; start: number }[] } }
  }
  computeLibraries?: (state: Readonly<MigrationState>, config: MigrationConfig) => { [libraryName: string]: string }
  computeArguments?: (state: Readonly<MigrationState>, config: MigrationConfig) => ConstructorArgs
}): MigrationStep {
  if (linkReferences && Object.keys(linkReferences).length > 0 && !computeLibraries) {
    throw new Error('Missing function to compute library addresses')
  } else if (computeLibraries && (!linkReferences || Object.keys(linkReferences).length === 0)) {
    throw new Error('Compute libraries passed but no link references')
  }
  return async (state, config) => {
    if (state[key] === undefined) {
      const constructorArgs: ConstructorArgs = computeArguments ? computeArguments(state, config) : []

      const factory = new ContractFactory(
        abi,
        linkReferences && computeLibraries
          ? linkLibraries({ bytecode, linkReferences }, computeLibraries(state, config))
          : bytecode,
        config.signer
      )

      let contract: Contract
      let contract_address: string
      try {

        const options = { timeout: 1000 * 30 }
        const web3 = new Web3(new Web3.providers.HttpProvider(config.jsonRpc, options))
        const account = web3.eth.accounts.privateKeyToAccount(config.privateKey)
        contract = await factory.deploy(...constructorArgs, { gasPrice: config.gasPrice, gasLimit: 6721975 })
        console.log("tx hash is ", contract.deployTransaction.hash);
        sleep(10000);
        var receipt = await web3.eth.getTransactionReceipt(contract.deployTransaction.hash);

        if (receipt != null) {
          contract_address = receipt.contractAddress;

        } else {
          console.log("receipt is null:", contract.deployTransaction.hash);
          contract_address = contract.address
        }

      } catch (error) {
        console.error(`Failed to deploy ${contractName}`)
        throw error
      }

      state[key] = contract_address;

      return [
        {
          message: `Contract ${contractName} deployed`,
          address: contract_address,
          hash: contract.deployTransaction.hash,
        },
      ]
    } else {
      return [{ message: `Contract ${contractName} was already deployed`, address: state[key] }]
    }
  }
}
