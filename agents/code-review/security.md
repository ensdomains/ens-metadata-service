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

**The CSP must cover both script execution AND navigation.** `script-src` alone does not block `<meta http-equiv="refresh">`, which is sufficient for open-redirect via injected HTML. To block injected meta-refresh, either strip all `<meta>` elements from forwarded payloads or set the CSP to a posture where the inner page cannot navigate (`default-src 'self'` plus `<meta>` element sanitisation; or `default-src 'none'` for fully inert content).

**Headless-browser inner pages need their own CSP.** When this service renders content inside a headless browser (Puppeteer `page.setContent`, `page.goto('data:text/html,...')`, or similar), the outer site's HTTP response CSP does not reach the inner page. The inner page's HTML must include its own `<meta http-equiv="Content-Security-Policy">` tag, and the browser must be launched with `javaScriptEnabled: false` (verified per rule 3). Watch for regressions when switching from URL-load (where the URL's origin CSP applies) to template-load (where no CSP applies unless the template includes one).

**How to grep.** In any module that emits HTML (via template literal, file template, or string builder), check whether the emitted HTML includes a `Content-Security-Policy` directive. If not, flag. Specifically: any call to `page.setContent` or similar headless-browser methods must be reviewed for an inline CSP in the HTML being loaded.

## Rule 5: User-supplied SVG and HTML content must be sanitised or rasterised on every ingestion path, using an allowlist sanitiser

**Pattern to flag.** An endpoint that serves SVG or HTML content fetched from a user-controlled URL (avatar text records, NFT metadata, external links) without sanitisation or rasterisation. Equally important: a sanitiser that runs on one ingestion path (e.g. `fetch(url)` when Content-Type indicates SVG) but not on a sibling path (data: URI returned from a contract's `tokenURI`, base64-decoded inline content, on-chain metadata fields).

**Counterexample (bad sibling-path skip):**

```typescript
async function resolveAvatar(record: string) {
  if (record.startsWith('data:')) {
    // Decode the data URI inline; no sanitiser runs here.
    return decodeDataUri(record);
  }
  // External URL path: sanitiser runs here.
  const response = await fetch(record);
  return sanitiseSvg(await response.text());
}
```

The external path is sanitised. The on-chain data-URI path is not. Attacker mints an NFT whose `tokenURI` returns a base64-encoded SVG and sets that NFT as their ENS avatar; the data-URI branch decodes and serves the SVG with no sanitisation.

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

**SVG-specific sanitiser requirements.** SVG is a rich format. A `<script>` denylist is not enough; past defects have been triggered by elements and attributes that look benign but enable phishing or navigation:

- `<a href=...>` and `<a xlink:href=...>` — clickable navigation, used to embed phishing call-to-actions inside an avatar.
- `<foreignObject>` — embeds arbitrary HTML inside SVG, bypassing SVG-only sanitisers.
- `<use href=...>` / `<use xlink:href=...>` — can reference external SVG content and break out of the local document.
- `<animate attributeName="href" ...>` / `<set attributeName="href" ...>` — can mutate link targets after the sanitiser has run.
- Inline `style="position: fixed; top: 0; left: 0; width: 100%; height: 100%;"` — creates a full-viewport overlay, enabling phishing UI without any script execution.

Use an allowlist of permitted tags and attributes, not a denylist of forbidden ones. A library configured with an SVG profile (e.g. DOMPurify `USE_PROFILES: { svg: true, svgFilters: true }`) is the baseline; verify the allowlist excludes `<a>`, `<foreignObject>`, and `<use>` for the specific context.

**Why this matters.** SVG can contain scripts; HTML can contain phishing content. When served from a trusted origin (this service), consumers may embed the response in contexts where the bytes are interpreted as live markup rather than as an inert image. The sanitiser or the rasteriser is the boundary that enforces "this is content, not code". Past defects in this codebase have been: sanitiser running on one ingestion path but not on a sibling path (data URIs, on-chain base64); denylist-based sanitiser allowing `<a>` and full-viewport `<rect>`+`<text>` overlays through; and SVG content from NFT metadata fields like `image` and `background_image` bypassing the avatar-resolution sanitiser entirely.

**How to grep.** Find any handler that calls `fetch` or equivalent against a URL derived from user input, then passes the response body to `res.send` or returns it from a service function. For each, verify that the response passes through a sanitiser or rasteriser before being returned. Also: find every place the codebase decodes a `data:` URI or processes on-chain metadata, and verify the same sanitiser runs on those paths. Verify the sanitiser config is allowlist-based and excludes the specific SVG elements listed above. If not, flag.

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

**Per-hop check required.** SSRF protections that run only on the initial URL are bypassed by an attacker-controlled redirect chain. The URL the attacker submits resolves to a public address; the attacker's server responds with a 302 `Location: http://169.254.169.254/...` and the HTTP client (axios, node-fetch, got, undici) follows it by default. The check must run on every hop, including after DNS resolution at each hop. Set `redirect: 'manual'` (or `maxRedirects: 0`) and re-run the destination-allowlist + internal-address check on each `Location` before re-issuing the request. The cloud metadata endpoint `169.254.169.254` (GCP / AWS / Azure) is the canonical exfiltration target; on GCP it returns IAM credentials when the request carries `Metadata-Flavor: Google`.

**Why this matters.** Server-side request forgery is the single most common vector this codebase has been audited for. Past findings have involved attackers using outbound fetches to reach cloud metadata services, internal admin endpoints, and resources only reachable from the production VPC. Past findings have also specifically exploited the redirect-bypass: a check on the initial URL passes, then the attacker's server redirects into the internal range. SSRF protections are mandatory for every outbound fetch that touches user-derived input, on every hop.

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

**Streaming byte cap is mandatory; Content-Length pre-check alone is not enough.** A `Content-Length`-based pre-check is bypassable because the upstream can omit the header (HTTP/1.1 chunked transfer encoding, HTTP/2 framing) and stream arbitrary bytes. A timeout is also not enough: a fast attacker streams hundreds of megabytes inside a few seconds. The byte cap must be enforced by counting actual bytes read from the response stream and aborting the read when the counter exceeds the limit. Helper libraries like node-fetch's `size` option implement this; verify the option is set and the limit is sane for the use case.

**HEAD/GET divergence is a class of bug, not a missing check.** Code that issues a HEAD to a user-controlled URL, validates the HEAD response's Content-Type, then issues a GET and forwards the GET response body or headers downstream is structurally broken. The attacker's server can respond differently to HEAD vs GET: HEAD returns `Content-Type: image/svg+xml` and passes validation; GET returns `Content-Type: text/html; ...injected payload...` or a different body entirely. Any check that influences a downstream decision must run on the response that is actually consumed. Either issue one GET and validate that response, or re-run all checks on the GET response before using its body.

**Why this matters.** Past findings have included memory-exhaustion via unbounded external fetches and Content-Type-confusion attacks where a sanitiser was bypassed because the upstream served unexpected content. Validating Content-Type only on the HEAD response (or trusting the upstream's declared type without verifying on the GET) has been a specific bypass vector in this codebase. Past findings have also exploited the upstream forwarding the raw `Content-Type` header value into the downstream response, where the attacker-controlled header carries injected HTML.

**How to grep.** For each call to `fetch` or equivalent identified by rule 7, additionally verify that the response body is read with an explicit byte cap enforced by a counter (not just `Content-Length` pre-check) and that the response's actual Content-Type is checked against an expected set on the response whose body is consumed. Flag any HEAD-then-GET pattern where validation runs on HEAD and body+headers are consumed from GET without re-validation.

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

**Image-proxy and Next.js `images.domains` specifics.** Image-optimisation proxies (Next.js `_next/image`, similar Vercel / Cloudflare features) re-serve the image bytes from the proxy origin, not from the upstream. Any user-influenced upstream in the proxy allowlist becomes a same-origin XSS surface on the proxy site for any payload that escapes the image contract (SVG with embedded HTML, sniffed-as-HTML content). Specific configurations to flag:

- Next.js `images.domains` or `images.remotePatterns` entries pointing at hosts that serve user content (avatar services, NFT metadata services, IPFS gateways, user-uploaded CDN buckets).
- Next.js `dangerouslyAllowSVG: true` without `contentDispositionType: 'attachment'` and a strict `contentSecurityPolicy` on the `_next/image` endpoint. SVG through the image proxy is XSS by default in Next.js; the safe defaults must be set explicitly.
- Equivalent settings in other frameworks: Vercel image optimisation, Cloudflare Images, custom proxies that re-emit bytes under the proxy's origin.

**How to grep.** Find every CSP directive (in code, in HTML templates, in `helmet` middleware configuration) and every image-host or domain allowlist (in `next.config.js`-style configs, in URL builders). For each entry, verify that the listed origin is not a host that serves user-controlled content. If unclear, flag. Specifically check for Next.js `images` config blocks and verify SVG handling.

## Rule 11: NFT-metadata fields that hold URLs or markup are XSS sinks

**Pattern to flag.** Code that reads `image`, `background_image`, `animation_url`, `external_url`, `image_data`, or similar fields from arbitrary NFT metadata (i.e. JSON returned by a contract's `tokenURI`) and renders, embeds, or forwards the value without (a) constraining the URL scheme to `https:` or `ipfs:` only, (b) re-running the sanitisation pipeline on the resolved content if it is SVG or HTML, and (c) treating the field as fully attacker-controlled regardless of which contract returned it.

**Counterexample (bad):**

```typescript
async function renderNftPreview(contract: string, tokenId: string) {
  const metadata = await fetchNftMetadata(contract, tokenId);
  return `
    <div class="preview">
      <img src="${metadata.image}" />
      <div style="background-image: url('${metadata.background_image}');">
        <a href="${metadata.external_url}">View</a>
      </div>
    </div>
  `;
}
```

Three independent injection sinks. `metadata.image` and `metadata.background_image` can contain `javascript:` URIs (depending on the rendering context), SVG data URIs that bypass image-context sanitisers, or attacker-controlled URLs whose resolved content is HTML. `metadata.external_url` is a direct phishing-link primitive. All three flow from attacker input (anyone can mint an NFT and define these fields).

**Acceptable shape:**

```typescript
import { encode } from 'html-entities';

const ALLOWED_SCHEMES = new Set(['https:', 'ipfs:']);

function safeUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  try {
    const parsed = new URL(raw);
    if (!ALLOWED_SCHEMES.has(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

async function renderNftPreview(contract: string, tokenId: string) {
  const metadata = await fetchNftMetadata(contract, tokenId);
  const image = safeUrl(metadata.image);
  const externalUrl = safeUrl(metadata.external_url);

  // If the resolved content is SVG, it goes through rule 5's sanitiser before rendering.
  const imageHtml = image ? `<img src="${encode(image)}" />` : '';
  const linkHtml = externalUrl ? `<a href="${encode(externalUrl)}" rel="noopener noreferrer">View</a>` : '';

  return `
    <div class="preview">
      ${imageHtml}
      ${linkHtml}
    </div>
  `;
}
```

**Why this matters.** Past defects in this codebase have used the `image` and `background_image` fields of arbitrary NFT metadata as the injection sink. The metadata is JSON returned by a contract under attacker control; anyone can mint an NFT, populate these fields with attacker-controlled values, and either set the NFT as their ENS avatar or airdrop it to a victim. The fields are not optional input the service can refuse; they are part of the standard NFT-metadata contract. They must be treated as fully untrusted at every read site.

**How to grep.** Find every read of `metadata.image`, `metadata.background_image`, `metadata.animation_url`, `metadata.external_url`, `metadata.image_data`, and similar fields. For each, trace the value through to its sink. If the sink is HTML rendering (template literal, `res.send`, `dangerouslySetInnerHTML`-equivalent), verify that the value passes through URL-scheme validation, HTML encoding, and (if the resolved content is SVG/HTML) the sanitiser from rule 5. If any of these is missing, flag.

## Rule 12: User-content-rendering subdomains inherit wallet trust from sibling subdomains

**Pattern to flag.** A new subdomain on the apex domain (or any subdomain whose origin renders user-controlled content) without explicit isolation from sibling subdomains where users connect wallets.

**The trust boundary.** The browser's same-origin policy isolates by origin (scheme + host + port). Wallet extensions (MetaMask, Rabby, etc.) scope `window.ethereum` per origin. But cookies, storage, and some browser-level features are scoped to the registrable domain (eTLD+1). And users build trust based on the apex name, not the subdomain. A subdomain that serves user-controlled HTML or SVG inherits the apex's brand trust without inheriting the apex's security review.

**Counterexample (bad shape):**

```
example.com                          # marketing / no wallet
app.example.com                      # wallet-connected app, full origin trust
metadata.example.com                 # serves user-controlled NFT metadata (avatar SVGs, image bytes)
                                     # ← XSS here is one social-engineering step from a wallet prompt
new-tool.example.com                 # newly added subdomain, also serves user content
                                     # ← any user-content rendering here inherits the same risk
```

A user-content-rendering subdomain that is XSS-vulnerable becomes a wallet-interaction vector via cross-subdomain navigation, image-proxy embedding (see rule 10), or chained-origin attacks. Users who see "example.com" in the URL bar treat the page as trusted.

**Acceptable shapes:**

- Serve user content from a separate registrable domain (e.g. `example-user-content.net`) that is clearly outside the trusted apex. The user-content domain has its own CSP, its own deployment review, and crucially does not inherit user trust from the wallet-connected app.
- Or: if the user content must live under the apex for compatibility, render the content in a way that does not produce arbitrary HTML/SVG on the subdomain's origin. Specifically: rasterise to bitmap (PNG/JPEG) on the server, serve only `image/*` bytes (with `X-Content-Type-Options: nosniff`), and never let HTML reach the subdomain's origin even via a preview template gated on a `Sec-Fetch-Dest` header.
- Or: scope wallet connection on the trusted app to a specific origin and disable wallet auto-connect on any sibling subdomain, so XSS on the sibling does not transitively get a wallet to interact with.

**Why this matters.** Past Critical-tier findings against this org have specifically chained user-content rendering on one subdomain into wallet interactions on a sibling subdomain via the image-proxy pattern (rule 10) and via cross-tab navigation. The mitigation discussion concluded that the trust boundary is the rendering origin, not the rendering path: any rendered HTML at a user-content subdomain is one social-engineering step from a wallet prompt. New subdomains added to the apex inherit this risk by default.

**How to apply.** When reviewing any change that adds a new subdomain, a new route under an existing subdomain that emits HTML, or a new content-rendering capability, ask: "Is this origin user-influenced? Does this origin share registrable domain with a wallet-connected app?" If both, the change requires explicit isolation, rasterisation, or migration to a separate registrable domain. The decision must be documented at the call site.

## Rule 13: CSS injection on user-controlled style inputs is its own sink class

**Pattern to flag.** A user-controlled string interpolated into a `style="..."` attribute, an inline `<style>` block, a styled-components template literal, or a CSS variable, without passing the value through a CSS-token allowlist.

**Counterexample (bad):**

```typescript
function renderBanner(bannerUrl: string) {
  return `<div style="background-image: url('${bannerUrl}');">...</div>`;
}
```

The string `bannerUrl` may contain `'); ...malicious-css...; background-image: url('` to break out of the `url(...)` value, close the property, and append arbitrary CSS rules. The HTML attribute encoder will not stop this because the issue is in the CSS grammar, not the HTML grammar.

Equivalent shape in styled-components:

```typescript
const Banner = styled.div`
  background-image: url('${props => props.bannerUrl}');
`;
```

Same problem. The CSS-in-JS engine substitutes the string verbatim into the rendered style.

**Acceptable shape:**

```typescript
function safeImageUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'https:') return null;
    if (!ALLOWED_IMAGE_HOSTS.has(parsed.hostname)) return null;
    return CSS.escape(parsed.toString());
  } catch {
    return null;
  }
}

function renderBanner(bannerUrl: string) {
  const safe = safeImageUrl(bannerUrl);
  if (!safe) return '<div></div>';
  return `<div style="background-image: url('${safe}');">...</div>`;
}
```

For numeric / length / color values, use a CSS-token parser that returns only the validated token type. For `url(...)` values, validate the URL scheme and host through an allowlist, then `CSS.escape` (or equivalent) before interpolation.

**Why this matters.** HTML encoding (escaping `<`, `>`, `&`, `"`) does not prevent CSS injection. CSS has its own grammar with `}` closing rules, `@import` directives, `expression(...)` and `behavior:url(...)` legacy primitives that resurface in some renderers, and various property values that can carry attacker-controlled URLs. Past defects in this codebase have used CSS injection via on-chain banner / profile text records to create persistent UI overlays and to defeat phishing-mitigation chrome. CSS-only attacks are not blocked by `script-src` and are invisible to most XSS scanners.

**How to grep.** Find every `style="..."` attribute and every inline `<style>` content that contains `${...}` or `+ variable +`. Find every styled-components template literal that contains a `${props => ...}` or similar dynamic value. For each, trace the variable to its source. If user-controlled, verify it passes through a CSS-token allowlist plus `CSS.escape`. If not, flag.

## Rule 14: HTML responses must set Cross-Origin-Opener-Policy

**Pattern to flag.** A route that emits HTML without setting `Cross-Origin-Opener-Policy: same-origin` (or stricter), AND without a shared response-header middleware that sets it for all HTML responses.

**Counterexample (bad):**

```typescript
app.get('/preview/:name', (req, res) => {
  const html = renderPreview(req.params.name);
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});
```

No COOP header. An attacker page on a different origin can call `window.open(this URL)` and retain the returned `WindowProxy`. After the user interacts with the popup, the attacker page can call `popup.location = 'https://attacker.example/phishing'` (or `opener.location = ...` from the other direction) and silently navigate the user to a phishing page. The address bar updates; the user perceives continuity with the legitimate origin.

**Acceptable shape:**

```typescript
// Shape A: shared middleware setting cross-origin headers on every response.
app.use((_req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});
```

```typescript
// Shape B: helmet, which sets COOP and related headers by default in recent versions.
import helmet from 'helmet';
app.use(helmet());
app.use(helmet.crossOriginOpenerPolicy({ policy: 'same-origin' }));
```

Per-route header setting is also acceptable, but it does not scale: any new HTML-emitting route added later will inherit the bug unless the reviewer remembers to set COOP. Shared middleware is the maintainable shape.

**Why this matters.** CSP does not cover the `window.opener` navigation primitive. `script-src` does not block it; `default-src 'self'` does not block it; even `default-src 'none'` does not block it, because the navigation is performed by the browser on behalf of the opening page, not by script in the opened page. `X-Frame-Options: DENY` blocks framing but not the popup case. COOP is the dedicated header that severs the `window.opener` relationship across origins. Past defects in this codebase have used COOP-missing responses to silently navigate users from a legitimate origin to a phishing destination after a brief delay. The metadata service's HTML emissions (preview templates, docs pages, rasterize inner pages, any error pages rendered as HTML) all inherit this risk by default.

**How to grep.** Find every code path that calls `res.send(...)`, `res.sendFile(...)`, `res.render(...)`, `res.setHeader('Content-Type', 'text/html')`, or returns a response with HTML content. For each, verify that `Cross-Origin-Opener-Policy` is set either explicitly at the route or via shared middleware that runs before the response. If a route emits HTML and neither path sets COOP, flag.
