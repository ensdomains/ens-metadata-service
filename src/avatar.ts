import { assert } from 'console';
import { ethers } from 'ethers';
import { fromBuffer as fileTypeFromBuffer } from 'file-type';
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

export interface UnsupportedNetwork {}
export class UnsupportedNetwork extends BaseError {}

export interface UnsupportedNamespace {}
export class UnsupportedNamespace extends BaseError {}


export async function getAvatar(name: string): Promise<any> {
  let resolver;
  try {
    // retrieve resolver by ens name
    resolver = await provider.getResolver(name);
  } catch (e) {
    throw new ResolverNotFound('There is no resolver set under given address');
  }

  try {
    // determine and return if any avatar URI stored as a text record
    const URI = await resolver.getText('avatar');
    const bufferWithMime = await resolveURI(URI);
    return bufferWithMime;
  } catch (e) {
    throw new TextRecordNotFound('There is no avatar set under given address');
  }
}

// dummy check
async function resolveURI(uri: string): Promise<any> {
    console.log('uri', uri);
  let response;
  if (uri.startsWith('ipfs://')) {
    response = await fetch(
      `https://ipfs.io/ipfs/${uri.replace('ipfs://', '')}`
    );
  }
  if (uri.startsWith('http')) {
    response = await fetch(uri);
  }
  if (uri.startsWith('eip155')) {
    const { chainID, contractAddress, namespace, tokenID } = parseNFT(uri);
    const _provider = setupJsonRpcProvider(chainID);
    const tokenURI = await retrieveTokenURI(
      _provider,
      namespace,
      contractAddress,
      tokenID
    );
    assert(tokenURI, 'TokenURI is empty');

    const metadata = await (
      await fetch(tokenURI.replace('0x{id}', tokenID))
    ).json();

    const _response = await resolveURI(metadata.image);
    return _response;
  }

  assert(response, 'Response is empty');
  const data = await response?.buffer();
  const mimeType = await fileTypeFromBuffer(data as Buffer);
  return [data, mimeType];
}

function parseNFT(uri: string) {
  // dummy parser, to do add error cases
  const [reference, asset_namespace, tokenID] = uri.split('/');
  const [type, chainID] = reference.split(':');
  const [namespace, contractAddress] = asset_namespace.split(':');

  return {
    type,
    chainID,
    namespace,
    contractAddress,
    tokenID,
  };
}

function setupJsonRpcProvider(chainID: string) {
  let INFURA_URL_TEMPLATE = `https://{chain}.infura.io/v3/${INFURA_API_KEY}`;
  switch (chainID) {
    case '1':
      INFURA_URL_TEMPLATE = INFURA_URL_TEMPLATE.replace('{chain}', 'mainnet');
      break;
    case '4':
      INFURA_URL_TEMPLATE = INFURA_URL_TEMPLATE.replace('{chain}', 'rinkeby');
      break;
    default:
      throw new UnsupportedNetwork('Unsupported network');
  }
  return new ethers.providers.JsonRpcProvider(INFURA_URL_TEMPLATE);
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
       // todo throw error if anything fails
      result = await contract_721.tokenURI(tokenID);
      break;
    }
    case 'erc1155': {
      const contract_1155 = new ethers.Contract(
        contractAddress,
        ['function uri(uint256 _id) public view returns (string memory)'],
        provider
      );
      // todo throw error if anything fails
      result = await contract_1155.uri(tokenID);
      break;
    }
    default:
      throw new UnsupportedNamespace(`Unsupported namespace: ${namespace}`);
  }
  return result;
}
