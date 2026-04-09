import path from "node:path";
import { listJsonFiles, readJsonFile, writeJsonFile, writeTextFile } from "./io.js";
import { LlmResultSchema, type LlmCondition, type LlmResult } from "./llmSchemas.js";

interface Aggregate {
  runs: number;
  completed: number;
  failed: number;
  skipped: number;
  answerPassRate: number;
  citationHitRate: number;
  citationRecall: number;
}

interface ConditionComparison {
  condition: LlmCondition;
  comparator: LlmCondition;
  answerPassDeltaPoints: number;
  citationHitDeltaPoints: number;
  citationRecallDeltaPoints: number;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function aggregate(results: LlmResult[]): Record<LlmCondition, Aggregate> {
  const grouped = new Map<LlmCondition, LlmResult[]>();
  for (const result of results) {
    const bucket = grouped.get(result.condition) ?? [];
    bucket.push(result);
    grouped.set(result.condition, bucket);
  }
  return Object.fromEntries(
    [...grouped.entries()].map(([condition, bucket]) => {
      const completed = bucket.filter((result) => result.status === "completed");
      return [condition, {
        runs: bucket.length,
        completed: completed.length,
        failed: bucket.filter((result) => result.status === "failed").length,
        skipped: bucket.filter((result) => result.status === "skipped").length,
        answerPassRate: average(completed.map((result) => result.metrics.answerPass ? 1 : 0)),
        citationHitRate: average(completed.map((result) => result.metrics.citationHit ? 1 : 0)),
        citationRecall: average(completed.map((result) => result.metrics.citationRecall)),
      }];
    }),
  ) as Record<LlmCondition, Aggregate>;
}

function buildComparisons(summary: Record<LlmCondition, Aggregate>): ConditionComparison[] {
  const comparisons: ConditionComparison[] = [];
  const memq = summary.memq_context;
  if (memq) {
    for (const comparator of ["no_memory", "keyword_context", "mem0_context"] as const) {
      const aggregate = summary[comparator];
      if (!aggregate) {
        continue;
      }
      comparisons.push({
        condition: "memq_context",
        comparator,
        answerPassDeltaPoints: Math.round((memq.answerPassRate - aggregate.answerPassRate) * 100),
        citationHitDeltaPoints: Math.round((memq.citationHitRate - aggregate.citationHitRate) * 100),
        citationRecallDeltaPoints: Math.round((memq.citationRecall - aggregate.citationRecall) * 100),
      });
    }
  }
  return comparisons;
}

export async function publishLlm(resultsDir: string, outFile: string): Promise<void> {
  const files = await listJsonFiles(resultsDir);
  const results = await Promise.all(files.map((file) => readJsonFile(file, LlmResultSchema)));
  const summary = aggregate(results);
  const generatedAt = new Date().toISOString();
  const comparisons = buildComparisons(summary);
  const memqVsNoMemory = comparisons.find((comparison) => comparison.condition === "memq_context" && comparison.comparator === "no_memory");
  const memqVsMem0 = comparisons.find((comparison) => comparison.condition === "memq_context" && comparison.comparator === "mem0_context");
  const badges = {
    snapshot: {
      generatedAt,
      noMemoryAnswerPassPct: Math.round((summary.no_memory?.answerPassRate ?? 0) * 100),
      keywordAnswerPassPct: Math.round((summary.keyword_context?.answerPassRate ?? 0) * 100),
      memqAnswerPassPct: Math.round((summary.memq_context?.answerPassRate ?? 0) * 100),
      mem0AnswerPassPct: Math.round((summary.mem0_context?.answerPassRate ?? 0) * 100),
      memqVsNoMemoryAnswerDeltaPts: memqVsNoMemory?.answerPassDeltaPoints ?? 0,
      memqVsMem0AnswerDeltaPts: memqVsMem0?.answerPassDeltaPoints ?? 0,
    },
  };
  const snapshot = {
    benchmark: "memq-llm-answer-benchmark",
    generatedAt,
    conditions: summary,
    comparisons,
    caseCount: new Set(results.map((result) => result.caseId)).size,
    resultCount: results.length,
  };

  const lines: string[] = ["# MemQ LLM Answer Benchmark Summary", "", `Generated: ${generatedAt}`, ""];
  for (const [condition, aggregate] of Object.entries(summary)) {
    lines.push(`## ${condition}`);
    lines.push(`- runs: ${aggregate.runs}`);
    lines.push(`- completed: ${aggregate.completed}`);
    lines.push(`- failed: ${aggregate.failed}`);
    lines.push(`- skipped: ${aggregate.skipped}`);
    lines.push(`- answer pass rate: ${Math.round(aggregate.answerPassRate * 100)}%`);
    lines.push(`- citation hit rate: ${Math.round(aggregate.citationHitRate * 100)}%`);
    lines.push(`- citation recall: ${Math.round(aggregate.citationRecall * 100)}%`);
    lines.push("");
  }

  if (comparisons.length > 0) {
    lines.push("## Comparisons");
    for (const comparison of comparisons) {
      lines.push(`- ${comparison.condition} vs ${comparison.comparator}: answer pass delta ${comparison.answerPassDeltaPoints} pts, citation hit delta ${comparison.citationHitDeltaPoints} pts, citation recall delta ${comparison.citationRecallDeltaPoints} pts`);
    }
    lines.push("");
  }

  await writeJsonFile(outFile, snapshot);
  await writeJsonFile(path.join(path.dirname(outFile), "llm-badges.json"), badges);
  await writeTextFile(path.join(path.dirname(outFile), "llm-summary.md"), lines.join("\n"));
}
