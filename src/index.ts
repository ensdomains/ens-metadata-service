import express from 'express';
import { getImage, getDomain } from './domain';

const app = express();

app.get('/', (req, res) => {
  res.send('Well done mate!');
})

app.get('/name/:tokenId', async function (req, res) {
  const { tokenId } = req.params
  res.json(await getDomain(tokenId))
})

app.get('/name/:name/image', async function (req, res) {
  const { name } = req.params
  const body = `
    <html>
      <img src=${getImage(name)}>
    </html>
  `
  res.send(body)
})

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`APP_LOG::App listening on port ${PORT}`);
});
