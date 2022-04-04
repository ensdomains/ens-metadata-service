import { Request, Response } from 'express';
import { FetchError } from 'node-fetch';
import { ContractMismatchError, Version } from '../base';
import { checkContract } from '../service/contract';
import { getDomain } from '../service/domain';
import { Metadata } from '../service/metadata';
import getNetwork from '../service/network';

export async function ensMetadata(req: Request, res: Response) {
  // #swagger.description = 'ENS NFT metadata'
  // #swagger.parameters['networkName'] = { description: 'Name of the chain to query for. (mainnet|rinkeby|ropsten|goerli...)' }
  // #swagger.parameters['{}'] = { name: 'contractAddress', description: 'Contract address which stores the NFT indicated by the tokenId' }
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
    if (error instanceof FetchError || error instanceof ContractMismatchError) {
      if (errCode !== 404) {
        res.status(errCode).json({
          message: error.message,
        });
        return;
      }
    }
    // When entry is not available, return unknown name metadata with 200 status code
    const { url, ...unknownMetadata } = new Metadata({
      name: 'unknown.name',
      description: 'Unknown ENS name',
      created_date: 1580346653000,
      tokenId: '',
      version: Version.v1,
    });
    res.status(200).json({
      message: unknownMetadata,
    });
  }
}
