import { AvatarResolver }   from '@ensdomains/ens-avatar';
import { strict as assert } from 'assert';
import { ethers, JsonRpcProvider } from 'ethers';
import createDOMPurify      from 'dompurify';
import { JSDOM }            from 'jsdom';
import {
  ResolverNotFound,
  RetrieveURIFailed,
  TextRecordNotFound,
}                           from '../base';
import { 
  IPFS_GATEWAY, 
  OPENSEA_API_KEY 
}                           from '../config';
import { abortableFetch }   from '../utils/abortableFetch';

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
  defaultProvider: JsonRpcProvider;
  avtResolver: AvatarResolver;
  constructor(provider: JsonRpcProvider, uri: string) {
    this.defaultProvider = provider;
    this.avtResolver = new AvatarResolver(provider, 
      {
        ipfs: IPFS_GATEWAY, 
        apiKey: { opensea: OPENSEA_API_KEY },
        urlDenyList: [ 'metadata.ens.domains' ]
      }
    );
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
      throw new RetrieveURIFailed(`Error fetching avatar: Provided url or NFT source is broken.`, 404);
    }

    if (!avatarURI) {
      throw new TextRecordNotFound(
        'There is no avatar set under given address',
        404
      );
    }

    if (avatarURI?.startsWith('http')) {
      // abort fetching image after 5sec
      const response = await abortableFetch(avatarURI, { timeout: 7000 });

      assert(!!response, 'Response is empty');

      const mimeType = response?.headers.get('Content-Type');
      const data = await response?.buffer();

      if (mimeType?.includes('svg')) {
        const DOMPurify = createDOMPurify(window);
        const cleanData = DOMPurify.sanitize(data.toString());
        return [Buffer.from(cleanData), mimeType];
      }

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
    // replace back original url after fetch
    metadata.image = metadata.image.replace(IPFS_GATEWAY, 'https://ipfs.io');

    return metadata;
  }
}

export async function getAvatarMeta(
  provider: JsonRpcProvider,
  name: string,
  networkName: string
): Promise<any> {
  const avatar = new AvatarMetadata(provider, name);
  return await avatar.getMeta(networkName);
}

export async function getAvatarImage(
  provider: JsonRpcProvider,
  name: string
): Promise<any> {
  const avatar = new AvatarMetadata(provider, name);
  return await avatar.getImage();
}
