import path from "node:path";
import { publish } from "./analysis.js";
import { runManifest } from "./harness.js";

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
    const results = parseFlag("--results") ?? "artifacts/results";
    const out = parseFlag("--out") ?? "artifacts/snapshot.json";
    await publish(path.join(rootDir, results), path.join(rootDir, out));
    return;
  }

  const manifest = parseFlag("--run");
  if (!manifest) {
    throw new Error("Expected --run <manifest.json>.");
  }

  await runManifest(rootDir, manifest);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
