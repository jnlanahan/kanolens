import { GoogleGenAI } from "@google/genai";

import { requireSecret } from "../env";

let client: GoogleGenAI | null = null;

export function getGoogleClient(): GoogleGenAI {
  if (client) return client;
  client = new GoogleGenAI({ apiKey: requireSecret("GEMINI_API_KEY") });
  return client;
}

export const GEMINI_MODELS = {
  verifier: "gemini-2.5-flash",
} as const;
