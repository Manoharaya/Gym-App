# FitCore OAuth 2.0 & PKCE Guide

## 1. Overview
FitCore provides an OAuth 2.0 compliant authorization framework with Proof Key for Code Exchange (PKCE, RFC 7636). This enables secure user-authorized third-party integrations, mobile applications, and single-page applications without ever exposing FitCore user passwords or master credentials.

## 2. Authorization Flow
```text
Client App               FitCore OAuth Server             Gym Admin / User
    │                              │                             │
    ├─ 1. /oauth/authorize ────────┼────────────────────────────>│
    │   (client_id, redirect_uri,  │                             │ (Reviews Scopes
    │    code_challenge, scopes)   │                             │  and Grants Consent)
    │                              │<── User approves consent ───┤
    │<─ 2. Redirect with code ─────┤                             │
    │                              │                             │
    ├─ 3. POST /oauth/token ───────┤                             │
    │   (code, code_verifier,      │                             │
    │    client_id, client_secret) │                             │
    │                              │                             │
    │<─ 4. Access + Refresh Token ─┤                             │
```

### Authorization Request (`GET /api/v1/oauth/authorize`)
Parameters:
- `client_id`: Registered Client ID of your Developer Application.
- `redirect_uri`: Pre-registered HTTPS callback URL.
- `response_type`: Must be `code`.
- `scope`: Space-separated list of scopes (e.g. `members:read bookings:write`).
- `code_challenge`: Base64URL-encoded SHA-256 hash of the `code_verifier`.
- `code_challenge_method`: Must be `S256`.
- `state`: Recommended anti-CSRF random string.

### Token Exchange (`POST /api/v1/oauth/token`)
Payload (`application/json`):
```json
{
  "grant_type": "authorization_code",
  "client_id": "fc_app_abc123",
  "client_secret": "fc_sec_xyz789",
  "code": "fc_auth_code_987",
  "redirect_uri": "https://partner.com/callback",
  "code_verifier": "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
}
```

Response:
```json
{
  "access_token": "fc_acc_0123456789abcdef...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "fc_ref_fedcba9876543210...",
  "scope": "members:read bookings:write"
}
```

## 3. Token Refresh & Rotation
When the access token expires (1 hour), exchange the refresh token for a new token pair:
```json
{
  "grant_type": "refresh_token",
  "client_id": "fc_app_abc123",
  "client_secret": "fc_sec_xyz789",
  "refresh_token": "fc_ref_fedcba9876543210..."
}
```
> **Security Note**: Every refresh rotates the refresh token. Old refresh tokens are invalidated immediately.

## 4. Token Revocation (`POST /api/v1/oauth/revoke`)
To immediately terminate a token session:
```json
{
  "client_id": "fc_app_abc123",
  "token": "fc_acc_0123456789abcdef..."
}
```
