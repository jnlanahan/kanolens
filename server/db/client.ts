import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { requireSecret } from "../env";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

let client: postgres.Sql | null = null;
let db: Db | null = null;

export function getDb(): Db {
  if (db) return db;
  const url = requireSecret("DATABASE_URL");
  client = postgres(url, { prepare: false });
  db = drizzle(client, { schema });
  return db;
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.end();
    client = null;
    db = null;
  }
}

export { schema };
