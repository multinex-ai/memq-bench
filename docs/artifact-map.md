# Artifact Map

This repo ships the benchmark outputs needed to inspect the current validated smoke run.

## Primary Public Artifacts

- [`../artifacts/snapshot.json`](../artifacts/snapshot.json) — machine-readable benchmark summary and reproducibility metadata.
- [`../artifacts/summary.md`](../artifacts/summary.md) — human-readable summary for the current published snapshot.
- [`../artifacts/results/`](../artifacts/results/) — raw run-level result files used to compute the published snapshot.

## Run Manifests

- [`../configs/smoke.json`](../configs/smoke.json) — deterministic smoke run used for the current validated fixture proof.
- [`../configs/debug.json`](../configs/debug.json) — focused single-run manifest for iteration.
- [`../configs/nightly.json`](../configs/nightly.json) — broader run manifest intended for scheduled execution.

## Task Corpus

- [`../tasks/cross-session-release-image/task.json`](../tasks/cross-session-release-image/task.json)
- [`../tasks/manual-copy-regression/task.json`](../tasks/manual-copy-regression/task.json)
- [`../tasks/protocol-tool-discipline/task.json`](../tasks/protocol-tool-discipline/task.json)

Each task has a deterministic verifier contract and an optional naive transcript baseline.

## Fixtures

- [`../fixtures/soul-journal/memq.jsonl`](../fixtures/soul-journal/memq.jsonl) — canonical Soul Journal replay seed for the accelerated path.
- [`../fixtures/workspaces/`](../fixtures/workspaces/) — task-scoped fixture workspaces used by the harness.

## Source of Truth Rule

Public benchmark claims should cite:

1. the exact snapshot file
2. the exact run manifest
3. the underlying raw result files
4. the methodology and reproducibility documents in this repo
