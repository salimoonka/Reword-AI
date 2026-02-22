/**
 * Zod Schemas for Paraphrase API
 */

import { z } from 'zod';

export const paraphraseModeSchema = z.enum([
  'paraphrase',
  'shorten',
  'expand',
  'formal',
  'friendly',
  'confident',
  'professional',
  'colloquial',
  'empathetic',
]);

export type ParaphraseMode = z.infer<typeof paraphraseModeSchema>;

export const paraphraseRequestSchema = z.object({
  text: z
    .string()
    .min(1, 'Text is required')
    .max(10000, 'Text must be less than 10000 characters'),
  mode: paraphraseModeSchema,
  preserve_english: z.boolean().default(true),
  max_length: z.number().optional(),
});

export type ParaphraseRequest = z.infer<typeof paraphraseRequestSchema>;

export const diffSegmentSchema = z.object({
  type: z.enum(['delete', 'insert', 'equal']),
  start: z.number(),
  end: z.number(),
  text: z.string(),
});

export const paraphraseResponseSchema = z.object({
  request_id: z.string(),
  input_text: z.string(),
  output_text: z.string(),
  diff: z.array(diffSegmentSchema),
  processing_time_ms: z.number(),
  warnings: z.array(z.string()).optional(),
});

export type ParaphraseResponse = z.infer<typeof paraphraseResponseSchema>;
