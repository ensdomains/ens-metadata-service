import { Request, Response } from 'express';
import { Version } from '../base';
import { RESPONSE_TIMEOUT } from '../config';
import { Metadata } from '../service/metadata';

/* istanbul ignore next */
export async function preview(req: Request, res: Response) {
  // #swagger.description = 'ENS NFT preview'
  // #swagger.parameters['name'] = { type: 'string', description: 'ENS name.' }
  res.setTimeout(RESPONSE_TIMEOUT, () => {
    res.status(504).json({ message: 'Timeout' });
  });

  const { name } = req.params;

  try {
    if (!name || name.length < 7 || !name.endsWith('.eth')) {
      throw Error(`${name} is not an ENS name.`);
    }
    const metadata = new Metadata({
      name,
      created_date: 0,
      tokenId: '0',
      version: Version.v2,
    });
    metadata.generateImage();

    if (metadata.image) {
      const base64 = metadata.image.replace('data:image/svg+xml;base64,', '');
      const buffer = Buffer.from(base64, 'base64');
      if (!res.headersSent) {
        res
          .writeHead(200, {
            'Content-Type': 'image/svg+xml',
            'Content-Length': buffer.length,
          })
          .end(buffer);
        return;
      }
    } else {
      throw Error('Image URL is missing.');
    }
    /* #swagger.responses[200] = { 
        description: 'Image file'
    } */
  } catch (error) {
    /* #swagger.responses[404] = { 
           description: 'No results found' 
    } */
    if (!res.headersSent) {
      res.status(404).json({
        message: `Error generating image: ${error}`,
      });
    }
  }
}
