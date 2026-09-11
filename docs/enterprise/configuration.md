# Enterprise Centralized Configuration

## 1. Overview
`EnterpriseConfiguration` provides centralized, type-safe, scoped key-value configuration for enterprise parameters that do not require full policy versioning.

## 2. Categories
* `SECURITY`: Session timeout windows, password reset intervals, IP whitelists.
* `COMPLIANCE`: GDPR/Privacy Act retention periods, consent renewal triggers.
* `BILLING`: Currency conversion buffers, automated debt recovery cadence.
* `INTEGRATION`: Platform sync frequencies, default webhook retry counts.
* `AI`: Global token budget caps, default provider routing priority.
* `BRANDING`: Corporate brand asset URLs, default favicon references.

## 3. Endpoints
* `GET /api/v1/enterprise/config`: List configurations with category and scope filters.
* `POST /api/v1/enterprise/config`: Upsert configuration key-value pair with audit logging.
