import { Express } from 'express';

import { ensMetadata } from './controller/ensMetadata';
import { ensImage } from './controller/ensImage';
import { ensRasterize } from './controller/ensRasterize';
import { avatarMetadata } from './controller/avatarMetadata';
import { avatarImage } from './controller/avatarImage';
import { headerMetadata } from './controller/headerMetadata';
import { headerImage } from './controller/headerImage';
import { queryNFTep } from './controller/queryNFT';
import { preview } from './controller/preview';

export default function (app: Express) {
  // #swagger.ignore = true
  app.get('/', (_req, res) => {
    res.send('Well done mate To see more go to "/docs"!');
  });

  app.get(
    '/:networkName/:contractAddress(0x[a-fA-F0-9]{40})/:tokenId',
    ensMetadata
  );

  app.get(
    '/:networkName/:contractAddress(0x[a-fA-F0-9]{40})/:tokenId/image',
    ensImage
  );

  app.get(
    '/:networkName/:contractAddress(0x[a-fA-F0-9]{40})/:tokenId/rasterize',
    ensRasterize
  );

  app.get('/:networkName/avatar/:name/meta', avatarMetadata);

  app.get('/:networkName/avatar/:name', avatarImage);

  app.get('/:networkName/header/:name/meta', headerMetadata);

  app.get('/:networkName/header/:name', headerImage);

  app.get('/queryNFT', queryNFTep);

  app.get('/preview/:name', preview);
}
