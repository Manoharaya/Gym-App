# 07 — Alerting and Thresholds

## Deterministic Alert Engine
The alert engine evaluates defined metric conditions (`ObservabilityAlertRule`) without generating alert floods:

### Rule Specification
```typescript
interface AlertRule {
  name: string;
  service: string;
  metricName: string;
  condition: 'GREATER_THAN' | 'LESS_THAN' | 'EQUALS';
  threshold: number;
  durationMinutes: number;
  severity: 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL';
  cooldownMinutes: number;
}
```

### Fingerprint Deduplication
When a threshold is breached, the engine computes a deterministic SHA-256 fingerprint:
```typescript
const rawFingerprint = `${rule.id}:${rule.service}:${rule.severity}:${tenantId || 'global'}`;
const fingerprint = crypto.createHash('sha256').update(rawFingerprint).digest('hex');
```
If an active alert already exists with the same fingerprint and is not resolved, the existing alert's `breachCount` is incremented without creating a redundant alert record or triggering repeated notifications.

### Cooldown Logic
If an alert fired recently, subsequent triggers within the `cooldownMinutes` window are suppressed to prevent thrashing while engineers actively investigate.
