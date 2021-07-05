import path from "path";
import cors from 'cors';
import express from 'express';
import { getImage, getDomain } from './domain';
require('dotenv').config()

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
  const image = getImage(name)
  const body = `
    <html>
      <object data=${image} type="image/svg+xml">
        <img src=${image} />
      </object>
    </html>
  `
  res.send(body)
})

if(process.env.ENV === 'local'){
  app.use(cors())
  app.use(
    '/assets', 
    express.static(path.join(__dirname, '.', 'assets'))
  )  
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`APP_LOG::App listening on port ${PORT}`);
});
