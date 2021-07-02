import { gql } from 'graphql-request'

export const GET_DOMAINS = gql`
  query getDomains($tokenId: String ){
    domain(id:$tokenId){
      id
      labelName
      labelhash
      name
      createdAt
      owner{
        id
      }
      parent{
        id
      }
      resolver{
        texts
      }
    }    
  }
`

export const GET_REGISTRATIONS = gql`
  query getRegistration($labelhash: String){
    registrations(orderBy:registrationDate, orderDirection:desc, where:{id:$labelhash}){
      labelName    
      registrationDate
      expiryDate
    }  
  }
`
