import avaTest, { ExecutionContext, TestInterface } from 'ava';
import * as http from 'http';
import got, {
  HTTPError,
  OptionsOfJSONResponseBody,
  OptionsOfTextResponseBody,
} from 'got';
import nock from 'nock';
import listen from 'test-listen';

import * as app from '../src/index';
import { GET_DOMAINS } from '../src/subgraph';
import {
  INFURA_URL as infura_url,
  SERVER_URL as server_url,
  SUBGRAPH_URL as subgraph_url,
} from '../src/config';
import { MockEntry } from './entry.mock';
import {
  EthCallResponse,
  EthChainIdResponse,
  NetVersionResponse,
  TestContext,
} from './interface';

const INFURA_URL = new URL(infura_url);
const SERVER_URL = new URL(server_url);
const SUBGRAPH_URL = new URL(subgraph_url);

/* Mocks */

const wrappertest3 = new MockEntry({
  name: 'wrappertest3.eth',
  image:
    'data:image/svg+xml;base64,CiAgPHN2ZyB3aWR0aD0iMjg2IiBoZWlnaHQ9IjI3MCIgdmlld0JveD0iMCAwIDI4NiAyNzAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgICA8cmVjdCB3aWR0aD0iMjg2IiBoZWlnaHQ9IjI3MCIgcng9IjI0IiBmaWxsPSJ1cmwoI3BhaW50MF9saW5lYXIpIi8+CiAgICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzMCwzMCkiPgogICAgICA8cGF0aCBkPSJNNi4wMzk3MiAxOS4wODc1QzYuNTAxMjMgMjAuMDg0MSA3LjY0MzQ2IDIyLjA1NDEgNy42NDM0NiAyMi4wNTQxTDIwLjg0ODQgMEw3Ljk2MDc1IDkuMDkyMDVDNy4xOTI4MyA5LjYwOTYyIDYuNTYyOCAxMC4zMTAyIDYuMTI2MjUgMTEuMTMxOUM1LjUzOTI4IDEyLjM3MTYgNS4yMjc0MiAxMy43MjU5IDUuMjEyNDggMTUuMUM1LjE5NzUzIDE2LjQ3NDIgNS40Nzk4NiAxNy44MzUxIDYuMDM5NzIgMTkuMDg3NVoiIGZpbGw9IndoaXRlIi8+CiAgICAgIDxwYXRoIGQ9Ik0wLjE1MjAxNCAyNy4xNjcyQzAuMzAyNDEzIDI5LjI3NzEgMC45MTIyMDIgMzEuMzMxMiAxLjk0MDU1IDMzLjE5MTlDMi45Njg4OSAzNS4wNTI3IDQuMzkyMDYgMzYuNjc3MiA2LjExNDc1IDM3Ljk1NjdMMjAuODQ4NyA0OEMyMC44NDg3IDQ4IDExLjYzMDMgMzUuMDEzIDMuODU0ODcgMjIuMDkwMkMzLjA2NzY5IDIwLjcyNDkgMi41Mzg1IDE5LjIzMjIgMi4yOTI2MyAxNy42ODM1QzIuMTgzOCAxNi45ODIyIDIuMTgzOCAxNi4yNjg5IDIuMjkyNjMgMTUuNTY3NkMyLjA4OTkgMTUuOTM0OCAxLjY5NjM2IDE2LjY4NjcgMS42OTYzNiAxNi42ODY3QzAuOTA3OTY0IDE4LjI1ODYgMC4zNzEwMjkgMTkuOTM5NCAwLjEwNDMxMiAyMS42NzA1Qy0wLjA0OTIwODEgMjMuNTAwNCAtMC4wMzMyNDI2IDI1LjM0MDEgMC4xNTIwMTQgMjcuMTY3MloiIGZpbGw9IndoaXRlIi8+CiAgICAgIDxwYXRoIGQ9Ik0zOC4xOTI3IDI4LjkxMjVDMzcuNjkyOCAyNy45MTU5IDM2LjQ1NTUgMjUuOTQ2IDM2LjQ1NTUgMjUuOTQ2TDIyLjE1MTQgNDhMMzYuMTExOCAzOC45MTM4QzM2Ljk0MzYgMzguMzk2MiAzNy42MjYxIDM3LjY5NTYgMzguMDk5IDM2Ljg3MzlDMzguNzM1OCAzNS42MzM0IDM5LjA3NDEgMzQuMjc4MSAzOS4wOTAzIDMyLjkwMjlDMzkuMTA2NSAzMS41Mjc3IDM4LjgwMDEgMzAuMTY1NyAzOC4xOTI3IDI4LjkxMjVaIiBmaWxsPSJ3aGl0ZSIvPgogICAgICA8cGF0aCBkPSJNNDIuODUxMiAyMC44MzI4QzQyLjcwMDggMTguNzIyOSA0Mi4wOTA5IDE2LjY2ODggNDEuMDYyNCAxNC44MDgxQzQwLjAzMzkgMTIuOTQ3MyAzOC42MTA1IDExLjMyMjggMzYuODg3NiAxMC4wNDMzTDIyLjE1MTQgMEMyMi4xNTE0IDAgMzEuMzY1MiAxMi45ODcgMzkuMTQ3OCAyNS45MDk4QzM5LjkzMyAyNy4yNzU1IDQwLjQ2MDMgMjguNzY4MiA0MC43MDQzIDMwLjMxNjVDNDAuODEzMiAzMS4wMTc4IDQwLjgxMzIgMzEuNzMxMSA0MC43MDQzIDMyLjQzMjRDNDAuOTA3MSAzMi4wNjUyIDQxLjMwMDcgMzEuMzEzMyA0MS4zMDA3IDMxLjMxMzNDNDIuMDg5MiAyOS43NDE0IDQyLjYyNjIgMjguMDYwNiA0Mi44OTMgMjYuMzI5NUM0My4wNDg1IDI0LjQ5OTggNDMuMDM0NSAyMi42NiA0Mi44NTEyIDIwLjgzMjhaIiBmaWxsPSJ3aGl0ZSIvPgogICAgPC9nPgogICAgCiAgICA8dGV4dAogICAgICB4PSIzMCIKICAgICAgeT0iMjM1IgogICAgICBmb250LXNpemU9IjI0cHgiCiAgICAgIAogICAgICBmaWxsPSJ3aGl0ZSIKICAgID4KICAgICAgd3JhcHBlcnRlc3QzLmV0aAogICAgPC90ZXh0PgogICAgPGRlZnM+CiAgICAgIDxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI+QGltcG9ydCB1cmwoJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA4MC9hc3NldHMvZm9udC5jc3MnKTs8L3N0eWxlPgogICAgICA8c3R5bGU+CiAgICAgICAgdGV4dCB7CiAgICAgICAgICBmb250LWZhbWlseTpQbHVzSmFrYXJ0YVNhbnM7CiAgICAgICAgICBmb250LXdlaWdodDpib2xkOwogICAgICAgICAgZm9udC1zdHlsZTogbm9ybWFsOwogICAgICAgICAgbGluZS1oZWlnaHQ6IDM0cHg7CiAgICAgICAgICBsZXR0ZXItc3BhY2luZzotMC4wMWVtOwogICAgICAgIH0KICAgICAgPC9zdHlsZT4KICAgICAgPGxpbmVhckdyYWRpZW50IGlkPSJwYWludDBfbGluZWFyIiB4MT0iMCIgeTE9IjAiIHgyPSIyNjkuNTUzIiB5Mj0iMjg1LjUyNyIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgogICAgICAgIDxzdG9wIHN0b3AtY29sb3I9IiMyRUU2Q0YiLz4KICAgICAgICA8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM1QjUxRDEiLz4KICAgICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDwvZGVmcz4KICA8L3N2Zz4KICA=',
  registration: true,
  resolver: { texts: null },
});
const sub1Wrappertest = new MockEntry({
  name: 'sub1.wrappertest.eth',
  image:
    'data:image/svg+xml;base64,CiAgPHN2ZyB3aWR0aD0iMjg2IiBoZWlnaHQ9IjI3MCIgdmlld0JveD0iMCAwIDI4NiAyNzAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgICA8cmVjdCB3aWR0aD0iMjg2IiBoZWlnaHQ9IjI3MCIgcng9IjI0IiBmaWxsPSJ1cmwoI3BhaW50MF9saW5lYXIpIi8+CiAgICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzMCwzMCkiPgogICAgICA8cGF0aCBkPSJNNi4wMzk3MiAxOS4wODc1QzYuNTAxMjMgMjAuMDg0MSA3LjY0MzQ2IDIyLjA1NDEgNy42NDM0NiAyMi4wNTQxTDIwLjg0ODQgMEw3Ljk2MDc1IDkuMDkyMDVDNy4xOTI4MyA5LjYwOTYyIDYuNTYyOCAxMC4zMTAyIDYuMTI2MjUgMTEuMTMxOUM1LjUzOTI4IDEyLjM3MTYgNS4yMjc0MiAxMy43MjU5IDUuMjEyNDggMTUuMUM1LjE5NzUzIDE2LjQ3NDIgNS40Nzk4NiAxNy44MzUxIDYuMDM5NzIgMTkuMDg3NVoiIGZpbGw9IndoaXRlIi8+CiAgICAgIDxwYXRoIGQ9Ik0wLjE1MjAxNCAyNy4xNjcyQzAuMzAyNDEzIDI5LjI3NzEgMC45MTIyMDIgMzEuMzMxMiAxLjk0MDU1IDMzLjE5MTlDMi45Njg4OSAzNS4wNTI3IDQuMzkyMDYgMzYuNjc3MiA2LjExNDc1IDM3Ljk1NjdMMjAuODQ4NyA0OEMyMC44NDg3IDQ4IDExLjYzMDMgMzUuMDEzIDMuODU0ODcgMjIuMDkwMkMzLjA2NzY5IDIwLjcyNDkgMi41Mzg1IDE5LjIzMjIgMi4yOTI2MyAxNy42ODM1QzIuMTgzOCAxNi45ODIyIDIuMTgzOCAxNi4yNjg5IDIuMjkyNjMgMTUuNTY3NkMyLjA4OTkgMTUuOTM0OCAxLjY5NjM2IDE2LjY4NjcgMS42OTYzNiAxNi42ODY3QzAuOTA3OTY0IDE4LjI1ODYgMC4zNzEwMjkgMTkuOTM5NCAwLjEwNDMxMiAyMS42NzA1Qy0wLjA0OTIwODEgMjMuNTAwNCAtMC4wMzMyNDI2IDI1LjM0MDEgMC4xNTIwMTQgMjcuMTY3MloiIGZpbGw9IndoaXRlIi8+CiAgICAgIDxwYXRoIGQ9Ik0zOC4xOTI3IDI4LjkxMjVDMzcuNjkyOCAyNy45MTU5IDM2LjQ1NTUgMjUuOTQ2IDM2LjQ1NTUgMjUuOTQ2TDIyLjE1MTQgNDhMMzYuMTExOCAzOC45MTM4QzM2Ljk0MzYgMzguMzk2MiAzNy42MjYxIDM3LjY5NTYgMzguMDk5IDM2Ljg3MzlDMzguNzM1OCAzNS42MzM0IDM5LjA3NDEgMzQuMjc4MSAzOS4wOTAzIDMyLjkwMjlDMzkuMTA2NSAzMS41Mjc3IDM4LjgwMDEgMzAuMTY1NyAzOC4xOTI3IDI4LjkxMjVaIiBmaWxsPSJ3aGl0ZSIvPgogICAgICA8cGF0aCBkPSJNNDIuODUxMiAyMC44MzI4QzQyLjcwMDggMTguNzIyOSA0Mi4wOTA5IDE2LjY2ODggNDEuMDYyNCAxNC44MDgxQzQwLjAzMzkgMTIuOTQ3MyAzOC42MTA1IDExLjMyMjggMzYuODg3NiAxMC4wNDMzTDIyLjE1MTQgMEMyMi4xNTE0IDAgMzEuMzY1MiAxMi45ODcgMzkuMTQ3OCAyNS45MDk4QzM5LjkzMyAyNy4yNzU1IDQwLjQ2MDMgMjguNzY4MiA0MC43MDQzIDMwLjMxNjVDNDAuODEzMiAzMS4wMTc4IDQwLjgxMzIgMzEuNzMxMSA0MC43MDQzIDMyLjQzMjRDNDAuOTA3MSAzMi4wNjUyIDQxLjMwMDcgMzEuMzEzMyA0MS4zMDA3IDMxLjMxMzNDNDIuMDg5MiAyOS43NDE0IDQyLjYyNjIgMjguMDYwNiA0Mi44OTMgMjYuMzI5NUM0My4wNDg1IDI0LjQ5OTggNDMuMDM0NSAyMi42NiA0Mi44NTEyIDIwLjgzMjhaIiBmaWxsPSJ3aGl0ZSIvPgogICAgPC9nPgogICAgCiAgICA8dGV4dAogICAgICB4PSIzMCIKICAgICAgeT0iMjAwIgogICAgICBmb250LXNpemU9IjM1cHgiCiAgICAgIGZpbGw9IndoaXRlIgogICAgPgogICAgICBzdWIxLgogICAgPC90ZXh0PgogICAgCiAgICA8dGV4dAogICAgICB4PSIzMCIKICAgICAgeT0iMjM1IgogICAgICBmb250LXNpemU9IjI3cHgiCiAgICAgIG9wYWNpdHk9IjAuNCIKICAgICAgZmlsbD0id2hpdGUiCiAgICA+CiAgICAgIHdyYXBwZXJ0ZXN0LmV0aAogICAgPC90ZXh0PgogICAgPGRlZnM+CiAgICAgIDxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI+QGltcG9ydCB1cmwoJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA4MC9hc3NldHMvZm9udC5jc3MnKTs8L3N0eWxlPgogICAgICA8c3R5bGU+CiAgICAgICAgdGV4dCB7CiAgICAgICAgICBmb250LWZhbWlseTpQbHVzSmFrYXJ0YVNhbnM7CiAgICAgICAgICBmb250LXdlaWdodDpib2xkOwogICAgICAgICAgZm9udC1zdHlsZTogbm9ybWFsOwogICAgICAgICAgbGluZS1oZWlnaHQ6IDM0cHg7CiAgICAgICAgICBsZXR0ZXItc3BhY2luZzotMC4wMWVtOwogICAgICAgIH0KICAgICAgPC9zdHlsZT4KICAgICAgPGxpbmVhckdyYWRpZW50IGlkPSJwYWludDBfbGluZWFyIiB4MT0iMCIgeTE9IjAiIHgyPSIyNjkuNTUzIiB5Mj0iMjg1LjUyNyIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgogICAgICAgIDxzdG9wIHN0b3AtY29sb3I9IiMyRUU2Q0YiLz4KICAgICAgICA8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM1QjUxRDEiLz4KICAgICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDwvZGVmcz4KICA8L3N2Zz4KICA=',
  parent: '0x2517c0dfe3a4eebac3456a409c53f824f86070c73d48794d8268ec5c007ee683',
});
const sub2Wrappertest9 = new MockEntry({
  name: 'sub2.wrappertest9.eth',
  image: 'https://i.imgur.com/JcZESMp.png',
  parent: '0x0b00a980e17bfb715fca7267b401b08daa6e750f1bdac52b273e11c46c3e2b9f',
  resolver: { texts: ['domains.ens.nft.image'] },
  hasImageKey: true,
});
const unknown = new MockEntry({ name: 'unknown.eth', unknown: true });
const handle21character = new MockEntry({
  name: 'handle21character.eth',
  image:
    'data:image/svg+xml;base64,CiAgPHN2ZyB3aWR0aD0iMjg2IiBoZWlnaHQ9IjI3MCIgdmlld0JveD0iMCAwIDI4NiAyNzAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgICA8cmVjdCB3aWR0aD0iMjg2IiBoZWlnaHQ9IjI3MCIgcng9IjI0IiBmaWxsPSJ1cmwoI3BhaW50MF9saW5lYXIpIi8+CiAgICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzMCwzMCkiPgogICAgICA8cGF0aCBkPSJNNi4wMzk3MiAxOS4wODc1QzYuNTAxMjMgMjAuMDg0MSA3LjY0MzQ2IDIyLjA1NDEgNy42NDM0NiAyMi4wNTQxTDIwLjg0ODQgMEw3Ljk2MDc1IDkuMDkyMDVDNy4xOTI4MyA5LjYwOTYyIDYuNTYyOCAxMC4zMTAyIDYuMTI2MjUgMTEuMTMxOUM1LjUzOTI4IDEyLjM3MTYgNS4yMjc0MiAxMy43MjU5IDUuMjEyNDggMTUuMUM1LjE5NzUzIDE2LjQ3NDIgNS40Nzk4NiAxNy44MzUxIDYuMDM5NzIgMTkuMDg3NVoiIGZpbGw9IndoaXRlIi8+CiAgICAgIDxwYXRoIGQ9Ik0wLjE1MjAxNCAyNy4xNjcyQzAuMzAyNDEzIDI5LjI3NzEgMC45MTIyMDIgMzEuMzMxMiAxLjk0MDU1IDMzLjE5MTlDMi45Njg4OSAzNS4wNTI3IDQuMzkyMDYgMzYuNjc3MiA2LjExNDc1IDM3Ljk1NjdMMjAuODQ4NyA0OEMyMC44NDg3IDQ4IDExLjYzMDMgMzUuMDEzIDMuODU0ODcgMjIuMDkwMkMzLjA2NzY5IDIwLjcyNDkgMi41Mzg1IDE5LjIzMjIgMi4yOTI2MyAxNy42ODM1QzIuMTgzOCAxNi45ODIyIDIuMTgzOCAxNi4yNjg5IDIuMjkyNjMgMTUuNTY3NkMyLjA4OTkgMTUuOTM0OCAxLjY5NjM2IDE2LjY4NjcgMS42OTYzNiAxNi42ODY3QzAuOTA3OTY0IDE4LjI1ODYgMC4zNzEwMjkgMTkuOTM5NCAwLjEwNDMxMiAyMS42NzA1Qy0wLjA0OTIwODEgMjMuNTAwNCAtMC4wMzMyNDI2IDI1LjM0MDEgMC4xNTIwMTQgMjcuMTY3MloiIGZpbGw9IndoaXRlIi8+CiAgICAgIDxwYXRoIGQ9Ik0zOC4xOTI3IDI4LjkxMjVDMzcuNjkyOCAyNy45MTU5IDM2LjQ1NTUgMjUuOTQ2IDM2LjQ1NTUgMjUuOTQ2TDIyLjE1MTQgNDhMMzYuMTExOCAzOC45MTM4QzM2Ljk0MzYgMzguMzk2MiAzNy42MjYxIDM3LjY5NTYgMzguMDk5IDM2Ljg3MzlDMzguNzM1OCAzNS42MzM0IDM5LjA3NDEgMzQuMjc4MSAzOS4wOTAzIDMyLjkwMjlDMzkuMTA2NSAzMS41Mjc3IDM4LjgwMDEgMzAuMTY1NyAzOC4xOTI3IDI4LjkxMjVaIiBmaWxsPSJ3aGl0ZSIvPgogICAgICA8cGF0aCBkPSJNNDIuODUxMiAyMC44MzI4QzQyLjcwMDggMTguNzIyOSA0Mi4wOTA5IDE2LjY2ODggNDEuMDYyNCAxNC44MDgxQzQwLjAzMzkgMTIuOTQ3MyAzOC42MTA1IDExLjMyMjggMzYuODg3NiAxMC4wNDMzTDIyLjE1MTQgMEMyMi4xNTE0IDAgMzEuMzY1MiAxMi45ODcgMzkuMTQ3OCAyNS45MDk4QzM5LjkzMyAyNy4yNzU1IDQwLjQ2MDMgMjguNzY4MiA0MC43MDQzIDMwLjMxNjVDNDAuODEzMiAzMS4wMTc4IDQwLjgxMzIgMzEuNzMxMSA0MC43MDQzIDMyLjQzMjRDNDAuOTA3MSAzMi4wNjUyIDQxLjMwMDcgMzEuMzEzMyA0MS4zMDA3IDMxLjMxMzNDNDIuMDg5MiAyOS43NDE0IDQyLjYyNjIgMjguMDYwNiA0Mi44OTMgMjYuMzI5NUM0My4wNDg1IDI0LjQ5OTggNDMuMDM0NSAyMi42NiA0Mi44NTEyIDIwLjgzMjhaIiBmaWxsPSJ3aGl0ZSIvPgogICAgPC9nPgogICAgCiAgICA8dGV4dAogICAgICB4PSIzMCIKICAgICAgeT0iMjM1IgogICAgICBmb250LXNpemU9IjEzcHgiCiAgICAgIAogICAgICBmaWxsPSJ3aGl0ZSIKICAgID4KICAgICAgaGFuZGxlMjFjaGFyYWN0ZXIuZXRoCiAgICA8L3RleHQ+CiAgICA8ZGVmcz4KICAgICAgPHN0eWxlIHR5cGU9InRleHQvY3NzIj5AaW1wb3J0IHVybCgnaHR0cDovL2xvY2FsaG9zdDo4MDgwL2Fzc2V0cy9mb250LmNzcycpOzwvc3R5bGU+CiAgICAgIDxzdHlsZT4KICAgICAgICB0ZXh0IHsKICAgICAgICAgIGZvbnQtZmFtaWx5OlBsdXNKYWthcnRhU2FuczsKICAgICAgICAgIGZvbnQtd2VpZ2h0OmJvbGQ7CiAgICAgICAgICBmb250LXN0eWxlOiBub3JtYWw7CiAgICAgICAgICBsaW5lLWhlaWdodDogMzRweDsKICAgICAgICAgIGxldHRlci1zcGFjaW5nOi0wLjAxZW07CiAgICAgICAgfQogICAgICA8L3N0eWxlPgogICAgICA8bGluZWFyR3JhZGllbnQgaWQ9InBhaW50MF9saW5lYXIiIHgxPSIwIiB5MT0iMCIgeDI9IjI2OS41NTMiIHkyPSIyODUuNTI3IiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CiAgICAgICAgPHN0b3Agc3RvcC1jb2xvcj0iIzJFRTZDRiIvPgogICAgICAgIDxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzVCNTFEMSIvPgogICAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPC9kZWZzPgogIDwvc3ZnPgogIA==',
  registration: true,
  resolver: { texts: null },
});
const supercalifragilisticexpialidocious = new MockEntry({
  name: 'supercalifragilisticexpialidocious.eth',
  image:
    'data:image/svg+xml;base64,CiAgPHN2ZyB3aWR0aD0iMjg2IiBoZWlnaHQ9IjI3MCIgdmlld0JveD0iMCAwIDI4NiAyNzAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgICA8cmVjdCB3aWR0aD0iMjg2IiBoZWlnaHQ9IjI3MCIgcng9IjI0IiBmaWxsPSJ1cmwoI3BhaW50MF9saW5lYXIpIi8+CiAgICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzMCwzMCkiPgogICAgICA8cGF0aCBkPSJNNi4wMzk3MiAxOS4wODc1QzYuNTAxMjMgMjAuMDg0MSA3LjY0MzQ2IDIyLjA1NDEgNy42NDM0NiAyMi4wNTQxTDIwLjg0ODQgMEw3Ljk2MDc1IDkuMDkyMDVDNy4xOTI4MyA5LjYwOTYyIDYuNTYyOCAxMC4zMTAyIDYuMTI2MjUgMTEuMTMxOUM1LjUzOTI4IDEyLjM3MTYgNS4yMjc0MiAxMy43MjU5IDUuMjEyNDggMTUuMUM1LjE5NzUzIDE2LjQ3NDIgNS40Nzk4NiAxNy44MzUxIDYuMDM5NzIgMTkuMDg3NVoiIGZpbGw9IndoaXRlIi8+CiAgICAgIDxwYXRoIGQ9Ik0wLjE1MjAxNCAyNy4xNjcyQzAuMzAyNDEzIDI5LjI3NzEgMC45MTIyMDIgMzEuMzMxMiAxLjk0MDU1IDMzLjE5MTlDMi45Njg4OSAzNS4wNTI3IDQuMzkyMDYgMzYuNjc3MiA2LjExNDc1IDM3Ljk1NjdMMjAuODQ4NyA0OEMyMC44NDg3IDQ4IDExLjYzMDMgMzUuMDEzIDMuODU0ODcgMjIuMDkwMkMzLjA2NzY5IDIwLjcyNDkgMi41Mzg1IDE5LjIzMjIgMi4yOTI2MyAxNy42ODM1QzIuMTgzOCAxNi45ODIyIDIuMTgzOCAxNi4yNjg5IDIuMjkyNjMgMTUuNTY3NkMyLjA4OTkgMTUuOTM0OCAxLjY5NjM2IDE2LjY4NjcgMS42OTYzNiAxNi42ODY3QzAuOTA3OTY0IDE4LjI1ODYgMC4zNzEwMjkgMTkuOTM5NCAwLjEwNDMxMiAyMS42NzA1Qy0wLjA0OTIwODEgMjMuNTAwNCAtMC4wMzMyNDI2IDI1LjM0MDEgMC4xNTIwMTQgMjcuMTY3MloiIGZpbGw9IndoaXRlIi8+CiAgICAgIDxwYXRoIGQ9Ik0zOC4xOTI3IDI4LjkxMjVDMzcuNjkyOCAyNy45MTU5IDM2LjQ1NTUgMjUuOTQ2IDM2LjQ1NTUgMjUuOTQ2TDIyLjE1MTQgNDhMMzYuMTExOCAzOC45MTM4QzM2Ljk0MzYgMzguMzk2MiAzNy42MjYxIDM3LjY5NTYgMzguMDk5IDM2Ljg3MzlDMzguNzM1OCAzNS42MzM0IDM5LjA3NDEgMzQuMjc4MSAzOS4wOTAzIDMyLjkwMjlDMzkuMTA2NSAzMS41Mjc3IDM4LjgwMDEgMzAuMTY1NyAzOC4xOTI3IDI4LjkxMjVaIiBmaWxsPSJ3aGl0ZSIvPgogICAgICA8cGF0aCBkPSJNNDIuODUxMiAyMC44MzI4QzQyLjcwMDggMTguNzIyOSA0Mi4wOTA5IDE2LjY2ODggNDEuMDYyNCAxNC44MDgxQzQwLjAzMzkgMTIuOTQ3MyAzOC42MTA1IDExLjMyMjggMzYuODg3NiAxMC4wNDMzTDIyLjE1MTQgMEMyMi4xNTE0IDAgMzEuMzY1MiAxMi45ODcgMzkuMTQ3OCAyNS45MDk4QzM5LjkzMyAyNy4yNzU1IDQwLjQ2MDMgMjguNzY4MiA0MC43MDQzIDMwLjMxNjVDNDAuODEzMiAzMS4wMTc4IDQwLjgxMzIgMzEuNzMxMSA0MC43MDQzIDMyLjQzMjRDNDAuOTA3MSAzMi4wNjUyIDQxLjMwMDcgMzEuMzEzMyA0MS4zMDA3IDMxLjMxMzNDNDIuMDg5MiAyOS43NDE0IDQyLjYyNjIgMjguMDYwNiA0Mi44OTMgMjYuMzI5NUM0My4wNDg1IDI0LjQ5OTggNDMuMDM0NSAyMi42NiA0Mi44NTEyIDIwLjgzMjhaIiBmaWxsPSJ3aGl0ZSIvPgogICAgPC9nPgogICAgCiAgICA8dGV4dAogICAgICB4PSIzMCIKICAgICAgeT0iMjM1IgogICAgICBmb250LXNpemU9IjhweCIKICAgICAgCiAgICAgIGZpbGw9IndoaXRlIgogICAgPgogICAgICBzdXBlcmNhbGlmcmFnaWxpc3RpY2V4cGlhbGkuLi4KICAgIDwvdGV4dD4KICAgIDxkZWZzPgogICAgICA8c3R5bGUgdHlwZT0idGV4dC9jc3MiPkBpbXBvcnQgdXJsKCdodHRwOi8vbG9jYWxob3N0OjgwODAvYXNzZXRzL2ZvbnQuY3NzJyk7PC9zdHlsZT4KICAgICAgPHN0eWxlPgogICAgICAgIHRleHQgewogICAgICAgICAgZm9udC1mYW1pbHk6UGx1c0pha2FydGFTYW5zOwogICAgICAgICAgZm9udC13ZWlnaHQ6Ym9sZDsKICAgICAgICAgIGZvbnQtc3R5bGU6IG5vcm1hbDsKICAgICAgICAgIGxpbmUtaGVpZ2h0OiAzNHB4OwogICAgICAgICAgbGV0dGVyLXNwYWNpbmc6LTAuMDFlbTsKICAgICAgICB9CiAgICAgIDwvc3R5bGU+CiAgICAgIDxsaW5lYXJHcmFkaWVudCBpZD0icGFpbnQwX2xpbmVhciIgeDE9IjAiIHkxPSIwIiB4Mj0iMjY5LjU1MyIgeTI9IjI4NS41MjciIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KICAgICAgICA8c3RvcCBzdG9wLWNvbG9yPSIjMkVFNkNGIi8+CiAgICAgICAgPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjNUI1MUQxIi8+CiAgICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8L2RlZnM+CiAgPC9zdmc+CiAg',
  registration: true,
  resolver: { texts: null },
});
const longsubdomainconsistof34charactersMdt = new MockEntry({
  name: 'longsubdomainconsistof34characters.mdt.eth',
  image:
    'data:image/svg+xml;base64,CiAgPHN2ZyB3aWR0aD0iMjg2IiBoZWlnaHQ9IjI3MCIgdmlld0JveD0iMCAwIDI4NiAyNzAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgICA8cmVjdCB3aWR0aD0iMjg2IiBoZWlnaHQ9IjI3MCIgcng9IjI0IiBmaWxsPSJ1cmwoI3BhaW50MF9saW5lYXIpIi8+CiAgICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzMCwzMCkiPgogICAgICA8cGF0aCBkPSJNNi4wMzk3MiAxOS4wODc1QzYuNTAxMjMgMjAuMDg0MSA3LjY0MzQ2IDIyLjA1NDEgNy42NDM0NiAyMi4wNTQxTDIwLjg0ODQgMEw3Ljk2MDc1IDkuMDkyMDVDNy4xOTI4MyA5LjYwOTYyIDYuNTYyOCAxMC4zMTAyIDYuMTI2MjUgMTEuMTMxOUM1LjUzOTI4IDEyLjM3MTYgNS4yMjc0MiAxMy43MjU5IDUuMjEyNDggMTUuMUM1LjE5NzUzIDE2LjQ3NDIgNS40Nzk4NiAxNy44MzUxIDYuMDM5NzIgMTkuMDg3NVoiIGZpbGw9IndoaXRlIi8+CiAgICAgIDxwYXRoIGQ9Ik0wLjE1MjAxNCAyNy4xNjcyQzAuMzAyNDEzIDI5LjI3NzEgMC45MTIyMDIgMzEuMzMxMiAxLjk0MDU1IDMzLjE5MTlDMi45Njg4OSAzNS4wNTI3IDQuMzkyMDYgMzYuNjc3MiA2LjExNDc1IDM3Ljk1NjdMMjAuODQ4NyA0OEMyMC44NDg3IDQ4IDExLjYzMDMgMzUuMDEzIDMuODU0ODcgMjIuMDkwMkMzLjA2NzY5IDIwLjcyNDkgMi41Mzg1IDE5LjIzMjIgMi4yOTI2MyAxNy42ODM1QzIuMTgzOCAxNi45ODIyIDIuMTgzOCAxNi4yNjg5IDIuMjkyNjMgMTUuNTY3NkMyLjA4OTkgMTUuOTM0OCAxLjY5NjM2IDE2LjY4NjcgMS42OTYzNiAxNi42ODY3QzAuOTA3OTY0IDE4LjI1ODYgMC4zNzEwMjkgMTkuOTM5NCAwLjEwNDMxMiAyMS42NzA1Qy0wLjA0OTIwODEgMjMuNTAwNCAtMC4wMzMyNDI2IDI1LjM0MDEgMC4xNTIwMTQgMjcuMTY3MloiIGZpbGw9IndoaXRlIi8+CiAgICAgIDxwYXRoIGQ9Ik0zOC4xOTI3IDI4LjkxMjVDMzcuNjkyOCAyNy45MTU5IDM2LjQ1NTUgMjUuOTQ2IDM2LjQ1NTUgMjUuOTQ2TDIyLjE1MTQgNDhMMzYuMTExOCAzOC45MTM4QzM2Ljk0MzYgMzguMzk2MiAzNy42MjYxIDM3LjY5NTYgMzguMDk5IDM2Ljg3MzlDMzguNzM1OCAzNS42MzM0IDM5LjA3NDEgMzQuMjc4MSAzOS4wOTAzIDMyLjkwMjlDMzkuMTA2NSAzMS41Mjc3IDM4LjgwMDEgMzAuMTY1NyAzOC4xOTI3IDI4LjkxMjVaIiBmaWxsPSJ3aGl0ZSIvPgogICAgICA8cGF0aCBkPSJNNDIuODUxMiAyMC44MzI4QzQyLjcwMDggMTguNzIyOSA0Mi4wOTA5IDE2LjY2ODggNDEuMDYyNCAxNC44MDgxQzQwLjAzMzkgMTIuOTQ3MyAzOC42MTA1IDExLjMyMjggMzYuODg3NiAxMC4wNDMzTDIyLjE1MTQgMEMyMi4xNTE0IDAgMzEuMzY1MiAxMi45ODcgMzkuMTQ3OCAyNS45MDk4QzM5LjkzMyAyNy4yNzU1IDQwLjQ2MDMgMjguNzY4MiA0MC43MDQzIDMwLjMxNjVDNDAuODEzMiAzMS4wMTc4IDQwLjgxMzIgMzEuNzMxMSA0MC43MDQzIDMyLjQzMjRDNDAuOTA3MSAzMi4wNjUyIDQxLjMwMDcgMzEuMzEzMyA0MS4zMDA3IDMxLjMxMzNDNDIuMDg5MiAyOS43NDE0IDQyLjYyNjIgMjguMDYwNiA0Mi44OTMgMjYuMzI5NUM0My4wNDg1IDI0LjQ5OTggNDMuMDM0NSAyMi42NiA0Mi44NTEyIDIwLjgzMjhaIiBmaWxsPSJ3aGl0ZSIvPgogICAgPC9nPgogICAgCiAgICA8dGV4dAogICAgICB4PSIzMCIKICAgICAgeT0iMjAwIgogICAgICBmb250LXNpemU9IjhweCIKICAgICAgZmlsbD0id2hpdGUiCiAgICA+CiAgICAgIGxvbmdzdWJkb21haW5jb25zaXN0b2YzNGNoYS4uLgogICAgPC90ZXh0PgogICAgCiAgICA8dGV4dAogICAgICB4PSIzMCIKICAgICAgeT0iMjM1IgogICAgICBmb250LXNpemU9IjM1cHgiCiAgICAgIG9wYWNpdHk9IjAuNCIKICAgICAgZmlsbD0id2hpdGUiCiAgICA+CiAgICAgIG1kdC5ldGgKICAgIDwvdGV4dD4KICAgIDxkZWZzPgogICAgICA8c3R5bGUgdHlwZT0idGV4dC9jc3MiPkBpbXBvcnQgdXJsKCdodHRwOi8vbG9jYWxob3N0OjgwODAvYXNzZXRzL2ZvbnQuY3NzJyk7PC9zdHlsZT4KICAgICAgPHN0eWxlPgogICAgICAgIHRleHQgewogICAgICAgICAgZm9udC1mYW1pbHk6UGx1c0pha2FydGFTYW5zOwogICAgICAgICAgZm9udC13ZWlnaHQ6Ym9sZDsKICAgICAgICAgIGZvbnQtc3R5bGU6IG5vcm1hbDsKICAgICAgICAgIGxpbmUtaGVpZ2h0OiAzNHB4OwogICAgICAgICAgbGV0dGVyLXNwYWNpbmc6LTAuMDFlbTsKICAgICAgICB9CiAgICAgIDwvc3R5bGU+CiAgICAgIDxsaW5lYXJHcmFkaWVudCBpZD0icGFpbnQwX2xpbmVhciIgeDE9IjAiIHkxPSIwIiB4Mj0iMjY5LjU1MyIgeTI9IjI4NS41MjciIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KICAgICAgICA8c3RvcCBzdG9wLWNvbG9yPSIjMkVFNkNGIi8+CiAgICAgICAgPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjNUI1MUQxIi8+CiAgICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8L2RlZnM+CiAgPC9zdmc+CiAg',
  registration: true,
  resolver: { texts: null },
});

