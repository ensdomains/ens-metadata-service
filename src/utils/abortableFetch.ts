import fetch           from 'node-fetch';
import { AbortSignal } from 'node-fetch/externals';
import timeoutSignal   from 'timeout-signal';

const ssrfFilter = require('ssrf-req-filter');

interface AbortableFetchOpts {
  timeout?: number;
}

export async function abortableFetch(
  url: string,
  options: AbortableFetchOpts = {}
) {
  const signal = options?.timeout && timeoutSignal(options?.timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: signal as AbortSignal,
      agent: ssrfFilter(url, { stopPortScanningByUrlRedirection: true })
    });
    return response;
  } catch (error) {
    // in case the fetch error will be customized for signal, follow the pattern
    // if (signal && signal.aborted) {
    //   console.log(`abortableFetch:`, error);
    // }
    return null;
  }
}
