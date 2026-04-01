# Methodology

MemQ Bench measures task-level uplift, not raw storage latency.

## Primary Metrics

- task success rate
- first-pass success rate
- retries to success
- wall-clock duration
- approximate prompt token load
- repeated-error recurrence rate

## Secondary Metrics

- memory retrieval hit rate
- context slice compression ratio
- exact lookup usage
- recent-context usage
- Graphiti augmentation hit rate
- Qdrant retrieval hit rate
- LangChain rerank usage
- Soul Journal coverage ratio

## Accelerated Retrieval Stack

`memq_accelerated` layers the following over the shipped Deno server:

- query routing across exact, recent, semantic, and reflection flows
- context slicing with approximately 2,048-token semantic segments and bounded prompt budgets
- Soul Journal replay and compaction-aware ranking
- optional live Graphiti traversal
- optional live Qdrant retrieval
- optional LangChain reranking when the package is installed

This track is deliberately benchmark-only. It shows the upside ceiling before product promotion.