/* Helper functions */
function nockInfura(
  method: string,
  params: any[],
  response: EthCallResponse | EthChainIdResponse | NetVersionResponse
) {
  nock(INFURA_URL.origin)
    .persist()
    .post(INFURA_URL.pathname, {
      method,
      params,
      id: /[0-9]/,
      jsonrpc: '2.0',
    })
    .reply(200, response);
}

function requireUncached(module: string) {
  delete require.cache[require.resolve(module)];
  return require(module);
}

/* Test Setup */
const test = avaTest as TestInterface<TestContext>;
const options: OptionsOfJSONResponseBody | OptionsOfTextResponseBody = {
  prefixUrl: SERVER_URL.toString(),
};

test.before(async (t: ExecutionContext<TestContext>) => {
  nock.disableNetConnect();
  nock.enableNetConnect(SERVER_URL.host);

  nockInfura('eth_chainId', [], {
    id: 1,
    jsonrpc: '2.0',
    result: '0x04', // rinkeby
  });
  nockInfura('net_version', [], {
    jsonrpc: '2.0',
    id: 1,
    result: '4',
  });
  nockInfura(
    'eth_call',
    [
      {
        to: '0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e',
        data: '0x0178b8bfb9fab6dd33ccdfd1f65ea203855508034652c2e01f585a7b742c3698c0c8d6b1',
      },
      'latest',
    ],
    {
      result:
        '0x0000000000000000000000004d9487c0fa713630a8f3cd8067564a604f0d2989',
    }
  );
  nockInfura(
    'eth_call',
    [
      {
        to: '0x4d9487c0fa713630a8f3cd8067564a604f0d2989',
        data: '0x59d1d43cb9fab6dd33ccdfd1f65ea203855508034652c2e01f585a7b742c3698c0c8d6b100000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000015646f6d61696e732e656e732e6e66742e696d6167650000000000000000000000',
      },
      'latest',
    ],
    {
      result:
        '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000001f68747470733a2f2f692e696d6775722e636f6d2f4a635a45534d702e706e6700',
    }
  );

  t.context.server = http.createServer(app);
  t.context.prefixUrl = await listen(t.context.server);
});

