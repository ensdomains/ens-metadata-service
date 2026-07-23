import test from 'ava';

import { canonicalHost } from './canonicalHost';

test('lowercases the host', (t) => {
  t.is(canonicalHost('Metadata.ENS.Domains'), 'metadata.ens.domains');
});

test('strips a trailing dot (FQDN form)', (t) => {
  t.is(canonicalHost('metadata.ens.domains.'), 'metadata.ens.domains');
});

test('strips repeated trailing dots and normalizes case together', (t) => {
  t.is(canonicalHost('Metadata.ENS.Domains..'), 'metadata.ens.domains');
});

test('leaves an already-canonical host unchanged', (t) => {
  t.is(canonicalHost('metadata.ens.domains'), 'metadata.ens.domains');
});

test('trailing-dot FQDN no longer bypasses an exact-string self-host denylist', (t) => {
  const denylist = ['metadata.ens.domains'].map(canonicalHost);
  t.true(denylist.includes(canonicalHost('metadata.ens.domains.')));
  t.true(denylist.includes(canonicalHost('metadata.ens.domains')));
});
