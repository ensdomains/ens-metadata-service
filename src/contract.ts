import { strict as assert } from 'assert';
import { ethers } from 'ethers';
import { BaseError } from './base';

import {
  ADDRESS_ETH_REGISTRAR,
  ADDRESS_NAME_WRAPPER,
  INAMEWRAPPER,
} from './config';
import { Version } from './metadata';

export interface ContractMismatchError {}
export class ContractMismatchError extends BaseError {}

export interface OwnerNotFoundError {}
export class OwnerNotFoundError extends BaseError {}

export async function checkContract(
  provider: any,
  contractAddress: string,
  tokenId: string
): Promise<Version> {
  try {
    var contract = new ethers.Contract(
      contractAddress,
      [
        'function ownerOf(uint256 tokenId) public view returns (address)',
        'function supportsInterface(bytes4 interfaceId) external view returns (bool)',
      ],
      provider
    );
    if (contractAddress !== ADDRESS_ETH_REGISTRAR) {
      assert(await contract.supportsInterface(INAMEWRAPPER));
    }
  } catch (error) {
    throw new ContractMismatchError(
      `${contractAddress} does not match with any ENS related contract`
    );
  }
  
  try {
    var nftOwner = await contract.ownerOf(tokenId);
    assert(nftOwner !== '0x')
  } catch (error) {
    throw new OwnerNotFoundError(`Checking owner of ${tokenId} failed. Reason: ${error}`);
  }

  if (contractAddress === ADDRESS_NAME_WRAPPER) {
    return Version.v2;
  } else if (contractAddress === ADDRESS_ETH_REGISTRAR) {
    if (nftOwner === ADDRESS_NAME_WRAPPER) {
      return Version.v1w;
    } else {
      return Version.v1;
    }
  }
  throw new ContractMismatchError(
    `${contractAddress} does not match with any ENS related contract`
  );
}
