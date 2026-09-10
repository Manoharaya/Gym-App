# Recurring Billing & Collection Metrics

## 1. Canonical Metric Definitions

All recurring billing calculations execute in integer minor units (cents/paisa) with zero-division protection ($0 \div 0 = \text{null}$).

---

## 2. Mathematical Formulas

### 2.1 Recurring Payment Success Rate
$$\text{Success Rate} = \frac{\text{Successful Attempts}}{\text{Successful Attempts} + \text{Failed Attempts}} \times 100\%$$
- **Description**: Percentage of payment attempts that succeed immediately or via retry.
- **Safe Handling**: If denominator is 0, returns `null`.

### 2.2 Collection Rate
$$\text{Collection Rate} = \frac{\text{Recurring Collected Amount}}{\text{Recurring Billed Amount}} \times 100\%$$
- **Description**: Proportion of total billed recurring revenue collected within the period.
- **Exclusions**: Excludes voided invoices, cancelled cycles, and future unbilled schedules.

### 2.3 Recovery Rate (Dunning Efficiency)
$$\text{Recovery Rate} = \frac{\text{Amount Recovered After Initial Failure}}{\text{Amount That Initially Failed}} \times 100\%$$
- **Description**: Tracks the efficiency of retries, reminders, and staff outreach in capturing revenue that would otherwise be lost.
- **Attribution Rule**: Uses observational phrasing: *"Recovered following dunning workflow"* (avoids claiming dunning single-handedly caused recovery).

---

## 3. Executive KPI Dashboard Summary

| Metric | Type | Unit | Description |
| :--- | :--- | :--- | :--- |
| `activeSchedules` | Count | Integer | Total active recurring subscriptions. |
| `upcomingBilling` | Amount | Major Currency | Projected revenue due in next 7 days. |
| `recurringBilled` | Amount | Major Currency | Total subscription charges generated. |
| `recurringCollected` | Amount | Major Currency | Total subscription cash collected. |
| `recurringFailed` | Amount | Major Currency | Unpaid subscription balances. |
| `recurringPaymentSuccessRate` | Rate | Percentage | Ratio of successful payment attempts. |
| `collectionRate` | Rate | Percentage | Collected / Billed ratio. |
| `retryRecoveryRate` | Rate | Percentage | Recovered / Initially failed ratio. |
| `activeDunningCases` | Count | Integer | Subscriptions currently in dunning. |
| `overdueInvoicesCount` | Count | Integer | Count of invoices past their due date. |
| `overdueInvoicesAmount` | Amount | Major Currency | Sum of unpaid balances on overdue invoices. |
