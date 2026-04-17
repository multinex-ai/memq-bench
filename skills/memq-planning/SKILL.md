---
name: memq-planning
description: Durable plan state management for multi-step AI agent workflows. Checkpoint, resume, and coordinate complex tasks across sessions using MemQ's sovereign plan state engine.
version: 1.0.0
homepage: https://multinex.ai/memq
tools:
  - plan_state_read
  - plan_state_write
  - plan_state_checkpoint
  - plan_state_resume
  - bridge_sync
  - reflection_handoff
  - slice_project
  - hybrid_retrieve
---

# MemQ Planning Skill

Durable plan state management for multi-step AI agent workflows. Use this skill to persist, checkpoint, and resume complex plans across sessions — ensuring no work is ever lost.

## Prerequisites

MemQ MCP server must be connected with an active subscription that includes contract tools.

## Core Concepts

### Plan State

A plan is a durable state object that tracks:
- **Status**: `draft` → `active` → `checkpointed` → `completed`/`failed`
- **State patch**: Arbitrary JSON representing current progress
- **Summary**: Human-readable description of current state
- **Checkpoints**: Named snapshots you can resume from
- **Tags**: Searchable labels for organization

### Plan Lifecycle

```
┌─────────┐     ┌─────────┐     ┌──────────────┐     ┌───────────┐
│  draft   │ ──▷ │  active  │ ──▷ │ checkpointed │ ──▷ │ completed │
└─────────┘     └─────────┘     └──────────────┘     └───────────┘
                     │                   │
                     ▽                   ▽
                ┌─────────┐        ┌──────────┐
                │  failed  │        │  resumed  │
                └─────────┘        └──────────┘
```

## Workflow Patterns

### Pattern 1: Simple Task Tracking

For single-session tasks that benefit from durable state:

```
# Start
plan_state_write(
  plan_id: "refactor-auth-middleware",
  status: "active",
  summary: "Refactoring auth middleware to support OAuth2 + API key dual auth",
  state_patch: { files_modified: [], tests_passing: false },
  tags: ["refactor", "auth"]
)

# Update progress
plan_state_write(
  plan_id: "refactor-auth-middleware",
  summary: "Completed OAuth2 flow, working on API key validation",
  state_patch: { files_modified: ["middleware.ts", "oauth.ts"], tests_passing: true }
)

# Complete
plan_state_write(
  plan_id: "refactor-auth-middleware",
  status: "completed",
  summary: "Auth middleware refactored: OAuth2 + API key dual auth with 100% test coverage"
)
```

### Pattern 2: Multi-Session with Checkpoints

For complex tasks that span multiple conversations:

```
# Session 1: Start work
plan_state_write(
  plan_id: "billing-overhaul",
  status: "active",
  summary: "Phase 1: fixing checkout flow",
  state_patch: { phase: 1, completed_items: ["checkout-api", "webhook-handler"] }
)

# Checkpoint before ending session
plan_state_checkpoint(
  plan_id: "billing-overhaul",
  label: "phase-1-complete",
  summary: "Checkout flow working, webhook handler deployed"
)

# Session 2: Resume from checkpoint
plan_state_resume(
  plan_id: "billing-overhaul",
  checkpoint_id: "<checkpoint-id-from-above>",
  resume_reason: "Continuing with Phase 2: status dashboard"
)
```

### Pattern 3: Execution Bridge Sync

Synchronize plan state with execution outcomes:

```
# Before executing a deployment
bridge_sync(
  plan_id: "production-deploy",
  phase: "pre_execution",
  outcome: "success",
  summary: "All tests passing, ready to deploy"
)

# After deployment
bridge_sync(
  plan_id: "production-deploy",
  phase: "post_execution",
  outcome: "success",
  summary: "Deployed to production, health checks passing",
  request_checkpoint: true
)

# On failure
bridge_sync(
  plan_id: "production-deploy",
  phase: "post_execution",
  outcome: "failure",
  summary: "Deployment failed: health check timeout after 5 minutes",
  request_reflection_handoff: true
)
```

### Pattern 4: Intelligent Retrieval

Use slice projection and hybrid retrieval to pull relevant context:

```
# Get focused context for a specific objective
slice_project(
  objective: "Fix the race condition in the checkout handler",
  projection_mode: "focused",
  sources: ["plan_state", "journal", "vector"],
  max_tokens: 4000
)

# Broad retrieval across all sources
hybrid_retrieve(
  query: "How did we handle webhook retries last time?",
  sources: ["journal", "vector", "temporal"],
  fusion_strategy: "memory_first",
  top_k: 10
)
```

### Pattern 5: Reflection Handoff

When a plan needs deeper analysis or has failed:

```
reflection_handoff(
  plan_id: "billing-overhaul",
  summary: "Checkout flow has intermittent 500 errors under load. Suspect connection pool exhaustion.",
  tags: ["performance", "database", "connection-pool"],
  force: true
)
```

## Reading Plan State

Always read existing plan state before resuming work:

```
plan_state_read(
  plan_id: "billing-overhaul",
  include_messages: true,
  include_artifacts: true
)
```

## Best Practices

1. **Use descriptive plan IDs**: `fix-auth-middleware` not `task-1`
2. **Checkpoint often**: Before session end, before risky operations, after phase completion
3. **Write meaningful summaries**: Future sessions depend on these for context recovery
4. **Tag consistently**: Use domain/action tags matching your team conventions
5. **Bridge sync on execution boundaries**: Pre/post deployment, pre/post test runs
6. **Request reflection on failures**: `reflection_handoff` distills failure patterns into learnable memories
