# MemQ Retrieval Benchmark Summary

Generated: 2026-04-28T18:02:44.970Z

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
- avg latency ms: 2511
- p95 latency ms: 2814

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
- avg latency ms: 13
- p95 latency ms: 25

## Comparisons
- memq_mcp vs mem0_oss: primary@1 delta 42 pts, recall delta 0 pts, avg latency delta -2498 ms
- memq_mcp vs keyword_baseline: primary@1 delta 42 pts, recall delta 8 pts, avg latency delta 13 ms
