# Deterministic Policy Inheritance & Hard Security Ceilings

## 1. The Inheritance Cascade
Effective policies are resolved hierarchically from most general to most specific:

```
[ Tier 1: ORGANISATION ]  --> Baseline enterprise rules & global hard ceilings
           |
[ Tier 2: BRAND ]         --> Brand identity and customer experience overrides
           |
[ Tier 3: REGION ]        --> Regional legal, tax, or operational adaptations
           |
[ Tier 4: OUTLET ]        --> Location-specific adjustments
```

## 2. Immutable Hard Security Ceilings (`isHardCeiling: true`)
A critical architectural innovation in FitCore Enterprise is the **Hard Security Ceiling**.

When an upstream policy (e.g. at the `ORGANISATION` level) is marked `isHardCeiling: true`, child scopes (Brands, Regions, Outlets) **CANNOT loosen or bypass that restriction**:
* **Boolean Enforcements**: If `mfaRequired: true` or `allowExternalLlm: false` is set as a hard ceiling, child tiers attempting to set `false` or `true` respectively are rejected with `HardCeilingViolationException` during creation, or automatically clamped back to the secure ceiling during policy resolution.
* **Numeric Limits**: If `maxDiscountPercent: 15` is a hard ceiling, an outlet attempting to set `maxDiscountPercent: 30` is clamped to 15.

## 3. Interactive Policy Simulator (`POST /api/v1/enterprise/policies/preview`)
Administrators can preview how a proposed policy configuration would behave before applying it:
* Resolves the current baseline effective configuration.
* Simulates merging the proposed override.
* Returns a field-by-field diff (`UNCHANGED`, `ADDED`, `MODIFIED`, `CEILING_BLOCKED`).
* Flags any hard ceiling violations and indicates whether the change is safe to apply.
