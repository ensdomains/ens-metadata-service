import avaTest, { ExecutionContext, TestFn } from 'ava';
import { utils } from '@ensdomains/ens-avatar'
import urlJoin from 'url-join';
import { JsonRpcProvider } from 'ethers';
import sinon from 'sinon';

import { TestContext } from '../../mock/interface';
import { IPFS_GATEWAY } from '../config';
import { AvatarMetadata, getAvatarImage, getAvatarMeta, getHeaderImage, getHeaderMeta } from './avatar';

const test = avaTest as TestFn<TestContext>;

test('should return data URIs without any changes', async (t: ExecutionContext<TestContext>) => {
  const uri = 'data:image/png;base64,dGVzdGluZw==';
  const { uri: resolvedURI } = utils.resolveURI(uri, { ipfs: IPFS_GATEWAY } );
  t.is(uri, 'data:image/png;base64,' + resolvedURI);
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
    urlJoin(IPFS_GATEWAY, 'ipfs', 'QmUbTVz1L4uEvAPg5QcSu8Pow1YdwshDJ8VbyYjWaJv4JP'),
    resolvedURI
  );
});

test('should replace ipfs:// with IPFS gateway prefix', async (t: ExecutionContext<TestContext>) => {
  const uri = 'ipfs://QmUbTVz1L4uEvAPg5QcSu8Pow1YdwshDJ8VbyYjWaJv4JP';
  const { uri: resolvedURI } = utils.resolveURI(uri, { ipfs: IPFS_GATEWAY } );
  t.is(
    urlJoin(IPFS_GATEWAY, 'ipfs', 'QmUbTVz1L4uEvAPg5QcSu8Pow1YdwshDJ8VbyYjWaJv4JP'),
    resolvedURI
  );
});

test('should replace /ipfs/ with IPFS gateway prefix', async (t: ExecutionContext<TestContext>) => {
  const uri = '/ipfs/QmUbTVz1L4uEvAPg5QcSu8Pow1YdwshDJ8VbyYjWaJv4JP';
  const { uri: resolvedURI } = utils.resolveURI(uri, { ipfs: IPFS_GATEWAY } );
  t.is(
    urlJoin(IPFS_GATEWAY, 'ipfs', 'QmUbTVz1L4uEvAPg5QcSu8Pow1YdwshDJ8VbyYjWaJv4JP'),
    resolvedURI
  );
});

test('should replace ipfs/ with IPFS gateway prefix', async (t: ExecutionContext<TestContext>) => {
  const uri = 'ipfs/QmUbTVz1L4uEvAPg5QcSu8Pow1YdwshDJ8VbyYjWaJv4JP';
  const { uri: resolvedURI } = utils.resolveURI(uri, { ipfs: IPFS_GATEWAY } );
  t.is(
    urlJoin(IPFS_GATEWAY, 'ipfs', 'QmUbTVz1L4uEvAPg5QcSu8Pow1YdwshDJ8VbyYjWaJv4JP'),
    resolvedURI
  );
});

test('should recognize ipfs hash with subpath', async (t: ExecutionContext<TestContext>) => {
  const uri =
    'ipfs/QmUbTVz1L4uEvAPg5QcSu8Pow1YdwshDJ8VbyYjWaJv4JP/avatar/name.jpg';
  const { uri: resolvedURI } = utils.resolveURI(uri, { ipfs: IPFS_GATEWAY } );
  t.is(
    urlJoin(IPFS_GATEWAY, 'ipfs', 'QmUbTVz1L4uEvAPg5QcSu8Pow1YdwshDJ8VbyYjWaJv4JP/avatar/name.jpg'),
    resolvedURI
  );
});

test('should prefix CIDs with IPFS gateway prefix', async (t: ExecutionContext<TestContext>) => {
  const cidv0 = 'QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR';
  const { uri: resolvedURIv0 } = utils.resolveURI(cidv0, { ipfs: IPFS_GATEWAY });
  t.is(urlJoin(IPFS_GATEWAY, 'ipfs', cidv0), resolvedURIv0);
  const cidv1 = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
  const { uri: resolvedURIv1 } = utils.resolveURI(cidv1, { ipfs: IPFS_GATEWAY });
  t.is(urlJoin(IPFS_GATEWAY, 'ipfs', cidv1), resolvedURIv1);
});

