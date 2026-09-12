# Plans & Plan Versioning

FitCore SaaS plans are data-driven, configurable, and strictly versioned.

## Plan Attributes
- `code`: Unique immutable identifier (`STARTER`, `GROWTH`, `PRO`, `ENTERPRISE`).
- `name`: Display name.
- `basePriceMinor`: Base fee in minor units (e.g. 19900 = $199.00 AUD).
- `currency`: ISO currency code (`AUD`, `USD`, etc.).
- `billingInterval`: `MONTHLY`, `QUARTERLY`, `SEMI_ANNUALLY`, `ANNUALLY`, `CUSTOM`.
- `status`: `DRAFT`, `ACTIVE`, `ARCHIVED`, `RETIRED`.
- `visibility`: `PUBLIC`, `PRIVATE`, `INVITE_ONLY`.

## Versioning Model
When plan parameters change (e.g., price increase from $199 to $249), a new `SaasPlanVersion` is generated:
1. Historical subscriptions preserve the pricing and entitlement version under which they were created.
2. Existing gym subscriptions are never silently mutated.
3. Once published, plan versions are strictly immutable.
