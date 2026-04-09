import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  RetrievalProviderSchema,
  type BenchmarkCase,
  type CorpusEntry,
  type RetrievedItem,
  type RetrievalManifest,
  type RetrievalProviderId,
} from "./retrievalSchemas.js";

const execFileAsync = promisify(execFile);

interface ProviderState {
  seededEntryCount: number;
  prepareDurationMs: number;
}

export interface RetrievalProvider {
  readonly id: RetrievalProviderId;
  prepare(rootDir: string, manifest: RetrievalManifest, corpus: CorpusEntry[], runId: string): Promise<ProviderState>;
  search(benchmarkCase: BenchmarkCase, topK: number): Promise<RetrievedItem[]>;
  teardown(): Promise<void>;
}

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function lexicalScore(query: string, entry: CorpusEntry): number {
  const queryTerms = new Set(tokenize(query));
  const bodyTerms = tokenize(`${entry.text} ${entry.tags.join(" ")}`);
  let score = 0;
  for (const term of bodyTerms) {
    if (queryTerms.has(term)) {
      score += 1;
    }
  }
  if (entry.text.toLowerCase().includes("current")) {
    score += 0.25;
  }
  return score + entry.order / 1000;
}

class KeywordBaselineProvider implements RetrievalProvider {
  public readonly id = RetrievalProviderSchema.enum.keyword_baseline;
  private corpus: CorpusEntry[] = [];
  private state: ProviderState = { seededEntryCount: 0, prepareDurationMs: 0 };

  public async prepare(_rootDir: string, _manifest: RetrievalManifest, corpus: CorpusEntry[]): Promise<ProviderState> {
    this.corpus = [...corpus];
    this.state = { seededEntryCount: corpus.length, prepareDurationMs: 0 };
    return this.state;
  }

  public async search(benchmarkCase: BenchmarkCase, topK: number): Promise<RetrievedItem[]> {
    return this.corpus
      .filter((entry) => entry.namespace === benchmarkCase.namespace)
      .map((entry) => ({
        entry,
        score: lexicalScore(benchmarkCase.query, entry),
      }))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score || right.entry.order - left.entry.order)
      .slice(0, topK)
      .map((item, index) => ({
        rank: index + 1,
        sourceId: item.entry.sourceId,
        namespace: item.entry.namespace,
        text: item.entry.text,
        score: Number(item.score.toFixed(6)),
        tags: item.entry.tags,
      }));
  }

  public async teardown(): Promise<void> {
    this.corpus = [];
  }
}

function parseSsePayload(text: string): unknown {
  for (const line of text.split("\n")) {
    if (line.startsWith("data: ")) {
      try {
        return JSON.parse(line.slice(6));
      } catch {
        continue;
      }
    }
  }
  return null;
}

function parseToolTextPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") {
    return payload;
  }
  if ("result" in payload) {
    return parseToolTextPayload((payload as { result?: unknown }).result ?? null);
  }
  if ("content" in payload && Array.isArray((payload as { content?: unknown[] }).content)) {
    const content = (payload as { content: unknown[] }).content;
    for (const item of content) {
      if (
        item &&
        typeof item === "object" &&
        "type" in item &&
        (item as { type?: unknown }).type === "text" &&
        "text" in item &&
        typeof (item as { text?: unknown }).text === "string"
      ) {
        const rawText = (item as { text: string }).text;
        try {
          const parsed = JSON.parse(rawText);
          if (parsed && typeof parsed === "object" && "result" in parsed) {
            return (parsed as { result?: unknown }).result ?? parsed;
          }
          return parsed;
        } catch {
          return rawText;
        }
      }
    }
  }
  return payload;
}

class MemQMcpProvider implements RetrievalProvider {
  public readonly id = RetrievalProviderSchema.enum.memq_mcp;
  private sessionId: string | null = null;
  private readonly timeoutMs: number;
  private readonly url: string;
  private runTag = "";
  private state: ProviderState = { seededEntryCount: 0, prepareDurationMs: 0 };
  private scopedAgentByNamespace = new Map<string, string>();

  public constructor(url: string, timeoutMs: number) {
    this.url = url;
    this.timeoutMs = timeoutMs;
  }

