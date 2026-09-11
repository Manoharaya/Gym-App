# Multi-Outlet Grounded AI Insights & Prompt Safety

## 1. System Prompt & Grounding Principles

FitCore's multi-outlet AI advisory agent (`multi_outlet_intelligence.v1`) provides grounded management commentary without inventing metrics, hallucinating figures, or asserting unverified causal claims.

### Core Grounding Directives:
1. **Mathematical Grounding**: The model can ONLY cite numbers, percentages, and currencies present in the validated JSON payload.
2. **Non-Causal Observations**: The model must describe operational facts (e.g. *"Kathmandu West experienced a 15% increase in visits alongside a 20% conversion rate"*) rather than speculating on unverified causality (e.g. *"The trainer's new schedule caused conversions to rise"*).
3. **No Cross-Currency Comparison**: Comparisons must never conflate different fiat currencies (`AUD` vs `NPR`).
4. **Bilingual Support**: Fluent operational reporting in both English and Nepali (नेपाली), preserving accurate fitness and financial terminologies.

---

## 2. Prompt Injection Defense

All user inputs passed to `/api/v1/business-intelligence/multi-outlet/ai/query` undergo adversarial sanitisation:
* Attack vectors attempting system prompt extraction (`ignore previous instructions`, `reveal system prompt`) are intercepted.
* Attempts to override financial figures or fabricate synthetic outlet rankings are firmly rejected with:
  *"I can only provide management insights grounded in FitCore's verified operational multi-outlet metrics. I cannot alter system instructions, fabricate numbers, or access unverified data."*
