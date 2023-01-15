import avaTest, { ExecutionContext, TestFn } from 'ava';
import { TestContext } from '../../mock/interface';
import { IPFS_GATEWAY } from '../config';
import { utils } from '@ensdomains/ens-avatar'

const test = avaTest as TestFn<TestContext>;

test('should return data URIs without any changes', async (t: ExecutionContext<TestContext>) => {
  const uri = 'data:text/plain;base64,dGVzdGluZw==';
  const { uri: resolvedURI } = utils.resolveURI(uri, { ipfs: IPFS_GATEWAY } );
  t.is(uri, resolvedURI);
});

test('should return http URIs without any changes', async (t: ExecutionContext<TestContext>) => {
  const uri = 'https://app.ens.domains';
  const { uri: resolvedURI } = utils.resolveURI(uri, { ipfs: IPFS_GATEWAY });
  t.is(uri, resolvedURI);
});

test('should replace ipfs://ipfs/ with IPFS gateway prefix', async (t: ExecutionContext<TestContext>) => {
  const uri = 'ipfs://ipfs/QmUbTVz1L4uEvAPg5QcSu8Pow1YdwshDJ8VbyYjWaJv4JP';
  const { uri: resolvedURI } = utils.resolveURI(uri, { ipfs: IPFS_GATEWAY } );
  t.is(
    IPFS_GATEWAY + 'ipfs/' + 'QmUbTVz1L4uEvAPg5QcSu8Pow1YdwshDJ8VbyYjWaJv4JP',
    resolvedURI
  );
});

test('should replace ipfs:// with IPFS gateway prefix', async (t: ExecutionContext<TestContext>) => {
  const uri = 'ipfs://QmUbTVz1L4uEvAPg5QcSu8Pow1YdwshDJ8VbyYjWaJv4JP';
  const { uri: resolvedURI } = utils.resolveURI(uri, { ipfs: IPFS_GATEWAY } );
  t.is(
    IPFS_GATEWAY + 'ipfs/' + 'QmUbTVz1L4uEvAPg5QcSu8Pow1YdwshDJ8VbyYjWaJv4JP',
    resolvedURI
  );
});

test('should replace /ipfs/ with IPFS gateway prefix', async (t: ExecutionContext<TestContext>) => {
  const uri = '/ipfs/QmUbTVz1L4uEvAPg5QcSu8Pow1YdwshDJ8VbyYjWaJv4JP';
  const { uri: resolvedURI } = utils.resolveURI(uri, { ipfs: IPFS_GATEWAY } );
  t.is(
    IPFS_GATEWAY + 'ipfs/' + 'QmUbTVz1L4uEvAPg5QcSu8Pow1YdwshDJ8VbyYjWaJv4JP',
    resolvedURI
  );
});

test('should replace ipfs/ with IPFS gateway prefix', async (t: ExecutionContext<TestContext>) => {
  const uri = 'ipfs/QmUbTVz1L4uEvAPg5QcSu8Pow1YdwshDJ8VbyYjWaJv4JP';
  const { uri: resolvedURI } = utils.resolveURI(uri, { ipfs: IPFS_GATEWAY } );
  t.is(
    IPFS_GATEWAY + 'ipfs/' + 'QmUbTVz1L4uEvAPg5QcSu8Pow1YdwshDJ8VbyYjWaJv4JP',
    resolvedURI
  );
});

test('should recognize ipfs hash with subpath', async (t: ExecutionContext<TestContext>) => {
  const uri =
    'ipfs/QmUbTVz1L4uEvAPg5QcSu8Pow1YdwshDJ8VbyYjWaJv4JP/avatar/name.jpg';
  const { uri: resolvedURI } = utils.resolveURI(uri, { ipfs: IPFS_GATEWAY } );
  t.is(
    IPFS_GATEWAY + 'ipfs/' + 
      'QmUbTVz1L4uEvAPg5QcSu8Pow1YdwshDJ8VbyYjWaJv4JP/avatar/name.jpg',
    resolvedURI
  );
});

test('should prefix CIDs with IPFS gateway prefix', async (t: ExecutionContext<TestContext>) => {
  const cidv0 = 'QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR';
  const { uri: resolvedURIv0 } = utils.resolveURI(cidv0, { ipfs: IPFS_GATEWAY });
  t.is(IPFS_GATEWAY + 'ipfs/' + cidv0, resolvedURIv0);
  const cidv1 = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
  const { uri: resolvedURIv1 } = utils.resolveURI(cidv1, { ipfs: IPFS_GATEWAY });
  t.is(IPFS_GATEWAY + 'ipfs/' + cidv1, resolvedURIv1);
});

test('should replace ipfs://ipns/ with IPNS gateway prefix', async (t: ExecutionContext<TestContext>) => {
  const uri = 'ipfs://ipns/testing';
  const { uri: resolvedURI } = utils.resolveURI(uri, { ipfs: IPFS_GATEWAY } );
  t.is(IPFS_GATEWAY + 'ipns/' + 'testing', resolvedURI);
});

test('should replace ipns://ipns/ with IPNS gateway prefix', async (t: ExecutionContext<TestContext>) => {
  const uri = 'ipns://ipns/testing';
  const { uri: resolvedURI } = utils.resolveURI(uri, { ipfs: IPFS_GATEWAY } );
  t.is(IPFS_GATEWAY + 'ipns/' + 'testing', resolvedURI);
});

test('should replace ipns:// with IPNS gateway prefix', async (t: ExecutionContext<TestContext>) => {
  const uri = 'ipns://testing';
  const { uri: resolvedURI } = utils.resolveURI(uri, { ipfs: IPFS_GATEWAY } );
  t.is(IPFS_GATEWAY + 'ipns/' + 'testing', resolvedURI);
});

test('should replace /ipns/ with IPNS gateway prefix', async (t: ExecutionContext<TestContext>) => {
  // Should only replace the first occurrence of /ipns/
  const uri = '/ipns/testing/ipns/other';
  const { uri: resolvedURI } = utils.resolveURI(uri, { ipfs: IPFS_GATEWAY } );
  t.is(IPFS_GATEWAY + 'ipns/' + 'testing/ipns/other', resolvedURI);
});

test('should replace ipns/ with IPNS gateway prefix', async (t: ExecutionContext<TestContext>) => {
  // Should only replace the first occurrence of ipns/
  const uri = 'ipns/testing/ipns/other';
  const { uri: resolvedURI } = utils.resolveURI(uri, { ipfs: IPFS_GATEWAY } );
  t.is(IPFS_GATEWAY + 'ipns/' + 'testing/ipns/other', resolvedURI);
});

test('should return any URI that does not match any of the previous conditions unchanged', async (t: ExecutionContext<TestContext>) => {
  const uri = 'testing';
  const { uri: resolvedURI } = utils.resolveURI(uri, { ipfs: IPFS_GATEWAY } );
  t.is(uri, resolvedURI);
});
