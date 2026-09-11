# Security & Privacy Principles

## Operational Boundaries
- **Telemetry Boundaries**: Security logs contain IP addresses, device identifiers, and timestamps for threat defense. They are treated as sensitive operational telemetry.
- **Strict Exclusion**: Passwords, raw tokens, MFA secrets, recovery codes, payment credentials, and biometric/health data are strictly forbidden in security logs.
- **Day 53 Privacy Hooks**: Retention and purge policies prepare the system for the Day 53 Privacy & Compliance Center without deleting active incident investigations prematurely.
- **AI Access Restriction**: AI engines (Fitness Coach, Nutrition Coach, Receptionist, Sales Agent) have **zero access** to security event telemetry or administrative credentials.
