# FitCore — Security Incident Response Plan (SIRP)

## 1. Purpose & Scope
This plan defines the operational protocol for identifying, containing, eradicating, and recovering from security incidents affecting the FitCore platform, our gym tenant organisations, and their end-user members.

---

## 2. Incident Severity Classifications

| Severity | Description | Target Triage Time | Target Containment Time | Escalation Path |
| :--- | :--- | :---: | :---: | :--- |
| **P1 - CRITICAL** | Active tenant isolation breach, compromised production secrets, remote code execution, mass ransomware, unauthorized database dump. | < 15 minutes | < 1 hour | Executive Leadership, Platform Superadmins, Legal, Incident Commander |
| **P2 - HIGH** | Exploitable IDOR exposing member PII, broken MFA bypass, unmitigated SSRF to internal services, active DDoS impacting core services. | < 30 minutes | < 4 hours | Lead Security Engineer, Platform Superadmins, DevOps On-Call |
| **P3 - MEDIUM** | Limited permission escalation, rate-limit evasion, non-exploitable error disclosure, low-impact dependency vulnerability. | < 2 hours | < 24 hours | Security Engineering Team, On-Call Dev |
| **P4 - LOW** | Minor misconfiguration, informative security header omission without direct exploitability, minor audit log inconsistency. | < 24 hours | Scheduled Sprint | Assigned Developer |

---

## 3. Incident Lifecycle Phases

```
┌────────────────────────────────────────────────────────┐
│ 1. IDENTIFY & TRIAGE                                  │
│ - SecurityAlertService / Observability alerts          │
│ - Assess scope, tenant impact, and assign severity     │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ 2. CONTAINMENT (Short-Term & Long-Term)                │
│ - Revoke compromised token families / sessions         │
│ - Apply IP blocks via IpRestrictionService             │
│ - Rotate affected API keys / Webhook secrets           │
│ - If necessary, isolate affected tenant or outlet      │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ 3. ERADICATION                                         │
│ - Patch underlying software vulnerability              │
│ - Invalidate active attacker access vectors            │
│ - Verify database integrity via DataIntegrityValidator │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ 4. RECOVERY & RESTORATION                              │
│ - Verify system health via ObservabilityHealthService   │
│ - Re-enable normal operational traffic                 │
│ - Continuous monitoring for re-infection               │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ 5. POST-INCIDENT REVIEW (PIR)                          │
│ - Document timeline, root cause, and remediation       │
│ - Add automated regression test to penetration suite   │
│ - Update Threat Model and Security Test Matrix         │
└────────────────────────────────────────────────────────┘
```

---

## 4. Emergency Credential & Secret Revocation Runbook
1. **Compromised User Session / Token**:
   - Call `POST /api/v1/security/sessions/revoke-all` with `userId` to instantly invalidate all active JWT refresh token families and Redis session keys.
2. **Compromised Developer API Key**:
   - Call `DELETE /api/v1/developer/keys/:keyId` to delete the key hash and purge cache.
3. **Compromised External Provider Credential (e.g. Stripe / SendGrid)**:
   - Rotate secret in external provider dashboard.
   - Update AWS Secrets Manager / environment configuration.
   - Trigger zero-downtime rolling restart of NestJS API instances.
   - Verify provider health via `/api/v1/observability/providers/health`.
