import avaTest, { ExecutionContext, TestInterface } from 'ava';
import { TestContext } from './interface';
import { IPFS_GATEWAY, IPNS_GATEWAY } from '../src/config';
import { AvatarMetadata } from '../src/avatar';

const test = avaTest as TestInterface<TestContext>;

test('should return data URIs without any changes', async (t: ExecutionContext<TestContext>) => {
  const uri = 'data:text/plain;base64,dGVzdGluZw==';
  t.is(uri, AvatarMetadata.parseURI(uri));
});

test('should return http URIs without any changes', async (t: ExecutionContext<TestContext>) => {
  const uri = 'https://app.ens.domains';
  t.is(uri, AvatarMetadata.parseURI(uri));
});

test('should replace ipfs://ipfs/ with IPFS gateway prefix', async (t: ExecutionContext<TestContext>) => {
  const uri = 'ipfs://ipfs/QmUbTVz1L4uEvAPg5QcSu8Pow1YdwshDJ8VbyYjWaJv4JP';
  t.is(
    IPFS_GATEWAY + 'QmUbTVz1L4uEvAPg5QcSu8Pow1YdwshDJ8VbyYjWaJv4JP',
    AvatarMetadata.parseURI(uri)
  );
});

test('should replace ipfs:// with IPFS gateway prefix', async (t: ExecutionContext<TestContext>) => {
  const uri = 'ipfs://QmUbTVz1L4uEvAPg5QcSu8Pow1YdwshDJ8VbyYjWaJv4JP';
  t.is(
    IPFS_GATEWAY + 'QmUbTVz1L4uEvAPg5QcSu8Pow1YdwshDJ8VbyYjWaJv4JP',
    AvatarMetadata.parseURI(uri)
  );
});

test('should replace /ipfs/ with IPFS gateway prefix', async (t: ExecutionContext<TestContext>) => {
  const uri = '/ipfs/QmUbTVz1L4uEvAPg5QcSu8Pow1YdwshDJ8VbyYjWaJv4JP';
  t.is(
    IPFS_GATEWAY + 'QmUbTVz1L4uEvAPg5QcSu8Pow1YdwshDJ8VbyYjWaJv4JP',
    AvatarMetadata.parseURI(uri)
  );
});

test('should replace ipfs/ with IPFS gateway prefix', async (t: ExecutionContext<TestContext>) => {
  const uri = 'ipfs/QmUbTVz1L4uEvAPg5QcSu8Pow1YdwshDJ8VbyYjWaJv4JP';
  t.is(
    IPFS_GATEWAY + 'QmUbTVz1L4uEvAPg5QcSu8Pow1YdwshDJ8VbyYjWaJv4JP',
    AvatarMetadata.parseURI(uri)
  );
});

test('should recognize ipfs hash with subpath', async (t: ExecutionContext<TestContext>) => {
  const uri =
    'ipfs/QmUbTVz1L4uEvAPg5QcSu8Pow1YdwshDJ8VbyYjWaJv4JP/avatar/name.jpg';
  t.is(
    IPFS_GATEWAY +
      'QmUbTVz1L4uEvAPg5QcSu8Pow1YdwshDJ8VbyYjWaJv4JP/avatar/name.jpg',
    AvatarMetadata.parseURI(uri)
  );
});

test('should prefix CIDs with IPFS gateway prefix', async (t: ExecutionContext<TestContext>) => {
  const cidv0 = 'QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR';
  t.is(IPFS_GATEWAY + cidv0, AvatarMetadata.parseURI(cidv0));
  const cidv1 = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
  t.is(IPFS_GATEWAY + cidv1, AvatarMetadata.parseURI(cidv1));
});

test('should replace ipfs://ipns/ with IPNS gateway prefix', async (t: ExecutionContext<TestContext>) => {
  const uri = 'ipfs://ipns/testing';
  t.is(IPNS_GATEWAY + 'testing', AvatarMetadata.parseURI(uri));
});

test('should replace ipns://ipns/ with IPNS gateway prefix', async (t: ExecutionContext<TestContext>) => {
  const uri = 'ipns://ipns/testing';
  t.is(IPNS_GATEWAY + 'testing', AvatarMetadata.parseURI(uri));
});

test('should replace ipns:// with IPNS gateway prefix', async (t: ExecutionContext<TestContext>) => {
  const uri = 'ipns://testing';
  t.is(IPNS_GATEWAY + 'testing', AvatarMetadata.parseURI(uri));
});

test('should replace /ipns/ with IPNS gateway prefix', async (t: ExecutionContext<TestContext>) => {
  // Should only replace the first occurence of /ipns/
  const uri = '/ipns/testing/ipns/other';
  t.is(IPNS_GATEWAY + 'testing/ipns/other', AvatarMetadata.parseURI(uri));
});

test('should replace ipns/ with IPNS gateway prefix', async (t: ExecutionContext<TestContext>) => {
  // Should only replace the first occurence of ipns/
  const uri = 'ipns/testing/ipns/other';
  t.is(IPNS_GATEWAY + 'testing/ipns/other', AvatarMetadata.parseURI(uri));
});

test('should return any URI that does not match any of the previous conditions unchanged', async (t: ExecutionContext<TestContext>) => {
  const uri = 'testing';
  t.is(uri, AvatarMetadata.parseURI(uri));
});
