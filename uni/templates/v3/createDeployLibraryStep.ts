import { ContractInterface, ContractFactory } from '@ethersproject/contracts'
import { MigrationState, MigrationStep } from '../../migrations'
import {web3Client} from "../../../index";

export default function createDeployLibraryStep({
  key,
  artifact: { contractName, abi, bytecode },
}: {
  key: keyof MigrationState
  artifact: { contractName: string; abi: ContractInterface; bytecode: string }
}): MigrationStep {
  return async (state, { signer, gasPrice }) => {
    if (state[key] === undefined) {
      const factory = new ContractFactory(abi, bytecode, signer)
      const nonce = await web3Client.getNonce();
      const library = await factory.deploy({ gasPrice: gasPrice, gasLimit: 22222222, nonce: nonce  })
      const receipt = await web3Client.getReceipt(library.deployTransaction.hash);

      state[key] = receipt.contractAddress

      return [
        {
          message: `Library ${contractName} deployed`,
          address: receipt.contractAddress,
          hash: library.deployTransaction.hash,
        },
      ]
    } else {
      return [{ message: `Library ${contractName} was already deployed`, address: state[key] }]
    }
  }
}
