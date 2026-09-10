# Chart of Accounts & Tax Mapping

## 1. Chart of Accounts Discovery

Once connected, FitCore queries the external provider to retrieve active General Ledger accounts:
- Account ID / Code
- Account Name
- Account Type (`REVENUE`, `EXPENSE`, `BANK`, `CURRENT_ASSET`, `LIABILITY`)
- Currency (if multi-currency enabled)
- Active status

FitCore presents these accounts to finance staff to configure explicit mappings. Account mappings are **never guessed or inferred by AI**.

---

## 2. Revenue Category Mapping

FitCore reuses the Day 41 transaction taxonomy for accounting revenue mappings:

| FitCore Category | Description | Typical External GL Account |
| :--- | :--- | :--- |
| `MEMBERSHIP_PAYMENT` | Recurring membership dues | 200 - Membership Dues Revenue |
| `MEMBERSHIP_RENEWAL` | Term renewals | 200 - Membership Dues Revenue |
| `MEMBERSHIP_UPGRADE` | Tier upgrade adjustments | 205 - Subscription Upgrades |
| `PERSONAL_TRAINING` | 1-on-1 PT sessions & packages | 210 - Personal Training Income |
| `CLASS` | Group fitness & workshop fees | 220 - Group Fitness Revenue |
| `RETAIL` | Merchandise, supplements, gear | 230 - Retail Merchandise Sales |
| `OTHER_SERVICE` | Locker hire, towel service, creche | 240 - Ancillary Service Income |
| `MANUAL_PAYMENT` | Front desk cash/POS collections | 250 - Miscellaneous Gym Revenue |
| `PAYMENT_ACCOUNT` | Bank/clearing account for deposits | 090 - Stripe/Bank Clearing Account |
| `REFUND_ACCOUNT` | Account debited for customer refunds | 200 - Membership Dues (or Contra) |

---

## 3. Outlet-Level Granularity

- By default, mappings apply at the **Organisation** level (`outletId: null`).
- If a franchise maintains distinct GL accounts per club (e.g., Club A Membership Revenue vs Club B Membership Revenue), an optional `outletId` is configured on `AccountingMapping`.
- Transaction routing always checks for an outlet-specific mapping first, falling back to the organisation default.

---

## 4. Tax Code Mapping

- Provider-discovered tax rates (e.g. Australian GST 10%, US State Sales Tax, New Zealand GST 15%) are linked through `AccountingTaxMapping`.
- FitCore tax identifiers (`STANDARD_TAX`, `ZERO_RATED`, `EXEMPT`) map to external tax codes (`OUTPUT`, `EXEMPT`, `TAX001`).
- Eliminates hardcoded tax assumptions and respects provider-specific tax engines.
