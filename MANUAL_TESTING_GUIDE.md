# FitBeat Platform — Complete Manual Feature Testing Guide

This document provides an end-to-end testing playbook to manually test every feature in every panel and administrative role across the **FitBeat** platform.

---

## 📋 Quick Reference: Access Points & Credentials

The local database is seeded with authentic multi-tenant accounts. The master password for **all** development accounts is:

> **Master Password:** `FitCoreDev2026!`

| Panel / Role | Local URL | Email | Password | Primary Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Superadmin Console** | [http://localhost:5173](http://localhost:5173) | `superadmin@fitcore.io` | `FitCoreDev2026!` | Global Platform Governance |
| **Organisation Owner** | [http://localhost:8081](http://localhost:8081) | `owner@secondwind.com.au` | `FitCoreDev2026!` | Second Wind Athletic Club (All Outlets) |
| **Outlet Manager** | [http://localhost:8081](http://localhost:8081) | `manager@secondwind.com.au` | `FitCoreDev2026!` | Perth CBD Branch |
| **Finance Center** | [http://localhost:8081](http://localhost:8081) | `owner@secondwind.com.au` | `FitCoreDev2026!` | Financials & Invoicing |
| **Reception Desk** | [http://localhost:8081](http://localhost:8081) | `reception@secondwind.com.au` | `FitCoreDev2026!` | Front-Desk & Turnstiles |
| **Trainer Hub** | [http://localhost:8081](http://localhost:8081) | `trainer@secondwind.com.au` | `FitCoreDev2026!` | Marcus Brody (Trainer) |
| **Active Member** | [http://localhost:8081](http://localhost:8081) | `active.member@secondwind.com.au` | `FitCoreDev2026!` | Alex Chen (Member) |
| **Member Onboarding** | [http://localhost:8081](http://localhost:8081) | `member@secondwind.com.au` | `FitCoreDev2026!` | New Member Flow (6 Steps) |

> [!TIP]
> **Instant Role Switcher:** When testing on [http://localhost:8081](http://localhost:8081), you do not need to log out every time! The **Verification Shell** on the home screen provides 1-click launcher buttons and an interactive **"Toggle Role"** button to instantly evaluate permission boundaries without re-entering credentials.

---

## 1. 🛡️ Superadmin Control Plane (http://localhost:5173)

The Superadmin Console manages global infrastructure, multi-tenant isolation, AI billing, and platform observability across all 142 organizations and 384 gym branches.

### View 1.1: Platform Observability (`#overview`)
1. **Navigate:** Open [http://localhost:5173/#overview](http://localhost:5173/#overview).
2. **Verify Header:**
   - FitBeat logo image renders in the top-left sidebar.
   - Title displays `FitBeat` with `CONTROL PLANE` badge.
   - Top bar indicates `ALL SYSTEMS HEALTHY` with a pulsing green dot.
3. **Verify Executive KPIs:**
   - Total Organisations: `142` (128 active, 11 trial, 3 suspended).
   - Total Outlets: `384`.
   - Active Members: `94,250`.
   - Global AI Tokens: `78.54M` with estimated platform cost in cents.
4. **Interact:** Click **"Refresh"** (🔄) in the top bar to verify real-time metric polling.

### View 1.2: Organisations Registry (`#organisations`)
1. **Navigate:** Click **"Organisations"** in the sidebar.
2. **Test Search & Filtering:**
   - In the search box, type `Apex` → Verifies instant filtering to *Apex Performance Clubs*.
   - Filter by status tabs (`All`, `Active`, `Trial`, `Suspended`).
   - Click *Titan Athletics Group* → Note that it displays the `SUSPENDED` status badge.
3. **Inspect Multi-Outlet Breakdown:**
   - Verify column metrics: Outlets count, member count, country (Australia, New Zealand, USA), currency (AUD, NZD, USD).

### View 1.3: Platform Usage & Latency (`#usage`)
1. **Navigate:** Click **"Platform Usage"** in the sidebar.
2. **Verify Latency Percentiles:**
   - HTTP Latency: `p50: 18ms`, `p95: 84ms`, `p99: 142ms`.
   - Database Latency: `dbP95: 12ms`.
   - Error Rate: `< 0.05%`.
3. **Queue Utilization:** Check queues (`notifications`, `billing`, `ai-inference`) for zero dead-letter queues (`dlq: 0`).

### View 1.4: AI Gateway & Cost Telemetry (`#ai-usage`)
1. **Navigate:** Click **"AI Gateway & Cost"**.
2. **Verify Model Breakdown:**
   - Inspect token split across `GPT-4o`, `Claude 3.5 Sonnet`, and `Local Biometric Enclave`.
   - Verify cost calculation: Integer-cent precision without floating-point drift.

### View 1.5: Feature Flags Governance (`#feature-flags`)
1. **Navigate:** Click **"Feature Flags"**.
2. **Test Flag Toggles:**
   - Locate `ai.advanced_voice_receptionist` (rollout: 50%).
   - Click **"Toggle Rollout"** or adjust percentage slider.
   - Locate `billing.dynamic_proration` marked with `SECURITY CRITICAL` badge.

### View 1.6: Platform Health & Integrations (`#health`, `#integrations`)
1. **Navigate:** Click **"Platform Health"**.
2. **Verify Health Heartbeats:**
   - `API_GATEWAY`: `HEALTHY (2ms)`.
   - `DATABASE_POSTGRESQL`: `HEALTHY (6ms)`.
   - `CACHE_REDIS`: `HEALTHY (1ms)`.
   - External gateways (`Twilio`, `Stripe Webhooks`, `Xero Sync`): Active.

### View 1.7: Break-Glass Emergency Access
1. **Trigger:** Click the red **"🚨 Break-Glass"** button in the top header.
2. **Step-Up Challenge Modal:**
   - Modal appears: *High-Risk Operation: Step-Up Authentication Required*.
   - Enter `FitCoreDev2026!` or any 6-digit code (e.g. `123456`).
   - Click **"Verify & Proceed"** → Confirms elevation with audit trail timestamp.

---

## 2. 👑 Organisation Owner Panel (http://localhost:8081)

The Organisation Owner has top-level authority over multi-branch athletic operations, finances, staffing, and automated engagement.

### Step 2.1: Log In as Owner
- **Option A:** Open [http://localhost:8081](http://localhost:8081) → Click `🔐 Sign In / Login Screen` → Select **"Jack Darling (Owner)"** → Click **"Sign In as Owner"**.
- **Option B (Shortcut):** From the home screen, click `👑 Organisation Owner`.

### Step 2.2: Test Executive Dashboard (`OrganisationOwnerHomeScreen`)
1. **Branch Switcher:**
   - In the top bar, toggle between `All Outlets`, `Perth CBD`, and `Fremantle`.
   - Verify that revenue and attendance metrics update dynamically.
2. **Enterprise Governance Badge:**
   - Verify that the card displays `ENTERPRISE ADMINISTRATION` (with no roadmap/day numbers).
3. **KPI Cards:**
   - Total Monthly Revenue (e.g. `$142,500 AUD`).
   - Active Member Retention rate (`94.2%`).
   - Check-in Volume (`3,820 visits`).

### Step 2.3: Test Staff Directory
1. **Action:** Click **"Staff Directory"** from the Owner Dashboard or Launcher.
2. **Verify Staff Roster:**
   - Inspect team members: Sarah Miller (Manager), Marcus Brody (Trainer), Emma Watson (Reception).
   - Check employment badges (`FULL_TIME`, `PART_TIME`, `CONTRACTOR`).
   - Test search filter by typing `Marcus`.

### Step 2.4: Test AI Retention Intelligence
1. **Action:** Click **"Retention Queue"** or locate the **AI Retention Agent** card.
2. **Verify At-Risk Detection:**
   - View members flagged as `HIGH_RISK` or `MEDIUM_RISK` based on attendance drop-off.
   - Click a member row to view churn probability, attendance trajectory, and recommended AI intervention offer.

### Step 2.5: Test Automated Engagement Workflows
1. **Action:** Click **"Automation Center"**.
2. **Verify Tabs:**
   - **Workflows:** View active automated campaigns (*Trial Follow-up*, *14-Day Inactivity Check-in*).
   - **Approvals:** Check human-in-the-loop pending actions awaiting owner approval.
   - **Templates:** Explore pre-built retention templates.
   - **AI Architect:** Type a custom prompt (e.g., *"Welcome back members absent for 2 weeks"*) and click **"Generate Workflow"**.

---

## 3. 🏢 Outlet Manager Panel (http://localhost:8081)

The Outlet Manager oversees a specific gym facility (Perth CBD), class capacities, trainer assignments, and daily front-desk throughput.

### Step 3.1: Log In as Outlet Manager
- Click `🔐 Sign In / Login Screen` → Select **"Sarah Miller (Manager)"** → Click **"Sign In as Manager"** (or click `🏢 Outlet Manager` from Launcher).

### Step 3.2: Test Outlet Facility Dashboard
1. **Live Facility Capacity:**
   - Check current gym floor occupancy meter (e.g., `42 / 75 Members (56%)`).
   - Verify capacity status badge: `OPTIMAL CAPACITY`.
2. **Daily Class Timetable:**
   - View scheduled classes for today: *HIIT Strength (07:00)*, *Vinyasa Yoga (12:00)*, *Functional Athletic (17:30)*.
3. **Quick Action Buttons:**
   - Click **"View Class Roster"** → Inspect confirmed attendees and waitlisted members.

### Step 3.3: Test Client & Trainer Allocation
1. **Action:** Click `🤝 Client Roster & Assignment`.
2. **Verify Rostering:**
   - View trainer client load: Marcus Brody (`12 Active Clients`).
   - Test trainer reassignment modal for incoming members.

---

## 4. 💳 Finance Center & Invoicing Panel

Dedicated financial view verifying authoritative ledgers, payments, and billing automation.

### Step 4.1: Access Finance Center
- From Launcher, click `💳 Finance Center` (or switch role to `FINANCE`).

### Step 4.2: Test Financial Health & Ledgers
1. **Revenue Recognition:**
   - Inspect Cash-Basis Monthly Recurring Revenue (MRR).
   - Check recognized revenue split across Membership Tiers (Elite, All-Access, Standard).
2. **Reconciliation & Integrity Card:**
   - Verify subtitle reads: **"Synchronized against Core Authoritative Ledgers"** (clean of legacy Day tags).
   - Check Data Quality score: `100 / 100` (zero unprojected transactions).
3. **Invoices Feed:**
   - Filter invoices by `Paid`, `Pending`, and `Overdue`.
   - Click an invoice item to view invoice line items, tax breakdowns (10% GST), and payment reference numbers.

---

## 5. 🛎️ Reception & Turnstile Desk Panel

Front-desk operations interface for physical access control, drop-ins, and emergency turnstile overrides.

### Step 5.1: Log In as Receptionist
- Click `🔐 Sign In / Login Screen` → Select **"Emma Watson (Reception)"** → Click **"Sign In as Reception"** (or click `🛎️ Reception Desk`).

### Step 5.2: Test Live Turnstile Gate Access
1. **Access Feed Monitor:**
   - View recent turnstile check-in log:
     - `Alex Chen` · *All-Access Tier* · `ACCESS GRANTED (Turnstile A)`.
     - `Expired Pass` · *Standard Tier* · `ACCESS DENIED (Payment Overdue)`.
2. **Simulate Manual Member Check-in:**
   - In the search bar, type `Alex Chen`.
   - Click **"Manual Admit"** → Verify access granted toast and gate open indicator.
3. **Emergency Override Test:**
   - Click **"Emergency Override / Open Gate"**.
   - Select reason (*Fire Drill*, *Hardware Glitch*, *VIP Visit*).
   - Confirm override → Verify that an audit record is generated with reception credentials.

---

## 6. 🏋️‍♂️ Personal Trainer Hub

Trainer interface for workout programming, client tracking, and exercise libraries.

### Step 6.1: Log In as Trainer
- Click `🔐 Sign In / Login Screen` → Select **"Marcus Brody (Trainer)"** → Click **"Sign In as Trainer"** (or click `🏋️‍♂️ Trainer Hub`).

### Step 6.2: Test Client Management
1. **Client Roster:**
   - View assigned athletes: *Alex Chen* (Goal: Hypertrophy & VO2 Max), *Jessica Taylor* (Goal: Half-Marathon Endurance).
2. **Client Detail & Biometrics:**
   - Click on *Alex Chen* → View readiness score (`82% Optimal`), resting heart rate (`54 bpm`), and weekly compliance (`4 / 4 sessions`).
3. **Client Notes & Goals:**
   - Click **"Add Coaching Note"** → Type: *"Great form on deadlifts today. Increased load to 140kg."* → Click Save.

### Step 6.3: Test Workout Programming
1. **Action:** Click **"Workout Programming"** or **"Create Program"**.
2. **Configure Routine:**
   - Select Training Days per Week: Toggle `Mon`, `Wed`, `Fri`.
   - Add exercises from the database: *Barbell Back Squat*, *Romanian Deadlift*, *Dumbbell Bench Press*.
   - Configure sets and reps: `4 sets x 8 reps @ 75% 1RM`.
   - Click **"Save Program"** → Verify that scheduled sessions appear in the Training Calendar.

### Step 6.4: Test Movement Database
1. **Action:** Click **"Exercise Library"**.
2. **Interact:**
   - Search by movement name (e.g. `Squat`).
   - Filter by primary muscle group (`Chest`, `Back`, `Legs`, `Core`).
   - Filter by equipment (`Barbell`, `Dumbbell`, `Cable`, `Bodyweight`).
   - Click any exercise card to view step-by-step coaching cues and video technique guide.

---

## 7. 🏃‍♂️ Member Mobile Application Flow

The full consumer mobile app experience with wearables, booking, workouts, and AI fitness check-ins.

### Step 7.1: Enter as Member
- From Launcher, click `🏃‍♂️ Enter as Member` (or sign in with `active.member@secondwind.com.au`).

### Step 7.2: Test Member Home Screen
1. **Branded Top Bar:**
   - Verify the **FitBeat** logo appears next to Alex Chen's avatar.
   - Verify location pill displays: `Second Wind Perth CBD · Active`.
2. **AI Daily Readiness Hero Card:**
   - Check the circular progress ring: `82% READINESS · High Training Capacity`.
   - Check badge label: **"FITBEAT AI INSIGHT"**.
   - Click **"Daily Check-In →"** to test the interactive check-in questions (Soreness, Sleep, Stress).
3. **Turnstile Pass Quick Action:**
   - Click the green **"PASS"** button in the top right.
   - Verify the animated **Dynamic QR Code** screen renders with rotating security hashes and countdown timer.
4. **Streak & Momentum Card:**
   - Verify `4-Day Training Streak` with habit completion circles.

### Step 7.3: Test Class Booking
1. **Bottom Nav:** Tap **"Classes"** or **"Bookings"**.
2. **Browse Timetable:**
   - Select day pill (e.g. `Tomorrow`).
   - Locate *Morning HIIT Conditioning (07:00)*.
3. **Book Class:**
   - Click **"Book Spot"** → Review trainer details and spot availability.
   - Click **"Confirm Reservation"** → Verify booking confirmation modal and calendar sync.

### Step 7.4: Test Active Workout Execution
1. **Action:** Tap **"Workout"** from the bottom nav or home card.
2. **Live Workout Logger:**
   - Click **"Start Workout Session"**.
   - Check live stopwatch timer.
   - Complete Set 1: Check off `10 reps @ 100kg` → Check rest interval timer starts automatically.
   - Click **"Finish Workout"** → View summary celebration modal with total volume lifted and PR achievements.

### Step 7.5: Test Wearables & Biometrics
1. **Action:** Navigate to **"Wearables"** from profile or home.
2. **Inspect Providers:**
   - View connected providers: *Apple Health* (Connected ✓), *Whoop*, *Garmin*, *Fitbit*.
   - View biometric stream: Daily steps (`11,420`), Active Calories (`680 kcal`), Average Heart Rate (`68 bpm`), Sleep Duration (`7h 42m`).
3. **Privacy Controls:** Click **"Wearable Privacy"** → Verify on-device encryption notice.

### Step 7.6: Test App Settings
1. **Action:** Go to **Profile** → Tap **Settings** (⚙️).
2. **Settings Controls:**
   - Toggle **"Biometric App Lock"** (`Require FaceID / TouchID to open FitBeat`).
   - Toggle **"Class Reminders"** and **"Waitlist Alerts"**.
   - Click **"Export My Fitness Data"** → Verify data archive prompt.
   - Scroll to footer: Verify **FitBeat logo** and text **"FitBeat Mobile Platform v0.1.0"**.

---

## 8. 📋 Member Onboarding Flow (6-Step Registration)

Tests the compliance, health questionnaire, and legal waiver signing flow for new members.

### Step 8.1: Launch Onboarding
- From Launcher, click `📋 Member Onboarding Flow` (or navigate to `/onboarding`).

### Step 8.2: Test All 6 Sequential Steps
1. **Step 1: Welcome & Overview (`WelcomeScreen`):**
   - Verify **FitBeat logo** is centered at top.
   - Verify badge says: **"FitBeat Onboarding"**.
   - Review checklist and click **"Get Started →"**.
2. **Step 2: Profile & Emergency Contact (`ProfileScreen`):**
   - Confirm prefilled name (*Alex Chen*), phone number, and emergency contact (*Sarah Chen - 0412 345 678*).
   - Click **"Continue →"**.
3. **Step 3: PAR-Q+ Health Readiness (`ParqScreen`):**
   - Answer standard 7 physical readiness questions (Heart condition, chest pain, dizziness, bone/joint problem).
   - Select "No" to all safety questions → Click **"Continue →"**.
4. **Step 4: Injury & Health Screening (`InjuryScreen`):**
   - Interactive anatomical avatar: select body region (*Left Shoulder* / *Mild rotator cuff strain*).
   - Click **"Continue →"**.
5. **Step 5: Consent, Liability Waiver & Signature (`SignatureScreen`):**
   - Read club rules, gym 24/7 access liability release, and health telemetry processing policy.
   - Check all consent checkboxes.
   - Draw an electronic signature in the signature pad.
   - Click **"Submit Declaration →"**.
6. **Step 6: Completion Celebration (`CompleteScreen`):**
   - Verify celebration screen with **FitBeat logo**, confetti icon, and **"Welcome to FitBeat"**.
   - Status indicators confirmed:
     - Profile Status: `✓ COMPLETE`
     - Health & Safety Clearance: `✓ VERIFIED`
     - Compliance & Waivers: `✓ SIGNED`
   - Click **"Go to Member Dashboard"** → Successfully routes into the Member experience.

---

## 🛠️ Verification Checklist Summary

| Subsystem / Role | Expected Visual Result | Verified? |
| :--- | :--- | :---: |
| **Branding Everywhere** | Official FitBeat runner logo on all headers, login, onboarding, settings, and superadmin | [x] |
| **Clean UI Buttons** | Zero instances of `(Days 1–10)`, `(Day 4)`, `(Day 11)`, `DAY 51`, etc. | [x] |
| **Superadmin Console** | [http://localhost:5173](http://localhost:5173) displays FitBeat sidebar and 12 live operational views | [x] |
| **Login Screen** | High-res FitBeat logo image, `FitBeat` title, and role switcher buttons | [x] |
| **Member Dashboard** | FitBeat top bar logo, `FITBEAT AI INSIGHT` card, and dynamic QR pass | [x] |
| **Onboarding Flow** | 6-step flow with FitBeat welcome and completion screens | [x] |
| **Trainer Hub** | Client roster, workout programming, and exercise library | [x] |
| **Reception Desk** | Turnstile live gate access monitor and emergency override | [x] |
| **Outlet Manager** | Multi-outlet capacity meters and branch staff directory | [x] |
| **Finance Center** | Invoices, recognized revenue, and core authoritative ledger sync | [x] |
| **REST API Health** | [http://localhost:4000/health](http://localhost:4000/health) returns `{ "status": "healthy" }` | [x] |
| **Swagger API Explorer**| [http://localhost:4000/api/docs](http://localhost:4000/api/docs) provides 300+ interactive endpoints | [x] |
