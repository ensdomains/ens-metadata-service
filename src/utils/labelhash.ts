import { keccak256, toUtf8Bytes } from 'ethers';
export const labelhash = (label: string) =>
  keccak256(toUtf8Bytes(label));

export function getLabelhash(nameOrLabelhash: string, isHex = false) {
  // if name remove tld before conversion
  const _name = nameOrLabelhash.substring(0, nameOrLabelhash.lastIndexOf('.'));
  // if not name, return original
  if (!_name) return nameOrLabelhash;

  const _lhexId = labelhash(_name);
  if (isHex) return _lhexId;
  const _lintId = BigInt(_lhexId).toString();
  return _lintId;
}
