import avaTest, { ExecutionContext, TestFn } from 'ava';
import { JsonRpcProvider, Network } from 'ethers';

import { TestContext } from '../../mock/interface';
import { guardCcipRead } from './guardCcipRead';

const test = avaTest as TestFn<TestContext>;

const network = new Network('mainnet', 1);
const tx = { to: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e' } as any;
const calldata = '0x3b3b57de26c3abab47454e5b545b6c18e206e63aefe4531245fafc86f01700507be9841e';

function createProvider() {
  return guardCcipRead(
    new JsonRpcProvider('http://localhost:8545', network, {
      staticNetwork: true,
    })
  );
}

test('ccipReadFetch returns null when ccip read is disabled', async (t: ExecutionContext<TestContext>) => {
  const provider = createProvider();
  provider.disableCcipRead = true;
  const result = await provider.ccipReadFetch(tx, calldata, [
    'https://example.com/{data}',
  ]);
  t.is(result, null);
});

test('ccipReadFetch returns null for empty urls', async (t: ExecutionContext<TestContext>) => {
  const provider = createProvider();
  const result = await provider.ccipReadFetch(tx, calldata, []);
  t.is(result, null);
});

test('ccipReadFetch blocks self-referential gateway urls', async (t: ExecutionContext<TestContext>) => {
  const provider = createProvider();
  const result = await provider.ccipReadFetch(tx, calldata, [
    'https://metadata.ens.domains/mainnet/avatar/{sender}',
  ]);
  t.is(result, null);
});

test('ccipReadFetch blocks non-http(s) gateway urls', async (t: ExecutionContext<TestContext>) => {
  const provider = createProvider();
  const result = await provider.ccipReadFetch(tx, calldata, [
    'ftp://example.com/{data}',
    'file:///etc/passwd',
  ]);
  t.is(result, null);
});

test('ccipReadFetch blocks private IP gateway urls', async (t: ExecutionContext<TestContext>) => {
  const provider = createProvider();
  const result = await provider.ccipReadFetch(tx, calldata, [
    'http://127.0.0.1:9/{data}',
    'http://169.254.169.254/latest/meta-data',
  ]);
  t.is(result, null);
});
