import avaTest, { ExecutionContext, TestFn } from 'ava';
import { ethers } from 'ethers';
import * as http from 'http';
import got, {
  HTTPError,
  OptionsOfJSONResponseBody,
  OptionsOfTextResponseBody,
} from 'got';
import nock from 'nock';
import listen from 'test-listen';

import { MockEntry } from '../mock/entry.mock';
import { TestContext } from '../mock/interface';
import * as app from './index';
import {
  ADDRESS_ETH_REGISTRY,
  ADDRESS_NAME_WRAPPER,
  SERVER_URL as server_url,
} from './config';
import getNetwork from './service/network';
import { GET_DOMAINS } from './service/subgraph';
import { nockProvider, requireUncached } from '../mock/helper';
import { Metadata } from './service/metadata';

const TEST_NETWORK = 'goerli';

const { WEB3_URL: web3_url, SUBGRAPH_URL: subgraph_url } =
  getNetwork(TEST_NETWORK);

const WEB3_URL = new URL(web3_url);
const SERVER_URL = new URL(server_url);
const SUBGRAPH_URL = new URL(subgraph_url);
const SUBGRAPH_PATH = SUBGRAPH_URL.pathname + SUBGRAPH_URL.search;
const METADATA_PATH = `${TEST_NETWORK}/${ADDRESS_NAME_WRAPPER}`;

const NON_CONTRACT_ADDRESS = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B';

/* Mocks */

const wrappertest3 = new MockEntry({
  name: 'wrappertest3.eth',
  registration: true,
  resolver: { texts: null },
  persist: true,
});
const sub1Wrappertest = new MockEntry({
  name: 'sub1.wrappertest.eth',
  parent: '0x2517c0dfe3a4eebac3456a409c53f824f86070c73d48794d8268ec5c007ee683',
  resolver: { texts: null },
});
const sub2Wrappertest9 = new MockEntry({
  name: 'sub2.wrappertest9.eth',
  image: 'https://i.imgur.com/JcZESMp.png',
  parent: '0x0b00a980e17bfb715fca7267b401b08daa6e750f1bdac52b273e11c46c3e2b9f',
  resolver: { texts: ['avatar'] },
  hasImageKey: true,
});
const unknown = new MockEntry({
  name: 'unknown.name',
  unknown: true,
  registered: false,
});
const unknownRegistered = new MockEntry({
  name: 'something.eth',
  unknown: true,
});
const handle21character = new MockEntry({
  name: 'handle21character.eth',
  registration: true,
  resolver: { texts: null },
});
const supercalifragilisticexpialidocious = new MockEntry({
  name: 'supercalifragilisticexpialidocious.eth',
  registration: true,
  resolver: { texts: null },
});
const longsubdomainconsistof34charactersMdt = new MockEntry({
  name: 'longsubdomainconsistof34characters.mdt.eth',
  registration: true,
  resolver: { texts: null },
});

/* Test Setup */

const test = avaTest as TestFn<TestContext>;
const options: OptionsOfJSONResponseBody | OptionsOfTextResponseBody = {
  prefixUrl: SERVER_URL.toString(),
};

test.before(async (t: ExecutionContext<TestContext>) => {
  nock.disableNetConnect();
  nock.enableNetConnect(SERVER_URL.host);

  nockProvider(WEB3_URL, 'eth_chainId', [], {
    id: 1,
    jsonrpc: '2.0',
    result: '0x05', // goerli
  });
  nockProvider(WEB3_URL, 'net_version', [], {
    jsonrpc: '2.0',
    id: 1,
    result: '5',
  });
  nockProvider(
    WEB3_URL,
    'eth_call',
    [
      {
        to: ADDRESS_NAME_WRAPPER.toLowerCase(),
        data: /^0xfd0cd0.*$/,
      },
      'latest',
    ],
    {
      result:
        '0x0000000000000000000000000000000000000000000000000000000000000001',
    }
  );
  nockProvider(
    WEB3_URL,
    'eth_call',
    [
      {
        to: ADDRESS_ETH_REGISTRY.toLowerCase(),
        data: '0x0178b8bfb9fab6dd33ccdfd1f65ea203855508034652c2e01f585a7b742c3698c0c8d6b1',
      },
      'latest',
    ],
    {
      result:
        '0x0000000000000000000000004d9487c0fa713630a8f3cd8067564a604f0d2989',
    }
  );

  // something.eth recordExist true
  nockProvider(
    WEB3_URL,
    'eth_call',
    [
      {
        to: ADDRESS_ETH_REGISTRY.toLowerCase(),
        data: '0xf79fe5387857c9824139b8a8c3cb04712b41558b4878c55fa9c1e5390e910ee3220c3cce',
      },
      'latest',
    ],
    {
      result:
        '0x0000000000000000000000000000000000000000000000000000000000000001',
    }
  );

  // // NON-contract supportsInterface 0x0
  nockProvider(
    WEB3_URL,
    'eth_call',
    [
      {
        to: NON_CONTRACT_ADDRESS.toLowerCase(),
        data: '0x01ffc9a7e89c48dc00000000000000000000000000000000000000000000000000000000',
      },
      'latest',
    ],
    {
      result:
        '0x0000000000000000000000000000000000000000000000000000000000000000',
    }
  );

  t.context.server = http.createServer(app);
  t.context.prefixUrl = await listen(t.context.server);
});

