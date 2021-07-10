const test = require('ava');
const http = require('http');
const got = require('got');
const nock = require('nock');
const listen = require('test-listen');
const app = require('../src/index');
const { GET_DOMAINS, GET_REGISTRATIONS } = require('../src/subgraph');
const {
  INFURA_URL: infura_url,
  SERVER_URL: server_url,
  SUBGRAPH_URL: subgraph_url,
} = require('../src/config');

const INFURA_URL = new URL(infura_url);
const SERVER_URL = new URL(server_url);
const SUBGRAPH_URL = new URL(subgraph_url);

/* Mocks */

const mockNameHash = {
  sub1: '0xb71788e9ec63be108fba9c0b01c927e4d8f1887d53787ff84752be3d8db1dd9a',
  unknown: '0xb71788e9ec63be108fba9c0b01c927e4d8f1887d53787ff84752be3d8db1dd7a',
};
const mockEntry = {
  [mockNameHash.sub1]: {
    request: {
      domain: {
        createdAt: '1623949711',
        id: mockNameHash.sub1,
        labelName: 'sub1',
        labelhash:
          '0xa1e88fc092423bff23900aa3a6d8db1e4cf13228561f14764bcd089c587070dc',
        name: 'sub1.wrappertest.eth',
        owner: { id: '0x97ba55f61345665cf08c4233b9d6e61051a43b18' },
        parent: {
          id: '0x2517c0dfe3a4eebac3456a409c53f824f86070c73d48794d8268ec5c007ee683',
        },
        resolver: null,
      },
    },
    response: {
      name: 'sub1.wrappertest.eth',
      description: 'sub1.wrappertest.eth',
      image:
        'data:image/svg+xml;base64,CiAgPHN2ZyB3aWR0aD0iMjg2IiBoZWlnaHQ9IjI3MCIgdmlld0JveD0iMCAwIDI4NiAyNzAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgICA8cmVjdCB3aWR0aD0iMjg2IiBoZWlnaHQ9IjI3MCIgcng9IjI0IiBmaWxsPSJ1cmwoI3BhaW50MF9saW5lYXIpIi8+CiAgICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzMCwzMCkiPgogICAgICA8cGF0aCBkPSJNNi4wMzk3MiAxOS4wODc1QzYuNTAxMjMgMjAuMDg0MSA3LjY0MzQ2IDIyLjA1NDEgNy42NDM0NiAyMi4wNTQxTDIwLjg0ODQgMEw3Ljk2MDc1IDkuMDkyMDVDNy4xOTI4MyA5LjYwOTYyIDYuNTYyOCAxMC4zMTAyIDYuMTI2MjUgMTEuMTMxOUM1LjUzOTI4IDEyLjM3MTYgNS4yMjc0MiAxMy43MjU5IDUuMjEyNDggMTUuMUM1LjE5NzUzIDE2LjQ3NDIgNS40Nzk4NiAxNy44MzUxIDYuMDM5NzIgMTkuMDg3NVoiIGZpbGw9IndoaXRlIi8+CiAgICAgIDxwYXRoIGQ9Ik0wLjE1MjAxNCAyNy4xNjcyQzAuMzAyNDEzIDI5LjI3NzEgMC45MTIyMDIgMzEuMzMxMiAxLjk0MDU1IDMzLjE5MTlDMi45Njg4OSAzNS4wNTI3IDQuMzkyMDYgMzYuNjc3MiA2LjExNDc1IDM3Ljk1NjdMMjAuODQ4NyA0OEMyMC44NDg3IDQ4IDExLjYzMDMgMzUuMDEzIDMuODU0ODcgMjIuMDkwMkMzLjA2NzY5IDIwLjcyNDkgMi41Mzg1IDE5LjIzMjIgMi4yOTI2MyAxNy42ODM1QzIuMTgzOCAxNi45ODIyIDIuMTgzOCAxNi4yNjg5IDIuMjkyNjMgMTUuNTY3NkMyLjA4OTkgMTUuOTM0OCAxLjY5NjM2IDE2LjY4NjcgMS42OTYzNiAxNi42ODY3QzAuOTA3OTY0IDE4LjI1ODYgMC4zNzEwMjkgMTkuOTM5NCAwLjEwNDMxMiAyMS42NzA1Qy0wLjA0OTIwODEgMjMuNTAwNCAtMC4wMzMyNDI2IDI1LjM0MDEgMC4xNTIwMTQgMjcuMTY3MloiIGZpbGw9IndoaXRlIi8+CiAgICAgIDxwYXRoIGQ9Ik0zOC4xOTI3IDI4LjkxMjVDMzcuNjkyOCAyNy45MTU5IDM2LjQ1NTUgMjUuOTQ2IDM2LjQ1NTUgMjUuOTQ2TDIyLjE1MTQgNDhMMzYuMTExOCAzOC45MTM4QzM2Ljk0MzYgMzguMzk2MiAzNy42MjYxIDM3LjY5NTYgMzguMDk5IDM2Ljg3MzlDMzguNzM1OCAzNS42MzM0IDM5LjA3NDEgMzQuMjc4MSAzOS4wOTAzIDMyLjkwMjlDMzkuMTA2NSAzMS41Mjc3IDM4LjgwMDEgMzAuMTY1NyAzOC4xOTI3IDI4LjkxMjVaIiBmaWxsPSJ3aGl0ZSIvPgogICAgICA8cGF0aCBkPSJNNDIuODUxMiAyMC44MzI4QzQyLjcwMDggMTguNzIyOSA0Mi4wOTA5IDE2LjY2ODggNDEuMDYyNCAxNC44MDgxQzQwLjAzMzkgMTIuOTQ3MyAzOC42MTA1IDExLjMyMjggMzYuODg3NiAxMC4wNDMzTDIyLjE1MTQgMEMyMi4xNTE0IDAgMzEuMzY1MiAxMi45ODcgMzkuMTQ3OCAyNS45MDk4QzM5LjkzMyAyNy4yNzU1IDQwLjQ2MDMgMjguNzY4MiA0MC43MDQzIDMwLjMxNjVDNDAuODEzMiAzMS4wMTc4IDQwLjgxMzIgMzEuNzMxMSA0MC43MDQzIDMyLjQzMjRDNDAuOTA3MSAzMi4wNjUyIDQxLjMwMDcgMzEuMzEzMyA0MS4zMDA3IDMxLjMxMzNDNDIuMDg5MiAyOS43NDE0IDQyLjYyNjIgMjguMDYwNiA0Mi44OTMgMjYuMzI5NUM0My4wNDg1IDI0LjQ5OTggNDMuMDM0NSAyMi42NiA0Mi44NTEyIDIwLjgzMjhaIiBmaWxsPSJ3aGl0ZSIvPgogICAgPC9nPgogICAgCiAgICA8dGV4dAogICAgICB4PSIzMCIKICAgICAgeT0iMjAwIgogICAgICBmb250LXNpemU9IjM1cHgiCiAgICAgIGZpbGw9IndoaXRlIgogICAgPgogICAgICBzdWIxLgogICAgPC90ZXh0PgogICAgCiAgICA8dGV4dAogICAgICB4PSIzMCIKICAgICAgeT0iMjM1IgogICAgICBmb250LXNpemU9IjI3cHgiCiAgICAgIG9wYWNpdHk9IjAuNCIKICAgICAgZmlsbD0id2hpdGUiCiAgICA+CiAgICAgIHdyYXBwZXJ0ZXN0LmV0aAogICAgPC90ZXh0PgogICAgPGRlZnM+CiAgICAgIDxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI+QGltcG9ydCB1cmwoJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA4MC9hc3NldHMvZm9udC5jc3MnKTs8L3N0eWxlPgogICAgICA8c3R5bGU+CiAgICAgICAgdGV4dCB7CiAgICAgICAgICBmb250LWZhbWlseTpQbHVzSmFrYXJ0YVNhbnM7CiAgICAgICAgICBmb250LXdlaWdodDpib2xkOwogICAgICAgICAgZm9udC1zdHlsZTogbm9ybWFsOwogICAgICAgICAgbGluZS1oZWlnaHQ6IDM0cHg7CiAgICAgICAgICBsZXR0ZXItc3BhY2luZzotMC4wMWVtOwogICAgICAgIH0KICAgICAgPC9zdHlsZT4KICAgICAgPGxpbmVhckdyYWRpZW50IGlkPSJwYWludDBfbGluZWFyIiB4MT0iMCIgeTE9IjAiIHgyPSIyNjkuNTUzIiB5Mj0iMjg1LjUyNyIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgogICAgICAgIDxzdG9wIHN0b3AtY29sb3I9IiMyRUU2Q0YiLz4KICAgICAgICA8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM1QjUxRDEiLz4KICAgICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDwvZGVmcz4KICA8L3N2Zz4KICA=',
      image_url:
        'data:image/svg+xml;base64,CiAgPHN2ZyB3aWR0aD0iMjg2IiBoZWlnaHQ9IjI3MCIgdmlld0JveD0iMCAwIDI4NiAyNzAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgICA8cmVjdCB3aWR0aD0iMjg2IiBoZWlnaHQ9IjI3MCIgcng9IjI0IiBmaWxsPSJ1cmwoI3BhaW50MF9saW5lYXIpIi8+CiAgICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzMCwzMCkiPgogICAgICA8cGF0aCBkPSJNNi4wMzk3MiAxOS4wODc1QzYuNTAxMjMgMjAuMDg0MSA3LjY0MzQ2IDIyLjA1NDEgNy42NDM0NiAyMi4wNTQxTDIwLjg0ODQgMEw3Ljk2MDc1IDkuMDkyMDVDNy4xOTI4MyA5LjYwOTYyIDYuNTYyOCAxMC4zMTAyIDYuMTI2MjUgMTEuMTMxOUM1LjUzOTI4IDEyLjM3MTYgNS4yMjc0MiAxMy43MjU5IDUuMjEyNDggMTUuMUM1LjE5NzUzIDE2LjQ3NDIgNS40Nzk4NiAxNy44MzUxIDYuMDM5NzIgMTkuMDg3NVoiIGZpbGw9IndoaXRlIi8+CiAgICAgIDxwYXRoIGQ9Ik0wLjE1MjAxNCAyNy4xNjcyQzAuMzAyNDEzIDI5LjI3NzEgMC45MTIyMDIgMzEuMzMxMiAxLjk0MDU1IDMzLjE5MTlDMi45Njg4OSAzNS4wNTI3IDQuMzkyMDYgMzYuNjc3MiA2LjExNDc1IDM3Ljk1NjdMMjAuODQ4NyA0OEMyMC44NDg3IDQ4IDExLjYzMDMgMzUuMDEzIDMuODU0ODcgMjIuMDkwMkMzLjA2NzY5IDIwLjcyNDkgMi41Mzg1IDE5LjIzMjIgMi4yOTI2MyAxNy42ODM1QzIuMTgzOCAxNi45ODIyIDIuMTgzOCAxNi4yNjg5IDIuMjkyNjMgMTUuNTY3NkMyLjA4OTkgMTUuOTM0OCAxLjY5NjM2IDE2LjY4NjcgMS42OTYzNiAxNi42ODY3QzAuOTA3OTY0IDE4LjI1ODYgMC4zNzEwMjkgMTkuOTM5NCAwLjEwNDMxMiAyMS42NzA1Qy0wLjA0OTIwODEgMjMuNTAwNCAtMC4wMzMyNDI2IDI1LjM0MDEgMC4xNTIwMTQgMjcuMTY3MloiIGZpbGw9IndoaXRlIi8+CiAgICAgIDxwYXRoIGQ9Ik0zOC4xOTI3IDI4LjkxMjVDMzcuNjkyOCAyNy45MTU5IDM2LjQ1NTUgMjUuOTQ2IDM2LjQ1NTUgMjUuOTQ2TDIyLjE1MTQgNDhMMzYuMTExOCAzOC45MTM4QzM2Ljk0MzYgMzguMzk2MiAzNy42MjYxIDM3LjY5NTYgMzguMDk5IDM2Ljg3MzlDMzguNzM1OCAzNS42MzM0IDM5LjA3NDEgMzQuMjc4MSAzOS4wOTAzIDMyLjkwMjlDMzkuMTA2NSAzMS41Mjc3IDM4LjgwMDEgMzAuMTY1NyAzOC4xOTI3IDI4LjkxMjVaIiBmaWxsPSJ3aGl0ZSIvPgogICAgICA8cGF0aCBkPSJNNDIuODUxMiAyMC44MzI4QzQyLjcwMDggMTguNzIyOSA0Mi4wOTA5IDE2LjY2ODggNDEuMDYyNCAxNC44MDgxQzQwLjAzMzkgMTIuOTQ3MyAzOC42MTA1IDExLjMyMjggMzYuODg3NiAxMC4wNDMzTDIyLjE1MTQgMEMyMi4xNTE0IDAgMzEuMzY1MiAxMi45ODcgMzkuMTQ3OCAyNS45MDk4QzM5LjkzMyAyNy4yNzU1IDQwLjQ2MDMgMjguNzY4MiA0MC43MDQzIDMwLjMxNjVDNDAuODEzMiAzMS4wMTc4IDQwLjgxMzIgMzEuNzMxMSA0MC43MDQzIDMyLjQzMjRDNDAuOTA3MSAzMi4wNjUyIDQxLjMwMDcgMzEuMzEzMyA0MS4zMDA3IDMxLjMxMzNDNDIuMDg5MiAyOS43NDE0IDQyLjYyNjIgMjguMDYwNiA0Mi44OTMgMjYuMzI5NUM0My4wNDg1IDI0LjQ5OTggNDMuMDM0NSAyMi42NiA0Mi44NTEyIDIwLjgzMjhaIiBmaWxsPSJ3aGl0ZSIvPgogICAgPC9nPgogICAgCiAgICA8dGV4dAogICAgICB4PSIzMCIKICAgICAgeT0iMjAwIgogICAgICBmb250LXNpemU9IjM1cHgiCiAgICAgIGZpbGw9IndoaXRlIgogICAgPgogICAgICBzdWIxLgogICAgPC90ZXh0PgogICAgCiAgICA8dGV4dAogICAgICB4PSIzMCIKICAgICAgeT0iMjM1IgogICAgICBmb250LXNpemU9IjI3cHgiCiAgICAgIG9wYWNpdHk9IjAuNCIKICAgICAgZmlsbD0id2hpdGUiCiAgICA+CiAgICAgIHdyYXBwZXJ0ZXN0LmV0aAogICAgPC90ZXh0PgogICAgPGRlZnM+CiAgICAgIDxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI+QGltcG9ydCB1cmwoJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA4MC9hc3NldHMvZm9udC5jc3MnKTs8L3N0eWxlPgogICAgICA8c3R5bGU+CiAgICAgICAgdGV4dCB7CiAgICAgICAgICBmb250LWZhbWlseTpQbHVzSmFrYXJ0YVNhbnM7CiAgICAgICAgICBmb250LXdlaWdodDpib2xkOwogICAgICAgICAgZm9udC1zdHlsZTogbm9ybWFsOwogICAgICAgICAgbGluZS1oZWlnaHQ6IDM0cHg7CiAgICAgICAgICBsZXR0ZXItc3BhY2luZzotMC4wMWVtOwogICAgICAgIH0KICAgICAgPC9zdHlsZT4KICAgICAgPGxpbmVhckdyYWRpZW50IGlkPSJwYWludDBfbGluZWFyIiB4MT0iMCIgeTE9IjAiIHgyPSIyNjkuNTUzIiB5Mj0iMjg1LjUyNyIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgogICAgICAgIDxzdG9wIHN0b3AtY29sb3I9IiMyRUU2Q0YiLz4KICAgICAgICA8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM1QjUxRDEiLz4KICAgICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDwvZGVmcz4KICA8L3N2Zz4KICA=',
      external_link: 'https://ens.domains/name/sub1.wrappertest.eth',
      attributes: [
        {
          display_type: 'date',
          trait_type: 'Created Date',
          value: 1623949711000,
        },
      ],
    },
  },
  [mockNameHash.unknown]: {
    request: {
      domain: {},
    },
    response: {
      name: '',
      description: '',
      image: '',
      image_url: '',
      external_link: '',
      attributes: '',
    },
  },
};

