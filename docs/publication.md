# Publication

The publish step generates two primary artifacts:

- `artifacts/summary.md`
- `artifacts/snapshot.json`

`snapshot.json` is the machine-readable source of truth for public docs, benchmark pages, and pricing analysis.

## Snapshot Contract

A snapshot must include:

- benchmark name and generated timestamp
- aggregated metrics by track and condition
- task counts and skip counts
- artifact paths used to compute the summary
- reproducibility metadata

## Release Discipline

- never publish a snapshot without the underlying raw result files
- never claim uplift from `fixture` runs as if they were the final external benchmark surface
- never merge runs with incompatible model configs into one headline metric
- never describe benchmark-only accelerators as shipped product behavior unless promoted into runtime docs

## Badge Policy

This repo uses two badge classes:

- **verification badges** for benchmark state, reproducibility, and validated snapshot status
- **standards badges** for coalition, alliance, or ecosystem signaling

`Cloud Star Alliance` and `AIUC / AAPA` currently ship here as presentation badges only. They should not be treated as third-party certification claims until an external program reference is published and linked.
