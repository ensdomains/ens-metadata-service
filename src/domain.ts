import { gql } from 'graphql-request'
import { request } from 'graphql-request'
import { ethers } from "ethers";

const btoa = require('btoa');
// const URL = 'http://127.0.0.1:8000/subgraphs/name/graphprotocol/ens'
const URL = 'https://api.thegraph.com/subgraphs/name/makoto/ensrinkeby'
const eth = '0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae'
function textEllipsis(name:string, max:number){
  return name.slice(0,max - 3) + '...'
}

function getFontSize(name:string){
  if(name.length <= 15){
    return 27
  }else if(name.length <= 20){
    return 20
  }else{
    return 13
  }
}

export function getImage(name:string){
  const max = 30
  let subdomainText, domain, subdomain, domainFontSize, subdomainFontSize
  const labels = name.split('.')
  const isSubdomain = labels.length > 2
  if(isSubdomain){
    subdomain = labels.slice(0,labels.length -2).join('.') + '.'
    domain = labels.slice(-2).join('.')
    if(subdomain.length > max){
      subdomain = textEllipsis(subdomain, max)
    }
    subdomainFontSize = getFontSize(subdomain)
    subdomainText = `
    <text
      x="30"
      y="220"
      font-family= "monospace"
      font-size="${subdomainFontSize}px"
      stroke-width="0"
      opacity="0.4"
      fill="white"
    >
      ${subdomain}
    </text>
    `
  }else{
    domain = name
  }
  if(domain.length > max){
    domain =  textEllipsis(domain, max)
  }
  domainFontSize = getFontSize(domain)


  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
    <defs>
    <style>
      text { text-overflow: ellipsis; }
    </style>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%" gradientTransform="rotate(45)">
      <stop offset="0%" style="stop-color:#2EE6CF;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#5B51D1;stop-opacity:1" />
    </linearGradient>
    </defs>
    <g>
      <rect id="rect1" width="300" height="300" stroke-width="2" fill="url(#grad1)"></rect>
      <g transform="translate(30,30)">
        <path d="M6.03972 19.0875C6.50123 20.0841 7.64346 22.0541 7.64346 22.0541L20.8484 0L7.96075 9.09205C7.19283 9.60962 6.5628 10.3102 6.12625 11.1319C5.53928 12.3716 5.22742 13.7259 5.21248 15.1C5.19753 16.4742 5.47986 17.8351 6.03972 19.0875Z" fill="white"/>
        <path d="M0.152014 27.1672C0.302413 29.2771 0.912202 31.3312 1.94055 33.1919C2.96889 35.0527 4.39206 36.6772 6.11475 37.9567L20.8487 48C20.8487 48 11.6303 35.013 3.85487 22.0902C3.06769 20.7249 2.5385 19.2322 2.29263 17.6835C2.1838 16.9822 2.1838 16.2689 2.29263 15.5676C2.0899 15.9348 1.69636 16.6867 1.69636 16.6867C0.907964 18.2586 0.371029 19.9394 0.104312 21.6705C-0.0492081 23.5004 -0.0332426 25.3401 0.152014 27.1672Z" fill="white"/>
        <path d="M38.1927 28.9125C37.6928 27.9159 36.4555 25.946 36.4555 25.946L22.1514 48L36.1118 38.9138C36.9436 38.3962 37.6261 37.6956 38.099 36.8739C38.7358 35.6334 39.0741 34.2781 39.0903 32.9029C39.1065 31.5277 38.8001 30.1657 38.1927 28.9125Z" fill="white"/>
        <path d="M42.8512 20.8328C42.7008 18.7229 42.0909 16.6688 41.0624 14.8081C40.0339 12.9473 38.6105 11.3228 36.8876 10.0433L22.1514 0C22.1514 0 31.3652 12.987 39.1478 25.9098C39.933 27.2755 40.4603 28.7682 40.7043 30.3165C40.8132 31.0178 40.8132 31.7311 40.7043 32.4324C40.9071 32.0652 41.3007 31.3133 41.3007 31.3133C42.0892 29.7414 42.6262 28.0606 42.893 26.3295C43.0485 24.4998 43.0345 22.66 42.8512 20.8328Z" fill="white"/>

      </g>

      ${subdomainText}
      <text
        x="30"
        y="250"
        font-family="monospace"
        font-size="${domainFontSize}px"
        stroke-width="0"
        fill="white"
      >
        ${domain}
      </text>
    </g>  
  </svg>
  `
  return 'data:image/svg+xml;base64,'+ btoa(svg)
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

interface Domain {
  name: string;
  description: string;
  image: string;
  image_url: string;
  external_link: string;
  attributes:any;
}

export async function getDomain(tokenId:string):Promise<Domain>   {
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
      const imageUrl = getImage(name)
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
      const obj:Domain = {
        "name":name,
        "description":name,
        "image":imageUrl,
        "image_url":imageUrl,
        "external_link": `https://ens.domains/name/${name}`,
        "attributes":attributes
      }
      return(obj)  
    }catch(e){
      console.log({e})
      return({
        "name":'',
        "description":'',
        "image":'',
        "image_url":'',
        "external_link": '',
        "attributes":''
      })
    }  
}