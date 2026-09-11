# Consent Management Architecture

## 1. Day 4 Foundation Reuse
FitCore reuses and extends the Day 4 Consent Architecture (`ConsentType`, `ConsentVersion`, `ConsentRecord`). No secondary consent table was created.

## 2. Invariant: Immutable Historical Evidence
Consent evidence is never overwritten or destroyed:
- When a member grants consent, a `ConsentRecord` is created with status `CONSENTED`, recording `consentedAt`, policy version ID, IP address, and user agent.
- When consent is withdrawn, a new `ConsentRecord` is appended with status `WITHDRAWN`, recording `withdrawnAt`, actor user ID, and withdrawal reason.
- Historical consent records are classified as `INTERNAL` with an indefinite retention period for legal liability and defense.

## 3. Pre-Withdrawal Impact Evaluation
Before withdrawing consent, members receive clear, non-technical explanations of functional consequences:
- **Wearable Data**: Future biometric synchronization halts immediately. Historical data is preserved per organizational retention policy unless explicit deletion is initiated.
- **Health Data**: AI coaches and personal trainers will no longer reference injuries or medical clearances when generating exercise plans.
- **AI Processing**: AI coaching operates in generic mode without accessing past workout logs or goal history.

## 4. Policy Versioning & Reconsent
When an updated `ConsentVersion` is published with `requiresReconsent = true`, member status is evaluated as requiring re-acknowledgment upon their next session.
