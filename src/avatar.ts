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

interface HostMeta {
  chainID?: number;
  namespace?: string;
  contractAddress?: string;
  tokenID?: string;
  referenceUrl?: string;
}

export interface AvatarMetadata {
  uri: string,
  animation: string;
  animation_details: {};
  attributes: any[];
  created_by: string;
  event: string;
  image_url: string;
  image_details: string;
  name: string;
  description?: string;
  external_link?: string;
  image?: string;
  animation_url?: string;
  hostType: string;
  hostMeta: HostMeta;
  isOwned: boolean;
}

export class AvatarMetadata {
  constructor(uri: string) {
    this.uri = uri;
  }

  _setHostMeta(meta: HostMeta) {
    switch (meta.chainID) {
      case 1:
        meta[
          'referenceUrl'
        ] = `https://opensea.io/assets/${meta.contractAddress}/${meta.tokenID}`;
        break;
      case 42:
        meta[
          'referenceUrl'
        ] = `https://testnets.opensea.io/assets/${meta.contractAddress}/${meta.tokenID}`;
        break;
      case 137:
        meta[
          'referenceUrl'
        ] = `https://opensea.io/assets/matic/${meta.contractAddress}/${meta.tokenID}`;
        break;
      default:
    }
    this.hostMeta = meta;
  }

  async _retrieveTokenURI(
    provider: any,
    namespace: string,
    contractAddress: string,
    tokenID: string,
    owner?: string
  ) {
    let tokenURI;
    let isOwner = false;
    switch (namespace) {
      case 'erc721': {
        const contract_721 = new ethers.Contract(
          contractAddress,
          [
            'function tokenURI(uint256 tokenId) external view returns (string memory)',
            'function ownerOf(uint256 tokenId) public view returns (address)',
          ],
          provider
        );
        try {
          tokenURI = await contract_721.tokenURI(tokenID);
          if (owner) {
            isOwner = (await contract_721.ownerOf(tokenID)) === owner;
          }
        } catch (error: any) {
          throw new RetrieveURIFailed(error.message);
        }
        break;
      }
      case 'erc1155': {
        const contract_1155 = new ethers.Contract(
          contractAddress,
          [
            'function uri(uint256 _id) public view returns (string memory)',
            'function balanceOf(address account, uint256 id) public view returns (uint256)',
          ],
          provider
        );
        try {
          tokenURI = await contract_1155.uri(tokenID);
          if (owner) {
            isOwner = (await contract_1155.balanceOf(owner, tokenID)).gt(0);
          }
        } catch (error: any) {
          throw new RetrieveURIFailed(error.message);
        }
        break;
      }
      default:
        throw new UnsupportedNamespace(`Unsupported namespace: ${namespace}`);
    }
    this.isOwned = isOwner;
    return tokenURI;
  }

  async _retrieveMetadata({
    chainID,
    tokenID,
    contractAddress,
    namespace
  }: HostMeta) {
    const owner = await provider.resolveName(this.uri);
    const _provider = new ethers.providers.InfuraProvider(
      chainID,
      INFURA_API_KEY
    );

    const tokenURI = await this._retrieveTokenURI(
      _provider,
      namespace as string,
      contractAddress as string,
      tokenID as string,
      owner
    );
    assert(tokenURI, 'TokenURI is empty');

    const _tokenID = !tokenID?.startsWith('0x')
      ? ethers.utils.hexValue(ethers.BigNumber.from(tokenID))
      : tokenID;

    const meta = await (
      await fetch(tokenURI.replace('0x{id}', _tokenID))
    ).json();

    const {
      animation,
      animation_details,
      animation_url,
      attributes,
      created_by,
      description,
      event,
      external_link,
      image,
      image_url,
      image_details,
      name,
    } = meta;

    this.animation = animation;
    this.animation_details = animation_details;
    this.animation_url = animation_url;
    this.attributes = attributes;
    this.created_by = created_by;
    this.description = description;
    this.event = event;
    this.external_link = external_link;
    this.image = image;
    this.image_url = image_url;
    this.image_details = image_details;
    this.name = name;
    this.description = description;
    this.external_link = external_link;
    this.image = image;
    this.animation_url = animation_url;
  }

  async getImage() {
    const uri = await AvatarMetadata.getAvatarURI(this.uri);
    if (uri.match(/^eip155/)) {
      const spec = AvatarMetadata.parseNFT(uri);
      await this._retrieveMetadata(spec);
    }
    if (!this.image) {
      this.image = uri;
    }
    assert(this.image, 'Image is not available');
    const parsed = AvatarMetadata.parseURI(this.image);
    const response = await fetch(parsed);
    assert(response, 'Response is empty');
    const data = await response?.buffer();
    const mimeType = response?.headers.get('Content-Type');
    return [data, mimeType];
  }

  async getMeta() {
    const uri = await AvatarMetadata.getAvatarURI(this.uri);
    if (uri.match(/^eip155/)) {
      const spec = AvatarMetadata.parseNFT(uri);
      this._setHostMeta(spec);
      await this._retrieveMetadata(spec);
    }
    if (!this.image) {
      this.image = uri;
    }
    await AvatarMetadata.parseURI(this.image as string);
    return this;
  }

  static async getAvatarURI(uri: string): Promise<any> {
    try {
      // retrieve resolver by ens name
      var resolver = await provider.getResolver(uri);
    } catch (e) {
      throw new ResolverNotFound(
        'There is no resolver set under given address'
      );
    }
    try {
      // determine and return if any avatar URI stored as a text record
      var URI = await resolver.getText('avatar');
      assert(URI, 'URI is empty');
    } catch (e) {
      throw new TextRecordNotFound(
        'There is no avatar set under given address'
      );
    }
    return URI;
  }

  static parseURI(uri: string): string {
    if (uri.startsWith('ipfs://')) {
      return uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
    } else {
      return uri;
    }
  }

  static parseNFT(uri: string, seperator: string = '/') {
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
      chainID: Number(chainID),
      namespace,
      contractAddress,
      tokenID,
    };
  }
}

export async function getAvatarMeta(name: string): Promise<any> {
  const avatar = new AvatarMetadata(name);
  return await avatar.getMeta();
}

export async function getAvatarImage(name: string): Promise<any> {
  const avatar = new AvatarMetadata(name);
  return await avatar.getImage();
}
