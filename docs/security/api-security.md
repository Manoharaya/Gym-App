# Developer Platform API Security

## Integration with Day 49
Day 52 security hardening builds directly on Day 49 Developer Platform security foundations.

---

## Hardening Invariants
1. **Key Hashing**: API keys (`fc_live_...`, `fc_test_...`) are SHA-256 hashed at rest; only prefixes are returned in administrative responses.
2. **Abuse Detection**: Bursts of invalid key submissions trigger rate-limiting and security events.
3. **Scope Enforcement**: API tokens cannot exceed granted scopes; scope escalation attempts are strictly rejected.
4. **Tenant Isolation**: Developer apps cannot cross tenant boundaries without explicit enterprise permission grants.
