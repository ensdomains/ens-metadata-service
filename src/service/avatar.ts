import http                              from 'http';
import https                             from 'https';

import {
  AvatarResolver,
  UnsupportedMediaKey,
  utils
}                                        from '@ensdomains/ens-avatar';
import { strict as assert }              from 'assert';
import { JsonRpcProvider }               from 'ethers';
import createDOMPurify                   from 'dompurify';
import { JSDOM }                         from 'jsdom';
import {
  ResolverNotFound,
  RetrieveURIFailed,
  TextRecordNotFound,
}                                        from '../base';
import { IPFS_GATEWAY, OPENSEA_API_KEY } from '../config';
import { abortableFetch }                from '../utils/abortableFetch';
import isSvg                             from '../utils/isSvg';

const { requestFilterHandler } = require('ssrf-req-filter');

const window = new JSDOM('').window;
const { ALLOWED_IMAGE_MIMETYPES } = utils;

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
    this.avtResolver = new AvatarResolver(provider, {
      ipfs: IPFS_GATEWAY,
      apiKey: { opensea: OPENSEA_API_KEY },
      urlDenyList: ['metadata.ens.domains'],
      agents: {
        httpAgent: requestFilterHandler(new http.Agent()),
        httpsAgent: requestFilterHandler(new https.Agent()),
      },
    });
    this.uri = uri;
  }

  async getImage(type: "avatar" | "header" = "avatar"): Promise<[Buffer, string]> {
    let avatarURI;
    try {
      if (type === "avatar") {
        avatarURI = await this.avtResolver.getAvatar(this.uri, {
          jsdomWindow: window,
        });
      } else if (type === "header") {
        avatarURI = await this.avtResolver.getHeader(this.uri, {
          jsdomWindow: window
        })
      } else {
        throw new UnsupportedMediaKey();
      }
    } catch (error: any) {
      if (error instanceof Error) {
        console.log(`${this.uri} - error:`, error.message);
      }
      if (typeof error === 'string') {
        console.log(`${this.uri} - error:`, error);
      }
      throw new RetrieveURIFailed(
        `Error fetching avatar: Provided url or NFT source is broken.`,
        404
      );
    }

    if (!avatarURI) {
      throw new TextRecordNotFound(
        'There is no avatar set under given address',
        404
      );
    }

    if (avatarURI?.startsWith('http')) {
      // abort fetching image after 5sec
      const response = await abortableFetch(avatarURI, {
        timeout: 7000,
        headers: {
          'user-agent': 'ENS-ImageFetcher/1.0.0',
        },
      });

      assert(!!response, 'Response is empty');

      const mimeType = response?.headers.get('Content-Type') || '';
      const data = await response?.buffer();

      assert(
        ALLOWED_IMAGE_MIMETYPES.includes(mimeType),
        'Mimetype is not supported'
      );

      if (mimeType?.includes('svg') || isSvg(data.toString())) {
        const DOMPurify = createDOMPurify(window);
        const cleanData = DOMPurify.sanitize(data.toString(), {
          FORBID_TAGS: ['a', 'area', 'base', 'iframe', 'link'],
        });
        return [Buffer.from(cleanData), mimeType];
      }

      return [data, mimeType];
    }

    if (avatarURI?.startsWith('data:')) {
      // base64 image
      const mimeType = avatarURI.match(/[^:]\w+\/[\w-+\d.]+(?=;|,)/);
      const base64data = avatarURI.split('base64,')[1];

      assert(base64data, 'Base64 format is incorrect: Empty data');
      assert(mimeType, 'Base64 format is incorrect: No mimetype');
      assert(
        ALLOWED_IMAGE_MIMETYPES.includes(mimeType[0]),
        'Mimetype is not supported'
      );

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
): Promise<[Buffer, string]> {
  const avatar = new AvatarMetadata(provider, name);
  return await avatar.getImage('avatar');
}

export async function getHeaderImage(
  provider: JsonRpcProvider,
  name: string
): Promise<[Buffer, string]> {
  const avatar = new AvatarMetadata(provider, name);
  return await avatar.getImage('header');
}