test('should replace ipfs://ipns/ with IPNS gateway prefix', async (t: ExecutionContext<TestContext>) => {
  const uri = 'ipfs://ipns/testing';
  const { uri: resolvedURI } = utils.resolveURI(uri, { ipfs: IPFS_GATEWAY } );
  t.is(urlJoin(IPFS_GATEWAY, 'ipns', 'testing'), resolvedURI);
});

test('should replace ipns://ipns/ with IPNS gateway prefix', async (t: ExecutionContext<TestContext>) => {
  const uri = 'ipns://ipns/testing';
  const { uri: resolvedURI } = utils.resolveURI(uri, { ipfs: IPFS_GATEWAY } );
  t.is(urlJoin(IPFS_GATEWAY, 'ipns', 'testing'), resolvedURI);
});

test('should replace ipns:// with IPNS gateway prefix', async (t: ExecutionContext<TestContext>) => {
  const uri = 'ipns://testing';
  const { uri: resolvedURI } = utils.resolveURI(uri, { ipfs: IPFS_GATEWAY } );
  t.is(urlJoin(IPFS_GATEWAY, 'ipns', 'testing'), resolvedURI);
});

test('should replace /ipns/ with IPNS gateway prefix', async (t: ExecutionContext<TestContext>) => {
  // Should only replace the first occurrence of /ipns/
  const uri = '/ipns/testing/ipns/other';
  const { uri: resolvedURI } = utils.resolveURI(uri, { ipfs: IPFS_GATEWAY } );
  t.is(urlJoin(IPFS_GATEWAY, 'ipns', 'testing/ipns/other'), resolvedURI);
});

test('should replace ipns/ with IPNS gateway prefix', async (t: ExecutionContext<TestContext>) => {
  // Should only replace the first occurrence of ipns/
  const uri = 'ipns/testing/ipns/other';
  const { uri: resolvedURI } = utils.resolveURI(uri, { ipfs: IPFS_GATEWAY } );
  t.is(urlJoin(IPFS_GATEWAY, 'ipns', 'testing/ipns/other'), resolvedURI);
});

test('should return any URI that does not match any of the previous conditions unchanged', async (t: ExecutionContext<TestContext>) => {
  const uri = 'testing';
  const { uri: resolvedURI } = utils.resolveURI(uri, { ipfs: IPFS_GATEWAY } );
  t.is(uri, resolvedURI);
});

// Header support tests

test('AvatarMetadata.getImage should call getAvatar when type is "avatar"', async (t: ExecutionContext<TestContext>) => {
  const mockProvider = {} as JsonRpcProvider;
  const testName = 'test.eth';
  const avatarMetadata = new AvatarMetadata(mockProvider, testName);

  const mockAvatarURI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const getAvatarStub = sinon.stub(avatarMetadata.avtResolver, 'getAvatar').resolves(mockAvatarURI);

  try {
    const [buffer, mimeType] = await avatarMetadata.getImage('avatar');

    t.true(getAvatarStub.calledOnce);
    t.is(mimeType, 'image/png');
    t.true(buffer instanceof Buffer);
  } finally {
    getAvatarStub.restore();
  }
});

test('AvatarMetadata.getImage should call getHeader when type is "header"', async (t: ExecutionContext<TestContext>) => {
  const mockProvider = {} as JsonRpcProvider;
  const testName = 'test.eth';
  const avatarMetadata = new AvatarMetadata(mockProvider, testName);

  const mockHeaderURI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const getHeaderStub = sinon.stub(avatarMetadata.avtResolver, 'getHeader').resolves(mockHeaderURI);

  try {
    const [buffer, mimeType] = await avatarMetadata.getImage('header');

    t.true(getHeaderStub.calledOnce);
    t.is(mimeType, 'image/png');
    t.true(buffer instanceof Buffer);
  } finally {
    getHeaderStub.restore();
  }
});

test('AvatarMetadata.getMeta should call getMetadata with "avatar" key by default', async (t: ExecutionContext<TestContext>) => {
  const mockProvider = {} as JsonRpcProvider;
  const testName = 'test.eth';
  const networkName = 'mainnet';
  const avatarMetadata = new AvatarMetadata(mockProvider, testName);

  const mockMetadata = {
    image: 'https://example.com/avatar.png',
    name: 'Test Avatar',
    description: 'Test description'
  };
  const getMetadataStub = sinon.stub(avatarMetadata.avtResolver, 'getMetadata').resolves(mockMetadata);

  try {
    const result = await avatarMetadata.getMeta(networkName);

    t.true(getMetadataStub.calledOnce);
    t.true(getMetadataStub.calledWith(testName, 'avatar'));
    t.is(result.image, mockMetadata.image.replace(IPFS_GATEWAY, 'https://ipfs.io'));
  } finally {
    getMetadataStub.restore();
  }
});

