import { strict as assert } from 'assert';
import { ethers } from 'ethers';
import { ContractMismatchError, Version } from '../base';

import {
  ADDRESS_ETH_REGISTRAR,
  ADDRESS_NAME_WRAPPER,
  INAMEWRAPPER,
} from '../config';
import { getLabelhash } from '../utils/labelhash';
import { getNamehash } from '../utils/namehash';

export async function checkContract(
  provider: ethers.providers.BaseProvider,
  contractAddress: string,
  identifier: string
): Promise<{ tokenId: string; version: Version }> {
  const _contractAddress = ethers.utils.getAddress(contractAddress);
  const contract = new ethers.Contract(
    _contractAddress,
    [
      'function ownerOf(uint256 id) view returns (address)',
      'function supportsInterface(bytes4 interfaceId) external view returns (bool)',
    ],
    provider
  );

  if (_contractAddress === ADDRESS_NAME_WRAPPER) {
    return { tokenId: getNamehash(identifier), version: Version.v2 };
  } else if (_contractAddress === ADDRESS_ETH_REGISTRAR) {
    const _tokenId = getLabelhash(identifier);
    try {
      const nftOwner = await contract.ownerOf(_tokenId);
      if (nftOwner === ADDRESS_NAME_WRAPPER) {
        return { tokenId: _tokenId, version: Version.v1w };
      }
    } catch (error) {
      console.warn(`error for ${_contractAddress}`, error);
      // throw new OwnerNotFoundError(
      //   `Checking owner of ${tokenId} failed. Reason: ${error}`
      // );
    }
    return { tokenId: _tokenId, version: Version.v1 };
  } else {
    try {
      const isInterfaceSupported = await contract.supportsInterface(
        INAMEWRAPPER
      );
      assert(isInterfaceSupported);
      return { tokenId: getNamehash(identifier), version: Version.v2 };
    } catch (error) {
      console.warn(`error for ${_contractAddress}`, error);
    }
  }

  throw new ContractMismatchError(
    `${_contractAddress} does not match with any ENS related contract`,
    400
  );
}
