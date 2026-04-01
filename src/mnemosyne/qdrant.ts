import type { ContextSlice, TaskSpec } from "../schemas.js";
import { buildSlices } from "./contextSlicer.js";

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

export function deterministicEmbedding(text: string, dimension = 256): number[] {
  const vector = new Array<number>(dimension).fill(0);
  for (const token of tokenize(text)) {
    let hash = 2166136261;
    for (const char of token) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    const index = Math.abs(hash) % dimension;
    vector[index] = (vector[index] ?? 0) + 1;
  }
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return norm === 0 ? vector : vector.map((value) => value / norm);
}

function cosine(left: number[], right: number[]): number {
  let sum = 0;
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    sum += (left[index] ?? 0) * (right[index] ?? 0);
  }
  return sum;
}

export function rerankWithFastEmbedding(
  task: TaskSpec,
  candidates: ContextSlice[],
  segmentTokens: number,
): ContextSlice[] {
  const queryVector = deterministicEmbedding(task.query);
  return candidates
    .map((slice) => {
      const score = slice.score + cosine(queryVector, deterministicEmbedding(slice.text));
      const [reranked] = buildSlices("qdrant", slice.text, score, segmentTokens, {
        ...slice.metadata,
        reranked_from: slice.source,
      });
      return reranked ?? { ...slice, score };
    })
    .sort((left, right) => right.score - left.score);
}

export async function probeQdrant(qdrantUrl: string | undefined): Promise<{ live: boolean; notes: string[] }> {
  if (!qdrantUrl) {
    return { live: false, notes: ["Qdrant URL not configured."] };
  }
  try {
    const response = await fetch(`${qdrantUrl}/collections`, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) {
      return { live: false, notes: [`Qdrant probe failed with status ${response.status}.`] };
    }
    return { live: true, notes: [] };
  } catch (error) {
    return { live: false, notes: [`Qdrant unavailable: ${String(error)}`] };
  }
}
