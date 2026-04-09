# Publication Rules

The publish step now generates two public artifact families:

- retrieval artifacts
  - `artifacts/snapshot.json`
  - `artifacts/summary.md`
  - `artifacts/badges.json`
- same-model answer artifacts
  - `artifacts/llm-snapshot.json`
  - `artifacts/llm-summary.md`
  - `artifacts/llm-badges.json`

## Snapshot contract

A public snapshot must include:

- benchmark name and generated timestamp
- aggregated metrics by provider or condition
- case count
- raw artifact paths or enough metadata to recover the underlying results
- reproducibility metadata or linked reproducibility docs

## Release discipline

- never publish a headline number without the underlying raw result files
- never describe the same-model answer benchmark as a direct product retrieval win
- never describe the retrieval benchmark as an LLM benchmark
- never hide a worse comparator result if the committed artifacts show it
- never switch models between LLM answer conditions
- never describe lexical controls as commercial product competitors

## Standalone publication

This repository is the standalone public GitHub repo for MemQ Bench.

The source harness may also exist inside broader internal development
workspaces, but the public proof surface, workflows, artifacts, and badge rules
are anchored here.

## Badge policy

All public badges in this repo must be publicly verifiable from one of these sources:

- a GitHub Actions workflow visible in this repository
- a committed artifact file such as `artifacts/snapshot.json`, `artifacts/badges.json`, or `artifacts/llm-badges.json`
- a first-party documentation page inside this repository

Do not use presentation-only badge artwork for standards, alliances, or certification claims.
If a badge implies external verification, it must link to real public evidence.

Current approved badge classes:

- workflow badges
- retrieval snapshot badges derived from committed artifact JSON
- LLM answer snapshot badges derived from committed artifact JSON
- documentation badges that point to publication or reproducibility rules
