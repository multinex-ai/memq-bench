import { z } from "zod";

export const RetrievalProviderSchema = z.enum(["keyword_baseline", "memq_mcp", "mem0_oss"]);

export const ProviderConfigSchema = z.object({
  id: RetrievalProviderSchema,
  enabled: z.boolean().default(true),
});

export const MemoryTypeSchema = z.enum(["episodic", "semantic", "procedural", "checkpoint", "hybrid", "reflection"]);

export const CorpusEntrySchema = z.object({
  sourceId: z.string().min(1),
  namespace: z.string().min(1),
  family: z.string().min(1),
  memoryType: MemoryTypeSchema,
  text: z.string().min(1),
  tags: z.array(z.string().min(1)).default([]),
  order: z.number().int().positive(),
});

export const BenchmarkCaseSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  family: z.string().min(1),
  namespace: z.string().min(1),
  query: z.string().min(1),
  primarySourceId: z.string().min(1).optional(),
  relevantSourceIds: z.array(z.string().min(1)).min(1),
  forbiddenSourceIds: z.array(z.string().min(1)).default([]),
  expectedTerms: z.array(z.string().min(1)).default([]),
  forbiddenTerms: z.array(z.string().min(1)).default([]),
  topK: z.number().int().positive().max(25).optional(),
});

export const RetrievalDatasetSchema = z.object({
  corpusPath: z.string().min(1),
  casesPath: z.string().min(1),
});

export const MemQMcpConfigSchema = z.object({
  url: z.string().url(),
  timeoutMs: z.number().int().positive().default(5000),
});

export const Mem0ConfigSchema = z.object({
  pythonPath: z.string().min(1).optional(),
  venvPath: z.string().min(1).optional(),
  qdrantHost: z.string().min(1),
  qdrantPort: z.number().int().positive(),
  llmProvider: z.string().min(1).default("gemini"),
  llmModel: z.string().min(1).default("gemini-2.0-flash"),
  embedderProvider: z.string().min(1).default("gemini"),
  embedderModel: z.string().min(1).default("models/gemini-embedding-001"),
  embeddingDims: z.number().int().positive().default(768),
});

export const RetrievalManifestSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  dataset: RetrievalDatasetSchema,
  repetitions: z.number().int().positive(),
  topK: z.number().int().positive().max(25),
  providers: z.array(ProviderConfigSchema).min(1),
  memq: MemQMcpConfigSchema.optional(),
  mem0: Mem0ConfigSchema.optional(),
  outputDir: z.string().min(1),
});

export const RetrievedItemSchema = z.object({
  rank: z.number().int().positive(),
  sourceId: z.string().min(1),
  namespace: z.string().min(1),
  text: z.string().min(1),
  score: z.number().nullable(),
  providerMemoryId: z.string().min(1).optional(),
  tags: z.array(z.string().min(1)).default([]),
});

export const RetrievalMetricsSchema = z.object({
  hitAtK: z.boolean(),
  primaryAt1: z.boolean(),
  precisionAtK: z.number().min(0).max(1),
  recallAtK: z.number().min(0).max(1),
  mrr: z.number().min(0).max(1),
  leakageCount: z.number().int().nonnegative(),
  namespaceLeakageCount: z.number().int().nonnegative(),
  relevantRanks: z.array(z.number().int().positive()),
  forbiddenRanks: z.array(z.number().int().positive()),
});

export const RetrievalResultSchema = z.object({
  runName: z.string().min(1),
  provider: RetrievalProviderSchema,
  repetition: z.number().int().positive(),
  caseId: z.string().min(1),
  family: z.string().min(1),
  namespace: z.string().min(1),
  query: z.string().min(1),
  topK: z.number().int().positive(),
  status: z.enum(["completed", "failed", "skipped"]),
  reason: z.string().default(""),
  startedAt: z.string().min(1),
  finishedAt: z.string().min(1),
  searchLatencyMs: z.number().int().nonnegative(),
  prepareDurationMs: z.number().int().nonnegative(),
  seededEntryCount: z.number().int().nonnegative(),
  relevantSourceIds: z.array(z.string().min(1)),
  forbiddenSourceIds: z.array(z.string().min(1)),
  metrics: RetrievalMetricsSchema,
  results: z.array(RetrievedItemSchema),
});

export type RetrievalProviderId = z.infer<typeof RetrievalProviderSchema>;
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;
export type CorpusEntry = z.infer<typeof CorpusEntrySchema>;
export type BenchmarkCase = z.infer<typeof BenchmarkCaseSchema>;
export type RetrievalManifest = z.infer<typeof RetrievalManifestSchema>;
export type RetrievedItem = z.infer<typeof RetrievedItemSchema>;
export type RetrievalMetrics = z.infer<typeof RetrievalMetricsSchema>;
export type RetrievalResult = z.infer<typeof RetrievalResultSchema>;
