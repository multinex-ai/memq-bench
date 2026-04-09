import path from "node:path";
import { performance } from "node:perf_hooks";
import { z } from "zod";
import { ensureDir, readJsonFile, writeJsonFile } from "./io.js";
import { scoreRetrieval } from "./retrievalMetrics.js";
import {
  BenchmarkCaseSchema,
  CorpusEntrySchema,
  RetrievalManifestSchema,
  RetrievalResultSchema,
  type BenchmarkCase,
  type CorpusEntry,
  type RetrievalMetrics,
  type RetrievalResult,
} from "./retrievalSchemas.js";
import { createRetrievalProvider } from "./retrievalProviders.js";

const CorpusSchema = z.array(CorpusEntrySchema).min(1);
const CasesSchema = z.array(BenchmarkCaseSchema).min(1);

function zeroMetrics(): RetrievalMetrics {
  return {
    hitAtK: false,
    primaryAt1: false,
    precisionAtK: 0,
    recallAtK: 0,
    mrr: 0,
    leakageCount: 0,
    namespaceLeakageCount: 0,
    relevantRanks: [],
    forbiddenRanks: [],
  };
}

async function loadDataset(rootDir: string, corpusPath: string, casesPath: string): Promise<{ corpus: CorpusEntry[]; cases: BenchmarkCase[] }> {
  const [corpus, cases] = await Promise.all([
    readJsonFile(path.join(rootDir, corpusPath), CorpusSchema),
    readJsonFile(path.join(rootDir, casesPath), CasesSchema),
  ]);
  return { corpus, cases };
}

function buildSkippedResult(
  runName: string,
  provider: RetrievalResult["provider"],
  repetition: number,
  benchmarkCase: BenchmarkCase,
  topK: number,
  reason: string,
  prepareDurationMs: number,
  seededEntryCount: number,
): RetrievalResult {
  const timestamp = new Date().toISOString();
  return {
    runName,
    provider,
    repetition,
    caseId: benchmarkCase.id,
    family: benchmarkCase.family,
    namespace: benchmarkCase.namespace,
    query: benchmarkCase.query,
    topK,
    status: "skipped",
    reason,
    startedAt: timestamp,
    finishedAt: timestamp,
    searchLatencyMs: 0,
    prepareDurationMs,
    seededEntryCount,
    relevantSourceIds: benchmarkCase.relevantSourceIds,
    forbiddenSourceIds: benchmarkCase.forbiddenSourceIds,
    metrics: zeroMetrics(),
    results: [],
  };
}

export async function runRetrievalManifest(rootDir: string, manifestPath: string): Promise<RetrievalResult[]> {
  const manifest = await readJsonFile(path.join(rootDir, manifestPath), RetrievalManifestSchema);
  const outputDir = path.join(rootDir, manifest.outputDir);
  await ensureDir(outputDir);

  const { corpus, cases } = await loadDataset(rootDir, manifest.dataset.corpusPath, manifest.dataset.casesPath);
  const results: RetrievalResult[] = [];

  for (let repetition = 1; repetition <= manifest.repetitions; repetition += 1) {
    for (const providerConfig of manifest.providers.filter((provider) => provider.enabled)) {
      const provider = createRetrievalProvider(rootDir, manifest, providerConfig.id);
      const runId = `${manifest.name}-r${repetition}-${provider.id}`;
      let prepareDurationMs = 0;
      let seededEntryCount = 0;

      try {
        const prepared = await provider.prepare(rootDir, manifest, corpus, runId);
        prepareDurationMs = prepared.prepareDurationMs;
        seededEntryCount = prepared.seededEntryCount;
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        for (const benchmarkCase of cases) {
          const skipped = buildSkippedResult(
            manifest.name,
            provider.id,
            repetition,
            benchmarkCase,
            benchmarkCase.topK ?? manifest.topK,
            reason,
            prepareDurationMs,
            seededEntryCount,
          );
          RetrievalResultSchema.parse(skipped);
          const fileName = `${manifest.name}-${provider.id}-${benchmarkCase.id}-r${repetition}.json`;
          await writeJsonFile(path.join(outputDir, fileName), skipped);
          results.push(skipped);
        }
        await provider.teardown();
        continue;
      }

      for (const benchmarkCase of cases) {
        const topK = benchmarkCase.topK ?? manifest.topK;
        const startedAt = new Date().toISOString();
        const start = performance.now();

        try {
          const retrieved = await provider.search(benchmarkCase, topK);
          const searchLatencyMs = Math.round(performance.now() - start);
          const finishedAt = new Date().toISOString();
          const metrics = scoreRetrieval(benchmarkCase, retrieved, topK);

          const result: RetrievalResult = {
            runName: manifest.name,
            provider: provider.id,
            repetition,
            caseId: benchmarkCase.id,
            family: benchmarkCase.family,
            namespace: benchmarkCase.namespace,
            query: benchmarkCase.query,
            topK,
            status: "completed",
            reason: "",
            startedAt,
            finishedAt,
            searchLatencyMs,
            prepareDurationMs,
            seededEntryCount,
            relevantSourceIds: benchmarkCase.relevantSourceIds,
            forbiddenSourceIds: benchmarkCase.forbiddenSourceIds,
            metrics,
            results: retrieved,
          };

          RetrievalResultSchema.parse(result);
          const fileName = `${manifest.name}-${provider.id}-${benchmarkCase.id}-r${repetition}.json`;
          await writeJsonFile(path.join(outputDir, fileName), result);
          results.push(result);
        } catch (error) {
          const finishedAt = new Date().toISOString();
          const failure: RetrievalResult = {
            runName: manifest.name,
            provider: provider.id,
            repetition,
            caseId: benchmarkCase.id,
            family: benchmarkCase.family,
            namespace: benchmarkCase.namespace,
            query: benchmarkCase.query,
            topK,
            status: "failed",
            reason: error instanceof Error ? error.message : String(error),
            startedAt,
            finishedAt,
            searchLatencyMs: Math.round(performance.now() - start),
            prepareDurationMs,
            seededEntryCount,
            relevantSourceIds: benchmarkCase.relevantSourceIds,
            forbiddenSourceIds: benchmarkCase.forbiddenSourceIds,
            metrics: zeroMetrics(),
            results: [],
          };
          RetrievalResultSchema.parse(failure);
          const fileName = `${manifest.name}-${provider.id}-${benchmarkCase.id}-r${repetition}.json`;
          await writeJsonFile(path.join(outputDir, fileName), failure);
          results.push(failure);
        }
      }

      await provider.teardown();
    }
  }

  return results;
}

