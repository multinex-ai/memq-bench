import crypto from "node:crypto";
import { countTokens } from "../tokenizer.js";
import type { ContextSlice } from "../schemas.js";

function hashText(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);
}

export function buildSlices(
  source: ContextSlice["source"],
  text: string,
  score: number,
  segmentTokens: number,
  metadata: Record<string, unknown> = {},
): ContextSlice[] {
  const chunks = text
    .split(/\n\n+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const slices: ContextSlice[] = [];
  let buffer = "";

  const flush = (): void => {
    const normalized = buffer.trim();
    if (!normalized) {
      return;
    }
    slices.push({
      id: `${source}-${hashText(normalized)}`,
      source,
      text: normalized,
      score,
      tokens: countTokens(normalized),
      metadata,
    });
    buffer = "";
  };

  for (const chunk of chunks) {
    const next = buffer ? `${buffer}\n\n${chunk}` : chunk;
    if (countTokens(next) > segmentTokens && buffer) {
      flush();
      buffer = chunk;
      continue;
    }
    buffer = next;
  }

  flush();
  return slices;
}

export function dedupeSlices(slices: ContextSlice[]): ContextSlice[] {
  const byId = new Map<string, ContextSlice>();
  for (const slice of slices) {
    const existing = byId.get(slice.id);
    if (!existing || slice.score > existing.score) {
      byId.set(slice.id, slice);
    }
  }
  return [...byId.values()].sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
}

export function packSlices(slices: ContextSlice[], budgetTokens: number): ContextSlice[] {
  const packed: ContextSlice[] = [];
  let total = 0;
  for (const slice of slices) {
    if (total + slice.tokens > budgetTokens) {
      continue;
    }
    packed.push(slice);
    total += slice.tokens;
  }
  return packed;
}
