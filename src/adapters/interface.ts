import type { AdapterPayload, ContextBundle, TaskSpec, Track } from "../schemas.js";

export interface AgentAdapter {
  readonly track: Track;
  execute(rootDir: string, task: TaskSpec, bundle: ContextBundle): Promise<{ status: "completed" | "skipped"; reason?: string; payload?: AdapterPayload }>;
}
