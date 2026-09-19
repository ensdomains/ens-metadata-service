import { JsonRpcProvider, PerformActionTransaction } from 'ethers';

import {
  CCIP_READ_MAX_CONTENT_LENGTH,
  CCIP_READ_TIMEOUT,
  SELF_HOST_DENYLIST,
} from '../config';
import { abortableFetch } from './abortableFetch';
import { INTERNAL_HEADER } from './blockRecursiveCalls';
import { canonicalHost } from './canonicalHost';

// Pre-canonicalized self-host denylist so the trailing-dot FQDN form is also blocked.
const SELF_HOST_DENYLIST_CANONICAL = SELF_HOST_DENYLIST.map(canonicalHost);

// Guards the CCIP-read (ERC-3668) fetch of a provider instance:
// OffchainLookup gateway URLs are resolver-controlled, so they are fetched
// through the SSRF-filtered, size-capped, time-boxed abortableFetch instead
// of ethers' unfiltered FetchRequest (which has a 5min default timeout and
// no response size limit).
export function guardCcipRead(provider: JsonRpcProvider): JsonRpcProvider {
  provider.ccipReadFetch = async function (
    this: JsonRpcProvider,
    tx: PerformActionTransaction,
    calldata: string,
    urls: Array<string>
  ): Promise<null | string> {
    if (this.disableCcipRead || urls.length === 0 || tx.to == null) {
      return null;
    }
    const sender = tx.to.toLowerCase();
    const data = calldata.toLowerCase();

    for (const url of urls) {
      const href = url.replace('{sender}', sender).replace('{data}', data);

      let parsed: URL;
      try {
        parsed = new URL(href);
      } catch {
        continue;
      }
      if (!['http:', 'https:'].includes(parsed.protocol)) continue;
      if (SELF_HOST_DENYLIST_CANONICAL.includes(canonicalHost(parsed.hostname))) continue;

      const isGet = url.indexOf('{data}') !== -1;
      const response = await abortableFetch(href, {
        method: isGet ? 'GET' : 'POST',
        timeout: CCIP_READ_TIMEOUT,
        size: CCIP_READ_MAX_CONTENT_LENGTH,
        headers: {
          'content-type': 'application/json',
          'user-agent': 'ENS-MetadataService/1.0.0',
          [INTERNAL_HEADER]: '1',
        },
        ...(isGet ? {} : { body: JSON.stringify({ data, sender }) }),
      });
      if (!response) continue;
      // 4xx indicates the result is not present; stop
      if (response.status >= 400 && response.status < 500) return null;
      // 5xx indicates server issue; try the next url
      if (response.status >= 500) continue;

      try {
        const result = await response.json();
        if (result?.data && /^0x[0-9a-fA-F]*$/.test(result.data)) {
          return result.data;
        }
      } catch {
        continue;
      }
    }
    return null;
  };
  return provider;
}
