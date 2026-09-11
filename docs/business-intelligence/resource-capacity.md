# Resource & Capacity Intelligence Architecture

## 1. Objective & Purpose
FitCore Day 47 establishes an authoritative **Resource & Capacity Intelligence Layer** across all organisation facilities. It provides executive management, outlet operations leads, and fitness directors with unified visibility into:
- Physical space utilization across studios, rooms, courts, and training zones.
- Trainer availability, client allocations, class schedules, and burn-out risks.
- Equipment demand, maintenance lifecycle status, and booking frequencies.
- Group fitness class fill velocity versus actual physical attendance utilisation.
- Uncaptured member demand signaled through waitlist queues.
- Timezone-aware 24x7 peak hour matrices (168 hourly time slots per outlet).
- Explainable operational bottlenecks with concrete evidence and suggested human interventions.

---

## 2. Core Architectural Principles

### 2.1 Authoritative Operational Truth
This layer is strictly an **intelligence, measurement, and advisory system**.
- It consumes operational data exclusively from authoritative FitCore tables: `Resource`, `ClassSession`, `Booking`, `WaitlistEntry`, `TrainerAvailability`, `PersonalTrainingSession`, and `AttendanceRecord`.
- It **never** duplicates scheduling state or creates a shadow database.

### 2.2 Strict Human Decision Safeguard
- **No Autonomous Scheduling Alterations**: AI agents and automated services are explicitly forbidden from canceling sessions, reassigning instructors, modifying capacities, or booking resources.
- **Workflow Mandate**: `OBSERVE → MEASURE → COMPARE → IDENTIFY BOTTLENECK → EXPLAIN → RECOMMEND → HUMAN DECISION`.
- Every bottleneck and insight surfaces an explicit `humanDecisionRequired` flag.

### 2.3 Explicit Metric Separation
To eliminate deceptive reporting, the architecture disentangles:
1. **Booking Fill Rate**:
   $$\text{Fill Rate (\%)} = \left(\frac{\text{Confirmed Bookings}}{\text{Configured Capacity}}\right) \times 100$$
2. **Attendance Utilisation**:
   $$\text{Attendance Utilisation (\%)} = \left(\frac{\text{Physical Check-ins}}{\text{Configured Capacity}}\right) \times 100$$
3. **No-Show Rate**:
   $$\text{No-Show Rate (\%)} = \left(\frac{\text{Confirmed Bookings} - \text{Physical Check-ins}}{\text{Confirmed Bookings}}\right) \times 100$$

A class session can register 100% Booking Fill Rate while suffering an Attendance Utilisation of only 25% due to a 75% No-Show Rate. FitCore makes this divergence visible to management.

---

## 3. High-Level System Architecture

```mermaid
flowchart TD
    subgraph Authoritative Operational Domains
        R[Resource Table]
        CS[ClassSession Table]
        B[Booking Table]
        W[WaitlistEntry Table]
        TA[TrainerAvailability Table]
        PT[PersonalTrainingSession Table]
        AR[AttendanceRecord Table]
    end

    subgraph Day 47 Intelligence Layer
        Q[ResourceDataQualityService]
        C[CapacityService]
        U[UtilisationService]
        TC[TrainerCapacityService]
        RC[RoomCapacityService]
        EC[EquipmentCapacityService]
        CC[ClassCapacityService]
        PH[PeakHourService]
        BN[BottleneckDetectionService]
        RH[ResourceHealthService]
        CM[ResourceComparisonService]
        TR[ResourceTrendService]
        MR[ResourceMetricRegistry]
        AI[ResourceInsightService]
        CA[ResourceCacheService]
        RP[ResourcePermissionService]
    end

    subgraph Presentation & Consumer Interfaces
        API[REST Controller: /api/v1/resource-capacity-intelligence]
        MOB[Mobile: ResourceCapacityScreen]
        CSV[RFC 4180 CSV Export]
        EXP[Day 48 External Integrations Hook]
    end

    R & CS & B & W & TA & PT & AR --> Q
    Q --> C & U & TC & RC & EC & CC & PH
    C & U & TC & RC & EC & CC & PH --> BN & RH & CM & TR
    BN & RH & CM & TR & MR --> AI
    C & U & BN & RH & AI --> CA
    CA --> RP
    RP --> API
    API --> MOB & CSV & EXP
```

---

## 4. Multi-Tenant Isolation & Role-Based Scope
Every query passes through `ResourcePermissionService.resolveScope`:
- **SUPERADMIN / OWNER / ADMIN**: Unrestricted organisation-wide visibility or filtered to any outlet.
- **OUTLET_MANAGER / STAFF**: Strictly constrained to their assigned `outletId`. Attempting to access cross-outlet data triggers `403 Forbidden`.
- **TRAINER**: Allowed access only to their own operational trainer capacity; blocked from executive overview and comparative matrices.
- **MEMBER**: Completely blocked (`403 Forbidden`) from accessing resource intelligence endpoints.
