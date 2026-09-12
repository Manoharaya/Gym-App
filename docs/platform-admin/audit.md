# Platform Audit Logging Architecture

## Immutability & Structure
Every platform-level action creates an immutable `AuditLog` entry. Metadata is strictly sanitized before persistence to eliminate password hashes, MFA codes, session tokens, or payment credentials.

## Standard Audit Schema
```typescript
interface PlatformAuditEntry {
  id: string;
  userId: string;
  organisationId?: string;
  outletId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  requestId: string;
  createdAt: Date;
}
```

## Key Platform Audit Actions
- `ORGANISATION_ACTIVATED`
- `ORGANISATION_SUSPENDED`
- `ORGANISATION_REACTIVATED`
- `ORGANISATION_ARCHIVED`
- `FEATURE_FLAG_CREATED`
- `FEATURE_FLAG_UPDATED`
- `FEATURE_FLAG_ASSIGNMENT_CREATED`
- `FEATURE_FLAG_ASSIGNMENT_REMOVED`
- `PLATFORM_CONFIGURATION_CHANGED`
- `MAINTENANCE_MODE_ENABLED`
- `MAINTENANCE_MODE_DISABLED`
- `SUPPORT_TICKET_CREATED`
- `SUPPORT_TICKET_UPDATED`
- `SUPPORT_TICKET_ASSIGNED`
- `SUPPORT_TICKET_MESSAGE_ADDED`
- `SUPPORT_ACCESS_REQUESTED`
- `SUPPORT_ACCESS_GRANTED`
- `SUPPORT_ACCESS_REVOKED`
- `BREAK_GLASS_ACCESS_GRANTED`
- `PLATFORM_INCIDENT_CREATED`
- `PLATFORM_INCIDENT_UPDATED`
- `PLATFORM_ANNOUNCEMENT_CREATED`
