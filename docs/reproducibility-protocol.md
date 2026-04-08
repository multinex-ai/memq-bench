# Reproducibility Protocol

This benchmark is reproducible if an independent operator can:

1. install the benchmark dependencies
2. run the deterministic smoke manifest from this repo
3. inspect the raw result JSON for every task and condition
4. regenerate `artifacts/snapshot.json` and `artifacts/summary.md`
5. verify the same task outcomes with the same task corpus and fixture journal

## Verification rules

- task success is determined by deterministic verifiers only
- required facts must appear in the answer output exactly as declared in the task spec
- a run artifact is invalid if the model metadata, track, condition, task id, or verifier result is missing

## Runtime pinning

Every published run should capture:

- benchmark repo commit SHA
- task corpus version
- model config hash
- MemQ benchmark harness version
- optional graph augmentation availability
- optional vector augmentation availability

## Isolation

- `stateless` must not call MemQ
- `naive_memory` must not call MemQ
- `memq_core` may only use the core retrieval loop
- `memq_accelerated` must log every augmentation source and slicing decision

## Translation proof

The translation showcase is part of the reproducibility surface. If the request
and response pair changes, the benchmark docs and task corpus must be updated in
the same commit.
