# Multi-Outlet Benchmarking & Distribution Analysis

## 1. Overview
The `OutletBenchmarkService` computes statistically grounded distribution metrics across an organisation's network of gym locations. Rather than comparing an outlet solely against an arbitrary static target, benchmarking evaluates where an outlet sits relative to network peers and historical trajectories.

---

## 2. Statistical Distribution Metrics

For each operational metric across comparable outlets, the benchmark service computes:
* **Minimum ($Min$)**: Lowest recorded value among active comparable outlets.
* **Lower Quartile ($p_{25}$)**: 25th percentile mark; outlets below this fall into the lower quartile.
* **Median ($p_{50}$)**: The middle value separating the upper and lower halves of the network. The median is favored over simple arithmetic average to eliminate distortion from extreme outliers.
* **Upper Quartile ($p_{75}$)**: 75th percentile mark; outlets at or above this represent the top quartile.
* **Maximum ($Max$)**: Highest recorded value in the network.
* **Network Mean ($\mu$)**: Arithmetic mean for macro-level network context.

---

## 3. Benchmarking Cohort Selection

Comparison is only meaningful between similar operational entities. The benchmark engine supports cohort partitioning by:
1. **Currency Cohorts**: Outlets operating under different fiat currencies (`AUD` vs `NPR`) are strictly segregated into independent benchmark cohorts.
2. **Facility Format**: Flagship full-service fitness centers vs 24/7 express gyms vs boutique studios.
3. **Maturity / Lifecycle Stage**: Newly opened gyms (< 6 months in ramp-up stage) are marked with an onboarding flag so their growth velocity is not mischaracterized as underperformance against established branches.
