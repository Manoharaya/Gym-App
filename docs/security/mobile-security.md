# FitCore Mobile Security Specification & Standards

## 1. Zero Token Storage in Plaintext

- **Strict Prohibition**: Authentication tokens (Access Tokens, Refresh Tokens) must NEVER be saved in `AsyncStorage`, unencrypted files, SQLite databases, Redux/Zustand persisted state, or application logs.
- **Hardware Enclave Storage**: Tokens are managed exclusively via `@fitcore/mobile/src/services/auth/tokenManager.ts`, backed by `expo-secure-store` utilizing:
  - iOS: **Keychain Services** (`kSecAccessControlBiometryAny` or `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`).
  - Android: **Android Keystore system** with AES-256 GCM master key encryption in hardware TEE (Trusted Execution Environment) / StrongBox.

---

## 2. API Authentication & Token Refresh Flow

- Short-lived JWT access tokens (15-minute expiration) paired with secure HTTP rotation refresh tokens.
- Upon receiving a `401 Unauthorized` response, `@fitcore/api-client` intercepts the response, queues pending requests, initiates token rotation via `/auth/refresh`, updates the secure hardware keystore, and replays the original request.
- If the refresh token is invalid or expired, the session is terminated immediately and the user is routed to `AuthNavigator`.

---

## 3. Sensitive Health & Biometric Data Handling

Because FitCore integrates with Apple Health, Android Health Connect, and wearable hardware (Garmin, Whoop, Oura), strict health data privacy standards are enforced:

- **HIPAA & GDPR Compliance Preparedness**: Health data (resting heart rate, ECG, sleep metrics, blood pressure, VO2 max) is treated as Special Category Data.
- **No Local Caching of Raw Medical Telemetry**: Biometric telemetry is streamed directly to encrypted backend endpoints or processed transiently in memory. It is never persisted into unencrypted local cache.
- **Explicit Consent & Revocable Permissions**: Users can grant, inspect, and revoke health telemetry permissions granularly at any time.

---

## 4. Logging Restrictions & Automatic PII Redaction

The centralized logger (`@fitcore/mobile/src/services/logging/logger.ts`) enforces strict data masking:

- **Console Silencing in Production**: All `debug` and `info` logs are completely suppressed in production builds.
- **PII / Secret Masking**: The logger automatically inspects payloads and replaces sensitive values with `[REDACTED]`:
  - Passwords and auth tokens
  - Bearer headers
  - Medical diagnoses and health metric details
  - Payment and credit card numbers
  - Social security / government identifiers

---

## 5. Secrets Management & Client Bundles

- **Rule**: NO private API keys, payment secrets (Stripe Secret Key), AI provider keys (OpenAI / Anthropic API keys), or backend database credentials may be stored or referenced in the mobile application bundle.
- Any environment variable bundled into the mobile app (`EXPO_PUBLIC_*`) is considered public and extractable by decompilation.
- All AI orchestration, payment authorization, and Xero synchronization must execute exclusively on the FitCore backend.

---

## 6. Secure Document & File Uploads

- **Rule**: Never upload documents directly from UI components.
- All uploads (liability waivers, medical clearances, doctor notes, progress photos) follow a presigned URL protocol:
  1. Component requests an upload ticket from `DocumentService.requestPresignedUpload()`.
  2. FitCore API authenticates the user, verifies tenant permissions, and issues a short-lived presigned AWS S3 / Cloud Storage upload URL.
  3. The mobile client transfers the encrypted binary directly to storage over TLS 1.3.
  4. The client finalizes the record via `DocumentService.completeUpload()`.

---

## 7. Future Security Capabilities (Wave 2)

- **Biometric Session Unlock**: Re-authenticating local app sessions using Face ID / Fingerprint without network latency.
- **Hardware Device Binding**: Pairing user sessions to device hardware identifiers to prevent session hijacking.
- **Certificate Pinning**: Enforcing TLS certificate pinning on the FitCore API gateway to mitigate Man-In-The-Middle (MITM) attacks.