test('AvatarMetadata.getMeta should call getMetadata with "header" key when specified', async (t: ExecutionContext<TestContext>) => {
  const mockProvider = {} as JsonRpcProvider;
  const testName = 'test.eth';
  const networkName = 'mainnet';
  const avatarMetadata = new AvatarMetadata(mockProvider, testName);

  const mockMetadata = {
    image: 'https://example.com/header.png',
    name: 'Test Header',
    description: 'Test header description'
  };
  const getMetadataStub = sinon.stub(avatarMetadata.avtResolver, 'getMetadata').resolves(mockMetadata);

  try {
    const result = await avatarMetadata.getMeta(networkName, 'header');

    t.true(getMetadataStub.calledOnce);
    t.true(getMetadataStub.calledWith(testName, 'header'));
    t.is(result.image, mockMetadata.image.replace(IPFS_GATEWAY, 'https://ipfs.io'));
  } finally {
    getMetadataStub.restore();
  }
});

test('getHeaderImage should call AvatarMetadata.getImage with "header" type', async (t: ExecutionContext<TestContext>) => {
  const mockProvider = {} as JsonRpcProvider;
  const testName = 'test.eth';

  const mockHeaderURI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const getImageStub = sinon.stub(AvatarMetadata.prototype, 'getImage').resolves([Buffer.from('test'), 'image/png']);

  try {
    const [buffer, mimeType] = await getHeaderImage(mockProvider, testName);

    t.true(getImageStub.calledOnce);
    t.true(getImageStub.calledWith('header'));
    t.is(mimeType, 'image/png');
    t.true(buffer instanceof Buffer);
  } finally {
    getImageStub.restore();
  }
});

test('getHeaderMeta should call AvatarMetadata.getMeta with "header" key', async (t: ExecutionContext<TestContext>) => {
  const mockProvider = {} as JsonRpcProvider;
  const testName = 'test.eth';
  const networkName = 'mainnet';

  const mockMetadata = {
    image: 'https://example.com/header.png',
    name: 'Test Header',
    description: 'Test header description'
  };
  const getMetaStub = sinon.stub(AvatarMetadata.prototype, 'getMeta').resolves(mockMetadata);

  try {
    const result = await getHeaderMeta(mockProvider, testName, networkName);

    t.true(getMetaStub.calledOnce);
    t.true(getMetaStub.calledWith(networkName, 'header'));
    t.is(result.image, mockMetadata.image);
  } finally {
    getMetaStub.restore();
  }
});

test('getAvatarImage should call AvatarMetadata.getImage with "avatar" type', async (t: ExecutionContext<TestContext>) => {
  const mockProvider = {} as JsonRpcProvider;
  const testName = 'test.eth';

  const mockAvatarURI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const getImageStub = sinon.stub(AvatarMetadata.prototype, 'getImage').resolves([Buffer.from('test'), 'image/png']);

  try {
    const [buffer, mimeType] = await getAvatarImage(mockProvider, testName);

    t.true(getImageStub.calledOnce);
    t.true(getImageStub.calledWith('avatar'));
    t.is(mimeType, 'image/png');
    t.true(buffer instanceof Buffer);
  } finally {
    getImageStub.restore();
  }
});

test('getAvatarMeta should call AvatarMetadata.getMeta with "avatar" key', async (t: ExecutionContext<TestContext>) => {
  const mockProvider = {} as JsonRpcProvider;
  const testName = 'test.eth';
  const networkName = 'mainnet';

  const mockMetadata = {
    image: 'https://example.com/avatar.png',
    name: 'Test Avatar',
    description: 'Test avatar description'
  };
  const getMetaStub = sinon.stub(AvatarMetadata.prototype, 'getMeta').resolves(mockMetadata);

  try {
    const result = await getAvatarMeta(mockProvider, testName, networkName);

    t.true(getMetaStub.calledOnce);
    t.true(getMetaStub.calledWith(networkName, 'avatar'));
    t.is(result.image, mockMetadata.image);
  } finally {
    getMetaStub.restore();
  }
});
