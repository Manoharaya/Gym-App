# Voice Channel Architecture — Day 34

## Overview

The FitCore AI Voice Receptionist implements an omnichannel voice capability for the existing AI Receptionist platform.

### Core Architectural Principle
```text
VOICE IS ONLY A CHANNEL
```
Voice does not create a separate intelligence layer, booking engine, or lead database. Voice calls route through provider-neutral telephony and speech adapters into the exact same unified receptionist intelligence engine.

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

---

## Key Invariants

1. **Omnichannel Unified Intelligence**: Website Chat, WhatsApp, SMS, and Voice share the exact same prompt registry, knowledge sources, safety evaluation, tool registry, and permission checks.
2. **Phone Number ≠ Authentication**: A phone number match alone marks a caller as `KNOWN_CONTACT`. Access to private member data requires explicit caller verification (`VERIFIED_MEMBER`).
3. **Explicit 2-Step Confirmation**: All booking mutations require clear spoken confirmation from the caller. Silence, "okay", or ambiguous speech never triggers mutations.
4. **Zero Internal Identifiers Read Aloud**: All technical database IDs (UUIDs, CUIDs) are filtered and converted to natural spoken names ("Strength Training tomorrow at 6 PM").
5. **Deterministic Provider Abstraction**: Interfaces decouple business logic from telephony vendors (`TelephonyProvider`, `SpeechToTextProvider`, `TextToSpeechProvider`), enabling comprehensive offline testing via `Development` adapters.
6. **Real-Time Barge-In Support**: When a caller speaks during AI audio playback, playback is immediately halted, turn state transitions to `INTERRUPTED`, and the new speech is processed without speaking over the caller.