  private async initialize(): Promise<void> {
    if (this.sessionId) {
      return;
    }
    const response = await fetch(this.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "initialize",
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "memq-bench", version: "0.2.0" },
        },
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) {
      throw new Error(`MemQ MCP initialize failed with status ${response.status}.`);
    }
    await response.text();
    this.sessionId = response.headers.get("mcp-session-id");
    if (!this.sessionId) {
      throw new Error("MemQ MCP did not return an MCP session id.");
    }
    await fetch(this.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        "Mcp-Session-Id": this.sessionId,
      },
      body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
  }

  private scopedAgent(namespace: string): string {
    const scoped = this.scopedAgentByNamespace.get(namespace);
    if (!scoped) {
      throw new Error(`No MemQ namespace prepared for ${namespace}.`);
    }
    return scoped;
  }

  private async callTool(name: string, argumentsValue: Record<string, unknown>): Promise<unknown> {
    await this.initialize();
    if (!this.sessionId) {
      throw new Error("MemQ MCP session is not initialized.");
    }
    const response = await fetch(this.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        "Mcp-Session-Id": this.sessionId,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: `tool:${name}`,
        method: "tools/call",
        params: { name, arguments: argumentsValue },
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) {
      throw new Error(`MemQ tool ${name} failed with status ${response.status}.`);
    }
    const contentType = response.headers.get("content-type") ?? "";
    const raw = await response.text();
    const payload = contentType.includes("text/event-stream") ? parseSsePayload(raw) : JSON.parse(raw);
    return parseToolTextPayload(payload);
  }

  public async prepare(_rootDir: string, _manifest: RetrievalManifest, corpus: CorpusEntry[], runId: string): Promise<ProviderState> {
    const startedAt = Date.now();
    this.runTag = `bench-run:${runId}`;
    this.scopedAgentByNamespace = new Map(
      [...new Set(corpus.map((entry) => entry.namespace))].map((namespace) => [namespace, `${namespace}::${runId}`]),
    );
    for (const entry of [...corpus].sort((left, right) => left.order - right.order)) {
      const tags = [
        this.runTag,
        `source:${entry.sourceId}`,
        `namespace:${entry.namespace}`,
        ...entry.tags,
      ];
      await this.callTool("add_memory", {
        text: entry.text,
        agent_id: this.scopedAgent(entry.namespace),
        memory_type: entry.memoryType,
        tags,
      });
    }
    // MemQ write visibility can lag behind add_memory acknowledgement by a short interval.
    // Wait for the vector and graph layers to settle before the measured search phase starts.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    this.state = {
      seededEntryCount: corpus.length,
      prepareDurationMs: Date.now() - startedAt,
    };
    return this.state;
  }

  public async search(benchmarkCase: BenchmarkCase, topK: number): Promise<RetrievedItem[]> {
    const payload = await this.callTool("search_memory", {
      query: benchmarkCase.query,
      top_k: topK,
      filters: {
        agent_id: this.scopedAgent(benchmarkCase.namespace),
        tags: [this.runTag],
      },
    });
    const results = payload &&
      typeof payload === "object" &&
      "results" in payload &&
      Array.isArray((payload as { results?: unknown[] }).results)
      ? (payload as { results: unknown[] }).results
      : [];

    return results.map((item, index) => {
      const record = item as {
        id?: string;
        tags?: string[];
        text?: string;
        score?: number;
        agent_id?: string;
      };
      const sourceTag = record.tags?.find((tag) => tag.startsWith("source:")) ?? "source:unknown";
      const namespaceTag = record.tags?.find((tag) => tag.startsWith("namespace:")) ?? `namespace:${benchmarkCase.namespace}`;
      return {
        rank: index + 1,
        sourceId: sourceTag.slice("source:".length),
        namespace: namespaceTag.slice("namespace:".length),
        text: record.text ?? "",
        score: typeof record.score === "number" ? record.score : null,
        providerMemoryId: record.id,
        tags: record.tags ?? [],
      };
    });
  }

  public async teardown(): Promise<void> {
    this.sessionId = null;
    this.runTag = "";
    this.scopedAgentByNamespace.clear();
  }
}

interface Mem0CommandResult {
  ok: boolean;
  reason?: string;
  seededEntryCount?: number;
  prepareDurationMs?: number;
  results?: RetrievedItem[];
}

class Mem0OssProvider implements RetrievalProvider {
  public readonly id = RetrievalProviderSchema.enum.mem0_oss;
  private readonly rootDir: string;
  private readonly manifest: RetrievalManifest;
  private readonly pythonExecutable: string;
  private benchmarkRunId = "";
  private collectionName = "";
  private historyDbPath = "";
  private state: ProviderState = { seededEntryCount: 0, prepareDurationMs: 0 };

  public constructor(rootDir: string, manifest: RetrievalManifest) {
    this.rootDir = rootDir;
    this.manifest = manifest;
    const mem0 = manifest.mem0;
    if (!mem0) {
      throw new Error("mem0 configuration is required for the mem0_oss provider.");
    }
    this.pythonExecutable = mem0.pythonPath
      ? path.resolve(rootDir, mem0.pythonPath)
      : mem0.venvPath
        ? path.resolve(rootDir, mem0.venvPath, "bin", "python")
        : "python3";
  }

  private scriptPath(): string {
    return path.join(this.rootDir, "python", "mem0_provider.py");
  }

