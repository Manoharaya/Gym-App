# 20 — Deployment Tracking & Release Correlation

## Rationale
Over 80% of platform production incidents correlate directly with new code deployments or configuration changes. `ObservabilityDeployment` logs releases to provide immediate context during anomaly triage.

## Deployment Entity Schema
```typescript
model ObservabilityDeployment {
  id          String   @id @default(cuid())
  version     String   // E.g. 'v1.14.2'
  commitHash  String   // Git 40-char SHA
  deployedBy  String   // CI/CD service account or engineer ID
  environment String   // 'production', 'staging'
  changelog   String?  // Release summary
  deployedAt  DateTime @default(now())
}
```

## Anomaly Correlation
When an alert or incident triggers, the timeline viewer displays:
- Releases within preceding 2 hours.
- Commit author and commit message.
- Direct rollback trigger command if error rate surged immediately post-release.
