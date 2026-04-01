import { readFile } from "node:fs/promises";
import { MemoryEntrySchema, type MemoryEntry, type TaskSpec } from "../schemas.js";

function normalize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function scoreText(query: string, text: string, tags: string[]): number {
  const queryTerms = new Set(normalize(query));
  const haystackTerms = normalize(`${text} ${tags.join(" ")}`);
  let score = 0;
  for (const term of haystackTerms) {
    if (queryTerms.has(term)) {
      score += 2;
    }
  }
  return score;
}

export async function loadSoulJournal(filePath: string): Promise<MemoryEntry[]> {
  const raw = await readFile(filePath, "utf8");
  const lines = raw.split("\n").map((line) => line.trim()).filter(Boolean);
  return lines.map((line) => MemoryEntrySchema.parse(JSON.parse(line)));
}

export function searchSoulJournal(entries: MemoryEntry[], task: TaskSpec, limit: number): MemoryEntry[] {
  return [...entries]
    .map((entry) => ({
      entry,
      score: scoreText(task.query, entry.text, entry.tags) + (entry.task_id === task.id ? 3 : 0),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || right.entry.created_at.localeCompare(left.entry.created_at))
    .slice(0, limit)
    .map((item) => item.entry);
}

export function recentSoulJournal(entries: MemoryEntry[], limit: number): MemoryEntry[] {
  return [...entries]
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
    .slice(0, limit);
}
