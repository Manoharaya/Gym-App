# Multi-Factor Authentication (MFA)

## Overview
Multi-Factor Authentication adds an indispensable layer of account defense to FitCore. Users authenticate using something they know (password) and something they possess (an authenticator app or single-use recovery code).

---

## Supported Methods
- **TOTP (Time-based One-Time Password)**: RFC 6238 compliant using standard Node.js crypto.
- **Email OTP**: Time-bound 6-digit numeric codes sent via verified email.
- **Recovery Codes**: 10 cryptographically generated single-use emergency codes.
- **Future Extensibility**: WebAuthn, Passkeys, and SMS OTP interfaces.

---

## Enrollment Flow
```text
User selects "Enable Two-Factor Auth"
       ↓
Server generates 160-bit Base32 secret
       ↓
Server generates 10 single-use recovery codes (hashed with bcrypt)
       ↓
Secret encrypted at rest using AES-256-GCM
       ↓
Client displays key and otpauth:// URI
       ↓
User enters 6-digit code from authenticator
       ↓
Server validates code within clock skew tolerance (±30s)
       ↓
MFA method status set to ACTIVE
       ↓
SecurityEvent 'MFA_ENABLED' logged
```

---

## Brute-Force & Attempt Protection
- Maximum 5 failed verification attempts allowed.
- Exceeding limit triggers an automatic 15-minute verification lockout.
- All failed verification attempts emit `MFA_FAILURE` security events.
