import { NFT_METADATA_MAX_PROPERTIES } from '../config';

/**
 * Guards attacker-controlled NFT/avatar metadata before it is spread or serialized.
 *
 * @ensdomains/ens-avatar's getMetadata returns `{ ...metadata, is_owner }` where
 * `metadata` is JSON parsed straight from an attacker-controlled tokenURI. If that
 * JSON is a top-level array (or an object with millions of keys), spreading it turns
 * every index into an enumerable property — a single request can then freeze the
 * event loop and exhaust the worker's memory (unauthenticated DoS via /queryNFT).
 *
 * This rejects any metadata that is not a plain object and any object whose top-level
 * enumerable property count exceeds NFT_METADATA_MAX_PROPERTIES. The property count is
 * bounded with an early-exit loop so a hostile giant object is rejected in O(limit),
 * never materializing Object.keys() over millions of entries.
 */
export function assertPlainMetadata(
  value: unknown
): asserts value is Record<string, unknown> {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    throw new Error('NFT metadata must be a JSON object');
  }

  let count = 0;
  for (const _key in value as Record<string, unknown>) {
    if (++count > NFT_METADATA_MAX_PROPERTIES) {
      throw new Error(
        `NFT metadata exceeds the maximum of ${NFT_METADATA_MAX_PROPERTIES} properties`
      );
    }
  }
}
