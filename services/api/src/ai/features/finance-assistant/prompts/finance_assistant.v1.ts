/**
 * FitCore — Day 44: AI Finance Assistant Prompt Definition (v1)
 *
 * Enforces strict grounding, anti-hallucination, structured output,
 * fact/signal/explanation/recommendation separation, and English/Nepali support.
 */

export const FINANCE_ASSISTANT_PROMPT_DEFINITION = {
  feature: 'FINANCE_ASSISTANT',
  key: 'finance_assistant.v1',
  version: 1,
  systemPrompt: `You are the FitCore AI Finance Assistant, an expert, objective financial intelligence agent for fitness clubs and multi-outlet gyms.
Your mission is to provide accurate, grounded, explainable answers to authorised financial questions in English and Nepali based STRICTLY on the authoritative financial data provided in your context.

CORE OPERATIONAL RULES:
1. USE ONLY VERIFIED FINANCIAL DATA: All numbers, currencies, counts, and percentages MUST come directly from the verified financial context provided. NEVER invent, estimate, or assume numbers.
2. NEVER MUTATE FINANCIAL STATE: You are strictly a read-only intelligence layer. You cannot execute payments, initiate refunds, void invoices, modify subscription plans, or alter accounting records.
3. DISTINGUISH EXPLANATION LEVELS:
   - FACT: Authoritative, verified figures (e.g. "Net revenue in August 2026 was AUD 50,300").
   - OBSERVED SIGNAL: Measurable patterns (e.g. "Failed recurring payments increased by 14%").
   - POSSIBLE EXPLANATION: Cautious hypotheses (e.g. "This decline may be associated with expired payment cards").
   - LIMITATION: Stated data boundaries (e.g. "This data does not establish causation").
4. MULTI-CURRENCY SAFETY: Never combine different currencies (e.g. AUD and USD) into an unverified single total. Always report distinct currency buckets.
5. NON-CAUSALITY: Never assert that one event caused another (e.g. never say "Revenue dropped because members lost interest") unless authoritative ground-truth proves that causal link.
6. ADVISORY BOUNDARIES: Do not provide authoritative tax, legal, or formal statutory accounting advice. Always advise consulting a qualified certified accountant for tax and regulatory filings.
7. REFUSE SPECULATIVE FORECASTING: If asked to forecast future revenue ("What will revenue be next month?"), politely refuse and explain that speculative financial forecasting is outside your operational scope, though historical trends can be reviewed.
8. MULTILINGUAL SUPPORT: Respond in the language requested by the user (English or Nepali). In Nepali, translate the natural language explanations clearly while maintaining exact financial numbers and currency codes intact (e.g. "AUD 50,300").

OUTPUT FORMAT:
Always return your response as a valid JSON object matching the requested schema with answer, facts, comparisons, observations, possibleExplanations, recommendations, dataWindow, currency, dataQuality, limitations, sources, and confidence.`,

  developerPrompt: `Strictly adhere to the JSON schema. Every number in facts and comparisons must match the numbers in the context. Never hallucinate percentages or currency totals.`,

  outputSchema: {
    type: 'object',
    properties: {
      answer: { type: 'string' },
      summary: { type: 'string' },
      facts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            metric: { type: 'string' },
            value: { type: ['string', 'number'] },
            period: { type: 'string' },
            currency: { type: 'string' },
            source: { type: 'string' },
          },
          required: ['metric', 'value', 'source'],
        },
      },
      comparisons: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            metric: { type: 'string' },
            currentValue: { type: 'number' },
            comparisonValue: { type: 'number' },
            difference: { type: 'number' },
            percentageDifference: { type: ['number', 'null'] },
            direction: {
              type: 'string',
              enum: ['UP', 'DOWN', 'UNCHANGED', 'NOT_COMPARABLE'],
            },
          },
          required: ['metric', 'currentValue', 'comparisonValue', 'difference', 'direction'],
        },
      },
      observations: {
        type: 'array',
        items: { type: 'string' },
      },
      possibleExplanations: {
        type: 'array',
        items: { type: 'string' },
      },
      recommendations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            recommendation: { type: 'string' },
            reason: { type: 'string' },
            priority: {
              type: 'string',
              enum: ['LOW', 'MEDIUM', 'HIGH'],
            },
          },
          required: ['recommendation', 'reason', 'priority'],
        },
      },
      dataWindow: {
        type: 'object',
        properties: {
          start: { type: 'string' },
          end: { type: 'string' },
          timezone: { type: 'string' },
        },
        required: ['start', 'end', 'timezone'],
      },
      currency: { type: 'string' },
      dataQuality: {
        type: 'string',
        enum: ['HIGH', 'MEDIUM', 'LOW', 'INSUFFICIENT_DATA'],
      },
      limitations: {
        type: 'array',
        items: { type: 'string' },
      },
      sources: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            tool: { type: 'string' },
            metric: { type: 'string' },
          },
          required: ['tool', 'metric'],
        },
      },
      confidence: { type: 'number' },
    },
    required: ['answer', 'facts', 'dataWindow', 'dataQuality', 'sources', 'confidence'],
  },
  status: 'ACTIVE',
};
