import { spawn } from "node:child_process";
import path from "node:path";
import { readJsonFile, writeJsonFile } from "../io.js";
import { AdapterPayloadSchema, type AdapterPayload, type ContextBundle, type TaskSpec } from "../schemas.js";
import type { AgentAdapter } from "./interface.js";

async function runCommand(command: string, env: NodeJS.ProcessEnv, cwd: string): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const child = spawn(command, {
      cwd,
      env,
      shell: true,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

export class CommandAdapter implements AgentAdapter {
  public readonly track: "local_cli" | "antigravity";
  private readonly envName: string;

  public constructor(track: "local_cli" | "antigravity", envName: string) {
    this.track = track;
    this.envName = envName;
  }

  public async execute(rootDir: string, task: TaskSpec, bundle: ContextBundle): Promise<{ status: "completed" | "skipped"; reason?: string; payload?: AdapterPayload }> {
    const command = process.env[this.envName];
    if (!command) {
      return { status: "skipped", reason: `Adapter env ${this.envName} is not set.` };
    }

    const workspace = path.join(rootDir, task.workspaceDir);
    const contextFile = path.join(rootDir, "artifacts", "results", `${task.id}-${this.track}-${bundle.condition}-context.json`);
    const outputFile = path.join(rootDir, "artifacts", "results", `${task.id}-${this.track}-${bundle.condition}-payload.json`);
    await writeJsonFile(contextFile, bundle);
    await writeJsonFile(outputFile, { answer: "", artifacts: [], toolCalls: [] });

    const exitCode = await runCommand(command, {
      ...process.env,
      MEMQ_BENCH_TASK_FILE: path.join(rootDir, "tasks", task.id, "task.json"),
      MEMQ_BENCH_TASK_ID: task.id,
      MEMQ_BENCH_WORKSPACE: workspace,
      MEMQ_BENCH_CONTEXT_FILE: contextFile,
      MEMQ_BENCH_OUTPUT_FILE: outputFile,
      MEMQ_BENCH_TRACK: this.track,
      MEMQ_BENCH_CONDITION: bundle.condition,
    }, workspace);

    if (exitCode !== 0) {
      return { status: "skipped", reason: `${this.track} adapter exited with code ${exitCode}.` };
    }

    const payload = await readJsonFile(outputFile, AdapterPayloadSchema);
    return {
      status: "completed",
      payload: {
        answer: payload.answer,
        artifacts: payload.artifacts,
        toolCalls: payload.toolCalls,
        metadata: payload.metadata,
      },
    };
  }
}
