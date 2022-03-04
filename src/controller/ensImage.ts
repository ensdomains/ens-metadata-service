import { Request, Response } from 'express';
import { FetchError } from 'node-fetch';
import { ContractMismatchError, UnsupportedNetwork } from '../base';
import { checkContract } from '../service/contract';
import { getDomain } from '../service/domain';
import getNetwork from '../service/network';

/* istanbul ignore next */
export async function ensImage (req: Request, res: Response) {
  // #swagger.description = 'ENS NFT image'
  // #swagger.parameters['networkName'] = { description: 'Name of the chain to query for. (mainnet|rinkeby|ropsten|goerli...)' }
  // #swagger.parameters['contractAddress'] = { description: 'Contract address which stores the NFT indicated by the tokenId' }
  // #swagger.parameters['tokenId'] = { description: 'Namehash(v1) /Labelhash(v2) of your ENS name.\n\nMore: https://docs.ens.domains/contract-api-reference/name-processing#hashing-names' }
  const { contractAddress, networkName, tokenId } = req.params;
  try {
    const { provider, SUBGRAPH_URL } = getNetwork(networkName);
    const version = await checkContract(provider, contractAddress, tokenId);
    const result = await getDomain(
      provider,
      networkName,
      SUBGRAPH_URL,
      contractAddress,
      tokenId,
      version
    );
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
    if (error instanceof UnsupportedNetwork) {
      res.status(501).json({
        message: error.message,
      });
    }
    res.status(404).json({
      message: 'No results found.',
    });
  }
}