import { ethers } from 'ethers';
import { provider } from './config';
import { Version } from './metadata';
import * as NAME_WRAPPER_BYTECODE from './assets/NameWrapper_bc.json';

export interface ContractMismatchError {}
export class ContractMismatchError extends Error {
  __proto__: Error;
  constructor(message?: string) {
    const trueProto = new.target.prototype;
    super(message);

    this.__proto__ = trueProto;
  }
}

export interface ContractNotFoundError {}
export class ContractNotFoundError extends Error {
  __proto__: Error;
  constructor(message?: string) {
    const trueProto = new.target.prototype;
    super(message);

    this.__proto__ = trueProto;
  }
}

export async function checkContract(contractAddress: string): Promise<Version> {
  const contract_code = await provider.getCode(contractAddress);
  if (contract_code === '0x') {
    throw new ContractNotFoundError(`${contractAddress} is not a contract`);
  }
  if (contract_code === NAME_WRAPPER_BYTECODE.bytecode) {
    return Version.v2;
  }

  try {
    const contract = new ethers.Contract(
      contractAddress,
      ['function owner() public view returns (address)'],
      provider
    );
    const result = await contract.owner();
    const contract_code = await provider.getCode(result);
    if (contract_code === NAME_WRAPPER_BYTECODE.bytecode) {
      return Version.v1w;
    }
  } catch (error) {
    console.log('err', error.message);
    throw new ContractMismatchError(
      `${contractAddress} is not matched with any ENS related contract`
    );
  }
  return Version.v1;
}
