# MemQ Retrieval Benchmark Summary

Generated: 2026-04-09T02:54:04.412Z

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
- avg latency ms: 3353
- p95 latency ms: 4672

### memq_mcp
- runs: 36
- completed: 36
- failed: 0
- skipped: 0
- primary@1: 17%
- hit@k: 31%
- recall@k: 29%
- precision@k: 7%
- mrr: 0.255
- leakage-free: 89%
- avg latency ms: 8
- p95 latency ms: 22

## Comparisons
- memq_mcp vs mem0_oss: primary@1 delta -42 pts, recall delta -71 pts, avg latency delta -3345 ms
- memq_mcp vs keyword_baseline: primary@1 delta -42 pts, recall delta -62 pts, avg latency delta 8 ms
