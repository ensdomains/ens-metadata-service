import { Request, Response } from 'express';
import { FetchError } from 'node-fetch';
import { ContractMismatchError, UnsupportedNetwork } from '../base';
import { RESPONSE_TIMEOUT } from '../config';
import { checkContract } from '../service/contract';
import { getDomain } from '../service/domain';
import getNetwork from '../service/network';
import { getLabelhash } from '../utils/labelhash';

/* istanbul ignore next */
export async function ensImage(req: Request, res: Response) {
  // #swagger.description = 'ENS NFT image'
  // #swagger.parameters['networkName'] = { schema: { $ref: '#/definitions/networkName' } }
  // #swagger.parameters['{}'] = { name: 'contractAddress', description: 'Contract address which stores the NFT indicated by the tokenId', type: 'string', schema: { $ref: '#/definitions/contractAddress' } }
  // #swagger.parameters['tokenId'] = { type: 'string', description: 'Labelhash(v1) /Namehash(v2) of your ENS name.\n\nMore: https://docs.ens.domains/contract-api-reference/name-processing#hashing-names', schema: { $ref: '#/definitions/tokenId' } }
  res.setTimeout(RESPONSE_TIMEOUT, () => {
    res.status(504).json({ message: 'Timeout' });
  });

  const { contractAddress, networkName, tokenId } = req.params;
  const _tokenId = getLabelhash(tokenId);

  try {
    const { provider, SUBGRAPH_URL } = getNetwork(networkName);
    const version = await checkContract(provider, contractAddress, _tokenId);
    const result = await getDomain(
      provider,
      networkName,
      SUBGRAPH_URL,
      contractAddress,
      _tokenId,
      version
    );
    if (result.image_url) {
      const base64 = result.image_url.replace('data:image/svg+xml;base64,', '');
      const buffer = Buffer.from(base64, 'base64');
      res.writeHead(200, {
        'Content-Type': 'image/svg+xml',
        'Content-Length': buffer.length,
      });
      res.end(buffer);
      return;
    } else {
      throw Error('Image URL is missing.');
    }
    /* #swagger.responses[200] = { 
        description: 'Image file'
    } */
  } catch (error) {
    if (error instanceof FetchError || error instanceof ContractMismatchError) {
      /* #swagger.responses[404] = { 
           description: 'No results found' 
      } */
      res.status(404).json({
        message: error.message,
      });
      return;
    }
    /* #swagger.responses[501] = { 
           description: 'Unsupported network' 
    } */
    if (error instanceof UnsupportedNetwork) {
      res.status(501).json({
        message: error.message,
      });
      return;
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
