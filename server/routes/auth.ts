import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { eq } from "drizzle-orm";

import { getDb, schema } from "../db/client";
import { env } from "../env";
import { AUTH_COOKIE, authCookieOptions, signAuthToken, verifyAuthToken } from "../lib/auth";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
const OAUTH_STATE_COOKIE = "kanolens_oauth_state";

export type AuthContext = {
  Variables: { user?: { id: string; email: string } };
};

export const authRoutes = new Hono<AuthContext>();

function redirectUri(): string {
  const base = env.PUBLIC_WEB_ORIGIN ?? `http://localhost:${env.PORT}`;
  return `${base}/api/auth/google/callback`;
}

function webOrigin(): string {
  return env.PUBLIC_WEB_ORIGIN ?? `http://localhost:${env.WEB_PORT}`;
}

authRoutes.get("/google", (c) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return c.json({ error: "google_oauth_not_configured" }, 503);
  }
  const state = crypto.randomUUID();
  setCookie(c, OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return c.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
});

authRoutes.get("/google/callback", async (c) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return c.json({ error: "google_oauth_not_configured" }, 503);
  }

  const code = c.req.query("code");
  const state = c.req.query("state");
  const expectedState = getCookie(c, OAUTH_STATE_COOKIE);
  deleteCookie(c, OAUTH_STATE_COOKIE, { path: "/" });

  if (!code || !state || !expectedState || state !== expectedState) {
    return c.json({ error: "invalid_oauth_state" }, 400);
  }

  const tokenResp = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!tokenResp.ok) {
    return c.json({ error: "google_token_exchange_failed", detail: await tokenResp.text() }, 502);
  }
  const tokenJson = (await tokenResp.json()) as { access_token?: string };
  if (!tokenJson.access_token) {
    return c.json({ error: "google_token_missing" }, 502);
  }

  const userResp = await fetch(GOOGLE_USERINFO_URL, {
    headers: { authorization: `Bearer ${tokenJson.access_token}` },
  });
  if (!userResp.ok) {
    return c.json({ error: "google_userinfo_failed", detail: await userResp.text() }, 502);
  }
  const profile = (await userResp.json()) as {
    sub: string;
    email: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };
  if (!profile.email) {
    return c.json({ error: "google_email_missing" }, 400);
  }
  if (!profile.email_verified) {
    return c.json({ error: "email_not_verified" }, 400);
  }

  const user = await upsertUser({
    email: profile.email,
    googleSub: profile.sub,
    name: profile.name,
    avatarUrl: profile.picture,
  });

  const jwt = await signAuthToken({ sub: user.id, email: user.email });
  setCookie(c, AUTH_COOKIE, jwt, authCookieOptions(env.NODE_ENV === "production"));
  return c.redirect(`${webOrigin()}/dashboard`);
});

authRoutes.post("/logout", (c) => {
  deleteCookie(c, AUTH_COOKIE, { path: "/" });
  return c.json({ ok: true });
});

authRoutes.get("/me", async (c) => {
  const token = getCookie(c, AUTH_COOKIE);
  if (!token) return c.json({ user: null });
  const payload = await verifyAuthToken(token);
  if (!payload) return c.json({ user: null });

  const db = getDb();
  const rows = await db.select().from(schema.users).where(eq(schema.users.id, payload.sub)).limit(1);
  const user = rows[0];
  if (!user) return c.json({ user: null });
  return c.json({
    user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, runCredits: user.runCredits, freeRunUsed: user.freeRunUsed },
  });
});

const ADMIN_EMAILS = new Set(["jnlanahan@gmail.com"]);

async function upsertUser(args: {
  email: string;
  googleSub?: string;
  name?: string;
  avatarUrl?: string;
}): Promise<schema.User> {
  const db = getDb();
  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, args.email))
    .limit(1);
  const row = existing[0];
  if (row) {
    const updates: Partial<schema.NewUser> = { lastSeenAt: new Date() };
    if (args.googleSub && !row.googleSub) updates.googleSub = args.googleSub;
    if (args.name && !row.name) updates.name = args.name;
    if (args.avatarUrl && !row.avatarUrl) updates.avatarUrl = args.avatarUrl;
    if (ADMIN_EMAILS.has(args.email) && !row.isAdmin) updates.isAdmin = true;
    const [updated] = await db
      .update(schema.users)
      .set(updates)
      .where(eq(schema.users.id, row.id))
      .returning();
    return updated ?? row;
  }
  const [created] = await db
    .insert(schema.users)
    .values({
      email: args.email,
      googleSub: args.googleSub,
      name: args.name,
      avatarUrl: args.avatarUrl,
      isAdmin: ADMIN_EMAILS.has(args.email),
    })
    .returning();
  if (!created) throw new Error("failed to create user");
  return created;
}

export async function requireUser(
  c: import("hono").Context<AuthContext>,
): Promise<{ id: string; email: string } | null> {
  const cached = c.get("user");
  if (cached) return cached;
  const token = getCookie(c, AUTH_COOKIE);
  if (!token) return null;
  const payload = await verifyAuthToken(token);
  if (!payload) return null;
  const user = { id: payload.sub, email: payload.email };
  c.set("user", user);
  return user;
}
