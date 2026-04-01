import { z } from "zod";

export const TrackSchema = z.enum(["fixture", "local_cli", "antigravity"]);
export const ConditionSchema = z.enum([
  "stateless",
  "naive_memory",
  "memq_core",
  "memq_accelerated",
]);

export const ModelSchema = z.object({
  name: z.string().min(1),
  provider: z.string().min(1),
  temperature: z.number().min(0).max(2),
});

export const MemQConfigSchema = z.object({
  url: z.string().url(),
  timeoutMs: z.number().int().positive().default(5000),
});

export const AcceleratedConfigSchema = z.object({
  enabled: z.boolean(),
  contextBudgetTokens: z.number().int().positive(),
  segmentTokens: z.number().int().positive(),
  soulJournalPath: z.string().min(1),
  graphitiUrl: z.string().url().optional(),
  qdrantUrl: z.string().url().optional(),
  qdrantCollection: z.string().min(1).optional(),
});

export const RunManifestSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  tasks: z.array(z.string().min(1)).min(1),
  repetitions: z.number().int().positive(),
  matrix: z.object({
    tracks: z.array(TrackSchema).min(1),
    conditions: z.array(ConditionSchema).min(1),
  }),
  model: ModelSchema,
  memq: MemQConfigSchema,
  accelerated: AcceleratedConfigSchema,
  outputDir: z.string().min(1),
});

export const VerifierSchema = z.object({
  requiredFacts: z.array(z.string().min(1)).min(1),
  forbiddenFacts: z.array(z.string().min(1)).default([]),
});

export const TaskSpecSchema = z.object({
  id: z.string().min(1),
  family: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  query: z.string().min(1),
  prompt: z.string().min(1),
  workspaceDir: z.string().min(1),
  naiveTranscriptPath: z.string().min(1),
  verifier: VerifierSchema,
  tags: z.array(z.string().min(1)).default([]),
});

export const MemoryEntrySchema = z.object({
  schema_version: z.number().int(),
  id: z.string().min(1),
  agent_id: z.string().min(1),
  memory_type: z.enum(["episodic", "semantic", "procedural", "checkpoint", "hybrid", "reflection"]),
  task_id: z.string().nullable(),
  tags: z.array(z.string().min(1)).default([]),
  text: z.string().min(1),
  content_hash: z.string().min(1),
  metadata: z.record(z.unknown()).default({}),
  created_at: z.string().min(1),
});

export const ContextSliceSchema = z.object({
  id: z.string().min(1),
  source: z.enum(["prompt", "naive_transcript", "memq_core", "soul_journal", "graphiti", "qdrant", "langchain_rerank"]),
  text: z.string().min(1),
  score: z.number(),
  tokens: z.number().int().nonnegative(),
  metadata: z.record(z.unknown()).default({}),
});

export const RetrievalMetricsSchema = z.object({
  liveMemQ: z.boolean(),
  liveGraphiti: z.boolean(),
  liveQdrant: z.boolean(),
  langChainRerankUsed: z.boolean(),
  sliceCount: z.number().int().nonnegative(),
  packedSliceCount: z.number().int().nonnegative(),
  promptTokens: z.number().int().nonnegative(),
  packedTokens: z.number().int().nonnegative(),
  sourceCounts: z.record(z.number().int().nonnegative()),
  notes: z.array(z.string()),
});

export const ContextBundleSchema = z.object({
  taskId: z.string().min(1),
  track: TrackSchema,
  condition: ConditionSchema,
  query: z.string().min(1),
  prompt: z.string().min(1),
  slices: z.array(ContextSliceSchema),
  metrics: RetrievalMetricsSchema,
});

export const AdapterPayloadSchema = z.object({
  answer: z.string().default(""),
  artifacts: z.array(z.string()).default([]),
  toolCalls: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).default({}),
});

export const ResultSchema = z.object({
  runName: z.string().min(1),
  taskId: z.string().min(1),
  track: TrackSchema,
  condition: ConditionSchema,
  repetition: z.number().int().positive(),
  model: ModelSchema,
  status: z.enum(["passed", "failed", "skipped"]),
  reason: z.string().default(""),
  startedAt: z.string().min(1),
  finishedAt: z.string().min(1),
  durationMs: z.number().int().nonnegative(),
  promptTokens: z.number().int().nonnegative(),
  packedTokens: z.number().int().nonnegative(),
  verifier: z.object({
    matchedFacts: z.array(z.string()),
    missingFacts: z.array(z.string()),
    forbiddenFacts: z.array(z.string()),
  }),
  retrieval: RetrievalMetricsSchema,
  payload: AdapterPayloadSchema,
});

export type Track = z.infer<typeof TrackSchema>;
export type Condition = z.infer<typeof ConditionSchema>;
export type RunManifest = z.infer<typeof RunManifestSchema>;
export type TaskSpec = z.infer<typeof TaskSpecSchema>;
export type MemoryEntry = z.infer<typeof MemoryEntrySchema>;
export type ContextSlice = z.infer<typeof ContextSliceSchema>;
export type ContextBundle = z.infer<typeof ContextBundleSchema>;
export type AdapterPayload = z.infer<typeof AdapterPayloadSchema>;
export type ResultRecord = z.infer<typeof ResultSchema>;
