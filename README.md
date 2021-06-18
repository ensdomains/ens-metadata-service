# ens-metadata-service

## API

### Requesst

tokenId accepts namehash of ENS name in both hex and int format

```
/name/{tokenId}
```

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
- Add support for fetching image from text record
- Style default image
- Test metadata display properly on Marketplaces like OpenSea and Rarible
- 404 when tokenId does not exist