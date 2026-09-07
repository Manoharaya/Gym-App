# ADR 011: Member Engagement, Habits, Challenges & Retention Foundation

## Status
Accepted (Day 18)

## Context
FitCore requires an engagement and retention foundation that encourages members to attend the gym, complete scheduled workouts, maintain healthy daily habits, participate in challenges, and earn milestones.

Historically, systems that bundle gamification directly into primary member records or write ad-hoc counters to workout/attendance tables suffer from:
1. Tight coupling and business record corruption.
2. Unclear domain boundaries when calculating streaks or analytics.
3. Security and privacy leaks when showing leaderboards or participant rankings.
4. Premature AI dependency when simple deterministic mechanics are far more reliable, explainable, and scalable.

## Decision
1. **Decoupled Event-Driven Domain**:
   - Primary domain tables (`AttendanceRecord`, `CheckIn`, `Workout`, `FoodLog`, `TrainingGoal`, `Booking`) remain the sole source of truth.
   - The Engagement domain ingests domain events into an immutable `EngagementEvent` log and derives engagement summaries without ever modifying underlying business entities.
2. **Deterministic Scoring & Historical Versioning**:
   - Engagement scores are bounded `[0, 100]` with explainable, configurable weights and recency time-decay.
   - Snapshots include mandatory `calculationVersion = 1` ensuring historical calculations remain reproducible when scoring formulas change in the future.
3. **Timezone-Aware Streak Engine**:
   - Streaks are calculated using the member's configured localized timezone (`MemberProfile.timezone`), evaluating consecutive local days rather than raw UTC midnight boundaries.
4. **Strict Zero-Trust Leaderboard Privacy**:
   - Public and challenge leaderboards display only public display names or first names with progress counters.
   - Under no circumstances are body weight, body composition, medical conditions, PAR-Q history, or private trainer notes exposed on public or challenge leaderboards.
5. **Transactional Reward Redemption**:
   - Redemptions with inventory limits operate inside database transactions with atomic decrements, preventing negative inventory and duplicate redemption race conditions.
6. **Day 17 Notification Integration with Anti-Spam Control**:
   - All engagement notifications route through the Day 17 `NotificationOrchestratorService`.
   - The engagement service enforces a daily frequency cap (max 3 notifications/day), duplicate suppression (within 24 hours), and cooldown intervals.
7. **AI Safety Boundary**:
   - Exposes `MemberEngagementContext` as a typed data contract for future AI consumption.
   - Strictly ZERO LLM calls or predictive AI models on Day 18.

## Consequences
### Positive
- High architectural cohesion and clean separation of concerns.
- Complete auditability and reproducibility of historical retention metrics.
- Multi-tenant security with IDOR protection across members, trainers, outlets, and organisations.
- Zero risk of leaking sensitive health metrics via gamification.

### Negative / Tradeoffs
- Requires maintaining derived summary tables (`MemberEngagementProfile`) synchronized with event streams.
- Batch recalculations are required to transition streaks for inactive members across local midnight boundaries.
