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
  provider: ethers.Provider
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
  } catch (error: any) {
    if (
      // ethers error: given address is not contract, or does not have the supportsInterface method available
      error?.info?.method === 'supportsInterface' ||
      // assert error: given address is a contract but given INAMEWRAPPER interface is not available
      (typeof error?.actual === 'boolean' && !error?.actual)
    ) {
      // fail is expected for regular owners since the owner is not a contract and do not have supportsInterface method
      console.warn(
        `checkV1Contract: supportsInterface check fails for ${_tokenId}`
      );
    } else {
      console.warn(
        `checkV1Contract: nft ownership check fails for ${_tokenId}`
      );
    }
  }
  return { tokenId: _tokenId, version: Version.v1 };
}

async function checkV2Contract(
  contract: ethers.Contract,
  identifier: string
): Promise<CheckContractResult> {
  const contractAddress = await contract.getAddress();
  if (contractAddress !== ADDRESS_NAME_WRAPPER) {
    try {
      const isInterfaceSupported = await contract.supportsInterface(
        INAMEWRAPPER
      );
      assert(isInterfaceSupported);
    } catch (error) {
      throw new ContractMismatchError(
        `${contractAddress} does not match with any ENS related contract`,
        400
      );
    }
  }

  const namehash = getNamehash(identifier);
  // const isWrapped = await contract.isWrapped(namehash);
  // assert(isWrapped);

  return { tokenId: namehash, version: Version.v2 };
}

export async function checkContract(
  provider: ethers.Provider,
  contractAddress: string,
  identifier: string
): Promise<CheckContractResult> {
  const _contractAddress = ethers.getAddress(contractAddress);
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
