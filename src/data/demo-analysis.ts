import type { KanoTableData } from "@/lib/kano-types";

export const DEMO_PRODUCT_NAME = "Nucleus";

export const demoAnalysis: KanoTableData = {
  products: ["Linear", "Jira", "Asana", DEMO_PRODUCT_NAME],
  summary:
    "Nucleus leads on AI-assisted triage and real-time collaboration while lagging on enterprise reporting. Jira dominates compliance features but its onboarding is the weakest in the field.",
  features: [
    {
      id: "f-git-sync",
      name: "Automatic git branch sync",
      description: "Issues auto-link to branches and PRs without manual tagging.",
      customerBenefit: "Developers spend zero time connecting code to tasks — context flows automatically.",
      category: "must-have",
    },
    {
      id: "f-mobile",
      name: "Usable mobile experience",
      description: "iOS and Android apps that cover the core create/update/comment loop.",
      customerBenefit: "Teams can stay unblocked from anywhere, not just a laptop.",
      category: "must-have",
    },
    {
      id: "f-sla",
      name: "SLA and compliance audit trail",
      description: "Immutable history of status changes with timestamps for SOC 2 / ISO audits.",
      customerBenefit: "Enterprise customers can pass audits without exporting spreadsheets.",
      category: "must-have",
    },
    {
      id: "f-velocity",
      name: "Sprint velocity forecasting",
      description: "Historical throughput used to predict how much work fits a sprint.",
      customerBenefit: "Eng leads commit to realistic roadmaps instead of guessing.",
      category: "performance",
    },
    {
      id: "f-custom-workflow",
      name: "Custom workflow states",
      description: "Teams define their own status columns beyond default To Do / In Progress / Done.",
      customerBenefit: "Workflows match how the team actually works, not a generic template.",
      category: "performance",
    },
    {
      id: "f-reporting",
      name: "Cross-project executive reporting",
      description: "Roll-up dashboards that surface progress across multiple projects for leadership.",
      customerBenefit: "VPs get a live status without interrupting ICs for weekly updates.",
      category: "performance",
    },
    {
      id: "f-onboarding",
      name: "Onboarding speed (< 10 min to first issue)",
      description: "Time from sign-up to a fully configured project with the team invited.",
      customerBenefit: "Teams ship value on day one instead of spending a week on setup.",
      category: "performance",
    },
    {
      id: "f-ai-triage",
      name: "AI-assisted issue triage",
      description: "New issues are automatically labeled, prioritized, and routed based on content.",
      customerBenefit: "Backlogs stay clean without a dedicated PM babysitting the inbox.",
      category: "delighter",
    },
    {
      id: "f-realtime",
      name: "Real-time multiplayer editing",
      description: "Multiple teammates edit the same issue description or doc simultaneously.",
      customerBenefit: "No more 'who saved last' conflicts — collaboration feels like Google Docs.",
      category: "delighter",
    },
    {
      id: "f-video-clip",
      name: "Embedded screen-recording clips",
      description: "Record a short video directly inside an issue to show a bug or demo a feature.",
      customerBenefit: "Bug reports become self-explanatory — no back-and-forth to reproduce.",
      category: "delighter",
    },
  ],
  ratings: {
    "f-git-sync": { Linear: "Yes", Jira: "Yes", Asana: "No", [DEMO_PRODUCT_NAME]: "Yes" },
    "f-mobile": { Linear: "Yes", Jira: "Yes", Asana: "Yes", [DEMO_PRODUCT_NAME]: "Maybe" },
    "f-sla": { Linear: "No", Jira: "Yes", Asana: "Maybe", [DEMO_PRODUCT_NAME]: "No" },
    "f-velocity": { Linear: "High", Jira: "Medium", Asana: "Medium", [DEMO_PRODUCT_NAME]: "High" },
    "f-custom-workflow": { Linear: "High", Jira: "High", Asana: "High", [DEMO_PRODUCT_NAME]: "Medium" },
    "f-reporting": { Linear: "Low", Jira: "High", Asana: "Medium", [DEMO_PRODUCT_NAME]: "Low" },
    "f-onboarding": {
      Linear: "High",
      Jira: "Low",
      Asana: "Medium",
      [DEMO_PRODUCT_NAME]: "High",
    },
    "f-ai-triage": { Linear: "Yes", Jira: "No", Asana: "No", [DEMO_PRODUCT_NAME]: "Yes" },
    "f-realtime": { Linear: "No", Jira: "No", Asana: "No", [DEMO_PRODUCT_NAME]: "Yes" },
    "f-video-clip": { Linear: "No", Jira: "No", Asana: "No", [DEMO_PRODUCT_NAME]: "No" },
  },
  justifications: {
    "f-git-sync": {
      Linear: "Linear's GitHub/GitLab integration auto-links PRs to issues by branch name.",
      Jira: "Jira Smart Commits and GitHub for Jira provide deep two-way sync.",
      Asana: "Asana has no native git integration — requires Zapier or third-party connectors.",
      [DEMO_PRODUCT_NAME]: "Native git sync ships in v2.",
    },
    "f-sla": {
      Linear: "No built-in SLA tracking or compliance export.",
      Jira: "Jira Service Management includes SLA timers and full audit log export.",
      Asana: "Basic activity log available but not formatted for compliance audits.",
      [DEMO_PRODUCT_NAME]: "Not yet implemented — on the roadmap for Q3.",
    },
    "f-ai-triage": {
      Linear: "Triage mode with AI label suggestions available in team plan.",
      Jira: "No native AI triage — relies on third-party automation rules.",
      Asana: "No AI triage in current product.",
      [DEMO_PRODUCT_NAME]: "AI triage is the flagship feature — routes by team, priority, and type.",
    },
    "f-realtime": {
      Linear: "Issues use last-write-wins, not real-time co-editing.",
      Jira: "No real-time collaborative editing on issue descriptions.",
      Asana: "Tasks support comments but not simultaneous description editing.",
      [DEMO_PRODUCT_NAME]: "Built on Yjs CRDT — true multiplayer on all text fields.",
    },
  },
  sources: {},
};
