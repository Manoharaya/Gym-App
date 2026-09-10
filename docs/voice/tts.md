# Text-to-Speech (TTS) Abstraction — Day 34

## Overview

The `TextToSpeechProvider` interface converts normalized spoken text into high-fidelity audio streams.

```typescript
export interface TextToSpeechProvider {
  readonly name: string;
  synthesize(
    text: string,
    options?: {
      voiceProfileId?: string;
      providerVoiceId?: string;
      language?: VoiceLanguage;
      speakingRate?: number;
      pitch?: number;
    },
  ): Promise<TTSResult>;
  getVoices(): Promise<VoiceDescriptor[]>;
}
```

## Voice Profiles & Accents

- **Languages**: English (`en`), Nepali (`ne`).
- **Accents**: American (`US`), British (`UK`), Australian (`AU`), Nepali (`NEPALI`).
- **Speaking Rate & Pitch**: Configurable rates (default 1.0) with spoken duration estimates.
- **Provider Support**: Extensible to ElevenLabs, Google Cloud Text-to-Speech, Amazon Polly, and Azure Speech Services.
