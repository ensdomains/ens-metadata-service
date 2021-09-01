import path               from 'path';
import cors               from 'cors';
import express            from 'express';

import endpoints         from './endpoint';


const app = express();
endpoints(app);

if (process.env.ENV === 'local') {
  app.use(cors());
  app.use('/assets', express.static(path.join(__dirname, 'assets')));
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`APP_LOG::App listening on port ${PORT}`);
});

module.exports = app;
