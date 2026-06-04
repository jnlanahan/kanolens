import Anthropic from "@anthropic-ai/sdk";

import { requireSecret } from "../env";

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (client) return client;
  client = new Anthropic({ apiKey: requireSecret("ANTHROPIC_API_KEY") });
  return client;
}

export const MODELS = {
  analyst: "claude-opus-4-8",
  verifier: "claude-haiku-4-5", // fallback — verifier now uses Gemini
  proposer: "claude-opus-4-8",
} as const;
