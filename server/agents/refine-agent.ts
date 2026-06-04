import { getAnthropicClient } from "../lib/anthropic";
import type { TableJson } from "../db/schema";

export type RefineMutation =
  | { type: "update_rating"; featureId: string; product: string; rating: string; justification: string }
  | { type: "remove_feature"; featureId: string }
  | { type: "none" };

export interface RefineResult {
  mutation: RefineMutation;
  reply: string;
}

const SYSTEM = `You are the Refine assistant for KanoLens, a competitive analysis tool using the Kano model.
The user can ask you to make edits to the analysis table or ask questions about it.

You must respond with a JSON object — no prose, only JSON:
{
  "mutation": <mutation spec or {"type":"none"}>,
  "reply": "<one to three sentence conversational reply shown in the chat>"
}

Mutation types you can emit:
- {"type":"update_rating","featureId":"<id>","product":"<name>","rating":"<value>","justification":"<short reason>"}
  Valid rating values for Must-Have and Delighter features: Yes, No, Maybe, Cannot Verify
  Valid rating values for Performance features: High, Medium, Low, Maybe High, Maybe Medium, Maybe Low, Cannot Verify
- {"type":"remove_feature","featureId":"<id>"}
- {"type":"none"} — for questions, greetings, or requests you cannot fulfill

Rules:
- Only emit a mutation when the user clearly asks you to change something.
- Do not add competitors — tell the user to use the Scope editor for that.
- Be concise. The reply is displayed in a chat thread.
- If you cannot identify the exact featureId or product, emit {"type":"none"} and ask for clarification.`;

export async function runRefineAgent(args: {
  message: string;
  tableData: TableJson;
}): Promise<RefineResult> {
  const { message, tableData } = args;

  const tableDescription = buildTableDescription(tableData);

  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Current analysis table:\n${tableDescription}\n\nUser request: ${message}`,
      },
    ],
  });

  const text = response.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();

  let parsed: { mutation: RefineMutation; reply: string };
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch?.[0] ?? text);
  } catch {
    return {
      mutation: { type: "none" },
      reply: text.length > 0 ? text : "Sorry, I couldn't understand that. Try asking to re-rate a feature or remove a benefit.",
    };
  }

  return {
    mutation: parsed.mutation ?? { type: "none" },
    reply: parsed.reply ?? "Done.",
  };
}

function buildTableDescription(table: TableJson): string {
  const lines: string[] = [`Products: ${table.products.join(", ")}`];
  for (const feature of table.features) {
    const ratingsForFeature = table.ratings[feature.id] ?? {};
    const ratingStr = Object.entries(ratingsForFeature)
      .map(([p, r]) => `${p}=${r}`)
      .join(", ");
    lines.push(`[${feature.id}] ${feature.name} (${feature.category}): ${ratingStr}`);
  }
  return lines.join("\n");
}

export function applyMutation(tableData: TableJson, mutation: RefineMutation): TableJson {
  if (mutation.type === "none") return tableData;

  if (mutation.type === "remove_feature") {
    return {
      ...tableData,
      features: tableData.features.filter((f) => f.id !== mutation.featureId),
      ratings: Object.fromEntries(
        Object.entries(tableData.ratings).filter(([id]) => id !== mutation.featureId),
      ),
      justifications: Object.fromEntries(
        Object.entries(tableData.justifications).filter(([id]) => id !== mutation.featureId),
      ),
    };
  }

  if (mutation.type === "update_rating") {
    const ratings = { ...tableData.ratings };
    ratings[mutation.featureId] = {
      ...(ratings[mutation.featureId] ?? {}),
      [mutation.product]: mutation.rating,
    };
    const justifications = { ...tableData.justifications };
    justifications[mutation.featureId] = {
      ...(justifications[mutation.featureId] ?? {}),
      [mutation.product]: mutation.justification,
    };
    return { ...tableData, ratings, justifications };
  }

  return tableData;
}
