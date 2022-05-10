import { AvatarResolver }   from '@ensdomains/ens-avatar';
import { BaseProvider }     from '@ethersproject/providers';
import { strict as assert } from 'assert';
import { JSDOM }            from 'jsdom';
import fetch                from 'node-fetch';
import {
  ResolverNotFound,
  RetrieveURIFailed,
  TextRecordNotFound,
}                           from '../base';
import { IPFS_GATEWAY }     from '../config';

const window = new JSDOM('').window;

interface HostMeta {
  chain_id?        : number;
  namespace?       : string;
  contract_address?: string;
  token_id?        : string;
  reference_url?   : string;
}

export interface AvatarMetadata {
  uri              : string;
  animation        : string;
  animation_details: {};
  attributes       : any[];
  created_by       : string;
  event            : string;
  image_data       : string;
  image_url        : string;
  image_details    : string;
  name             : string;
  description?     : string;
  external_link?   : string;
  image?           : string;
  animation_url?   : string;
  hostType         : string;
  host_meta        : HostMeta;
  is_owner         : boolean;
}

export class AvatarMetadata {
  defaultProvider: any;
  avtResolver: AvatarResolver;
  constructor(provider: any, uri: string) {
    this.defaultProvider = provider;
    this.avtResolver = new AvatarResolver(provider, { ipfs: IPFS_GATEWAY });
    this.uri = uri;
  }

  async getImage() {
    let avatarURI;
    try {
      avatarURI = await this.avtResolver.getAvatar(this.uri, {
        jsdomWindow: window,
      });
    } catch (error: any) {
      if (error instanceof Error) {
        console.log(`${this.uri} - error:`, error.message);
      }
      if (typeof error === 'string') {
        console.log(`${this.uri} - error:`, error);
      }
      if (error === 'Image is not available') {
        throw new RetrieveURIFailed(error, 404);
      }
    }

    if (!avatarURI) {
      throw new TextRecordNotFound(
        'There is no avatar set under given address',
        404
      );
    }

    if (avatarURI?.startsWith('http')) {
      const response = await fetch(avatarURI);

      assert(response, 'Response is empty');

      const mimeType = response?.headers.get('Content-Type');
      const data = await response?.buffer();
      return [data, mimeType];
    }

    if (avatarURI?.startsWith('data:')) {
      // base64 image
      const mimeType = avatarURI.match(/[^:]\w+\/[\w-+\d.]+(?=;|,)/);
      const base64data = avatarURI.split('base64,')[1];

      assert(base64data, 'base64 format is incorrect: empty data');
      assert(mimeType, 'base64 format is incorrect: no mimetype');

      const data = Buffer.from(base64data, 'base64');
      return [data, mimeType[0]];
    }

    throw new RetrieveURIFailed(
      'Unknown type/protocol given for the image source.',
      400
    );
  }

  async getMeta(networkName: string) {
    let metadata: any;
    try {
      metadata = await this.avtResolver.getMetadata(this.uri);
    } catch (error: any) {
      if (error instanceof Error) {
        console.log(`${this.uri} - error:`, error.message);
      }
      if (typeof error === 'string') {
        console.log(`${this.uri} - error:`, error);
      }
      throw new ResolverNotFound(
        'There is no resolver set under given address',
        404
      );
    }

    if (!metadata) {
      throw new TextRecordNotFound(
        'There is no avatar set under given address',
        404
      );
    }

    if (!metadata.image) {
      if (metadata.image_url) {
        metadata.image = metadata.image_url;
      } else if (metadata.image_data) {
        metadata.image = `https://metadata.ens.domains/${networkName}/avatar/${this.uri}`;
      } else {
        throw new TextRecordNotFound(
          'There is no avatar set under given address',
          404
        );
      }
    }
    return metadata;
  }
}

export async function getAvatarMeta(
  provider: BaseProvider,
  name: string,
  networkName: string
): Promise<any> {
  const avatar = new AvatarMetadata(provider, name);
  return await avatar.getMeta(networkName);
}

export async function getAvatarImage(
  provider: BaseProvider,
  name: string
): Promise<any> {
  const avatar = new AvatarMetadata(provider, name);
  return await avatar.getImage();
}
