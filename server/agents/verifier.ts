import { getAnthropicClient, MODELS } from "../lib/anthropic";

export type SourceVerdict = "verified" | "maybe" | "cannot_verify";

export interface VerifyInput {
  claim: string;
  url: string;
  product: string;
}

const SYSTEM = `You are a source verifier for competitive product research. Given a claim about a product and a source URL, decide whether the URL plausibly supports the claim.

Respond with exactly one word on the first line:
- verified — the URL is a primary source (official product site, official docs, verified review platform with a specific citation) that directly supports the claim.
- maybe — the URL appears related but is secondary (third-party blog, social post, general comparison site) or cannot be directly validated.
- cannot_verify — the URL is unrelated, broken, or clearly does not support the claim.

On a second line, a ≤15-word justification.

Do not output anything else.`;

export async function verifySource(input: VerifyInput): Promise<{ verdict: SourceVerdict; note: string }> {
  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: MODELS.verifier,
    max_tokens: 120,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Product: ${input.product}\nClaim: ${input.claim}\nSource URL: ${input.url}`,
      },
    ],
  });

  const text = response.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();

  const [firstLine = "", ...rest] = text.split("\n");
  const normalized = firstLine.toLowerCase().trim();
  const verdict: SourceVerdict =
    normalized === "verified" ? "verified" : normalized === "maybe" ? "maybe" : "cannot_verify";
  return { verdict, note: rest.join(" ").trim() };
}
