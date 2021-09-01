import path               from 'path';
import cors               from 'cors';
import express            from 'express';
import { FetchError }     from 'node-fetch';
import {
  checkContract,
  ContractMismatchError,
}                        from './contract';
import { getDomain }     from './domain';
import {
  getAvatarImage,
  getAvatarMeta,
  ResolverNotFound,
  TextRecordNotFound,
  UnsupportedNamespace,
}                        from './avatar';


const app = express();

if (process.env.ENV === 'local') {
  app.use(cors());
  app.use('/assets', express.static(path.join(__dirname, 'assets')));
}

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


app.get('/avatar/:name/meta', async function (req, res) {
  const { name } = req.params;
  const meta = await getAvatarMeta(name);
  if (meta) {
    res.status(200).json(meta);
  }else{
    res.status(404).json({
      message: 'No results found.',
    });  
  }
});

app.get('/avatar/:name', async function (req, res) {
  const { name } = req.params;
  try {
    const [buffer, mimeType] = await getAvatarImage(name);
    if (buffer) {
      const image = Buffer.from(buffer as any, 'base64');
      res.writeHead(200, {
        'Content-Type': mimeType,
        'Content-Length': image.length,
      });
      res.end(image);
    }
    res.status(404).json({
      message: 'No results found.',
    });
  } catch (error) {
    const errCode = (error?.code && Number(error.code)) || 500;
    if (
      error instanceof FetchError         ||
      error instanceof ResolverNotFound   ||
      error instanceof TextRecordNotFound ||
      error instanceof UnsupportedNamespace
    ) {
      res.status(errCode).json({
        message: error.message,
      });
      return;
    }
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`APP_LOG::App listening on port ${PORT}`);
});

module.exports = app;
