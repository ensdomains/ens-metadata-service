import { Express }                              from 'express';
import { FetchError }                           from 'node-fetch';
import docUI                                    from 'redoc-express';
import { getDomain }                            from './domain';
import { checkContract, ContractMismatchError } from './contract';
import {
  getAvatar,
  ResolverNotFound,
  TextRecordNotFound,
  UnsupportedNamespace,
}                                               from './avatar';

export default function (app: Express) {
  app.get('/', (_req, res) => {
    res.send('Well done mate!');
  });

  app.get(
    '/:contractAddress(0x[a-fA-F0-9]{40})/:tokenId',
    async function (req, res) {
      // #swagger.description = 'ENS name metadata endpoint'
      // #swagger.parameters['{}'] = { name: 'contractAddress', description: 'Contract address which stores the NFT indicated by the tokenId' }
      // #swagger.parameters['tokenId'] = { description: 'Namehash/Labelhash of your ENS name' }
      const { contractAddress, tokenId } = req.params;
      try {
        const version = await checkContract(contractAddress, tokenId);
        const result  = await getDomain(tokenId, version);
        /* #swagger.responses[200] = { 
               description: 'Metadata object' 
        } */
        res.json(result);
      } catch (error) {
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
      // #swagger.description = 'ENS name image endpoint'
      // #swagger.parameters['contractAddress'] = { description: 'Contract address which stores the NFT indicated by the tokenId' }
      // #swagger.parameters['tokenId'] = { description: 'Namehash/Labelhash of your ENS name' }
      const { contractAddress, tokenId } = req.params;
      try {
        const version = await checkContract(contractAddress, tokenId);
        const result = await getDomain(tokenId, version);
        const body = `
            <html>
              <object data=${result.image_url} type="image/svg+xml">
                <img src=${result.image_url} />
              </object>
            </html>
          `;
        /* #swagger.responses[200] = { 
               description: 'Image file' 
        } */
        res.send(body);
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

  app.get('/avatar/:name', async function (req, res) {
    const { name } = req.params;
    try {
      const [buffer, mimeType] = await getAvatar(name);
      if (buffer) {
        const image = Buffer.from(buffer as any, 'base64');
        res.writeHead(200, {
          'Content-Type': mimeType,
          'Content-Length': image.length,
        });
        res.end(image);
      }
      res.status(404).json({
        message: 'No results found.',
      });
    } catch (error) {
      const errCode = (error?.code && Number(error.code)) || 500;
      if (
        error instanceof FetchError         ||
        error instanceof ResolverNotFound   ||
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

  app.get(
    '/docs',
    docUI({
      title: 'ENS',
      specUrl: '/assets/doc_output.json'
    })
  );
}
