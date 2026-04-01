import { CommandAdapter } from "./command.js";
import { FixtureAdapter } from "./fixture.js";
import type { AgentAdapter } from "./interface.js";
import type { Track } from "../schemas.js";

export function getAdapter(track: Track): AgentAdapter {
  switch (track) {
    case "fixture":
      return new FixtureAdapter();
    case "local_cli":
      return new CommandAdapter("local_cli", "MEMQ_BENCH_LOCAL_CLI_CMD");
    case "antigravity":
      return new CommandAdapter("antigravity", "MEMQ_BENCH_ANTIGRAVITY_CMD");
  }
}
