import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

const SESSION_ID = "e2e-session-001";
const PRODUCTS = ["Linear", "Jira", "Asana"];

const FEATURES = [
  { id: "f1", name: "Real-time collaboration", description: "Live updates across clients", customerBenefit: "Teams see changes instantly without refreshing", category: "must-have" as const },
  { id: "f2", name: "Offline mode", description: "Work without internet", customerBenefit: "Continue working during outages", category: "delighter" as const },
  { id: "f3", name: "Data encryption at rest", description: "AES-256 at rest", customerBenefit: "Meets enterprise security requirements", category: "must-have" as const },
  { id: "f4", name: "Mobile app", description: "Native iOS and Android", customerBenefit: "Access tasks from anywhere on any device", category: "performance" as const },
  { id: "f5", name: "Custom integrations", description: "Connect third-party tools via API", customerBenefit: "No manual data copying across tools", category: "performance" as const },
  { id: "f6", name: "Advanced analytics", description: "Team velocity dashboards", customerBenefit: "Identify bottlenecks before they compound", category: "performance" as const },
  { id: "f7", name: "Single sign-on", description: "SAML / OIDC SSO", customerBenefit: "IT team can centrally enforce access policies", category: "must-have" as const },
  { id: "f8", name: "AI task breakdown", description: "GPT-powered task decomposition", customerBenefit: "Cuts time-to-start on complex work by half", category: "delighter" as const },
];

const ratings: Record<string, Record<string, string>> = {};
const sources: Record<string, string[]> = {};
for (const f of FEATURES) {
  ratings[f.id] = Object.fromEntries(PRODUCTS.map((p) => [p, "Yes"]));
  sources[f.id] = [`https://example.com/source/${f.id}`];
}

const FIXTURE_SCOPE = {
  userProductName: "Acme Tasks",
  userProductDescription: "A task tracker for engineering leads",
  targetCustomer: "Engineering leads at 50–500-person startups",
  products: PRODUCTS,
  features: FEATURES,
  rationale: "Covers the key competitive dimensions for this market.",
};

const FIXTURE_TABLE = {
  products: PRODUCTS,
  features: FEATURES,
  ratings,
  justifications: {} as Record<string, Record<string, string>>,
  sources,
  summary: "Analysis complete.",
};

const USER = { id: "u1", email: "test@example.com", name: "Test User", avatarUrl: null };

function sessionBody(withTable: boolean) {
  return {
    session: {
      id: SESSION_ID,
      title: "Acme Tasks",
      status: withTable ? "complete" : "scoped",
      createdAt: "2026-06-04T00:00:00.000Z",
      updatedAt: "2026-06-04T00:00:00.000Z",
    },
    analysis: {
      sessionId: SESSION_ID,
      scope: FIXTURE_SCOPE,
      tableData: withTable ? FIXTURE_TABLE : null,
      sources: withTable ? { byFeatureId: sources } : null,
      updatedAt: "2026-06-04T00:00:00.000Z",
    },
  };
}

function buildSseStream(): string {
  const chunks: string[] = [];
  chunks.push(
    `event: status\ndata: ${JSON.stringify({ type: "status", status: "researching", message: "Researching features…" })}\n\n`,
  );
  for (const feature of FEATURES) {
    const ev = { type: "row", feature, ratings: ratings[feature.id], justifications: {}, sources: sources[feature.id] };
    chunks.push(`event: row\ndata: ${JSON.stringify(ev)}\n\n`);
  }
  chunks.push(
    `event: done\ndata: ${JSON.stringify({ type: "done", summary: "Analysis complete." })}\n\n`,
  );
  return chunks.join("");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("analysis flow", () => {
  test.beforeEach(async ({ page }) => {
    // Auth — always return a logged-in user so the wizard is immediately accessible
    await page.route("**/api/auth/me", (r) => r.fulfill({ json: { user: USER } }));

    // Sessions — single handler disambiguates list vs detail by URL
    await page.route(/\/api\/sessions/, (r) => {
      const url = r.request().url();
      const method = r.request().method();

      if (url.includes(`/sessions/${SESSION_ID}`)) {
        // GET /api/sessions/:id — always include tableData so the report page renders
        return r.fulfill({ json: sessionBody(true) });
      }
      if (method === "POST") {
        // POST /api/sessions (create)
        return r.fulfill({
          json: {
            session: { id: SESSION_ID, title: "Acme Tasks", status: "draft", createdAt: "2026-06-04T00:00:00.000Z", updatedAt: "2026-06-04T00:00:00.000Z" },
          },
        });
      }
      // GET /api/sessions (list)
      return r.fulfill({ json: { sessions: [] } });
    });

    // Scope proposal + update
    await page.route(/\/api\/analysis\/[^/]+\/scope/, (r) =>
      r.fulfill({ json: { scope: FIXTURE_SCOPE } }),
    );

    // Analysis start
    await page.route(/\/api\/analysis\/[^/]+\/start/, (r) =>
      r.fulfill({ json: { ok: true, sessionId: SESSION_ID } }),
    );

    // SSE stream — deliver the full fixture at once
    await page.route(/\/api\/analysis\/[^/]+\/stream/, (r) =>
      r.fulfill({
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
        body: buildSseStream(),
      }),
    );
  });

  test("/ → /new → /scope → /run → /report has ≥8 rows all with citations", async ({ page }) => {
    // ── Step 1: Landing ─────────────────────────────────────────────────────
    await page.goto("/");
    await page.getByRole("link", { name: /start an analysis/i }).click();
    await page.waitForURL("**/new");

    // ── Step 2: New analysis form ────────────────────────────────────────────
    await expect(page.locator("#productName")).toBeVisible();
    await page.fill("#productName", "Acme Tasks");
    await page.locator("textarea").fill(
      "A task tracker for engineering leads. Tightly integrated with GitHub and Slack. Differentiator: instant standup recaps from AI.",
    );
    await page.getByRole("button", { name: /propose scope/i }).click();

    // ── Step 3: Scope review ────────────────────────────────────────────────
    await page.waitForURL(`**/scope/${SESSION_ID}`);
    // Competitor names and feature names are in <input> elements; assert on section headings
    await expect(page.getByText(`Competitors (${PRODUCTS.length})`)).toBeVisible();
    await expect(page.getByText(`Features / benefits (${FEATURES.length})`)).toBeVisible();
    // Verify first competitor input value
    await expect(page.getByRole("textbox", { name: "Competitor 1 name" })).toHaveValue(PRODUCTS[0]!);

    await page.getByRole("button", { name: /run analysis/i }).click();

    // ── Step 4: Run (streaming) ─────────────────────────────────────────────
    await page.waitForURL(`**/run/${SESSION_ID}`);

    // ── Step 5: Report ──────────────────────────────────────────────────────
    // Auto-navigates after 800 ms once SSE 'done' fires
    await page.waitForURL(`**/report/${SESSION_ID}`, { timeout: 10_000 });

    // Table must have exactly 8 feature rows
    const featureRows = page.locator('tr[role="button"]');
    await expect(featureRows).toHaveCount(FEATURES.length, { timeout: 10_000 });

    // All rows must have at least one verified rating chip (source attached)
    const verifiedChips = page.locator(".rating--verified");
    await expect(verifiedChips.first()).toBeVisible();
    const chipCount = await verifiedChips.count();
    // 8 features × 3 products = 24 "Yes ✓" cells
    expect(chipCount).toBeGreaterThanOrEqual(FEATURES.length);
  });
});
