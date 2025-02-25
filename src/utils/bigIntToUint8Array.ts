/**
 * Converts a bigint value to a Uint8Array.
 *
 * function handles both positive and negative bigints and ensures the result
 * is a proper two's complement representation for negative values.
 *
 * @param big - The bigint value to convert.
 * @returns A Uint8Array representing the input bigint.
 */
export function bigIntToUint8Array(big: bigint) {
  // ensure big is positive and determine its byte size
  const isNegative = big < BigInt(0);
  if (isNegative) {
    // find the number of bits required to represent the positive value
    const bitLength = big.toString(2).length;
    // adjust the big to its two's complement representation
    big += BigInt(1) << BigInt(bitLength + 1);
  }

  // convert big to a hex string
  let hex = big.toString(16);
  // ensure even length for proper byte conversion
  if (hex.length % 2 !== 0) {
    hex = '0' + hex;
  }

  const len = hex.length / 2;
  const u8 = new Uint8Array(len);
  for (let i = 0, j = 0; i < len; i++, j += 2) {
    u8[i] = parseInt(hex.slice(j, j + 2), 16);
  }

  // if the original big was negative, invert all bits for two's complement
  if (isNegative) {
    for (let i = 0; i < len; i++) {
      u8[i] = ~u8[i] & 0xff;
    }
  }

  return u8;
}
