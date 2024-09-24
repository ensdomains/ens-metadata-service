import { strict as assert }        from 'assert';
import { Contract }                from 'ethers';
import { Request, Response }       from 'express';
import {
  ContractMismatchError,
  ExpiredNameError,
  NamehashMismatchError,
  SubgraphRecordNotFound,
  UnsupportedNetwork,
  Version,
}                                  from '../base';
import {
  ADDRESS_ETH_REGISTRY,
  ETH_REGISTRY_ABI,
  NAMEWRAPPER_ABI,
  RESPONSE_TIMEOUT,
}                                  from '../config';
import { checkContract }           from '../service/contract';
import { getDomain }               from '../service/domain';
import { Metadata }                from '../service/metadata';
import getNetwork, { NetworkName } from '../service/network';
import { constructEthNameHash }    from '../utils/namehash';

export async function ensMetadata(req: Request, res: Response) {
  // #swagger.description = 'ENS NFT metadata'
  // #swagger.parameters['networkName'] = { schema: { $ref: '#/definitions/networkName' } }
  // #swagger.parameters['{}'] = { name: 'contractAddress', description: 'Contract address which stores the NFT indicated by the tokenId', schema: { $ref: '#/definitions/contractAddress' } }
  // #swagger.parameters['tokenId'] = { type: 'string', description: 'Labelhash(v1) /Namehash(v2) of your ENS name.\n\nMore: https://docs.ens.domains/contract-api-reference/name-processing#hashing-names', schema: { $ref: '#/definitions/tokenId' } }
  res.setTimeout(RESPONSE_TIMEOUT, () => {
    res.status(504).json({ message: 'Timeout' });
    return;
  });

  const { contractAddress, networkName, tokenId: identifier } = req.params;
  const last_request_date = Date.now();
  let tokenId, version;
  let provider, SUBGRAPH_URL;
  try {
    ({ provider, SUBGRAPH_URL } = getNetwork(networkName as NetworkName));
    ({ tokenId, version } = await checkContract(
      provider,
      contractAddress,
      identifier
    ));
    const result = await getDomain(
      provider,
      networkName as NetworkName,
      SUBGRAPH_URL,
      contractAddress,
      tokenId,
      version,
      false
    );

    // add timestamp of the request date
    result.last_request_date = last_request_date;
    /* #swagger.responses[200] = { 
      description: 'Metadata object',
      schema: { $ref: '#/definitions/ENSMetadata' }
    } */
    res.json(result);
    return;
  } catch (error: any) {
    const errCode = (error?.code && Number(error.code)) || 500;
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

    if (error instanceof SubgraphRecordNotFound) {
      try {
        // Here is the case; if subgraph did not index fresh ENS name but registry has the record,
        // instead of 'not found' send positive unknown metadata information
        const registry = new Contract(
          ADDRESS_ETH_REGISTRY,
          ETH_REGISTRY_ABI,
          provider
        );

        if (!tokenId || version?.valueOf() === undefined) {
          throw 'Missing parameters to construct namehash';
        }
        const _namehash = constructEthNameHash(tokenId, version as Version);
        const isRecordExist = await registry.recordExists(_namehash);
        assert(isRecordExist, 'ENS name does not exist');

        if (version == Version.v2) {
          const contract = new Contract(
            contractAddress,
            NAMEWRAPPER_ABI,
            provider
          );
          const isNameWrapped = await contract.isWrapped(_namehash);
          assert(isNameWrapped, 'Name is not wrapped');
        }

        // When entry is not available on subgraph yet,
        // return unknown name metadata with 200 status code
        const { url, ...unknownMetadata } = new Metadata({
          name: 'unknown.name',
          description: 'Unknown ENS name',
          created_date: 1580346653000,
          tokenId: '',
          version: Version.v1,
          // add timestamp of the request date
          last_request_date,
        });
        res.status(200).json({
          message: unknownMetadata,
        });
        return;
      } catch (error) {}
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
