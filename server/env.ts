import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  WEB_PORT: z.coerce.number().int().positive().default(5173),

  DATABASE_URL: z.string().url().optional(),

  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  JWT_SECRET: z.string().min(32).optional(),

  PUBLIC_WEB_ORIGIN: z.string().url().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment:", parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();

export function requireSecret<K extends "ANTHROPIC_API_KEY" | "GEMINI_API_KEY" | "DATABASE_URL" | "JWT_SECRET">(
  key: K,
): string {
  const value = env[key];
  if (!value) {
    throw new Error(
      `${key} is required for this operation. Add it to .env (see .env.example).`,
    );
  }
  return value;
}
