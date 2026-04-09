#!/usr/bin/env python3

import json
import os
import sys


def emit(payload: dict) -> None:
    print(f"MEMQ_BENCH_JSON:{json.dumps(payload, ensure_ascii=True)}")


def load_payload() -> dict:
    if len(sys.argv) < 3:
        raise ValueError("Expected <command> <payload-path>.")
    with open(sys.argv[2], "r", encoding="utf-8") as handle:
        return json.load(handle)


def extract_text(response) -> str:
    if getattr(response, "text", None):
        return response.text
    candidates = getattr(response, "candidates", None) or []
    for candidate in candidates:
      content = getattr(candidate, "content", None)
      parts = getattr(content, "parts", None) or []
      for part in parts:
        text = getattr(part, "text", None)
        if text:
          return text
    return ""


def command_doctor() -> None:
    try:
        from google import genai  # noqa: F401
    except Exception as exc:
        emit({"ok": False, "reason": f"missing_dependency:{exc}"})
        return

    if not (os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")):
        emit({"ok": False, "reason": "missing_google_api_key"})
        return
    emit({"ok": True})


def command_answer(payload: dict) -> None:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY"))
    context_lines = []
    for item in payload.get("context_items", []):
        context_lines.append(f"[{item['sourceId']}] {item['text']}")

    if not context_lines:
        context_block = "No memory context is available."
    else:
        context_block = "\n".join(context_lines)

    prompt = (
        "You are participating in a benchmark.\n"
        "Answer using only the provided context.\n"
        "If the context is missing or insufficient, answer exactly 'INSUFFICIENT_CONTEXT'.\n"
        "Return strict JSON with keys answer and citations.\n\n"
        f"Context:\n{context_block}\n\n"
        f"Question: {payload['query']}\n"
    )

    response = client.models.generate_content(
        model=payload["model"],
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0,
            response_mime_type="application/json",
        ),
    )
    raw_text = extract_text(response).strip()
    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError as exc:
        emit({"ok": False, "reason": f"invalid_json:{exc}", "raw": raw_text})
        return

    answer = parsed.get("answer", "")
    citations = parsed.get("citations", [])
    if not isinstance(answer, str):
        answer = str(answer)
    if not isinstance(citations, list):
        citations = []

    emit({
        "ok": True,
        "answer": answer,
        "citations": [str(item) for item in citations],
    })


def main() -> None:
    if len(sys.argv) < 2:
        raise ValueError("Expected a command.")
    command = sys.argv[1]
    if command == "doctor":
        command_doctor()
        return
    payload = load_payload()
    if command == "answer":
        command_answer(payload)
        return
    raise ValueError(f"Unsupported command: {command}")


if __name__ == "__main__":
    main()

