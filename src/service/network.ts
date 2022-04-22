import { ethers } from 'ethers';
import { UnsupportedNetwork } from '../base';
import { INFURA_API_KEY } from '../config';

const NETWORK = {
  LOCAL: 'local',
  RINKEBY: 'rinkeby',
  ROPSTEN: 'ropsten',
  GOERLI: 'goerli',
  MAINNET: 'mainnet',
};

export default function getNetwork(network: string): any {
  // currently subgraphs used under this function are outdated,
  // we will have namewrapper support and more attributes when latest subgraph goes to production
  let SUBGRAPH_URL: string;
  let INFURA_URL: string;
  switch (network) {
    case NETWORK.LOCAL:
      SUBGRAPH_URL = 'http://127.0.0.1:8000/subgraphs/name/graphprotocol/ens';
      INFURA_URL = `https://rinkeby.infura.io/v3/${INFURA_API_KEY}`;
      break;
    case NETWORK.RINKEBY:
      SUBGRAPH_URL =
        'https://api.thegraph.com/subgraphs/name/makoto/ensrinkeby';
      INFURA_URL = `https://rinkeby.infura.io/v3/${INFURA_API_KEY}`;
      break;
    case NETWORK.ROPSTEN:
      SUBGRAPH_URL =
        'https://api.thegraph.com/subgraphs/name/ensdomains/ensropsten';
      INFURA_URL = `https://ropsten.infura.io/v3/${INFURA_API_KEY}`;
      break;
    case NETWORK.GOERLI:
      SUBGRAPH_URL =
        'https://api.thegraph.com/subgraphs/name/ensdomains/ensgoerli';
      INFURA_URL = `https://goerli.infura.io/v3/${INFURA_API_KEY}`;
      break;
    case NETWORK.MAINNET:
      SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/ensdomains/ens';
      INFURA_URL = `https://mainnet.infura.io/v3/${INFURA_API_KEY}`;
      break;
    default:
      throw new UnsupportedNetwork(`Unknown network '${network}'`);
  }
  const provider = new ethers.providers.StaticJsonRpcProvider(INFURA_URL);
  return { INFURA_URL, SUBGRAPH_URL, provider };
}
