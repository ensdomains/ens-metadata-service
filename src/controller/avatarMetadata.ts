import { Request, Response } from 'express';
import { FetchError } from 'node-fetch';
import {
  NFTURIParsingError,
  ResolverNotFound,
  RetrieveURIFailed,
  TextRecordNotFound,
  UnsupportedNamespace,
  UnsupportedNetwork,
} from '../base';
import { getAvatarMeta } from '../service/avatar';
import getNetwork from '../service/network';

export async function avatarMetadata(req: Request, res: Response) {
  // #swagger.description = 'ENS avatar metadata'
  // #swagger.parameters['networkName'] = { schema: { $ref: '#/definitions/networkName' } }
  // #swagger.parameters['name'] = { description: 'ENS name', schema: { $ref: '#/definitions/ensName' } }
  const { name, networkName } = req.params;
  try {
    const { provider } = getNetwork(networkName);
    const meta = await getAvatarMeta(provider, name, networkName);
    if (meta) {
      /* #swagger.responses[200] = { 
             description: 'Metadata object',
             schema: { $ref: '#/definitions/AvatarMetadata' }
      } */
      res.status(200).json(meta);
    } else {
      /* #swagger.responses[404] = { 
             description: 'No results found' 
      } */
      res.status(404).json({
        message: 'No results found.',
      });
    }
  } catch (error: any) {
    const errCode = (error?.code && Number(error.code)) || 500;
    if (
      error instanceof FetchError ||
      error instanceof NFTURIParsingError ||
      error instanceof ResolverNotFound ||
      error instanceof RetrieveURIFailed ||
      error instanceof TextRecordNotFound ||
      error instanceof UnsupportedNamespace
    ) {
      res.status(errCode).json({
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
    }
  }
}
