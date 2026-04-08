# Methodology

MemQ Bench measures task-level memory and coordination uplift, not raw storage
latency.

## Primary metrics

- task success rate
- first-pass success rate
- wall-clock duration
- approximate prompt token load
- pass-point delta versus baselines
- retrieval source coverage

## Secondary metrics

- memory retrieval hit rate
- context slice compression ratio
- exact lookup usage
- recent-context usage
- translation proof retention
- `_commons` publication recall
- optional graph and vector augmentation availability

## Conditions

| Condition | Purpose |
| --- | --- |
| `stateless` | No memory system is available. |
| `naive_memory` | Transcript-style recall only. No structured retrieval or memory tooling. |
| `memq_core` | Current MemQ loop: `memory_status`, `search_memory`, `recent_memory`, `get_memory`, `add_memory`, `reflect_memory`. |
| `memq_accelerated` | Benchmark-only retrieval ceiling with bounded slice packing and optional external augmentation. |

## Benchmark families

### Translation memory

`embedding-translation-fabric` proves the agent can retrieve the exact
translation contract, not just a vague paraphrase.

### Multi-agent coordination

`byzantine-generals-consensus` and `dining-philosophers-leases` adapt classic
distributed-systems problems into MemQ-native benchmark cases:

- translated vectors are normalized before consensus
- namespace-scoped leases prevent resource contention collapse
- resolved strategies are written into `_commons`

### Operational memory

`manual-copy-regression` and `protocol-tool-discipline` keep the benchmark tied
to real operator and agent workflows.

## Accelerated retrieval stack

`memq_accelerated` layers the following over the core loop:

- bounded context slicing
- Soul Journal replay
- optional graph augmentation
- optional vector retrieval probing
- optional reranking

This track remains benchmark-only. It is published as a ceiling, not as a
shipped default behavior claim.
