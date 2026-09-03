import test from 'ava';

import { NFT_METADATA_MAX_PROPERTIES } from '../config';
import { assertPlainMetadata } from './assertPlainMetadata';

test('accepts a normal metadata object', (t) => {
  t.notThrows(() =>
    assertPlainMetadata({ name: 'foo.eth', image: 'ipfs://…', attributes: [] })
  );
});

test('accepts an empty object', (t) => {
  t.notThrows(() => assertPlainMetadata({}));
});

test('rejects a top-level array', (t) => {
  const err = t.throws(() => assertPlainMetadata([1, 2, 3]));
  t.is(err?.message, 'NFT metadata must be a JSON object');
});

test('rejects a large top-level array cheaply (no full spread)', (t) => {
  // The whole point: a hostile giant array must be rejected without being spread.
  const huge = new Array(5_000_000).fill(0);
  t.throws(() => assertPlainMetadata(huge));
});

test('rejects null', (t) => {
  t.throws(() => assertPlainMetadata(null));
});

test('rejects primitives', (t) => {
  t.throws(() => assertPlainMetadata('a string'));
  t.throws(() => assertPlainMetadata(42));
  t.throws(() => assertPlainMetadata(true));
  t.throws(() => assertPlainMetadata(undefined));
});

test('accepts an object at the property limit', (t) => {
  const obj: Record<string, number> = {};
  for (let i = 0; i < NFT_METADATA_MAX_PROPERTIES; i++) obj[`k${i}`] = i;
  t.notThrows(() => assertPlainMetadata(obj));
});

test('rejects an object with too many properties', (t) => {
  const obj: Record<string, number> = {};
  for (let i = 0; i <= NFT_METADATA_MAX_PROPERTIES; i++) obj[`k${i}`] = i;
  const err = t.throws(() => assertPlainMetadata(obj));
  t.regex(err!.message, /exceeds the maximum/);
});

test('rejects the array-as-object explosion variant', (t) => {
  // { "0": 0, "1": 0, … } — the shape a spread array collapses to.
  const obj: Record<string, number> = {};
  for (let i = 0; i < 2_000_000; i++) obj[i] = 0;
  t.throws(() => assertPlainMetadata(obj));
});
