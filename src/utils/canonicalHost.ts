/**
 * Canonicalize a hostname for self-host denylist comparison.
 *
 * Node's URL and HTTP stack lowercases hostnames but preserves a trailing dot on a
 * fully-qualified domain name, so `metadata.ens.domains.` is not string-equal to
 * `metadata.ens.domains`. Exact-string denylist checks therefore miss the trailing-dot
 * (FQDN) form even though it resolves to the same host. Normalizing both sides of the
 * comparison — lowercasing and stripping trailing dots — closes that gap.
 */
export function canonicalHost(host: string): string {
  return host.toLowerCase().replace(/\.+$/, '');
}
