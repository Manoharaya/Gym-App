# Retention Intelligence & Churn Mitigation Domain

## Overview
The **Retention Intelligence** domain monitors churn risk trajectories, tracks cancellation velocity, and assesses the efficacy of proactive retention interventions.

---

## Authoritative Retention & Churn Formulas

### 1. Retention Rate
$$\text{Retention Rate} = 100 - \text{Churn Rate}$$

### 2. Churn Rate
$$\text{Churn Rate} = \frac{\text{Cancelled Members in Period}}{\text{Prior Active Members} + \text{New Members in Period}} \times 100$$
* If the base population ($\text{Prior Active} + \text{New}$) is 0, churn rate returns `null`.

---

## Retention Risk Population Tiers

Active members are segmented into 4 risk tiers according to attendance cadence, billing status, and engagement decline:
* **High Risk**: Attendance dropped by $> 75\%$ over 30 days, or failed billing payment unresolved for $> 7$ days.
* **Elevated Risk**: Attendance dropped by $50 - 75\%$ over 30 days.
* **Moderate Risk**: Mild decrease in visits ($25 - 50\%$).
* **Low Risk**: Healthy, consistent check-in and engagement profile.

---

## Intervention Queues & Recovery Metrics

1. **Follow-Up Queue**: Count of automated and manual outreach tasks assigned to staff to re-engage at-risk members.
2. **Reactivation Queue**: Lapsed and cancelled members receiving targeted win-back campaigns.
3. **Re-engaged Members**: Members formerly flagged as High Risk who completed $\ge 3$ visits in the last 14 days following an intervention.
