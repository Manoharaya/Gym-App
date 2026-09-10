# AI Finance Grounding & Validation Engine

## The Hallucination Problem in Financial AI

In general-purpose LLMs, models frequently fabricate monetary totals (e.g., claiming "$12,450" when the ledger reports "$10,200") or invent percentage deltas. In a fitness management OS, such inaccuracies could cause serious tax compliance errors, erroneous payroll calculations, or damaged business decisions.

---

## Server-Side Grounding Validator (`FinanceGroundingService`)

FitCore implements a strict **post-generation grounding validation pipeline**:

```
[User Query]
     │
[Execute Authoritative Tools] ────────┐
     │                                │ (Authoritative Numbers & Facts)
[Prompt Gateway / LLM]                │
     │ (Generated Text)               │
     ▼                                ▼
┌───────────────────────────────────────────────┐
│           FinanceGroundingService             │
│                                               │
│ 1. Extract all currency & percentage numbers  │
│ 2. Check each against Authoritative Set       │
│ 3. If ungrounded number detected:             │
│    - Flag as UNGROUNDED                       │
│    - Replace with deterministic fallback      │
│    - Log audit anomaly                        │
└───────────────────────┬───────────────────────┘
                        │
                        ▼
                [Audited Response]
```

---

## Validation Algorithm

1. **Extraction**: Uses regular expressions to parse every numerical figure accompanied by currency symbols (`$`, `A$`, `Rs.`), commas, or percentage signs (`%`).
2. **Tolerance**: Allows rounding differences of `±0.01` or `±0.1%` to prevent false positives from decimal formatting.
3. **Whitelist**: Authoritative set includes:
   - All tool query results.
   - Standard date integers (days of month, year).
   - Counts returned by Prisma `count()`.
4. **Fallback Handling**: If an ungrounded figure cannot be mapped to an authoritative source, the response `isGrounded` property is set to `false`, and the response text is replaced with a certified summary constructed directly from `facts`.
