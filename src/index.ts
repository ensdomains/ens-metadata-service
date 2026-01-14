import path                                         from 'path';
import cors                                         from 'cors';
import compression                                  from 'compression';
import express, { Request, Response, NextFunction } from 'express';
import helmet                                       from 'helmet';
import docUI                                        from 'redoc-express';

import endpoints                                    from './endpoint';
import { blockRecursiveCalls }                      from './utils/blockRecursiveCalls';
import { rateLimitMiddleware }                      from './utils/rateLimiter';
import { malformedURIMiddleware }                   from './utils/malformedURI';
import { universalValidation }                      from './utils/validateParameters';

const setCacheHeader = function (
  req: Request,
  res: Response,
  next: NextFunction
) {
  const period = 60 * 60; // Cache period: 1 hour

  if (req.method === 'GET') {
    res.set(
      'Cache-control', 
      `public, max-age=${period}, s-maxage=${period}`
    );
  }
  res.append('Vary', 'Sec-Fetch-Dest'); // Add header to handle fetch variations

  next();
};

const app = express();

// Enable Cross-Origin Resource Sharing (CORS) for flexible API consumption
app.use(cors());

// Add security headers to protect against common vulnerabilities
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'none'"], // Block all by default
      scriptSrc: [
        'https://unpkg.com/redoc@latest/bundles/redoc.standalone.js'
      ], // Allow specific script source
      imgSrc: ['*', 'data:'], // Allow images from any source
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'], // Allow styles
      fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'], // Allow given type of fonts
      connectSrc: ['*', 'data:'], // Allow connections
      objectSrc: ["'none'"], // Disallow object embeds
      frameAncestors: ["'none'"], // Block framing by other origins
      frameSrc: ["'none'"], // Block frame sources
      childSrc: ["'none'"], // Disallow child frames
      workerSrc: ['blob:'], // Allow worker scripts from blobs
      baseUri: ["'none'"], // Restrict <base> tag usage
      formAction: ["'none'"], // Block all forms
      upgradeInsecureRequests: [], // Allow upgrade connection to HTTPS
    },
  })
);

// Compress responses to improve performance, unless explicitly disabled
app.use(compression({ filter: shouldCompress }));

if (process.env.ENV === 'local') {
  app.use('/assets', express.static(path.join(__dirname, 'assets')));
}

// Apply rate limiting to protect from excessive API requests
app.use(rateLimitMiddleware);

// Prevent recursive API calls that could lead to infinite loops
app.use(blockRecursiveCalls);

// Apply universal validation to all routes
app.use(universalValidation);

// Apply cache headers to all GET requests
app.use(setCacheHeader);
endpoints(app);

// Handle malformed URIs gracefully
app.use(malformedURIMiddleware);

// Function to determine whether to compress a response
function shouldCompress(req: Request, res: Response) {
  if (req.headers['x-no-compression']) {
    // Skip compression if header `x-no-compression` is present
    return false;
  }

  // Default to standard compression filter
  return compression.filter(req, res);
}

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`APP_LOG::App listening on port ${PORT}`);
});

// Handle requests for browsers default favicon.ico with a quick 204 response
app.get('/favicon.ico', (_, res) => res.status(204).end());

// Serve API documentation using ReDoc
app.get(
  '/docs',
  docUI({
    title: 'ENS Metadata Service',
    specUrl: '/assets/doc_output.json', // Location of the OpenAPI spec file
  })
);

// Export the app instance for testing or external use
module.exports = app;
