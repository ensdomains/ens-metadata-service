/**
 * Extracts a bounded, always-serialisable scalar message from an unknown thrown
 * value, so a controller can do `res.status(500).json({ message })` without risking
 * a serialization TypeError that would escape an async handler as an unhandled
 * rejection and terminate the process.
 *
 * The two known process-killing shapes on the /queryNFT path are both `Error`
 * instances, so the first branch handles them safely without touching their
 * unserialisable internals:
 *   - ethers v6 `CALL_EXCEPTION` (a reverting tokenURI()/uri()) carries a BigInt
 *     token id in `invocation.args`; serialising the raw object throws
 *     "Do not know how to serialize a BigInt".
 *   - axios `AxiosError.toJSON()` exposes `config.httpAgent`, whose live socket
 *     graph is circular; serialising it throws "Converting circular structure to
 *     JSON".
 * Using `error.message` sidesteps both. The JSON fallback (BigInt- and
 * circular-safe) is only for non-Error thrown values (e.g. rasterize rejects with
 * a plain `{ status, statusText }` object).
 */
export function safeErrorMessage(
  error: unknown,
  fallback: string = 'Internal server error'
): string {
  if (error instanceof Error && typeof error.message === 'string') {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    const seen = new WeakSet<object>();
    const json = JSON.stringify(error, (_key, value) => {
      if (typeof value === 'bigint') return value.toString();
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) return '[Circular]';
        seen.add(value);
      }
      return value;
    });
    if (json && json !== '{}' && json !== 'null') {
      return json;
    }
  } catch {
    /* fall through to fallback */
  }
  return fallback;
}
