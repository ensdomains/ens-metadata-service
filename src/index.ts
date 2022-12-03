import path                                         from 'path';
import cors                                         from 'cors';
import compression                                  from 'compression';
import express, { Request, Response, NextFunction } from 'express';
import docUI                                        from 'redoc-express';

import endpoints                                    from './endpoint';

const setCacheHeader = function (
  req: Request,
  res: Response,
  next: NextFunction
) {
  const period = 60 * 60;

  if (req.method == 'GET') {
    res.set(
      'Cache-control', 
      `public, max-age=${period}, s-maxage=${period}`
    );
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

app.use(compression({ filter: shouldCompress }));

function shouldCompress(req: Request, res: Response) {
  if (req.headers['x-no-compression']) {
    // don't compress responses with this request header
    return false;
  }

  // fallback to standard filter function
  return compression.filter(req, res);
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`APP_LOG::App listening on port ${PORT}`);
});

app.get('/favicon.ico', (req, res) => res.status(204).end());

app.get(
  '/docs',
  docUI({
    title: 'ENS Metadata Service',
    specUrl: '/assets/doc_output.json',
  })
);

module.exports = app;
