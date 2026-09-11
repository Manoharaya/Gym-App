# Security Alerts & Incident Correlation

## Alert Lifecycle
Security alerts track potential compromise situations:
```text
OPEN → ACKNOWLEDGED → INVESTIGATING → RESOLVED / DISMISSED
```

---

## Alert Triggers
1. `TOKEN_REUSE_COMPROMISE`: Replaying an already invalidated refresh token.
2. `EXCESSIVE_FAILED_AUTHENTICATION`: Sustained failed login attempts targeting an account.
3. `SUSPICIOUS_ADMINISTRATIVE_ACTION`: Unauthorized attempts to alter security policies or IP rules.
4. `IP_POLICY_VIOLATION`: High volumes of blocked requests originating from prohibited CIDR ranges.

---

## Workflow Actions
- **Acknowledge**: Assigns the alert to an administrator for triage.
- **Investigate**: Correlates sessions, devices, and user history.
- **Resolve**: Marks alert as resolved with mandatory resolution notes.