test.after.always((t: ExecutionContext<TestContext>) => {
  t.context.server.close();
  nock.enableNetConnect();
  delete process.env.PORT;
  delete process.env.ENV;
});

/* Tests */

test('get welcome message', async (t: ExecutionContext<TestContext>) => {
  const result = await got('', options).text();
  t.deepEqual(result, 'Well done mate To see more go to "/docs"!');
});

test('get /:contractAddress/:tokenId for domain (wrappertest3.eth)', async (t: ExecutionContext<TestContext>) => {
  const result: Metadata = await got(
    `${METADATA_PATH}/${wrappertest3.namehash}`,
    options
  ).json();
  delete result.last_request_date;
  t.deepEqual(result, wrappertest3.expect);
});

test('get /:contractAddress/:tokenId by decimal id', async (t: ExecutionContext<TestContext>) => {
  const intId = ethers.BigNumber.from(wrappertest3.namehash).toString();
  const result: Metadata = await got(`${METADATA_PATH}/${intId}`, options).json();
  delete result.last_request_date;
  t.deepEqual(result, wrappertest3.expect);
});

test('get /:contractAddress/:tokenId for subdomain returns auto generated image', async (t: ExecutionContext<TestContext>) => {
  const result: Metadata = await got(
    `${METADATA_PATH}/${sub1Wrappertest.namehash}`,
    options
  ).json();
  delete result.last_request_date;
  t.deepEqual(result, sub1Wrappertest.expect);
});

test('get /:contractAddress/:tokenId for subdomain returns image from text record', async (t: ExecutionContext<TestContext>) => {
  const result: Metadata = await got(
    `${METADATA_PATH}/${sub2Wrappertest9.namehash}`,
    options
  ).json();
  delete result.last_request_date;
  t.deepEqual(result, sub2Wrappertest9.expect);
});

test('get /:contractAddress/:tokenId for a 21 char long domain', async (t: ExecutionContext<TestContext>) => {
  const result: Metadata = await got(
    `${METADATA_PATH}/${handle21character.namehash}`,
    options
  ).json();
  delete result.last_request_date;
  t.deepEqual(result, handle21character.expect);
});

test('get /:contractAddress/:tokenId for a greater than MAX_CHAR long domain', async (t: ExecutionContext<TestContext>) => {
  const result: Metadata = await got(
    `${METADATA_PATH}/${supercalifragilisticexpialidocious.namehash}`,
    options
  ).json();
  delete result.last_request_date;
  t.deepEqual(result, supercalifragilisticexpialidocious.expect);
});

test('get /:contractAddress/:tokenId for a greater than MAX_CHAR long subdomain', async (t: ExecutionContext<TestContext>) => {
  const result: Metadata = await got(
    `${METADATA_PATH}/${longsubdomainconsistof34charactersMdt.namehash}`,
    options
  ).json();
  delete result.last_request_date;
  t.deepEqual(result, longsubdomainconsistof34charactersMdt.expect);
});

test('get /:contractAddress/:tokenId for unknown namehash', async (t: ExecutionContext<TestContext>) => {
  const {
    response: { statusCode, body },
  }: HTTPError = (await t.throwsAsync(
    () => got(`${METADATA_PATH}/${unknown.namehash}`, options),
    { instanceOf: HTTPError }
  )) as HTTPError;
  const message = JSON.parse(body as string)?.message;
  t.is(message, unknown.expect);
  t.is(statusCode, 404);
});

test('get /:contractAddress/:tokenId for unknown namehash on subgraph but registered', async (t: ExecutionContext<TestContext>) => {
  const { message }: { message: Metadata } = await got(
    `${METADATA_PATH}/${unknownRegistered.namehash}`,
    options
  ).json();
  delete message.last_request_date;
  t.deepEqual(message, unknownRegistered.expect);
});

test('get /:contractAddress/:tokenId for empty tokenId', async (t: ExecutionContext<TestContext>) => {
  const {
    response: { statusCode, body },
  }: HTTPError = (await t.throwsAsync(() => got(`${METADATA_PATH}/`, options), {
    instanceOf: HTTPError,
  })) as HTTPError;
  t.assert((body as string).includes(`Cannot GET /${METADATA_PATH}/`));
  t.is(statusCode, 404);
});