test.after.always((t: ExecutionContext<TestContext>) => {
  t.context.server.close();
  nock.enableNetConnect();
});

/* Tests */

test('get welcome message', async (t: ExecutionContext<TestContext>) => {
  const result = await got('', options).text();
  t.deepEqual(result, 'Well done mate!');
});

test('get /name/:tokenId for domain (wrappertest3.eth)', async (t: ExecutionContext<TestContext>) => {
  const result = await got(`name/${wrappertest3.namehash}`, options).json();
  t.deepEqual(result, wrappertest3.expect);
});

test('get /name/:tokenId for subdomain returns auto generated image', async (t: ExecutionContext<TestContext>) => {
  const result = await got(`name/${sub1Wrappertest.namehash}`, options).json();
  t.deepEqual(result, sub1Wrappertest.expect);
});

test('get /name/:tokenId for subdomain returns image from text record', async (t: ExecutionContext<TestContext>) => {
  const result = await got(`name/${sub2Wrappertest9.namehash}`, options).json();
  t.deepEqual(result, sub2Wrappertest9.expect);
});

test('get /name/:tokenId for a 21 char long domain', async (t: ExecutionContext<TestContext>) => {
  const result = await got(
    `name/${handle21character.namehash}`,
    options
  ).json();
  t.deepEqual(result, handle21character.expect);
});

