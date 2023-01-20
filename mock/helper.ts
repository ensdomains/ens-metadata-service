import nock from 'nock';
import {
    EthCallResponse,
    EthChainIdResponse,
    NetVersionResponse,
  } from '../mock/interface';

export function nockProvider(
    WEB3_URL: URL,
    method: string,
    params: any[],
    response: EthCallResponse | EthChainIdResponse | NetVersionResponse
  ) {
    nock(WEB3_URL.origin)
      .persist()
      .post(WEB3_URL.pathname, {
        method,
        params,
        id: /[0-9]/,
        jsonrpc: '2.0',
      })
      .reply(200, response);
  }
  
  export function requireUncached(module: string) {
    delete require.cache[require.resolve(module)];
    return require(module);
  }