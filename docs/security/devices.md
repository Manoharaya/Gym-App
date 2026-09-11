# Device Fingerprinting & Trust Architecture

## Overview
Every client authentication registers or updates a `UserDevice` record linked to the user account.

---

## Device Fingerprint
- Fingerprint hash: SHA-256 hash of `userId::userAgent::platform`.
- User devices are categorized with status: `NEW`, `TRUSTED`, `BLOCKED`, `REVOKED`.

---

## The Device Trust Boundary
> [!IMPORTANT]
> **Device trust is an enhancement to risk scoring, NEVER a replacement for primary credentials or required MFA.**
> When enterprise policy mandates MFA (`REQUIRED_FOR_ADMIN` or `REQUIRED_FOR_ALL`), a trusted device **must still supply a valid MFA code**. Device trust is not equivalent to authentication.
