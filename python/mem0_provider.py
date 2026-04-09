#!/usr/bin/env python3

import json
import logging
import os
import sys
from pathlib import Path
from time import perf_counter


def emit(payload: dict) -> None:
    print(f"MEMQ_BENCH_JSON:{json.dumps(payload, ensure_ascii=True)}")


def load_payload() -> dict:
    if len(sys.argv) < 3:
      raise ValueError("Expected <command> <payload-path>.")
    payload_path = Path(sys.argv[2])
    return json.loads(payload_path.read_text())


def build_memory(payload: dict):
    from mem0 import Memory

    config = {
        "version": "v1.1",
        "vector_store": {
            "provider": "qdrant",
            "config": {
                "collection_name": payload["collection_name"],
                "host": payload["qdrant_host"],
                "port": payload["qdrant_port"],
                "embedding_model_dims": payload["embedding_dims"],
            },
        },
        "llm": {
            "provider": payload["llm_provider"],
            "config": {
                "api_key": os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY") or "",
                "model": payload["llm_model"],
                "temperature": 0,
            },
        },
        "embedder": {
            "provider": payload["embedder_provider"],
            "config": {
                "api_key": os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY") or "",
                "model": payload["embedder_model"],
                "embedding_dims": payload["embedding_dims"],
            },
        },
        "history_db_path": payload["history_db_path"],
    }
    return Memory.from_config(config)


def scoped_namespace(namespace: str, run_id: str) -> str:
    return f"{namespace}::{run_id}"


def command_doctor() -> None:
    try:
        import mem0  # noqa: F401
        from google import genai  # noqa: F401
    except Exception as exc:  # pragma: no cover - surfaced through JSON
        emit({"ok": False, "reason": f"missing_dependency:{exc}"})
        return

    if not (os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")):
        emit({"ok": False, "reason": "missing_google_api_key"})
        return

    emit({"ok": True})


def command_prepare(payload: dict) -> None:
    logging.getLogger().setLevel(logging.ERROR)
    memory = build_memory(payload)
    try:
        started = perf_counter()
        for entry in sorted(payload["corpus"], key=lambda item: item["order"]):
            memory.add(
                [{"role": "user", "content": entry["text"]}],
                user_id=scoped_namespace(entry["namespace"], payload["run_id"]),
                metadata={
                    "source_id": entry["sourceId"],
                    "namespace": entry["namespace"],
                    "tags": entry.get("tags", []),
                },
                infer=False,
            )
        emit(
            {
                "ok": True,
                "seededEntryCount": len(payload["corpus"]),
                "prepareDurationMs": round((perf_counter() - started) * 1000),
            }
        )
    finally:
        memory.close()


def command_search(payload: dict) -> None:
    logging.getLogger().setLevel(logging.ERROR)
    memory = build_memory(payload)
    try:
        raw = memory.search(
            payload["query"],
            user_id=scoped_namespace(payload["namespace"], payload["run_id"]),
            limit=payload["top_k"],
        )
        results = raw.get("results", []) if isinstance(raw, dict) else []
        normalized = []
        for index, item in enumerate(results, start=1):
            metadata = item.get("metadata", {}) if isinstance(item, dict) else {}
            normalized.append(
                {
                    "rank": index,
                    "sourceId": metadata.get("source_id", "unknown"),
                    "namespace": metadata.get("namespace", payload["namespace"]),
                    "text": item.get("memory", ""),
                    "score": item.get("score"),
                    "providerMemoryId": item.get("id"),
                    "tags": metadata.get("tags", []),
                }
            )
        emit({"ok": True, "results": normalized})
    finally:
        memory.close()


def command_teardown(payload: dict) -> None:
    logging.getLogger().setLevel(logging.ERROR)
    memory = build_memory(payload)
    try:
        memory.reset()
        emit({"ok": True})
    finally:
        memory.close()
        try:
            history_path = Path(payload["history_db_path"])
            if history_path.exists():
                history_path.unlink()
        except OSError:
            pass


def main() -> None:
    if len(sys.argv) < 2:
        raise ValueError("Expected a command.")
    command = sys.argv[1]

    if command == "doctor":
        command_doctor()
        return

    payload = load_payload()
    if command == "prepare":
        command_prepare(payload)
        return
    if command == "search":
        command_search(payload)
        return
    if command == "teardown":
        command_teardown(payload)
        return
    raise ValueError(f"Unsupported command: {command}")


if __name__ == "__main__":
    main()

