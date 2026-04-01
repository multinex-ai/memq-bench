import type { MemoryEntry } from "../schemas.js";

const ACCEPT_HEADER = "application/json, text/event-stream";

function parseSsePayload(text: string): unknown {
  const lines = text.split("\n");
  for (const line of lines) {
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

function extractResult(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  if ("result" in payload) {
    return (payload as { result?: unknown }).result ?? null;
  }
  return payload;
}

export class MemQClient {
  private readonly url: string;
  private readonly timeoutMs: number;
  private sessionId: string | null = null;

  public constructor(url: string, timeoutMs: number) {
    this.url = url;
    this.timeoutMs = timeoutMs;
  }

  public async initialize(): Promise<boolean> {
    if (this.sessionId) {
      return true;
    }

    const response = await fetch(this.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: ACCEPT_HEADER,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "initialize",
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "memq-bench", version: "0.1.0" },
        },
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      return false;
    }

    this.sessionId = response.headers.get("mcp-session-id");
    if (!this.sessionId) {
      return false;
    }

    await fetch(this.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: ACCEPT_HEADER,
        "Mcp-Session-Id": this.sessionId,
      },
      body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    return true;
  }

  public async callTool<T>(name: string, argumentsValue: Record<string, unknown>): Promise<T | null> {
    if (!(await this.initialize()) || !this.sessionId) {
      return null;
    }

    const response = await fetch(this.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: ACCEPT_HEADER,
        "Mcp-Session-Id": this.sessionId,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: `tool-${name}`,
        method: "tools/call",
        params: { name, arguments: argumentsValue },
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";
    const raw = await response.text();
    const payload = contentType.includes("text/event-stream") ? parseSsePayload(raw) : JSON.parse(raw);
    return extractResult(payload) as T | null;
  }

  public async memoryStatus(): Promise<unknown | null> {
    return this.callTool("memory_status", {});
  }

  public async searchMemory(query: string, topK: number, tags: string[]): Promise<MemoryEntry[]> {
    const result = await this.callTool<{ entries?: MemoryEntry[]; results?: MemoryEntry[] }>("search_memory", {
      query,
      top_k: topK,
      filters: tags.length ? { tags } : undefined,
    });
    return result?.entries ?? result?.results ?? [];
  }

  public async recentMemory(limit: number, tags: string[]): Promise<MemoryEntry[]> {
    const result = await this.callTool<{ entries?: MemoryEntry[]; results?: MemoryEntry[] }>("recent_memory", {
      limit,
      filters: tags.length ? { tags } : undefined,
    });
    return result?.entries ?? result?.results ?? [];
  }
}
