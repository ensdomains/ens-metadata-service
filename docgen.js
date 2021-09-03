const swaggerAutogen = require('swagger-autogen')({ openapi: '3.0.0' });

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || 'localhost';
const ENV = process.env.ENV || 'local'; // local/prod
const SERVER_URL =
  ENV === 'local' ? `http://localhost:${PORT}` : `https://${HOST}`;

const outputFile = './src/assets/doc_output.json';
const endpointsFiles = ['./src/endpoint.ts', './src/metadata.ts'];

const doc = {
  info: {
    version: '0.0.1-alpha.0',
    title: 'ENS Metadata Service',
    description: 'Set of endpoints to query ENS metadata and more',
    contact: "contact@ens.domains",
    license: "MIT License",
    x_logo: {
        "url": "./src/assets/logo.svg",
        "backgroundColor": "#FFFFFF"
    }
  },
  host: SERVER_URL,
};

swaggerAutogen(outputFile, endpointsFiles, doc);
