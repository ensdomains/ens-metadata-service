import { ethers } from 'ethers';

require('dotenv').config();

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || 'localhost';
const ENV = process.env.ENV || 'local'; // local/prod
const NETWORK = process.env.NETWORK || 'local'; // local/rinkeby/ropsten/goerli/mainnet
const INFURA_API_KEY = process.env.INFURA_API_KEY;
const INAMEWRAPPER = process.env.INAMEWRAPPER || '0x1aa28a1e';
const ADDRESS_ETH_REGISTRAR = process.env.ADDRESS_ETH_REGISTRAR || '0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85';
const ADDRESS_NAME_WRAPPER = process.env.ADDRESS_NAME_WRAPPER || '0x4D83cea620E3864F912046b73bB3a6c04Da75990';
const SERVER_URL =
  ENV === 'local' ? `http://localhost:${PORT}` : `https://${HOST}`;
const INFURA_URL = `https://rinkeby.infura.io/v3/${INFURA_API_KEY}`;
const provider = new ethers.providers.StaticJsonRpcProvider(INFURA_URL);

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

export {
  provider,
  ADDRESS_ETH_REGISTRAR,
  ADDRESS_NAME_WRAPPER,
  INAMEWRAPPER,
  INFURA_API_KEY,
  INFURA_URL,
  SERVER_URL,
  SUBGRAPH_URL,
};
