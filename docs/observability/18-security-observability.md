# 18 — Security Observability

## Correlation with Day 52 Security Engine
The observability layer feeds security events to the SIEM and alerts operators on abnormal operational security patterns:
- **Authentication Anomalies**: Spike in `401 Unauthorized` or failed MFA challenges across IP subnets.
- **Tenant Enumeration Probes**: Rapid sequence of `403 Forbidden` errors indicating potential path traversal or IDOR attempts.
- **Break-Glass Invocations**: Immediate `CRITICAL` observability alert emitted whenever a superadmin exercises emergency break-glass tenant access.
- **Rate Limit Tripping**: Frequent HTTP `429 Too Many Requests` logged to detect scraping or denial-of-service attempts.
