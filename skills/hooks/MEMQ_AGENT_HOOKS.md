# MemQ Agent Hooks

> Universal, AI-agnostic trigger hooks for persistent memory.
> Drop this file into your project as `AGENTS.md`, `GEMINI.md`, `.cursorrules`, or `.claude/instructions.md`.

## Trigger: SESSION_START

**When:** Every new conversation begins.
**Action:** Execute these steps before any work:

```
1. reunion(include_status: true)
   → Verifies MemQ connection. Returns namespace and protocol version.

2. recent_memory(limit: 10)
   → Loads the 10 most recent memories for immediate context.

3. search_memory(query: "<summarize user request>", top_k: 5)
   → Retrieves relevant past work matching the current task.
```

**On failure:** Emit `⚠️ MemQ unavailable — operating in degraded mode` and continue without memory operations.

---

## Trigger: BEFORE_PLANNING

**When:** About to make architectural decisions, plan a multi-step task, or start a complex operation.
**Action:**

```
search_memory(query: "<topic or decision area>", top_k: 5)
→ Check if similar decisions were made before.

mnemosyne_context(objective: "<current goal>", include_recent: true, include_learning: true)
→ Get a pre-packed context bundle from all memory tiers.
```

---

## Trigger: BEFORE_RISKY_OPERATION

**When:** About to deploy, make breaking changes, run destructive commands, or modify critical infrastructure.
**Action:**

```
brain_predict(objective: "<what you're about to do>")
→ Returns forecasted risks, guardrails, and corrective patterns.
```

---

## Trigger: TASK_COMPLETE

**When:** A meaningful unit of work is finished (feature, bugfix, refactor, deployment).
**Action:**

```
add_memory(
  text: "<summary of what was done and why>",
  memory_type: "checkpoint",
  tags: ["<domain>", "<action>"]
)
```

---

## Trigger: BUG_FIXED

**When:** A bug is identified, root-caused, and resolved.
**Action:**

```
add_memory(
  text: "<root cause> — <fix applied>",
  memory_type: "episodic",
  tags: ["bug", "<affected area>"]
)
```

---

## Trigger: PATTERN_DISCOVERED

**When:** A codebase convention, architectural pattern, or team standard is identified.
**Action:**

```
add_memory(
  text: "<what was learned>",
  memory_type: "semantic",
  tags: ["pattern", "<area>"]
)
```

---

## Trigger: ERROR_ENCOUNTERED

**When:** An unexpected error occurs during execution.
**Action:**

```
add_memory(
  text: "<error description> — <context and resolution status>",
  memory_type: "episodic",
  tags: ["error", "<area>"]
)
```

---

## Trigger: SESSION_END

**When:** The conversation is about to close or the user's request is fully resolved.
**Action:**

```
reflect_memory(window: 50, force: true)
→ Compresses recent work into durable patterns and learnings.
```

---

## Memory Types Reference

| Type | Trigger Context | Example |
|------|----------------|---------|
| `episodic` | BUG_FIXED, ERROR_ENCOUNTERED | "Fixed null pointer in auth handler caused by missing session check" |
| `semantic` | PATTERN_DISCOVERED | "This repo validates all IO boundaries with Zod schemas" |
| `procedural` | TASK_COMPLETE (workflows) | "Deploy process: push master → CI validation → wrangler deploy" |
| `checkpoint` | TASK_COMPLETE (outcomes) | "Dashboard overhaul complete: 7 files modified, all tests pass" |
| `reflection` | SESSION_END | "Complex auth bugs resolve faster when checking middleware.ts first" |

## Tagging Convention

Use consistent, hierarchical tags for organized retrieval:

| Category | Tags |
|----------|------|
| **Domain** | `auth`, `billing`, `api`, `ui`, `database`, `infra`, `deploy` |
| **Action** | `bug`, `feature`, `refactor`, `deploy`, `debug`, `review` |
| **Priority** | `critical`, `minor`, `optimization` |
