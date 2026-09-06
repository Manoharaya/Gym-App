# ADR-001: Selection of Mobile Technology Stack & Monorepo Architecture

## Status

**ACCEPTED**

## Context

FitCore is an athletic club management and member experience platform targeting both iOS and Android from a single unified codebase. The platform must scale from an initial deployment for Second Wind Athletic Club in Perth into an enterprise multi-tenant SaaS supporting hundreds of gym brands, thousands of outlets, and millions of active members.

The architecture demands support for:

- Near-native performance and 60fps animations for workout logs.
- Native hardware integration (Apple HealthKit, Android Health Connect, NFC turnstile scanners, Face ID/Biometrics).
- Strict code sharing with future web and admin portals (domain types, validation schemas, API client).
- Scalable state management separating server cache from ephemeral UI state.

---

## Decision

### 1. React Native + Expo (Prebuild Strategy)

- **Why React Native**: Provides true native UI components, native threading, and cross-platform consistency for iOS and Android while leveraging the vast JavaScript/TypeScript ecosystem.
- **Why Expo**: Expo modernizes React Native development with configuration plugins, streamlined OTA updates, EAS build infrastructure, and automated native manifest generation.
- **Why Prebuild (Not Expo Go)**: Expo Go lacks support for custom native modules. By adopting `expo prebuild`, the codebase remains pure TypeScript while generating native iOS (`Podfile`/Xcode) and Android (`build.gradle`) projects on demand for HealthKit, Health Connect, and NFC hardware.

### 2. TypeScript (Strict Mode)

- Eliminates common runtime crashes (`TypeError: undefined is not an object`).
- Enforces multi-tenant data contracts across API boundaries (`organisationId`, `outletId`, `userId`).
- Provides auto-complete and refactoring safety across 24 feature modules.

### 3. pnpm Workspaces + Turborepo

- **Why a Monorepo**: Enables seamless code reuse across `@fitcore/types`, `@fitcore/validation`, `@fitcore/api-client`, and `@fitcore/ui` without publishing packages to a private npm registry.
- **Why pnpm**: Employs hard links and symlinks to eliminate duplicate `node_modules`, saving gigabytes of disk space and preventing phantom dependency resolution bugs.
- **Why Turborepo**: Provides intelligent computation caching and parallel task pipelines for `build`, `lint`, `typecheck`, and `test`, dramatically reducing CI and local build times.

### 4. State Management: Zustand + TanStack Query v5

- **Zustand for Client State**:
  - Extremely lightweight (~1kB).
  - Unopinionated, hook-centric API without boilerplate actions or reducers.
  - Ideal for local session status, tenant switching, offline UI flags, and theme modes.
- **TanStack Query for Server State**:
  - Eliminates the anti-pattern of caching API responses in global Redux/Zustand stores.
  - Automatically handles caching, deduplication, background re-fetching, stale-time invalidation, and optimistic mutations.

---

## Consequences

- **Positive**:
  - Single source of truth for all API contracts, validation schemas, and design tokens.
  - High developer velocity: mobile and future web applications share core business domain libraries.
  - Guaranteed multi-tenant scoping: API client automatically injects headers without manual boilerplate in UI components.
- **Negative / Trade-offs**:
  - Requires developers to understand pnpm workspace symlinks and Metro monorepo resolution.
  - Native module integration requires development builds (`npx expo run:ios` / `android`) rather than simple Expo Go QR scanning.
