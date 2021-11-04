import path                                         from 'path';
import cors                                         from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import docUI                                        from 'redoc-express';

import endpoints                                    from './endpoint';

const setCacheHeader = function (req: Request, res: Response, next: NextFunction) {
  const period = 60 * 60;

  if (req.method == 'GET') {
    res.set('Cache-control', `public, max-age=${period}`);
  } else {
    res.set('Cache-control', `no-store`);
  }

  next();
};

const app = express();
app.use(cors());

if (process.env.ENV === 'local') {
  app.use('/assets', express.static(path.join(__dirname, 'assets')));
}

// apply cache header for all get requests
app.use(setCacheHeader);
endpoints(app);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`APP_LOG::App listening on port ${PORT}`);
});

app.get(
  '/docs',
  docUI({
    title: 'ENS Metadata Service',
    specUrl: '/assets/doc_output.json',
  })
);

module.exports = app;
