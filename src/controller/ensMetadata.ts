import { strict as assert } from 'assert';
import { Contract } from 'ethers';
import { Request, Response } from 'express';
import { FetchError } from 'node-fetch';
import {
  ContractMismatchError,
  ExpiredNameError,
  UnsupportedNetwork,
  Version,
} from '../base';
import {
  ADDRESS_ETH_REGISTRY,
  ETH_REGISTRY_ABI,
  RESPONSE_TIMEOUT,
} from '../config';
import { checkContract } from '../service/contract';
import { getDomain } from '../service/domain';
import { Metadata } from '../service/metadata';
import getNetwork from '../service/network';
import { getLabelhash } from '../utils/labelhash';
import { constructEthNameHash } from '../utils/namehash';

export async function ensMetadata(req: Request, res: Response) {
  // #swagger.description = 'ENS NFT metadata'
  // #swagger.parameters['networkName'] = { schema: { $ref: '#/definitions/networkName' } }
  // #swagger.parameters['{}'] = { name: 'contractAddress', description: 'Contract address which stores the NFT indicated by the tokenId', schema: { $ref: '#/definitions/contractAddress' } }
  // #swagger.parameters['tokenId'] = { type: 'string', description: 'Labelhash(v1) /Namehash(v2) of your ENS name.\n\nMore: https://docs.ens.domains/contract-api-reference/name-processing#hashing-names', schema: { $ref: '#/definitions/tokenId' } }
  res.setTimeout(RESPONSE_TIMEOUT, () => {
    res.status(504).json({ message: 'Timeout' });
  });

  const { contractAddress, networkName, tokenId } = req.params;
  const _tokenId = getLabelhash(tokenId);

  const { provider, SUBGRAPH_URL } = getNetwork(networkName);
  let version;
  try {
    version = await checkContract(provider, contractAddress, _tokenId);
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
    let errCode = (error?.code && Number(error.code)) || 500;
    /* #swagger.responses[500] = { 
             description: 'Internal Server Error'
    } */
    if (
      error instanceof FetchError ||
      error instanceof ContractMismatchError ||
      error instanceof ExpiredNameError
    ) {
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
      return;
    }

    try {
      const registry = new Contract(
        ADDRESS_ETH_REGISTRY,
        ETH_REGISTRY_ABI,
        provider
      );

      const _namehash = constructEthNameHash(_tokenId, version as Version);
      const isRecordExist = await registry.recordExists(_namehash);
      assert(isRecordExist, 'ENS name does not exist');
    } catch (error) {
      /* #swagger.responses[404] = {
             description: 'No results found'
      } */
      if (!res.headersSent) {
        res.status(404).json({
          message: 'No results found.',
        });
      }
      return;
    }

    // When entry is not available on subgraph yet,
    // return unknown name metadata with 200 status code
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
