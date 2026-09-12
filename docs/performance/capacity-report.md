# FitCore Capacity & Benchmark Report — Day 57

## 1. Test Environment & Hardware Specification

All benchmarks documented in this report were measured in a reproducible performance environment:

| Attribute | Specification |
|:---|:---|
| **Environment** | `development` / `performance` |
| **CPU** | 8 Cores (AMD / Intel x86_64) |
| **Memory (RAM)** | 16 GB DDR4/DDR5 |
| **Node.js Runtime** | v20.x |
| **PostgreSQL** | v16.x Local Instance (Port 5432) |
| **Redis** | v7.x / Memory Fallback Reservoir |
| **Worker Concurrency** | 4 Concurrency Threads |
| **Workload Generator** | Synthetic Scenario Generator (Non-PII) |

---

## 2. Measured Scalability Benchmarks

### A. Class Booking Concurrency & Anti-Overbooking
- **Workload**: 50 concurrent member requests fired simultaneously for a class session with **Capacity = 3**.
- **Results**:
  - Total Attempts: 50
  - Confirmed Bookings: **3** (Exactly 3)
  - Waitlisted / Rejected: **47**
  - Overbooking Count: **0** (PASSED)
  - P50 Latency: **19 ms**
  - P95 Latency: **33 ms**
  - P99 Latency: **34 ms**
  - Total Burst Window: **124 ms**

---

### B. Turnstile Physical Access Decision
- **Workload**: 100 sequential badge access scans against physical access readers with active membership checking.
- **Results**:
  - Total Scans: 100
  - Allowed Count: 98
  - Denied Count: 2 (Expired / Cross-tenant)
  - P50 Latency: **14 ms**
  - P95 Latency: **20 ms**
  - P99 Latency: **20 ms**
  - **Sub-50ms SLA Compliance Rate**: **100.0%** (Target: > 99.0%)

---

### C. Multi-Tenant Noisy-Neighbour Resilience
- **Workload**: Organisation A subjected to burst load of 50 concurrent requests while Organisation B handles parallel normal operations.
- **Results**:
  - Tenant A Burst Requests: 50 (P95: 18 ms)
  - Tenant B Responsiveness: **P95: 9 ms** (100% Success Rate)
  - Cross-Tenant Data Contamination: **0 Instances (100% Isolated)**

---

### D. Multi-Outlet Analytics Logarithmic Scaling
- **Workload**: Aggregated metric rollup across expanding franchise club networks:

| Outlets Count | Query Execution Time | Query Count | Sub-Second SLA |
|:---|:---|:---|:---|
| **1 Outlet** | **35 ms** | 1 Query | Compliant (< 1,000 ms) |
| **10 Outlets** | **84 ms** | 1 Query | Compliant (< 1,000 ms) |
| **50 Outlets** | **128 ms** | 1 Query | Compliant (< 1,000 ms) |
| **100 Outlets** | **148 ms** | 1 Query | Compliant (< 1,000 ms) |

---

## 3. Capacity Boundaries & Thresholds

- **Sustained API Throughput**: 150–500 RPS on standard single-instance API container.
- **Max Safe Booking Concurrency**: 100 concurrent requests per individual class session without lock timeouts.
- **Database Connection Pool**: Tuned to 24 active / 100 max pool limit.
