import path from 'path';
import cors from 'cors';
import express from 'express';
import { FetchError } from 'node-fetch';
import { getDomain } from './domain';
import {
  checkContract,
  ContractMismatchError,
  ContractNotFoundError,
} from './contract';

interface RequestParams {
  tokenId?: string;
}

const app = express();

app.get('/', (req, res) => {
  res.send('Well done mate!');
});

app.get(
  '/:contractAddress(0x[a-fA-F0-9]{40})/:tokenId',
  async function (req, res) {
    const { contractAddress, tokenId } = req.params;
    try {
      const version = await checkContract(contractAddress);
      const result = await getDomain(tokenId, version);
      res.json(result);
    } catch (error) {
      if (
        error instanceof FetchError ||
        error instanceof ContractMismatchError ||
        error instanceof ContractNotFoundError
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

app.get(
  '/:contractAddress(0x[a-fA-F0-9]{40})/:tokenId/image',
  async function (req, res) {
    const { contractAddress, tokenId } = req.params;
    try {
      const version = await checkContract(contractAddress);
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
        error instanceof ContractMismatchError ||
        error instanceof ContractNotFoundError
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
  app.use('/assets', express.static(path.join(__dirname, '.', 'assets')));
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`APP_LOG::App listening on port ${PORT}`);
});

module.exports = app;
