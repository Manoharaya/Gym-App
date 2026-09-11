# OAuth 2.0 Security Foundations

## Security Protections
- **Mandatory PKCE**: Code challenges with SHA-256 (`S256`) are strictly enforced.
- **Strict Redirect URI Matching**: Exact match required; no wildcard or unvalidated protocol schemes.
- **Authorization Code Single-Use**: Authorization codes expire within 10 minutes and can only be consumed once.
- **Token Rotation**: OAuth refresh tokens rotate on consumption; reuse triggers token revocation.
- **Telemetry**: Suspicious OAuth activity emits `OAUTH_AUTHORIZATION` or `OAUTH_TOKEN_REVOKED` events.
