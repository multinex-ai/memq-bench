---
name: memq-memory
description: Persistent sovereign memory for AI coding agents via MemQ MCP tools. Provides session lifecycle hooks, memory patterns, and best-practice recipes for durable recall, episodic replay, and cross-session continuity.
version: 1.0.0
homepage: https://multinex.ai/memq
tools:
  - add_memory
  - query_memory
  - search_memory
  - recent_memory
  - reflect_memory
  - save_context
  - memory_status
  - health_check
  - reunion
  - mnemosyne_context
---

# MemQ Memory Skill

Persistent sovereign memory for AI coding agents. This skill teaches agents how to use MemQ MCP tools effectively for durable recall, session continuity, and cross-conversation intelligence.

## Prerequisites

MemQ MCP server must be connected. Install via:

```bash
curl -fsSL https://memq.multinex.ai/install-mcp | bash
```

Or manually add to your MCP client configuration:

```json
{
  "mcpServers": {
    "memq": {
      "url": "https://mcp.multinex.ai/mcp/v1",
      "auth": "oauth2",
      "discoveryUrl": "https://billing.multinex.ai/.well-known/oauth-authorization-server"
    }
  }
}
```

## Session Lifecycle Hooks

### On Session Start

Execute these steps immediately when a new conversation begins:

```
1. reunion() → Handshake with MemQ, get namespace status and protocol version
2. recent_memory(limit: 10) → Load last 10 memories for immediate context
3. search_memory(query: "<current task description>", top_k: 5) → Find relevant past work
```

**Example:**

```
→ reunion(include_status: true)
← { protocol: "2.7", namespace: "org/project", status: "healthy" }

→ recent_memory(limit: 10)
← [{ text: "Fixed auth bug in middleware...", type: "checkpoint" }, ...]

→ search_memory(query: "billing checkout flow", top_k: 5)
← [{ text: "Stripe webhook handler needs...", score: 0.92 }, ...]
```

### During Work

Use these patterns while working on tasks:

| When | Tool | Example |
|------|------|---------|
| Before planning/decisions | `search_memory` | `search_memory(query: "similar authentication pattern", top_k: 5)` |
| After completing a task | `add_memory` | `add_memory(text: "Implemented retry logic for API calls using exponential backoff", memory_type: "checkpoint", tags: ["api", "retry"])` |
| On encountering errors | `add_memory` | `add_memory(text: "TypeError in auth middleware caused by null session — fixed by adding guard clause", memory_type: "episodic", tags: ["bug", "auth"])` |
| On discovering patterns | `add_memory` | `add_memory(text: "This codebase uses Zod for all IO boundary validation", memory_type: "semantic", tags: ["pattern", "validation"])` |
| Saving important context | `save_context` | `save_context(content: "Architecture decision: chose Workers over Lambda for edge latency", kind: "semantic")` |

### On Session End

Consolidate learnings before the conversation closes:

```
reflect_memory(window: 50, force: true) → Compress and consolidate recent work into durable patterns
```

## Memory Types

| Type | When to Use | Example |
|------|-------------|---------|
| `episodic` | Events, errors, debugging sessions | "Fixed race condition in checkout flow" |
| `semantic` | Facts, patterns, architecture knowledge | "Auth uses HMAC-SHA256 with 30s replay window" |
| `procedural` | How-to knowledge, workflows | "Deploy via: push to master → CI → wrangler deploy" |
| `checkpoint` | Task completion summaries | "Completed billing dashboard overhaul: 7 files modified" |
| `reflection` | Meta-learning, strategy insights | "Complex auth bugs are faster to fix by checking middleware first" |

## Advanced Patterns

### Context Packing

Use `mnemosyne_context` to get a pre-packed context bundle from all memory tiers:

```
mnemosyne_context(objective: "Debug the failing webhook handler", include_recent: true, include_learning: true)
```

Returns a HOT/WARM/COLD/ENGINE context pack optimized for the given objective.

### Episodic Replay

When debugging similar issues to past ones, use brain tools:

```
brain_recall_episode(cue: "webhook timeout failure", include_related: true, limit: 10)
brain_associate(cue: "stripe checkout error", include_temporal: true)
```

### Predictive Correction

Before executing risky operations, check predictions:

```
brain_predict(objective: "Deploying new auth middleware to production", limit: 10)
```

Returns forecasted risks, guardrails, and corrective patterns from past experience.

### Sleep Consolidation

For long-running projects, run periodic consolidation:

```
brain_consolidate_sleep(limit: 100, persist: true, include_commons_candidates: true)
```

Compresses context, extracts semantic rules, and surfaces patterns worthy of shared commons promotion.

## Tagging Best Practices

Use consistent, hierarchical tags for better retrieval:

| Category | Tags |
|----------|------|
| Domain | `auth`, `billing`, `api`, `ui`, `database` |
| Action | `bug`, `feature`, `refactor`, `deploy`, `debug` |
| Severity | `critical`, `minor`, `optimization` |
| Project | `memq`, `billing-manager`, `nexus-ranger` |

## Health Monitoring

Check MemQ system health at any time:

```
health_check() → Aggregate backend status
memory_status() → Detailed telemetry, limits, and tier config
namespace_info() → Authenticated namespace boundary and billing posture
```

## Degraded Mode

If MemQ MCP tools are unavailable:

1. Emit warning: "⚠️ MemQ unavailable — operating in degraded mode (no persistent memory)"
2. Continue execution without memory operations
3. This is acceptable for offline development
