# Security rules

Rules for security-relevant patterns in this codebase. For general coding rules including Express lifecycle behaviour, see `coding.md`.

This service's primary security properties are: untrusted inputs come from request URLs, query parameters, and external content fetched from user-supplied URLs (NFT metadata, avatar text records); outputs include HTML rendered server-side, images served back to consuming apps, and metadata JSON. The rules below exist because past defects have followed predictable patterns at these boundaries.

## Rule 1: No raw user input interpolated into HTML

**Pattern to flag.** A template literal or string concatenation that constructs an HTML string and contains a `${...}` (or `+ variable +`) expression whose value originates from request inputs or external content. The expression is not passed through an encoder appropriate for its context.

**Counterexample (bad):**

```typescript
const html = `
  <!DOCTYPE html>
  <html>
    <body>
      <img src="${serviceUrl}/${networkName}/${contractAddress}/${tokenId}/image"/>
    </body>
  </html>
`;
```

If any of `networkName`, `contractAddress`, or `tokenId` is attacker-controlled (e.g., comes from a request path parameter that has not been strictly validated), an attacker can break out of the `src` attribute by including a quote and angle-bracket sequence, append arbitrary HTML or CSS, and have it rendered.

**Acceptable shape:**

```typescript
import { encode } from 'html-entities';

const html = `
  <!DOCTYPE html>
  <html>
    <body>
      <img src="${encode(buildUrl(serviceUrl, networkName, contractAddress, tokenId))}"/>
    </body>
  </html>
`;
```

Or use a templating library with auto-escape enabled. Or construct the URL via a known-safe URL builder that rejects any value containing characters outside the URL grammar.

**Why this matters.** Server-side HTML injection is exploitable even when the rendered HTML is converted to an image (headless-browser screenshot pipelines). The image faithfully reproduces whatever the attacker-controlled HTML rendered. Consumers of those images may display them in trusted contexts. The fact that the output is an image does not eliminate the underlying injection: it bounds the visible impact.

**How to grep.** In `src/controller/` and `src/service/`, find template literals containing `<` or `>` characters that also contain `${...}` expressions. For each, identify whether the expression value can originate from request inputs. If yes, and no encoder is applied at the call site, flag.

## Rule 2: Input validation must run on the layer where the inputs exist

**Pattern to flag.** Validation logic that reads from `req.params`, `req.query`, `req.body`, or `req.headers` but is mounted in a position where that source has not yet been populated by Express.

**Counterexample (bad):** see `coding.md` rule 2 for the canonical example with `req.params`.

**Why this matters.** Validation that runs before the input source is populated is a no-op. It will pass tests if the tests mock the input directly. It will fail to catch attacker input in production.

**Lifecycle reference:**

- `req.headers`, `req.path`, `req.url`, `req.method`: available in any middleware including app-level (`app.use(fn)` with no path).
- `req.query`: available in any middleware.
- `req.body`: available after a body-parsing middleware has run (e.g., `app.use(express.json())`). Validation that reads `req.body` must be mounted after the body parser.
- `req.params`: available only after Express has matched the request against a route. Validation that reads `req.params` must be mounted at route level or under a path-scoped `app.use('/path/...', fn)`.

**How to grep.** For each middleware function in `src/utils/` or `src/middleware/`, identify which of the above sources it reads. Then locate every mount of that middleware in the codebase. Flag any mount that is incompatible with the middleware's read sources.

## Rule 3: Risky third-party features must default to safest setting AND be verified

**Pattern to flag.** A configuration call to a third-party tool (headless browser, image processor, parser, network client) that disables or restricts a security-relevant feature, where there is no test or runtime check that confirms the configuration took effect.

**Counterexample (bad):**

```typescript
const browser = await puppeteer.launch({
  args: [
    '--disable-javascript',
    '--disable-plugins',
    '--no-sandbox',
  ],
});
```

The `--disable-javascript` flag has been deprecated in Chromium and may be a no-op in current versions. The code reads as if JavaScript is disabled. Production may differ.

**Acceptable shape:**

