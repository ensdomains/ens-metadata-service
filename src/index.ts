import express from 'express';
import { gql } from 'graphql-request'
import { request } from 'graphql-request'
import { nextTick } from 'process';
import { ethers } from "ethers";

const btoa = require('btoa');
// const URL = 'http://127.0.0.1:8000/subgraphs/name/graphprotocol/ens'
const URL = 'https://api.thegraph.com/subgraphs/name/makoto/ensrinkeby'
const eth = '0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae'
function getImage(name:string){
  return `
  <svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
    <g>
      <rect width="300" height="300" stroke-width="2" fill="blue"></rect>
      <text
        x="150"
        y="150"
        alignment-baseline="middle"
        font-size="20"
        stroke-width="0"
        fill="white"
        text-anchor="middle"
      >
        ${name}
      </text>
    </g>  
  </svg>
  `
}

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
const app = express();

app.get('/', (req, res) => {
  res.send('Well done mate!');
})

app.get('/name/:tokenId', async function (req, res) {
  let { tokenId } = req.params
  console.log(1, {tokenId})
  let hexId, intId
  if(!tokenId.match(/^0x/)){
    intId = tokenId
    hexId = ethers.utils.hexValue(ethers.BigNumber.from(tokenId))
  }else{
    intId = ethers.BigNumber.from(tokenId).toString()
    hexId = tokenId
  }
  console.log(2, {intId, hexId})
  try{
    const {domain:{name, labelName, labelhash, createdAt, owner, parent}} = await request(URL, GET_DOMAINS, { tokenId:hexId })
    console.log({name, labelName, labelhash, createdAt, owner, parent})
    const imageUrl = 'data:image/svg+xml;base64,'+ btoa(getImage(name))
    let attributes = [
      {
        "trait_type":"Created Date",
        "display_type":"date",
        "value":createdAt * 1000
      }
    ]
    if(parent.id === eth){
      const {registrations} = await request(URL, GET_REGISTRATIONS, { labelhash })
      console.log({registrations})
      const registration = registrations[0]
      if(registration){
        attributes.push({
          "trait_type":"Registration Date",
          "display_type":"date",
          "value":registration.registrationDate * 1000
        })        
        attributes.push({
          "trait_type":"Expiration Date",
          "display_type":"date",
          "value":registration.expiryDate * 1000
        })
      }
    }
    const obj = {
      "name":name,
      "description":name,
      "image":imageUrl,
      "image_url":imageUrl,
      "external_link": `https://ens.domains/name/${name}`,
      "attributes":attributes
    }
    res.json(obj)  
  }catch(e){
    console.log({e})
    nextTick(e)
  }
})

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`APP_LOG::App listening on port ${PORT}`);
});
