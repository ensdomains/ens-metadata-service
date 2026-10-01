import test from 'ava';

import { safeErrorMessage } from './safeErrorMessage';

test('uses Error.message for a plain Error', (t) => {
  t.is(safeErrorMessage(new Error('boom')), 'boom');
});

test('handles an ethers-style CALL_EXCEPTION carrying a BigInt (trigger A)', (t) => {
  // Reverting tokenURI(): ethers v6 throws an Error whose invocation.args holds a
  // BigInt token id. Serialising the raw object throws; .message is safe.
  const err: any = new Error('missing revert data (CALL_EXCEPTION)');
  err.code = 'CALL_EXCEPTION';
  err.invocation = { method: 'tokenURI', args: [999999999999n] };
  const msg = safeErrorMessage(err);
  t.is(msg, 'missing revert data (CALL_EXCEPTION)');
  t.notThrows(() => JSON.stringify({ message: msg }));
});

test('handles a circular AxiosError-style object (trigger B)', (t) => {
  // AxiosError is an Error; .message is used and the circular config is never touched.
  const err: any = new Error('Request failed with status code 404');
  const agent: any = { sockets: {} };
  const socket: any = { _httpMessage: {} };
  socket._httpMessage.agent = agent;
  agent.sockets.s = socket; // Agent -> sockets -> socket -> _httpMessage -> agent
  err.config = { httpAgent: agent };
  const msg = safeErrorMessage(err);
  t.is(msg, 'Request failed with status code 404');
  t.notThrows(() => JSON.stringify({ message: msg }));
});

test('returns a string thrown value as-is', (t) => {
  t.is(safeErrorMessage('just a string'), 'just a string');
});

test('serializes a plain non-Error object (rasterize {status, statusText})', (t) => {
  t.is(
    safeErrorMessage({ status: 502, statusText: 'Bad Gateway' }),
    '{"status":502,"statusText":"Bad Gateway"}'
  );
});

test('stringifies a bare BigInt on a non-Error object without throwing', (t) => {
  t.is(safeErrorMessage({ tokenId: 42n }), '{"tokenId":"42"}');
});

test('survives a circular non-Error object via the [Circular] guard', (t) => {
  const obj: any = { a: 1 };
  obj.self = obj;
  const msg = safeErrorMessage(obj);
  t.true(msg.includes('[Circular]'));
  t.notThrows(() => JSON.stringify({ message: msg }));
});

test('falls back for null / undefined / empty object', (t) => {
  t.is(safeErrorMessage(null), 'Internal server error');
  t.is(safeErrorMessage(undefined), 'Internal server error');
  t.is(safeErrorMessage({}), 'Internal server error');
});

test('honours a custom fallback', (t) => {
  t.is(safeErrorMessage(null, 'NFT metadata resolution failed'), 'NFT metadata resolution failed');
});
