import { utils, BigNumber } from 'ethers';
import { Version } from '../base';
var sha3 = require('js-sha3').keccak_256;

const eth0x =
  '4f5b812789fc606be1b3b16908db13fc7a9adf7ca72641f84d75b47069d3d7f0';

export function constructEthNameHash(tokenId: string, version: Version): string {
  if (version > Version.v1) return tokenId;

  const label0x = utils
    .hexZeroPad(utils.hexlify(BigNumber.from(tokenId)), 32)
    .replace('0x', '');
  const labels = [label0x, eth0x];

  // 0 x 64
  let node = '0000000000000000000000000000000000000000000000000000000000000000';
  for (var i = labels.length - 1; i >= 0; i--) {
    var labelSha = labels[i];
    node = sha3(Buffer.from(node + labelSha, 'hex'));
  }
  return '0x' + node;
}
