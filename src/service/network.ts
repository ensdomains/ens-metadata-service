import { ethers } from 'ethers';
import { UnsupportedNetwork } from '../base';

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
  let CLOUDFLARE_WEB3_URL: string = 'https://web3metadata.ens.domains/v1';
  if (process.env.USE_LOCAL_WEB3) {
    SUBGRAPH_URL = 'http://127.0.0.1:8000/subgraphs/name/graphprotocol/ens';
    CLOUDFLARE_WEB3_URL = 'http://127.0.0.1:8545';
  } else {
    switch (network) {
      case NETWORK.LOCAL:
        SUBGRAPH_URL = 'http://127.0.0.1:8000/subgraphs/name/graphprotocol/ens';
        CLOUDFLARE_WEB3_URL = `${CLOUDFLARE_WEB3_URL}/${NETWORK.RINKEBY}`;
        break;
      case NETWORK.RINKEBY:
        SUBGRAPH_URL =
          'https://api.thegraph.com/subgraphs/name/makoto/ensrinkeby';
        CLOUDFLARE_WEB3_URL = `${CLOUDFLARE_WEB3_URL}/${NETWORK.RINKEBY}`;
        break;
      case NETWORK.ROPSTEN:
        SUBGRAPH_URL =
          'https://api.thegraph.com/subgraphs/name/ensdomains/ensropsten';
        CLOUDFLARE_WEB3_URL = `${CLOUDFLARE_WEB3_URL}/${NETWORK.ROPSTEN}`;
        break;
      case NETWORK.GOERLI:
        SUBGRAPH_URL =
          'https://api.thegraph.com/subgraphs/name/ensdomains/ensgoerli';
        CLOUDFLARE_WEB3_URL = `${CLOUDFLARE_WEB3_URL}/${NETWORK.GOERLI}`;
        break;
      case NETWORK.MAINNET:
        SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/ensdomains/ens';
        CLOUDFLARE_WEB3_URL = `${CLOUDFLARE_WEB3_URL}/${NETWORK.MAINNET}`;
        break;
      default:
        throw new UnsupportedNetwork(`Unknown network '${network}'`, 400);
    }
  }
  const provider = new ethers.providers.StaticJsonRpcProvider(CLOUDFLARE_WEB3_URL);
  return { CLOUDFLARE_WEB3_URL, SUBGRAPH_URL, provider };
}
