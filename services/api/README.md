# FitCore Core API Service

## Purpose

Production Node.js / TypeScript RESTful backend service providing:

- Multi-tenant data isolation and middleware validation (`x-organisation-id`, `x-outlet-id`).
- Role-based and scope-based permission evaluation.
- Authentication, JWT token issuance, and hardware session binding.
- Integration gateways: Stripe, Xero, Kisi / Salto door access controllers.

## Architecture

- Shares domain types from `@fitcore/types`.
- Enforces request validation using `@fitcore/validation`.
- Standardized error codes from `@fitcore/constants`.

_Backend implementation scheduled for subsequent project milestones._
