import { Request, Response }       from 'express';
import { FetchError }              from 'node-fetch';
import {
  ContractMismatchError,
  ExpiredNameError,
  NamehashMismatchError,
  UnsupportedNetwork,
}                                  from '../base';
import { RESPONSE_TIMEOUT }        from '../config';
import { checkContract }           from '../service/contract';
import { getDomain }               from '../service/domain';
import getNetwork, { NetworkName } from '../service/network';
import createDocumentfromTemplate  from '../template-document';

/* istanbul ignore next */
export async function ensImage(req: Request, res: Response) {
  // #swagger.description = 'ENS NFT image'
  // #swagger.parameters['networkName'] = { schema: { $ref: '#/definitions/networkName' } }
  // #swagger.parameters['{}'] = { name: 'contractAddress', description: 'Contract address which stores the NFT indicated by the tokenId', type: 'string', schema: { $ref: '#/definitions/contractAddress' } }
  // #swagger.parameters['tokenId'] = { type: 'string', description: 'Labelhash(v1) /Namehash(v2) of your ENS name.\n\nMore: https://docs.ens.domains/contract-api-reference/name-processing#hashing-names', schema: { $ref: '#/definitions/tokenId' } }
  res.setTimeout(RESPONSE_TIMEOUT, () => {
    if (!res.headersSent) {
      res.status(504).json({ message: 'Timeout' });
      return;
    }
  });

  const { contractAddress, networkName, tokenId: identifier } = req.params;

  try {
    const { provider, SUBGRAPH_URL } = getNetwork(networkName as NetworkName);
    const { tokenId, version } = await checkContract(
      provider,
      contractAddress,
      identifier
    );
    const result = await getDomain(
      provider,
      networkName as NetworkName,
      SUBGRAPH_URL,
      contractAddress,
      tokenId,
      version
    );
    if (result.image_url) {
      if (req.header('sec-fetch-dest') === 'document') {
        const documentTemplate = createDocumentfromTemplate({ metadata: {...result, network: networkName }});
        res
          .writeHead(200, {
            'Content-Type': 'text/html',
          })
          .end(documentTemplate);
        return;
      }
      const base64 = result.image_url.replace('data:image/svg+xml;base64,', '');
      const buffer = Buffer.from(base64, 'base64');
      if (!res.headersSent) {
        res
          .writeHead(200, {
            'Content-Type': 'image/svg+xml',
            'Content-Length': buffer.length,
          })
          .end(buffer);
        return;
      }
    } else {
      throw Error('Image URL is missing.');
    }
    /* #swagger.responses[200] = { 
        description: 'Image file'
    } */
  } catch (error: any) {
    const errCode = (error?.code && Number(error.code)) || 500;

    if (error instanceof FetchError) {
      /* #swagger.responses[404] = { 
           description: 'No results found' 
      } */
      res.status(404).json({
        message: error.message,
      });
      return;
    }

    /* #swagger.responses[500] = { 
             description: 'Internal Server Error'
    } */
    /* #swagger.responses[501] = { 
           description: 'Unsupported network' 
    } */
    if (
      error instanceof ContractMismatchError ||
      error instanceof ExpiredNameError ||
      error instanceof NamehashMismatchError ||
      error instanceof UnsupportedNetwork
    ) {
      if (!res.headersSent) {
        res.status(errCode).json({
          message: error.message,
        });
        return;
      }
    }

    /* #swagger.responses[404] = { 
           description: 'No results found' 
    } */
    if (!res.headersSent) {
      res.status(404).json({
        message: 'No results found.',
      });
    }
  }
}