```typescript
const browser = await puppeteer.launch({
  args: [
    '--disable-plugins',
    '--no-sandbox',
  ],
});

const page = await browser.newPage();
await page.setJavaScriptEnabled(false);

// Verify the off-switch took effect.
const scriptingEnabled = await page.evaluate(() => {
  // Returns true if scripting is enabled (HTML spec: noscript content is not rendered).
  // Returns false if scripting is disabled.
  return typeof window !== 'undefined';
});
if (scriptingEnabled) {
  throw new Error('JavaScript was expected to be disabled but is enabled');
}
```

Or include a smoke test that asserts injected `<script>` content does not execute in a rendered page, and that `<noscript>` content does render.

**Why this matters.** Configuration flags can be silently deprecated, renamed, or rendered no-ops in newer versions of the underlying tool. Code that depends on a flag without verifying its effect is depending on a property that may not hold in production. Past audits of this codebase have found cases where a flag was assumed to enforce a property and did not.

**How to grep.** For each call to a third-party launch / construct / config method with security-relevant arguments (flags whose name includes "disable", "no-", "block", "deny", "strict"), check whether there is an accompanying test that asserts the property the flag is meant to enforce. If not, flag.

## Rule 4: Every rendered HTML page must carry a Content-Security-Policy meta tag

**Pattern to flag.** Construction of an HTML string (for direct response, for headless-browser input, or for storage and later serving) that does not include a `<meta http-equiv="Content-Security-Policy" content="...">` tag with at least a `default-src` directive.

**Counterexample (bad):**

```typescript
const html = `
  <!DOCTYPE html>
  <html>
    <body>
      ${userContent}
    </body>
  </html>
`;
```

No CSP. If any other control (input validation, output encoding) fails, the browser will execute attacker-controlled scripts, fetch attacker-controlled resources, and so on.

**Acceptable shape:**

```typescript
const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${allowedImgOrigin}; style-src 'unsafe-inline';">
    </head>
    <body>
      ${userContent}
    </body>
  </html>
`;
```

The CSP should be the most restrictive that still allows the legitimate functionality of the page. `default-src 'none'` is the right starting point; relax only what the page requires.

**Why this matters.** CSP is the last layer of defence when input validation, output encoding, or sandbox flags fail. Past audits of this codebase have shown cases where CSP was the only working control standing between an attacker-controlled input and an exploitable sink. Adding CSP to a new template is cheap; the cost of relying on a single upstream control is paid in incidents.

**How to grep.** In any module that emits HTML (via template literal, file template, or string builder), check whether the emitted HTML includes a `Content-Security-Policy` directive. If not, flag.

## Rule 5: User-supplied SVG and HTML content must be sanitised or rasterised

**Pattern to flag.** An endpoint that serves SVG or HTML content fetched from a user-controlled URL (avatar text records, NFT metadata, external links) without sanitisation or rasterisation.

**Counterexample (bad):**

```typescript
export async function avatarHandler(req: Request, res: Response) {
  const url = await resolveAvatarUrl(req.params.name);
  const response = await fetch(url);
  const body = await response.text();
  res.setHeader('Content-Type', response.headers.get('content-type') ?? 'application/octet-stream');
  res.send(body);
}
```

If the resolved URL serves SVG containing scripts, and a consumer of this endpoint embeds the response via `<object>`, `<embed>`, or `fetch + innerHTML`, the scripts execute in the consumer's context.

**Acceptable shapes:**

- Sanitise server-side with a library configured for SVG (DOMPurify with `USE_PROFILES: { svg: true, svgFilters: true }`, or a dedicated SVG sanitiser):

```typescript
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const DOMPurify = createDOMPurify(new JSDOM('').window);

