import { ContractInterface, ContractFactory } from '@ethersproject/contracts'
import { MigrationState, MigrationStep } from '../../migrations'
import sleep from './sleep'
const Web3 = require('web3')

export default function createDeployLibraryStep({
  key,
  artifact: { contractName, abi, bytecode },
}: {
  key: keyof MigrationState
  artifact: { contractName: string; abi: ContractInterface; bytecode: string }
}): MigrationStep {
  return async (state, { signer, gasPrice, jsonRpc }) => {
    const options = { timeout: 1000 * 30 }
    const web3 = new Web3(new Web3.providers.HttpProvider(jsonRpc, options))
    let contract_address = "";
    if (state[key] === undefined) {
      const factory = new ContractFactory(abi, bytecode, signer)
      const library = await factory.deploy({ gasPrice, gasLimit: 6721975 })
      sleep(10000);
      console.log("library contract is ", library.address);
      var receipt = await web3.eth.getTransactionReceipt(library.deployTransaction.hash);
      if (receipt != null) {
        contract_address = receipt.contractAddress;

      } else {
        console.log("receipt is null:", library.deployTransaction.hash);
        contract_address = library.address
      }

      state[key] = contract_address;
      return [
        {
          message: `Library ${contractName} deployed`,
          address: contract_address,
          hash: library.deployTransaction.hash,
        },
      ]
    } else {
      return [{ message: `Library ${contractName} was already deployed`, address: state[key] }]
    }
  }
}
