import type { ContextSlice, TaskSpec } from "../schemas.js";
import { deterministicEmbedding } from "./qdrant.js";

class DeterministicHashEmbeddings {
  public async embedDocuments(documents: string[]): Promise<number[][]> {
    return documents.map((document) => deterministicEmbedding(document));
  }

  public async embedQuery(query: string): Promise<number[]> {
    return deterministicEmbedding(query);
  }
}

export async function rerankWithLangChain(task: TaskSpec, slices: ContextSlice[]): Promise<{ used: boolean; slices: ContextSlice[] }> {
  try {
    const [{ MemoryVectorStore }, { Document }] = await Promise.all([
      import("langchain/vectorstores/memory"),
      import("@langchain/core/documents"),
    ]);

    const store = new MemoryVectorStore(new DeterministicHashEmbeddings());
    const documents = slices.map(
      (slice) => new Document({ pageContent: slice.text, metadata: { id: slice.id, score: slice.score, source: slice.source } }),
    );
    await store.addDocuments(documents);
    const reranked = await store.similaritySearch(task.query, Math.min(6, slices.length));
    const rerankedIds = new Set(reranked.map((document) => String(document.metadata.id)));
    return {
      used: true,
      slices: slices
        .map((slice) => ({
          ...slice,
          source: rerankedIds.has(slice.id) ? "langchain_rerank" : slice.source,
          score: rerankedIds.has(slice.id) ? slice.score + 5 : slice.score,
        }))
        .sort((left, right) => right.score - left.score),
    };
  } catch {
    return { used: false, slices };
  }
}
