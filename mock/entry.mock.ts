import { utils } from 'ethers';
import nock from 'nock';
import { Version } from '../src/base';
import { ADDRESS_NAME_WRAPPER } from '../src/config';
import { Metadata } from '../src/service/metadata';
import getNetwork from '../src/service/network';
import { GET_DOMAINS, GET_REGISTRATIONS } from '../src/service/subgraph';
import {
  DomainResponse,
  MockEntryBody,
  RegistrationResponse,
} from './interface';

const { SUBGRAPH_URL: subgraph_url } = getNetwork('goerli');
const SUBGRAPH_URL = new URL(subgraph_url);
const namehash = require('@ensdomains/eth-ens-namehash'); // no types

export class MockEntry {
  public name: string;
  public namehash: string;
  public domainResponse!: DomainResponse | null;
  public registrationResponse: RegistrationResponse | null = null;
  public expect: Metadata | string;
  constructor({
    name,
    hasImageKey = null,
    image,
    owner = '0x97ba55f61345665cf08c4233b9d6e61051a43b18',
    parent = '0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae',
    resolver = null,
    registration = false,
    statusCode = 200,
    unknown = false,
    registered = true,
    version = Version.v2,
    persist = false,
  }: MockEntryBody) {
    if (!name) throw Error('There must be a valid name.');
    this.name = name;
    this.namehash = namehash.hash(name);

    if (!registered) {
      this.expect = 'No results found.';
      nock(SUBGRAPH_URL.origin)
        .post(SUBGRAPH_URL.pathname, {
          query: GET_DOMAINS,
          variables: {
            tokenId: this.namehash,
          },
          operationName: "getDomains"
        })
        .reply(statusCode, {
          data: null,
        }).persist(persist);
      return;
    }

    if (unknown) {
      const { url, ...unknownMetadata } = new Metadata({
        name: 'unknown.name',
        description: 'Unknown ENS name',
        created_date: 1580346653000,
        tokenId: '',
        version: Version.v1,
      });
      this.expect = JSON.parse(JSON.stringify(unknownMetadata));
      nock(SUBGRAPH_URL.origin)
        .post(SUBGRAPH_URL.pathname, {
          query: GET_DOMAINS,
          variables: {
            tokenId: this.namehash,
          },
          operationName: "getDomains"
        })
        .reply(statusCode, {
          data: { domain: {}},
        })
        .persist(persist);
      return;
    }

    const randomDate = this.getRandomDate();
    const registrationDate = +new Date() - 157680000000;
    const expiryDate = +new Date() + 31536000000;
    const labelName = name.split('.')[0];
    const labelhash = utils.keccak256(utils.toUtf8Bytes(labelName));
    const _metadata = new Metadata({
      name,
      created_date: +randomDate,
      tokenId: this.namehash,
      version,
    });

    (_metadata as Metadata).setImage(
      `https://metadata.ens.domains/goerli/${ADDRESS_NAME_WRAPPER}/${this.namehash}/image`
    );
    (_metadata as Metadata).setBackground(
      `https://metadata.ens.domains/goerli/avatar/${name}`
    );

    this.domainResponse = {
      domain: {
        createdAt: randomDate,
        id: this.namehash,
        labelName,
        labelhash,
        name,
        owner: { id: owner },
        parent: {
          id: parent,
        },
        resolver,
        hasImageKey,
      },
    };

    if (registration) {
      this.registrationResponse = {
        registrations: [
          {
            expiryDate: expiryDate.toString(),
            labelName: name,
            registrationDate: registrationDate.toString(),
          },
        ],
      };
      _metadata.addAttribute({
        trait_type: 'Registration Date',
        display_type: 'date',
        value: registrationDate * 1000,
      });
      _metadata.addAttribute({
        trait_type: 'Expiration Date',
        display_type: 'date',
        value: expiryDate * 1000,
      });

      nock(SUBGRAPH_URL.origin)
        .post(SUBGRAPH_URL.pathname, {
          query: GET_REGISTRATIONS,
          variables: {
            labelhash,
          },
          operationName: "getRegistration"
        })
        .reply(statusCode, {
          data: this.registrationResponse,
        })
        .persist(persist);
    }

    this.expect = JSON.parse(JSON.stringify(_metadata)); //todo: find better serialization option

    nock(SUBGRAPH_URL.origin)
      .post(SUBGRAPH_URL.pathname, {
        query: GET_DOMAINS,
        variables: {
          tokenId: this.namehash,
        },
        operationName: "getDomains"
      })
      .reply(statusCode, {
        data: this.domainResponse,
      })
      .persist(persist);
  }

  getRandomDate(
    start: Date = new Date(2017, 3, 4),
    end: Date = new Date()
  ): string {
    return (
      new Date(
        start.getTime() + Math.random() * (end.getTime() - start.getTime())
      ).getTime() / 1000
    ).toFixed(0);
  }
}
