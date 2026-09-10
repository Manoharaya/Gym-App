# FitCore AI Receptionist — Operational Analytics & Attribution

## Overview
Receptionist analytics capture operational throughput, self-service efficiency, and human handoff rates across all customer communication channels.

---

## Metric Definitions

| Metric | Definition | Intent |
| :--- | :--- | :--- |
| **Total Interactions** | Total canonical interactions recorded | Overall contact volume |
| **Resolved Interactions** | Interactions ending in `COMPLETED` with verified outcome | Direct self-service success |
| **Resolution Rate** | $(\text{Resolved} / \text{Total}) \times 100$ | Automation efficiency |
| **Handoff Count** | Interactions transitioning to `HANDED_OFF` | Human exception volume |
| **Handoff Rate** | $(\text{Handoffs} / \text{Total}) \times 100$ | Staff intervention necessity |
| **Callback Requests** | Volume of `CallbackRequest` tickets | Asynchronous call demand |
| **Missed Calls** | Inbound calls ending in `NO_ANSWER` | Capacity & coverage tracking |
| **Abandoned Calls** | Calls disconnected prematurely by caller | Early friction indicator |
| **Leads Created** | New prospect records captured | Top-of-funnel acquisition |
| **Leads Qualified** | Leads passing minimum scoring threshold | Sales pipeline readiness |
| **Bookings Created** | Authoritatively verified class bookings | Self-service scheduling success |
| **Booking Failures** | Bookings rejected (capacity/eligibility) | Schedule bottleneck indicator |

---

## Non-Causal Attribution Policy

FitCore strictly avoids ungrounded causal revenue claims (such as "AI generated \$X revenue").
Attribution metrics are strictly formulated as:
- *"Bookings following receptionist interaction"*
- *"Leads qualified following receptionist interaction"*

This ensures transparent operational reporting without speculative financial claims.
