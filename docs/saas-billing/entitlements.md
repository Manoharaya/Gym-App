# Entitlements & Usage Limits

FitCore features and quotas are governed by the Entitlements Engine.

## Defined Entitlements
- `OUTLET_LIMIT`: Maximum active gym physical branches.
- `MEMBER_LIMIT`: Maximum active registered member profiles.
- `STAFF_LIMIT`: Maximum active trainers and managers.
- `AI_TOKEN_LIMIT`: Included generative AI tokens (Day 19 LLM Gateway).
- `VOICE_MINUTE_LIMIT`: Included telephony minutes (Day 34 AI Receptionist).
- `SMS_LIMIT`: Included transactional/marketing SMS (Day 28).
- `API_REQUEST_LIMIT`: Included developer public API requests (Day 49).
- `DEVELOPER_APP_LIMIT`: Included developer OAuth applications.

## Evaluation Semantics
```
checkLimit(organisationId, entitlementCode, quantity)
  ↓
Does subscription exist?
  No → PLAN_REQUIRED (Fail closed)
  Yes ↓
Is usage within included allowance?
  Yes → ALLOWED (or WARNING if >= 80% soft limit)
  No ↓
Is overage allowed on this plan?
  Yes → OVERAGE_ALLOWED (Track overage charge)
  No → LIMIT_REACHED (Block resource creation)
```
