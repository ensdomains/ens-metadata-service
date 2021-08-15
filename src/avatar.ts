import { strict as assert } from 'assert';
import { ethers } from 'ethers';
import fetch from 'node-fetch';
import { INFURA_API_KEY, provider } from './config';

export interface BaseError {}
export class BaseError extends Error {
  __proto__: Error;
  constructor(message?: string) {
    const trueProto = new.target.prototype;
    super(message);

    this.__proto__ = trueProto;
  }
}

export interface ResolverNotFound {}
export class ResolverNotFound extends BaseError {}

export interface TextRecordNotFound {}
export class TextRecordNotFound extends BaseError {}

export interface RetrieveURIFailed {}
export class RetrieveURIFailed extends BaseError {}

export interface UnsupportedNamespace {}
export class UnsupportedNamespace extends BaseError {}

export async function getAvatar(name: string): Promise<any> {
  try {
    // retrieve resolver by ens name
    var resolver = await provider.getResolver(name);
  } catch (e) {
    throw new ResolverNotFound('There is no resolver set under given address');
  }
  try {
    // determine and return if any avatar URI stored as a text record
    var URI = await resolver.getText('avatar');
  } catch (e) {
    throw new TextRecordNotFound('There is no avatar set under given address');
  }
  return await resolveURI(URI);
}

// dummy check
async function resolveURI(uri: string): Promise<any> {
  let response;
  if (uri.startsWith('ipfs://')) {
    response = await fetch(uri.replace('ipfs://', 'https://ipfs.io/ipfs/'));
  }
  if (uri.startsWith('http')) {
    response = await fetch(uri);
  }
  if (uri.startsWith('eip155')) {
    const { chainID, contractAddress, namespace, tokenID } = parseNFT(uri);
    const _provider = new ethers.providers.InfuraProvider(
      Number(chainID),
      INFURA_API_KEY
    );
    const tokenURI = await retrieveTokenURI(
      _provider,
      namespace,
      contractAddress,
      tokenID
    );
    assert(tokenURI, 'TokenURI is empty');

    const _tokenID = !tokenID.startsWith('0x')
      ? ethers.utils.hexValue(ethers.BigNumber.from(tokenID))
      : tokenID;

    const metadata = await (
      await fetch(tokenURI.replace('0x{id}', _tokenID))
    ).json();

    return await resolveURI(metadata.image);
  }

  assert(response, 'Response is empty');
  const data = await response?.buffer();
  const mimeType = response?.headers.get('Content-Type');
  return [data, mimeType];
}

function parseNFT(uri: string, seperator: string = '/') {
  assert(uri, 'parameter URI cannot be empty');
  uri = uri.replace('did:nft:', '');

  const [reference, asset_namespace, tokenID] = uri.split(seperator);
  const [type, chainID] = reference.split(':');
  const [namespace, contractAddress] = asset_namespace.split(':');

  assert(chainID, 'chainID is empty');
  assert(contractAddress, 'contractAddress is empty');
  assert(namespace, 'namespace is empty');
  assert(tokenID, 'tokenID is empty');

  return {
    type,
    chainID,
    namespace,
    contractAddress,
    tokenID,
  };
}

async function retrieveTokenURI(
  provider: any,
  namespace: string,
  contractAddress: string,
  tokenID: string
) {
  let result;
  switch (namespace) {
    case 'erc712': {
      const contract_721 = new ethers.Contract(
        contractAddress,
        [
          'function tokenURI(uint256 tokenId) external view returns (string memory)',
        ],
        provider
      );
      try {
        result = await contract_721.tokenURI(tokenID);
      } catch (error) {
        throw new RetrieveURIFailed(error.message);
      }
      break;
    }
    case 'erc1155': {
      const contract_1155 = new ethers.Contract(
        contractAddress,
        ['function uri(uint256 _id) public view returns (string memory)'],
        provider
      );
      try {
        result = await contract_1155.uri(tokenID);
      } catch (error) {
        throw new RetrieveURIFailed(error.message);
      }
      break;
    }
    default:
      throw new UnsupportedNamespace(`Unsupported namespace: ${namespace}`);
  }
  return result;
}
