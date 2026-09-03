import http  from 'http';
import https from 'https';

import { utils } from '@ensdomains/ens-avatar';

import {
  NFT_METADATA_MAX_CONTENT_LENGTH,
  QUERY_NFT_TIMEOUT,
  SELF_HOST_DENYLIST,
}                                        from '../config';
import { INTERNAL_HEADER }               from './blockRecursiveCalls';

const { requestFilterHandler } = require('ssrf-req-filter');

// Harden the request agent so that, on top of the ssrf-req-filter IP checks:
//  - self-referential connections (to this service's own hosts) are refused at
//    the socket level, and
//  - every outbound request is tagged with INTERNAL_HEADER, so blockRecursiveCalls
//    rejects any request that loops back into this service.
function createGuardedAgent(agent: any): any {
  const { createConnection } = agent;
  agent.createConnection = function (this: any, options: any, callback: any) {
    const host = options.host || options.hostname;
    if (host && SELF_HOST_DENYLIST.includes(host)) {
      throw new Error(`Self-referential request to ${host} is blocked`);
    }
    return createConnection.call(this, options, callback);
  };

  const { addRequest } = agent;
  agent.addRequest = function (this: any, req: any, ...args: any[]) {
    req.setHeader(INTERNAL_HEADER, '1');
    return addRequest.call(this, req, ...args);
  };

  return agent;
}

// SSRF-filtered + self-host-guarded agents, created ONCE for the process lifetime.
export const guardedHttpAgent  = createGuardedAgent(requestFilterHandler(new http.Agent()));
export const guardedHttpsAgent = createGuardedAgent(requestFilterHandler(new https.Agent()));

// @ensdomains/ens-avatar routes ALL of its metadata / image-URI HTTP requests
// through a single module-level shared axios instance (`utils.fetch`). We harden
// that shared instance exactly once, here, at module load — callers must NOT pass
// per-request `agents`/`maxContentLength` themselves:
//
//  - Agents: register ONE request interceptor that applies our guarded agents to
//    every outbound request. If callers pass `agents`, the library appends a fresh
//    interceptor on every AvatarResolver construction and every spec.getMetadata
//    call, with no eject/dedup — growing the interceptor chain unboundedly per
//    request (a slow memory/CPU leak). Registering our own single interceptor and
//    dropping the caller-supplied `agents` keeps the chain length at 1.
//  - Size cap: the shared axios has no maxContentLength by default (-1). An
//    attacker who controls a tokenURI/metadata endpoint could return a small
//    gzip-compressed body that expands to hundreds of MB; axios would decompress
//    and buffer it until the worker OOMs. axios enforces maxContentLength against
//    the DECOMPRESSED stream, aborting mid-body before the bomb is fully buffered.
//  - Timeout: bound the wall-clock of each metadata fetch at the socket level
//    (Promise.race in queryNFT does not abort the underlying socket/zlib stream).
let hardened = false;
export function hardenEnsAvatarFetch(): void {
  if (hardened) return;
  hardened = true;

  const fetch: any = utils.fetch;
  fetch.interceptors.request.use((config: any) => {
    config.httpAgent = guardedHttpAgent;
    config.httpsAgent = guardedHttpsAgent;
    return config;
  });
  fetch.defaults.maxContentLength = NFT_METADATA_MAX_CONTENT_LENGTH;
  fetch.defaults.maxBodyLength = NFT_METADATA_MAX_CONTENT_LENGTH;
  fetch.defaults.timeout = QUERY_NFT_TIMEOUT;

  // Reject top-level-array metadata BEFORE ens-avatar's getMetadata spreads it
  // (`{ ...metadata, is_owner }`). A JSON array from an attacker-controlled tokenURI
  // would otherwise be spread into millions of enumerable index properties, freezing
  // the event loop and exhausting memory. Image fetches return a Buffer/ArrayBuffer
  // (never an Array), so they are unaffected. Object-with-many-keys and our own
  // re-spread/serialization are additionally bounded by assertPlainMetadata.
  fetch.interceptors.response.use((response: any) => {
    if (Array.isArray(response?.data)) {
      throw new Error('NFT metadata must be a JSON object, not an array');
    }
    return response;
  });
}

hardenEnsAvatarFetch();
