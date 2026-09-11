# FitCore API Versioning Policy & Lifecycle

## 1. Versioning Architecture
FitCore implements **URL Path-Based Major Versioning** combined with **Lifecycle Deprecation Headers**:

```text
https://api.fitcore.com/api/v1/public/...
```

### Version Identification:
- All current stable public endpoints reside under the `/api/v1/` prefix.
- Minor, non-breaking enhancements (adding non-required request fields, adding new response fields, new endpoints) are introduced directly into `/api/v1/` without bumping the major version.
- Breaking changes (field removal, schema alterations, behavior reversals) require a new major version path (e.g. `/api/v2/`).

## 2. Version Lifecycle States
Every API version progresses through four formal lifecycle phases:
1. **`ALPHA`**: Experimental release for select partner validation. Subject to change.
2. **`BETA`**: Feature-complete preview. Developers are encouraged to build against sandbox.
3. **`ACTIVE`**: Production-ready, fully supported standard API. SLA-backed.
4. **`DEPRECATED`**: Scheduled for retirement with an announced sunset date. Minimum 6-month support window.
5. **`SUNSET`**: Fully decommissioned. Returns HTTP 410 Gone.

## 3. Deprecation Headers
When communicating with an endpoint nearing end-of-life, the FitCore API emits standard deprecation headers:
- `Deprecation`: RFC 8594 timestamp representing the date the version was deprecated.
- `Sunset`: RFC 8594 timestamp representing the date the version will be permanently shut down.
- `Link`: URI link to the migration guide.
