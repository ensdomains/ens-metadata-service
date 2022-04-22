import { Request, Response } from 'express';
import { FetchError } from 'node-fetch';
import { ContractMismatchError, UnsupportedNetwork } from '../base';
import { checkContract } from '../service/contract';
import { getDomain } from '../service/domain';
import getNetwork from '../service/network';
import { getLabelhash } from '../utils/labelhash';

export async function ensMetadata(req: Request, res: Response) {
  // #swagger.description = 'ENS NFT metadata'
  // #swagger.parameters['networkName'] = { schema: { $ref: '#/definitions/networkName' } }
  // #swagger.parameters['{}'] = { name: 'contractAddress', description: 'Contract address which stores the NFT indicated by the tokenId', schema: { $ref: '#/definitions/contractAddress' } }
  // #swagger.parameters['tokenId'] = { type: 'string', description: 'Labelhash(v1) /Namehash(v2) of your ENS name.\n\nMore: https://docs.ens.domains/contract-api-reference/name-processing#hashing-names', schema: { $ref: '#/definitions/tokenId' } }
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
      version,
      false
    );
    /* #swagger.responses[200] = { 
             description: 'Metadata object',
             schema: { $ref: '#/definitions/ENSMetadata' }
    } */
    res.json(result);
  } catch (error: any) {
    console.log('error', error);
    let errCode = (error?.code && Number(error.code)) || 500;
    /* #swagger.responses[500] = { 
             description: 'Internal Server Error'
    } */
    if (error instanceof FetchError || error instanceof ContractMismatchError) {
      if (errCode !== 404) {
        res.status(errCode).json({
          message: error.message,
        });
        return;
      }
    }
    /* #swagger.responses[501] = { 
           description: 'Unsupported network' 
      } */
    if (error instanceof UnsupportedNetwork) {
      res.status(501).json({
        message: error.message,
      });
    }
    /* #swagger.responses[404] = { 
             description: 'No results found' 
      } */
    res.status(404).json({
      message: 'No results found.',
    });
  }
}
