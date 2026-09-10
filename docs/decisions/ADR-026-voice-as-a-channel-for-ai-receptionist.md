# ADR-026: Voice as a Channel for AI Receptionist

## Status
Accepted

## Context
Following Day 31 (AI Receptionist Foundation), Day 32 (AI Receptionist Booking & Scheduling), and Day 33 (Lead Capture & Qualification), FitCore requires a real-time voice channel for phone calls.

Introducing telephone voice interaction into gym operations introduces critical architectural challenges:
1. **Architectural Duplication Risk**: Building a separate "Voice AI" system would create duplicate booking logic, divergent knowledge sources, conflicting lead databases, and fragmented safety rules.
2. **Authentication vs. Phone Number Confusion**: A caller's Caller ID / phone number alone cannot be treated as authenticated identity. Caller ID spoofing is trivial on PSTN networks, and revealing private medical (PAR-Q), financial, or trainer notes based solely on phone number would violate privacy laws (GDPR, Australian Privacy Principles).
3. **Spoken Output vs. Text Output Incompatibilities**: Reading database UUIDs, long bulleted lists, or technical JSON keys over the telephone degrades caller comprehension and trust.
4. **Latency & Interruption (Barge-In)**: Telephony conversations require low-latency streaming and the ability for callers to interrupt the AI when needed without the AI talking over them.
5. **Vendor Lock-in**: Hardcoding telephony directly to one vendor (e.g. Twilio) prevents future deployment flexibility or offline deterministic automated testing.

## Decision
We decided on the foundational architectural principle:
```text
VOICE IS ONLY A CHANNEL
```
The voice system does NOT create a separate intelligence layer. It functions strictly as an audio ingestion and synthesis channel adapter over the unified AI Receptionist platform.

```text
PHONE CALL
    ↓
TELEPHONY PROVIDER (Development / Twilio)
    ↓
SPEECH-TO-TEXT ADAPTER (STT)
    ↓
VOICE SESSION MANAGER (State Machine & Turn Coordinator)
    ↓
AI RECEPTIONIST (Day 31 Foundation)
    ↓
CONTEXT + SAFETY (Grounded Knowledge & Injection Defense)
    ↓
CONTROLLED TOOLS (Day 32 Booking & Day 33 Lead Capture)
    ↓
GYM OS AUTHORITATIVE DOMAIN
    ↓
AI RESPONSE NORMALIZATION (Spoken Brevity, Zero UUIDs)
    ↓
TEXT-TO-SPEECH ADAPTER (TTS)
    ↓
TELEPHONY PROVIDER
    ↓
CALLER
```

### 1. Invariant Pipeline & Reuse
- Reuses **Day 19 AI Platform**: Model Gateway, prompt registry, safety, telemetry (`AI_RECEPTIONIST_VOICE`).
- Reuses **Day 31 AI Receptionist**: Unified conversation store, knowledge search, and guardrails.
- Reuses **Day 32 Booking Engine**: Availability search, eligibility evaluation, and 2-step confirmation state tokens.
- Reuses **Day 33 Lead Engine**: Progressive lead capture, deterministic 0–100 scoring, and qualification profiling.
- Reuses **Day 28 Communication & Day 30 Automation**: Callbacks, abandoned call handling, and staff notifications.

### 2. Strict Identity Boundary: Phone Number ≠ Authentication
- Phone number matching yields at most `KNOWN_CONTACT` (Unverified).
- Access to private membership details requires an explicit verification step (OTP / security code) transitioning the session to `VERIFIED_MEMBER`.
- Sensitive health data (PAR-Q, injuries, medical conditions) and payment credentials are categorically prohibited from voice disclosure.

### 3. Spoken Brevity & Normalization
- Prompts enforce short spoken turns (1–2 sentences maximum) and one question at a time.
- All internal database identifiers (UUIDs, CUIDs) are filtered and converted to conversational descriptions ("Strength Training class tomorrow at 6 PM").

### 4. Mandatory Explicit Confirmation for Mutations
- Before booking, cancelling, or rescheduling, the caller must explicitly confirm ("Yes", "Confirm").
- Silence, "okay", background speech, or ambiguous words never trigger consequential mutations.

### 5. Provider Abstraction & Offline Determinism
- Provider-neutral interfaces (`TelephonyProvider`, `SpeechToTextProvider`, `TextToSpeechProvider`).
- Backed by zero-cost `Development` providers that enable fast, deterministic CI/CD automated test suites without external network calls or telephone charges.

### 6. Barge-in & Interruption Management
- When a caller speaks during AI audio playback (`SPEAKING` state), telephony audio playback is immediately halted, turn state transitions to `INTERRUPTED`, and the caller's new utterance is prioritized.

### 7. Truthful AI Identity & Medical Escalation
- When asked "Are you a real person?", the assistant answers truthfully: *"I'm FitCore's AI receptionist."*
- If the caller reports medical distress or emergency symptoms (chest pain, severe shortness of breath), the assistant immediately provides emergency medical guidance and refuses diagnostic speculation.

## Consequences

### Positive
- **Guaranteed Consistency**: Website chat, WhatsApp, SMS, and Voice behave identically because they share the same intelligence, knowledge, and tools.
- **Zero Hallucinated Actions**: Real booking availability and lead qualification come exclusively from Gym OS domain services.
- **Cost & Abuse Protection**: Call duration limits (600s), turn limits (25), rate limits, and webhook replay protection safeguard against runaway costs.
- **Multilingual Readiness**: Initial native support for English and Nepali with clean extensibility for additional languages.

### Negative / Trade-Offs
- Real-time voice requires careful latency tuning across STT, LLM, and TTS hops.
- Two-step confirmation adds a conversational confirmation turn for callers before booking mutations execute, but eliminates accidental or unauthorized bookings.