export async function avatarHandler(req: Request, res: Response) {
  const url = await resolveAvatarUrl(req.params.name);
  const response = await fetch(url);
  const body = await response.text();
  const clean = DOMPurify.sanitize(body, { USE_PROFILES: { svg: true, svgFilters: true } });
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(clean);
}
```

- Or rasterise to a bitmap format (PNG, JPEG) that cannot carry scripts:

```typescript
export async function avatarHandler(req: Request, res: Response) {
  const url = await resolveAvatarUrl(req.params.name);
  const png = await rasteriseToBitmap(url);
  res.setHeader('Content-Type', 'image/png');
  res.send(png);
}
```

**Why this matters.** SVG can contain scripts; HTML can contain phishing content. When served from a trusted origin (this service), consumers may embed the response in contexts where the bytes are interpreted as live markup rather than as an inert image. The sanitiser or the rasteriser is the boundary that enforces "this is content, not code".

**How to grep.** Find any handler that calls `fetch` or equivalent against a URL derived from user input, then passes the response body to `res.send` or returns it from a service function. For each, verify that the response passes through a sanitiser or rasteriser before being returned. If not, flag.

## Rule 6: Every security control must have at least one independent backup layer

**Pattern to flag.** A security-relevant code path that depends on a single control to enforce a property, with no second layer that would prevent the bad outcome if the first control failed silently.

**Counterexample (bad):**

```typescript
// Comment in code: "input validation blocks malicious params, so we can rasterise without further escaping"

app.get('/:network/:contract/:tokenId/render', validate, async (req, res) => {
  const html = `<img src="${req.params.tokenId}"/>`;
  const png = await rasterise(html);
  res.send(png);
});
```

This relies entirely on `validate` to ensure `tokenId` is safe. If `validate` is misconfigured (see `coding.md` rule 2), shipped with a bug, or bypassed by a Content-Type mismatch, the rasteriser receives raw attacker input. There is no second control.

**Acceptable shape.** Combine controls so that the failure of any single one does not result in exploitation:

```typescript
import { encode } from 'html-entities';

