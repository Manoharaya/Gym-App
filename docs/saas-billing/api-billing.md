# Developer API Billing

Integration with Day 49 Developer Platform.

## Metering Public APIs
- Meter: `API_REQUEST`.
- Authoritative source: `DeveloperApiUsage` database records.
- Internal health checks, unauthenticated 401 calls, and rate-limited 429 requests are excluded from commercial customer metering unless specified by plan policy.
