import fs from "node:fs";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import postgres from "postgres";

import { env } from "../env";
import * as schema from "./schema";

type DbPg = ReturnType<typeof drizzlePg<typeof schema>>;
type DbPglite = ReturnType<typeof drizzlePglite<typeof schema>>;
type Db = DbPg | DbPglite;

// Read lazily and from the repo root (cwd), not __dirname — in the bundled prod
// build __dirname is dist/ and dist/bootstrap.sql doesn't exist. Only the pglite
// dev fallback (no DATABASE_URL) ever needs it, so a missing file in prod is fine.
function loadBootstrapSql(): string {
  return fs.readFileSync(path.resolve(process.cwd(), "server/db/bootstrap.sql"), "utf8");
}

let db: Db | null = null;
let pgClient: postgres.Sql | null = null;
let pgliteClient: PGlite | null = null;

export async function getDbAsync(): Promise<Db> {
  if (db) return db;
  if (env.DATABASE_URL) {
    pgClient = postgres(env.DATABASE_URL, { prepare: false });
    const pgDb = drizzlePg(pgClient, { schema });
    // Apply committed migrations on boot. Single-instance deploy, so this is
    // safe and means no manual migration step is needed when deploying.
    await migrate(pgDb, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
    db = pgDb;
    console.log("[db] connected to Postgres; migrations applied");
  } else {
    // In-memory pglite: no persistence across restarts, but no file-level
    // corruption possible from interrupted writes (real issue on Windows).
    // Set DATABASE_URL for a persistent Postgres.
    pgliteClient = new PGlite();
    await pgliteClient.waitReady;
    await pgliteClient.exec(loadBootstrapSql());
    db = drizzlePglite(pgliteClient, { schema });
    console.warn(
      "[db] DATABASE_URL not set — using in-memory pglite. " +
        "State resets on every restart. Set DATABASE_URL for persistent Postgres.",
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
