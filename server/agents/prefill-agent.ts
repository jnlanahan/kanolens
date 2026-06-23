import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import { getAnthropicClient, MODELS } from "../lib/anthropic";

const PrefillSchema = z.object({
  productName: z.string().default(""),
  description: z.string().default(""),
  competitors: z.array(z.string()).default([]),
});

export interface PrefillResult {
  productName: string;
  description: string;
  competitors: string[];
  inputTokens: number;
  outputTokens: number;
}

const SYSTEM = `You help pre-fill a competitive-analysis intake form from a product's website.
Given a URL, use web_search to learn what the product is, then return a JSON object — no prose, only JSON:
{
  "productName": "<the product's name>",
  "description": "2-4 plain-language sentences: what the product does and who it's for",
  "competitors": ["3-5 real, well-known competitor product names"]
}
If you cannot determine a field, use an empty string or empty array. Output ONLY the JSON object.`;

const TOOLS: Anthropic.Messages.ToolUnion[] = [
  { type: "web_search_20250305", name: "web_search", max_uses: 3 },
];

/** Best-effort: read a product URL and propose form values. Always resolves (empty
 *  fields on failure) so the caller can let the user fill in the rest by hand. */
export async function runPrefill(url: string): Promise<PrefillResult> {
  const client = getAnthropicClient();
  const messages: Anthropic.Messages.MessageParam[] = [
    { role: "user", content: `Product website: ${url}\n\nResearch it and return the JSON.` },
  ];

  let totalInput = 0;
  let totalOutput = 0;
  let text = "";

  for (let i = 0; i < 5; i++) {
    const response = await client.messages.create({
      model: MODELS.proposer,
      max_tokens: 1024,
      system: SYSTEM,
      tools: TOOLS,
      messages,
    });
    totalInput += response.usage.input_tokens;
    totalOutput += response.usage.output_tokens;
    messages.push({ role: "assistant", content: response.content });

    // web_search is a server-side tool — the API pauses to run it, then we continue.
    if (response.stop_reason === "pause_turn") continue;
    text = response.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    break;
  }

  let parsed = { productName: "", description: "", competitors: [] as string[] };
  try {
    const match = text.match(/\{[\s\S]*\}/);
    parsed = PrefillSchema.parse(JSON.parse(match?.[0] ?? text));
  } catch {
    // Leave defaults — the form still works, just unfilled.
  }

  return { ...parsed, inputTokens: totalInput, outputTokens: totalOutput };
}
