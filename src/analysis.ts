import path from "node:path";
import { listJsonFiles, readJsonFile, writeJsonFile, writeTextFile } from "./io.js";
import { ResultSchema, type ResultRecord } from "./schemas.js";

interface Aggregate {
  runs: number;
  passed: number;
  failed: number;
  skipped: number;
  avgDurationMs: number;
  avgPackedTokens: number;
}

function aggregate(results: ResultRecord[]): Record<string, Aggregate> {
  const groups = new Map<string, ResultRecord[]>();
  for (const result of results) {
    const key = `${result.track}:${result.condition}`;
    const bucket = groups.get(key) ?? [];
    bucket.push(result);
    groups.set(key, bucket);
  }

  return Object.fromEntries(
    [...groups.entries()].map(([key, bucket]) => {
      const runs = bucket.length;
      const passed = bucket.filter((result) => result.status === "passed").length;
      const failed = bucket.filter((result) => result.status === "failed").length;
      const skipped = bucket.filter((result) => result.status === "skipped").length;
      const avgDurationMs = Math.round(bucket.reduce((sum, result) => sum + result.durationMs, 0) / runs);
      const avgPackedTokens = Math.round(bucket.reduce((sum, result) => sum + result.packedTokens, 0) / runs);
      return [key, { runs, passed, failed, skipped, avgDurationMs, avgPackedTokens }];
    }),
  );
}

export async function publish(resultsDir: string, outFile: string): Promise<void> {
  const files = await listJsonFiles(resultsDir);
  const results = await Promise.all(files.map((file) => readJsonFile(file, ResultSchema)));
  const grouped = aggregate(results);
  const snapshot = {
    benchmark: "memq-bench",
    generatedAt: new Date().toISOString(),
    artifacts: files.map((file) => path.relative(process.cwd(), file)),
    summary: grouped,
    reproducibility: {
      resultCount: results.length,
      tracks: [...new Set(results.map((result) => result.track))],
      conditions: [...new Set(results.map((result) => result.condition))],
      models: [...new Set(results.map((result) => `${result.model.provider}:${result.model.name}`))],
    },
  };

  const lines = ["# MemQ Benchmark Summary", ""];
  for (const [key, value] of Object.entries(grouped)) {
    lines.push(`## ${key}`);
    lines.push(`- runs: ${value.runs}`);
    lines.push(`- passed: ${value.passed}`);
    lines.push(`- failed: ${value.failed}`);
    lines.push(`- skipped: ${value.skipped}`);
    lines.push(`- avg duration ms: ${value.avgDurationMs}`);
    lines.push(`- avg packed tokens: ${value.avgPackedTokens}`);
    lines.push("");
  }

  await writeJsonFile(outFile, snapshot);
  await writeTextFile(path.join(path.dirname(outFile), "summary.md"), lines.join("\n"));
}
