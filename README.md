<p align="center">
  <img src="./assets/memq-bench-banner.svg" alt="MemQ Bench banner" width="100%" />
</p>

<p align="center">
  <a href="https://github.com/multinex-ai/memq-bench/actions/workflows/benchmark.yml"><img src="https://img.shields.io/github/actions/workflow/status/multinex-ai/memq-bench/benchmark.yml?branch=master&label=benchmark&style=for-the-badge" alt="Benchmark workflow status" /></a>
  <a href="./artifacts/snapshot.json"><img src="https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/multinex-ai/memq-bench/master/artifacts/badges.json&query=%24.snapshot.caseCount&label=retrieval%20cases&color=7c3aed&style=for-the-badge" alt="Retrieval case count" /></a>
  <a href="./artifacts/snapshot.json"><img src="https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/multinex-ai/memq-bench/master/artifacts/badges.json&query=%24.snapshot.memqPrimaryAt1Pct&label=memq%20retrieval%20primary%401&suffix=%25&color=0ea5e9&style=for-the-badge" alt="MemQ retrieval primary at one" /></a>
  <a href="./artifacts/snapshot.json"><img src="https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/multinex-ai/memq-bench/master/artifacts/badges.json&query=%24.snapshot.mem0PrimaryAt1Pct&label=mem0%20retrieval%20primary%401&suffix=%25&color=10b981&style=for-the-badge" alt="Mem0 retrieval primary at one" /></a>
  <a href="./artifacts/llm-snapshot.json"><img src="https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/multinex-ai/memq-bench/master/artifacts/llm-badges.json&query=%24.snapshot.memqAnswerPassPct&label=memq%20llm%20answer%20pass&suffix=%25&color=0284c7&style=for-the-badge" alt="MemQ LLM answer pass rate" /></a>
  <a href="./artifacts/llm-snapshot.json"><img src="https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/multinex-ai/memq-bench/master/artifacts/llm-badges.json&query=%24.snapshot.noMemoryAnswerPassPct&label=no%20memory%20llm%20pass&suffix=%25&color=f59e0b&style=for-the-badge" alt="No memory LLM answer pass rate" /></a>
  <a href="./artifacts/llm-snapshot.json"><img src="https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/multinex-ai/memq-bench/master/artifacts/llm-badges.json&query=%24.snapshot.memqVsNoMemoryAnswerDeltaPts&label=memq%20vs%20no%20memory&suffix=%20pts&color=2563eb&style=for-the-badge" alt="MemQ versus no memory answer delta" /></a>
  <a href="./artifacts/llm-snapshot.json"><img src="https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/multinex-ai/memq-bench/master/artifacts/llm-badges.json&query=%24.snapshot.memqVsMem0AnswerDeltaPts&label=memq%20vs%20mem0&suffix=%20pts&color=64748b&style=for-the-badge" alt="MemQ versus Mem0 answer delta" /></a>
</p>

<p align="center">
  Public benchmark repo for measuring operational memory retrieval and same-model answer quality with and without MemQ-backed context.
</p>

## Docs

- [Benchmark docs](./docs/README.md)
- [Methodology](./docs/methodology.md)
- [Reproducibility protocol](./docs/reproducibility-protocol.md)
- [Retrieval snapshot](./artifacts/snapshot.json)
- [Retrieval summary](./artifacts/summary.md)
- [LLM snapshot](./artifacts/llm-snapshot.json)
- [LLM summary](./artifacts/llm-summary.md)

## What this repo measures

`memq-bench` now has two benchmark layers over the same operational memory corpus.

1. Retrieval benchmark
   Compares `memq_mcp`, `mem0_oss`, and a deterministic `keyword_baseline` on 12 paraphrased operational queries across freshness, incident response, procedural recall, disambiguation, project memory, and preference memory.
2. Same-model answer benchmark
   Uses the same Gemini model to answer the same 12 questions in four conditions:
   - `no_memory`
   - `keyword_context`
   - `memq_context`
   - `mem0_context`

The retrieval layer measures ranking quality and leakage. The LLM layer measures whether memory actually changes the final answer quality for the same model.

## Headline result

This repo is designed to answer two different public questions without conflating them:

1. Does MemQ retrieve the right memories better than other systems?
2. Does giving an LLM MemQ-backed context improve its final answers compared with no memory at all?

On the current checked-in corpus, the honest answer is:

- `MemQ vs Mem0 retrieval`: MemQ is faster and more leakage-resistant, but weaker on raw retrieval quality.
- `MemQ vs no-memory LLM`: the same model moves from `0%` answer pass with no memory to `75%` with MemQ context.
- `MemQ vs Mem0 LLM`: MemQ materially improves answers versus no memory, but trails Mem0 context on this corpus.

## Current snapshot

