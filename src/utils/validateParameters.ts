import { Request, Response, NextFunction } from 'express';

interface AutoValidationConfig {
  allowedNetworks?: string[];
  skipRoutes?: string[];
  strictRoutes?: string[];
  enableLogging?: boolean;
  logSecurityEvents?: boolean;
}

const DEFAULT_CONFIG: AutoValidationConfig = {
  allowedNetworks: [
    'mainnet', 'sepolia', 'holesky'
  ],
  skipRoutes: ['/', '/docs', '/favicon.ico'],
  strictRoutes: ['/rasterize'],
  enableLogging: true,
  logSecurityEvents: true
};

export function createUniversalValidation(config: AutoValidationConfig = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip validation for safe routes
      if (finalConfig.skipRoutes?.some(route => {
        if (route === '/') {
          return req.path === '/';  // Exact match for root
        }
        return req.path === route || req.path.startsWith(route + '/');
      })) {
        return next();
      }

      const errors: string[] = [];
      const params = req.params || {};
      const query = req.query || {};
      
      if (finalConfig.enableLogging) {
        console.log(`[SECURITY] Request to ${req.path}:`, {
          params,
          query: Object.keys(query).length > 0 ? query : undefined,
          ip: req.ip,
          method: req.method
        });
      }

      // Security-first validation for networkName
      if (params.networkName) {
        const networkName = params.networkName;
        
        if (typeof networkName !== 'string') {
          errors.push('Network name must be a string');
        } else if (containsHTMLInjection(networkName)) {
          errors.push('Network name contains dangerous characters');
        } else if (!/^[a-zA-Z0-9-]+$/.test(networkName)) {
          errors.push('Network name contains invalid characters');
        } else if (networkName.length > 20) {
          errors.push('Network name too long');
        } else if (!finalConfig.allowedNetworks?.includes(networkName.toLowerCase())) {
          errors.push(`Unsupported network: ${networkName}`);
        }
      }

      // Security validation for contractAddress
      if (params.contractAddress) {
        const contractAddress = params.contractAddress;
        
        if (typeof contractAddress !== 'string') {
          errors.push('Contract address must be a string');
        } else if (containsHTMLInjection(contractAddress)) {
          errors.push('Contract address contains dangerous characters');
        } else if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
          errors.push('Invalid contract address format');
        }
      }

      // Security validation for tokenId
      if (params.tokenId) {
        const tokenId = params.tokenId;
        
        if (typeof tokenId !== 'string') {
          errors.push('Token ID must be a string');
        } else if (tokenId.length > 255) {
          errors.push('Token ID too long');
        } else if (!isSafeTokenOrName(tokenId)) {
          errors.push('Token ID contains dangerous or invalid characters');
          if (finalConfig.logSecurityEvents) {
            console.warn(`[SECURITY] Blocked suspicious tokenId: "${tokenId}"`);
          }
        }
      }

      // Security-first validation for name parameter
      if (params.name) {
        const name = params.name;
        
        if (typeof name !== 'string') {
          errors.push('Name must be a string');
        } else if (name.length > 255) {
          errors.push('Name too long');
        } else if (!isSafeTokenOrName(name)) {
          errors.push('Name contains dangerous or invalid characters');
          if (finalConfig.logSecurityEvents) {
            console.warn(`[SECURITY] Blocked suspicious name: "${name}"`);
          }
        }
      }

      // Validate query parameters with same security-first approach
      const dangerousQueryParams = ['network', 'networkName', 'contractAddress', 'tokenId', 'name'];
      
      for (const paramName of dangerousQueryParams) {
        const paramValue = query[paramName] as string;
        
        if (paramValue) {
          if (containsHTMLInjection(paramValue)) {
            errors.push(`Query parameter '${paramName}' contains dangerous characters`);
          } else if (paramName === 'network' || paramName === 'networkName') {
            if (!/^[a-zA-Z0-9-]+$/.test(paramValue)) {
              errors.push(`Query parameter '${paramName}' contains invalid characters`);
            } else if (!finalConfig.allowedNetworks?.includes(paramValue.toLowerCase())) {
              errors.push(`Unsupported network in query: ${paramValue}`);
            }
          } else if (paramName === 'tokenId' || paramName === 'name') {
            if (!isSafeTokenOrName(paramValue)) {
              errors.push(`Query parameter '${paramName}' contains dangerous or invalid characters`);
            }
          } else if (paramName === 'contractAddress') {
            if (!/^0x[a-fA-F0-9]{40}$/.test(paramValue)) {
              errors.push(`Query parameter '${paramName}' must be valid contract address`);
            }
          }
        }
      }

      // Handle validation errors
      if (errors.length > 0) {
        if (finalConfig.logSecurityEvents) {
          console.warn('[SECURITY] BLOCKED malicious request:', {
            path: req.path,
            errors,
            params,
            query,
            ip: req.ip,
            userAgent: req.get('User-Agent')
          });
        }
        
        return res.status(400).json({
          error: 'Invalid request parameters',
          details: errors,
          path: req.path
        });
      }

      // Store normalized parameters
      (req as any).validatedParams = {
        ...params,
        networkName: params.networkName?.toLowerCase(),
        contractAddress: params.contractAddress?.toLowerCase()
      };

      next();
    } catch (error) {
      console.error('[SECURITY] Validation middleware error:', error);
      return res.status(500).json({
        error: 'Internal validation error'
      });
    }
  };
}

