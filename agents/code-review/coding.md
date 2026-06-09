# Coding rules

Rules for general TypeScript and Express patterns in this codebase. For security-specific rules, see `security.md`.

This codebase uses Express 4.x. Several of the rules below exist because Express 4's request lifecycle and async-handler semantics have specific behaviours that have led to shipped defects.

## Rule 1: Async route handlers must not throw outside a try/catch that sends a response

**Pattern to flag.** An `async function` exported as a route handler that contains a `throw` statement which is not inside a `try` block. Equivalently: any throw whose rejection is not converted into a `res.status(...)` response on the same code path.

**Counterexample (bad):**

```typescript
export async function handler(req: Request, res: Response) {
  const { foo } = req.query;
  if (!foo) {
    throw new Error('foo is required');
  }
  try {
    const result = await doWork(foo);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error });
  }
}
```

**Acceptable shapes:**

```typescript
// Shape A: return an explicit response instead of throwing.
export async function handler(req: Request, res: Response) {
  const { foo } = req.query;
  if (!foo) {
    return res.status(400).json({ message: 'foo is required' });
  }
  try {
    const result = await doWork(foo);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error });
  }
}
```

```typescript
// Shape B: move the validation into the try block.
export async function handler(req: Request, res: Response) {
  try {
    const { foo } = req.query;
    if (!foo) throw new Error('foo is required');
    const result = await doWork(foo);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : String(error) });
  }
}
```

```typescript
// Shape C: wrap the handler with an async-error utility.
import asyncHandler from 'express-async-handler';

export const handler = asyncHandler(async (req: Request, res: Response) => {
  const { foo } = req.query;
  if (!foo) throw new Error('foo is required');
  const result = await doWork(foo);
  res.status(200).json(result);
});
```

**Why this matters.** Express 4 does not await the Promise returned by an async route handler. A throw inside the async function becomes a rejected Promise that Express never sees. The HTTP response is never sent (the client hangs until a timeout) and the rejection becomes an unhandled rejection at the Node runtime. In Node 16 and later, default behaviour for an unhandled rejection terminates the process. This means a single malformed request can take down the service instance until it restarts.

**How to grep.** In `src/controller/`, find any `export async function` declaration. Inside each declaration, find any `throw` token. If the throw is not strictly inside the first `try {` block of that function, flag it.

## Rule 2: Middleware that reads `req.params` must be mounted at route level, not app level

**Pattern to flag.** A call to `app.use(middleware)` (with no path argument) that registers a middleware whose body reads `req.params.X` for any `X`. The mount happens before the route registrations that would populate `req.params`.

**Counterexample (bad):**

```typescript
// utils/myValidator.ts
export function myValidator(req: Request, res: Response, next: NextFunction) {
  const { tokenId } = req.params;
  if (tokenId && tokenId.includes('<')) {
    return res.status(400).json({ error: 'invalid tokenId' });
  }
  next();
}

// index.ts
app.use(myValidator);
app.get('/:network/:contract/:tokenId/render', renderHandler);
```

In the above, `req.params` is the empty object `{}` when `myValidator` runs. The `if (tokenId && ...)` check is always false. The validator is a no-op.

**Acceptable shapes:**

```typescript
// Shape A: per-route mount, applies validator before handler on each matching route.
app.get('/:network/:contract/:tokenId/render', myValidator, renderHandler);
```

```typescript
// Shape B: path-scoped mount. The path pattern provides the params before the validator runs.
app.use('/:network/:contract/:tokenId', myValidator);
app.get('/:network/:contract/:tokenId/render', renderHandler);
```

**Why this matters.** Express populates `req.params` only after it has matched a request against a route definition. `app.use(middleware)` with no path runs in the order it was registered, before route matching. Any middleware mounted that way sees `req.params === {}` for every request. Validation that depends on path parameters cannot work in this position. This has shipped to production.

`req.query`, `req.headers`, `req.body` (after body-parser middleware), `req.path`, and `req.url` are all available at app-level middleware. Only `req.params` requires route-level mounting.

**How to grep.** Find every `app.use(X)` call in `src/index.ts` (or other top-level app composition files) where the call has no path string as the first argument. For each such middleware `X`, read its source. If the body references `req.params.Y` for any `Y`, flag the mount.

