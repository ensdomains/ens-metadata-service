export enum Version {
  v1,
  v1w,
  v2,
}

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

export interface NFTURIParsingError {}
export class NFTURIParsingError extends BaseError {}

export interface ContractMismatchError {}
export class ContractMismatchError extends BaseError {}

export interface OwnerNotFoundError {}
export class OwnerNotFoundError extends BaseError {}

export interface UnsupportedNetwork {}
export class UnsupportedNetwork extends BaseError {}
