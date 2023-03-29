import fetch         from 'node-fetch';
import timeoutSignal from 'timeout-signal';

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
      signal: signal as any,
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
