import { Request, Response } from 'express';
import { queryNFT } from '../service/queryNFT';

/* istanbul ignore next */
export async function queryNFTep(req: Request, res: Response) {
  // #swagger.description = 'Query endpoint for NFT URIs'
  // #swagger.parameters['uri'] = { in: 'query', description: 'NFT URI as defined under CAIP-22 for erc721 assets and CAIP-29 for erc1155 assets.' }
  const { uri } = req.query;
  if (!uri) {
    throw Error(
      'Please be sure adding your NFT URI as a query. i.e. /queryNFT?uri=eip155:1/erc721:0x...'
    );
  }
  try {
    const metadata = await queryNFT(uri as string);
    /* #swagger.responses[200] = { 
          description: 'NFT metadata'
    } */
    res.status(200).json(metadata);
  } catch (error) {
    /* #swagger.responses[500] = { 
          description: 'Internal Server Error'
    } */
    res.status(500).json({
      message: error,
    });
  }
}
