# Mobile Wearables Integration Guide

## Overview
The mobile app (`apps/mobile`) includes a complete feature module under `src/features/wearables/` allowing members to manage wearable connections, review synchronized telemetry, inspect sync health, and control privacy permissions.

## Architecture
- `services/wearablesService.ts`: Type-safe REST client communicating with `/api/v1/wearables`.
- `screens/`:
  - `WearablesHomeScreen.tsx`: Today's activity telemetry cards, active provider connections, available platforms (Wave 1 & Wave 2), privacy guarantee banner.
  - `WearableProviderDetailScreen.tsx`: Provider capability matrix, required OS permissions, connect CTA.
  - `WearableConnectionScreen.tsx`: Connection status, telemetry synchronization button, granted scopes, disconnect dialog.
  - `WearableDataScreen.tsx`: Filter chips by health data type (`STEPS`, `HEART_RATE`, `ACTIVE_CALORIES`, `SLEEP`, etc.), paginated telemetry cards with source attribution.
  - `WearableSyncStatusScreen.tsx`: Detailed sync logs, duration, record counts, retry failed sync, rate-limit warnings.
  - `WearablePrivacyScreen.tsx`: Data ownership guarantee, active `WEARABLE_DATA` compliance consent, trainer access rules, self-service data deletion.
- `MemberHomeScreen.tsx`: Integrated lightweight wearable status widget displaying today's steps, active calories, and connection link.

## Native Permissions Setup
- **iOS (`app.config.ts`)**: HealthKit entitlement and `NSHealthShareUsageDescription` / `NSHealthUpdateUsageDescription`.
- **Android (`app.config.ts`)**: Health Connect read permissions (`READ_STEPS`, `READ_HEART_RATE`, `READ_ACTIVE_CALORIES_BURNED`, `READ_SLEEP`, `READ_DISTANCE`).
