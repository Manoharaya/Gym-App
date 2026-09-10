# Voice Privacy & Member Verification Policy — Day 34

## Strict Boundary: Phone Number ≠ Authentication

Caller phone number alone does **NOT** authenticate a member.
A phone number match transitions caller state from `UNKNOWN_CALLER` to `KNOWN_CONTACT` (Unverified).

### Caller Identity States
1. `UNKNOWN_CALLER`: Caller phone not recognized in database or caller is anonymous.
2. `KNOWN_CONTACT`: Phone matches a Member or Lead record, but identity is unverified.
3. `VERIFIED_MEMBER`: Caller has successfully passed an explicit identity verification challenge (OTP / security code).
4. `VERIFIED_LEAD`: Caller matches verified prospect record.

## Data Disclosure Boundaries

The following sensitive data categories are **STRICTLY FORBIDDEN** from voice disclosure:
- PAR-Q assessment data
- Medical conditions, injuries, and rehabilitation notes
- Payment card numbers, CVV, or bank credentials
- Internal trainer notes and retention risk scores
- Staff-only admin notes

Even for `VERIFIED_MEMBER` callers, only relevant operational details (membership status, booking confirmations, class schedules) may be read aloud.
