# Coordination Benchmarks Tutorial

This repo includes two classic distributed-systems problems adapted to MemQ.

## Byzantine Generals

The benchmark checks whether the agent remembers that:

- intents are written into a shared namespace
- translated vectors are normalized before comparison
- a `2 of 3` quorum is required
- only the quorum-approved command is promoted into `_commons`

This demonstrates that MemQ can preserve coordination state across agents while
also carrying translation facts across embedding spaces.

## Dining Philosophers

The benchmark checks whether the agent remembers that:

- fork access is modeled with namespace-scoped leases
- odd and even workers acquire resources in different orders to break deadlock
- the resolved coordination pattern is written into `_commons` as a `resolved_issue`

This demonstrates that MemQ can turn solved coordination problems into reusable
commons memory.
