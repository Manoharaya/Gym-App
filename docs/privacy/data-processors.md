# Third-Party Data Processors Registry

FitCore maintains a cataloged registry of verified third-party data processors across all operational domains.

## Registered Sub-Processors

| Provider | Category | Purpose | Categories Handled | Data Region |
| :--- | :--- | :--- | :--- | :--- |
| **Anthropic / OpenAI** | `AI_PROVIDER` | AI conversational coaching & workout generation | AI_INTERACTION, PROFILE, TRAINING | US-EAST / EU-CENTRAL |
| **Stripe** | `PAYMENT_PROVIDER` | PCI-DSS Level 1 subscription recurring billing | PAYMENT, FINANCIAL, CONTACT | GLOBAL / REGIONAL_VAULT |
| **Twilio & SendGrid** | `COMMUNICATION_PROVIDER`| Transactional emails, SMS & MFA alerts | COMMUNICATION, CONTACT | US-WEST / AU-SOUTHEAST |
| **Apple & Google** | `WEARABLE_PROVIDER` | Biometric telemetry import | WEARABLE, HEALTH | LOCAL_DEVICE_SYNC |
| **Xero** | `ACCOUNTING_PROVIDER`| General ledger & tax reconciliation | FINANCIAL, PAYMENT | AUSTRALIA / UK |
| **AWS S3** | `CLOUD_STORAGE` | AES-256 encrypted documents & export archives | DOCUMENT, MEDICAL_DOCUMENT | AU-SOUTHEAST-2 (SYDNEY) |
