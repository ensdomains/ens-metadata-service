import path from 'path';
import cors from 'cors';
import express from 'express';
import { FetchError } from 'node-fetch';
import { getImage, getDomain } from './domain';

interface RequestParams {
  tokenId?: string;
}

const app = express();

app.get('/', (_req, res) => {
  res.send('Well done mate!');
});

app.get('/name/:tokenId', async function (req, res) {
  const { tokenId } = req.params;
  try {
    const result = await getDomain(tokenId);
    res.json(result);
  } catch (error) {
    let errCode = (error?.code && Number(error.code)) || 500;
    if (error instanceof FetchError) {
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
});

app.get('/name/:name/image', async function (req, res) {
  const { name } = req.params;
  const image = getImage(name);
  const body = `
    <html>
      <object data=${image} type="image/svg+xml">
        <img src=${image} />
      </object>
    </html>
  `;
  res.send(body);
});

if (process.env.ENV === 'local') {
  app.use(cors());
  app.use('/assets', express.static(path.join(__dirname, 'assets')));
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`APP_LOG::App listening on port ${PORT}`);
});

module.exports = app;
