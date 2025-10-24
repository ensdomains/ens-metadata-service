import { Request, Response }       from 'express';
import { FetchError }              from 'node-fetch';
import {
  NFTURIParsingError,
  ResolverNotFound,
  RetrieveURIFailed,
  TextRecordNotFound,
  UnsupportedNamespace,
  UnsupportedNetwork,
}                                  from '../base';
import { RESPONSE_TIMEOUT }        from '../config';
import { getHeaderImage }          from '../service/avatar';
import getNetwork, { NetworkName } from '../service/network';
import createDocumentfromTemplate  from '../template-document';

export async function headerImage(req: Request, res: Response) {
  // #swagger.description = 'ENS header image'
  // #swagger.parameters['networkName'] = { schema: { $ref: '#/definitions/networkName' } }
  // #swagger.parameters['name'] = { description: 'ENS name', schema: { $ref: '#/definitions/ensName' } }
  res.setTimeout(RESPONSE_TIMEOUT, () => {
    res.status(504).json({ message: 'Timeout' });
  });

  const { name, networkName } = req.params;
  try {
    const { provider } = getNetwork(networkName as NetworkName);
    const [buffer, mimeType] = await getHeaderImage(provider, name);
    if (buffer) {
      /* #swagger.responses[200] = {
           description: 'Image file'
      } */
      if (!res.headersSent) {
        if (req.header('sec-fetch-dest') === 'document') {
          const documentTemplate = createDocumentfromTemplate(
            { buffer, metadata: { name, network: networkName },  mimeType, mediaType: "header" }
          );
          res
            .writeHead(200, {
              'Content-Type': 'text/html',
            })
            .end(documentTemplate);
          return;
        }
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
    if (!res.headersSent) {
      res.status(404).json({
        message: 'No image found.',
      });
    }
  }
}
