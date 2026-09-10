# Speech-to-Text (STT) Abstraction — Day 34

## Overview

The `SpeechToTextProvider` interface provides vendor-neutral speech recognition, streaming audio transcription, confidence scoring, and language detection.

```typescript
export interface SpeechToTextProvider {
  readonly name: string;
  transcribe(audio: Buffer | string, options?: { language?: VoiceLanguage; sampleRate?: number }): Promise<STTTranscriptionResult>;
  detectLanguage(sample: Buffer | string): Promise<VoiceLanguage>;
}
```

## Features

- **Confidence Scoring**: Flags unclear speech or background noise (confidence < 0.6) to prompt polite repetition rather than hallucinating words.
- **Multilingual Detection**: Detects English (`en`) and Nepali (`ne`, using Devanagari script and romanized keywords) to automatically switch conversation tone.
- **Word Timings**: Provides word-level start and end timestamps for precise barge-in truncation.
