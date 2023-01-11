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
import { RESPONSE_TIMEOUT } from '../config';
import { getAvatarImage } from '../service/avatar';
import getNetwork from '../service/network';

export async function avatarImage(req: Request, res: Response) {
  // #swagger.description = 'ENS avatar image'
  // #swagger.parameters['networkName'] = { schema: { $ref: '#/definitions/networkName' } }
  // #swagger.parameters['name'] = { description: 'ENS name', schema: { $ref: '#/definitions/ensName' } }
  res.setTimeout(RESPONSE_TIMEOUT, () => {
    res.status(504).json({ message: 'Timeout' });
  });

  const { name, networkName } = req.params;
  try {
    const { provider } = getNetwork(networkName);
    const [buffer, mimeType] = await getAvatarImage(provider, name);
    if (buffer) {
      /* #swagger.responses[200] = { 
           description: 'Image file'
      } */
      if (!res.headersSent) {
        res
          .writeHead(200, {
            'Content-Type': mimeType,
            'Content-Length': buffer.length,
          })
          .end(buffer);
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
  } catch (error: any) {
    const errCode = (error?.code && Number(error.code)) || 500;
    if (
      error instanceof FetchError ||
      error instanceof NFTURIParsingError ||
      error instanceof ResolverNotFound ||
      error instanceof RetrieveURIFailed ||
      error instanceof TextRecordNotFound ||
      error instanceof UnsupportedNamespace ||
      error instanceof UnsupportedNetwork
    ) {
      /* #swagger.responses[501] = { 
          description: 'Unsupported network' 
      } */
      if (!res.headersSent) {
        res.status(errCode).json({
          message: error.message,
        });
      }
      return;
    }
  }
}
