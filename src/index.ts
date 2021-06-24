import express from 'express';
import { getDomain } from './domain';

const app = express();

app.get('/', (req, res) => {
  res.send('Well done mate!');
})

app.get('/name/:tokenId', async function (req, res) {
  const { tokenId } = req.params
  res.json(await getDomain(tokenId))
})

app.get('/name/:tokenId/image', async function (req, res) {
  const { tokenId } = req.params
  const response = await getDomain(tokenId)
  const body = `
    <html>
      <img src=${response.image}>
    </html>
  `
  res.send(body)
})

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`APP_LOG::App listening on port ${PORT}`);
});
