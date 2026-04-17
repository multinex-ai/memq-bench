# MemQ Memory Protocol — Gemini / Antigravity Instructions

> ⚖️ Persistent sovereign memory via MemQ MCP tools. USE THEM for durable recall across sessions.

## Session Start (Execute Immediately)

```
1. reunion(include_status: true) → Verify MemQ connection
2. recent_memory(limit: 10) → Load recent context
3. search_memory(query: "<current task>", top_k: 5) → Find relevant past work
```

If unavailable: `⚠️ MemQ unavailable — operating in degraded mode (no persistent memory)`.

## During Work

- **Before planning**: `search_memory(query: "<topic>", top_k: 5)`
- **After completing**: `add_memory(text: "<summary>", memory_type: "checkpoint", tags: ["<domain>"])`
- **On errors**: `add_memory(text: "<root cause + fix>", memory_type: "episodic", tags: ["bug"])`
- **On discoveries**: `add_memory(text: "<learning>", memory_type: "semantic", tags: ["pattern"])`
- **Context needed**: `mnemosyne_context(objective: "<goal>", include_recent: true)`

## Session End

```
reflect_memory(window: 50, force: true) → Consolidate and persist patterns
```
