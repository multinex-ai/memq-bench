# Artifact Map

This repo ships the inputs and outputs needed to inspect the current public
benchmark surface.

## Primary public artifacts

- [`../artifacts/snapshot.json`](../artifacts/snapshot.json) — machine-readable retrieval benchmark summary
- [`../artifacts/summary.md`](../artifacts/summary.md) — human-readable retrieval summary
- [`../artifacts/badges.json`](../artifacts/badges.json) — retrieval badge values derived from the committed snapshot
- [`../artifacts/llm-snapshot.json`](../artifacts/llm-snapshot.json) — machine-readable same-model answer benchmark summary
- [`../artifacts/llm-summary.md`](../artifacts/llm-summary.md) — human-readable same-model answer summary
- [`../artifacts/llm-badges.json`](../artifacts/llm-badges.json) — LLM badge values derived from the committed snapshot
- [`../artifacts/retrieval-results/`](../artifacts/retrieval-results/) — raw retrieval run artifacts
- [`../artifacts/llm-results/`](../artifacts/llm-results/) — raw LLM answer run artifacts

## Run manifests

- [`../configs/retrieval-smoke.json`](../configs/retrieval-smoke.json) — retrieval benchmark manifest
- [`../configs/llm-answer-smoke.json`](../configs/llm-answer-smoke.json) — same-model answer benchmark manifest

## Benchmark corpus

- [`../datasets/ops-retrieval/corpus.json`](../datasets/ops-retrieval/corpus.json) — stored operational memories
- [`../datasets/ops-retrieval/cases.json`](../datasets/ops-retrieval/cases.json) — paraphrased retrieval and answer-quality cases

## Harness sources

- [`../src/retrievalHarness.ts`](../src/retrievalHarness.ts) — retrieval benchmark execution
- [`../src/retrievalAnalysis.ts`](../src/retrievalAnalysis.ts) — retrieval aggregation and badge generation
- [`../src/llmHarness.ts`](../src/llmHarness.ts) — same-model answer benchmark execution
- [`../src/llmAnalysis.ts`](../src/llmAnalysis.ts) — answer benchmark aggregation and badge generation
- [`../python/mem0_provider.py`](../python/mem0_provider.py) — Mem0 comparator wrapper
- [`../python/llm_answer_provider.py`](../python/llm_answer_provider.py) — strict JSON LLM answer runner

## Legacy artifacts

- [`../artifacts/results/`](../artifacts/results/) — legacy fixture harness outputs retained for historical inspection
- [`../artifacts/translation-showcase.json`](../artifacts/translation-showcase.json) — earlier translation showcase artifact
- [`../artifacts/translation-showcase.md`](../artifacts/translation-showcase.md) — earlier translation showcase summary

## Source of truth rule

Public benchmark claims should cite:

1. the exact committed snapshot file
2. the exact committed manifest
3. the exact raw result files
4. the methodology and reproducibility docs in this repo
