# RFC 6238 TOTP Implementation

## Standards Compliance
FitCore's TOTP implementation complies strictly with:
- **RFC 6238**: Time-Based One-Time Password Algorithm
- **RFC 4226**: HMAC-Based One-Time Password Algorithm
- **RFC 4648**: Base32 Alphabet Encoding

---

## Technical Specifications
- **Secret Size**: 20 bytes (160 bits) random bytes, Base32 encoded.
- **Hash Function**: HMAC-SHA1.
- **Time Step**: 30 seconds (`Math.floor(Date.now() / 1000 / 30)`).
- **Code Length**: 6 decimal digits.
- **Clock Drift Window**: ±1 step (allows ±30 seconds clock drift between server and client device).
- **Storage Encryption**: Authenticated AES-256-GCM (`iv:authTag:ciphertext`).
- **Timing Defense**: Comparison using `crypto.timingSafeEqual`.
