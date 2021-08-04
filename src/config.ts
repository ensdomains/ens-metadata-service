import { ethers } from 'ethers';

require('dotenv').config();

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || 'localhost';
const ENV = process.env.ENV || 'local'; // local/prod
const NETWORK = process.env.NETWORK || 'local'; // local/rinkeby/ropsten/goerli/mainnet
const INFURA_API_KEY = process.env.INFURA_API_KEY;
const SERVER_URL =
  ENV === 'local' ? `http://localhost:${PORT}` : `https://${HOST}`;
const INFURA_URL = `https://rinkeby.infura.io/v3/${INFURA_API_KEY}`;

let SUBGRAPH_URL: string;

switch (NETWORK) {
  case 'local':
    SUBGRAPH_URL = 'http://127.0.0.1:8000/subgraphs/name/graphprotocol/ens';
    break;
  case 'rinkeby':
    SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/makoto/ensrinkeby';
    break;
  // New subgraph not deployed yet
  // case 'ropsten':
  //   SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/ensdomains/ensropsten'
  //   break;
  // case 'goerli':
  //   SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/ensdomains/ensgoerli'
  //   break;
  // case 'mainnet':
  //   SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/ensdomains/ens'
  //   break;
  default:
    throw Error('unknown network');
}

const provider = new ethers.providers.JsonRpcProvider(INFURA_URL);

export { provider, INFURA_URL, SERVER_URL, SUBGRAPH_URL };
