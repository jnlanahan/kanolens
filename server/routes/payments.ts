import { eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import Stripe from "stripe";

import { getDb, schema } from "../db/client";
import { env } from "../env";
import { requireUser, type AuthContext } from "./auth";

export const paymentsRoutes = new Hono<AuthContext>();

function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  return new Stripe(env.STRIPE_SECRET_KEY);
}

function webOrigin(): string {
  return env.PUBLIC_WEB_ORIGIN ?? `http://localhost:${env.WEB_PORT}`;
}

/** POST /api/payments/checkout — create a Stripe Checkout Session for 1 run credit ($5) */
paymentsRoutes.post("/checkout", async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);

  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID) {
    return c.json({ error: "payments_not_configured" }, 503);
  }

  const stripe = getStripe();
  const origin = webOrigin();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: user.id,
      metadata: { userId: user.id },
      line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${origin}/dashboard?payment=success`,
      cancel_url: `${origin}/dashboard`,
    });
    return c.json({ url: session.url });
  } catch (err) {
    console.error("[payments/checkout] Stripe error:", err);
    return c.json({ error: "stripe_error", message: err instanceof Error ? err.message : String(err) }, 502);
  }
});

/** POST /api/payments/webhook — Stripe webhook; authenticated by signature, NOT by cookie */
paymentsRoutes.post("/webhook", async (c) => {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    return c.json({ error: "payments_not_configured" }, 503);
  }

  const rawBody = await c.req.text();
  const sig = c.req.header("stripe-signature");
  if (!sig) return c.text("Missing stripe-signature header", 400);

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[payments/webhook] signature verification failed:", err);
    return c.text("Invalid signature", 400);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId ?? session.client_reference_id;
    if (!userId) {
      console.error("[payments/webhook] checkout.session.completed: missing userId in metadata");
      return c.text("Missing userId", 400);
    }

    const db = getDb();

    // Idempotency: skip if we've already processed this session
    const existing = await db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.stripeSessionId, session.id))
      .limit(1);
    if (existing.length > 0) return c.text("Already processed", 200);

    // Record the payment and atomically credit the user
    await db.insert(schema.payments).values({
      userId,
      stripeSessionId: session.id,
      amountCents: session.amount_total ?? 500,
      currency: session.currency ?? "usd",
    });
    await db
      .update(schema.users)
      .set({ runCredits: sql`${schema.users.runCredits} + 1` })
      .where(eq(schema.users.id, userId));

    console.log(`[payments/webhook] credited 1 run to user ${userId}`);
  }

  // Return 200 for all other events (Stripe will retry on non-200)
  return c.text("OK", 200);
});
