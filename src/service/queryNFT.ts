import http  from 'http';
import https from 'https';

import { utils, specs, UnsupportedNamespace } from '@ensdomains/ens-avatar';
import getNetwork, { NetworkName }            from '../service/network';
import { UnsupportedNetwork }                 from '../base';

const { requestFilterHandler } = require('ssrf-req-filter');

const networks: { [key: string]: string } = {
  '1': 'mainnet',
  '3': 'ropsten',
  '4': 'rinkeby',
  '5': 'goerli',
  '11155111': 'sepolia'
};

export async function queryNFT(uri: string) {
  const { chainID, namespace, contractAddress, tokenID } = utils.parseNFT(
    uri as string
  );
  const Spec = specs[namespace];
  if (!Spec)
    throw new UnsupportedNamespace(`Unsupported namespace: ${namespace}`);
  const spec = new Spec();
  // add meta information of the avatar record
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
  // retrieve metadata, omit "is_owner" field
  const { is_owner, ...metadata } = await spec.getMetadata(
    provider,
    undefined,
    contractAddress,
    tokenID,
    {
      agents: {
        httpAgent: requestFilterHandler(new http.Agent()),
        httpsAgent: requestFilterHandler(new https.Agent())
      }
    }
  );
  return { host_meta, ...metadata };
}