app.get('/:network/:contract/:tokenId/render', validate, async (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${ALLOWED_IMG_ORIGIN};">
      </head>
      <body>
        <img src="${encode(buildUrl(req.params))}"/>
      </body>
    </html>
  `;
  const png = await rasterise(html);
  res.send(png);
});
```

Now there are three layers between attacker input and exploitable output: input validation, output encoding at the interpolation site, and CSP on the rendered page. Any two can fail and the third prevents harm.

**Why this matters.** Single-layer controls fail silently. The history of this codebase includes multiple cases where a single control was assumed to work, was the only thing standing between an input and an exploitable sink, and silently stopped enforcing its property. Defence in depth is not a preference; it is the operational pattern that has avoided incidents.

**How to apply.** When adding or modifying any security-relevant code path, ask "if this control fails, what catches the bad input next?" If the answer is "nothing", add a layer. If a control is deliberately single-layer, document why directly in the code so reviewers can challenge that assumption later.

## Rule 7: Server-side fetches of user-derived URLs must apply SSRF protections

**Pattern to flag.** A call to `fetch`, `axios.get`, `http.request`, or any server-side outbound HTTP/HTTPS call where the URL is derived from request inputs (path parameters, query parameters, body) or from external content (NFT metadata records, avatar text records, resolved URI) without an explicit destination-allowlist check and an internal-address block.

**Counterexample (bad):**

```typescript
export async function fetchExternalContent(rawUrl: string) {
  const response = await fetch(rawUrl);
  return response.text();
}
```

If `rawUrl` is attacker-controlled, the attacker can target internal services on the host or the surrounding VPC: cloud metadata endpoints, internal admin APIs, databases on private IPs, the loopback interface, link-local addresses, and so on. The service running this fetch acts as a confused deputy.

**Acceptable shape:**

```typescript
import { lookup } from 'dns/promises';
import { isIP } from 'net';

const ALLOWED_HOSTS = new Set([
  'example-trusted-host.com',
  'another-trusted-host.com',
]);

const BLOCKED_RANGES = [
  // RFC 1918 private space
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  // Link-local
  /^169\.254\./,
  // Loopback
  /^127\./,
  // Cloud metadata service
  /^169\.254\.169\.254$/,
  // IPv6 loopback / link-local / unique-local
  /^::1$/,
  /^fe80:/,
  /^fc00:/,
  /^fd00:/,
];

async function isInternal(hostname: string): Promise<boolean> {
  if (isIP(hostname)) {
    return BLOCKED_RANGES.some(rx => rx.test(hostname));
  }
  const addresses = await lookup(hostname, { all: true });
  return addresses.some(a => BLOCKED_RANGES.some(rx => rx.test(a.address)));
}

export async function fetchExternalContent(rawUrl: string) {
  const parsed = new URL(rawUrl);

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('unsupported protocol');
  }

  if (!ALLOWED_HOSTS.has(parsed.hostname) && await isInternal(parsed.hostname)) {
    throw new Error('blocked destination');
  }

  const response = await fetch(rawUrl, {
    redirect: 'manual',
    signal: AbortSignal.timeout(5000),
  });

  return response.text();
}
```

The exact shape varies by use case (some endpoints have a strict allowlist; others must allow open destinations but block internal ranges). The minimum requirements are: protocol restriction, internal-address blocking, manual redirect handling so a 30x response cannot redirect into an internal address, and a request timeout.

**Why this matters.** Server-side request forgery is the single most common vector this codebase has been audited for. Past findings have involved attackers using outbound fetches to reach cloud metadata services, internal admin endpoints, and resources only reachable from the production VPC. SSRF protections are mandatory for every outbound fetch that touches user-derived input.

**How to grep.** Find every call to `fetch`, `axios.<method>`, `http.request`, `https.request`, or similar in `src/service/` and `src/controller/`. For each call, identify whether the URL argument is fully internally constructed or whether any segment derives from external input. If external input contributes to the URL, verify that the call site applies destination allowlisting, internal-address blocking, and redirect-handling. If not, flag.

## Rule 8: External fetches must cap response size and validate Content-Type on the response

**Pattern to flag.** An external fetch that reads the response body via `.text()`, `.json()`, `.buffer()`, `.arrayBuffer()`, or stream-piping without an explicit byte cap, and without verifying the response's actual Content-Type matches what the caller will treat the body as.

**Counterexample (bad):**

```typescript
const response = await fetch(rawUrl);
const body = await response.buffer();
// caller treats body as an image
```

A malicious URL can return arbitrarily large content (exhausting memory) or content of a different type than the caller expects. If the caller treats the body as one type while an upstream sanitiser treats it as another, the type confusion creates a sanitiser bypass.

**Acceptable shape:**

```typescript
const MAX_BYTES = 50 * 1024 * 1024; // 50MB
const ALLOWED_CONTENT_TYPES = new Set(['image/png', 'image/jpeg', 'image/svg+xml']);

const response = await fetch(rawUrl, {
  signal: AbortSignal.timeout(5000),
  redirect: 'manual',
});

// Check Content-Length pre-read where the upstream provides it.
const declaredLength = parseInt(response.headers.get('content-length') ?? '0', 10);
if (declaredLength > MAX_BYTES) {
  throw new Error('response too large');
}

// Verify Content-Type on the actual response.
const contentType = (response.headers.get('content-type') ?? '').split(';')[0].trim();
if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
  throw new Error('unexpected content type');
}

// Stream-read with a hard byte cap (Content-Length is advisory; some responses omit it).
const reader = response.body?.getReader();
if (!reader) throw new Error('no body');

const chunks: Uint8Array[] = [];
let total = 0;
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  total += value.byteLength;
  if (total > MAX_BYTES) {
    await reader.cancel();
    throw new Error('response exceeded size cap');
  }
  chunks.push(value);
}

const buffer = Buffer.concat(chunks);
```

**Why this matters.** Past findings have included memory-exhaustion via unbounded external fetches and Content-Type-confusion attacks where a sanitiser was bypassed because the upstream served unexpected content. Validating Content-Type only on the HEAD response (or trusting the upstream's declared type without verifying on the GET) has been a specific bypass vector in this codebase.

**How to grep.** For each call to `fetch` or equivalent identified by rule 7, additionally verify that the response body is read with an explicit byte cap and that the response's actual Content-Type is checked against an expected set before the body is passed to downstream consumers.

## Rule 9: Error responses must be uncacheable; success responses must set cache headers deliberately

**Pattern to flag.** A route handler that sends an error response (4xx or 5xx) without explicitly setting `Cache-Control: no-store` (or equivalent), or a success response that does not set `Cache-Control` at all (and therefore inherits whatever the global middleware default is, which may be inappropriate for the response's actual freshness requirements).

**Counterexample (bad):**

```typescript
// Global middleware sets Cache-Control: public, max-age=3600 for all GETs.
app.use(setCacheHeader);

// Route returns errors with the inherited cache header.
app.get('/api/thing/:id', async (req, res) => {
  try {
    const result = await fetchThing(req.params.id);
    res.json(result);
  } catch (e) {
    res.status(500).json({ message: 'internal error' });
    // <- this 500 response is cached for an hour at the edge CDN
  }
});
```

An attacker crafts a request that produces an error. The edge CDN caches the error response under that request's URL. Legitimate requests to the same URL now receive the cached error until the TTL expires.

**Acceptable shape:**

```typescript
app.get('/api/thing/:id', async (req, res) => {
  try {
    const result = await fetchThing(req.params.id);
    res.set('Cache-Control', 'public, max-age=3600');
    res.json(result);
  } catch (e) {
    res.set('Cache-Control', 'no-store');
    res.status(500).json({ message: 'internal error' });
  }
});
```

Or, equivalently, set `Cache-Control: no-store` at the error-handling middleware that runs for all 4xx/5xx responses.

**Why this matters.** Edge caches (Cloudflare, Cloud CDN, App Engine cache layer) cache responses by request URL plus the cache headers the origin sends. Past findings against this service have shown that error responses inheriting the success-path cache headers create a denial-of-availability vector: one malicious request poisons the cache for everyone hitting the same URL.

**How to grep.** Find every `res.status(N).` call where `N >= 400` in `src/controller/`. For each, verify that the same code path sets `Cache-Control: no-store` (either explicitly or via shared middleware). If not, flag.

## Rule 10: Embedded-resource source allowlists must exclude origins that serve user-controlled content

**Pattern to flag.** A CSP directive (`img-src`, `script-src`, `style-src`, `connect-src`, etc.), a `<img src>` URL builder, or any "trusted origins" list that includes a host where attackers can upload or otherwise control the served content.

**Counterexample (bad):**

```typescript
// CSP for a rendered HTML page that will be screenshot or served to consumers.
const csp = `default-src 'none'; img-src https://this-very-service.example/ https://an-NFT-cdn.example/;`;
```

If `this-very-service.example` serves user-controlled NFT metadata (avatar URLs, image bytes), then the CSP "trusts" the user's own content. An attacker who can set a malicious avatar can have it loaded under the trusted origin, defeating the point of the allowlist.

The same trap exists in non-CSP allowlists:

```typescript
// next.config.js or equivalent image-host allowlist
const allowedImageDomains = [
  'cdn.example.com',
  'metadata.our-service.example',  // <- this serves user-controlled content
];
```

**Acceptable shape:** any source listed in an allowlist must be either:

1. A host fully controlled by this service and serving only content this service generates (not pass-through of user input), or
2. Explicitly justified at the call site with the mitigations applied to the served content (sanitisation, rasterisation, strict Content-Type guarantees).

```typescript
// Sources must be:
// - hosts we operate
// - serving only content we generate (not user-controlled pass-through)
const csp = `default-src 'none'; img-src https://our-static-cdn.example/;`;
```

**Why this matters.** A chained-vector pattern in past audits: an attacker uploads malicious content to a user-content host, then the malicious content is loaded under a "trusted" allowlist on a different surface (typically a wallet-connected frontend), elevating a low-impact content-control finding into a high-impact wallet-interaction chain. Past Critical-tier findings in adjacent services have followed this shape.

**How to grep.** Find every CSP directive (in code, in HTML templates, in `helmet` middleware configuration) and every image-host or domain allowlist (in `next.config.js`-style configs, in URL builders). For each entry, verify that the listed origin is not a host that serves user-controlled content. If unclear, flag.