## Rule 3: Behaviour of route handlers and middleware must be covered by integration tests, not only by unit tests that mock `req`

**Pattern to flag.** A `*.test.ts` file that imports a route handler or middleware function and invokes it directly with a manually constructed `req` object (typically with `as any` to bypass typing). No accompanying integration test that sends an actual HTTP request through a running Express app.

**Counterexample (bad):**

```typescript
import { myValidator } from '../utils/myValidator';

test('validator rejects bad tokenId', () => {
  const req = { params: { tokenId: '<script>' } } as any;
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
  const next = jest.fn();
  myValidator(req, res, next);
  expect(res.status).toHaveBeenCalledWith(400);
});
```

This test passes whether or not `myValidator` would ever see a populated `req.params` in production. It tests the validator's logic in isolation but does not test that the validator runs in a context where `req.params` actually contains the value being validated.

**Acceptable shape:**

```typescript
import request from 'supertest';
import { app } from '../app';

test('malformed tokenId is rejected before reaching the controller', async () => {
  const res = await request(app).get('/mainnet/0x0000000000000000000000000000000000000000/<script>/render');
  expect(res.status).toBe(400);
});
```

A unit test for the validator's logic is fine as a supplement, but the integration test is the one that verifies the production code path.

**Why this matters.** Unit tests that mock `req`, `res`, and `next` exercise the function's internal logic. They do not exercise the Express lifecycle (when `req.params` is populated, when middleware runs relative to route matching, when async errors propagate). Functions that pass unit tests can be wired into Express in positions where they never receive the inputs they were tested against. The only way to catch this class of defect is to send a real HTTP request through the running app and assert on the observed response.

**How to grep.** In `*.test.ts` files, find constructions of the form `{ params: ... } as any` or `{ params: ... } as Request` passed to a function imported from `src/controller/` or `src/utils/`. For each such test, check whether the same module has an integration test under the same code path. If not, flag.

## Rule 4: Configuration keys must be referenced where they are claimed to take effect

**Pattern to flag.** A default-config object that declares a key, where no code outside the declaration reads that key.

**Counterexample (bad):**

```typescript
const DEFAULT_CONFIG = {
  allowedNetworks: ['mainnet', 'sepolia'],
  skipRoutes: ['/', '/docs', '/favicon.ico'],
  strictRoutes: ['/render'],
  enableLogging: true,
};

export function createValidator(config: Partial<typeof DEFAULT_CONFIG> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  return (req: Request, res: Response, next: NextFunction) => {
    if (finalConfig.skipRoutes?.some(route => req.path === route)) {
      return next();
    }
    if (finalConfig.enableLogging) {
      console.log('request to', req.path);
    }
    // ... validation logic uses finalConfig.allowedNetworks
    // strictRoutes is never read
    next();
  };
}
```

`strictRoutes` is declared as if it controls behaviour, but the validator body never reads it. A reader will assume there is logic somewhere that applies stricter rules to the listed routes. There isn't.

**Acceptable shapes:**

- Either implement the behaviour the config claims to control:

```typescript
const isStrictRoute = finalConfig.strictRoutes?.some(route => req.path === route);
if (isStrictRoute) {
  // apply tighter checks here
}
```

- Or remove the key from the default config:

```typescript
const DEFAULT_CONFIG = {
  allowedNetworks: ['mainnet', 'sepolia'],
  skipRoutes: ['/', '/docs', '/favicon.ico'],
  enableLogging: true,
};
```

**Why this matters.** A declared-but-unread config option masquerades as an active feature. It misleads anyone reading the code into believing the feature is present and configured. It also undermines trust in the rest of the config object: if one key is dead, others may be too. This is dead code that should not ship.

**How to grep.** For each key in a default-config object in this codebase, search the codebase for references to that key. If the only reference is in the declaration itself, flag.

## Rule 5: Express path-parameter regex is the validation schema; missing constraints flow to downstream sinks

**Pattern to flag.** An Express route definition where a path parameter (`:foo`) flows to an HTML template, an external RPC call, a database query, or a fetched URL, AND the route definition does not constrain that parameter with a regex.

**Counterexample (bad):**

