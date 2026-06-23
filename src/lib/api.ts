import type { KanoFeature, KanoTableData } from "./kano-types";

export type KanoCategory = "must-have" | "performance" | "delighter";

export interface ApiUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl?: string | null;
  runCredits: number;
  freeRunUsed: boolean;
}

export interface ApiSessionSummary {
  id: string;
  title: string;
  status: "draft" | "scoping" | "scoped" | "running" | "complete" | "error";
  parentSessionId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiScopeFeature {
  id: string;
  name: string;
  description: string;
  customerBenefit: string;
  category: KanoCategory;
}

export interface ApiScope {
  userProductName: string | null;
  userProductDescription: string;
  targetCustomer: string;
  products: string[];
  features: ApiScopeFeature[];
  rationale?: string;
  suggestedAdditionalCompetitors?: string[];
}

export interface ApiAnalysis {
  sessionId: string;
  scope: ApiScope | null;
  tableData: KanoTableData | null;
  sources: SourcesPayload | null;
  updatedAt: string;
}

export interface SourcesPayload {
  byFeatureId: Record<string, string[]>;
  claimsByFeatureId?: Record<string, Record<string, string>>;
}

class ApiError extends Error {
  constructor(public readonly status: number, message: string, public readonly detail?: unknown) {
    super(message);
  }

  get detailMessage(): string {
    if (this.detail && typeof this.detail === "object" && "message" in this.detail) {
      const m = (this.detail as { message?: unknown }).message;
      if (typeof m === "string" && m.length > 0) return m;
    }
    if (this.detail && typeof this.detail === "object" && "error" in this.detail) {
      const e = (this.detail as { error?: unknown }).error;
      if (typeof e === "string" && e.length > 0) return e;
    }
    return this.message;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: init?.body ? { "content-type": "application/json", ...(init?.headers ?? {}) } : init?.headers,
    ...init,
  });
  if (!res.ok) {
    let detail: unknown;
    try {
      detail = await res.json();
    } catch {
      detail = await res.text().catch(() => undefined);
    }
    throw new ApiError(res.status, `${res.status} ${res.statusText}`, detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  me: () => request<{ user: ApiUser | null }>("/api/auth/me"),
  logout: () => request<{ ok: true }>("/api/auth/logout", { method: "POST" }),

  listSessions: () => request<{ sessions: ApiSessionSummary[] }>("/api/sessions"),
  createSession: (title?: string) =>
    request<{ session: ApiSessionSummary }>("/api/sessions", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),
  getSession: (id: string) =>
    request<{ session: ApiSessionSummary; analysis: ApiAnalysis | null }>(`/api/sessions/${id}`),
  deleteSession: (id: string) =>
    request<{ ok: true }>(`/api/sessions/${id}`, { method: "DELETE" }),
  reRun: (id: string) =>
    request<{ session: ApiSessionSummary }>(`/api/sessions/${id}/re-run`, { method: "POST" }),

  prefill: (url: string) =>
    request<{ productName: string; description: string; competitors: string[] }>(
      "/api/analysis/prefill",
      { method: "POST", body: JSON.stringify({ url }) },
    ),
  proposeScope: (id: string, body: {
    userProductName?: string | null;
    userProductDescription: string;
    targetCustomerHint?: string;
    competitorHints?: string[];
  }) =>
    request<{ scope: ApiScope }>(`/api/analysis/${id}/scope`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateScope: (id: string, scope: ApiScope) =>
    request<{ scope: ApiScope }>(`/api/analysis/${id}/scope`, {
      method: "PUT",
      body: JSON.stringify(scope),
    }),
  startAnalysis: (id: string) =>
    request<{ ok: true; sessionId: string }>(`/api/analysis/${id}/start`, { method: "POST" }),
  refine: (id: string, message: string) =>
    request<{ reply: string }>(`/api/analysis/${id}/refine`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
  reResearch: (id: string, featureId: string, product: string) =>
    request<{
      featureId: string;
      product: string;
      rating: string;
      justification: string;
      estimated: boolean;
      confidence: "high" | "medium" | "low";
    }>(`/api/analysis/${id}/re-research`, {
      method: "POST",
      body: JSON.stringify({ featureId, product }),
    }),
  streamUrl: (id: string) => `/api/analysis/${id}/stream`,

  enableShare: (id: string) =>
    request<{ shareUrl: string }>(`/api/analysis/${id}/share`, { method: "POST" }),
  getShare: (shareToken: string) =>
    request<{
      tableData: KanoTableData | null;
      scope: ApiScope | null;
      sources: SourcesPayload | null;
      title: string;
    }>(`/api/share/${shareToken}`),

  createCheckout: () =>
    request<{ url: string | null }>("/api/payments/checkout", { method: "POST" }),
};

export type StreamEvent =
  | { type: "status"; status: "queued" | "researching" | "writing" | "done" | "error"; message?: string }
  | {
      type: "row";
      feature: KanoFeature;
      ratings: Record<string, string>;
      justifications?: Record<string, string>;
      estimated?: Record<string, boolean>;
      confidence?: Record<string, "high" | "medium" | "low">;
      sources: string[];
      sourceClaims?: Record<string, string>;
    }
  | { type: "narration"; text: string }
  | { type: "done"; summary: string }
  | { type: "error"; message: string };

export { ApiError };
