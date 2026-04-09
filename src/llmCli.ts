import path from "node:path";
import { publishLlm } from "./llmAnalysis.js";
import { runLlmManifest } from "./llmHarness.js";

function parseFlag(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return process.argv[index + 1];
}

async function main(): Promise<void> {
  const command = process.argv[2];
  const rootDir = path.resolve(process.cwd());

  if (command === "publish") {
    const resultsDir = parseFlag("--results") ?? "artifacts/llm-results";
    const out = parseFlag("--out") ?? "artifacts/llm-snapshot.json";
    await publishLlm(path.join(rootDir, resultsDir), path.join(rootDir, out));
    return;
  }

  if (command === "run") {
    const manifest = parseFlag("--manifest");
    if (!manifest) {
      throw new Error("Expected --manifest <manifest.json>.");
    }
    await runLlmManifest(rootDir, manifest);
    return;
  }

  throw new Error(`Unsupported command: ${command ?? "<missing>"}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
