import nock from 'nock';
import { SUBGRAPH_URL as subgraph_url } from '../src/config';
import { GET_DOMAINS, GET_REGISTRATIONS } from '../src/subgraph';
import {
  DomainResponse,
  MockEntryBody,
  RegistrationResponse,
} from './interface';
const SUBGRAPH_URL = new URL(subgraph_url);
const namehash = require('eth-ens-namehash'); // no types

export class MockEntry {
  public name: string;
  public namehash: string;
  public domainResponse!: DomainResponse | null;
  public registrationResponse: RegistrationResponse | null = null;
  public expect: object | string;
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
  }: MockEntryBody) {
    if (!name) throw Error('There must be a valid name.');
    this.name = name;
    this.namehash = namehash.hash(name);

    if (unknown) {
      this.expect = 'No results found.';
      nock(SUBGRAPH_URL.origin)
        .post(SUBGRAPH_URL.pathname, {
          query: GET_DOMAINS,
          variables: {
            tokenId: this.namehash,
          },
        })
        .reply(statusCode, {
          data: null,
        });
      return;
    }

    const randomDate = this.getRandomDate();
    const labelName = name.split('.')[0];
    const labelhash = namehash.hash(labelName);

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
    let attributes = [
      {
        trait_type: 'Created Date',
        display_type: 'date',
        value: +randomDate * 1000,
      },
    ];
    if (registration) {
      this.registrationResponse = {
        registrations: [
          {
            expiryDate: randomDate,
            labelName: name,
            registrationDate: randomDate,
          },
        ],
      };
      attributes = [
        ...attributes,
        {
          trait_type: 'Registration Date',
          display_type: 'date',
          value: +randomDate * 1000,
        },
        {
          trait_type: 'Expiration Date',
          display_type: 'date',
          value: +randomDate * 1000,
        },
      ];
      nock(SUBGRAPH_URL.origin)
        .post(SUBGRAPH_URL.pathname, {
          query: GET_REGISTRATIONS,
          variables: {
            labelhash,
          },
        })
        .reply(statusCode, {
          data: this.registrationResponse,
        });
    }
    this.expect = {
      name,
      description: name,
      image,
      image_url: image,
      external_link: `https://ens.domains/name/${name}`,
      attributes,
    };
    nock(SUBGRAPH_URL.origin)
      .post(SUBGRAPH_URL.pathname, {
        query: GET_DOMAINS,
        variables: {
          tokenId: this.namehash,
        },
      })
      .reply(statusCode, {
        data: this.domainResponse,
      });
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
