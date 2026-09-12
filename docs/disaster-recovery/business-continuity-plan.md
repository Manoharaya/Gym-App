# Business Continuity Plan (BCP)

## 1. Plan Purpose
This Business Continuity Plan defines the operational procedures, roles, minimum viable operations, and communication protocols required to maintain FitCore gym operations during a critical disaster or prolonged infrastructure outage.

---

## 2. Minimum Viable Operations (MVO)

During a major outage, gym operators must maintain the following minimum capabilities:

1. **Member Physical Facility Access**:
   - Members with active credentials scan through turnstiles via local cache.
   - Front desk staff maintain manual attendance roster using tablet / offline mode.
2. **Scheduled Class Sessions**:
   - Existing class attendance lists printed or exported to staff tablets daily.
   - Trainers conduct scheduled sessions using cached attendee rosters.
3. **Emergency Check-In & Safety**:
   - Facility emergency exits remain physically operational via hardware bypass.
   - Staff have verified emergency contact numbers for all scheduled members.

---

## 3. Incident Command Structure

| Role | Responsibility | Primary Contact | Secondary Contact |
| :--- | :--- | :--- | :--- |
| **Incident Commander (IC)** | Declares DR incident, authorizes restore, coordinates recovery phases | VP of Engineering | Head of Infrastructure |
| **Data Lead** | Executes database restore, WAL replay, and PITR operations | Lead DBA | Senior Backend Eng |
| **Security & Privacy Officer** | Verifies encryption, MFA status, and privacy tombstone compliance | Head of Security | Compliance Officer |
| **Communications Officer** | Manages internal staff, gym owners, and public status notifications | Platform Operations Lead | Support Manager |
| **Business Continuity Lead** | Validates physical outlet operations, POS, and turnstile status | Operations Director | Field Engineering Lead |

---

## 4. Disaster Escalation Tiers

- **Level 1 (Degraded)**: Auxiliary service down (e.g. AI or accounting). Handled via automated degraded mode. No BCP declaration required.
- **Level 2 (High Risk)**: Primary database failover, queue backpressure, or partial payment gateway outage. DR incident declared, IC assigned.
- **Level 3 (Catastrophic)**: Primary datacenter unavailable, ransomware attempt, or total persistent datastore corruption. Full BCP activation, restore drill executed against cold secondary.
