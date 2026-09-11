# Credential Security & Secret Hygiene Architecture

## Overview

The FitCore Integrations Platform implements strict cryptographic defenses to protect sensitive third-party credentials, including OAuth access/refresh tokens, API keys, webhook signing secrets, and hardware device tokens.

---

## 1. Zero-Exposure Security Invariants

The platform enforces 8 strict rules across all integration services:

1. **Authenticated Encryption at Rest**: All credentials must be encrypted using AES-256-GCM before database insertion.
2. **Never Return Secrets to Frontend**: REST DTOs (`IntegrationConnectionDto`) strictly omit `encryptedCredentials`, exposing only a boolean `hasCredentials: true`.
3. **Never Log Secrets**: Application loggers and Winston formatters filter and redact secret fields (`apiKey`, `clientSecret`, `token`, `password`, `auth`).
4. **Never Include Credentials in AI Context**: AI assistants and LLM prompts are completely barred from accessing raw or encrypted credential fields.
5. **Never Expose Credentials in Debugging Endpoints**: Debug/telemetry outputs display only sanitized metadata.
6. **Single-Use State Tokens**: OAuth authorization flows use cryptographically random, tenant-bound, single-use state tokens with a strict 10-minute TTL.
7. **Secure Credential Wiping**: Disconnecting or revoking an integration permanently overwrites and nullifies credential columns in PostgreSQL.
8. **Isolated Key Derivation**: The master encryption key is derived via SHA-256 from environment configuration (`INTEGRATION_ENCRYPTION_KEY`), ensuring 256-bit entropy.

---

## 2. AES-256-GCM Cryptographic Payload Structure

When a credential object is encrypted by `IntegrationCredentialService`, it produces a 3-part hex-encoded serialization:

$$\text{iv} : \text{authTag} : \text{ciphertext}$$

```text
32-hex-iv : 32-hex-authTag : hex-encrypted-ciphertext
```

### Encryption Process
1. Generate cryptographically strong 16-byte Initialization Vector (IV) via `crypto.randomBytes(16)`.
2. Initialize AES-256-GCM cipher with master key and random IV.
3. Encrypt stringified JSON payload.
4. Extract 16-byte authentication tag (`cipher.getAuthTag()`) for tamper-proofing.
5. Concatenate `iv:authTag:ciphertext`.

### Decryption & Authenticity Verification
1. Split payload into `iv`, `authTag`, and `ciphertext`.
2. Initialize decipher with key and IV.
3. Set authentication tag (`decipher.setAuthTag(authTag)`).
4. Decrypt and verify message integrity. If any byte was altered, decipher throws an authenticated decryption error.

---

## 3. Credential Lifecycle on Disconnect

When a user calls `POST /api/v1/integrations/connections/:id/disconnect`:
- The connection status is transitioned to `DISCONNECTED`.
- The `encryptedCredentials` column is set to `null` immediately.
- A security audit record `INTEGRATION_DISCONNECTED` is emitted without sensitive payload data.
