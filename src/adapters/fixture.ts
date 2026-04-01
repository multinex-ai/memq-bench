import type { AgentAdapter } from "./interface.js";
import type { AdapterPayload, ContextBundle, TaskSpec } from "../schemas.js";

function includesFact(haystack: string, fact: string): boolean {
  return haystack.toLowerCase().includes(fact.toLowerCase());
}

export class FixtureAdapter implements AgentAdapter {
  public readonly track = "fixture" as const;

  public async execute(_rootDir: string, task: TaskSpec, bundle: ContextBundle): Promise<{ status: "completed"; payload: AdapterPayload }> {
    const evidence = [bundle.prompt, ...bundle.slices.map((slice) => slice.text)].join("\n\n");
    const facts = task.verifier.requiredFacts.filter((fact) => includesFact(evidence, fact));
    const answer = facts.length
      ? facts.map((fact) => `- ${fact}`).join("\n")
      : "No high-confidence recall available from the provided context.";

    return {
      status: "completed",
      payload: {
        answer,
        artifacts: [],
        toolCalls: bundle.slices.map((slice) => `${slice.source}:${slice.id}`),
        metadata: {
          fixture: true,
          matchedFacts: facts,
        },
      },
    };
  }
}
