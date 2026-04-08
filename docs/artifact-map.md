# Artifact Map

This repo ships the outputs needed to inspect the current validated benchmark
surface.

## Primary public artifacts

- [`../artifacts/snapshot.json`](../artifacts/snapshot.json) — machine-readable benchmark summary and reproducibility metadata
- [`../artifacts/summary.md`](../artifacts/summary.md) — human-readable summary for the current snapshot
- [`../artifacts/translation-showcase.json`](../artifacts/translation-showcase.json) — canonical vector translation request and result
- [`../artifacts/translation-showcase.md`](../artifacts/translation-showcase.md) — human-readable translation proof
- [`../artifacts/results/`](../artifacts/results/) — raw run-level result files used to compute the published snapshot

## Run manifests

- [`../configs/smoke.json`](../configs/smoke.json) — deterministic smoke run used for the public proof
- [`../configs/debug.json`](../configs/debug.json) — focused single-run manifest for iteration
- [`../configs/nightly.json`](../configs/nightly.json) — broader run manifest intended for scheduled execution

## Task corpus

- [`../tasks/embedding-translation-fabric/task.json`](../tasks/embedding-translation-fabric/task.json)
- [`../tasks/byzantine-generals-consensus/task.json`](../tasks/byzantine-generals-consensus/task.json)
- [`../tasks/dining-philosophers-leases/task.json`](../tasks/dining-philosophers-leases/task.json)
- [`../tasks/manual-copy-regression/task.json`](../tasks/manual-copy-regression/task.json)
- [`../tasks/protocol-tool-discipline/task.json`](../tasks/protocol-tool-discipline/task.json)

## Fixtures

- [`../fixtures/soul-journal/memq.jsonl`](../fixtures/soul-journal/memq.jsonl) — canonical MemQ replay seed for the deterministic harness
- [`../fixtures/workspaces/`](../fixtures/workspaces/) — task-scoped fixture workspaces

## Source of truth rule

Public benchmark claims should cite:

1. the exact snapshot file
2. the exact run manifest
3. the exact raw result files
4. the methodology and reproducibility docs in this repo
