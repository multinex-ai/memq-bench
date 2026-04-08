# Quickstart

## Run the deterministic benchmark

```bash
cd memq-bench
npm install
npm run bench
```

That command sequence:

1. type-checks the harness
2. clears old result files
3. runs the deterministic smoke matrix
4. republishes the benchmark snapshot

## Inspect the results

- [`../../artifacts/summary.md`](../../artifacts/summary.md)
- [`../../artifacts/snapshot.json`](../../artifacts/snapshot.json)
- [`../../artifacts/results/`](../../artifacts/results/)

## Run the focused debug manifest

```bash
npm run debug
```

That single-task run is useful when iterating on translation facts or a new task
verifier.
