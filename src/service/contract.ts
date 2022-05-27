import { strict as assert } from 'assert';
import { ethers } from 'ethers';
import { ContractMismatchError, OwnerNotFoundError, Version } from '../base';

import {
  ADDRESS_ETH_REGISTRAR,
  ADDRESS_NAME_WRAPPER,
  INAMEWRAPPER,
} from '../config';

export async function checkContract(
  provider: any,
  contractAddress: string,
  tokenId: string
): Promise<Version> {
  const _contractAddress = ethers.utils.getAddress(contractAddress);
  try {
    var contract = new ethers.Contract(
      _contractAddress,
      [
        'function ownerOf(uint256 tokenId) public view returns (address)',
        'function supportsInterface(bytes4 interfaceId) external view returns (bool)',
      ],
      provider
    );
    if (_contractAddress !== ADDRESS_ETH_REGISTRAR) {
      assert(await contract.supportsInterface(INAMEWRAPPER));
    }
  } catch (error) {
    throw new ContractMismatchError(
      `${_contractAddress} does not match with any ENS related contract`,
      400
    );
  }

  if (_contractAddress === ADDRESS_NAME_WRAPPER) {
    return Version.v2;
  } else if (_contractAddress === ADDRESS_ETH_REGISTRAR) {
    try {
      var nftOwner = await contract.ownerOf(tokenId);
      assert(nftOwner !== '0x');
    } catch (error) {
      // throw new OwnerNotFoundError(
      //   `Checking owner of ${tokenId} failed. Reason: ${error}`
      // );
    }
    if (nftOwner === ADDRESS_NAME_WRAPPER) {
      return Version.v1w;
    } else {
      return Version.v1;
    }
  }
  throw new ContractMismatchError(
    `${_contractAddress} does not match with any ENS related contract`,
    400
  );
}
