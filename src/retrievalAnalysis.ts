import path from "node:path";
import { listJsonFiles, readJsonFile, writeJsonFile, writeTextFile } from "./io.js";
import { RetrievalResultSchema, type RetrievalProviderId, type RetrievalResult } from "./retrievalSchemas.js";

interface ProviderAggregate {
  runs: number;
  completed: number;
  failed: number;
  skipped: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  hitAtKRate: number;
  primaryAt1Rate: number;
  avgRecallAtK: number;
  avgPrecisionAtK: number;
  avgMrr: number;
  leakageFreeRate: number;
}

interface Comparison {
  provider: RetrievalProviderId;
  comparator: RetrievalProviderId;
  primaryAt1DeltaPoints: number;
  recallDeltaPoints: number;
  latencyDeltaMs: number;
}

function percentile(values: number[], percentileValue: number): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1));
  return sorted[index] ?? 0;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function aggregateByProvider(results: RetrievalResult[]): Record<RetrievalProviderId, ProviderAggregate> {
  const grouped = new Map<RetrievalProviderId, RetrievalResult[]>();
  for (const result of results) {
    const bucket = grouped.get(result.provider) ?? [];
    bucket.push(result);
    grouped.set(result.provider, bucket);
  }

  return Object.fromEntries(
    [...grouped.entries()].map(([provider, bucket]) => {
      const completed = bucket.filter((result) => result.status === "completed");
      const failed = bucket.filter((result) => result.status === "failed").length;
      const skipped = bucket.filter((result) => result.status === "skipped").length;
      const latencies = completed.map((result) => result.searchLatencyMs);
      const leakageFreeRate = average(completed.map((result) => (result.metrics.leakageCount === 0 && result.metrics.namespaceLeakageCount === 0 ? 1 : 0)));

      return [provider, {
        runs: bucket.length,
        completed: completed.length,
        failed,
        skipped,
        avgLatencyMs: Math.round(average(latencies)),
        p95LatencyMs: percentile(latencies, 95),
        hitAtKRate: average(completed.map((result) => (result.metrics.hitAtK ? 1 : 0))),
        primaryAt1Rate: average(completed.map((result) => (result.metrics.primaryAt1 ? 1 : 0))),
        avgRecallAtK: average(completed.map((result) => result.metrics.recallAtK)),
        avgPrecisionAtK: average(completed.map((result) => result.metrics.precisionAtK)),
        avgMrr: average(completed.map((result) => result.metrics.mrr)),
        leakageFreeRate,
      }];
    }),
  ) as Record<RetrievalProviderId, ProviderAggregate>;
}

function buildComparisons(summary: Record<RetrievalProviderId, ProviderAggregate>): Comparison[] {
  const comparisons: Comparison[] = [];
  const memq = summary.memq_mcp;
  if (!memq) {
    return comparisons;
  }

  for (const comparator of ["mem0_oss", "keyword_baseline"] as const) {
    const aggregate = summary[comparator];
    if (!aggregate) {
      continue;
    }
    comparisons.push({
      provider: "memq_mcp",
      comparator,
      primaryAt1DeltaPoints: Math.round((memq.primaryAt1Rate - aggregate.primaryAt1Rate) * 100),
      recallDeltaPoints: Math.round((memq.avgRecallAtK - aggregate.avgRecallAtK) * 100),
      latencyDeltaMs: memq.avgLatencyMs - aggregate.avgLatencyMs,
    });
  }

  return comparisons;
}

function buildBadges(summary: Record<RetrievalProviderId, ProviderAggregate>, caseCount: number, comparison: Comparison | undefined, generatedAt: string) {
  return {
    snapshot: {
      generatedAt,
      caseCount,
      memqPrimaryAt1Pct: Math.round((summary.memq_mcp?.primaryAt1Rate ?? 0) * 100),
      memqRecallPct: Math.round((summary.memq_mcp?.avgRecallAtK ?? 0) * 100),
      mem0PrimaryAt1Pct: Math.round((summary.mem0_oss?.primaryAt1Rate ?? 0) * 100),
      baselinePrimaryAt1Pct: Math.round((summary.keyword_baseline?.primaryAt1Rate ?? 0) * 100),
      memqVsMem0PrimaryDeltaPts: comparison?.primaryAt1DeltaPoints ?? 0,
    },
  };
}

export async function publishRetrieval(resultsDir: string, outFile: string): Promise<void> {
  const files = await listJsonFiles(resultsDir);
  const results = await Promise.all(files.map((file) => readJsonFile(file, RetrievalResultSchema)));
  const summary = aggregateByProvider(results);
  const generatedAt = new Date().toISOString();
  const caseCount = new Set(results.map((result) => result.caseId)).size;
  const comparisons = buildComparisons(summary);
  const snapshot = {
    benchmark: "memq-bench-retrieval",
    generatedAt,
    corpus: {
      caseCount,
      namespaces: [...new Set(results.map((result) => result.namespace))].sort(),
      families: [...new Set(results.map((result) => result.family))].sort(),
    },
    providers: summary,
    comparisons,
    reproducibility: {
      resultCount: results.length,
      providers: [...new Set(results.map((result) => result.provider))].sort(),
      repetitions: [...new Set(results.map((result) => result.repetition))].sort(),
    },
    artifacts: files.map((file) => path.relative(process.cwd(), file)),
  };

  const memqVsMem0 = comparisons.find((comparison) => comparison.provider === "memq_mcp" && comparison.comparator === "mem0_oss");
  const badges = buildBadges(summary, caseCount, memqVsMem0, generatedAt);

  const lines: string[] = [
    "# MemQ Retrieval Benchmark Summary",
    "",
    `Generated: ${generatedAt}`,
    "",
    "## Providers",
  ];

  for (const [provider, aggregate] of Object.entries(summary)) {
    lines.push(`### ${provider}`);
    lines.push(`- runs: ${aggregate.runs}`);
    lines.push(`- completed: ${aggregate.completed}`);
    lines.push(`- failed: ${aggregate.failed}`);
    lines.push(`- skipped: ${aggregate.skipped}`);
    lines.push(`- primary@1: ${Math.round(aggregate.primaryAt1Rate * 100)}%`);
    lines.push(`- hit@k: ${Math.round(aggregate.hitAtKRate * 100)}%`);
    lines.push(`- recall@k: ${Math.round(aggregate.avgRecallAtK * 100)}%`);
    lines.push(`- precision@k: ${Math.round(aggregate.avgPrecisionAtK * 100)}%`);
    lines.push(`- mrr: ${aggregate.avgMrr.toFixed(3)}`);
    lines.push(`- leakage-free: ${Math.round(aggregate.leakageFreeRate * 100)}%`);
    lines.push(`- avg latency ms: ${aggregate.avgLatencyMs}`);
    lines.push(`- p95 latency ms: ${aggregate.p95LatencyMs}`);
    lines.push("");
  }

  if (comparisons.length > 0) {
    lines.push("## Comparisons");
    for (const comparison of comparisons) {
      lines.push(`- ${comparison.provider} vs ${comparison.comparator}: primary@1 delta ${comparison.primaryAt1DeltaPoints} pts, recall delta ${comparison.recallDeltaPoints} pts, avg latency delta ${comparison.latencyDeltaMs} ms`);
    }
    lines.push("");
  }

  await writeJsonFile(outFile, snapshot);
  await writeJsonFile(path.join(path.dirname(outFile), "badges.json"), badges);
  await writeTextFile(path.join(path.dirname(outFile), "summary.md"), lines.join("\n"));
}
