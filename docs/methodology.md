# Methodology

`memq-bench` now measures two different things and keeps them separate.

## 1. Retrieval benchmark

This suite measures whether a memory system can retrieve the right stored items for a paraphrased operational query.

### Providers

- `memq_mcp`
  Live MemQ MCP `add_memory` and `search_memory` calls against the local benchmark stack.
- `mem0_oss`
  Real `mem0ai` calls backed by live Qdrant with exact memory insertion (`infer=false`).
- `keyword_baseline`
  Deterministic lexical scorer over the same corpus, included as a control rather than a product claim.

### Corpus design

The corpus is checked in at [datasets/ops-retrieval/corpus.json](../datasets/ops-retrieval/corpus.json) and the query cases live at [datasets/ops-retrieval/cases.json](../datasets/ops-retrieval/cases.json).

The cases intentionally target operational memory tasks:

- freshness and superseded facts
- incident root cause
- procedural runbooks
- project owner plus deadline retrieval
- same-name disambiguation
- notification preference recall
- MemQ protocol/tool recall

### Seeding protocol

- Every provider is seeded with the same exact memory texts.
- MemQ writes are isolated with a run-scoped tag and agent namespace.
- Mem0 writes are isolated with a run-scoped collection and user namespace.
- Mem0 uses exact insertion (`infer=false`) so the retrieval benchmark measures retrieval, not fact extraction quality.
- MemQ uses a short post-seed settle window before measurement starts to avoid counting ingestion visibility lag as retrieval failure.

### Retrieval metrics

- `primary@1`
  Whether the primary gold document was rank 1.
- `hit@k`
  Whether any relevant document was retrieved within the measured window.
- `recall@k`
  Fraction of gold relevant documents retrieved.
- `precision@k`
  Fraction of returned documents that were actually relevant.
- `MRR`
  Reciprocal rank of the first relevant hit.
- `leakage-free rate`
  Fraction of runs with no forbidden hits and no namespace leakage.
- `latency`
  Search-only latency. Seeding time is tracked separately and not mixed into query latency.

## 2. Same-model answer benchmark

This suite measures whether memory changes the answer quality of the same LLM.

### Model setup

- Model: Gemini `2.0-flash`
- Temperature: `0`
- Output format: strict JSON with `answer` and `citations`

### Conditions

- `no_memory`
  The model answers with no context.
- `keyword_context`
  The model receives the top lexical control snippets.
- `memq_context`
  The model receives the top MemQ snippets from the retrieval benchmark.
- `mem0_context`
  The model receives the top Mem0 snippets from the retrieval benchmark.

### Answer scoring

Each benchmark case carries deterministic answer checks:

- `expectedTerms`
  Terms that must appear in the answer.
- `forbiddenTerms`
  Terms that must not appear.
- `relevantSourceIds`
  Gold source ids for citation recall.
- `primarySourceId`
  Primary citation target when one source is the key supporting memory.

From that, the answer suite computes:

- `answer pass rate`
  All expected terms present and no forbidden terms present.
- `citation hit rate`
  The model cited the primary relevant source, or at least one relevant source when there is no primary.
- `citation recall`
  Fraction of gold relevant sources cited.

## Reproducibility rules

- All benchmark inputs are checked in.
- All benchmark outputs are written as committed JSON artifacts.
- Claims should quote the snapshot files directly, not unpublished local runs.
- Retrieval and answer benchmarks should be discussed separately. High retrieval quality and high answer quality are related, but they are not the same metric.

## Interpreting the current results

The current snapshot should be read literally:

- The retrieval benchmark is a product retrieval comparison.
- The LLM answer benchmark is a same-model context comparison.
- A memory system can be fast and leakage-resistant while still underperforming on retrieval quality.
- A context condition can materially improve answer quality even if its raw retrieval numbers are weaker than another provider.
