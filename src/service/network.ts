import { ethers } from 'ethers';
import { UnsupportedNetwork } from '../base';
import {
  NODE_PROVIDER,
  NODE_PROVIDER_URL,
  NODE_PROVIDER_URL_CF,
  NODE_PROVIDER_URL_GOERLI,
} from '../config';

const NODE_PROVIDERS = {
  INFURA    : 'INFURA',
  CLOUDFLARE: 'CLOUDFLARE',
  GOOGLE    : 'GOOGLE',
  GETH      : 'GETH',
  TENDERLY  : 'TENDERLY'
};

export const NETWORK = {
  LOCAL  : 'local',
  RINKEBY: 'rinkeby',
  ROPSTEN: 'ropsten',
  GOERLI : 'goerli',
  MAINNET: 'mainnet',
} as const;

export type NetworkName = typeof NETWORK[keyof typeof NETWORK];

function getWeb3URL(
  providerName: string,
  api: string,
  network: NetworkName
): string {
  switch (providerName.toUpperCase()) {
    case NODE_PROVIDERS.INFURA:
    case NODE_PROVIDERS.TENDERLY:
      return `${api.replace('https://', `https://${network}.`)}`;
    case NODE_PROVIDERS.CLOUDFLARE:
      return `${api}/${network}`;
    case NODE_PROVIDERS.GOOGLE:
      if (network === NETWORK.MAINNET) return api;
      if (network === NETWORK.GOERLI) return NODE_PROVIDER_URL_GOERLI;
      return `${NODE_PROVIDER_URL_CF}/${network}`;
    case NODE_PROVIDERS.GETH:
      return api;
    default:
      throw Error('');
  }
}

export default function getNetwork(network: NetworkName): {
  WEB3_URL: string;
  SUBGRAPH_URL: string;
  provider: ethers.providers.BaseProvider;
} {
  // currently subgraphs used under this function are outdated,
  // we will have namewrapper support and more attributes when latest subgraph goes to production
  let SUBGRAPH_URL: string;
  switch (network) {
    case NETWORK.LOCAL:
      SUBGRAPH_URL = 'http://127.0.0.1:8000/subgraphs/name/graphprotocol/ens';
      break;
    case NETWORK.RINKEBY:
      SUBGRAPH_URL =
        'https://api.thegraph.com/subgraphs/name/makoto/ensrinkeby';
      break;
    case NETWORK.ROPSTEN:
      SUBGRAPH_URL =
        'https://api.thegraph.com/subgraphs/name/ensdomains/ensropsten';
      break;
    case NETWORK.GOERLI:
      SUBGRAPH_URL =
        'https://api.thegraph.com/subgraphs/name/ensdomains/ensgoerli';
      break;
    case NETWORK.MAINNET:
      SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/ensdomains/ens';
      break;
    default:
      throw new UnsupportedNetwork(`Unknown network '${network}'`, 501);
  }

  const WEB3_URL = getWeb3URL(NODE_PROVIDER, NODE_PROVIDER_URL, network);

  // add source param at the end for better request measurability
  SUBGRAPH_URL = SUBGRAPH_URL + '?source=ens-metadata';

  const provider = new ethers.providers.StaticJsonRpcProvider(WEB3_URL);
  return { WEB3_URL, SUBGRAPH_URL, provider };
}
