# Deterministic Proration Service

Specification for minor-cent time-weighting calculations.

## Algorithm
Let:
- $T_{total}$ = Total duration of billing cycle in milliseconds ($T_{end} - T_{start}$).
- $T_{remaining}$ = Duration remaining from effective change timestamp ($T_{end} - T_{now}$).
- $P_{current}$ = Current plan base price in minor units.
- $P_{target}$ = Target plan base price in minor units.

Then:
$$Credit_{unearned} = \lfloor \frac{P_{current} \times T_{remaining}}{T_{total}} \rceil$$
$$Charge_{target} = \lfloor \frac{P_{target} \times T_{remaining}}{T_{total}} \rceil$$
$$Adjustment_{net} = Charge_{target} - Credit_{unearned}$$

All results are rounded deterministically to the nearest integer cent.