test('get /name/:tokenId for a greater than MAX_CHAR long domain', async (t: ExecutionContext<TestContext>) => {
  const result = await got(
    `name/${supercalifragilisticexpialidocious.namehash}`,
    options
  ).json();
  t.deepEqual(result, supercalifragilisticexpialidocious.expect);
});

test('get /name/:tokenId for a greater than MAX_CHAR long subdomain', async (t: ExecutionContext<TestContext>) => {
  const result = await got(
    `name/${longsubdomainconsistof34charactersMdt.namehash}`,
    options
  ).json();
  t.deepEqual(result, longsubdomainconsistof34charactersMdt.expect);
});

test('get /name/:tokenId for unknown namehash', async (t: ExecutionContext<TestContext>) => {
  const {
    response: { statusCode, body },
  }: HTTPError = await t.throwsAsync(
    () => got(`name/${unknown.namehash}`, options),
    { instanceOf: HTTPError }
  );
  const message = JSON.parse(body as string)?.message;
  t.is(message, unknown.expect);
  t.is(statusCode, 404);
});

test('get /name/:tokenId for empty tokenId', async (t: ExecutionContext<TestContext>) => {
  const {
    response: { statusCode, body },
  }: HTTPError = await t.throwsAsync(() => got(`name/`, options), {
    instanceOf: HTTPError,
  });
  t.assert((body as string).includes('Cannot GET /name/'));
  t.is(statusCode, 404);
});

