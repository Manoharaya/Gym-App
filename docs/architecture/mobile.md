# FitCore Mobile Architecture Specification

## Technology Stack

- **Framework**: React Native 0.74.5
- **Platform Toolkit**: Expo SDK 51 (Prebuild / Development-build architecture)
- **Language**: TypeScript 5.5 (Strict Mode enforced)
- **State Management**:
  - Client / App State: **Zustand**
  - Server State & Cache: **TanStack Query v5**
- **Navigation**: React Navigation v6 (Native Stack)
- **Styling**: Vanilla React Native StyleSheet using centralized design system tokens

---

## Expo Prebuild Architecture

The mobile application is deliberately configured for **Expo Prebuild** (`expo prebuild`) and custom development builds (`npx expo run:ios`, `npx expo run:android`), rather than limiting development to Expo Go.

This strategy ensures that when native platform integrations are introduced in Wave 1 and Wave 2, native code and config plugins can be generated without architectural refactoring:

1. **Apple HealthKit (`HealthKit`)**: Requires native entitlement provisioning and background delivery capabilities.
2. **Android Health Connect (`androidx.health.connect`)**: Requires native manifest permissions and intent filters.
3. **Hardware Biometrics**: Secure hardware enclave access via Face ID / Touch ID / Android BiometricPrompt.
4. **NFC / Access Control**: High-frequency NFC card emulation and scanner capabilities for facility turnstiles.
5. **Secure Hardware Keystore / Keychain**: `expo-secure-store` utilizing hardware-backed master keys.

---

## Navigation Architecture

Navigation is strictly segregated by role and permission boundaries:

```text
RootNavigator
│
├── AuthNavigator (Login, Register, Forgot Password, Tenant Select)
│
└── AppNavigator
      │
      ├── MemberNavigator (Dashboard, Active Workout, Bookings, Progress, AI Coach, Profile)
      │
      ├── TrainerNavigator (Client Roster, Portfolio, Scheduling, Program Prescription)
      │
      ├── ReceptionNavigator (Fast POS, Access Turnstile Check-in, Class Rosters, Walk-ins)
      │
      ├── OutletManagerNavigator (Facility Operations, Staff Rostering, Branch Reports)
      │
      ├── FinanceNavigator (Ledger, Invoices, Payment Runs, Xero Reconciliation)
      │
      └── OrganisationOwnerNavigator (Multi-Branch Analytics, Brand Config, Exec Summaries)
```

Staff navigators are completely unmounted for member sessions, preventing privilege leakage through client-side routing.

---

## Design System & Accessibility

The UI layer is built on **14 atomic primitives** in `apps/mobile/src/components/primitives/`:

- `Button`
- `Text`
- `Input`
- `Card`
- `Avatar`
- `Badge`
- `Divider`
- `Screen`
- `Modal`
- `BottomSheet`
- `Loading`
- `EmptyState`
- `ErrorState`
- `IconButton`

Every primitive complies with accessibility standards:

- Explicit `accessibilityRole`, `accessibilityLabel`, and `accessibilityState`.
- Guaranteed 44x44 dp minimum touch target dimensions.
- Scalable typography supporting system font size preferences (`allowFontScaling`).
- High-contrast athletic dark palette meeting WCAG 2.1 AA requirements.
