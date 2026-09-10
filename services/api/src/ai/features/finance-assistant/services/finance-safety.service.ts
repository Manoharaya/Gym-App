/**
 * FitCore — Day 44: AI Finance Safety & Prompt Injection Defense Service
 *
 * Protects financial intelligence boundaries against:
 * 1. Prompt injections attempting to override rules or invent numbers
 * 2. Unauthorized cross-tenant or cross-outlet probing
 * 3. Formal legal/tax liability advice requests
 * 4. Speculative future financial forecasting
 */

import { Injectable, Logger } from '@nestjs/common';
import { MALICIOUS_PATTERNS, ADVISORY_DISCLAIMERS } from '../domain/finance-assistant.constants';
import { FinanceAssistantResponse } from '@fitcore/types';

export interface SafetyCheckResult {
  isSafe: boolean;
  violationType?: 'MALICIOUS_INJECTION' | 'TAX_ADVISORY' | 'FORECASTING_REQUEST';
  safeResponse?: FinanceAssistantResponse;
}

@Injectable()
export class FinanceSafetyService {
  private readonly logger = new Logger(FinanceSafetyService.name);

  /**
   * Evaluates user query for prompt injection and out-of-boundary requests.
   */
  evaluateSafety(query: string, language: 'en' | 'ne' = 'en'): SafetyCheckResult {
    const trimmed = query.trim();

    // 1. Malicious Prompt Injection / Fabrication Attempt
    for (const pattern of MALICIOUS_PATTERNS) {
      if (pattern.test(trimmed)) {
        this.logger.warn(`Intercepted financial prompt injection attempt: "${trimmed}"`);
        return {
          isSafe: false,
          violationType: 'MALICIOUS_INJECTION',
          safeResponse: this.buildRefusalResponse(
            language === 'ne'
              ? 'अनुरोध अस्वीकार: म मेरा निर्देशनहरू परिमार्जन गर्न सक्दिन र कृत्रिम वित्तीय तथ्याङ्क उत्पादन गर्न मिल्दैन।'
              : 'Request Refused: Platform safety policies strictly prohibit prompt injections and I cannot modify my instructions or generate unverified financial data.',
            'SAFETY_INJECTION_DEFENSE',
            language,
          ),
        };
      }
    }

    // 2. Financial Mutation / Transaction Actions Refusal
    if (
      /((please\s+)?refund\s+(invoice|payment|charge|transaction|customer|member|#|[0-9]|\$)|process\s+(a\s+)?refund|issue\s+(a\s+)?refund|cancel\s+(their\s+|the\s+)?(plan|subscription|membership)|charge\s+(the\s+)?card|delete\s+(the\s+)?invoice|create\s+(an\s+)?invoice|modify\s+(the\s+)?invoice)/i.test(trimmed)
    ) {
      return {
        isSafe: false,
        violationType: 'MALICIOUS_INJECTION',
        safeResponse: this.buildRefusalResponse(
          language === 'ne'
            ? 'FitCore AI केवल अध्ययनका लागि हो। म वित्तीय कारोबारहरू गर्न सक्दिन (cannot perform financial transactions)। कृपया यो कार्य ड्यासबोर्डबाट गर्नुहोस्।'
            : 'FitCore AI is strictly read-only and cannot perform financial transactions, process refunds, or cancel subscriptions. Please perform this action directly from the FitCore Dashboard.',
          'READ_ONLY_GUARD',
          language,
        ),
      };
    }

    // 3. Statutory Tax Liability Calculation Requests
    const lower = trimmed.toLowerCase();
    if (
      (lower.includes('how much tax do we legally owe') ||
        lower.includes('calculate our tax liability') ||
        lower.includes('tax filing advice') ||
        lower.includes('कर कति तिर्नुपर्छ')) &&
      !lower.includes('what is')
    ) {
      return {
        isSafe: false,
        violationType: 'TAX_ADVISORY',
        safeResponse: this.buildRefusalResponse(
          language === 'ne'
            ? `${ADVISORY_DISCLAIMERS.TAX_PROFESSIONAL} FitCore ले केवल अभिलेखबद्ध कर दर र कारोबारहरू देखाउँछ, कानूनी कर परामर्श दिँदैन।`
            : `${ADVISORY_DISCLAIMERS.TAX_PROFESSIONAL} FitCore displays verified recorded tax rates and historical collections, but cannot calculate statutory tax obligations or provide legal tax advice.`,
          'TAX_ADVISORY_BOUNDARY',
          language,
        ),
      };
    }

    // 4. Speculative Financial Forecasting
    if (
      lower.includes('what will our revenue be') ||
      lower.includes('predict next month') ||
      lower.includes('forecast next quarter') ||
      lower.includes('will our gym make next year') ||
      lower.includes('next year in q4') ||
      lower.includes('भविष्यमा कति आम्दानी होला') ||
      /(predict|forecast|speculate|project\s+future|will\s+make\s+next)/i.test(lower)
    ) {
      return {
        isSafe: false,
        violationType: 'FORECASTING_REQUEST',
        safeResponse: this.buildRefusalResponse(
          language === 'ne'
            ? `${ADVISORY_DISCLAIMERS.FORECASTING_BOUNDARY} तपाईं हालसम्मको ऐतिहासिक वित्तीय प्रवृत्ति र संकलन दर हेर्न सक्नुहुन्छ।`
            : `${ADVISORY_DISCLAIMERS.FORECASTING_BOUNDARY} FitCore AI explains verified historical transactions and does not generate speculative financial forecasts.`,
          'FORECASTING_BOUNDARY',
          language,
        ),
      };
    }

    return { isSafe: true };
  }

  private buildRefusalResponse(
    message: string,
    sourceTag: string,
    language: 'en' | 'ne',
  ): FinanceAssistantResponse {
    const now = new Date().toISOString();
    return {
      answer: message,
      summary: language === 'ne' ? 'अनुरोध प्रक्रिया गर्न सकिएन।' : 'Request cannot be processed as submitted.',
      facts: [],
      comparisons: [],
      observations: [message],
      possibleExplanations: [],
      recommendations: [
        {
          recommendation:
            language === 'ne'
              ? 'प्रणालीमा अभिलेखबद्ध वास्तविक वित्तीय तथ्याङ्क मात्र सोध्नुहोस्।'
              : 'Submit inquiries regarding verified historical revenue, payments, invoices, and billing metrics.',
          reason: 'Ensures absolute compliance with financial data integrity boundaries.',
          priority: 'HIGH',
        },
      ],
      dataWindow: {
        start: now,
        end: now,
        timezone: 'UTC',
      },
      dataQuality: 'HIGH',
      limitations: sourceTag === 'TAX_ADVISORY_BOUNDARY'
        ? [ADVISORY_DISCLAIMERS.TAX_PROFESSIONAL]
        : ['Request restricted by platform security boundaries.'],
      sources: [{ tool: sourceTag, metric: 'boundary_protection' }],
      confidence: 1.0,
    };
  }
}
