import path from "node:path";
import { performance } from "node:perf_hooks";
import { buildContextBundle } from "./memq/retrievalRouter.js";
import { getAdapter } from "./adapters/index.js";
import { ensureDir, readJsonFile, writeJsonFile } from "./io.js";
import { ResultSchema, RunManifestSchema, TaskSpecSchema, type ResultRecord } from "./schemas.js";

function verify(task: Awaited<ReturnType<typeof loadTask>>, answer: string): ResultRecord["verifier"] {
  const lowerAnswer = answer.toLowerCase();
  const matchedFacts = task.verifier.requiredFacts.filter((fact) => lowerAnswer.includes(fact.toLowerCase()));
  const missingFacts = task.verifier.requiredFacts.filter((fact) => !lowerAnswer.includes(fact.toLowerCase()));
  const forbiddenFacts = task.verifier.forbiddenFacts.filter((fact) => lowerAnswer.includes(fact.toLowerCase()));
  return { matchedFacts, missingFacts, forbiddenFacts };
}

async function loadTask(rootDir: string, taskId: string) {
  return readJsonFile(path.join(rootDir, "tasks", taskId, "task.json"), TaskSpecSchema);
}

export async function runManifest(rootDir: string, manifestPath: string): Promise<ResultRecord[]> {
  const manifest = await readJsonFile(path.join(rootDir, manifestPath), RunManifestSchema);
  const outputDir = path.join(rootDir, manifest.outputDir);
  await ensureDir(outputDir);
  const results: ResultRecord[] = [];

  for (let repetition = 1; repetition <= manifest.repetitions; repetition += 1) {
    for (const track of manifest.matrix.tracks) {
      for (const condition of manifest.matrix.conditions) {
        for (const taskId of manifest.tasks) {
          const task = await loadTask(rootDir, taskId);
          const adapter = getAdapter(track);
          const startedAt = new Date().toISOString();
          const start = performance.now();
          const bundle = await buildContextBundle(rootDir, manifest, task, track, condition);
          const execution = await adapter.execute(rootDir, task, bundle);
          const finishedAt = new Date().toISOString();
          const durationMs = Math.round(performance.now() - start);

          const result: ResultRecord = {
            runName: manifest.name,
            taskId: task.id,
            track,
            condition,
            repetition,
            model: manifest.model,
            status: execution.status === "skipped" ? "skipped" : "failed",
            reason: execution.reason ?? "",
            startedAt,
            finishedAt,
            durationMs,
            promptTokens: bundle.metrics.promptTokens,
            packedTokens: bundle.metrics.packedTokens,
            verifier: { matchedFacts: [], missingFacts: task.verifier.requiredFacts, forbiddenFacts: [] },
            retrieval: bundle.metrics,
            payload: execution.payload ?? { answer: "", artifacts: [], toolCalls: [], metadata: {} },
          };

          if (execution.status === "completed" && execution.payload) {
            const verifier = verify(task, execution.payload.answer);
            result.verifier = verifier;
            result.status = verifier.missingFacts.length === 0 && verifier.forbiddenFacts.length === 0 ? "passed" : "failed";
          }

          ResultSchema.parse(result);
          const fileName = `${manifest.name}-${track}-${condition}-${task.id}-r${repetition}.json`;
          await writeJsonFile(path.join(outputDir, fileName), result);
          results.push(result);
        }
      }
    }
  }

  return results;
}
