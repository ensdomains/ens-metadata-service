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
