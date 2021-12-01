const path = require('path');
require('dotenv').config();

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || 'localhost';
const ENV = process.env.ENV || 'local'; // local/prod

const CANVAS_FONT_PATH = path.join(ENV === 'local' ? 'src' : 'dist', 'assets', 'PlusJakartaSans-Bold.ttf');
const INAMEWRAPPER = process.env.INAMEWRAPPER || '0x1aa28a1e';

const INFURA_API_KEY = process.env.INFURA_API_KEY;
const ADDRESS_ETH_REGISTRAR = process.env.ADDRESS_ETH_REGISTRAR || '0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85';
const ADDRESS_NAME_WRAPPER = process.env.ADDRESS_NAME_WRAPPER || '0x4D83cea620E3864F912046b73bB3a6c04Da75990';

const IPFS_GATEWAY = 'https://ipfs.io/ipfs/';
const SERVER_URL =
  ENV === 'local' ? `http://localhost:${PORT}` : `https://${HOST}`;

export {
  ADDRESS_ETH_REGISTRAR,
  ADDRESS_NAME_WRAPPER,
  CANVAS_FONT_PATH,
  INAMEWRAPPER,
  INFURA_API_KEY,
  IPFS_GATEWAY,
  SERVER_URL,
};
