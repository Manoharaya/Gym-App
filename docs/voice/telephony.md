# Telephony Provider Abstraction — Day 34

## Overview

The `TelephonyProvider` interface abstracts all telephone hardware, PSTN networks, and vendor SDKs (e.g. Twilio) from the FitCore core domain.

```typescript
export interface TelephonyProvider {
  readonly name: string;
  createCallSession(params: { from: string; to: string; webhookUrl?: string }): Promise<TelephonyCallSession>;
  answerCall(callId: string): Promise<TelephonyCallSession>;
  endCall(callId: string, reason?: string): Promise<TelephonyCallSession>;
  transferCall(callId: string, targetNumber: string): Promise<{ success: boolean; transferredTo: string }>;
  playAudio(callId: string, audioUrl: string): Promise<void>;
  streamAudio(callId: string, audioChunk: Buffer | string): Promise<void>;
  stopAudio(callId: string): Promise<void>;
  collectDigits(callId: string, options: { maxDigits: number; timeoutMs: number }): Promise<string>;
  getCallStatus(callId: string): Promise<TelephonyCallSession | null>;
  validateWebhookSignature(signature: string, payload: Record<string, any>, url: string, secret?: string): boolean;
}
```

## Providers

1. **`DevelopmentTelephonyProvider`**:
   - In-memory deterministic call session tracking.
   - Zero vendor charges or external network dependencies.
   - Validates dev signatures and supports simulated barge-in, answer, transfer, and audio playback.
2. **`TwilioTelephonyProvider`**:
   - Twilio Voice Webhook integration (TwiML generation).
   - HMAC-SHA1 signature verification using `TWILIO_AUTH_TOKEN`.
   - Call transfer via `<Dial>` PSTN / SIP verbs.
