# Asynchronous Data Export Engine

## 1. Export Flow
$$\text{REQUEST} \longrightarrow \text{VERIFY} \longrightarrow \text{AUTHORIZE} \longrightarrow \text{COLLECT} \longrightarrow \text{CLASSIFY} \longrightarrow \text{SERIALIZE} \longrightarrow \text{PACKAGE} \longrightarrow \text{ENCRYPT} \longrightarrow \text{STORE} \longrightarrow \text{DOWNLOAD} \longrightarrow \text{AUDIT}$$

Exports are generated asynchronously in a background job to prevent blocking HTTP workers on large accounts.

## 2. Formats
- **JSON (Canonical Machine-Readable)**: Complete nested export across all cataloged domains.
- **CSV**: Tabular summaries of workouts, food logs, and attendance records.
- **PDF Summary**: Clean visual overview designed for readability.

## 3. Cryptographic Protection & Artifact Security
- **Encryption**: Export artifacts are encrypted at rest using **AES-256-GCM** with a random per-job initialization vector (IV) and authentication tag.
- **Integrity**: Each artifact records a **SHA-256** checksum.
- **Expiring Downloads**: Download links are bound to a cryptographically secure token hash, expire after **24 hours**, and enforce a maximum download ceiling (default: 3 downloads).
- **Redaction Rules**: Zero passwords, tokens, API keys, private keys, staff notes, or other members' data are ever included in the export.
