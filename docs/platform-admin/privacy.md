# Privacy Boundary & Data Protection Invariants

## Strict Privacy Boundary
Superadmins and platform operators do **not** receive unrestricted access to member personal or health information.

### Redacted by Default
- PAR-Q health questionnaire responses.
- Medical clearance certificates and doctor notes.
- Raw wearable sensor data (ECG, continuous heart rate, sleep stages).
- Confidential trainer notes and personal goals.
- AI private conversational context.
- Payment credentials (credit card numbers, bank account numbers).

### What Platform Operators Inspect
- Aggregate metrics and volume counts.
- Anonymized request identifiers and error codes.
- Processing job statuses (e.g. Export job completed, Deletion plan pending).
- Integration connector sync metadata.
- System telemetry and latency logs.
