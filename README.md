# ens-metadata-service

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![License][license-shield]][license-url]
[![Travis][travis-shield]][travis-url]

## API


### Request

contactAddress: accepts contractAddress of the NFT which represented by the tokenId
NFT v1 - tokenId: accepts labelhash of ENS name in both hex and int format
NFT v2 - tokenId: accepts namehash of ENS name in both hex and int format

```
/{contractAddress}/{tokenId}
```

Examples

- [Default image](https://testnets.opensea.io/assets/0x9029c1574f91696026358d4edB0De773d0E04aeD/0x2517c0dfe3a4eebac3456a409c53f824f86070c73d48794d8268ec5c007ee683)
- [Custom image](https://testnets.opensea.io/assets/0x9029c1574f91696026358d4edB0De773d0E04aeD/84120850835537414527020398714431393504535329440173489282076403473842759587505)


### Response

```json
{
  "name":"nftest1.eth",
  "description":"nftest1.eth, an ENS name.",
  "attributes":[
    {
      "trait_type":"Created Date",
      "display_type":"date",
      "value":1626897331000
    },
    {
      "trait_type":"Registration Date",
      "display_type":"date",
      "value":1626897331000
    },
    {
      "trait_type":"Expiration Date",
      "display_type":"date",
      "value":1658454283000
    }
  ],
  "name_length":11,
  "length":0,
  "url":"https://app.ens.domains/name/nftest1.eth",
  "version":1,
  "image_url":"data:image/svg+xml;base64,CiAgICA8c3ZnIHdpZHRoPSI..."
}
```

Attributes include

- Created Date
- Registration Date (only .eth secondary domain)
- Expiration Date   (only .eth secondary domain)


## How to setup

```
git clone https://github.com/ensdomains/ens-metadata-service.git
cd ens-metadata-service
cp .env.org .env // Fill in Vars
yarn
yarn dev
```


## How to deploy

```
yarn deploy
```


## How to test

Regular unit test;
```
yarn test
```

Unit test + coverage;
```
yarn test:cov
```


## Environment Variables

| Name | Description | Default value | Options |
| ---- | ----------- | ------------- | ------- |
| INFURA_API_KEY | API Key provided by Infura. [See here](https://infura.io/docs/gettingStarted/projectSecurity) (Required) | - | - |
| HOST | Host (ip/domain) address of the running service | localhost | - | No |
| NETWORK | Ethereum network name, the service will run on | rinkeby | local/rinkeby/ropsten/goerli/mainnet |
| ENV | Project scope | local | local/prod |
| INAMEWRAPPER | InterfaceId of NameWrapper Contract | 0x1aa28a1e | - |
| ADDRESS_ETH_REGISTRAR | Ethereum address of ENSBaseRegistrar Contract | 0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85 | - |
| ADDRESS_NAME_WRAPPER | Ethereum address of NameWrapper Contract | 0x4D83cea620E3864F912046b73bB3a6c04Da75990 | - |

## TODO

- Configure for different networks (localhost/rinkeby/ropsten/goerli/mainnet)

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: https://img.shields.io/github/contributors/ensdomains/ens-metadata-service.svg?style=for-the-badge
[contributors-url]: https://github.com/ensdomains/ens-metadata-service/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/ensdomains/ens-metadata-service.svg?style=for-the-badge
[forks-url]: https://github.com/mdtanrikulu/ensdomains/ens-metadata-service/members
[stars-shield]: https://img.shields.io/github/stars/ensdomains/ens-metadata-service.svg?style=for-the-badge
[stars-url]: https://github.com/ensdomains/ens-metadata-service/stargazers
[issues-shield]: https://img.shields.io/github/issues/ensdomains/ens-metadata-service.svg?style=for-the-badge
[issues-url]: https://github.com/ensdomains/ens-metadata-service/issues
[license-shield]: https://img.shields.io/github/license/ensdomains/ens-metadata-service.svg?style=for-the-badge
[license-url]: https://github.com/ensdomains/ens-metadata-service/blob/master/LICENSE
[travis-shield]: https://img.shields.io/travis/com/ensdomains/ens-metadata-service/master?style=for-the-badge
[travis-url]: https://travis-ci.com/github/ensdomains/ens-metadata-service
