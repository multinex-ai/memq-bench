import type { BenchmarkCase, RetrievedItem, RetrievalMetrics } from "./retrievalSchemas.js";

export function dedupeRetrievedItems(items: RetrievedItem[]): RetrievedItem[] {
  const seen = new Set<string>();
  const deduped: RetrievedItem[] = [];
  for (const item of items) {
    if (seen.has(item.sourceId)) {
      continue;
    }
    seen.add(item.sourceId);
    deduped.push({ ...item, rank: deduped.length + 1 });
  }
  return deduped;
}

export function scoreRetrieval(benchmarkCase: BenchmarkCase, rawItems: RetrievedItem[], topK: number): RetrievalMetrics {
  const items = dedupeRetrievedItems(rawItems).slice(0, topK);
  const relevant = new Set(benchmarkCase.relevantSourceIds);
  const forbidden = new Set(benchmarkCase.forbiddenSourceIds);

  const relevantRanks: number[] = [];
  const forbiddenRanks: number[] = [];
  let namespaceLeakageCount = 0;

  items.forEach((item, index) => {
    const rank = index + 1;
    if (relevant.has(item.sourceId)) {
      relevantRanks.push(rank);
    }
    if (forbidden.has(item.sourceId)) {
      forbiddenRanks.push(rank);
    }
    if (item.namespace !== benchmarkCase.namespace) {
      namespaceLeakageCount += 1;
    }
  });

  const relevantHitCount = relevantRanks.length;
  const primarySourceId = benchmarkCase.primarySourceId ?? benchmarkCase.relevantSourceIds[0];
  const primaryAt1 = items[0]?.sourceId === primarySourceId;

  return {
    hitAtK: relevantHitCount > 0,
    primaryAt1,
    precisionAtK: relevantHitCount / topK,
    recallAtK: relevantHitCount / benchmarkCase.relevantSourceIds.length,
    mrr: relevantRanks.length > 0 ? 1 / Math.min(...relevantRanks) : 0,
    leakageCount: forbiddenRanks.length,
    namespaceLeakageCount,
    relevantRanks,
    forbiddenRanks,
  };
}

