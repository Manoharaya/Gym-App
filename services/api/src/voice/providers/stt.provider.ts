/**
 * Day 34 — Speech-to-Text (STT) Provider Abstraction
 * Provider-neutral STT interface supporting streaming transcripts, language detection, and confidence scoring.
 */

import { Injectable, Logger } from '@nestjs/common';
import { VoiceLanguage } from '@fitcore/types';

export interface STTWordTiming {
  word: string;
  startMs: number;
  endMs: number;
}

export interface STTTranscriptionResult {
  text: string;
  confidence: number;
  language: VoiceLanguage;
  isFinal: boolean;
  words?: STTWordTiming[];
}

export interface SpeechToTextProvider {
  readonly name: string;
  transcribe(audio: Buffer | string, options?: { language?: VoiceLanguage; sampleRate?: number }): Promise<STTTranscriptionResult>;
  detectLanguage(sample: Buffer | string): Promise<VoiceLanguage>;
}

@Injectable()
export class DevelopmentSTTProvider implements SpeechToTextProvider {
  readonly name = 'DEVELOPMENT';
  private readonly logger = new Logger(DevelopmentSTTProvider.name);

  async transcribe(
    audio: Buffer | string,
    options?: { language?: VoiceLanguage; sampleRate?: number },
  ): Promise<STTTranscriptionResult> {
    let rawText = '';
    if (typeof audio === 'string') {
      rawText = audio.trim();
    } else {
      rawText = audio.toString('utf-8').trim();
    }

    // Determine language
    const detectedLang = options?.language || (await this.detectLanguage(rawText));

    // Simulate low confidence or background noise if markers present
    const isUnclear = rawText.toLowerCase().includes('[unclear]') || rawText.toLowerCase().includes('[noise]');
    const confidence = isUnclear ? 0.45 : 0.96;

    // Generate word timings
    const tokens = rawText.split(/\s+/).filter(Boolean);
    let currentMs = 0;
    const words: STTWordTiming[] = tokens.map((word) => {
      const startMs = currentMs;
      const endMs = startMs + Math.max(150, word.length * 50);
      currentMs = endMs + 50;
      return { word, startMs, endMs };
    });

    this.logger.debug(`[DevelopmentSTT] Transcribed ${tokens.length} words (lang=${detectedLang}, conf=${confidence})`);

    return {
      text: rawText,
      confidence,
      language: detectedLang,
      isFinal: true,
      words,
    };
  }

  async detectLanguage(sample: Buffer | string): Promise<VoiceLanguage> {
    const text = typeof sample === 'string' ? sample : sample.toString('utf-8');
    const nepaliPattern = /[\u0900-\u097F]|\b(namaste|kati|cha|ho|dhanyabad|mero|tapai|tapaiko)\b/i;
    if (nepaliPattern.test(text)) {
      return 'ne';
    }
    return 'en';
  }
}
