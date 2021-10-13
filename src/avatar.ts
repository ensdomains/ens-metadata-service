import { strict as assert } from 'assert';
import { ethers }           from 'ethers';
import { cid as isCID }     from 'is-ipfs';
import fetch                from 'node-fetch';
import { BaseError }        from './base';
import { INFURA_API_KEY }   from './config';

export interface ResolverNotFound {}
export class ResolverNotFound extends BaseError {}

export interface TextRecordNotFound {}
export class TextRecordNotFound extends BaseError {}

export interface RetrieveURIFailed {}
export class RetrieveURIFailed extends BaseError {}

export interface UnsupportedNamespace {}
export class UnsupportedNamespace extends BaseError {}

interface HostMeta {
  chain_id?: number;
  namespace?: string;
  contract_address?: string;
  token_id?: string;
  reference_url?: string;
}

export interface AvatarMetadata {
  uri: string;
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
  host_meta: HostMeta;
  is_owner: boolean;
}

export class AvatarMetadata {
  defaultProvider: any;
  constructor(provider: any, uri: string) {
    this.defaultProvider = provider;
    this.uri = uri;
  }

  _setHostMeta(meta: HostMeta) {
    const { chain_id, contract_address, token_id } = meta;
    switch (chain_id) {
      case 1:
        meta[
          'reference_url'
        ] = `https://opensea.io/assets/${contract_address}/${token_id}`;
        break;
      case 42:
        meta[
          'reference_url'
        ] = `https://testnets.opensea.io/assets/${contract_address}/${token_id}`;
        break;
      case 137:
        meta[
          'reference_url'
        ] = `https://opensea.io/assets/matic/${contract_address}/${token_id}`;
        break;
      default:
    }
    this.host_meta = meta;
  }

  async _retrieveTokenURI(
    provider: any,
    namespace: string,
    contract_address: string,
    token_id: string,
    owner?: string
  ) {
    let tokenURI;
    let isOwner = false;
    switch (namespace) {
      case 'erc721': {
        const contract_721 = new ethers.Contract(
          contract_address,
          [
            'function tokenURI(uint256 tokenId) external view returns (string memory)',
            'function ownerOf(uint256 tokenId) public view returns (address)',
          ],
          provider
        );
        try {
          const [_tokenURI, _isOwner] = await Promise.all([
            contract_721.tokenURI(token_id),
            () => owner && contract_721.ownerOf(token_id),
          ]);
          tokenURI = _tokenURI;
          isOwner = !!_isOwner;
        } catch (error: any) {
          throw new RetrieveURIFailed(error.message);
        }
        break;
      }
      case 'erc1155': {
        const contract_1155 = new ethers.Contract(
          contract_address,
          [
            'function uri(uint256 _id) public view returns (string memory)',
            'function balanceOf(address account, uint256 id) public view returns (uint256)',
          ],
          provider
        );
        try {
          const [_tokenURI, _isOwner] = await Promise.all([
            contract_1155.uri(token_id),
            () => owner && contract_1155.balanceOf(owner, token_id).gt(0),
          ]);
          tokenURI = _tokenURI;
          isOwner = !!_isOwner;
        } catch (error: any) {
          throw new RetrieveURIFailed(error.message);
        }
        break;
      }
      default:
        throw new UnsupportedNamespace(`Unsupported namespace: ${namespace}`);
    }
    this.is_owner = isOwner;
    assert(tokenURI, 'TokenURI is empty');
    return AvatarMetadata.parseURI(tokenURI);
  }

  async _retrieveMetadata({
    chain_id,
    token_id,
    contract_address,
    namespace,
  }: HostMeta) {
    const owner = await this.defaultProvider.resolveName(this.uri);
    const _provider = new ethers.providers.InfuraProvider(
      chain_id,
      INFURA_API_KEY
    );

    const tokenURI = await this._retrieveTokenURI(
      _provider,
      namespace as string,
      contract_address as string,
      token_id as string,
      owner
    );

    const _tokenID = !token_id?.startsWith('0x')
      ? ethers.utils.hexValue(ethers.BigNumber.from(token_id))
      : token_id;

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

    this.animation         = animation;
    this.animation_details = animation_details;
    this.animation_url     = animation_url;
    this.attributes        = attributes;
    this.created_by        = created_by;
    this.description       = description;
    this.event             = event;
    this.external_link     = external_link;
    this.image             = image;
    this.image_url         = image_url;
    this.image_details     = image_details;
    this.name              = name;
    this.description       = description;
    this.external_link     = external_link;
    this.image             = image;
    this.animation_url     = animation_url;
  }

  async getImage() {
    const uri = await this.getAvatarURI(this.uri);
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
    const uri = await this.getAvatarURI(this.uri);
    if (uri.match(/^eip155/)) {
      const spec = AvatarMetadata.parseNFT(uri);
      this._setHostMeta(spec);
      await this._retrieveMetadata(spec);
    }
    if (!this.image) {
      this.image = uri;
    }
    await AvatarMetadata.parseURI(this.image as string);
    const { defaultProvider, ...rest } = this;
    return rest;
  }

  async getAvatarURI(uri: string): Promise<any> {
    try {
      // retrieve resolver by ens name
      var resolver = await this.defaultProvider.getResolver(uri);
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
    } else if (isCID(uri)) {
      return 'https://ipfs.io/ipfs/' + uri
    } else {
      return uri;
    }
  }

  static parseNFT(uri: string, seperator: string = '/') {
    assert(uri, 'parameter URI cannot be empty');
    uri = uri.replace('did:nft:', '');

    const [reference, asset_namespace, token_id] = uri.split(seperator);
    const [type, chain_id] = reference.split(':');
    const [namespace, contract_address] = asset_namespace.split(':');

    assert(chain_id, 'chainID is empty');
    assert(contract_address, 'contractAddress is empty');
    assert(namespace, 'namespace is empty');
    assert(token_id, 'tokenID is empty');

    return {
      chain_id: Number(chain_id),
      namespace,
      contract_address,
      token_id,
    };
  }
}

export async function getAvatarMeta(provider: any, name: string): Promise<any> {
  const avatar = new AvatarMetadata(provider, name);
  return await avatar.getMeta();
}

export async function getAvatarImage(
  provider: any,
  name: string
): Promise<any> {
  const avatar = new AvatarMetadata(provider, name);
  return await avatar.getImage();
}
