import * as Sentry from "@sentry/react";
import posthog from "posthog-js";

export function identifyUser(user: { id: string; email: string }) {
  Sentry.setUser({ id: user.id, email: user.email });
  posthog.identify(user.id, { email: user.email, app: "kanolens" });
}

export function resetUser() {
  Sentry.setUser(null);
  posthog.reset();
}

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  posthog.capture(event, { app: "kanolens", ...properties });
}