/* Helper functions */

function nockGraph(namehash: string, statusCode = 200) {
  nock(SUBGRAPH_URL.origin)
    .post(SUBGRAPH_URL.pathname, {
      query: GET_DOMAINS,
      variables: {
        tokenId: namehash,
      },
    })
    .reply(statusCode, {
      data: mockEntry[namehash].request,
    });
}

/* Test Setup */

test.before(async (t: { context: any }) => {
  nock.disableNetConnect();
  nock.enableNetConnect(SERVER_URL.host);

  // nock(INFURA_URL.origin)
  //   .get(INFURA_URL.pathname)
  //   .reply(200, {
  //     data: "testing here",
  //   });

  nockGraph(mockNameHash.sub1);
  nockGraph(mockNameHash.unknown);

  t.context.server = http.createServer(app);
  t.context.prefixUrl = await listen(t.context.server);
});

test.after.always((t: { context: any }) => {
  t.context.server.close();
  nock.enableNetConnect();
});

/* Tests */

test('get welcome message', async (t: any) => {
  const result = await got('', {
    prefixUrl: SERVER_URL,
  }).text();
  t.deepEqual(result, 'Well done mate!');
});

test('get /name/:tokenId', async (t: any) => {
  const result = await got(`name/${mockNameHash.sub1}`, {
    prefixUrl: SERVER_URL,
  }).json();
  t.deepEqual(result, mockEntry[mockNameHash.sub1].response);
});

test('get unknown /name/:tokenId', async (t: any) => {
  const result = await got(`name/${mockNameHash.unknown}`, {
    prefixUrl: SERVER_URL,
  }).json();
  t.deepEqual(result, mockEntry[mockNameHash.unknown].response);
});
