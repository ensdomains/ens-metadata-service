import * as http   from 'http';
import { Version } from '../src/base';

export interface DomainResponse {
  domain: {
    name: string;
    id?: string;
    labelName: string;
    labelhash: string;
    createdAt: string;
    owner: {
      id: string;
    };
    parent: {
      id: string;
    };
    resolver: {
      texts: string[] | null;
    } | null;
    hasImageKey?: boolean | null;
  };
}

export interface RegistrationResponse {
  registrations: {
    expiryDate: string;
    labelName: string;
    registrationDate: string;
  }[];
}

export interface WrappedDomainResponse {
  wrappedDomain: {
    expiryDate: number;
    fuses: number;
  };
}

export interface EthChainIdResponse {
  id: number;
  jsonrpc: string;
  result: string;
}

export interface EthCallResponse {
  result: string;
}

export interface NetVersionResponse {
  id: number;
  jsonrpc: string;
  result: string;
}

export interface TestContext {
  server: http.Server;
  prefixUrl: string;
}

export interface MockEntryBody {
  name: string;
  hasImageKey?: boolean | null;
  image?: string;
  owner?: string;
  parent?: string;
  registration?: boolean;
  resolver?: any;
  statusCode?: number;
  unknown?: boolean;
  registered?: boolean;
  version?: Version;
  persist?: boolean;
}
