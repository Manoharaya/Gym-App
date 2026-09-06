# FitCore Contribution Guidelines

## Branching Model & Git Flow

We follow a structured branch naming convention:

| Branch Type        | Format                             | Example                      |
| :----------------- | :--------------------------------- | :--------------------------- |
| **Production**     | `main`                             | `main`                       |
| **Development**    | `develop`                          | `develop`                    |
| **Features**       | `feature/<module>-<description>`   | `feature/auth-biometrics`    |
| **Bugfixes**       | `fix/<issue-number>-<description>` | `fix/104-token-refresh-leak` |
| **Chores / Infra** | `chore/<description>`              | `chore/upgrade-expo-sdk-51`  |

---

## Commit Message Conventions

Commit messages must adhere to the Conventional Commits specification:

```text
<type>(<scope>): <subject>

[optional body]
```

### Allowed Types

- `feat`: A new user-facing feature or domain capability.
- `fix`: A bug fix.
- `chore`: Changes to build tools, dependencies, or monorepo config.
- `docs`: Documentation updates.
- `refactor`: Code change that neither fixes a bug nor adds a feature.
- `test`: Adding or correcting tests.

---

## Code Quality Standards

Before opening a pull request, verify all local checks pass:

```bash
# 1. Formatting
pnpm format:check

# 2. Linting
pnpm lint

# 3. Type Checking
pnpm typecheck

# 4. Automated Tests
pnpm test
```

### Architectural Guardrails

1. **Never use `any` or `@ts-ignore`** without documented technical justification.
2. **Never call external LLM APIs directly** from mobile client components.
3. **Never write raw storage calls** without using the `SecureStorage` / `LocalStorage` abstraction.
4. **Never hardcode tenant names** (e.g. Second Wind) outside of development seed fixtures.
