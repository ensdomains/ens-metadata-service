const swaggerAutogen = require('swagger-autogen')({ openapi: '3.0.0' });

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || 'localhost';
const ENV = process.env.ENV || 'local'; // local/prod
const SERVER_URL =
  ENV === 'local' ? `http://localhost:${PORT}` : `https://${HOST}`;

const outputFile = './src/assets/doc_output.json';
const endpointsFiles = ['./src/endpoint.ts'];

const doc = {
  info: {
    version: '0.0.1-alpha.0',
    title: 'ENS Metadata Service',
    description: 'Set of endpoints to query ENS metadata and more',
    contact: 'contact@ens.domains',
    license: 'MIT License',
    x_logo: {
      url: './src/assets/logo.svg',
      backgroundColor: '#FFFFFF',
    },
  },
  host: SERVER_URL,
  definitions: {
    ENSMetadata: {
      $name: 'ENS name',
      $description: 'Short ENS name description',
      $attributes: 'Custom traits about ENS',
      $name_length: 'Character length of ens name',
      $url: 'ENS App URL of the name',
      $version: 'ENS NFT version',
      $background_image: 'Origin URL of avatar image',
      $image_url: 'URL of ENS NFT image',
    },
    networkName: {
      description: 'Name of the chain to query for.',
      '@enum': ['mainnet', 'rinkeby', 'ropsten', 'goerli'],
    },
    contractAddress: '0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85',
    tokenId: '4221908525551133525058944220830153...',
  },
  components: {
    examples: {
      ENSMetadata: {
        $name: 'nick.eth',
        $description: 'nick.eth, an ENS name.',
        $attributes: [
          {
            trait_type: 'Created Date',
            display_type: 'date',
            value: null,
          },
          {
            trait_type: 'Length',
            display_type: 'number',
            value: 4,
          },
          {
            trait_type: 'Registration Date',
            display_type: 'date',
            value: 1580803395000,
          },
          {
            trait_type: 'Expiration Date',
            display_type: 'date',
            value: 1698131707000,
          },
        ],
        name_length: 4,
        url: 'https://app.ens.domains/name/nick.eth',
        version: 0,
        background_image:
          'https://metadata.ens.domains/mainnet/avatar/nick.eth',
        image_url:
          'https://metadata.ens.domains/mainnet/0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85/0x5d5727cb0fb76e4944eafb88ec9a3cf0b3c9025a4b2f947729137c5d7f84f68f/image',
      },
    },
  },
};

swaggerAutogen(outputFile, endpointsFiles, doc);
