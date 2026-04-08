# MemQ Benchmark Summary

## Headline
- best MemQ condition: fixture:memq_accelerated
- baseline condition: fixture:naive_memory
- pass-point delta: 100

## Corpus
- task count: 5
- task ids: byzantine-generals-consensus, dining-philosophers-leases, embedding-translation-fabric, manual-copy-regression, protocol-tool-discipline

## fixture:memq_accelerated
- runs: 5
- passed: 5
- failed: 0
- skipped: 0
- avg duration ms: 115
- avg packed tokens: 171

## fixture:memq_core
- runs: 5
- passed: 5
- failed: 0
- skipped: 0
- avg duration ms: 17
- avg packed tokens: 171

## fixture:naive_memory
- runs: 5
- passed: 0
- failed: 5
- skipped: 0
- avg duration ms: 1
- avg packed tokens: 61

## fixture:stateless
- runs: 5
- passed: 0
- failed: 5
- skipped: 0
- avg duration ms: 2
- avg packed tokens: 34
