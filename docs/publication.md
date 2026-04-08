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

This benchmark can be published as a standalone GitHub repo by splitting the
`benchmarks/memq-bench` subtree. The workflow file is stored inside the benchmark
directory so it survives the split cleanly.

## Badge policy

This repo uses first-party MemQ benchmark badges only:

- verified snapshot
- official docs
- reproducible
- translation proof
- workflow ready
- smoke validated
