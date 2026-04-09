# MemQ Retrieval Benchmark Summary

Generated: 2026-04-09T04:03:56.996Z

## Providers
### keyword_baseline
- runs: 36
- completed: 36
- failed: 0
- skipped: 0
- primary@1: 58%
- hit@k: 100%
- recall@k: 92%
- precision@k: 22%
- mrr: 0.861
- leakage-free: 67%
- avg latency ms: 0
- p95 latency ms: 0

### mem0_oss
- runs: 36
- completed: 36
- failed: 0
- skipped: 0
- primary@1: 58%
- hit@k: 100%
- recall@k: 100%
- precision@k: 25%
- mrr: 0.917
- leakage-free: 67%
- avg latency ms: 3381
- p95 latency ms: 4163

### memq_mcp
- runs: 36
- completed: 36
- failed: 0
- skipped: 0
- primary@1: 100%
- hit@k: 100%
- recall@k: 100%
- precision@k: 25%
- mrr: 1.000
- leakage-free: 100%
- avg latency ms: 21
- p95 latency ms: 31

## Comparisons
- memq_mcp vs mem0_oss: primary@1 delta 42 pts, recall delta 0 pts, avg latency delta -3360 ms
- memq_mcp vs keyword_baseline: primary@1 delta 42 pts, recall delta 8 pts, avg latency delta 21 ms
