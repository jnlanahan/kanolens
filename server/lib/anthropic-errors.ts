import Anthropic from "@anthropic-ai/sdk";

export interface MappedAnthropicError {
  status: number;
  code:
    | "anthropic_billing"
    | "anthropic_rate_limit"
    | "anthropic_auth"
    | "anthropic_bad_request"
    | "anthropic_overloaded"
    | "anthropic_server"
    | "anthropic_unknown";
  userMessage: string;
  raw: string;
}

export function mapAnthropicError(err: unknown): MappedAnthropicError | null {
  if (!(err instanceof Anthropic.APIError)) return null;
  const raw = err.message ?? String(err);

  if (err instanceof Anthropic.AuthenticationError) {
    return {
      status: 401,
      code: "anthropic_auth",
      userMessage:
        "The Anthropic API rejected our key. Check ANTHROPIC_API_KEY in your .env — it must be a valid `sk-ant-…` key.",
      raw,
    };
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return {
      status: 403,
      code: "anthropic_auth",
      userMessage:
        "The Anthropic API key doesn't have access to the requested model. Check your org's plan.",
      raw,
    };
  }
  if (err instanceof Anthropic.RateLimitError) {
    return {
      status: 429,
      code: "anthropic_rate_limit",
      userMessage: "Anthropic rate-limited this request. Wait a few seconds and try again.",
      raw,
    };
  }
  if (err instanceof Anthropic.InternalServerError) {
    return {
      status: 503,
      code: "anthropic_server",
      userMessage: "Anthropic is having trouble on their end. Try again in a minute.",
      raw,
    };
  }
  if (err instanceof Anthropic.BadRequestError) {
    // Billing messages come through as BadRequestError 400 with a specific message
    if (/credit balance is too low/i.test(raw)) {
      return {
        status: 402,
        code: "anthropic_billing",
        userMessage:
          "Your Anthropic account is out of credits. Add credits at console.anthropic.com → Plans & Billing, then try again.",
        raw,
      };
    }
    return {
      status: 400,
      code: "anthropic_bad_request",
      userMessage: `Anthropic rejected the request: ${shortMessage(raw)}`,
      raw,
    };
  }
  // Status 529 overloaded
  if (err.status === 529) {
    return {
      status: 503,
      code: "anthropic_overloaded",
      userMessage: "Anthropic is overloaded right now. Retry in a moment.",
      raw,
    };
  }
  return {
    status: err.status ?? 500,
    code: "anthropic_unknown",
    userMessage: `Anthropic error: ${shortMessage(raw)}`,
    raw,
  };
}

function shortMessage(raw: string): string {
  // Extract the inner message from the SDK's "<status> <body>" formatted string if present.
  const match = raw.match(/"message":"([^"]+)"/);
  if (match) return match[1]!;
  return raw.slice(0, 300);
}
