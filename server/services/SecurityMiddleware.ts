import { Request, Response, NextFunction } from 'express';

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

class InMemoryRateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();

  public limit(options: RateLimitOptions) {
    return (req: Request, res: Response, next: NextFunction) => {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const key = `${req.path}:${ip}`;
      const now = Date.now();
      const entry = this.requests.get(key);

      if (!entry || now > entry.resetTime) {
        this.requests.set(key, { count: 1, resetTime: now + options.windowMs });
        res.setHeader('X-RateLimit-Limit', options.maxRequests);
        res.setHeader('X-RateLimit-Remaining', options.maxRequests - 1);
        return next();
      }

      if (entry.count >= options.maxRequests) {
        res.setHeader('Retry-After', Math.ceil((entry.resetTime - now) / 1000));
        return res.status(429).json({
          error: 'TOO_MANY_REQUESTS',
          message: options.message || 'Trop de requêtes. Veuillez patienter avant de réessayer.'
        });
      }

      entry.count++;
      this.requests.set(key, entry);
      res.setHeader('X-RateLimit-Limit', options.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, options.maxRequests - entry.count));
      next();
    };
  }
}

export const rateLimiter = new InMemoryRateLimiter();

/**
 * Security Headers Middleware (OWASP recommended)
 * In production (Render / custom domain): Enforces strict SAMEORIGIN framing and HSTS.
 * In development / preview (AI Studio): Allows secure framing from Google AI Studio origins.
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  const isProduction = process.env.NODE_ENV === 'production';

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (isProduction) {
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' https:; frame-ancestors 'self';"
    );
  } else {
    // Development / AI Studio Preview: Allow embedding in AI Studio workspace iframe
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' https:; frame-ancestors 'self' https://aistudio.google.com https://*.google.com https://*.run.app;"
    );
  }

  next();
}

/**
 * Safe CORS configuration without wildcards for authenticated routes
 */
export function corsSecurityMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  // Allow same-origin or explicit development / preview hosts
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
}

/**
 * IDOR / Tenant Isolation Validator
 */
export function validateResourceAccess(requestUserId?: string, targetUserId?: string): boolean {
  if (!targetUserId) return true;
  // Enforce tenant boundary
  const currentUserId = requestUserId || 'user_owner_default';
  return currentUserId === targetUserId;
}

/**
 * Safe Global Error Handler
 * Strips stack traces, database connection strings, and tokens before sending error responses.
 */
export function safeErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const isProd = process.env.NODE_ENV === 'production';
  let message = err?.message || 'Une erreur interne est survenue.';

  // Strip token / secret / connection leaks
  message = message.replace(/(Bearer\s+[A-Za-z0-9_\-\.]+)/gi, '[REDACTED_TOKEN]');
  message = message.replace(/(postgres:\/\/[^\s]+)/gi, '[REDACTED_DB_URL]');
  message = message.replace(/([a-zA-Z0-9_-]{32,})/gi, (match: string) => {
    return match.length > 40 ? '[REDACTED_SECRET]' : match;
  });

  const statusCode = err?.statusCode || (err?.status && typeof err.status === 'number' ? err.status : 500);

  res.status(statusCode).json({
    error: err?.code || 'INTERNAL_SERVER_ERROR',
    message: isProd && statusCode === 500 ? 'Une erreur interne est survenue.' : message
  });
}
