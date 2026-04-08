# Publication Rules

The publish step generates two primary artifacts:

- `artifacts/summary.md`
- `artifacts/snapshot.json`

The repo also ships a translation-specific proof artifact:

- `artifacts/translation-showcase.json`
- `artifacts/translation-showcase.md`

## Snapshot contract

A public snapshot must include:

- benchmark name and generated timestamp
- aggregated metrics by track and condition
- task count and task ids
- raw artifact paths used to compute the summary
- reproducibility metadata

## Release discipline

- never publish a snapshot without the underlying raw result files
- never claim final commercial uplift from `fixture` runs alone
- never merge incompatible model configs into a single headline metric
- never describe benchmark-only accelerators as shipped runtime behavior
- never publish `_commons` effectiveness claims without citing the benchmark task that proves them

## Standalone publication

This repository is the standalone public GitHub repo for MemQ Bench.

The source benchmark harness may also exist inside broader internal development
workspaces, but the public proof surface, workflows, artifacts, and badge rules
are anchored here.

## Badge policy

All public badges in this repo must be publicly verifiable from one of these sources:

- a GitHub Actions workflow visible in this repository,
- a committed artifact file such as `artifacts/snapshot.json` or `artifacts/badges.json`,
- a first-party documentation page inside this repository.

Do not use presentation-only badge artwork for standards, alliances, or certification claims.
If a badge implies external verification, it must link to a real external program or public evidence URL.

Current approved badge classes:

- workflow badges,
- snapshot badges derived from committed artifact JSON,
- documentation badges that point to publication or reproducibility rules.
