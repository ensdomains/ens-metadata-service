const path = require('path');
require('dotenv').config();

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || 'localhost';
const ENV = process.env.ENV || 'local'; // local/prod

const FONT_FOLDER = path.join((ENV === 'local' ? 'src' : 'dist'), 'assets');
const CANVAS_FONT_PATH = path.join(FONT_FOLDER, 'Satoshi-Bold.ttf');
const CANVAS_EMOJI_FONT_PATH = path.join(FONT_FOLDER, 'NotoColorEmoji.ttf');
const CANVAS_FALLBACK_FONT_PATH = path.join(FONT_FOLDER, 'DejaVuSans-Bold.ttf');
const INAMEWRAPPER = process.env.INAMEWRAPPER || '0x1aa28a1e';

const IPFS_GATEWAY = 'https://cloudflare-ipfs.com/';
const INFURA_API_KEY = process.env.INFURA_API_KEY || '';

const ADDRESS_ETH_REGISTRAR = process.env.ADDRESS_ETH_REGISTRAR || '0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85';
const ADDRESS_ETH_REGISTRY = process.env.ADDRESS_ETH_REGISTRY || '0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e'
const ADDRESS_NAME_WRAPPER = process.env.ADDRESS_NAME_WRAPPER || '0x4D83cea620E3864F912046b73bB3a6c04Da75990';

const SERVER_URL =
  ENV === 'local' ? `http://localhost:${PORT}` : `https://${HOST}`;

const ETH_REGISTRY_ABI = [
  'function recordExists(bytes32 node) external view returns (bool)'
];

// response timeout: 1 min
const RESPONSE_TIMEOUT = 60 * 1000;

// avatar cannot be greater than 50mb
const MAX_CONTENT_LENGTH = 50000000;

export {
  ADDRESS_ETH_REGISTRAR,
  ADDRESS_ETH_REGISTRY,
  ADDRESS_NAME_WRAPPER,
  CANVAS_FONT_PATH,
  CANVAS_EMOJI_FONT_PATH,
  CANVAS_FALLBACK_FONT_PATH,
  ETH_REGISTRY_ABI,
  INAMEWRAPPER,
  IPFS_GATEWAY,
  INFURA_API_KEY,
  MAX_CONTENT_LENGTH,
  RESPONSE_TIMEOUT,
  SERVER_URL,
};
