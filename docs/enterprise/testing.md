# Enterprise Test Suite & Verification Matrix

## 1. Testing Strategy
The Day 51 Enterprise Administration test suite exercises the complete enterprise layer via end-to-end integration tests (`services/api/test/enterprise.e2e-spec.ts`):

1. **Brand Lifecycle**: Creation, code uniqueness, updating, safe outlet reassignment on archival.
2. **Enterprise Outlets**: Outlet creation with brand association, regional classification, brand reassignment transfer, zero-data-loss archival.
3. **Scoped Role Delegation**: Scoped assignments across scopes (`PLATFORM`, `ORGANISATION`, `BRAND`, `REGION`, `OUTLET`).
4. **Privilege Escalation Defense**: Verified rejection when an actor attempts to assign an equal or higher rank role.
5. **Hierarchical Policy Inheritance**: Deterministic merging across `ORGANISATION` -> `BRAND` -> `REGION` -> `OUTLET`.
6. **Hard Security Ceiling Enforcement**: Verified rejection when a child scope attempts to loosen a parent ceiling (`isHardCeiling: true`).
7. **Policy Simulator**: Previews policy overrides, produces field diffs, and alerts on blocked security ceilings.
8. **Custom Domains**: Registration, DNS TXT challenge token generation, CNAME resolution, and SSL status activation.
9. **Hierarchical Branding**: Computed effective branding merging default -> org -> brand -> outlet.
10. **Staff Multi-Outlet Assignments & Transfers**: Preserves historical records, handles primary/secondary role scopes.
11. **Tenant Isolation**: Verifies cross-tenant boundaries are strictly enforced.
