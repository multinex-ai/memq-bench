# Reproducibility Protocol

This benchmark is reproducible if an independent operator can:

1. install the benchmark dependencies
2. start the local benchmark stack
3. run the retrieval benchmark from this repo
4. run the same-model LLM benchmark from this repo
5. inspect the raw result JSON for every provider and condition
6. regenerate the published snapshot and summary artifacts

## Verification rules

- retrieval outcomes are determined from committed gold labels in the checked-in cases
- answer-quality outcomes are determined from committed expected terms, forbidden terms, and citation targets
- a run artifact is invalid if provider or condition metadata, case id, or computed metrics are missing
- retrieval and LLM answer claims must be discussed separately

## Runtime pinning

Every published run should capture:

- benchmark repo commit SHA
- benchmark manifest identifier
- corpus version or dataset commit
- model identifier and temperature for the LLM answer benchmark
- MemQ server version or image tag when available
- Mem0 package version and vector backend

## Isolation

- `keyword_baseline` must only use the checked-in lexical scorer
- `no_memory` must not receive retrieval snippets
- `keyword_context`, `memq_context`, and `mem0_context` must all use the same model and answer prompt
- MemQ runs must stay isolated by benchmark run tag and namespace
- Mem0 runs must stay isolated by benchmark run tag and collection namespace

## Publication rule

The public story must remain literal:

- retrieval benchmark claims are product retrieval claims
- same-model answer benchmark claims are context-effect claims
- speed claims must be tied to the measured harness and configuration
- gaps must remain published alongside wins when the committed artifacts show them
