import { encode } from "gpt-tokenizer";

export function countTokens(text: string): number {
  if (!text.trim()) {
    return 0;
  }
  return encode(text).length;
}
