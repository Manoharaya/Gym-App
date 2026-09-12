import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * SecurityHeadersMiddleware
 *
 * Enforces production-grade defensive HTTP response headers across all routes.
 * Mitigates MIME sniffing, clickjacking, protocol downgrade, and unauthorized iframe embedding.
 */
@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking by forbidding embedding in frames
    res.setHeader('X-Frame-Options', 'DENY');

    // Legacy XSS filter activation in blocking mode
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // HTTP Strict Transport Security (HSTS)
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    // Control referrer information leakage
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Content Security Policy
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; img-src 'self' data: https:; font-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; frame-ancestors 'none';",
    );

    // Redact framework identification
    res.removeHeader('X-Powered-By');

    next();
  }
}
