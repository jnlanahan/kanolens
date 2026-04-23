import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import postgres from "postgres";

import { env } from "../env";
import * as schema from "./schema";

type DbPg = ReturnType<typeof drizzlePg<typeof schema>>;
type DbPglite = ReturnType<typeof drizzlePglite<typeof schema>>;
type Db = DbPg | DbPglite;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOOTSTRAP_SQL = fs.readFileSync(path.join(__dirname, "bootstrap.sql"), "utf8");
const PGLITE_PATH = path.resolve(__dirname, "../../.data/pglite");

let db: Db | null = null;
let pgClient: postgres.Sql | null = null;
let pgliteClient: PGlite | null = null;

export async function getDbAsync(): Promise<Db> {
  if (db) return db;
  if (env.DATABASE_URL) {
    pgClient = postgres(env.DATABASE_URL, { prepare: false });
    db = drizzlePg(pgClient, { schema });
    console.log("[db] connected to Postgres");
  } else {
    fs.mkdirSync(path.dirname(PGLITE_PATH), { recursive: true });
    pgliteClient = new PGlite(PGLITE_PATH);
    await pgliteClient.waitReady;
    await pgliteClient.exec(BOOTSTRAP_SQL);
    db = drizzlePglite(pgliteClient, { schema });
    console.warn(
      `[db] DATABASE_URL not set — using pglite at ${PGLITE_PATH}. ` +
        `Suitable for local dev only; set DATABASE_URL for real Postgres.`,
    );
  }
  return db;
}

export function getDb(): Db {
  if (!db) {
    throw new Error(
      "Database not initialized. Call await getDbAsync() from your server bootstrap before handling requests.",
    );
  }
  return db;
}

export async function closeDb(): Promise<void> {
  if (pgClient) {
    await pgClient.end();
    pgClient = null;
  }
  if (pgliteClient) {
    await pgliteClient.close();
    pgliteClient = null;
  }
  db = null;
}

export { schema };
