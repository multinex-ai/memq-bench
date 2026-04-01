import type { ContextSlice, TaskSpec } from "../schemas.js";
import { buildSlices } from "./contextSlicer.js";
import { MemQClient } from "./client.js";

export async function fetchGraphitiSlices(
  graphitiUrl: string | undefined,
  task: TaskSpec,
  segmentTokens: number,
  timeoutMs: number,
): Promise<{ live: boolean; slices: ContextSlice[]; notes: string[] }> {
  if (!graphitiUrl) {
    return { live: false, slices: [], notes: ["Graphiti URL not configured."] };
  }

  try {
    const client = new MemQClient(graphitiUrl, timeoutMs);
    const hits = await client.searchMemory(task.query, 4, task.tags);
    const slices = hits.flatMap((entry, index) =>
      buildSlices("graphiti", entry.text, 10 - index, segmentTokens, {
        id: entry.id,
        task_id: entry.task_id,
      }),
    );
    return { live: true, slices, notes: [] };
  } catch (error) {
    return { live: false, slices: [], notes: [`Graphiti unavailable: ${String(error)}`] };
  }
}
