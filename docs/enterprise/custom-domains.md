# Enterprise Custom Domains Foundation

## 1. Overview
Enterprise operators often require white-labeled domain names (e.g. `portal.fitcoreelite.com.au` or `app.corepulsestudios.com`) to preserve their brand experience.

The FitCore Custom Domain Foundation implements full DNS challenge token generation, CNAME routing, and automatic SSL certificate status lifecycle tracking.

## 2. Verification Protocol
1. **Registration** (`POST /api/v1/enterprise/domains`):
   * Normalizes FQDN and checks for global platform collisions.
   * Generates secure cryptographically randomized verification token:
     `fitcore-challenge-${crypto.randomBytes(16).toString('hex')}`
   * Computes expected DNS challenge records:
     * TXT Record Name: `_fitcore-challenge.${domain}`
     * TXT Record Value: `fitcore-verification=${token}`
     * CNAME Target: `custom.domains.fitcore.io`
   * Sets `status = 'PENDING_VERIFICATION'` and `sslStatus = 'PENDING'`.

2. **Verification & Activation** (`POST /api/v1/enterprise/domains/:id/verify`):
   * Resolves DNS challenge.
   * Transitions status to `ACTIVE`.
   * Provisions SSL certificate tracking with 90-day expiration schedule (`sslStatus = 'ISSUED'`).

3. **Tenant Routing**:
   * Incoming HTTP requests matching verified custom domains are mapped directly to the owning `organisationId` and optional `brandId`/`outletId`.
