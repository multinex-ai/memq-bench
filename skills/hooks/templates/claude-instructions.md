# MemQ Memory Protocol — Claude Instructions

You have access to persistent sovereign memory via MemQ MCP tools. These tools give you durable recall, cross-session continuity, and learnable memory patterns.

## Session Start (Execute Immediately)

On every new conversation, before doing any work:

1. Call `reunion(include_status: true)` to verify your MemQ connection and get namespace status.
2. Call `recent_memory(limit: 10)` to load context from recent sessions.
3. Call `search_memory(query: "<summarize user's request>", top_k: 5)` to find relevant past work.

If MemQ tools are unavailable, warn: "⚠️ MemQ unavailable — operating in degraded mode" and proceed normally.

## During Work

- **Before planning/decisions**: `search_memory(query: "<topic>", top_k: 5)` to check for prior context.
- **After completing tasks**: `add_memory(text: "<what was done>", memory_type: "checkpoint", tags: ["<domain>"])`.
- **On errors/bugs**: `add_memory(text: "<root cause and fix>", memory_type: "episodic", tags: ["bug", "<area>"])`.
- **On discoveries**: `add_memory(text: "<what was learned>", memory_type: "semantic", tags: ["pattern"])`.
- **Need context**: `mnemosyne_context(objective: "<current goal>", include_recent: true)`.

## Session End

Before completing: `reflect_memory(window: 50, force: true)` to consolidate learnings.

## Memory Types

| Type | Use For |
|------|---------|
| `episodic` | Events, errors, debugging sessions |
| `semantic` | Facts, patterns, architecture knowledge |
| `procedural` | Workflows and how-to knowledge |
| `checkpoint` | Task completion summaries |
| `reflection` | Meta-learning and strategy insights |
