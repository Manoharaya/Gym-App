# Financial Intelligence Domain

## Overview
The **Financial Intelligence** domain consolidates cash flows, subscription billing, invoice balances, and multi-currency performance across FitCore facilities.

---

## Strict Multi-Currency Separation

Multi-currency gym organizations (e.g. chains operating across Australia, the United States, and Nepal) must never sum heterogeneous currencies into a single aggregate number. 

FitCore enforces:
1. **Per-Currency Bucketing**: Revenue, refunds, and receivables are partitioned by ISO 4217 currency code (e.g., `AUD`, `USD`, `NPR`).
2. **Primary Currency Identification**: The dashboard identifies the organization's primary billing currency and renders auxiliary currencies in isolated tabs or sub-cards.
3. **No Blended Exchange Rates**: Financial BI does not estimate or synthesize arbitrary FX conversions without licensed banking/FX integrations.

```json
{
  "primaryCurrency": "AUD",
  "currencies": {
    "AUD": {
      "grossRevenue": 15000.00,
      "refunds": 200.00,
      "netRevenue": 14800.00,
      "currency": "AUD"
    },
    "USD": {
      "grossRevenue": 4200.00,
      "refunds": 0.00,
      "netRevenue": 4200.00,
      "currency": "USD"
    }
  }
}
```

---

## Authoritative Revenue Calculations

### 1. Gross Revenue
$$\text{Gross Revenue} = \sum \text{Amount of SUCCEEDED Payment Transactions}$$
* Stored in database as integer minor units (cents / paisa) and rendered to two decimal places.

### 2. Refunds
$$\text{Refunds} = \sum \text{Amount of Processed Payment Refunds}$$

### 3. Net Cash Revenue
$$\text{Net Revenue} = \text{Gross Revenue} - \text{Refunds}$$

### 4. Payment Success Rate
$$\text{Payment Success Rate} = \frac{\text{Successful Payment Attempts}}{\text{Total Payment Attempts (Successful + Failed)}} \times 100$$
* Failed retries and card declines are tracked to flag merchant gateway anomalies or card expiration trends.

---

## Invoicing & Outstanding Debt

* **Outstanding Balance**: Total balance due on `OPEN` and `OVERDUE` invoices. Does not inflate cash revenue metrics until settled.
* **Overdue Invoices**: Count and minor-unit sum of invoices exceeding their specified payment due date.
* **Invoice Aging Buckets**: Categorized into:
  * `CURRENT`: Due within 0–30 days.
  * `PAST_DUE_30`: 31–60 days past due.
  * `PAST_DUE_60`: 61–90 days past due.
  * `PAST_DUE_90_PLUS`: > 90 days past due (collections candidate).
