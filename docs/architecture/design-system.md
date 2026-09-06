# FitCore Design System & UI/UX Architecture

## 1. Design Vision & Principles

FitCore combines **Apple-level simplicity**, **Equinox-grade athletic luxury**, **enterprise SaaS rigor**, and **intelligent AI augmentation**.

The interface is engineered around 4 core principles:
1. **Athletic Minimalism**: Deep space obsidian surfaces (`#0B0E14`, `#141822`), crisp hairline borders (`#232B3E`), and high-contrast typography replace heavy gradients and cartoonish fitness clichés.
2. **Intelligent, Purposeful AI**: AI is integrated contextually as performance insights (e.g. readiness score, biomechanical form cues, macro adjustments), never as a gimmicky chatbot that gets in the user's way.
3. **Role-Tailored Command Centers**: Rather than a generic administrative template, every actor (Member, Trainer, Reception, Outlet Manager, Organisation Owner, Finance, Superadmin) receives an interface customized precisely for their operational workflow.
4. **Accessible, Native-First Ergonomics**: Thumb-friendly touch targets (min 48px), floating quick-action docks, high-contrast readable status pills, and dark/light mode parity.

---

## 2. Design Tokens (`@fitcore/ui` & Mobile Theme)

### 2.1 Color Tokens
- **Brand Primaries**:
  - `primary`: `#E63946` (Energetic Athletic Crimson)
  - `primaryLight`: `rgba(230, 57, 70, 0.15)`
  - `primaryGlow`: `rgba(230, 57, 70, 0.35)`
- **Electric Athletic Accents**:
  - `accent`: `#0EA5E9` (Electric Sky Blue)
  - `accentLight`: `rgba(14, 165, 233, 0.15)`
  - `accentGlow`: `rgba(14, 165, 233, 0.3)`
- **AI Intelligence**:
  - `aiPrimary`: `#8B5CF6` (AI Violet)
  - `aiSecondary`: `#6366F1` (AI Indigo)
  - `aiLight`: `rgba(139, 92, 246, 0.15)`
- **Surfaces & Canvas (Dark Mode)**:
  - `background`: `#0B0E14` (Deep Space Obsidian)
  - `surface`: `#141822` (Midnight Surface)
  - `surfaceHover`: `#1B2130`
  - `surfaceActive`: `#232B3E`
  - `border`: `#232B3E`
  - `borderLight`: `#333E54`
- **Surfaces & Canvas (Light Mode)**:
  - `lightBackground`: `#F8FAFC` (Porcelain)
  - `lightSurface`: `#FFFFFF`
  - `lightBorder`: `#E2E8F0`
  - `lightTextPrimary`: `#0F172A`
- **Biometric & Telemetry Status**:
  - `heartRate`: `#F43F5E` (Biometric Red)
  - `recoveryOptimal`: `#10B981` (Emerald Vitality)
  - `caloriesBurned`: `#FB923C` (Tangerine Flame)
  - `streakFire`: `#F97316` (Streak Orange)

### 2.2 Typography Scale
- `display`: 48px / 56px line-height (Bold 800)
- `h1`: 36px / 44px (Bold 800)
- `h2`: 24px / 32px (Bold 700)
- `h3`: 18px / 26px (Bold 700)
- `body`: 16px / 24px (Regular 400)
- `bodySmall`: 14px / 20px (Medium 500)
- `caption`: 12px / 16px (Semi-bold 600)
- `metric`: Tabular numerals with tracking for KPI widgets

---

## 3. Reusable Component Primitives

The design system provides 19 shared primitives in `apps/mobile/src/components/primitives`:

| Primitive | Description | Key Variants / Features |
|---|---|---|
| `Button` | Accessible interactive button with haptic press states | `primary`, `secondary`, `outline`, `ghost`, `danger`, `ai`, `accent` |
| `Card` | Obsidian surface container with hairline borders | `elevated`, `bordered`, `onPress` interactive states |
| `Badge` | High-contrast status pill with icon accessory | `primary`, `success`, `warning`, `danger`, `info`, `neutral`, `ai`, `accent` |
| `Input` | Floating label text field with validation and icons | Secure entry, keyboard awareness, error feedback |
| `MetricCard` | High-impact KPI widget | Label, numeric value, unit, trend badge (`+14.2%`), icon |
| `ProgressRing` | Circular SVG-style metric gauge | Clamped percentage (0–100%), central label, stroke width |
| `Tabs` | Segmented control and underline navigation | `pill`, `underline`, badge counts, scrollable |
| `SkeletonLoader` | Pulse shimmer loading placeholder | Custom width, height, radius |
| `Icon` | Lightweight vector glyph component | 32 geometric icons without external native binaries |
| `BottomSheet` | Thumb-friendly modal drawer | Dismissible overlay with drag handle |
| `EmptyState` | Empathetic guidance card | Actionable icon, title, description, and primary CTA |
| `ErrorState` | User-friendly recovery card | "What happened + Why + What to do next" pattern |

---

## 4. Screen & Experience Architecture

### 4.1 Flagship Member Experience
- **Home Dashboard (`MemberHomeScreen`)**: Communicates Today's workout $\rightarrow$ Upcoming booking $\rightarrow$ Progress $\rightarrow$ AI insight $\rightarrow$ Quick action dock.
- **Workout Tracker (`WorkoutSessionScreen`)**: Live stopwatch, set-by-set weight and rep logging, 60s rest countdown timer, and volume summary.
- **Exercise Library (`ExerciseDetailScreen`)**: Biomechanical form cues, execution steps, target anatomy, and estimated 1RM.
- **Progress & Analytics (`ProgressScreen`)**: Weekly tonnage bar chart, personal records timeline, and 30-day attendance heatmap.
- **Nutrition & Fuel (`NutritionScreen`)**: Calorie budget ring, macro distribution (Protein, Carbs, Fats), and hydration tracker.
- **Daily Bio-Check-In (`DailyCheckInScreen`)**: Subjective sliders (Soreness, Sleep, Stress, Energy) with instant AI Readiness calculation.
- **FitCore AI Coach (`AICoachScreen`)**: Conversational companion with recommendation chips and actionable deep links.
- **Wearables & Sensors (`WearablesScreen`)**: Apple Watch, Whoop, Garmin sync status, resting HR, HRV, and sleep stages.
- **Notifications Hub (`NotificationsScreen`)**: Categorized feeds for booking waitlist promotions, payment receipts, and achievements.
- **Profile & Settings (`ProfileScreen`, `SettingsScreen`)**: Membership tier, digital pass, biometric lock, theme toggle, and data export.

### 4.2 Staff Command Centers
- **Trainer Hub (`TrainerHomeScreen`)**: Today's PT & class schedule, 1-tap attendance marking, assigned clients roster, and consistency meters.
- **Reception Desk (`ReceptionHomeScreen`)**: Live member lookup, turnstile scan feed, emergency gate override, and arrears flags.
- **Outlet Manager (`OutletManagerHomeScreen`)**: Live club occupancy gauge, class utilization, equipment & IoT device health, staff on-duty roster.
- **Organisation Owner (`OrganisationOwnerHomeScreen`)**: Executive multi-branch comparison (Perth CBD, Fremantle, South West), MRR tracking, and network retention.
- **Finance Center (`FinanceHomeScreen`)**: Revenue ledger, collected volume, dunning arrears, Stripe gateway, and Xero sync status.
- **Superadmin Console (`SuperadminHomeScreen`)**: Global tenant health, AI compute token metrics, fleet controllers, and security audit feed.