test('raise 404 status from subgraph connection', async (t: ExecutionContext<TestContext>) => {
  const fetchError = {
    message: 'nothing here',
    code: '404',
    statusCode: 404,
  };
  nock(SUBGRAPH_URL.origin)
    .post(SUBGRAPH_PATH, {
      query: GET_DOMAINS,
      variables: {
        tokenId: sub1Wrappertest.namehash,
      },
    })
    .replyWithError(fetchError);
  const {
    response: { body, statusCode },
  }: HTTPError = (await t.throwsAsync(
    () =>
      got(`${METADATA_PATH}/${sub1Wrappertest.namehash}`, {
        ...options,
        retry: 0,
      }),
    {
      instanceOf: HTTPError,
    }
  )) as HTTPError;
  const { message } = JSON.parse(body as string);
  // Regardless of what is the message in subgraph with status 404 code
  // user will always see "No results found."" instead
  t.assert(message.includes('No results found.'));
  t.is(statusCode, fetchError.statusCode);
});

test('raise ECONNREFUSED from subgraph connection', async (t: ExecutionContext<TestContext>) => {
  const fetchError = {
    message: 'connect ECONNREFUSED 127.0.0.1:8000',
    code: 'ECONNREFUSED',
    statusCode: 500,
  };
  nock(SUBGRAPH_URL.origin)
    .post(SUBGRAPH_PATH, {
      query: GET_DOMAINS,
      variables: {
        tokenId: sub1Wrappertest.namehash,
      },
    })
    .replyWithError(fetchError);
  const {
    response: { body, statusCode },
  }: HTTPError = (await t.throwsAsync(
    () =>
      got(`${METADATA_PATH}/${sub1Wrappertest.namehash}`, {
        ...options,
        retry: 0,
      }),
    {
      instanceOf: HTTPError,
    }
  )) as HTTPError;
  const { message } = JSON.parse(body as string);
  // Regardless of what is the message in subgraph with status 404 code
  // user will always see "No results found."" instead
  t.assert(message.includes('No results found.'));
  t.is(statusCode, 404);
});

test('raise Internal Server Error from subgraph', async (t: ExecutionContext<TestContext>) => {
  const fetchError = {
    message: 'Internal Server Error',
    code: '500',
    statusCode: 500,
  };
  nock(SUBGRAPH_URL.origin)
    .post(SUBGRAPH_PATH, {
      query: GET_DOMAINS,
      variables: {
        tokenId: sub1Wrappertest.namehash,
      },
    })
    .replyWithError(fetchError);
  const {
    response: { body, statusCode },
  }: HTTPError = (await t.throwsAsync(
    () =>
      got(`${METADATA_PATH}/${sub1Wrappertest.namehash}`, {
        ...options,
        retry: 0,
      }),
    {
      instanceOf: HTTPError,
    }
  )) as HTTPError;
  const { message } = JSON.parse(body as string);
  t.assert(message.includes('No results found.'));
  t.is(statusCode, 404);
});

test('raise timeout from subgraph', async (t: ExecutionContext<TestContext>) => {
  nock(SUBGRAPH_URL.origin)
    .post(SUBGRAPH_PATH, {
      query: GET_DOMAINS,
      variables: {
        tokenId: sub1Wrappertest.namehash,
      },
    })
    .delayConnection(2000) // 2 seconds
    .replyWithError({ code: 'ETIMEDOUT' })
    .persist(false);
  const {
    response: { statusCode },
  }: HTTPError = (await t.throwsAsync(
    () =>
      got(`${METADATA_PATH}/${sub1Wrappertest.namehash}`, {
        ...options,
        retry: 0,
      }),
    {
      instanceOf: HTTPError,
    }
  )) as HTTPError;
  t.assert(statusCode === 404);
});

test('raise ContractMismatchError', async (t: ExecutionContext<TestContext>) => {
  const {
    response: { body },
  }: HTTPError = (await t.throwsAsync(
    () =>
      got(`goerli/${NON_CONTRACT_ADDRESS}/${sub1Wrappertest.namehash}`, {
        ...options,
        retry: 0,
      }),
    {
      instanceOf: HTTPError,
    }
  )) as HTTPError;
  const { message } = JSON.parse(body as string);
  t.assert(
    message ===
      `${NON_CONTRACT_ADDRESS} does not match with any ENS related contract`
  );
});

test('should get assets when ENV set for local', async (t: ExecutionContext<TestContext>) => {
  process.env.ENV = 'local';
  process.env.PORT = '8081';
  nock.enableNetConnect('localhost:8081');
  const _app = requireUncached('../src/index');
  t.context.server = http.createServer(_app);
  t.context.prefixUrl = await listen(t.context.server);
  const result = await got(`assets/doc_output.json`, {
    prefixUrl: 'http://localhost:8081',
  }).text();
  t.assert(result.includes('openapi'));
});
