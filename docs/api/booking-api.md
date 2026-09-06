# FitCore Booking & Scheduling API Specification (Day 8)

## 1. Overview & Authentication
All endpoints reside under `/api/v1` and require Bearer JWT authentication:
- **Tenant Context**: Automatically resolved from JWT claims (`organisationId`, `outletId`, `roles`).
- **Idempotency**: Booking creation endpoints accept an `Idempotency-Key` header to prevent double booking.
- **Unified Error Envelope**:
```json
{
  "success": false,
  "error": {
    "code": "OUTLET_NOT_IN_SCOPE",
    "message": "Your membership does not grant access to this outlet"
  },
  "requestId": "req-1725660000000-abc123"
}
```

---

## 2. Public / Member Endpoints

### 2.1 Query Class Sessions
- **Endpoint**: `GET /api/v1/class-sessions`
- **Permissions**: Public / Authenticated Member (`JWT`)
- **Query Parameters**:
  - `outletId` (UUID, optional): Filter by hosting outlet.
  - `date` (YYYY-MM-DD, optional): Filter by session start date.
  - `startDate` (ISO 8601, optional): Filter sessions on or after timestamp.
  - `endDate` (ISO 8601, optional): Filter sessions on or before timestamp.
  - `category` (Enum, optional): `HIIT | YOGA | STRENGTH | SPIN | PILATES | BOXING | MOBILITY | RECOVERY | DANCE`.
  - `trainerId` (UUID, optional): Filter by instructor.
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "session-uuid",
      "name": "HIIT Blast 45",
      "startsAt": "2026-09-07T07:00:00.000Z",
      "endsAt": "2026-09-07T07:45:00.000Z",
      "capacity": 20,
      "waitlistCapacity": 5,
      "confirmedBookingCount": 18,
      "waitlistCount": 0,
      "spotsRemaining": 2,
      "userBookingStatus": null,
      "classType": {
        "id": "type-uuid",
        "name": "HIIT Blast",
        "category": "HIIT",
        "durationMinutes": 45
      },
      "outlet": {
        "id": "outlet-uuid",
        "name": "FitCore South West",
        "slug": "south-west"
      },
      "trainer": {
        "id": "trainer-uuid",
        "fullName": "Marcus Brody"
      },
      "resource": {
        "id": "resource-uuid",
        "name": "Studio 1",
        "type": "STUDIO"
      }
    }
  ]
}
```

### 2.2 Get Session Details & User Eligibility
- **Endpoint**: `GET /api/v1/class-sessions/:id`
- **Response**: `200 OK`
Returns session detail including current confirmed bookings, waitlist entries, and the member's personalized `userBookingStatus` (`CONFIRMED`, `WAITLISTED`, or `null`).

### 2.3 Book a Spot in Class Session
- **Endpoint**: `POST /api/v1/class-sessions/:id/book`
- **Headers**:
  - `Authorization: Bearer <jwt>`
  - `Idempotency-Key: <unique-uuid>` (optional but recommended)
- **Eligibility Validation Checks**:
  1. Member profile exists and is active.
  2. Member holds an `ACTIVE` `MemberMembership` within the organisation.
  3. Membership plan grants `GROUP_CLASSES` entitlement.
  4. Session's outlet is covered by membership's `MembershipAccessScope`.
  5. Member does not already have an active booking or waitlist entry for this session.
  6. Booking window is currently open (per `BookingPolicy`).
- **Behavior**:
  - If `spotsRemaining > 0`: Creates `Booking` with `status: CONFIRMED`.
  - If `spotsRemaining == 0` and waitlist space available: Creates `Booking` with `status: WAITLISTED` and `WaitlistEntry` with next sequential position.
  - If capacity and waitlist are full: Rejects with `409 Conflict` (`SESSION_FULL`).
- **Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "booking-uuid",
    "status": "CONFIRMED",
    "classSessionId": "session-uuid",
    "memberProfileId": "member-uuid",
    "confirmedAt": "2026-09-07T02:00:00.000Z",
    "waitlistEntry": null
  }
}
```

