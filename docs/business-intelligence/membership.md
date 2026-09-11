# Membership Intelligence Domain

## Overview
The **Membership Intelligence** domain provides deep operational clarity on gym member population movements, plan distribution mix, and membership lifecycle dynamics.

---

## Authoritative Net Member Change Formula

Gym growth is governed strictly by the formula:
$$\text{Net Member Change} = \text{New Members} + \text{Reactivated Members} - \text{Cancelled Members}$$

### Definitions:
1. **New Members**: Members whose `MemberMembership` was first activated (`activatedAt`) within the selected date boundary.
2. **Reactivated Members**: Members activating a new membership within the period who previously held a `CANCELLED` membership.
3. **Cancelled Members**: Members whose membership transitioned to `CANCELLED` status (`cancelledAt`) within the period.
4. **Returning Members**: Equivalent to reactivated members; tracked to evaluate win-back campaign effectiveness.
5. **Suspended / Paused Members**: Active contracts on temporary hold; tracked separately from cancellations.
6. **Expiring Members**: Active contracts set to expire within the upcoming 30-day forward window without scheduled auto-renewal.

---

## Membership Growth Rate
$$\text{Growth Rate} = \frac{\text{Net Member Change}}{\text{Prior Active Members}} \times 100$$
* If `Prior Active Members == 0`, `growthRate` returns `null` to avoid infinite division artifacts.

---

## Membership Plan Distribution
Provides a breakdown of active memberships across configured membership plans:
* `planId`: Unique identifier of the plan.
* `planName`: Commercial name (e.g., *Gold Annual*, *Standard Monthly*).
* `activeCount`: Total active contracts enrolled in this plan.
* `sharePercentage`: Proportion of total active member base enrolled in this plan:
  $$\text{Share Percentage} = \frac{\text{Plan Active Count}}{\text{Total Active Count}} \times 100$$

---

## Member Lifecycle Breakdown
Tracks the distribution of members across lifecycle phases:
* `ONBOARDING`: First 14 days of membership.
* `ENGAGED`: Active attendance and routine workout completion (> 3 visits/week).
* `MAINTAINING`: Regular attendance (1–2 visits/week).
* `AT_RISK`: Zero attendance over 14 consecutive days.
* `DORMANT`: Zero attendance over 30 consecutive days.
* `CANCELLED`: Explicit contract termination.
