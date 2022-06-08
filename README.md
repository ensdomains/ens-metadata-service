# ens-metadata-service

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![License][license-shield]][license-url]
[![Travis][travis-shield]][travis-url]

## API


### Request
- __network:__ Name of the chain to query for. (mainnet | rinkeby | ropsten | goerli ...)
- __contactAddress:__ accepts contractAddress of the NFT which represented by the tokenId
- __NFT v1 - tokenId:__ accepts labelhash of ENS name in both hex and int format
- __NFT v2 - tokenId:__ accepts namehash of ENS name in both hex and int format

```
/{networkName}/{contractAddress}/{tokenId}
```

Request (example)

https://metadata.ens.domains/mainnet/0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85/42219085255511335250589442208301538195142221433306354426240614732612795430543/

### Response (example)

```json
{
  "name": "nick.eth",
  "description": "nick.eth, an ENS name.",
  "attributes": [
    {
      "trait_type": "Created Date",
      "display_type": "date",
      "value": 1580803395000
    },
    {
      "trait_type": "Registration Date",
      "display_type": "date",
      "value": 1580803395000
    },
    {
      "trait_type": "Expiration Date",
      "display_type": "date",
      "value": 1698131707000
    }
  ],
  "name_length": 4,
  "short_name": null,
  "length": 0,
  "url": "https://app.ens.domains/name/nick.eth",
  "version": 0,
  "background_image": "https://metadata.ens.domains/mainnet/avatar/nick.eth",
  "image_url": "https://metadata.ens.domains/mainnet/0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85/0x5d5727cb0fb76e4944eafb88ec9a3cf0b3c9025a4b2f947729137c5d7f84f68f/image"
}

```

More info and list of all endpoints: https://metadata.ens.domains/docs


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
| HOST | Host (ip/domain) address of the running service | localhost | - | No |
| ENV | Project scope | local | local/prod |
| INAMEWRAPPER | InterfaceId of NameWrapper Contract | 0x1aa28a1e | - |
| ADDRESS_ETH_REGISTRAR | Ethereum address of ENSBaseRegistrar Contract | 0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85 | - |
| ADDRESS_NAME_WRAPPER | Ethereum address of NameWrapper Contract | 0x4D83cea620E3864F912046b73bB3a6c04Da75990 | - |


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
