# FitCore Webhook Security & Signature Verification

## 1. Cryptographic HMAC-SHA256 Signatures
To ensure webhook payloads originate exclusively from FitCore and have not been tampered with or intercepted in transit, every delivery includes cryptographic HTTP headers:

- `X-FitCore-Signature`: The hexadecimal HMAC-SHA256 signature calculated over `${timestamp}.${rawJsonBody}` using your endpoint's shared webhook secret.
- `X-FitCore-Timestamp`: Unix epoch timestamp in milliseconds when the event was dispatched.

## 2. Verification Algorithm (Node.js Reference Implementation)
```typescript
import * as crypto from 'crypto';

export function verifyFitCoreWebhook(
  rawBody: string,
  signatureHeader: string,
  timestampHeader: string,
  webhookSecret: string,
  toleranceSeconds = 300,
): boolean {
  const timestamp = parseInt(timestampHeader, 10);
  const currentTime = Date.now();

  // 1. Replay & Drift Protection: Reject timestamps older than 5 minutes
  if (Math.abs(currentTime - timestamp) > toleranceSeconds * 1000) {
    throw new Error('Webhook timestamp drift exceeds tolerance window');
  }

  // 2. Compute expected HMAC-SHA256 signature
  const signedPayload = `${timestamp}.${rawBody}`;
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  // 3. Constant-time comparison to prevent timing attacks
  const signatureBuffer = Buffer.from(signatureHeader, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}
```

## 3. Server-Side Request Forgery (SSRF) Defenses
To protect internal infrastructure and cloud metadata services, FitCore blocks any webhook destination pointing to:
- Loopback addresses (`127.0.0.1`, `::1`, `localhost`)
- AWS / GCP / Azure metadata services (`169.254.169.254`, `metadata.google.internal`)
- RFC 1918 Private IPv4 subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`)
- Private IPv6 address spaces (`fc00::/7`, `fe80::/10`)
- Non-HTTPS destinations in production environments

Any attempt to register an endpoint resolving to these ranges is rejected immediately with HTTP 400 `SSRF_ATTEMPT_DETECTED`.

## 4. Delivery Retries & Auto-Degradation
- **Exponential Backoff**: Webhooks retry on HTTP failure (5xx or connection timeout) up to 5 times (immediate, +1m, +5m, +15m, +1h).
- **Circuit Breaker**: If an endpoint fails consecutively for 10 attempts over 24 hours, its status is automatically degraded to `DEGRADED`. Gym administrators and developers receive alerts to inspect their webhook listener.
