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
import { getAvatarImage } from '../service/avatar';
import getNetwork from '../service/network';

export async function avatarImage(req: Request, res: Response) {
  // #swagger.description = 'ENS avatar image'
  // #swagger.parameters['networkName'] = { schema: { $ref: '#/definitions/networkName' } }
  // #swagger.parameters['name'] = { description: 'ENS name', schema: { $ref: '#/definitions/ensName' } }
  const { name, networkName } = req.params;
  try {
    const { provider } = getNetwork(networkName);
    const [buffer, mimeType] = await getAvatarImage(provider, name);
    if (buffer) {
      /* #swagger.responses[200] = { 
           description: 'Image file'
      } */
      res.writeHead(200, {
        'Content-Type': mimeType,
        'Content-Length': buffer.length,
      });
      res.end(buffer);
    }
    /* #swagger.responses[404] = { 
           description: 'No results found' 
    } */
    res.status(404).json({
      message: 'No results found.',
    });
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
