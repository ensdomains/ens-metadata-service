import { ethers, utils } from 'ethers';
export const labelhash = (label: string) =>
  utils.keccak256(utils.toUtf8Bytes(label));

export function getLabelhash(name: string) {
  // remove tld before conversion
  if (name.endsWith('.eth')) name = name.slice(0, -4);
  const lhexId = labelhash(name);
  const lintId = ethers.BigNumber.from(lhexId).toString();
  return lintId;
}