Retrieval benchmark, 12 cases, 3 repetitions, exact-memory seeding:

| Provider | Primary@1 | Hit@K | Recall@K | Leakage-free | Avg latency |
| --- | --- | --- | --- | --- | --- |
| `mem0_oss` | `58%` | `100%` | `100%` | `67%` | `3353 ms` |
| `keyword_baseline` | `58%` | `100%` | `92%` | `67%` | `0 ms` |
| `memq_mcp` | `17%` | `31%` | `29%` | `89%` | `8 ms` |

Same-model answer benchmark, 12 cases, Gemini `2.0-flash`, 1 repetition:

| Condition | Answer pass | Citation hit | Citation recall |
| --- | --- | --- | --- |
| `mem0_context` | `92%` | `50%` | `50%` |
| `keyword_context` | `75%` | `50%` | `54%` |
| `memq_context` | `75%` | `42%` | `42%` |
| `no_memory` | `0%` | `0%` | `0%` |

The current snapshot is intentionally honest:

- MemQ is materially faster than the comparator stack in this setup.
- MemQ is also the most leakage-free provider in the current retrieval corpus.
- On this corpus, MemQ retrieval quality is behind both Mem0 OSS and the lexical control.
- The same-model answer benchmark still shows a real memory effect: `memq_context` moves the model from `0%` answer pass without memory to `75%` with MemQ context.
- The repo publishes both the uplift story and the gap story so readers can verify exactly where MemQ helps today and where it still trails.

## Why the benchmark is structured this way

The old fixture-only harness could prove repository wiring, but it could not prove product behavior. The current suite fixes that:

- MemQ is benchmarked through a live MCP surface.
- Mem0 is benchmarked through real `mem0ai` calls backed by live Qdrant.
- Queries are paraphrased away from the exact stored text so a keyword control is not automatically perfect.
- The LLM benchmark uses the same model across all memory conditions to isolate the effect of context, not model choice.

## Benchmark corpus

The checked-in corpus is operational on purpose. It focuses on the kinds of memory retrieval problems agents and operators actually hit:

- current versus deprecated runbooks and policies
- root-cause recall under distractors
- owner plus deadline retrieval
- same-name disambiguation
- notification preferences
- protocol/tool discipline

Files:

- [Corpus](./datasets/ops-retrieval/corpus.json)
- [Cases](./datasets/ops-retrieval/cases.json)

## Quickstart

Start the local benchmark stack:

```bash
cd memq-bench
docker compose up -d
```

Install dependencies:

```bash
npm install
npm run setup:mem0
```

Run the retrieval benchmark:

```bash
npm run bench
```

Run the same-model LLM answer benchmark:

```bash
npm run bench:llm
```

## Notes

- `npm run bench` currently writes the retrieval snapshot to [artifacts/snapshot.json](./artifacts/snapshot.json).
- `npm run bench:llm` writes the answer-quality snapshot to [artifacts/llm-snapshot.json](./artifacts/llm-snapshot.json).
- The legacy fixture harness still exists in the repo as `npm run bench:legacy`, but it is no longer the primary public benchmark story.

## Skills, Hooks & MCP Install

This repo also distributes reusable agent skills and IDE hook templates for integrating MemQ persistent memory into AI coding tools.

### One-line MCP install

```bash
curl -fsSL https://memq.multinex.ai/install-mcp | bash
```

Auto-detects Claude Desktop, Cursor, VS Code, Antigravity, and Claude Code.

### Agent Hook Templates

Copy the appropriate template into your project root:

| Tool | Command |
|------|---------|
| **Cursor** | `curl -fsSL https://raw.githubusercontent.com/multinex-ai/memq-bench/master/skills/hooks/templates/.cursorrules > .cursorrules` |
| **Claude Code** | `mkdir -p .claude && curl -fsSL https://raw.githubusercontent.com/multinex-ai/memq-bench/master/skills/hooks/templates/claude-instructions.md > .claude/instructions.md` |
| **Gemini / Antigravity** | `curl -fsSL https://raw.githubusercontent.com/multinex-ai/memq-bench/master/skills/hooks/templates/GEMINI.md > GEMINI.md` |

### Skills

| Skill | Description |
|-------|-------------|
| [`memq-memory`](./skills/memq-memory/SKILL.md) | Session lifecycle hooks, memory types, context packing, episodic replay |
| [`memq-planning`](./skills/memq-planning/SKILL.md) | Durable plan state, checkpoints, multi-session workflows, bridge sync |

Install into your project:

```bash
cp -r skills/memq-memory/ .agents/skills/memq-memory/
cp -r skills/memq-planning/ .agents/skills/memq-planning/
```

Full setup guide: [`skills/hooks/MEMQ_AGENT_HOOKS.md`](./skills/hooks/MEMQ_AGENT_HOOKS.md)
