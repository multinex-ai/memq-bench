# Translation Showcase

This artifact highlights the public MemQ vector translation contract used inside
the benchmark corpus.

- route: `POST https://api.multinex.ai/mcp/v1/translate`
- source profile: `openai / text-embedding-3-large / 4d`
- target profile: `cloudflare / bge-base-en-v1.5 / 2d`
- result: deterministic truncation to `[0.91, 0.42]` with `retention = 0.5`

The same contract is used in the benchmark docs to show how MemQ preserves
cross-model coordination without paying a re-embedding tax.
