# Accounting OAuth 2.0 & Token Security

## 1. OAuth Handshake Flow

```text
Staff (Organisation Owner / Finance)
        │ 1. POST /api/v1/accounting/connect { provider: 'XERO' }
        ▼
AccountingController
        │ 2. Generate cryptographically random state token (32 bytes)
        │ 3. Store state in Redis/Memory with TTL: 10 mins bound to { organisationId, userId }
        │ 4. Build authorization URL with redirect_uri, scope, state, and PKCE challenge
        ▼
Browser Redirects to Provider (Xero / Intuit)
        │ Staff authenticates & grants access
        ▼
Provider Redirects to FitCore Callback
        │ GET /api/v1/accounting/oauth/callback?code=...&state=...
        ▼
AccountingController
        │ 1. Validate state token (must exist, match tenant/user, and be consumed once)
        │ 2. Delete state token immediately (single-use CSRF defense)
        │ 3. Exchange code for access_token & refresh_token
        │ 4. Encrypt tokens using AES-256-GCM
        │ 5. Save/Update AccountingConnection record
        ▼
Connection Marked CONNECTED
```

---

## 2. Encryption at Rest (AES-256-GCM)

- Tokens are encrypted at rest using `AccountingCredentialService`.
- Standard: AES-256-GCM with a unique 16-byte random IV per encryption operation.
- Storage format: `ivHex:authTagHex:ciphertextHex`.
- Master key derived via SHA-256 from environment variables (`ACCOUNTING_ENCRYPTION_KEY`, fallback to `JWT_SECRET`).
- Plaintext tokens are **never** returned in API responses, never logged, and never stored in client-side state.

---

## 3. Token Rotation & Refresh Policy

1. Tokens are verified before any background sync job or API interaction.
2. If `tokenExpiresAt` is within 5 minutes of current time:
   - `AccountingCredentialService.getValidAccessToken()` automatically requests a new token pair using the encrypted refresh token.
   - Updates `encryptedAccessToken`, `encryptedRefreshToken`, and `tokenExpiresAt` in a single transaction.
3. If refresh fails due to revocation (`invalid_grant`), the connection status transitions immediately to `AUTHENTICATION_REQUIRED`.
