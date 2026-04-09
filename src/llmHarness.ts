import path from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import { readJsonFile, writeJsonFile } from "./io.js";
import { BenchmarkCaseSchema, RetrievedItemSchema } from "./retrievalSchemas.js";
import { LlmManifestSchema, LlmResultSchema, type LlmCondition, type LlmManifest, type LlmResult } from "./llmSchemas.js";

const execFileAsync = promisify(execFile);
const CasesSchema = z.array(BenchmarkCaseSchema).min(1);
const RetrievedItemsSchema = z.array(RetrievedItemSchema);

function providerForCondition(condition: LlmCondition): string {
  switch (condition) {
    case "no_memory":
      return "none";
    case "keyword_context":
      return "keyword_baseline";
    case "memq_context":
      return "memq_mcp";
    case "mem0_context":
      return "mem0_oss";
  }
}

function buildMetrics(answer: string, citations: string[], benchmarkCase: z.infer<typeof BenchmarkCaseSchema>) {
  const normalizedAnswer = answer.toLowerCase();
  const relevant = new Set(benchmarkCase.relevantSourceIds);
  const missingTerms = benchmarkCase.expectedTerms.filter((term) => !normalizedAnswer.includes(term.toLowerCase()));
  const matchedForbiddenTerms = benchmarkCase.forbiddenTerms.filter((term) => normalizedAnswer.includes(term.toLowerCase()));
  const relevantCitationCount = citations.filter((citation) => relevant.has(citation)).length;
  const forbiddenCitationCount = citations.filter((citation) => benchmarkCase.forbiddenSourceIds.includes(citation)).length;

  return {
    answerPass: missingTerms.length === 0 && matchedForbiddenTerms.length === 0,
    citationHit: benchmarkCase.primarySourceId ? citations.includes(benchmarkCase.primarySourceId) : relevantCitationCount > 0,
    citationRecall: benchmarkCase.relevantSourceIds.length === 0 ? 0 : relevantCitationCount / benchmarkCase.relevantSourceIds.length,
    forbiddenCitationCount,
    missingTerms,
    matchedForbiddenTerms,
  };
}

function pythonExecutable(rootDir: string, manifest: LlmManifest): string {
  return manifest.model.pythonPath
    ? path.resolve(rootDir, manifest.model.pythonPath)
    : manifest.model.venvPath
      ? path.resolve(rootDir, manifest.model.venvPath, "bin", "python")
      : "python3";
}

