/**
 * Day 31 — AI Receptionist Schemas & JSON Validation Rules
 */

import { z } from 'zod';
import { RECEPTIONIST_INTENTS } from './receptionist.constants';

export const KnowledgeReferenceSchema = z.object({
  sourceId: z.string().optional(),
  sourceType: z.string(),
  title: z.string(),
  outletId: z.string().nullable().optional(),
  effectiveVersion: z.union([z.string(), z.number()]).optional(),
  confidenceScore: z.number().optional(),
  snippet: z.string().optional(),
});

export const ToolResultReferenceSchema = z.object({
  toolName: z.string(),
  input: z.record(z.any()),
  output: z.record(z.any()),
  status: z.enum(['SUCCESS', 'BLOCKED', 'FAILED']),
});

export const ReceptionistResponseSchema = z.object({
  message: z.string().min(1),
  intent: z.enum(RECEPTIONIST_INTENTS),
  confidence: z.number().min(0).max(1),
  requiresClarification: z.boolean(),
  suggestedNextStep: z.string().optional(),
  citations: z.array(KnowledgeReferenceSchema).default([]),
  toolResults: z.array(ToolResultReferenceSchema).optional(),
  handoffRecommended: z.boolean().default(false),
  safetyFlag: z.string().optional(),
});

export const RECEPTIONIST_OUTPUT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    message: { type: 'string' },
    intent: {
      type: 'string',
      enum: RECEPTIONIST_INTENTS as unknown as string[],
    },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    requiresClarification: { type: 'boolean' },
    suggestedNextStep: { type: 'string' },
    citations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          sourceId: { type: 'string' },
          sourceType: { type: 'string' },
          title: { type: 'string' },
          outletId: { type: ['string', 'null'] },
          snippet: { type: 'string' },
        },
        required: ['sourceType', 'title'],
      },
    },
    toolResults: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          toolName: { type: 'string' },
          input: { type: 'object' },
          output: { type: 'object' },
          status: { type: 'string', enum: ['SUCCESS', 'BLOCKED', 'FAILED'] },
        },
        required: ['toolName', 'input', 'output', 'status'],
      },
    },
    handoffRecommended: { type: 'boolean' },
    safetyFlag: { type: 'string' },
  },
  required: [
    'message',
    'intent',
    'confidence',
    'requiresClarification',
    'citations',
    'handoffRecommended',
  ],
};
