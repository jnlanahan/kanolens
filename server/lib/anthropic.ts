import Anthropic from "@anthropic-ai/sdk";
import { wrapAnthropic } from "langsmith/wrappers/anthropic";

import { requireSecret } from "../env";

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (client) return client;
  const base = new Anthropic({ apiKey: requireSecret("ANTHROPIC_API_KEY") });
  client = process.env.LANGSMITH_TRACING === "true" ? wrapAnthropic(base) : base;
  return client;
}

export const MODELS = {
  analyst: "claude-sonnet-4-6",
  verifier: "claude-haiku-4-5", // fallback — verifier now uses Gemini
  proposer: "claude-sonnet-4-6",
} as const;
