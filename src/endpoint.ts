import { Express } from 'express';
import { FetchError } from 'node-fetch';
import { getDomain } from './domain';
import { checkContract, ContractMismatchError } from './contract';
import {
  getAvatarImage,
  getAvatarMeta,
  ResolverNotFound,
  TextRecordNotFound,
  UnsupportedNamespace,
} from './avatar';

export default function (app: Express) {
  app.get('/', (_req, res) => {
    res.send('Well done mate To see more go to "/docs"!');
  });

  app.get(
    '/:contractAddress(0x[a-fA-F0-9]{40})/:tokenId',
    async function (req, res) {
      // #swagger.description = 'ENS NFT metadata'
      // #swagger.parameters['{}'] = { name: 'contractAddress', description: 'Contract address which stores the NFT indicated by the tokenId' }
      // #swagger.parameters['tokenId'] = { description: 'Namehash(v1) /Labelhash(v2) of your ENS name.\n\nMore: https://docs.ens.domains/contract-api-reference/name-processing#hashing-names' }
      const { contractAddress, tokenId } = req.params;
      try {
        const version = await checkContract(contractAddress, tokenId);
        const result = await getDomain(
          contractAddress,
          tokenId,
          version,
          false
        );
        /* #swagger.responses[200] = { 
               description: 'Metadata object' 
        } */
        res.json(result);
      } catch (error: any) {
        console.log('error', error);
        let errCode = (error?.code && Number(error.code)) || 500;
        if (
          error instanceof FetchError ||
          error instanceof ContractMismatchError
        ) {
          if (errCode !== 404) {
            res.status(errCode).json({
              message: error.message,
            });
            return;
          }
        }
        /* #swagger.responses[404] = { 
               description: 'No results found.' 
        } */
        res.status(404).json({
          message: 'No results found.',
        });
      }
    }
  );

  app.get(
    '/:contractAddress(0x[a-fA-F0-9]{40})/:tokenId/image',
    /* istanbul ignore next */
    async function (req, res) {
      // #swagger.description = 'ENS NFT image'
      // #swagger.parameters['contractAddress'] = { description: 'Contract address which stores the NFT indicated by the tokenId' }
      // #swagger.parameters['tokenId'] = { description: 'Namehash(v1) /Labelhash(v2) of your ENS name.\n\nMore: https://docs.ens.domains/contract-api-reference/name-processing#hashing-names' }
      const { contractAddress, tokenId } = req.params;
      try {
        const version = await checkContract(contractAddress, tokenId);
        const result = await getDomain(contractAddress, tokenId, version);
        if (result.image_url) {
          const base64 = result.image_url.replace(
            'data:image/svg+xml;base64,',
            ''
          );
          const buffer = Buffer.from(base64, 'base64');
          res.writeHead(200, {
            'Content-Type': 'image/svg+xml',
            'Content-Length': buffer.length,
          });
          res.end(buffer);
        } else {
          throw Error('Image URL is missing.');
        }
        /* #swagger.responses[200] = { 
               description: 'Image file' 
        } */
      } catch (error) {
        if (
          error instanceof FetchError ||
          error instanceof ContractMismatchError
        ) {
          res.status(404).json({
            message: error.message,
          });
          return;
        }
        res.status(404).json({
          message: 'No results found.',
        });
      }
    }
  );

  app.get('/avatar/:name/meta', async function (req, res) {
    // #swagger.description = 'ENS avatar metadata'
    // #swagger.parameters['name'] = { description: 'ENS name' }
    try {
      const { name } = req.params;
      const meta = await getAvatarMeta(name);
      if (meta) {
        res.status(200).json(meta);
      } else {
        res.status(404).json({
          message: 'No results found.',
        });
      }
    } catch (error: any) {
      const errCode = (error?.code && Number(error.code)) || 500;
      if (
        error instanceof FetchError ||
        error instanceof ResolverNotFound ||
        error instanceof TextRecordNotFound ||
        error instanceof UnsupportedNamespace
      ) {
        res.status(errCode).json({
          message: error.message,
        });
        return;
      }
    }
  });

  app.get('/avatar/:name', async function (req, res) {
    // #swagger.description = 'ENS avatar record'
    // #swagger.parameters['name'] = { description: 'ENS name' }
    const { name } = req.params;
    try {
      const [buffer, mimeType] = await getAvatarImage(name);
      if (buffer) {
        res.writeHead(200, {
          'Content-Type': mimeType,
          'Content-Length': buffer.length,
        });
        res.end(buffer);
      }
      res.status(404).json({
        message: 'No results found.',
      });
    } catch (error: any) {
      const errCode = (error?.code && Number(error.code)) || 500;
      if (
        error instanceof FetchError ||
        error instanceof ResolverNotFound ||
        error instanceof TextRecordNotFound ||
        error instanceof UnsupportedNamespace
      ) {
        res.status(errCode).json({
          message: error.message,
        });
        return;
      }
    }
  });
}
