# FitCore Developer Authentication

FitCore supports two primary authentication schemes for developer and external integration applications:

1. **API Keys** (Server-to-Server, Background Jobs, Hardware Controllers)
2. **OAuth 2.0 with PKCE** (User-interactive Mobile Apps, Single Page Apps, Third-party Portals)

---

## 1. API Key Authentication

Include your API key either in the `X-Api-Key` header or as a `Bearer` token in the standard `Authorization` header:

```http
X-Api-Key: fc_live_xxxxxxxxxxxxxxxxxxxxxxxx
```

or:

```http
Authorization: Bearer fc_live_xxxxxxxxxxxxxxxxxxxxxxxx
```

### Key Prefixing
* **Production**: `fc_live_<48-character hex string>`
* **Sandbox**: `fc_test_<48-character hex string>`

FitCore only stores a cryptographic SHA-256 hash of the API key in the database. The raw key is returned exactly once upon creation.

---

## 2. OAuth 2.0 with PKCE

For public clients (native apps, web portals), FitCore implements the RFC 7636 Authorization Code Flow with Proof Key for Code Exchange (PKCE).

```text
CLIENT APP                                  FITCORE AUTH SERVER
    |                                                |
    |---- 1. /oauth/authorize (code_challenge) ----->|
    |                                                |
    |<--- 2. Redirect with auth code ----------------|
    |                                                |
    |---- 3. /oauth/token (code_verifier) ---------->|
    |                                                |
    |<--- 4. Access Token + Refresh Token -----------|
```

Authorization codes:
* Lifetime: 10 minutes
* Single-use (replay attempts are rejected with `INVALID_GRANT`)
* Cryptographically bound to client ID, redirect URI, and S256 code challenge.

Access tokens:
* Format: `fc_tok_xxxxxxxxxxxxxxxxxxxxxxxx`
* Lifetime: 1 hour
* Scoped strictly to approved scopes during user consent.
