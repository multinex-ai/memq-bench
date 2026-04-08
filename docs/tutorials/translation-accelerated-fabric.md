# Translation Accelerated Fabric Tutorial

This tutorial explains the MemQ translation proof published in this repo.

## What the benchmark is proving

MemQ can translate embeddings across model spaces without regenerating them from
text. In the benchmark corpus, that is represented by a stable request and a
stable translated result.

## Canonical request

```json
{
  "vector": [0.91, 0.42, -0.18, 0.07],
  "source_dimension": 4,
  "target_dimension": 2,
  "source_profile": {
    "provider": "openai",
    "model": "text-embedding-3-large",
    "dimension": 4
  },
  "target_profile": {
    "provider": "cloudflare",
    "model": "bge-base-en-v1.5",
    "dimension": 2
  }
}
```

## Canonical result

```json
{
  "mode": "stateless_translation",
  "translated_vector": [0.91, 0.42],
  "dimension": 2,
  "method": "truncation",
  "quality": {
    "retention": 0.5,
    "lossless": false
  }
}
```

## Where it is used

- `embedding-translation-fabric` checks exact contract recall
- `byzantine-generals-consensus` uses translated vectors to normalize inputs
  before quorum

## Artifact links

- [`../../artifacts/translation-showcase.json`](../../artifacts/translation-showcase.json)
- [`../../artifacts/translation-showcase.md`](../../artifacts/translation-showcase.md)
