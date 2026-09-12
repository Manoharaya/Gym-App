# Overages & Metered Billing

Billing mechanics for metered consumption beyond plan allowances.

## Overage Pricing Model
Plans configure:
- `includedAllowance`: Quantity provided as part of base subscription (e.g. 500,000 AI tokens).
- `overageAllowed`: Boolean enabling elastic consumption past the quota.
- `overageBatchSize`: Granularity of overage charging (e.g. 10,000 tokens or 100 SMS).
- `overageUnitMinor`: Minor unit cost per batch (e.g. 100 = $1.00 AUD per 10,000 tokens).

## Overage Calculation
```typescript
const overage = Math.max(0, quantityUsed - includedAllowance);
const batches = Math.ceil(overage / overageBatchSize);
const totalOverageChargeMinor = batches * overageUnitMinor;
```
Calculations use integer arithmetic to prevent fractional cent errors.
