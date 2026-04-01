import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ContextBundle, ContextSlice, RunManifest, TaskSpec, Track, Condition } from "../schemas.js";
import { buildSlices, dedupeSlices, packSlices } from "./contextSlicer.js";
import { MemQClient } from "./client.js";
import { fetchGraphitiSlices } from "./graphiti.js";
import { rerankWithLangChain } from "./langchain.js";
import { probeQdrant, rerankWithFastEmbedding } from "./qdrant.js";
import { loadSoulJournal, recentSoulJournal, searchSoulJournal } from "./soulJournal.js";
import { countTokens } from "../tokenizer.js";

export async function buildContextBundle(
  rootDir: string,
  manifest: RunManifest,
  task: TaskSpec,
  track: Track,
  condition: Condition,
): Promise<ContextBundle> {
  const notes: string[] = [];
  const promptSlice = buildSlices("prompt", task.prompt, 100, manifest.accelerated.segmentTokens, { task_id: task.id });
  let candidateSlices: ContextSlice[] = [...promptSlice];
  let liveMemQ = false;
  let liveGraphiti = false;
  let liveQdrant = false;
  let langChainRerankUsed = false;

  if (condition === "naive_memory") {
    const naivePath = path.join(rootDir, task.naiveTranscriptPath);
    const naiveText = await readFile(naivePath, "utf8");
    candidateSlices.push(...buildSlices("naive_transcript", naiveText, 15, manifest.accelerated.segmentTokens));
  }

  if (condition === "memq_core" || condition === "memq_accelerated") {
    const soulEntries = await loadSoulJournal(path.join(rootDir, manifest.accelerated.soulJournalPath));
    const coreHits = searchSoulJournal(soulEntries, task, 6);
    const recentHits = recentSoulJournal(soulEntries, 4);
    candidateSlices.push(
      ...coreHits.flatMap((entry, index) =>
        buildSlices("memq_core", entry.text, 40 - index, manifest.accelerated.segmentTokens, {
          id: entry.id,
          task_id: entry.task_id,
          memory_type: entry.memory_type,
        }),
      ),
    );
    candidateSlices.push(
      ...recentHits.flatMap((entry, index) =>
        buildSlices("memq_core", entry.text, 10 - index, manifest.accelerated.segmentTokens, {
          id: entry.id,
          task_id: entry.task_id,
          memory_type: entry.memory_type,
          recent: true,
        }),
      ),
    );

    try {
      const client = new MemQClient(manifest.memq.url, manifest.memq.timeoutMs);
      const status = await client.memoryStatus();
      if (status) {
        liveMemQ = true;
        notes.push("MemQ MCP live memory_status probe succeeded.");
        const liveSearch = await client.searchMemory(task.query, 4, task.tags);
        const liveRecent = await client.recentMemory(4, task.tags);
        candidateSlices.push(
          ...liveSearch.flatMap((entry, index) =>
            buildSlices("memq_core", entry.text, 60 - index, manifest.accelerated.segmentTokens, {
              id: entry.id,
              task_id: entry.task_id,
              live: true,
            }),
          ),
        );
        candidateSlices.push(
          ...liveRecent.flatMap((entry, index) =>
            buildSlices("memq_core", entry.text, 20 - index, manifest.accelerated.segmentTokens, {
              id: entry.id,
              task_id: entry.task_id,
              recent: true,
              live: true,
            }),
          ),
        );
      }
    } catch (error) {
      notes.push(`MemQ MCP fallback to local Soul Journal: ${String(error)}`);
    }
  }

  if (condition === "memq_accelerated") {
    const graphiti = await fetchGraphitiSlices(
      manifest.accelerated.graphitiUrl,
      task,
      manifest.accelerated.segmentTokens,
      manifest.memq.timeoutMs,
    );
    liveGraphiti = graphiti.live;
    notes.push(...graphiti.notes);
    candidateSlices.push(...graphiti.slices);

    const qdrant = await probeQdrant(manifest.accelerated.qdrantUrl);
    liveQdrant = qdrant.live;
    notes.push(...qdrant.notes);
    candidateSlices = rerankWithFastEmbedding(task, candidateSlices, manifest.accelerated.segmentTokens);
    const langChain = await rerankWithLangChain(task, candidateSlices);
    langChainRerankUsed = langChain.used;
    candidateSlices = langChain.slices;
  }

  const deduped = dedupeSlices(candidateSlices);
  const packed = packSlices(deduped, manifest.accelerated.contextBudgetTokens);
  const sourceCounts = packed.reduce<Record<string, number>>((accumulator, slice) => {
    accumulator[slice.source] = (accumulator[slice.source] ?? 0) + 1;
    return accumulator;
  }, {});

  return {
    taskId: task.id,
    track,
    condition,
    query: task.query,
    prompt: task.prompt,
    slices: packed,
    metrics: {
      liveMemQ,
      liveGraphiti,
      liveQdrant,
      langChainRerankUsed,
      sliceCount: deduped.length,
      packedSliceCount: packed.length,
      promptTokens: countTokens(task.prompt),
      packedTokens: packed.reduce((sum, slice) => sum + slice.tokens, 0),
      sourceCounts,
      notes,
    },
  };
}
