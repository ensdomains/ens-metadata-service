import http  from 'http';
import https from 'https';

import { utils, specs, UnsupportedNamespace } from '@ensdomains/ens-avatar';
import getNetwork, { NetworkName }            from '../service/network';
import { UnsupportedNetwork }                 from '../base';
import { QUERY_NFT_TIMEOUT, SELF_HOST_DENYLIST } from '../config';
import { INTERNAL_HEADER }                    from '../utils/blockRecursiveCalls';

const { requestFilterHandler } = require('ssrf-req-filter');

const networks: { [key: string]: string } = {
  '1': 'mainnet',
  '3': 'ropsten',
  '4': 'rinkeby',
  '5': 'goerli',
  '11155111': 'sepolia'
};

function createGuardedAgent(agent: any): any {
  // Layer 1: Block self-host connections at the socket level
  const { createConnection } = agent;
  agent.createConnection = function (this: any, options: any, callback: any) {
    const host = options.host || options.hostname;
    if (host && SELF_HOST_DENYLIST.includes(host)) {
      throw new Error(`Self-referential request to ${host} is blocked`);
    }
    return createConnection.call(this, options, callback);
  };

  // Layer 2: Tag outbound requests so blockRecursiveCalls can detect them
  const { addRequest } = agent;
  agent.addRequest = function (this: any, req: any, ...args: any[]) {
    req.setHeader(INTERNAL_HEADER, '1');
    return addRequest.call(this, req, ...args);
  };

  return agent;
}

export async function queryNFT(uri: string) {
  const { chainID, namespace, contractAddress, tokenID } = utils.parseNFT(
    uri as string
  );
  const Spec = specs[namespace];
  if (!Spec)
    throw new UnsupportedNamespace(`Unsupported namespace: ${namespace}`);
  const spec = new Spec();
  const host_meta = {
    chain_id: chainID,
    namespace,
    contract_address: contractAddress,
    token_id: tokenID,
    reference_url: `https://opensea.io/assets/${contractAddress}/${tokenID}`,
  };
  const networkName = networks[chainID.toString()];
  if (!networkName)
    throw new UnsupportedNetwork(
      `chainID ${chainID.toString()} is unsupported`,
      501
    );
  const { provider } = getNetwork(networkName as NetworkName);

  const httpAgent = createGuardedAgent(requestFilterHandler(new http.Agent()));
  const httpsAgent = createGuardedAgent(requestFilterHandler(new https.Agent()));

  // Layer 3: Bound total wall-clock time for the metadata resolution
  let timer: ReturnType<typeof setTimeout>;
  try {
    const { is_owner, ...metadata } = await Promise.race([
      spec.getMetadata(
        provider,
        undefined,
        contractAddress,
        tokenID,
        { agents: { httpAgent, httpsAgent } }
      ),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('queryNFT metadata resolution timed out')),
          QUERY_NFT_TIMEOUT
        );
      }),
    ]);
    return { host_meta, ...metadata };
  } finally {
    clearTimeout(timer!);
  }
}
