# FitCore v1.0 — Known Limitations & Operational Considerations

## 1. Overview
In accordance with the core release principle of **transparency over appearance**, this document catalogues all known non-blocking limitations in **FitCore v1.0.0-rc.1**. None of these items represent security vulnerabilities or P0 release blockers.

---

## 2. Documented Limitations

### 2.1 External Provider Configuration Dependencies
- **Telephony Voice Receptionist (Day 34)**:
  - *Limitation*: The voice pipeline uses WebRTC / Twilio mock adapters in local development. In production, an active Twilio SIP trunk and provisioned telephone numbers are required.
  - *Impact*: Voice receptionist cannot receive real PSTN phone calls until tenant configures Twilio credentials.
  - *Resolution*: Documented in integration setup guide.

### 2.2 Accounting Synchronization (Day 43)
- **Xero & QuickBooks Online**:
  - *Limitation*: Requires customer-managed OAuth 2.0 app credentials in their respective accounting developer portals.
  - *Impact*: Invoices and payments do not sync externally until the tenant administrator completes the one-time OAuth consent handshake.
  - *Resolution*: Tenant self-service connect flow in Settings.

### 2.3 Disaster Recovery Multi-Region Automated Failover (Day 58)
- **Cross-Cloud Failover**:
  - *Limitation*: Database restoration is currently tested and validated against in-region sandbox instances (Observed RTO: 18 seconds). Automated cross-region zero-downtime DNS failover requires AWS Aurora Global Database or Multi-Region Read Replicas.
  - *Impact*: In the event of an entire AWS region loss, disaster recovery failover follows the manual runbook (`docs/disaster-recovery/failover-runbook.md`) rather than instantaneous automatic DNS redirection.
  - *Resolution*: Scheduled for v1.1 enterprise multi-region roadmap.

### 2.4 Browser-Side Hardware Integration (Access Turnstiles)
- **Turnstile Controllers**:
  - *Limitation*: QR code generation and validation operates over standard HTTPS APIs. Physical relays require a local gateway agent (Raspberry Pi or industrial IoT gateway) running on the gym LAN.
  - *Impact*: Turnstiles must be connected to local network with internet outbound egress.
  - *Resolution*: Standard deployment configuration.
