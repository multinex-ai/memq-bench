# Reproducibility Protocol

This benchmark is reproducible if an independent operator can:

1. install the benchmark dependencies
2. point the harness at the same MemQ image and storage services
3. run the same task corpus with the same run manifest
4. verify the same deterministic task outcomes
5. inspect the raw result JSON and recompute the published summary

## Verification Rules

- task success is determined by deterministic verifiers only
- required facts must appear in the answer output exactly as declared in the task spec
- a run artifact is invalid if the model metadata, track, condition, task id, or verifier result is missing

## Runtime Pinning

Every published run should capture:

- benchmark repo commit SHA
- task corpus version
- model config hash
- MemQ image tag or digest
- Qdrant version
- FalkorDB version
- optional Graphiti URL and availability
- optional Qdrant URL and availability

## Isolation

- `stateless` must not call MemQ
- `naive_memory` must not call MemQ
- `memq_core` may only use the core retrieval loop
- `memq_accelerated` must log every augmentation source and slicing decision
