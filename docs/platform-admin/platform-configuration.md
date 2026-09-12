# Platform Configuration & Scoped Maintenance Mode

## Architecture
Non-security platform settings are centrally managed via `PlatformConfiguration`. Configurations are versioned, cached in Redis, validated against schemas, and audited on mutation.

## Configuration Domains
- **AI Defaults**: Default temperature, model fallback order, token ceilings.
- **Communication Defaults**: Default sender emails, SMS route priorities.
- **Internationalization**: Supported locales and platform currency definitions.
- **Limits**: Default outlet allowances, rate-limiting thresholds.
- **Notices**: System-wide service announcements.

## Scoped Maintenance Mode
Maintenance mode can be activated at distinct granularities:
- `PLATFORM`: Universal platform maintenance.
- `ORGANISATION`: Targeted maintenance for single gym chain.
- `OUTLET`: Branch maintenance (e.g. club refurbishment).
- `FEATURE`: Specific feature maintenance (e.g. AI workouts or Door sync).

### Safety Invariants During Maintenance
Maintenance mode **never** disables:
1. Superadmin authentication and operator access.
2. Emergency support access.
3. Security alerting and telemetry.
4. Tamper-evident audit logging.
5. In-flight billing webhooks and payment confirmations.
