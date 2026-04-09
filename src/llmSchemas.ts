import { z } from "zod";

export const LlmConditionSchema = z.enum(["no_memory", "keyword_context", "memq_context", "mem0_context"]);

export const LlmModelConfigSchema = z.object({
  pythonPath: z.string().min(1).optional(),
  venvPath: z.string().min(1).optional(),
  provider: z.string().min(1),
  model: z.string().min(1),
});

export const LlmDatasetSchema = z.object({
  casesPath: z.string().min(1),
  retrievalResultsDir: z.string().min(1),
  retrievalRepetition: z.number().int().positive(),
});

export const LlmManifestSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  dataset: LlmDatasetSchema,
  repetitions: z.number().int().positive(),
  conditions: z.array(LlmConditionSchema).min(1),
  model: LlmModelConfigSchema,
  outputDir: z.string().min(1),
});

export const LlmMetricsSchema = z.object({
  answerPass: z.boolean(),
  citationHit: z.boolean(),
  citationRecall: z.number().min(0).max(1),
  forbiddenCitationCount: z.number().int().nonnegative(),
  missingTerms: z.array(z.string()),
  matchedForbiddenTerms: z.array(z.string()),
});

export const LlmResultSchema = z.object({
  runName: z.string().min(1),
  condition: LlmConditionSchema,
  repetition: z.number().int().positive(),
  caseId: z.string().min(1),
  providerContext: z.string().min(1),
  question: z.string().min(1),
  expectedTerms: z.array(z.string()),
  forbiddenTerms: z.array(z.string()),
  relevantSourceIds: z.array(z.string()),
  primarySourceId: z.string().min(1).optional(),
  contextSourceIds: z.array(z.string()),
  answer: z.string(),
  citations: z.array(z.string()),
  metrics: LlmMetricsSchema,
  status: z.enum(["completed", "skipped", "failed"]),
  reason: z.string().default(""),
});

export type LlmCondition = z.infer<typeof LlmConditionSchema>;
export type LlmManifest = z.infer<typeof LlmManifestSchema>;
export type LlmResult = z.infer<typeof LlmResultSchema>;

