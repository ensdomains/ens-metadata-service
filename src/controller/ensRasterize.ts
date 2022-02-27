import { Request, Response } from 'express';
import { rasterize } from '../service/rasterize';

/* istanbul ignore next */
export async function ensRasterize(req: Request, res: Response) {
  // #swagger.description = 'ENS NFT image rasterization endpoint'
  // #swagger.parameters['networkName'] = { description: 'Name of the chain to query for. (mainnet|rinkeby|ropsten|goerli...)' }
  // #swagger.parameters['contractAddress'] = { description: 'Contract address which stores the NFT indicated by the tokenId' }
  // #swagger.parameters['tokenId'] = { description: 'Namehash(v1) /Labelhash(v2) of your ENS name.\n\nMore: https://docs.ens.domains/contract-api-reference/name-processing#hashing-names' }
  const { contractAddress, networkName, tokenId } = req.params;
  try {
    const raster = await rasterize(contractAddress, networkName, tokenId);
    const base64 = raster.replace('data:image/png;base64,', '');
    const buffer = Buffer.from(base64, 'base64');
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  } catch (error) {
    res.status(500).json({
      message: error,
    });
  }
}
