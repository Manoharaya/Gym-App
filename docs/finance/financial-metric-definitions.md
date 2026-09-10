# Financial Metric Definitions

## Overview

The FitCore Financial Intelligence Foundation calculates deterministic, cash-basis analytics on top of the Day 6 authoritative payment and invoice source-of-truth tables. All financial computations adhere to the rules outlined below.

---

## Precision and Unit Rules

1. **Integer Minor Units (`amountMinor: Int`)**:
   - All internal storage and intermediate calculations occur in integer minor units (e.g. cents for AUD/USD, paisa for NPR).
   - Zero floating-point drift: Floating-point conversions occur only at the final presentation layer (`amountMinor / 100`).

2. **Multi-Currency Isolation**:
   - Currencies (`AUD`, `USD`, `NPR`, etc.) are partitioned into separate buckets.
   - Financial aggregations never mix currencies or apply speculative conversion rates without explicit conversion records.
   - Each currency generates its own distinct `grossRevenue`, `netRevenue`, `totalRefunds`, and `outstandingBalance`.

---

## Canonical Metric Formulas

### 1. Gross Revenue
$$\text{Gross Revenue} = \sum_{\substack{t \in \text{Transactions} \\ \text{status} = \text{SUCCEEDED}}} t.\text{amountMinor}$$
- **Scope**: Includes all recognized cash receipts from successful payments (memberships, add-ons, fees).
- **Excludes**: Pending, processing, failed, or cancelled transactions.

### 2. Net Revenue
$$\text{Net Revenue} = \text{Gross Revenue} - \text{Total Refunds}$$
- Reflects the true cash retained by the organisation after subtracting processed refunds.

### 3. Total Refunds
$$\text{Total Refunds} = \sum_{\substack{r \in \text{Refunds} \\ \text{status} = \text{COMPLETED}}} r.\text{amountMinor}$$
- Authoritative source: `PaymentRefund` records linked to successful payment transactions.

### 4. Refund Rate
$$\text{Refund Rate (\%)} = \begin{cases} \left(\frac{\text{Total Refunds}}{\text{Gross Revenue}}\right) \times 100 & \text{if Gross Revenue} > 0 \\ 0.0 & \text{if Gross Revenue} = 0 \end{cases}$$

### 5. Payment Success Rate
$$\text{Payment Success Rate (\%)} = \begin{cases} \left(\frac{N_{\text{SUCCEEDED}}}{N_{\text{SUCCEEDED}} + N_{\text{FAILED}}}\right) \times 100 & \text{if } (N_{\text{SUCCEEDED}} + N_{\text{FAILED}}) > 0 \\ 100.0 & \text{otherwise} \end{cases}$$

### 6. Outstanding Invoices & Balances
$$\text{Outstanding Balance} = \sum_{\substack{i \in \text{Invoices} \\ \text{status} \in \{\text{OPEN}, \text{PAST\_DUE}\}}} i.\text{amountDueMinor}$$
- Tracks recognized debt awaiting collection without counting it as cash-basis revenue.

### 7. Average Transaction Value (ATV)
$$\text{ATV} = \begin{cases} \frac{\text{Gross Revenue}}{N_{\text{SUCCEEDED}}} & \text{if } N_{\text{SUCCEEDED}} > 0 \\ 0.0 & \text{otherwise} \end{cases}$$

### 8. Percentage Change (Period-over-Period)
$$\text{Change (\%)} = \begin{cases} \left(\frac{\text{Current} - \text{Previous}}{\text{Previous}}\right) \times 100 & \text{if Previous} > 0 \\ \text{null} & \text{if Previous} = 0 \text{ (avoids division by zero)} \end{cases}$$
