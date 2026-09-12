# Security Incident & Ransomware Recovery Guide

## 1. Compromise Containment Protocol (Day 52 Integration)

If an outage is classified as a security compromise, malware infection, or ransomware event:

```text
CONTAIN ──► REVOKE ──► ROTATE ──► RESTORE ──► VALIDATE ──► MONITOR ──► COMMUNICATE
```

1. **Sever Ingress & Egress**:
   - Detach compromised compute nodes from VPC security groups.
2. **Credential Revocation**:
   - Revoke all current IAM credentials, database passwords, and JWT signing secrets.
   - Mark active user sessions as `COMPROMISED`.
3. **Restore from Clean, Immutable Snapshot**:
   - Restore database from a known-good backup taken *before* the intrusion vector occurred (relying on immutable S3 Object Lock).
4. **Binary Integrity Check**:
   - Redeploy fresh container images from verified Git commit SHAs; never boot untrusted images.
5. **Post-Recovery Audit**:
   - Audit MFA secrets, step-up authentication challenges, and superadmin activity logs.
