# Anonymization Architecture

## 1. Requirements & Guarantees
The `AnonymizationService` applies irreversible cryptographic pseudonymization to personal records:
- **Direct Identifiers**: Name is replaced with `"Anonymized Member"`. Email is replaced with an HMAC-SHA256 pseudonym hash (`anonymized_<hash>@privacy.fitcore.local`).
- **Contact Channels**: Phone number, emergency contact names, emergency numbers, and avatar photos are stripped to `null`.
- **Preservation of Aggregate Metrics**: The member's outlet assignment, attendance frequency totals, and membership tenure remain available for macroeconomic business intelligence without re-identifiability.
