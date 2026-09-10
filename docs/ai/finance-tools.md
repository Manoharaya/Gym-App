# AI Finance Tool Registry

## Architecture & Security Boundary

The `FinanceToolRegistry` exposes **19 strictly READ-ONLY tools** executed on behalf of the AI Finance Assistant.

```
                  ┌───────────────────────────────┐
                  │    AI Finance Assistant       │
                  └──────────────┬────────────────┘
                                 │
                     [Read-Only Tool Dispatch]
                                 ▼
                  ┌───────────────────────────────┐
                  │      FinanceToolRegistry      │
                  └──────────────┬────────────────┘
                                 │
     ┌───────────────────┬───────┴───────────┬─────────────────────┐
     ▼                   ▼                   ▼                     ▼
FinancialAnalytics  RecurringMetrics  AccountingHealth    DataQualityService
(Day 41 Ledger)     (Day 42 Billing)  (Day 43 Sync)       (Day 41 Integrity)
```

---

## Complete Tool Inventory

| # | Tool Name | Description | Authoritative Service |
|---|---|---|---|
| 1 | `getRevenueSummary` | Gross, net, refunds for a period and currency | `FinancialAnalyticsService.getOverview` |
| 2 | `getRevenueTrend` | Daily/weekly revenue time series | `FinancialAnalyticsService.getRevenueTrends` |
| 3 | `getMembershipRevenue` | Revenue specifically originating from membership plans | `FinancialAnalyticsService.getPlanPerformance` |
| 4 | `getOutletPerformance` | Outlet-by-outlet financial breakdown | `FinancialAnalyticsService.getOutletPerformance` |
| 5 | `getPlanPerformance` | Revenue per membership tier/plan | `FinancialAnalyticsService.getPlanPerformance` |
| 6 | `getPaymentSummary` | Succeeded vs failed payments & success rate | `FinancialAnalyticsService.getOverview` |
| 7 | `getInvoiceSummary` | Paid vs open invoices & outstanding totals | `FinancialAnalyticsService.getInvoices` |
| 8 | `getOverdueInvoices` | Overdue invoice counts and amounts | `FinancialAnalyticsService.getOverview` |
| 9 | `getOutstandingBalances` | Unpaid invoices and debtor balances | `FinancialAnalyticsService.getInvoices` |
| 10 | `getRefundSummary` | Refund totals and percentage refund rate | `FinancialAnalyticsService.getOverview` |
| 11 | `getRecurringBillingSummary` | Recurring billed, collected, failed, and schedules | `RecurringMetricsService.getMetrics` |
| 12 | `getCollectionRate` | Recurring collection efficiency percentage | `RecurringMetricsService.getMetrics` |
| 13 | `getRecoveryRate` | Dunning and retry recovery efficiency | `RecurringMetricsService.getMetrics` |
| 14 | `getDunningSummary` | Active dunning cases & overdue amounts | `RecurringMetricsService.getMetrics` |
| 15 | `getFinancialComparison` | Period-over-period comparative metrics | `FinanceComparisonService` |
| 16 | `getAccountingSyncStatus` | Connection health, token state, last sync | `AccountingHealthService.getHealth` |
| 17 | `getAccountingReconciliationSummary` | Unresolved sync conflicts & mismatches | `AccountingConflictService.listConflicts` |
| 18 | `getFinancialDataQuality` | Integrity rating, missing outlet links | `FinancialDataQualityService.assessDataQuality` |
| 19 | `getFinancialMetricDefinition` | Canonical accounting formula & limitations | `CANONICAL_FINANCIAL_METRICS` |

---

## Immutability Guarantee

None of the above tools perform `create`, `update`, `delete`, `executePayment`, `refund`, or `sync` triggers. Any request attempting mutation is rejected by `FinanceSafetyService`.