test('raise 404 status from subgraph connection', async (t: ExecutionContext<TestContext>) => {
  const fetchError = {
    message: 'nothing here',
    code: '404',
    statusCode: 404,
  };
  nock(SUBGRAPH_URL.origin)
    .post(SUBGRAPH_URL.pathname, {
      query: GET_DOMAINS,
      variables: {
        tokenId: sub1Wrappertest.namehash,
      },
    })
    .replyWithError(fetchError);
  const {
    response: { body, statusCode },
  }: HTTPError = await t.throwsAsync(
    () => got(`name/${sub1Wrappertest.namehash}`, { ...options, retry: 0 }),
    {
      instanceOf: HTTPError,
    }
  );
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
    .post(SUBGRAPH_URL.pathname, {
      query: GET_DOMAINS,
      variables: {
        tokenId: sub1Wrappertest.namehash,
      },
    })
    .replyWithError(fetchError);
  const {
    response: { body, statusCode },
  }: HTTPError = await t.throwsAsync(
    () => got(`name/${sub1Wrappertest.namehash}`, { ...options, retry: 0 }),
    {
      instanceOf: HTTPError,
    }
  );
  const { message } = JSON.parse(body as string);
  t.assert(message.includes(fetchError.message));
  t.is(statusCode, fetchError.statusCode);
});

