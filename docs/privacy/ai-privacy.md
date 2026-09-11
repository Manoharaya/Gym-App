# AI Privacy Boundary & Context Filtering

## 1. Controlled Policy Pipeline
Before any member data enters an LLM prompt or context window, it must pass through the `PrivacyAIDataPolicyService`:

$$\text{AI FEATURE} \longrightarrow \text{CONSENT} \longrightarrow \text{PREFERENCE} \longrightarrow \text{CLASSIFICATION} \longrightarrow \text{MINIMUM NECESSARY} \longrightarrow \text{AI CONTEXT}$$

## 2. Invariants
- **Opt-Out Enforcement**: If a member disables `aiPersonalization`, all contextual data sources are excluded. The AI model operates purely on generic coaching knowledge.
- **Biometric & Health Consent**: Wearable telemetry and medical screening results are strictly withheld unless active, unwithdrawn consent exists.
- **Fail-Closed**: If policy evaluation returns `DENIED`, `RESTRICTED`, or `UNKNOWN`, the dataset is stripped immediately.
- **Prompt Injection Defense**: The backend API, not the LLM, is the privacy authorization layer. Prompt injections requesting other members' data are blocked server-side.
