# Legal & Operational Retention Holds

## 1. Overview
The `PrivacyRetentionHold` model allows authorized compliance staff or organisation owners to place temporary or permanent legal/operational holds on specific data categories or specific member records.

## 2. Invariants
- **Holds block all automated deletions**: While a hold is `ACTIVE`, scheduled retention jobs will refuse to delete or purge affected datasets.
- **Holds flag deletion requests for review**: If a member requests account deletion while subject to an active hold, the deletion plan transitions to `REVIEW_REQUIRED` rather than executing automatically.
- **Auditability**: Every hold creation, release, and expiration is logged with the user ID of the compliance officer.
