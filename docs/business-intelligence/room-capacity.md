# Room & Studio Capacity Intelligence

## 1. Overview
Room & Studio Capacity Intelligence measures the spatial efficiency and scheduling cadence of physical gym infrastructure, including main fitness studios, spin/cycling rooms, yoga/pilates lofts, functional turf areas, and swimming lanes.

---

## 2. Key Metrics & Definitions

1. **Available Operating Hours**:
   - Calculated from facility operating hours over the observation timeframe:
     $$\text{Available Hours} = \text{Days in Period} \times 14 \text{ hours/day}$$
2. **Booked Session Hours**:
   - Total scheduled duration of non-cancelled class sessions assigned to the resource.
3. **Room Utilisation Rate**:
   $$\text{Room Utilisation (\%)} = \left(\frac{\text{Booked Session Hours}}{\text{Available Operating Hours}}\right) \times 100$$
4. **Average Members per Session**:
   $$\text{Average Attendees} = \frac{\sum \text{Session Attendees}}{\text{Total Sessions}}$$
5. **Underutilised Room Detection**:
   - A room is flagged as `isUnderutilised: true` if `roomUtilisation < 25%` across at least 5 observation days.

---

## 3. Spatial Categories Supported

| Resource Type | Typical Capacity | Primary Use Case | Primary Utilization Metric |
| :--- | :--- | :--- | :--- |
| `STUDIO` | 20 – 40 | Group classes, HIIT, aerobics, dance | Class fill rate & session hours |
| `ROOM` | 10 – 25 | Indoor cycling, mind-body, boxing | Equipment occupancy & peak hours |
| `COURT` | 2 – 10 | Squash, basketball, badminton | Time-block booking rate |
| `AREA` | 15 – 50 | Functional turf, open conditioning, free weights | Member check-in density |
| `EQUIPMENT_BAY` | 5 – 20 | Power racks, cardio banks, cable stations | Turnover velocity & queue times |

---

## 4. API Endpoints
- `GET /api/v1/resource-capacity-intelligence/rooms`: Lists all rooms/studios with utilization metrics, booked hours, and underutilised flags.
- `GET /api/v1/resource-capacity-intelligence/resources/:resourceId`: Returns fine-grained operational detail, session history, and 6-dimension health report for a specific physical space.
