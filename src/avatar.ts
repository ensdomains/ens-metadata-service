import { fromBuffer as fileTypeFromBuffer } from 'file-type';
import fetch from 'node-fetch';
import { provider } from './config';

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
    console.log('e', e);
    throw new ResolverNotFound('There is no avatar set under given address');
  }
}

// dummy check
async function resolveURI(uri: string): Promise<any> {
  let response;
  if (uri.startsWith('ipfs://')) {
    response = await fetch(
      `https://ipfs.io/ipfs/${uri.replace('ipfs://', '')}`
    );
  }
  if (uri.startsWith('http')) {
    response = await fetch(uri);
  }
  if (response) {
    const data = await response.buffer();
    const mimeType = await fileTypeFromBuffer(data);
    return [data, mimeType];
  }
}
