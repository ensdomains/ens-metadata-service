import { EnsPlugin, JsonRpcProvider, Network } from 'ethers';
import { UnsupportedNetwork } from '../base';
import {
  NODE_PROVIDER,
  NODE_PROVIDER_URL,
  NODE_PROVIDER_URL_CF,
  NODE_PROVIDER_URL_GOERLI,
  NODE_PROVIDER_URL_SEPOLIA,
  THE_GRAPH_API_KEY,
} from '../config';

const NODE_PROVIDERS = {
  INFURA: 'INFURA',
  CLOUDFLARE: 'CLOUDFLARE',
  GOOGLE: 'GOOGLE',
  GETH: 'GETH',
};

export const NETWORK = {
  LOCAL: 'local',
  RINKEBY: 'rinkeby',
  ROPSTEN: 'ropsten',
  GOERLI: 'goerli',
  SEPOLIA: 'sepolia',
  MAINNET: 'mainnet',
} as const;

export type NetworkName = (typeof NETWORK)[keyof typeof NETWORK];

function getWeb3URL(
  providerName: string,
  api: string,
  network: NetworkName
): string {
  switch (providerName.toUpperCase()) {
    case NODE_PROVIDERS.INFURA:
      return `${api.replace('https://', `https://${network}.`)}`;
    case NODE_PROVIDERS.CLOUDFLARE:
      if (network === NETWORK.MAINNET) return `${api}/${network}`;
      if (network === NETWORK.GOERLI) return NODE_PROVIDER_URL_GOERLI;
      if (network === NETWORK.SEPOLIA) return NODE_PROVIDER_URL_SEPOLIA;
    case NODE_PROVIDERS.GOOGLE:
      if (network === NETWORK.MAINNET) return api;
      if (network === NETWORK.GOERLI) return NODE_PROVIDER_URL_GOERLI;
      if (network === NETWORK.SEPOLIA) return NODE_PROVIDER_URL_SEPOLIA;
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
  provider: JsonRpcProvider;
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
    case NETWORK.SEPOLIA:
      SUBGRAPH_URL =
        'https://api.studio.thegraph.com/query/49574/enssepolia/version/latest';
      break;
    case NETWORK.MAINNET:
      SUBGRAPH_URL = 
        `https://gateway-arbitrum.network.thegraph.com/api/${THE_GRAPH_API_KEY}/subgraphs/id/5XqPmWe6gjyrJtFn9cLy237i4cWw2j9HcUJEXsP5qGtH`;
      break;
    default:
      throw new UnsupportedNetwork(`Unknown network '${network}'`, 501);
  }

  const WEB3_URL = getWeb3URL(NODE_PROVIDER, NODE_PROVIDER_URL, network);

  // add source param at the end for better request measurability
  SUBGRAPH_URL = SUBGRAPH_URL + '?source=ens-metadata';

  if (network === NETWORK.SEPOLIA) {
    const ens = new EnsPlugin('0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e');
    const _network = new Network(network, 11155111).attachPlugin(ens);
    const provider = new JsonRpcProvider(WEB3_URL, _network, { staticNetwork: true });
    return { WEB3_URL, SUBGRAPH_URL, provider };
  }
  const provider = new JsonRpcProvider(WEB3_URL, network, { staticNetwork: true });
  return { WEB3_URL, SUBGRAPH_URL, provider };
}
