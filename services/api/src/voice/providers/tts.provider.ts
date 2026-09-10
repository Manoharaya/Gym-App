/**
 * Day 34 — Text-to-Speech (TTS) Provider Abstraction
 * Provider-neutral TTS interface supporting voice profiles, accents, speaking rate, and streaming.
 */

import { Injectable, Logger } from '@nestjs/common';
import { VoiceLanguage, VoiceAccent, VoiceGender } from '@fitcore/types';

export interface TTSResult {
  audioUrl?: string;
  audioBase64?: string;
  durationMs: number;
  characterCount: number;
  language: VoiceLanguage;
  voiceId: string;
}

export interface VoiceDescriptor {
  id: string;
  name: string;
  provider: string;
  language: VoiceLanguage;
  accent?: VoiceAccent;
  gender?: VoiceGender;
}

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

@Injectable()
export class DevelopmentTTSProvider implements TextToSpeechProvider {
  readonly name = 'DEVELOPMENT';
  private readonly logger = new Logger(DevelopmentTTSProvider.name);

  private readonly availableVoices: VoiceDescriptor[] = [
    {
      id: 'dev-voice-en-us',
      name: 'FitCore American English (Female)',
      provider: 'DEVELOPMENT',
      language: 'en',
      accent: 'US',
      gender: 'FEMALE',
    },
    {
      id: 'dev-voice-en-uk',
      name: 'FitCore British English (Male)',
      provider: 'DEVELOPMENT',
      language: 'en',
      accent: 'UK',
      gender: 'MALE',
    },
    {
      id: 'dev-voice-en-au',
      name: 'FitCore Australian English (Female)',
      provider: 'DEVELOPMENT',
      language: 'en',
      accent: 'AU',
      gender: 'FEMALE',
    },
    {
      id: 'dev-voice-ne',
      name: 'FitCore Nepali (Female)',
      provider: 'DEVELOPMENT',
      language: 'ne',
      accent: 'NEPALI',
      gender: 'FEMALE',
    },
  ];

  async synthesize(
    text: string,
    options?: {
      voiceProfileId?: string;
      providerVoiceId?: string;
      language?: VoiceLanguage;
      speakingRate?: number;
      pitch?: number;
    },
  ): Promise<TTSResult> {
    const rate = options?.speakingRate || 1.0;
    const words = text.split(/\s+/).filter(Boolean).length;
    // Estimate spoken duration: ~250ms per word divided by speaking rate
    const estimatedDurationMs = Math.max(800, Math.round((words * 260) / rate));
    const lang = options?.language || 'en';
    const voiceId = options?.providerVoiceId || (lang === 'ne' ? 'dev-voice-ne' : 'dev-voice-en-us');

    // Create a deterministic simulated audio base64
    const simulatedHeader = `RIFF_MOCK_AUDIO_${lang}_${words}_WORDS`;
    const audioBase64 = Buffer.from(simulatedHeader).toString('base64');
    const audioUrl = `data:audio/wav;base64,${audioBase64}`;

    this.logger.debug(
      `[DevelopmentTTS] Synthesized ${words} words (${text.length} chars) into ${estimatedDurationMs}ms audio (voice=${voiceId})`,
    );

    return {
      audioUrl,
      audioBase64,
      durationMs: estimatedDurationMs,
      characterCount: text.length,
      language: lang,
      voiceId,
    };
  }

  async getVoices(): Promise<VoiceDescriptor[]> {
    return [...this.availableVoices];
  }
}