  private async runCommand(command: "doctor" | "prepare" | "search" | "teardown", payload: Record<string, unknown>): Promise<Mem0CommandResult> {
    const payloadPath = path.join(this.rootDir, "artifacts", "tmp", `mem0-${command}-${Date.now().toString(36)}.json`);
    await mkdir(path.dirname(payloadPath), { recursive: true });
    await writeFile(payloadPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    try {
      const { stdout, stderr } = await execFileAsync(this.pythonExecutable, [this.scriptPath(), command, payloadPath], {
        cwd: this.rootDir,
      });
      const combined = `${stdout}\n${stderr}`;
      const lines = combined
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      let marker: string | undefined;
      for (let index = lines.length - 1; index >= 0; index -= 1) {
        const line = lines[index];
        if (!line) {
          continue;
        }
        if (line.startsWith("MEMQ_BENCH_JSON:")) {
          marker = line;
          break;
        }
      }
      if (!marker) {
        throw new Error(`Mem0 ${command} did not return a machine-readable payload.\n${combined}`);
      }
      return JSON.parse(marker.slice("MEMQ_BENCH_JSON:".length)) as Mem0CommandResult;
    } finally {
      await rm(payloadPath, { force: true });
    }
  }

  public async prepare(_rootDir: string, _manifest: RetrievalManifest, corpus: CorpusEntry[], runId: string): Promise<ProviderState> {
    const doctor = await this.runCommand("doctor", {});
    if (!doctor.ok) {
      throw new Error(doctor.reason ?? "mem0_doctor_failed");
    }

    const mem0 = this.manifest.mem0;
    if (!mem0) {
      throw new Error("mem0 configuration missing.");
    }

    this.benchmarkRunId = runId;
    this.collectionName = `memq_bench_${runId.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`;
    this.historyDbPath = path.join(this.rootDir, "artifacts", "tmp", `${this.collectionName}.sqlite3`);

    const prepare = await this.runCommand("prepare", {
      run_id: runId,
      corpus,
      collection_name: this.collectionName,
      history_db_path: this.historyDbPath,
      qdrant_host: mem0.qdrantHost,
      qdrant_port: mem0.qdrantPort,
      llm_provider: mem0.llmProvider,
      llm_model: mem0.llmModel,
      embedder_provider: mem0.embedderProvider,
      embedder_model: mem0.embedderModel,
      embedding_dims: mem0.embeddingDims,
    });

    if (!prepare.ok) {
      throw new Error(prepare.reason ?? "mem0_prepare_failed");
    }

    this.state = {
      seededEntryCount: prepare.seededEntryCount ?? corpus.length,
      prepareDurationMs: prepare.prepareDurationMs ?? 0,
    };
    return this.state;
  }

  public async search(benchmarkCase: BenchmarkCase, topK: number): Promise<RetrievedItem[]> {
    const mem0 = this.manifest.mem0;
    if (!mem0 || !this.collectionName || !this.historyDbPath || !this.benchmarkRunId) {
      throw new Error("Mem0 provider is not prepared.");
    }

    const result = await this.runCommand("search", {
      run_id: this.benchmarkRunId,
      namespace: benchmarkCase.namespace,
      query: benchmarkCase.query,
      top_k: topK,
      collection_name: this.collectionName,
      history_db_path: this.historyDbPath,
      qdrant_host: mem0.qdrantHost,
      qdrant_port: mem0.qdrantPort,
      llm_provider: mem0.llmProvider,
      llm_model: mem0.llmModel,
      embedder_provider: mem0.embedderProvider,
      embedder_model: mem0.embedderModel,
      embedding_dims: mem0.embeddingDims,
    });
    if (!result.ok) {
      throw new Error(result.reason ?? "mem0_search_failed");
    }
    return result.results ?? [];
  }

  public async teardown(): Promise<void> {
    const mem0 = this.manifest.mem0;
    if (!mem0 || !this.collectionName || !this.historyDbPath) {
      return;
    }
    await this.runCommand("teardown", {
      collection_name: this.collectionName,
      history_db_path: this.historyDbPath,
      qdrant_host: mem0.qdrantHost,
      qdrant_port: mem0.qdrantPort,
      llm_provider: mem0.llmProvider,
      llm_model: mem0.llmModel,
      embedder_provider: mem0.embedderProvider,
      embedder_model: mem0.embedderModel,
      embedding_dims: mem0.embeddingDims,
    }).catch(() => undefined);
    this.benchmarkRunId = "";
    this.collectionName = "";
    this.historyDbPath = "";
  }
}

export function createRetrievalProvider(
  rootDir: string,
  manifest: RetrievalManifest,
  providerId: RetrievalProviderId,
): RetrievalProvider {
  switch (providerId) {
    case "keyword_baseline":
      return new KeywordBaselineProvider();
    case "memq_mcp":
      if (!manifest.memq) {
        throw new Error("memq configuration is required for the memq_mcp provider.");
      }
      return new MemQMcpProvider(manifest.memq.url, manifest.memq.timeoutMs);
    case "mem0_oss":
      return new Mem0OssProvider(rootDir, manifest);
  }
}
