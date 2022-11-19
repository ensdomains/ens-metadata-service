import { ethers } from 'ethers';
import { UnsupportedNetwork } from '../base';

if (!process.env.SUBGRAPH_URL || !process.env.WEB3_URL) {
  throw new Error('missing .env configs');
}

const NETWORK = {
  PULSE: 'pulse',
};

export default function getNetwork(network: string): any {
  if (network !== NETWORK.PULSE) {
    throw new UnsupportedNetwork(`Unknown network '${network}'`, 400)
  }

  // currently subgraphs used under this function are outdated,
  // we will have name wrapper support and more attributes when latest subgraph goes to production
  const SUBGRAPH_URL = process.env.SUBGRAPH_URL;
  const WEB3_URL = process.env.WEB3_URL;

  const provider = new ethers.providers.StaticJsonRpcProvider(WEB3_URL);
  return { WEB3_URL, SUBGRAPH_URL, provider };
}
