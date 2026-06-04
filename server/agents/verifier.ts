import { getGoogleClient, GEMINI_MODELS } from "../lib/google";

export type SourceVerdict = "verified" | "maybe" | "cannot_verify";

export interface VerifyInput {
  claim: string;
  url: string;
  product: string;
}

const SYSTEM = `You are a source verifier for competitive product research. Given a claim about a product and a source URL, use Google Search to look up the URL and verify whether it supports the claim.

Respond with exactly one word on the first line:
- verified — the source directly supports the claim (official product site, official docs, or a specific verified review).
- maybe — the source appears related but is secondary or cannot be directly validated.
- cannot_verify — the URL is unrelated, broken, or clearly does not support the claim.

On a second line, a ≤15-word justification.

Do not output anything else.`;

export async function verifySource(input: VerifyInput): Promise<{ verdict: SourceVerdict; note: string }> {
  const ai = getGoogleClient();

  const response = await ai.models.generateContent({
    model: GEMINI_MODELS.verifier,
    contents: `${SYSTEM}\n\nProduct: ${input.product}\nClaim: ${input.claim}\nSource URL: ${input.url}`,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const text = (response.text ?? "").trim();
  const [firstLine = "", ...rest] = text.split("\n");
  const normalized = firstLine.toLowerCase().trim();
  const verdict: SourceVerdict =
    normalized === "verified" ? "verified" : normalized === "maybe" ? "maybe" : "cannot_verify";
  return { verdict, note: rest.join(" ").trim() };
}
