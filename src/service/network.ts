import { ethers } from 'ethers';
import { UnsupportedNetwork } from '../base';
import { INFURA_API_KEY } from '../config';

const WEB3_API = {
  INFURA: 'https://infura.io/v3/',
  CLOUDFLARE: 'https://web3metadata.ens.domains/v1',
  CLOUDFLARE_2: 'https://web3metadata2.ens.domains/v1'
}

const NETWORK = {
  LOCAL: 'local',
  RINKEBY: 'rinkeby',
  ROPSTEN: 'ropsten',
  GOERLI: 'goerli',
  MAINNET: 'mainnet',
};

function getWeb3URL(api: string, network: string) {
  switch(api) {
    case WEB3_API.INFURA:
      return `${api.replace('https://', `https://${network}.`)}${INFURA_API_KEY}`;
    case WEB3_API.CLOUDFLARE:
    case WEB3_API.CLOUDFLARE_2:
      return `${api}/${network}`
    default:
      throw Error('');
  }
}

export default function getNetwork(network: string): any {
  // currently subgraphs used under this function are outdated,
  // we will have namewrapper support and more attributes when latest subgraph goes to production
  let SUBGRAPH_URL: string;
  let WEB3_URL = WEB3_API.CLOUDFLARE;
  switch (network) {
    case NETWORK.LOCAL:
      SUBGRAPH_URL = 'http://127.0.0.1:8000/subgraphs/name/graphprotocol/ens';
      WEB3_URL = getWeb3URL(WEB3_URL, NETWORK.RINKEBY);
      break;
    case NETWORK.RINKEBY:
      SUBGRAPH_URL =
        'https://api.thegraph.com/subgraphs/name/makoto/ensrinkeby';
        WEB3_URL = getWeb3URL(WEB3_URL, NETWORK.RINKEBY);
      break;
    case NETWORK.ROPSTEN:
      SUBGRAPH_URL =
        'https://api.thegraph.com/subgraphs/name/ensdomains/ensropsten';
        WEB3_URL = getWeb3URL(WEB3_URL, NETWORK.ROPSTEN);
      break;
    case NETWORK.GOERLI:
      SUBGRAPH_URL =
        'https://api.thegraph.com/subgraphs/name/ensdomains/ensgoerli';
        WEB3_URL = getWeb3URL(WEB3_URL, NETWORK.GOERLI);
      break;
    case NETWORK.MAINNET:
      SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/ensdomains/ens';
      WEB3_URL = getWeb3URL(WEB3_URL, NETWORK.MAINNET);
      break;
    default:
      throw new UnsupportedNetwork(`Unknown network '${network}'`, 501);
  }
  const provider = new ethers.providers.StaticJsonRpcProvider(WEB3_URL);
  return { WEB3_URL, SUBGRAPH_URL, provider };
}