```typescript
app.get(
  '/:networkName/:contractAddress(0x[a-fA-F0-9]{40})/:tokenId/render',
  renderHandler,
);

async function renderHandler(req: Request, res: Response) {
  const { networkName, contractAddress, tokenId } = req.params;
  const html = `<img src="https://upstream.example/${networkName}/${contractAddress}/${tokenId}/image"/>`;
  // html is sent to a headless browser
}
```

`contractAddress` has a regex constraint that admits only 40-hex-char strings. `networkName` and `tokenId` have no constraint. Both flow into a template literal. An attacker can send a URL-encoded payload in either segment that survives Express's URL decoding and decodes inside the template into arbitrary HTML.

**Acceptable shape:**

```typescript
app.get(
  '/:networkName(mainnet|sepolia|holesky):contractAddress(0x[a-fA-F0-9]{40})/:tokenId(\\d+|0x[a-fA-F0-9]{1,64})/render',
  renderHandler,
);
```

Or apply a route-level middleware (per `security.md` rule 2) that validates each path parameter strictly against the allowed character set for that parameter's semantic type. The regex on the route is the only schema Express enforces; relying on downstream sanitisation when a route-level schema is feasible is a maintenance burden and an easy place to introduce bugs.

**Why this matters.** The Express route definition is the most visible declaration of "what shape can this parameter take". When a parameter is unconstrained at the route, a future reviewer assumes there is downstream validation. When the downstream validation is missing or broken (see `security.md` rule 2 for the canonical middleware-mount issue), the only thing left between raw user input and the sink is the absence of a regex on the route.

**How to grep.** For each `app.get(path, ...)`, `app.post(path, ...)`, and equivalent route registration in this codebase, parse the path string and identify every `:param` segment. For each `:param` without a regex constraint, trace the parameter's use inside the handler. If the parameter flows to a template literal containing HTML, to a fetched URL, to a downstream RPC call, or to a database query, flag the route definition.

## Rule 6: Error handlers that destructure `err.response` must guard the undefined case

**Pattern to flag.** A `.catch(({ response }) => ...)` (destructuring) or `.catch(err => err.response.X)` (property access) inside a request-flow code path, where `response` may be undefined.

**Counterexample (bad):**

```typescript
import axios from 'axios';

async function fetchUpstream(url: string) {
  return axios.get(url).catch(({ response }) => {
    const { status, statusText } = response;
    return { error: status, statusText };
  });
}
```

When the upstream returns an HTTP response, `axios` rejects with an `AxiosError` that has a `response` property. When the upstream connection fails (DNS error, TCP reset, timeout, certificate error), `axios` rejects with an error whose `response` is `undefined`. The destructuring `const { status, statusText } = response;` throws `TypeError: Cannot read properties of undefined (reading 'status')`. If this `.catch` is itself inside an async route handler, the thrown error propagates as an unhandled rejection (see `coding.md` rule 1) and the process may terminate.

**Acceptable shape:**

```typescript
import axios, { AxiosError } from 'axios';

async function fetchUpstream(url: string) {
  return axios.get(url).catch((err: unknown) => {
    if (err instanceof AxiosError && err.response) {
      return { error: err.response.status, statusText: err.response.statusText };
    }
    if (err instanceof Error) {
      return { error: 'NETWORK_ERROR', message: err.message };
    }
    return { error: 'UNKNOWN' };
  });
}
```

The same pattern applies to other HTTP clients (`got`, `node-fetch`, `undici`). Any time an error handler reaches into the error to extract upstream-response details, it must handle the case where there is no upstream response (network-level failure, timeout, abort).

**Why this matters.** Past defects in this codebase have shipped a `.catch(({ response }) => ...)` pattern inside an async route handler. When the upstream timed out or refused the connection, `response` was undefined, the destructuring threw, and the throw became an unhandled rejection that took the request handler down (and, depending on Node configuration, the process). The crash was triggered by an attacker pointing the upstream URL at a black-holed or unresponsive host.

**How to grep.** Find every `.catch(` call in the codebase. For each, inspect the argument. If the argument is an arrow function or function literal that destructures `response` from its parameter, or that accesses `err.response.X` without a prior `if (err.response)` guard, flag.
