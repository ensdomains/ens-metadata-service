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

interface CheckContractResult {
  tokenId: string;
  version: Version;
}

async function checkV1Contract(
  contract: ethers.Contract,
  identifier: string,
  provider: ethers.providers.BaseProvider
): Promise<CheckContractResult> {
  const _tokenId = getLabelhash(identifier);
  try {
    const nftOwner = await contract.ownerOf(_tokenId);
    if (nftOwner === ADDRESS_NAME_WRAPPER) {
      return { tokenId: _tokenId, version: Version.v1w };
    }
    const wrapperContract = new ethers.Contract(
      nftOwner,
      [
        'function supportsInterface(bytes4 interfaceId) external view returns (bool)',
      ],
      provider
    );
    const isInterfaceSupported = await wrapperContract.supportsInterface(
      INAMEWRAPPER
    );
    assert(isInterfaceSupported);
    return { tokenId: _tokenId, version: Version.v1w };
  } catch (error) {
    console.warn(`error for ${contract.address}`, error);
  }
  return { tokenId: _tokenId, version: Version.v1 };
}

async function checkV2Contract(
  contract: ethers.Contract,
  identifier: string
): Promise<CheckContractResult> {
  if (contract.address !== ADDRESS_NAME_WRAPPER) {
    try {
      const isInterfaceSupported = await contract.supportsInterface(
        INAMEWRAPPER
      );
      assert(isInterfaceSupported);
    } catch (error) {
      throw new ContractMismatchError(
        `${contract.address} does not match with any ENS related contract`,
        400
      );
    }
  }

  const namehash = getNamehash(identifier);
  const isWrapped = await contract.isWrapped(namehash);
  assert(isWrapped);

  return { tokenId: namehash, version: Version.v2 };
}

export async function checkContract(
  provider: ethers.providers.BaseProvider,
  contractAddress: string,
  identifier: string
): Promise<CheckContractResult> {
  const _contractAddress = ethers.utils.getAddress(contractAddress);
  const contract = new ethers.Contract(
    _contractAddress,
    [
      'function ownerOf(uint256 id) view returns (address)',
      'function supportsInterface(bytes4 interfaceId) external view returns (bool)',
      'function isWrapped(bytes32 node) public view returns (bool)',
    ],
    provider
  );

  if (_contractAddress === ADDRESS_ETH_REGISTRAR) {
    return checkV1Contract(contract, identifier, provider);
  } else {
    return checkV2Contract(contract, identifier);
  }
}
