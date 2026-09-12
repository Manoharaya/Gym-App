# Temporary Support Access & Break-Glass Protocol

## Support Access Request Flow
To investigate complex tenant issues without permanent impersonation:
```text
SUPERADMIN
→ SELECT ORGANISATION
→ REQUEST SUPPORT ACCESS (Purpose, Scope, 5-240 min Duration)
→ TICKET LINKING
→ PEER APPROVER / STEP-UP CHALLENGE
→ AUDIT EVENT LOGGED
→ TEMPORARY ACCESS ACTIVE
→ EXPIRATION OR MANUAL REVOCATION
```

## Security Invariants
- **No Permanent Access**: Support grants have a mandatory expiration timestamp (maximum 240 minutes).
- **Purpose Binding**: An explicit business or support reason must be recorded.
- **Peer Approval or Step-Up Verification**: Elevated grants require step-up challenge verification.
- **Revocable**: Can be terminated immediately at any time by platform security or tenant owner.

## Break-Glass Emergency Access
For critical incidents (e.g. system outage, data corruption threat) where regular approval chains are unavailable:
- Triggers a `CRITICAL` severity `SecurityEvent`.
- Requires mandatory step-up challenge consumption (`BREAK_GLASS_ACCESS`).
- Broadcasts real-time security alerts to platform security administrators.
- Strictly time-limited and subject to automated post-mortem auditing.
