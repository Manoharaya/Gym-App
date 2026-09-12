# Plan Upgrades & Proration

Seamless mid-cycle tier enhancements.

## Proration Methodology
When upgrading mid-period (e.g. from Starter $99 to Pro $299 with 15 days remaining in a 30-day month):
1. Compute unearned credit from current plan for remaining days.
2. Compute prorated charge for target plan for remaining days.
3. Compute `netAdjustmentMinor = chargeNewMinor - unearnedCurrentMinor`.
4. Issue immediate prorated invoice for `netAdjustmentMinor`.
5. Upgrade subscription's `planId` and `planVersionId`.
6. New entitlements and limits apply immediately.
