# Access Control & Turnstile Integration Architecture

## Overview
FitCore unifies physical access control hardware (turnstiles, smart door locks, RFID scanners, biometric gates) into the Day 48 Integration Platform, consolidating Day 7 hardware access patterns.

---

## Scope & Topology

Access control hardware is strictly **OUTLET**-scoped:
* `scope`: `OUTLET`
* `outletId`: Target physical facility UUID
* `environment`: `PRODUCTION` or `SANDBOX`

---

## Supported Providers

| Provider | Mechanism | Capabilities |
|----------|-----------|--------------|
| **Kisi** | Cloud API / Webhook | Smart Locks, Turnstiles, Mobile Unlock, Access Audits |
| **Salto KS** | Cloud API / MQTT | Electronic Escutcheons, Wall Readers, PIN/Fob Sync |
| **Brivo** | OnAir Cloud API | Facility Access Panels, Video Tie-in, Schedule Automation |
| **Generic Controller** | Local TCP/IP / MQTT / HTTP Relay | Relay Triggering, Pulse Unlock, Contact Sensors |

---

## Access Lifecycle & Webhook Events

1. **Badge/Credential Provisioning**:
   When a member checks in or renews a membership, the adapter provisions a virtual key or synchronizes RFID card IDs to the cloud hardware controller.
2. **Real-Time Badge Swipes**:
   Hardware controllers fire webhooks on door unlocks:
   `POST /api/v1/integrations/webhooks/:provider`
   - Event is normalized to `ACCESS_EVENT_RECORDED`.
   - Attendance domain registers member entry time.
   - Resource & Capacity domain updates live occupancy headcount.
