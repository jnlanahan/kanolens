import { eq } from "drizzle-orm";

import { getDb, schema } from "../db/client";

export const ADMIN_EMAIL = "jnlanahan@gmail.com";
const REFINE_LIMIT = 3;

export interface UsageError {
  code: string;
  message: string;
}

/** Call before starting an analysis run. Returns null if allowed, UsageError if blocked. */
export async function guardRunStart(userId: string, sessionId: string): Promise<UsageError | null> {
  const db = getDb();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  if (!user) return { code: "user_not_found", message: "User not found." };

  if (user.isAdmin || user.email === ADMIN_EMAIL) return null;

  if (!user.freeRunUsed) {
    await db.update(schema.users).set({ freeRunUsed: true }).where(eq(schema.users.id, userId));
    await db
      .update(schema.sessions)
      .set({ isPaidRun: false })
      .where(eq(schema.sessions.id, sessionId));
    return null;
  }

  if (user.runCredits > 0) {
    await db
      .update(schema.users)
      .set({ runCredits: user.runCredits - 1 })
      .where(eq(schema.users.id, userId));
    await db
      .update(schema.sessions)
      .set({ isPaidRun: true })
      .where(eq(schema.sessions.id, sessionId));
    return null;
  }

  return {
    code: "insufficient_credits",
    message: "You've used your free run. Purchase a new analysis to continue.",
  };
}

/** Call before processing a refine request. Returns null if allowed, UsageError if blocked.
 *  Also increments refinementsUsed when allowed on a paid run. */
export async function guardRefine(userId: string, sessionId: string): Promise<UsageError | null> {
  const db = getDb();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  if (!user) return { code: "user_not_found", message: "User not found." };

  if (user.isAdmin || user.email === ADMIN_EMAIL) return null;

  const [session] = await db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.id, sessionId))
    .limit(1);
  if (!session) return { code: "session_not_found", message: "Session not found." };

  if (!session.isPaidRun) {
    return {
      code: "free_run_no_refine",
      message: "Refinements require a paid analysis. Start a new run for $5 to iterate.",
    };
  }

  if (session.refinementsUsed >= REFINE_LIMIT) {
    return {
      code: "refine_limit_reached",
      message: `You've used all ${REFINE_LIMIT} refinements for this analysis.`,
    };
  }

  await db
    .update(schema.sessions)
    .set({ refinementsUsed: session.refinementsUsed + 1 })
    .where(eq(schema.sessions.id, sessionId));

  return null;
}
