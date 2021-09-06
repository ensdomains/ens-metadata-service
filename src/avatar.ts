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


export async function getAvatarMeta(name: string): Promise<any> {
  const uri = await getAvatarURI(name)
  const owner = await provider.resolveName(name);
  let response
  if(uri.match(/^eip155/)){
    response = await parseNFT(uri, owner)
  }else{
    response = { image:uri }
  }

  if(response.image){
    response.image = await parseURI(response.image)
  }
  return response
}


export async function getAvatarImage(name: string): Promise<any> {
  const uri = await getAvatarURI(name)

  let image
  if(uri.match(/^eip155/)){
    ({meta:{image}} = await parseNFT(uri))
  }else{
    image = uri
  }
  const parsed = await parseURI(image)

  const response = await fetch(parsed);
  assert(response, 'Response is empty');
  const data = await response?.buffer();
  const mimeType = response?.headers.get('Content-Type');
  return [data, mimeType];
}

export async function getAvatarURI(name: string): Promise<any> {
  try {
    // retrieve resolver by ens name
    var resolver = await provider.getResolver(name);
  } catch (e) {
    throw new ResolverNotFound('There is no resolver set under given address');
  }
  try {
    // determine and return if any avatar URI stored as a text record
    var URI = await resolver.getText('avatar');
    assert(URI, 'URI is empty')
  } catch (e) {
    throw new TextRecordNotFound('There is no avatar set under given address');
  }
  return URI
}

// dummy check
async function parseURI(uri: string): Promise<any> {
  let response;
  if (uri.startsWith('ipfs://')) {
    return uri.replace('ipfs://', 'https://ipfs.io/ipfs/')
  } else {
    return uri;
  }
}

async function parseNFT(uri: string, owner?:string, seperator: string = '/') {
  assert(uri, 'parameter URI cannot be empty');
  uri = uri.replace('did:nft:', '');

  const [reference, asset_namespace, tokenID] = uri.split(seperator);
  const [type, chainID] = reference.split(':');
  const [namespace, contractAddress] = asset_namespace.split(':');

  assert(chainID, 'chainID is empty');
  assert(contractAddress, 'contractAddress is empty');
  assert(namespace, 'namespace is empty');
  assert(tokenID, 'tokenID is empty');

  const _provider = new ethers.providers.InfuraProvider(
    Number(chainID),
    INFURA_API_KEY
  );
  const { tokenURI, isOwner} = await retrieveTokenURI(
    _provider,
    namespace,
    contractAddress,
    tokenID,
    owner
  );
  assert(tokenURI, 'TokenURI is empty');

  const _tokenID = !tokenID.startsWith('0x')
    ? ethers.utils.hexValue(ethers.BigNumber.from(tokenID))
    : tokenID;

  const meta = await (
    await fetch(tokenURI.replace('0x{id}', _tokenID))
  ).json();

  let referenceUrl;
  switch(parseInt(chainID)) {
    case 1:
      referenceUrl = `https://opensea.io/assets/${contractAddress}/${tokenID}`;
      break;
    case 42:
      referenceUrl = `https://testnets.opensea.io/assets/${contractAddress}/${tokenID}`;
      break;
    case 137:
      referenceUrl = `https://opensea.io/assets/matic/${contractAddress}/${tokenID}`;
      break;
      default:
  }

  return {
    chainID,
    namespace,
    contractAddress,
    tokenID,
    referenceUrl,
    image: meta.image,
    isOwner,
    meta
  }
}

async function retrieveTokenURI(
  provider: any,
  namespace: string,
  contractAddress: string,
  tokenID: string,
  owner?: string
) {
  let tokenURI
  let isOwner = false
  switch (namespace) {
    case 'erc721': {
      const contract_721 = new ethers.Contract(
        contractAddress,
        [
          'function tokenURI(uint256 tokenId) external view returns (string memory)',
          'function ownerOf(uint256 tokenId) public view returns (address)'
        ],
        provider
      );
      try {
        tokenURI = await contract_721.tokenURI(tokenID);
        if(owner){
          isOwner = (await contract_721.ownerOf(tokenID)) === owner;
        }
      } catch (error) {
        throw new RetrieveURIFailed(error.message);
      }
      break;
    }
    case 'erc1155': {
      const contract_1155 = new ethers.Contract(
        contractAddress,
        [
          'function uri(uint256 _id) public view returns (string memory)',
          'function balanceOf(address account, uint256 id) public view returns (uint256)'
        ],
        provider
      );
      try {
        tokenURI = await contract_1155.uri(tokenID);
        if(owner){
          isOwner = (await contract_1155.balanceOf(owner, tokenID)).gt(0);
        }
      } catch (error) {
        throw new RetrieveURIFailed(error.message);
      }
      break;
    }
    default:
      throw new UnsupportedNamespace(`Unsupported namespace: ${namespace}`);
  }
  return { tokenURI, isOwner };
}
