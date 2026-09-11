# Enterprise Organisation Management

## 1. Overview
The Enterprise Organisation model represents the supreme legal entity and administrative boundary in FitCore. Large enterprises operate holding structures or multi-franchise groups managing several distinct trading brands and geographic clusters.

## 2. Organisation Metadata & Schema
In Day 51, `Organisation` is extended with enterprise identity attributes:
* `organisationType`: E.g., `FITNESS_CLUB`, `FRANCHISE_NETWORK`, `CORPORATE_CHAIN`, `BOUTIQUE_COLLECTIVE`.
* `legalName`: Official registered corporate entity name.
* `displayName`: Public commercial trading name.
* `industry`: Primary vertical classification (`Fitness & Wellness`, `Pilates & Yoga`, `Performance Athletics`).
* `defaultLocale`: Standard regional formatting (`en-AU`, `en-US`, `en-GB`).
* `contactEmail` & `contactPhone`: Headquarters compliance contacts.
* `website`: Primary corporate digital portal.

## 3. Boundary & Isolation Guarantees
* All child entities (`OrganisationBrand`, `Outlet`, `EnterprisePolicy`, `EnterpriseRoleAssignment`, `CustomDomain`) strictly enforce `organisationId` foreign key relations.
* Multi-tenant queries always scope to the authenticated user's organization context, preventing cross-tenant leakage.
* Superadmins can observe across organizations with audit-logged platform privileges.
