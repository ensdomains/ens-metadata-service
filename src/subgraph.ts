import { gql } from 'graphql-request';

export const GET_DOMAINS = gql`
  query getDomains($tokenId: String) {
    domain(id: $tokenId) {
      id
      labelName
      labelhash
      name
      createdAt
      owner {
        id
      }
      parent {
        id
      }
      resolver {
        texts
      }
    }
  }
`;

export const GET_DOMAINS_BY_LABELHASH = gql`
  query getDomains($tokenId: String) {
    domains(
      where: {
        parent: "0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae",
        labelhash: $tokenId
      }
    ) {
      id
      labelName
      labelhash
      name
      createdAt
      owner {
        id
      }
      parent {
        id
      }
      resolver {
        texts
      }
    }
  }
`;

export const GET_REGISTRATIONS = gql`
  query getRegistration($labelhash: String) {
    registrations(
      orderBy: registrationDate
      orderDirection: desc
      where: { id: $labelhash }
    ) {
      labelName
      registrationDate
      expiryDate
    }
  }
`;
