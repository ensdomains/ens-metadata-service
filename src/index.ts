import path from 'path';
import cors from 'cors';
import express from 'express';
import { FetchError } from 'node-fetch';
import docUI from 'redoc-express';

import {
  checkContract,
  ContractMismatchError,
} from './contract';
import { getDomain } from './domain';
import endpoints from './endpoint';

interface RequestParams {
  tokenId?: string;
}

const app = express();
endpoints(app);


app.get('/', (_req, res) => {
  res.send('Well done mate!');
});

app.get(
  '/:contractAddress(0x[a-fA-F0-9]{40})/:tokenId',
  async function (req, res) {
    const { contractAddress, tokenId } = req.params;
    try {
      const version = await checkContract(contractAddress, tokenId);
      const result = await getDomain(tokenId, version);
      res.json(result);
    } catch (error) {
      console.log('error', error)
      let errCode = (error?.code && Number(error.code)) || 500;
      if (
        error instanceof FetchError ||
        error instanceof ContractMismatchError
      ) {
        if (errCode !== 404) {
          res.status(errCode).json({
            message: error.message,
          });
          return;
        }
      }
      res.status(404).json({
        message: 'No results found.',
      });
    }
  }
);

app.get(
  '/:contractAddress(0x[a-fA-F0-9]{40})/:tokenId/image',
  /* istanbul ignore next */
  async function (req, res) {
    const { contractAddress, tokenId } = req.params;
    try {
      const version = await checkContract(contractAddress, tokenId);
      const result = await getDomain(tokenId, version);
      const body = `
      <html>
        <object data=${result.image_url} type="image/svg+xml">
          <img src=${result.image_url} />
        </object>
      </html>
    `;
      res.send(body);
    } catch (error) {
      if (
        error instanceof FetchError ||
        error instanceof ContractMismatchError
      ) {
        res.status(404).json({
          message: error.message,
        });
        return;
      }
      res.status(404).json({
        message: 'No results found.',
      });
    }
  }
);

if (process.env.ENV === 'local') {
  app.use(cors());
  app.use('/assets', express.static(path.join(__dirname, 'assets')));
}

app.get(
  '/docs',
  docUI({
    title: 'ENS',
    specUrl: '/assets/doc_output.json'
  })
);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`APP_LOG::App listening on port ${PORT}`);
});

module.exports = app;