test('raise Internal Server Error from subgraph', async (t: ExecutionContext<TestContext>) => {
  const fetchError = {
    message: 'Internal Server Error',
    code: '500',
    statusCode: 500,
  };
  nock(SUBGRAPH_URL.origin)
    .post(SUBGRAPH_URL.pathname, {
      query: GET_DOMAINS,
      variables: {
        tokenId: sub1Wrappertest.namehash,
      },
    })
    .replyWithError(fetchError);
  const {
    response: { body, statusCode },
  }: HTTPError = await t.throwsAsync(
    () => got(`name/${sub1Wrappertest.namehash}`, { ...options, retry: 0 }),
    {
      instanceOf: HTTPError,
    }
  );
  const { message } = JSON.parse(body as string);
  t.assert(message.includes(fetchError.message));
  t.is(statusCode, fetchError.statusCode);
});

test('should get assets when ENV set for local', async (t: ExecutionContext<TestContext>) => {
  process.env.ENV = 'local';
  process.env.PORT = '8081';
  const _app = requireUncached('../src/index');
  t.context.server = http.createServer(_app);
  t.context.prefixUrl = await listen(t.context.server);
  nock.enableNetConnect('localhost:8081');
  const result = await got(`assets/font.css`, {
    prefixUrl: 'http://localhost:8081',
  }).text();
  t.assert(result.includes('@font-face'));
});
