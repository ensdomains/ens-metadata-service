import { utils, specs, UnsupportedNamespace } from '@ensdomains/ens-avatar';
import getNetwork, { NetworkName }            from '../service/network';
import { UnsupportedNetwork }                 from '../base';
import { QUERY_NFT_TIMEOUT }                  from '../config';
import { assertPlainMetadata }               from '../utils/assertPlainMetadata';
// Side-effect import: hardens @ensdomains/ens-avatar's shared axios instance
// (single SSRF-guarded agent interceptor + metadata size cap + timeout + a
// response interceptor that rejects top-level-array metadata) once.
import '../utils/ensAvatarFetch';

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

  // SSRF-guarded agents + metadata size cap are applied process-wide to the shared
  // ens-avatar axios via ../utils/ensAvatarFetch; do not pass per-request `agents`
  // here (it would append an un-ejected interceptor to the shared axios per call).
  // Bound total wall-clock time for the metadata resolution.
  let timer: ReturnType<typeof setTimeout>;
  try {
    const result = await Promise.race([
      spec.getMetadata(
        provider,
        undefined,
        contractAddress,
        tokenID
      ),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('queryNFT metadata resolution timed out')),
          QUERY_NFT_TIMEOUT
        );
      }),
    ]);
    // Reject non-plain-object / oversized metadata BEFORE spreading or serializing it,
    // so attacker-controlled tokenURI content cannot blow up the event loop / memory.
    assertPlainMetadata(result);
    const { is_owner, ...metadata } = result;
    // Assign trusted host_meta LAST so attacker-controlled metadata cannot shadow it
    // (a metadata key named `host_meta` would otherwise override the trusted value).
    return { ...metadata, host_meta };
  } finally {
    clearTimeout(timer!);
  }
}
