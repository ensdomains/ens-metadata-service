import { provider } from './config';

import * as BASE_REGISTRAR_BYTECODE from './assets/ENSRegistrar_bc.json';
import * as NAME_WRAPPER_BYTECODE from './assets/NameWrapper_bc.json';
import { ethers } from 'ethers';
import { Version } from './metadata';


export interface BaseError {}
export class BaseError extends Error {
  __proto__: Error;
  constructor(message?: string) {
    const trueProto = new.target.prototype;
    super(message);

    this.__proto__ = trueProto;
  }
}

export interface ContractMismatchError {}
export class ContractMismatchError extends BaseError {}

export interface ContractNotFoundError {}
export class ContractNotFoundError extends BaseError {}

export interface OwnerNotFoundError {}
export class OwnerNotFoundError extends BaseError {}


export async function checkContract(
  contractAddress: string,
  tokenId: string
): Promise<Version> {
  let nftOwner;
  const contract_code = await provider.getCode(contractAddress);
  if (contract_code === '0x') {
    throw new ContractNotFoundError(`${contractAddress} is not a contract`);
  }
  // TODO check hexId labelhash or intId namehash

  try {
    const contract = new ethers.Contract(
      contractAddress,
      ['function ownerOf(uint256 tokenId) public view returns (address)'],
      provider
    );
    nftOwner = await contract.ownerOf(tokenId);
  } catch (error) {
    console.log('err', error.message);
    throw new ContractMismatchError(
      `${contractAddress} does not match with any ENS related contract`
    );
  }

  if (nftOwner === '0x') {
    throw new OwnerNotFoundError('No registered nft');
  }
  const nftOwner_code = await provider.getCode(nftOwner);
  if (nftOwner_code === '0x') {
    if (contract_code === NAME_WRAPPER_BYTECODE.bytecode) {
      return Version.v2;
    }
    return Version.v1;
  }
  if (nftOwner_code === BASE_REGISTRAR_BYTECODE.bytecode) {
    return Version.v1w;
  }
  throw new OwnerNotFoundError('No registered nft');
}


  // if(contractType == Contract.nameWrapper) {
  //  v2 hex namehash makoto.eth - 0x412329d38ad88cb88b1bb6d4005cd6aa010b7bdeb55fd28f980943d423725fb1
  // }

  // if(contractType == Contract.baseRegistrar) {
  //  v1 int labelhash makoto - 10752601994971649179164517782929867232152319685582174799783555262090660234668
  // }