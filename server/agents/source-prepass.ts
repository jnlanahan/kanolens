import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import { getAnthropicClient, MODELS } from "../lib/anthropic";
import {
  buildSourcePrepassKickoff,
  buildSystemBlocks,
  type PrimarySourceMap,
} from "./prompts";

const PrimarySourceSchema = z.object({
  url: z.string().describe("absolute https URL to a canonical product page"),
  purpose: z.string().describe("short label: marketing | pricing | docs | features | help | release-notes"),
});

const PrepassOutputSchema = z.object({
  products: z
    .array(
      z.object({
        product: z.string().describe("exact product name, matching the <products> input"),
        sources: z.array(PrimarySourceSchema).min(1).max(5),
      }),
    )
    .describe("one entry per product in the input; omit a product entirely if you are uncertain"),
});

export async function gatherPrimarySources(scope: {
  userProductName: string | null;
  products: string[];
  targetCustomer: string;
}): Promise<PrimarySourceMap> {
  const client = getAnthropicClient();
  const response = await client.messages.parse({
    model: MODELS.analyst,
    max_tokens: 2048,
    system: buildSystemBlocks(),
    messages: [{ role: "user", content: buildSourcePrepassKickoff(scope) }],
    output_config: { format: zodOutputFormat(PrepassOutputSchema) },
  });

  if (!response.parsed_output) return {};

  const map: PrimarySourceMap = {};
  for (const entry of response.parsed_output.products) {
    map[entry.product] = entry.sources;
  }
  return map;
}
