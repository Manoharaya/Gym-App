# MFA Emergency Recovery Codes

## Purpose
Recovery codes provide emergency access to users who lose access to their primary authenticator device.

---

## Security Invariants
1. **Single-Use**: Each code can only be used once. After consumption, it is immediately marked `USED` and cannot be replayed.
2. **Hashed at Rest**: Plaintext codes are displayed to the user exactly ONCE during enrollment or regeneration. At rest in PostgreSQL, they are hashed with `bcryptjs` (cost 10).
3. **Never Logged**: Recovery codes are strictly excluded from all application logs and telemetry.
4. **Regeneration Invalidation**: Generating new recovery codes immediately revokes all previous unused codes.
5. **Format**: Formatted as `XXXX-XXXX` (8 hex digits with a hyphen) for high entropy and easy manual entry.
