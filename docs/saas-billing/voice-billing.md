# Voice Telephony Billing

Integration with Day 34 AI Receptionist voice sessions.

## Authoritative Call Duration
- Voice usage is metered strictly by completed session duration (`VoiceSession.durationSeconds`) recorded by telephony webhooks.
- Browser timers or client-side estimates are never used for billable meter calculation.
- Call durations are converted to integer minutes (`Math.ceil(seconds / 60)`).
