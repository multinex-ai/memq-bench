# Quickstart

## Run the hosted retrieval benchmark

Hosted MemQ access is provisioned through the Billing Manager:
[start MemQ signup](https://billing.multinex.ai/signup?product=memq&next=%2Fcheckout%3Fproduct%3Dmemq-contributor).

```bash
cd memq-bench
npm install
npm run setup:mem0
docker compose up -d qdrant falkordb
export MEMQ_API_KEY_AUTH_HEADER="Bearer <your MemQ API token>"
npm run bench
```

That command sequence:

1. type-checks the harness
2. clears old retrieval result files
3. runs hosted MemQ MCP against the Mem0 OSS/Qdrant comparator
4. republishes the benchmark snapshot

## Inspect the results

- [`../../artifacts/summary.md`](../../artifacts/summary.md)
- [`../../artifacts/snapshot.json`](../../artifacts/snapshot.json)
- [`../../artifacts/retrieval-results/`](../../artifacts/retrieval-results/)

## Run the focused legacy local debug manifest

```bash
npm run debug
```

That single-task run is useful when iterating on translation facts or a new task verifier. It is a legacy local fixture harness and is not the primary hosted MemQ benchmark path.