async function runPython(rootDir: string, manifest: LlmManifest, command: "doctor" | "answer", payload: Record<string, unknown>) {
  const payloadPath = path.join(rootDir, "artifacts", "tmp", `llm-${command}-${Date.now().toString(36)}.json`);
  await mkdir(path.dirname(payloadPath), { recursive: true });
  await writeFile(payloadPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  try {
    const { stdout, stderr } = await execFileAsync(
      pythonExecutable(rootDir, manifest),
      [path.join(rootDir, "python", "llm_answer_provider.py"), command, payloadPath],
      { cwd: rootDir },
    );
    const lines = `${stdout}\n${stderr}`.split("\n").map((line) => line.trim()).filter(Boolean);
    const marker = [...lines].reverse().find((line) => line.startsWith("MEMQ_BENCH_JSON:"));
    if (!marker) {
      throw new Error(`llm ${command} did not return a machine-readable payload`);
    }
    return JSON.parse(marker.slice("MEMQ_BENCH_JSON:".length)) as { ok: boolean; reason?: string; answer?: string; citations?: string[] };
  } finally {
    await rm(payloadPath, { force: true });
  }
}

function retrievalFile(rootDir: string, manifest: LlmManifest, provider: string, caseId: string): string {
  return path.join(
    rootDir,
    manifest.dataset.retrievalResultsDir,
    `memq-retrieval-smoke-${provider}-${caseId}-r${manifest.dataset.retrievalRepetition}.json`,
  );
}

async function loadContext(rootDir: string, manifest: LlmManifest, condition: LlmCondition, caseId: string) {
  if (condition === "no_memory") {
    return [];
  }
  const provider = providerForCondition(condition);
  const result = await readJsonFile(retrievalFile(rootDir, manifest, provider, caseId), z.object({ results: RetrievedItemsSchema }));
  return result.results;
}

export async function runLlmManifest(rootDir: string, manifestPath: string): Promise<LlmResult[]> {
  const manifest = await readJsonFile(path.join(rootDir, manifestPath), LlmManifestSchema);
  const cases = await readJsonFile(path.join(rootDir, manifest.dataset.casesPath), CasesSchema);
  const doctor = await runPython(rootDir, manifest, "doctor", {});
  const results: LlmResult[] = [];

  for (let repetition = 1; repetition <= manifest.repetitions; repetition += 1) {
    for (const benchmarkCase of cases) {
      for (const condition of manifest.conditions) {
        const providerContext = providerForCondition(condition);
        if (!doctor.ok) {
          const skipped: LlmResult = {
            runName: manifest.name,
            condition,
            repetition,
            caseId: benchmarkCase.id,
            providerContext,
            question: benchmarkCase.query,
            expectedTerms: benchmarkCase.expectedTerms,
            forbiddenTerms: benchmarkCase.forbiddenTerms,
            relevantSourceIds: benchmarkCase.relevantSourceIds,
            primarySourceId: benchmarkCase.primarySourceId,
            contextSourceIds: [],
            answer: "",
            citations: [],
            metrics: {
              answerPass: false,
              citationHit: false,
              citationRecall: 0,
              forbiddenCitationCount: 0,
              missingTerms: benchmarkCase.expectedTerms,
              matchedForbiddenTerms: [],
            },
            status: "skipped",
            reason: doctor.reason ?? "llm_doctor_failed",
          };
          LlmResultSchema.parse(skipped);
          await writeJsonFile(path.join(rootDir, manifest.outputDir, `${manifest.name}-${condition}-${benchmarkCase.id}-r${repetition}.json`), skipped);
          results.push(skipped);
          continue;
        }

        try {
          const contextItems = await loadContext(rootDir, manifest, condition, benchmarkCase.id);
          const response = await runPython(rootDir, manifest, "answer", {
            model: manifest.model.model,
            query: benchmarkCase.query,
            context_items: contextItems,
          });
          if (!response.ok) {
            throw new Error(response.reason ?? "llm_answer_failed");
          }

          const answer = response.answer ?? "";
          const citations = response.citations ?? [];
          const llmResult: LlmResult = {
            runName: manifest.name,
            condition,
            repetition,
            caseId: benchmarkCase.id,
            providerContext,
            question: benchmarkCase.query,
            expectedTerms: benchmarkCase.expectedTerms,
            forbiddenTerms: benchmarkCase.forbiddenTerms,
            relevantSourceIds: benchmarkCase.relevantSourceIds,
            primarySourceId: benchmarkCase.primarySourceId,
            contextSourceIds: contextItems.map((item) => item.sourceId),
            answer,
            citations,
            metrics: buildMetrics(answer, citations, benchmarkCase),
            status: "completed",
            reason: "",
          };
          LlmResultSchema.parse(llmResult);
          await writeJsonFile(path.join(rootDir, manifest.outputDir, `${manifest.name}-${condition}-${benchmarkCase.id}-r${repetition}.json`), llmResult);
          results.push(llmResult);
        } catch (error) {
          const failed: LlmResult = {
            runName: manifest.name,
            condition,
            repetition,
            caseId: benchmarkCase.id,
            providerContext,
            question: benchmarkCase.query,
            expectedTerms: benchmarkCase.expectedTerms,
            forbiddenTerms: benchmarkCase.forbiddenTerms,
            relevantSourceIds: benchmarkCase.relevantSourceIds,
            primarySourceId: benchmarkCase.primarySourceId,
            contextSourceIds: [],
            answer: "",
            citations: [],
            metrics: {
              answerPass: false,
              citationHit: false,
              citationRecall: 0,
              forbiddenCitationCount: 0,
              missingTerms: benchmarkCase.expectedTerms,
              matchedForbiddenTerms: [],
            },
            status: "failed",
            reason: error instanceof Error ? error.message : String(error),
          };
          LlmResultSchema.parse(failed);
          await writeJsonFile(path.join(rootDir, manifest.outputDir, `${manifest.name}-${condition}-${benchmarkCase.id}-r${repetition}.json`), failed);
          results.push(failed);
        }
      }
    }
  }

  return results;
}

