const path = require('path');
require('dotenv').config();

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || 'localhost';
const ENV = process.env.ENV || 'local'; // local/prod
const REDIS_URL = process.env.REDIS_URL;

const FONT_FOLDER = path.join((ENV === 'local' ? 'src' : 'dist'), 'assets');
const CANVAS_FONT_PATH = path.join(FONT_FOLDER, 'Satoshi-Bold.ttf');
const CANVAS_EMOJI_FONT_PATH = path.join(FONT_FOLDER, 'NotoColorEmoji.ttf');
const INAMEWRAPPER = process.env.INAMEWRAPPER || '0xd82c42d8';

const IPFS_GATEWAY = process.env.IPFS_GATEWAY || 'https://ipfs.io';
const INFURA_API_KEY = process.env.INFURA_API_KEY || '';
const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY || '';
const NODE_PROVIDER = process.env.NODE_PROVIDER || 'geth';
const NODE_PROVIDER_URL = process.env.NODE_PROVIDER_URL || 'http://localhost:8545';
const THE_GRAPH_API_KEY = process.env.THE_GRAPH_API_KEY || '';

// undocumented, temporary keys
const NODE_PROVIDER_URL_CF = process.env.NODE_PROVIDER_URL_CF || '';
const NODE_PROVIDER_URL_GOERLI = process.env.NODE_PROVIDER_URL_GOERLI || '';
const NODE_PROVIDER_URL_SEPOLIA = process.env.NODE_PROVIDER_URL_SEPOLIA || '';

const ADDRESS_ETH_REGISTRAR = process.env.ADDRESS_ETH_REGISTRAR || '0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85';
const ADDRESS_ETH_REGISTRY = process.env.ADDRESS_ETH_REGISTRY || '0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e'
const ADDRESS_NAME_WRAPPER = process.env.ADDRESS_NAME_WRAPPER || '0x114D4603199df73e7D157787f8778E21fCd13066';

const SERVER_URL =
  ENV === 'local' ? `http://localhost:${PORT}` : `https://${HOST}`;

const ETH_REGISTRY_ABI = [
  'function recordExists(bytes32 node) external view returns (bool)'
];

const NAMEWRAPPER_ABI = [
  'function isWrapped(bytes32 node) public view returns (bool)'
];

// response timeout: 1 min
const RESPONSE_TIMEOUT = 15 * 1000;

// Maximum content length for fetched images (25MB)
const MAX_CONTENT_LENGTH = 25000000;

// Timeout for /queryNFT metadata resolution (10 seconds)
const QUERY_NFT_TIMEOUT = 10_000;

// Hostnames of this service — used to block self-referential fetches
const SELF_HOST_DENYLIST = ['metadata.ens.domains'];

// Timeout for CCIP-read (ERC-3668) gateway fetches (10 seconds)
const CCIP_READ_TIMEOUT = 10_000;

// Maximum content length for CCIP-read (ERC-3668) gateway responses (1MB)
const CCIP_READ_MAX_CONTENT_LENGTH = 1000000;

// Maximum content length for NFT/avatar metadata JSON fetched by @ensdomains/ens-avatar
// through its shared axios instance (1MB). Bounds attacker-controlled (possibly
// gzip-bombed) metadata bodies. Aligned with ens-avatar's own MAX_METADATA_BYTES
// (1,000,000) — from 1.0.5 the library enforces this internally regardless of what
// the service passes, so keeping the service value in step avoids a looser window.
const NFT_METADATA_MAX_CONTENT_LENGTH = 1000000;

// Maximum number of top-level enumerable properties allowed on NFT/avatar metadata
// before it is spread/serialized. A top-level JSON array (or an object with millions
// of keys) returned by an attacker-controlled tokenURI would otherwise be spread into
// millions of enumerable properties, freezing the event loop and exhausting memory.
// Legitimate metadata objects have a handful of top-level keys; 1000 is generous.
const NFT_METADATA_MAX_PROPERTIES = 1000;

// Maximum base64 length of an avatar that may be embedded as the background of the
// generated ENS NFT card SVG (~10MB base64 ≈ 7.5MB binary). A large avatar would
// otherwise be inlined verbatim into the service's own SVG and returned, turning a
// bounded input into a much larger composed response. Over this, the card is rendered
// without the background (graceful degradation), not errored.
const MAX_BACKGROUND_EMBED_LENGTH = 10_000_000;

// Backstop on the size of the composed ENS NFT card SVG before it is base64-encoded
// into a data URI and returned. With the background bound above this should never trip
// for legitimate input; it caps any unexpected blowup in the generated markup.
const MAX_SVG_OUTPUT_LENGTH = 12_000_000;

export {
  MAX_BACKGROUND_EMBED_LENGTH,
  MAX_SVG_OUTPUT_LENGTH,
  ADDRESS_ETH_REGISTRAR,
  ADDRESS_ETH_REGISTRY,
  ADDRESS_NAME_WRAPPER,
  CANVAS_FONT_PATH,
  CANVAS_EMOJI_FONT_PATH,
  CCIP_READ_MAX_CONTENT_LENGTH,
  CCIP_READ_TIMEOUT,
  ETH_REGISTRY_ABI,
  NAMEWRAPPER_ABI,
  INAMEWRAPPER,
  IPFS_GATEWAY,
  INFURA_API_KEY,
  MAX_CONTENT_LENGTH,
  NFT_METADATA_MAX_CONTENT_LENGTH,
  NFT_METADATA_MAX_PROPERTIES,
  OPENSEA_API_KEY,
  QUERY_NFT_TIMEOUT,
  REDIS_URL,
  NODE_PROVIDER,
  NODE_PROVIDER_URL,
  NODE_PROVIDER_URL_CF,
  NODE_PROVIDER_URL_GOERLI,
  NODE_PROVIDER_URL_SEPOLIA,
  RESPONSE_TIMEOUT,
  SELF_HOST_DENYLIST,
  SERVER_URL,
  THE_GRAPH_API_KEY
};
