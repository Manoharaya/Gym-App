# Data Retention Policy Engine

## 1. Policy Structure
Retention policies are configured per `PrivacyDataCategory` at the organisation level:
- `dataCategory`: Category identifier (e.g., `HEALTH`, `WEARABLE`, `FINANCIAL`, `COMMUNICATION`, `AI_INTERACTION`).
- `retentionPeriodDays`: Time-to-live in days.
- `action`: `DELETE`, `ANONYMIZE`, `ARCHIVE`, `RESTRICT`, `REVIEW`.
- `enabled`: Toggle status.

## 2. Background Processor Flow
$$\text{DISCOVER} \longrightarrow \text{CHECK POLICY} \longrightarrow \text{CHECK LEGAL HOLD} \longrightarrow \text{CHECK ACTIVE DEPENDENCY} \longrightarrow \text{EXECUTE ACTION} \longrightarrow \text{AUDIT}$$

### Fail-Closed Principle
If an ambiguous state is detected (e.g. active legal dispute or unclear member status), the processor defaults to **`REVIEW_REQUIRED`** and halts automated destruction.
