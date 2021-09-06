import path               from 'path';
import cors               from 'cors';
import express            from 'express';
import docUI              from 'redoc-express';

import endpoints         from './endpoint';


const app = express();

if (process.env.ENV === 'local') {
  app.use(cors());
  app.use('/assets', express.static(path.join(__dirname, 'assets')));
}

endpoints(app);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`APP_LOG::App listening on port ${PORT}`);
});


app.get(
  '/docs',
  docUI({
    title: 'ENS Metadata Service',
    specUrl: '/assets/doc_output.json'
  })
);

module.exports = app;