### 2.4 Cancel a Booking
- **Endpoint**: `POST /api/v1/bookings/:id/cancel`
- **Body**:
```json
{
  "reason": "Schedule conflict"
}
```
- **Security Check**: Only the booking owner (`memberProfileId`) or staff with `bookings:manage` can cancel.
- **Behavior**:
  - Updates booking to `CANCELLED`.
  - If the cancelled booking was `CONFIRMED`, immediately invokes FIFO waitlist promotion. Candidate #1 is promoted to `CONFIRMED` and remaining positions are decremented.
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "booking-uuid",
    "status": "CANCELLED",
    "cancelledAt": "2026-09-07T02:15:00.000Z"
  }
}
```

### 2.5 List Member's Bookings
- **Endpoint**: `GET /api/v1/members/me/bookings`
- **Query Parameters**:
  - `status` (Enum, optional): `CONFIRMED | WAITLISTED | CANCELLED | ATTENDED | NO_SHOW`
  - `upcoming` (Boolean, optional): Filter for future sessions.
- **Response**: `200 OK`

### 2.6 List Member's Active Waitlist Entries
- **Endpoint**: `GET /api/v1/members/me/waitlists`
- **Response**: `200 OK` (list of waitlist entries with current queue position and session details).

---

## 3. Staff & Administrative Endpoints

### 3.1 Outlet Schedule View
- **Endpoint**: `GET /api/v1/staff/schedule/outlet/:outletId`
- **Permissions**: `schedules:view` or `classes:view`
- **Query Parameters**: `startDate`, `endDate`
- **Response**: `200 OK` (all sessions hosted at the outlet with occupancy and waitlist metrics).

### 3.2 Trainer Schedule View
- **Endpoint**: `GET /api/v1/staff/schedule/trainer/:trainerId`
- **Permissions**: `schedules:view` or `classes:view`
- **Query Parameters**: `startDate`, `endDate`
- **Response**: `200 OK` (all assigned sessions for the trainer).

### 3.3 Session Roster & Attendance
- **Endpoint**: `GET /api/v1/staff/class-sessions/:id/bookings`
- **Permissions**: `bookings:view` or `classes:view`
- **Response**: `200 OK` (roster of confirmed attendees, waitlist entries, and attendance status).

### 3.4 Staff Manual Booking
- **Endpoint**: `POST /api/v1/staff/bookings/manual`
- **Permissions**: `bookings:manage`
- **Body**:
```json
{
  "classSessionId": "session-uuid",
  "memberProfileId": "member-uuid",
  "notes": "Booked at front desk by request"
}
```
- **Response**: `201 Created` (sets `bookedByStaffId`).

### 3.5 Mark Member Attendance (Check-In)
- **Endpoint**: `POST /api/v1/staff/bookings/:id/check-in`
- **Permissions**: `bookings:check_in`
- **Response**: `200 OK` (sets `status: ATTENDED`, `attendedAt: now()`).

### 3.6 Mark Member No-Show
- **Endpoint**: `POST /api/v1/staff/bookings/:id/no-show`
- **Permissions**: `bookings:check_in` or `bookings:manage`
- **Response**: `200 OK` (sets `status: NO_SHOW`).

---

## 4. Advanced Scheduling & Resource Management Endpoints (Day 9)

### 4.1 Create Recurring Schedule
- **Endpoint**: `POST /api/v1/recurring-schedules`
- **Permissions**: `classes:manage` or `schedules:manage`
- **Body**:
```json
{
  "outletId": "outlet-uuid",
  "classTemplateId": "template-uuid",
  "frequency": "WEEKLY",
  "daysOfWeek": [1, 3, 5],
  "startTime": "06:30",
  "durationMinutes": 45,
  "customCapacity": 16,
  "trainerId": "trainer-uuid",
  "resourceId": "resource-uuid",
  "startDate": "2026-10-01T00:00:00Z",
  "endDate": "2026-12-31T23:59:59Z"
}
```
- **Response**: `201 Created`

### 4.2 Generate Concrete Sessions
- **Endpoint**: `POST /api/v1/recurring-schedules/:id/generate`
- **Permissions**: `classes:manage` or `schedules:manage`
- **Body**:
```json
{
  "fromDate": "2026-10-01T00:00:00Z",
  "toDate": "2026-10-31T23:59:59Z"
}
```
- **Behavior**: Idempotently generates concrete `ClassSession` records. Preserves existing sessions and overridden occurrences (`isOverride: true`).
- **Response**: `200 OK` (`ClassSession[]`)

### 4.3 Preview Recurring Occurrences
- **Endpoint**: `GET /api/v1/recurring-schedules/:id/preview?fromDate=2026-10-01T00:00:00Z&toDate=2026-10-14T23:59:59Z`
- **Response**: `200 OK` (calculated local and UTC wall-clock slots without modifying database).

### 4.4 Update / Override Individual Session
- **Endpoint**: `PATCH /api/v1/class-sessions/:id`
- **Permissions**: `classes:manage`
- **Body**:
```json
{
  "name": "Special Edition HIIT",
  "startsAt": "2026-10-05T07:00:00Z",
  "endsAt": "2026-10-05T08:00:00Z",
  "capacity": 20,
  "trainerId": "substitute-trainer-uuid",
  "resourceId": "studio-2-uuid"
}
```
- **Invariants**:
  - Automatically flags `isOverride: true` and preserves `originalStartsAt`.
  - Enforces capacity floor: `capacity >= confirmedBookingCount` (`CAPACITY_BELOW_CONFIRMED_BOOKINGS`).
  - Checks trainer and room conflicts unless authorized staff override is provided.
- **Response**: `200 OK`

### 4.5 Register Physical Resource (Room / Studio)
- **Endpoint**: `POST /api/v1/resources`
- **Permissions**: `outlets:manage` or `classes:manage`
- **Body**:
```json
{
  "outletId": "outlet-uuid",
  "name": "Studio Alpha",
  "type": "STUDIO",
  "capacity": 25
}
```
- **Response**: `201 Created`

### 4.6 Get Resource Timetable
- **Endpoint**: `GET /api/v1/resources/:id/timetable?startDate=2026-10-01&endDate=2026-10-07`
- **Response**: `200 OK` (resource details and scheduled sessions).

### 4.7 Record Trainer Unavailability / Leave
- **Endpoint**: `POST /api/v1/staff/trainer-availability/unavailability`
- **Permissions**: `trainers:manage` or `schedules:manage`
- **Body**:
```json
{
  "trainerId": "trainer-uuid",
  "startDate": "2026-10-10T00:00:00Z",
  "endDate": "2026-10-15T23:59:59Z",
  "reason": "Annual Leave / Holiday"
}
```
- **Response**: `201 Created`

