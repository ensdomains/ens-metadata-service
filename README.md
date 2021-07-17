# ens-metadata-service

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![License][license-shield]][license-url]
[![Travis][travis-shield]][travis-url]

## API

### Request

tokenId accepts namehash of ENS name in both hex and int format

```
/name/{tokenId}
```

Examples

- [Default image](https://testnets.opensea.io/assets/0x9029c1574f91696026358d4edB0De773d0E04aeD/0x2517c0dfe3a4eebac3456a409c53f824f86070c73d48794d8268ec5c007ee683)
- [Custom image](https://testnets.opensea.io/assets/0x9029c1574f91696026358d4edB0De773d0E04aeD/84120850835537414527020398714431393504535329440173489282076403473842759587505)

### Response

```
{
  "name": "sub1.wrappertest.eth",
  "description": "sub1.wrappertest.eth",
  "image": "data:image/svg+xml;base64,CiAgPHN2ZyB...",
  "image_url": "data:image/svg+xml;base64,CiAgPHN...",
  "external_link": "https://ens.domains/name/sub1.wrappertest.eth",
  "attributes": [
    {
      "trait_type": "Created Date",
      "display_type": "date",
      "value": 1623949711000
    }
  ]
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

## TODO

- 404 when the token does not exist for given tokenId
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
