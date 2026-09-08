# Engagement Workflow Canonical Examples

This document details the 7 pre-configured gym engagement workflows included in FitCore with their triggers, criteria, actions, and bilingual copy.

---

## 1. 14-Day Inactivity Check-in (`INACTIVE_MEMBER_14D`)

- **Objective**: Re-engage members who have dropped off gym attendance for two consecutive weeks.
- **Trigger**: `INACTIVITY_DAYS_REACHED` (`inactivityDays >= 14`)
- **Stop Condition**: Cancel if member visits facility before action step executes.
- **Actions**:
  1. `SEND_COMMUNICATION` (SMS/Push):
     - **English**: *"Hi {{firstName}}, we missed you at the gym this past fortnight! Need help getting back into your routine? Let us know if you want to book a session."*
     - **Nepali**: *"नमस्ते {{firstName}}, बितेका दुई हप्तामा तपाईंलाई जिममा देख्न पाइएन! आफ्नो दिनचर्या पुनः सुरु गर्न कुनै मद्दत चाहिन्छ? सम्पर्क गर्नुहोस्।"*
  2. `CREATE_STAFF_TASK`:
     - **Title**: *"Follow up with inactive member: {{firstName}} {{lastName}}"*
     - **Priority**: `MEDIUM`
- **Safety**: 7-day cooldown (`MEMBER_AND_WORKFLOW`), quiet hours enabled.

---

## 2. 40% Attendance Drop Alert & Coach Follow-up (`ATTENDANCE_DROP`)

- **Objective**: Early detection of habit decline before churn occurs.
- **Trigger**: `ATTENDANCE_DROP_PERCENT` (`dropPercent >= 40`)
- **Actions**:
  1. `NOTIFY_ASSIGNED_TRAINER`:
     - **Title**: *"Attendance drop detected for {{firstName}}"*
     - **Message**: *"Member attendance dropped by 40% this cycle. Please reach out during your next session or send an encouraging note."*
  2. `CREATE_STAFF_TASK`:
     - **Title**: *"Review attendance drop: {{firstName}} {{lastName}}"*
     - **Priority**: `HIGH`
- **Safety**: 14-day cooldown, quiet hours enabled.

---

## 3. Class No-Show Follow-up (`CLASS_NO_SHOW_FOLLOWUP`)

- **Objective**: Check in on members after a missed group class.
- **Trigger**: `CLASS_MISSED`
- **Actions**:
  1. `DELAY`: 30 minutes.
  2. `SEND_COMMUNICATION` (Push):
     - **English**: *"Hey {{firstName}}, we noticed you could not make it to {{className}} today. Hope everything is alright! Check the schedule to rebook when you are ready."*
- **Safety**: 24-hour cooldown, quiet hours enabled.

---

## 4. 14-Day Membership Expiration Notice (`MEMBERSHIP_EXPIRING_14D`)

- **Objective**: Timely renewal reminder two weeks before contract ends.
- **Trigger**: `MEMBERSHIP_EXPIRING` (`daysUntilExpiration <= 14`)
- **Actions**:
  1. `SEND_COMMUNICATION` (Email):
     - **English**: *"Dear {{firstName}}, your membership is set to expire on {{expiryDate}}. Visit the front desk or renew through the app to maintain your fitness momentum!"*
     - **Nepali**: *"प्रिय {{firstName}}, तपाईंको सदस्यता {{expiryDate}} मा समाप्त हुँदैछ। निरन्तरता दिन एपबाट नवीकरण गर्नुहोस्।"*
  2. `CREATE_STAFF_TASK`:
     - **Title**: *"Renewal follow-up: {{firstName}} {{lastName}} (14 days left)"*
- **Safety**: 7-day cooldown.

---

## 5. Re-engagement Celebration (`MEMBER_REENGAGED`)

- **Objective**: Welcome back members visiting after prolonged absence.
- **Trigger**: `MEMBER_REENGAGED` (visit after $\ge 14$ days inactivity)
- **Actions**:
  1. `SEND_IN_APP_NOTIFICATION`:
     - *"Welcome back! Great to see you on the gym floor today, {{firstName}}! Keep up the great energy."*
  2. `ADD_ENGAGEMENT_NOTE`:
     - *"Member re-engaged following 14+ days of inactivity."*
- **Safety**: 30-day cooldown.

---

## 6. New Member 72-Hour Check-in (`NEW_MEMBER_ONBOARDING`)

- **Objective**: Guide new members during the critical first 3 days.
- **Trigger**: `ONBOARDING_STEP_COMPLETED`
- **Actions**:
  1. `DELAY`: 72 hours (4,320 minutes).
  2. `SEND_COMMUNICATION` (SMS):
     - *"Hi {{firstName}}, how are your first few days at FitCore going? Remember you have a complimentary fitness consultation included in your membership. Book it today at the front desk!"*
- **Safety**: 30-day cooldown.

---

## 7. 50-Workout Milestone Celebration (`MILESTONE_CELEBRATION`)

- **Objective**: Celebrate member consistency and fitness achievements.
- **Trigger**: `WORKOUT_MILESTONE_REACHED` (`milestoneCount: 50`)
- **Actions**:
  1. `SEND_IN_APP_NOTIFICATION`:
     - *"Milestone Unlocked! 🎉 Incredible dedication, {{firstName}}! You just hit 50 completed workouts with FitCore. Keep inspiring everyone!"*
  2. `ADD_MEMBER_TAG`:
     - `tag: "Milestone-50"`
- **Safety**: 1 execution lifetime per member.
