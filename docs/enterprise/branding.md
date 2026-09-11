# Enterprise Branding & Visual Hierarchy

## 1. Overview
FitCore Enterprise provides hierarchical white-labeling. An organisation defines global styling tokens, brands provide distinct visual palettes, and individual clubs can supply localized overrides (e.g. customized club email banners or locally tailored accent colors).

## 2. Resolution Order
The effective branding resolver (`EnterpriseBrandingService.getEffectiveBranding`) merges assets using the following deterministic cascade:
1. `DEFAULT_BRANDING`: Fallback system tokens (`#6366F1` indigo primary, Inter typography).
2. `ORGANISATION`: Corporate identity across all facilities.
3. `BRAND`: Overrides corporate defaults with brand-specific logos, dark-mode logos, and palettes.
4. `OUTLET`: Overrides specific club assets (e.g. local email header banner, facility entrance images) while keeping parent brand fonts intact.

## 3. Endpoints
* `POST /api/v1/enterprise/branding`: Upserts scoped branding configuration.
* `GET /api/v1/enterprise/branding/effective`: Returns computed effective theme for any organisation/brand/outlet context.
