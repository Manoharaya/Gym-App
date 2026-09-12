# Disaster Recovery Terminology & Metrics Definitions

## 1. RPO (Recovery Point Objective)

**Definition**: The maximum acceptable amount of data loss measured in time between the last persistent, recoverable state and the moment a disaster strikes.

```text
Last Valid Backup           Disaster Event
        │                         │
        ▼                         ▼
────────●─────────────────────────●────────► Time
        ◄─────── Data Loss ───────►
             (Observed RPO)
```

- **Target RPO**: `15 minutes` (Target for production database WAL streaming and regular snapshot intervals).
- **Observed RPO**: Empirical measurement calculated during restore drills:
  $$\text{Observed RPO} = \text{Drill Timestamp} - \text{Backup Timestamp}$$
- **Constraint**: The target is treated strictly as an engineering goal until verified through empirical recovery testing.

---

## 2. RTO (Recovery Time Objective)

**Definition**: The maximum acceptable duration from the formal declaration of a disaster until services are fully restored, business integrity is validated, and operational traffic can safely resume.

```text
Disaster Declared          Service Restored & Verified
        │                               │
        ▼                               ▼
────────●───────────────────────────────●──► Time
        ◄────── Recovery Duration ──────►
                 (Observed RTO)
```

- **Target RTO**: `60 minutes` (Target for complete platform restoration and smoke test validation).
- **Observed RTO**: Empirical duration measured from disaster initiation/drill start to completed validation pass.
- **Constraint**: RTO must never be reported as an achieved SLA without actual benchmark evidence.

---

## 3. High Availability vs. Disaster Recovery

| Dimension | High Availability (HA) | Disaster Recovery (DR) |
| :--- | :--- | :--- |
| **Objective** | Continuous operational uptime during localized component faults. | Restoration of entire system after catastrophic, unrecoverable failure. |
| **Mechanisms** | Multi-AZ database replicas, load balancers, container auto-scaling. | Off-site immutable backups, database restore drills, cold infrastructure provisioning. |
| **Recovery Window** | Milliseconds to seconds (transparent to users). | Minutes to hours (measured against RTO). |
| **Scope** | Node / pod failure, transient network partitions. | Primary datacenter loss, ransomware compromise, database corruption. |

---

## 4. Disaster Recovery vs. Business Continuity

- **Disaster Recovery (DR)**: Focuses on **technology recovery** — restoring databases, servers, networks, cryptographic keys, object storage, and message queues.
- **Business Continuity (BC)**: Focuses on **operational continuation** — maintaining minimum viable gym operations (turnstile entry, manual check-in override, billing pause, member communication) while technology is being recovered.