// SECURITY: Explicit HTML injection detection
function containsHTMLInjection(input: string): boolean {
  // First check for any HTML-like syntax at all
  if (input.includes('<') || input.includes('>') || input.includes('"') || input.includes("'")) {
    return true;
  }
  
  // Check for common HTML injection patterns
  const dangerousPatterns = [
    /<[^>]*>/,           // Any HTML tags
    /javascript:/i,      // JavaScript protocol
    /data:.*script/i,    // Data URLs with script
    /on\w+\s*=/i,        // Event handlers (onclick, onerror, etc.)
    /&lt;|&gt;|&#60;|&#62;/, // HTML entity encoded brackets
    /["'`]\s*\/\s*>/,    // Quote escaping patterns
    /<!--/,              // HTML comments
    /%3[Cc]/,            // URL encoded < character
    /%3[Ee]/,            // URL encoded > character
    /[\x00-\x1f]/,       // Control characters (fixed regex)
    /\\/,                // Backslash (escape character)
    /&#/,                // HTML entity encoding
    /%[0-9a-fA-F]{2}/,   // URL encoding
  ];
  
  return dangerousPatterns.some(pattern => pattern.test(input));
}

// Safe validation using DOMPurify + ENS normalization
function isSafeTokenOrName(input: string): boolean {
  // For pure numeric token IDs - these are always safe
  if (/^\d+$/.test(input)) {
    return true;
  }
  
  // Length check
  if (input.length > 255) {
    return false;
  }
  
  // First, use DOMPurify to detect XSS attempts
  const DOMPurify = require('dompurify');
  const { JSDOM } = require('jsdom');
  const window = new JSDOM('').window;
  const purify = DOMPurify(window);
  
  // If DOMPurify changes the input, it contained dangerous content
  const sanitized = purify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  if (sanitized !== input) {
    return false;
  }
  
  // Additional check for common XSS patterns that might slip through
  const dangerousPatterns = [
    /[<>'"]/,              // HTML special characters
    /javascript:/i,        // JavaScript protocol
    /data:/i,              // Data URLs
    /on\w+\s*=/i,          // Event handlers
    /&#/,                  // HTML entities
    /%[0-9a-fA-F]{2}/,     // URL encoding
    /[\x00-\x1f]/,         // Control characters
  ];
  
  if (dangerousPatterns.some(pattern => pattern.test(input))) {
    return false;
  }
  
  // Finally, use ENS normalization check - input must equal its normalized form
  try {
    const { ens_normalize } = require('@adraffy/ens-normalize');
    const normalized = ens_normalize(input);
    return input === normalized;
  } catch (error) {
    // If normalization fails, it's not a valid ENS name
    return false;
  }
}

// Export configurations
export const ValidationConfigs = {
  standard: {
    enableLogging: true,
    logSecurityEvents: true
  },
  
  production: {
    allowedNetworks: ['mainnet', 'sepolia', 'holesky'],
    enableLogging: true,
    logSecurityEvents: true,
    strictRoutes: ['/rasterize', '/image']
  },
  
  development: {
    allowedNetworks: [
      'mainnet', 'sepolia', 'holesky',
      'localhost', 'hardhat', 'anvil'
    ],
    enableLogging: true,
    logSecurityEvents: false
  },
  
  minimal: {
    skipRoutes: ['/', '/docs', '/favicon.ico'],
    enableLogging: false,
    logSecurityEvents: true
  }
};

export const universalValidation = createUniversalValidation();
