# FitCore — Multi-Tenant Fitness SaaS & Cross-Platform Mobile Platform

FitCore is a scalable, enterprise-grade cross-platform fitness platform engineered for high-performance athletic clubs, gym chains, and strength facilities. The platform is initially tailored for **Second Wind Athletic Club** in Perth, Western Australia, while architected from Day 1 to support hundreds of organisations, multi-outlet management, role-based workflows, wearable telemetry, and AI-driven athletic coaching.

---

## 🏗️ Architecture Highlights

- **Multi-Tenant Hierarchy**:
  ```text
  Platform → Organisation → Outlet → User → Role → Permissions
  ```
- **Zero Hardcoding**: Second Wind Athletic Club and Perth CBD are isolated strictly as development seed data. The core platform architecture is completely multi-tenant agnostic.
- **Strict Layer Decoupling**:
  - `Screen` → `Hook` → `Feature Service` → `API Client` → `Backend API`
  - `Screen` → `Store/Hook` → `Storage Abstraction` → `Hardware Enclave Storage`
  - `Mobile App` → `FitCore API` → `AI Orchestration Service` → `LLM Provider`
- **Expo Prebuild**: Pure TypeScript development with automated generation of native iOS (`Podfile`) and Android projects for Apple HealthKit, Android Health Connect, and NFC hardware.

---

## 💻 Technology Stack

| Domain           | Technology                                            |
| :--------------- | :---------------------------------------------------- |
| **Mobile Core**  | React Native 0.74, Expo SDK 51, TypeScript 5.5        |
| **Monorepo**     | pnpm workspaces, Turborepo 2.1                        |
| **Client State** | Zustand                                               |
| **Server State** | TanStack Query v5                                     |
| **Navigation**   | React Navigation v6 (Native Stack)                    |
| **Validation**   | Zod                                                   |
| **Security**     | `expo-secure-store` (iOS Keychain / Android Keystore) |
| **Testing**      | Jest, React Native Testing Library                    |

---

## 📁 Repository Structure

```text
fitcore/
│
├── apps/
│   ├── mobile/             # React Native Expo cross-platform mobile app
│   │   ├── src/
│   │   │   ├── app/        # App entry and Day 1 verification shell
│   │   │   ├── components/ # 14 Design system accessible primitives
│   │   │   ├── features/   # 24 Isolated feature domain modules
│   │   │   ├── hooks/      # useTenant, useAuth, useTheme, usePermissions
│   │   │   ├── navigation/ # Role-segregated navigation architecture
│   │   │   ├── providers/  # Tenant, Auth, Theme, QueryClient, ErrorBoundary
│   │   │   ├── services/   # Storage, Logger, API, Health, Wearables, AI
│   │   │   ├── store/      # Zustand client stores (tenantStore, authStore)
│   │   │   └── theme/      # Colors, typography, spacing, radius, shadows
│   │   ├── app.config.ts   # Expo prebuild configuration
│   │   └── metro.config.js # Monorepo-aware Metro bundler config
│   ├── web/                # Future Next.js member portal
│   └── admin/              # Future Superadmin enterprise console
│
├── packages/
│   ├── types/              # Domain entities, tenant context, permissions, AI
│   ├── config/             # Environment validation and dev seed data
│   ├── constants/          # Roles, scopes, error codes, HTTP headers
│   ├── validation/         # Zod schemas (auth, tenant, pagination)
│   ├── api-client/         # Production HTTP client with tenant injection
│   ├── ui/                 # Cross-platform design tokens
│   └── utils/              # Permission evaluators, date, currency helpers
│
├── services/
│   ├── api/                # Future REST API service
│   ├── ai/                 # Future AI orchestration gateway
│   └── workers/            # Future background telemetry workers
│
├── infrastructure/
│   ├── docker/             # Local database and redis compose
│   └── aws/                # Cloud CDK / Terraform manifests
│
├── docs/
│   ├── architecture/       # System and mobile architectural specifications
│   ├── security/           # Mobile security and health data specs
│   └── decisions/          # ADR-001: Mobile stack & monorepo selection
│
├── .github/workflows/ci.yml # Automated CI pipeline
└── pnpm-workspace.yaml     # pnpm workspace definition
```

---

## 🚀 Quick Start Guide

### Prerequisites

- Node.js `v20.x` or higher
- pnpm `v10.x` or higher (`npm install -g pnpm`)
- Git

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Configuration

Copy the environment template:

```bash
cp .env.example .env.development
```

_(Environment configurations for development, staging, and production are pre-structured with non-secret placeholders)._

### 3. Start the Development Server

```bash
pnpm dev
# or start mobile directly
pnpm --filter @fitcore/mobile start
```

### 4. Run on Mobile Emulators / Devices

#### Android Development

Requires Android Studio, SDK Platform 34, and a running Android Virtual Device (AVD).

```bash
pnpm --filter @fitcore/mobile android
```

#### iOS Development (macOS required)

Requires Xcode and CocoaPods installed.

```bash
pnpm --filter @fitcore/mobile ios
```

---

## 🧪 Testing, Quality & Scripts

Run commands across the entire monorepo with Turborepo caching:

```bash
# Run unit tests across packages and mobile app
pnpm test

# Run strict TypeScript typechecking
pnpm typecheck

# Run ESLint validation
pnpm lint

# Check code formatting with Prettier
pnpm format:check

# Auto-format all code
pnpm format

# Clean build caches and temporary outputs
pnpm clean
```

---

## 🔒 Security & Sensitive Data Policy

FitCore is built to process sensitive biometric, wearable, and fitness data:

1. **Never commit secrets**: No API keys or database credentials belong in the mobile app.
2. **Never log PII**: The centralized logger automatically redacts authorization headers, health metrics, and personal credentials.
3. **Hardware Storage Only**: Tokens must live exclusively in iOS Keychain or Android Keystore via `SecureStorage`.
4. Detailed security documentation is maintained in [`docs/security/mobile-security.md`](docs/security/mobile-security.md).

---

## 🗺️ Roadmap & Next Steps (Day 2+)

- **Day 2**: Authentication flow (Sign-in UI, Registration, biometric session unlock).
- **Day 3**: Multi-tenant outlet selector & staff profile switching.
- **Day 4**: Member dashboard & workout logging engine.
- **Day 5**: Apple Health & Health Connect biometric synchronization.
- **Day 6**: FitCore AI coach orchestration wrapper & client chat interface.
