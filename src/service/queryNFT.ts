import { utils, specs, UnsupportedNamespace } from '@ensdomains/ens-avatar';
import getNetwork from '../service/network';
import { UnsupportedNetwork } from '../base';

const networks: { [key: string]: string } = {
  '1': 'mainnet',
  '3': 'ropsten',
  '4': 'rinkeby',
  '5': 'goerli',
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
  const { provider } = getNetwork(networkName);
  // retrieve metadata, omit "is_owner" field
  const { is_owner, ...metadata } = await spec.getMetadata(
    provider,
    undefined,
    contractAddress,
    tokenID
  );
  return { host_meta, ...metadata };
}
