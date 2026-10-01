import test from 'ava';

import { canonicalHost } from './canonicalHost';

test('strips a single trailing dot (FQDN form)', (t) => {
  t.is(canonicalHost('metadata.ens.domains.'), 'metadata.ens.domains');
});

test('strips multiple trailing dots', (t) => {
  t.is(canonicalHost('metadata.ens.domains..'), 'metadata.ens.domains');
});

test('lowercases the host', (t) => {
  t.is(canonicalHost('Metadata.ENS.Domains'), 'metadata.ens.domains');
});

test('lowercases and strips together (the bypass shape)', (t) => {
  t.is(canonicalHost('Metadata.ENS.Domains.'), 'metadata.ens.domains');
});

test('leaves a canonical host unchanged', (t) => {
  t.is(canonicalHost('metadata.ens.domains'), 'metadata.ens.domains');
});

test('does not strip interior dots', (t) => {
  t.is(canonicalHost('a.b.c'), 'a.b.c');
});

test('the FQDN form matches the denylisted bare form after canonicalization', (t) => {
  const denylist = ['metadata.ens.domains'];
  const attacker = 'metadata.ens.domains.'; // trailing-dot bypass of an exact-string check
  t.false(denylist.includes(attacker), 'exact-string check misses it (the bug)');
  t.true(
    denylist.map(canonicalHost).includes(canonicalHost(attacker)),
    'canonicalized check catches it (the fix)'
  );
});
