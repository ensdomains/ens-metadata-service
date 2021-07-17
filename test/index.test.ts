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
import { GET_DOMAINS, GET_REGISTRATIONS } from '../src/subgraph';
import {
  INFURA_URL as infura_url,
  SERVER_URL as server_url,
  SUBGRAPH_URL as subgraph_url,
} from '../src/config';

const INFURA_URL = new URL(infura_url);
const SERVER_URL = new URL(server_url);
const SUBGRAPH_URL = new URL(subgraph_url);

/* Mocks */

const mockNameHash = {
  wrappertest3:
    '0x4b63a18d769e58615781f80e410d301811a62a6a10e2fc557825313b3bcf03db',
  sub1: '0xb71788e9ec63be108fba9c0b01c927e4d8f1887d53787ff84752be3d8db1dd9a',
  sub2: '0xb9fab6dd33ccdfd1f65ea203855508034652c2e01f585a7b742c3698c0c8d6b1',
  unknown: '0xb71788e9ec63be108fba9c0b01c927e4d8f1887d53787ff84752be3d8db1dd7a',
};
const mockEntry = {
  [mockNameHash.wrappertest3]: {
    domainResponse: {
      domain: {
        createdAt: '1624965592',
        id: mockNameHash.wrappertest3,
        labelName: 'wrappertest3',
        labelhash:
          '0x08cdf76988acf6b8bc5aa2c31faf38761691bd694c0f4866f327ec1894c0f270',
        name: 'wrappertest3.eth',
        owner: { id: '0x97ba55f61345665cf08c4233b9d6e61051a43b18' },
        parent: {
          id: '0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae',
        },
        resolver: { texts: null },
        hasImageKey: null,
      },
    },
    registrationResponse: {
      registrations: [
        {
          expiryDate: '1656522544',
          labelName: 'wrappertest3.eth',
          registrationDate: '1624965592',
        },
      ],
    },
    expect: {
      name: 'wrappertest3.eth',
      description: 'wrappertest3.eth',
      image:
        'data:image/svg+xml;base64,CiAgPHN2ZyB3aWR0aD0iMjg2IiBoZWlnaHQ9IjI3MCIgdmlld0JveD0iMCAwIDI4NiAyNzAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgICA8cmVjdCB3aWR0aD0iMjg2IiBoZWlnaHQ9IjI3MCIgcng9IjI0IiBmaWxsPSJ1cmwoI3BhaW50MF9saW5lYXIpIi8+CiAgICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzMCwzMCkiPgogICAgICA8cGF0aCBkPSJNNi4wMzk3MiAxOS4wODc1QzYuNTAxMjMgMjAuMDg0MSA3LjY0MzQ2IDIyLjA1NDEgNy42NDM0NiAyMi4wNTQxTDIwLjg0ODQgMEw3Ljk2MDc1IDkuMDkyMDVDNy4xOTI4MyA5LjYwOTYyIDYuNTYyOCAxMC4zMTAyIDYuMTI2MjUgMTEuMTMxOUM1LjUzOTI4IDEyLjM3MTYgNS4yMjc0MiAxMy43MjU5IDUuMjEyNDggMTUuMUM1LjE5NzUzIDE2LjQ3NDIgNS40Nzk4NiAxNy44MzUxIDYuMDM5NzIgMTkuMDg3NVoiIGZpbGw9IndoaXRlIi8+CiAgICAgIDxwYXRoIGQ9Ik0wLjE1MjAxNCAyNy4xNjcyQzAuMzAyNDEzIDI5LjI3NzEgMC45MTIyMDIgMzEuMzMxMiAxLjk0MDU1IDMzLjE5MTlDMi45Njg4OSAzNS4wNTI3IDQuMzkyMDYgMzYuNjc3MiA2LjExNDc1IDM3Ljk1NjdMMjAuODQ4NyA0OEMyMC44NDg3IDQ4IDExLjYzMDMgMzUuMDEzIDMuODU0ODcgMjIuMDkwMkMzLjA2NzY5IDIwLjcyNDkgMi41Mzg1IDE5LjIzMjIgMi4yOTI2MyAxNy42ODM1QzIuMTgzOCAxNi45ODIyIDIuMTgzOCAxNi4yNjg5IDIuMjkyNjMgMTUuNTY3NkMyLjA4OTkgMTUuOTM0OCAxLjY5NjM2IDE2LjY4NjcgMS42OTYzNiAxNi42ODY3QzAuOTA3OTY0IDE4LjI1ODYgMC4zNzEwMjkgMTkuOTM5NCAwLjEwNDMxMiAyMS42NzA1Qy0wLjA0OTIwODEgMjMuNTAwNCAtMC4wMzMyNDI2IDI1LjM0MDEgMC4xNTIwMTQgMjcuMTY3MloiIGZpbGw9IndoaXRlIi8+CiAgICAgIDxwYXRoIGQ9Ik0zOC4xOTI3IDI4LjkxMjVDMzcuNjkyOCAyNy45MTU5IDM2LjQ1NTUgMjUuOTQ2IDM2LjQ1NTUgMjUuOTQ2TDIyLjE1MTQgNDhMMzYuMTExOCAzOC45MTM4QzM2Ljk0MzYgMzguMzk2MiAzNy42MjYxIDM3LjY5NTYgMzguMDk5IDM2Ljg3MzlDMzguNzM1OCAzNS42MzM0IDM5LjA3NDEgMzQuMjc4MSAzOS4wOTAzIDMyLjkwMjlDMzkuMTA2NSAzMS41Mjc3IDM4LjgwMDEgMzAuMTY1NyAzOC4xOTI3IDI4LjkxMjVaIiBmaWxsPSJ3aGl0ZSIvPgogICAgICA8cGF0aCBkPSJNNDIuODUxMiAyMC44MzI4QzQyLjcwMDggMTguNzIyOSA0Mi4wOTA5IDE2LjY2ODggNDEuMDYyNCAxNC44MDgxQzQwLjAzMzkgMTIuOTQ3MyAzOC42MTA1IDExLjMyMjggMzYuODg3NiAxMC4wNDMzTDIyLjE1MTQgMEMyMi4xNTE0IDAgMzEuMzY1MiAxMi45ODcgMzkuMTQ3OCAyNS45MDk4QzM5LjkzMyAyNy4yNzU1IDQwLjQ2MDMgMjguNzY4MiA0MC43MDQzIDMwLjMxNjVDNDAuODEzMiAzMS4wMTc4IDQwLjgxMzIgMzEuNzMxMSA0MC43MDQzIDMyLjQzMjRDNDAuOTA3MSAzMi4wNjUyIDQxLjMwMDcgMzEuMzEzMyA0MS4zMDA3IDMxLjMxMzNDNDIuMDg5MiAyOS43NDE0IDQyLjYyNjIgMjguMDYwNiA0Mi44OTMgMjYuMzI5NUM0My4wNDg1IDI0LjQ5OTggNDMuMDM0NSAyMi42NiA0Mi44NTEyIDIwLjgzMjhaIiBmaWxsPSJ3aGl0ZSIvPgogICAgPC9nPgogICAgCiAgICA8dGV4dAogICAgICB4PSIzMCIKICAgICAgeT0iMjM1IgogICAgICBmb250LXNpemU9IjI0cHgiCiAgICAgIAogICAgICBmaWxsPSJ3aGl0ZSIKICAgID4KICAgICAgd3JhcHBlcnRlc3QzLmV0aAogICAgPC90ZXh0PgogICAgPGRlZnM+CiAgICAgIDxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI+QGltcG9ydCB1cmwoJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA4MC9hc3NldHMvZm9udC5jc3MnKTs8L3N0eWxlPgogICAgICA8c3R5bGU+CiAgICAgICAgdGV4dCB7CiAgICAgICAgICBmb250LWZhbWlseTpQbHVzSmFrYXJ0YVNhbnM7CiAgICAgICAgICBmb250LXdlaWdodDpib2xkOwogICAgICAgICAgZm9udC1zdHlsZTogbm9ybWFsOwogICAgICAgICAgbGluZS1oZWlnaHQ6IDM0cHg7CiAgICAgICAgICBsZXR0ZXItc3BhY2luZzotMC4wMWVtOwogICAgICAgIH0KICAgICAgPC9zdHlsZT4KICAgICAgPGxpbmVhckdyYWRpZW50IGlkPSJwYWludDBfbGluZWFyIiB4MT0iMCIgeTE9IjAiIHgyPSIyNjkuNTUzIiB5Mj0iMjg1LjUyNyIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgogICAgICAgIDxzdG9wIHN0b3AtY29sb3I9IiMyRUU2Q0YiLz4KICAgICAgICA8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM1QjUxRDEiLz4KICAgICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDwvZGVmcz4KICA8L3N2Zz4KICA=',
      image_url:
        'data:image/svg+xml;base64,CiAgPHN2ZyB3aWR0aD0iMjg2IiBoZWlnaHQ9IjI3MCIgdmlld0JveD0iMCAwIDI4NiAyNzAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgICA8cmVjdCB3aWR0aD0iMjg2IiBoZWlnaHQ9IjI3MCIgcng9IjI0IiBmaWxsPSJ1cmwoI3BhaW50MF9saW5lYXIpIi8+CiAgICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzMCwzMCkiPgogICAgICA8cGF0aCBkPSJNNi4wMzk3MiAxOS4wODc1QzYuNTAxMjMgMjAuMDg0MSA3LjY0MzQ2IDIyLjA1NDEgNy42NDM0NiAyMi4wNTQxTDIwLjg0ODQgMEw3Ljk2MDc1IDkuMDkyMDVDNy4xOTI4MyA5LjYwOTYyIDYuNTYyOCAxMC4zMTAyIDYuMTI2MjUgMTEuMTMxOUM1LjUzOTI4IDEyLjM3MTYgNS4yMjc0MiAxMy43MjU5IDUuMjEyNDggMTUuMUM1LjE5NzUzIDE2LjQ3NDIgNS40Nzk4NiAxNy44MzUxIDYuMDM5NzIgMTkuMDg3NVoiIGZpbGw9IndoaXRlIi8+CiAgICAgIDxwYXRoIGQ9Ik0wLjE1MjAxNCAyNy4xNjcyQzAuMzAyNDEzIDI5LjI3NzEgMC45MTIyMDIgMzEuMzMxMiAxLjk0MDU1IDMzLjE5MTlDMi45Njg4OSAzNS4wNTI3IDQuMzkyMDYgMzYuNjc3MiA2LjExNDc1IDM3Ljk1NjdMMjAuODQ4NyA0OEMyMC44NDg3IDQ4IDExLjYzMDMgMzUuMDEzIDMuODU0ODcgMjIuMDkwMkMzLjA2NzY5IDIwLjcyNDkgMi41Mzg1IDE5LjIzMjIgMi4yOTI2MyAxNy42ODM1QzIuMTgzOCAxNi45ODIyIDIuMTgzOCAxNi4yNjg5IDIuMjkyNjMgMTUuNTY3NkMyLjA4OTkgMTUuOTM0OCAxLjY5NjM2IDE2LjY4NjcgMS42OTYzNiAxNi42ODY3QzAuOTA3OTY0IDE4LjI1ODYgMC4zNzEwMjkgMTkuOTM5NCAwLjEwNDMxMiAyMS42NzA1Qy0wLjA0OTIwODEgMjMuNTAwNCAtMC4wMzMyNDI2IDI1LjM0MDEgMC4xNTIwMTQgMjcuMTY3MloiIGZpbGw9IndoaXRlIi8+CiAgICAgIDxwYXRoIGQ9Ik0zOC4xOTI3IDI4LjkxMjVDMzcuNjkyOCAyNy45MTU5IDM2LjQ1NTUgMjUuOTQ2IDM2LjQ1NTUgMjUuOTQ2TDIyLjE1MTQgNDhMMzYuMTExOCAzOC45MTM4QzM2Ljk0MzYgMzguMzk2MiAzNy42MjYxIDM3LjY5NTYgMzguMDk5IDM2Ljg3MzlDMzguNzM1OCAzNS42MzM0IDM5LjA3NDEgMzQuMjc4MSAzOS4wOTAzIDMyLjkwMjlDMzkuMTA2NSAzMS41Mjc3IDM4LjgwMDEgMzAuMTY1NyAzOC4xOTI3IDI4LjkxMjVaIiBmaWxsPSJ3aGl0ZSIvPgogICAgICA8cGF0aCBkPSJNNDIuODUxMiAyMC44MzI4QzQyLjcwMDggMTguNzIyOSA0Mi4wOTA5IDE2LjY2ODggNDEuMDYyNCAxNC44MDgxQzQwLjAzMzkgMTIuOTQ3MyAzOC42MTA1IDExLjMyMjggMzYuODg3NiAxMC4wNDMzTDIyLjE1MTQgMEMyMi4xNTE0IDAgMzEuMzY1MiAxMi45ODcgMzkuMTQ3OCAyNS45MDk4QzM5LjkzMyAyNy4yNzU1IDQwLjQ2MDMgMjguNzY4MiA0MC43MDQzIDMwLjMxNjVDNDAuODEzMiAzMS4wMTc4IDQwLjgxMzIgMzEuNzMxMSA0MC43MDQzIDMyLjQzMjRDNDAuOTA3MSAzMi4wNjUyIDQxLjMwMDcgMzEuMzEzMyA0MS4zMDA3IDMxLjMxMzNDNDIuMDg5MiAyOS43NDE0IDQyLjYyNjIgMjguMDYwNiA0Mi44OTMgMjYuMzI5NUM0My4wNDg1IDI0LjQ5OTggNDMuMDM0NSAyMi42NiA0Mi44NTEyIDIwLjgzMjhaIiBmaWxsPSJ3aGl0ZSIvPgogICAgPC9nPgogICAgCiAgICA8dGV4dAogICAgICB4PSIzMCIKICAgICAgeT0iMjM1IgogICAgICBmb250LXNpemU9IjI0cHgiCiAgICAgIAogICAgICBmaWxsPSJ3aGl0ZSIKICAgID4KICAgICAgd3JhcHBlcnRlc3QzLmV0aAogICAgPC90ZXh0PgogICAgPGRlZnM+CiAgICAgIDxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI+QGltcG9ydCB1cmwoJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA4MC9hc3NldHMvZm9udC5jc3MnKTs8L3N0eWxlPgogICAgICA8c3R5bGU+CiAgICAgICAgdGV4dCB7CiAgICAgICAgICBmb250LWZhbWlseTpQbHVzSmFrYXJ0YVNhbnM7CiAgICAgICAgICBmb250LXdlaWdodDpib2xkOwogICAgICAgICAgZm9udC1zdHlsZTogbm9ybWFsOwogICAgICAgICAgbGluZS1oZWlnaHQ6IDM0cHg7CiAgICAgICAgICBsZXR0ZXItc3BhY2luZzotMC4wMWVtOwogICAgICAgIH0KICAgICAgPC9zdHlsZT4KICAgICAgPGxpbmVhckdyYWRpZW50IGlkPSJwYWludDBfbGluZWFyIiB4MT0iMCIgeTE9IjAiIHgyPSIyNjkuNTUzIiB5Mj0iMjg1LjUyNyIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgogICAgICAgIDxzdG9wIHN0b3AtY29sb3I9IiMyRUU2Q0YiLz4KICAgICAgICA8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM1QjUxRDEiLz4KICAgICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDwvZGVmcz4KICA8L3N2Zz4KICA=',
      external_link: 'https://ens.domains/name/wrappertest3.eth',
      attributes: [
        {
          trait_type: 'Created Date',
          display_type: 'date',
          value: 1624965592000,
        },
        {
          trait_type: 'Registration Date',
          display_type: 'date',
          value: 1624965592000,
        },
        {
          trait_type: 'Expiration Date',
          display_type: 'date',
          value: 1656522544000,
        },
      ],
    },
  },
  [mockNameHash.sub1]: {
    domainResponse: {
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
    registrationResponse: null,
    expect: {
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
  [mockNameHash.sub2]: {
    domainResponse: {
      domain: {
        name: 'sub2.wrappertest9.eth',
        id: mockNameHash.sub2,
        labelName: 'sub2',
        labelhash:
          '0xb2fd3233fdc544d81e84c93822934ddd9b599f056b6a7f84f4de29378bf1cb15',
        createdAt: '1625137830',
        owner: { id: '0x97ba55f61345665cf08c4233b9d6e61051a43b18' },
        parent: {
          id: '0x0b00a980e17bfb715fca7267b401b08daa6e750f1bdac52b273e11c46c3e2b9f',
        },
        resolver: { texts: ['domains.ens.nft.image'] },
        hasImageKey: true,
      },
    },
    registrationResponse: null,
    expect: {
      name: 'sub2.wrappertest9.eth',
      description: 'sub2.wrappertest9.eth',
      image: 'https://i.imgur.com/JcZESMp.png',
      image_url: 'https://i.imgur.com/JcZESMp.png',
      external_link: 'https://ens.domains/name/sub2.wrappertest9.eth',
      attributes: [
        {
          trait_type: 'Created Date',
          display_type: 'date',
          value: 1625137830000,
        },
      ],
    },
  },
  [mockNameHash.unknown]: {
    domainResponse: null,
    registrationResponse: null,
    statusCode: 404,
    expect: 'No results found.',
  },
};

/* Interfaces */

interface DomainResponse {
  domain: {
    name: string;
    id?: string;
    labelName: string;
    labelhash: string;
    createdAt: string;
    owner: {
      id: string;
    };
    parent: {
      id: string;
    };
    resolver: {
      texts: string[] | null;
    } | null;
    hasImageKey?: boolean | null;
  };
}

interface RegistrationResponse {
  registrations: {
    expiryDate: string;
    labelName: string;
    registrationDate: string;
  }[];
}

interface EthChainIdResponse {
  id: number;
  jsonrpc: string;
  result: string;
}

interface EthCallResponse {
  result: string;
}

interface NetVersionResponse {
  id: number;
  jsonrpc: string;
  result: string;
}

interface TestContext {
  server: http.Server;
  prefixUrl: string;
}

/* Helper functions */

function nockGraph(
  namehash: string,
  domainResponse: DomainResponse | null = null,
  registrationResponse: RegistrationResponse | null = null,
  statusCode = 200
) {
  nock(SUBGRAPH_URL.origin)
    .post(SUBGRAPH_URL.pathname, {
      query: GET_DOMAINS,
      variables: {
        tokenId: namehash,
      },
    })
    .reply(statusCode, {
      data: domainResponse,
    });

  if (!!domainResponse?.domain.resolver) {
    const { labelhash } = domainResponse.domain;
    nock(SUBGRAPH_URL.origin)
      .post(SUBGRAPH_URL.pathname, {
        query: GET_REGISTRATIONS,
        variables: {
          labelhash,
        },
      })
      .reply(statusCode, {
        data: registrationResponse,
      });
  }
}

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

  for (let namehash of Object.values(mockNameHash)) {
    const { domainResponse, registrationResponse, statusCode } =
      mockEntry[namehash];
    nockGraph(namehash, domainResponse, registrationResponse, statusCode);
  }

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
  const result = await got(`name/${mockNameHash.wrappertest3}`, options).json();
  t.deepEqual(result, mockEntry[mockNameHash.wrappertest3].expect);
});

test('get /name/:tokenId for subdomain returns auto generated image', async (t: ExecutionContext<TestContext>) => {
  const result = await got(`name/${mockNameHash.sub1}`, options).json();
  t.deepEqual(result, mockEntry[mockNameHash.sub1].expect);
});

test('get /name/:tokenId for subdomain returns image from text record', async (t: ExecutionContext<TestContext>) => {
  const result = await got(`name/${mockNameHash.sub2}`, options).json();
  t.deepEqual(result, mockEntry[mockNameHash.sub2].expect);
});

test('get /name/:tokenId for unknown namehash', async (t: ExecutionContext<TestContext>) => {
  const {
    response: { statusCode, body },
  }: HTTPError = await t.throwsAsync(
    () => got(`name/${mockNameHash.unknown}`, options),
    { instanceOf: HTTPError }
  );
  const message = JSON.parse(body as string)?.message;
  t.is(message, mockEntry[mockNameHash.unknown].expect);
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

test('raise FetchError from subgraph', async (t: ExecutionContext<TestContext>) => {
  const fetchError = {
    message: 'reason: connect ECONNREFUSED 127.0.0.1:8000',
  };
  nock(SUBGRAPH_URL.origin)
    .post(SUBGRAPH_URL.pathname, {
      query: GET_DOMAINS,
      variables: {
        tokenId: mockNameHash.sub1,
      },
    })
    .replyWithError(fetchError.message);
  const { response: { body, statusCode } }: HTTPError = await t.throwsAsync(
    () => got(`name/${mockNameHash.sub1}`, options),
    {
      instanceOf: HTTPError,
    }
  );
  const { message } = JSON.parse(body as string);
  t.assert(message.includes(fetchError.message));
  t.is(statusCode, 404);
});
