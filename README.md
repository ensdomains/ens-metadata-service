# ens-metadata-service

## API

### Requesst

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

Attreibutes include

- Created Date
- Registration Date (only .eth secondary domain)
- Expiration Date   (only .eth secondary domain)

## How to setup

```
git clone https://github.com/ensdomains/ens-metadata-service.git
cd ens-metadata-service
yarn
yarn dev 
```

## How to deploy

```
yarn deploy
```

## TODO

- Add test (especially to mock external calls like subgraph)
- Style default image (Use custom font)
- 404 when tokenId does not exist