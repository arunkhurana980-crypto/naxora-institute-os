import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { resolvePart116Access } from "./part116-subscription-access-control.js";

const PART_NUMBER = 121;
const PART_NAME = "Owner Module Consolidation";
const OWNER_ROLES = new Set(["institute_owner", "owner", "instituteowner"]);

const OWNER_MODULES = Object.freeze([
  {
    key: "owner-dashboard",
    label: "Owner Workspace",
    description: "Unified owner overview, quick actions and institute command centre.",
    category: "Owner Core",
    route: "/owner-workspace",
    icon: "building",
    alwaysAvailable: true,
  },
  {
    key: "account-access",
    label: "Account Access",
    description: "Create, disable and reset role accounts.",
    category: "Owner Core",
    route: "/account-access-manager",
    icon: "lock",
    alwaysAvailable: true,
  },
  {
    key: "students",
    label: "Students",
    description: "Student records and admissions-related operations.",
    category: "Institute Operations",
    route: "/student",
    icon: "users",
    featureKey: "students.manage",
  },
  {
    key: "attendance",
    label: "Attendance",
    description: "Institute attendance and classroom records.",
    category: "Institute Operations",
    route: "/attendance",
    icon: "check",
    featureKey: "attendance.manage",
  },
  {
    key: "fees",
    label: "Fees",
    description: "Fees, receipts and collection controls.",
    category: "Institute Operations",
    route: "/fees",
    icon: "wallet",
    featureKey: "fees.manage",
  },
  {
    key: "reports",
    label: "Reports",
    description: "Institute and role-safe reports.",
    category: "Institute Operations",
    route: "/reports",
    icon: "chart",
    featureKey: "reports.basic",
  },
  {
    key: "live-classes",
    label: "Live Classes",
    description: "Classroom, whiteboard, chat, polls and recordings.",
    category: "Teaching & Support",
    route: "/live-classes",
    icon: "video",
    featureKey: "live.classes",
  },
  {
    key: "student-support",
    label: "Student Support AI",
    description: "Weak-topic, support-risk and intervention insights.",
    category: "Teaching & Support",
    route: "/advanced-student-support",
    icon: "support",
    featureKey: "ai.student_support",
  },
  {
    key: "branches",
    label: "Branch Command Centre",
    description: "Multi-branch performance and operations.",
    category: "Business",
    route: "/multi-branch-command-centre",
    icon: "branches",
    featureKey: "branches.command_centre",
  },
  {
    key: "franchise",
    label: "Franchise Management",
    description: "Franchise agreements, royalty and operations.",
    category: "Business",
    route: "/franchise-management",
    icon: "franchise",
    featureKey: "franchise.manage",
  },
  {
    key: "marketing",
    label: "Automated Marketing",
    description: "Consent-aware campaigns and lead follow-up.",
    category: "Business",
    route: "/automated-marketing",
    icon: "megaphone",
    featureKey: "marketing.automation",
  },
  {
    key: "marketplace",
    label: "Marketplace",
    description: "Institute providers, marketplace and CRM leads.",
    category: "Business",
    route: "/institute-marketplace",
    icon: "store",
    featureKey: "marketplace.manage",
  },
  {
    key: "white-label",
    label: "White Label",
    description: "Brand, domain and publishing controls.",
    category: "Business",
    route: "/white-label-system",
    icon: "brand",
    featureKey: "white_label.manage",
  },
  {
    key: "subscription-plans",
    label: "Subscription Plans",
    description: "NAXORA Plans and Razorpay Test Plan setup.",
    category: "Billing & Subscription",
    route: "/subscription-plans",
    icon: "plans",
    billingControl: true,
  },
  {
    key: "subscription-checkout",
    label: "Subscription Checkout",
    description: "Test checkout and customer Subscription authorisation.",
    category: "Billing & Subscription",
    route: "/subscription-checkout",
    icon: "checkout",
    billingControl: true,
  },
  {
    key: "webhook-monitor",
    label: "Webhook Monitor",
    description: "Verified Razorpay events and status sync.",
    category: "Billing & Subscription",
    route: "/webhook-monitor",
    icon: "webhook",
    billingControl: true,
  },
  {
    key: "subscription-access",
    label: "Feature Access",
    description: "Plan, role and V3 access controls.",
    category: "Billing & Subscription",
    route: "/subscription-access-control",
    icon: "lock",
    billingControl: true,
  },
  {
    key: "subscription-manager",
    label: "VANI Subscription Manager",
    description: "Safe pause, resume, cancellation and plan changes.",
    category: "Billing & Subscription",
    route: "/vani-subscription-manager",
    icon: "manage",
    billingControl: true,
  },
  {
    key: "live-readiness",
    label: "Live Payment Readiness",
    description: "Adult merchant controlled Razorpay Live readiness.",
    category: "Billing & Subscription",
    route: "/razorpay-live-readiness",
    icon: "shield",
    billingControl: true,
  },
  {
    key: "owner-ai",
    label: "AI Owner Command Centre",
    description: "Owner strategy and institute reasoning.",
    category: "NAXORA OS 3.0",
    route: "/owner-ai-command-centre",
    icon: "brain",
    featureKey: "owner_ai.command_centre",
    v3: true,
    upcomingIntegration: true,
  },
  {
    key: "vani-v3",
    label: "VANI 3.0",
    description: "Human-like multi-step owner assistant.",
    category: "NAXORA OS 3.0",
    route: "/vani-v3",
    icon: "spark",
    featureKey: "vani.v3",
    v3: true,
    upcomingIntegration: true,
  },
  {
    key: "business-growth-ai",
    label: "Business Growth AI",
    description: "Admissions, retention, revenue and growth strategy.",
    category: "NAXORA OS 3.0",
    route: "/ai-business-growth",
    icon: "growth",
    featureKey: "ai.business_growth",
    v3: true,
    upcomingIntegration: true,
  },
]);

const COMMAND_ALIASES = Object.freeze({
  owner: "owner-dashboard",
  dashboard: "owner-dashboard",
  workspace: "owner-dashboard",
  accounts: "account-access",
  account: "account-access",
  access: "account-access",
  students: "students",
  student: "students",
  admissions: "students",
  attendance: "attendance",
  fees: "fees",
  fee: "fees",
  reports: "reports",
  report: "reports",
  classes: "live-classes",
  classroom: "live-classes",
  support: "student-support",
  branch: "branches",
  branches: "branches",
  franchise: "franchise",
  marketing: "marketing",
  marketplace: "marketplace",
  brand: "white-label",
  plans: "subscription-plans",
  checkout: "subscription-checkout",
  webhook: "webhook-monitor",
  subscription: "subscription-access",
  "subscription manager": "subscription-manager",
  "live readiness": "live-readiness",
  "owner ai": "owner-ai",
  "vani 3": "vani-v3",
  growth: "business-growth-ai",
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, "../../frontend");

function cleanText(value = "", max = 255) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}
function cleanId(value = "") {
  return String(value || "").trim().replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 180);
}
function normalizeRole(value = "") {
  const role = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  const aliases = {
    owner: "institute_owner",
    instituteowner: "institute_owner",
  };
  return aliases[role] || role;
}
function getBearer(req) {
  const auth = String(req.headers.authorization || "").trim();
  return auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
}
function jwtSecrets() {
  return [
    process.env.JWT_SECRET,
    process.env.JWT_ACCESS_SECRET,
    process.env.ACCESS_TOKEN_SECRET,
    process.env.NAXORA_JWT_SECRET,
  ].map((value) => String(value || "").trim()).filter(Boolean);
}
function verifyJwt(token) {
  const secrets = jwtSecrets();
  if (!secrets.length) {
    const error = new Error("JWT server configuration missing.");
    error.code = "AUTH_CONFIGURATION_MISSING";
    error.httpStatus = 503;
    throw error;
  }
  for (const secret of secrets) {
    try {
      return jwt.verify(token, secret, { algorithms: ["HS256", "HS384", "HS512"] });
    } catch {
      // Try another configured JWT secret.
    }
  }
  const error = new Error("Login session invalid or expired.");
  error.code = "INVALID_SESSION";
  error.httpStatus = 401;
  throw error;
}
function ownerContext(req) {
  const existing = req.part120Context || req.user || req.auth || null;
  const payload = existing || (getBearer(req) ? verifyJwt(getBearer(req)) : null);
  if (!payload) {
    const error = new Error("Institute owner login required.");
    error.code = "OWNER_LOGIN_REQUIRED";
    error.httpStatus = 401;
    throw error;
  }
  const role = normalizeRole(
    payload.role || payload.userRole || payload.accountRole || payload.user?.role || ""
  );
  if (!OWNER_ROLES.has(role)) {
    const error = new Error("Only institute_owner can open the Owner Workspace.");
    error.code = "OWNER_ONLY";
    error.httpStatus = 403;
    throw error;
  }
  const requestedInstituteId = cleanId(
    req.headers["x-naxora-institute-id"] || req.body?.instituteId || req.query?.instituteId || ""
  );
  const tokenInstituteId = cleanId(
    payload.instituteId || payload.institute_id || payload.user?.instituteId || payload.tenantId || ""
  );
  if (tokenInstituteId && requestedInstituteId && tokenInstituteId !== requestedInstituteId) {
    const error = new Error("Institute context does not match login session.");
    error.code = "INSTITUTE_CONTEXT_MISMATCH";
    error.httpStatus = 403;
    throw error;
  }
  const instituteId = tokenInstituteId || requestedInstituteId;
  if (!instituteId) {
    const error = new Error("Valid instituteId required.");
    error.code = "INSTITUTE_ID_REQUIRED";
    error.httpStatus = 400;
    throw error;
  }
  return {
    role: "institute_owner",
    instituteId,
    userId: cleanId(payload.userId || payload.identityId || payload.id || payload._id || payload.sub || "owner"),
    displayName: cleanText(payload.displayName || payload.name || payload.fullName || payload.email || "Institute Owner", 120),
  };
}
function ownerOnly(req, res, next) {
  try {
    req.part121Owner = ownerContext(req);
    next();
  } catch (error) {
    res.status(error.httpStatus || 401).json({
      success: false,
      part: PART_NUMBER,
      code: error.code || "OWNER_AUTH_FAILED",
      message: error.message,
    });
  }
}
function dbReady() {
  return mongoose.connection?.readyState === 1;
}
function defineModels() {
  const auditSchema = new mongoose.Schema({
    instituteId: { type: String, required: true, index: true },
    actorUserId: { type: String, required: true },
    action: { type: String, required: true },
    result: { type: String, required: true },
    moduleKey: { type: String, default: "" },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  }, { timestamps: true, strict: true });

  return {
    Audit: mongoose.models.Part121OwnerWorkspaceAudit ||
      mongoose.model("Part121OwnerWorkspaceAudit", auditSchema),
  };
}
async function writeAudit(models, req, action, result, moduleKey = "", details = {}) {
  if (!dbReady()) return;
  try {
    await models.Audit.create({
      instituteId: req.part121Owner?.instituteId || "unknown",
      actorUserId: req.part121Owner?.userId || "owner",
      action,
      result,
      moduleKey,
      details,
    });
  } catch {
    // Owner workspace must remain available even when audit storage fails.
  }
}
function scopedFilterFor(model, instituteId) {
  const paths = model?.schema?.paths || {};
  if (paths.instituteId) return { instituteId };
  if (paths.institute_id) return { institute_id: instituteId };
  if (paths.tenantId) return { tenantId: instituteId };
  if (paths.tenant_id) return { tenant_id: instituteId };
  return null;
}
function usableOperationalModel(name = "") {
  return !/(audit|snapshot|sync|history|event|plan|action|token|session|setting|template|webhook|readiness)/i.test(name);
}
async function countDiscoveredModels(instituteId, patterns) {
  if (!dbReady()) return { count: null, sourceModels: [], available: false };
  const names = mongoose.modelNames().filter((name) =>
    patterns.some((pattern) => pattern.test(name)) && usableOperationalModel(name)
  );
  let count = 0;
  const sourceModels = [];
  for (const name of names) {
    try {
      const model = mongoose.models[name];
      const filter = scopedFilterFor(model, instituteId);
      if (!filter) continue;
      const modelCount = await model.countDocuments(filter);
      count += Number(modelCount || 0);
      sourceModels.push({ name, count: Number(modelCount || 0) });
    } catch {
      // Ignore a model that cannot be counted safely.
    }
  }
  return {
    count,
    sourceModels,
    available: sourceModels.length > 0,
  };
}
async function operationalMetrics(instituteId) {
  const definitions = [
    ["students", [/student/i]],
    ["teachers", [/teacher/i]],
    ["attendance", [/attendance/i]],
    ["fees", [/fee/i, /invoice/i, /receipt/i]],
    ["leads", [/lead/i, /admission/i, /enquir/i]],
    ["branches", [/branch/i, /franchise/i]],
  ];
  const entries = await Promise.all(
    definitions.map(async ([key, patterns]) => [key, await countDiscoveredModels(instituteId, patterns)])
  );
  return Object.fromEntries(entries);
}
async function subscriptionSummary(owner) {
  try {
    const access = await resolvePart116Access({
      instituteId: owner.instituteId,
      role: owner.role,
      userId: owner.userId,
      persist: true,
    });
    return {
      available: true,
      basePlanCode: access.basePlanCode || "FREE",
      v3Active: Boolean(access.v3Active),
      entitlementCount: Array.isArray(access.roleEntitlements) ? access.roleEntitlements.length : 0,
      roleEntitlements: access.roleEntitlements || [],
      pendingAuthenticatedPlanCodes: access.pendingAuthenticatedPlanCodes || [],
      warnings: access.warnings || [],
    };
  } catch (error) {
    return {
      available: false,
      basePlanCode: "UNKNOWN",
      v3Active: false,
      entitlementCount: 0,
      roleEntitlements: [],
      pendingAuthenticatedPlanCodes: [],
      warnings: [error.code || "PART116_ACCESS_UNAVAILABLE"],
    };
  }
}
async function identitySummary(instituteId) {
  const Identity = mongoose.models.Part120UnifiedIdentity;
  if (!dbReady() || !Identity) {
    return {
      available: false,
      total: null,
      active: null,
      disabled: null,
      passwordChangeRequired: null,
      roleBreakdown: {},
    };
  }
  const accounts = await Identity.find({ instituteId })
    .select("role status mustChangePassword lockUntil")
    .lean();
  const roleBreakdown = {};
  for (const account of accounts) {
    roleBreakdown[account.role] = (roleBreakdown[account.role] || 0) + 1;
  }
  return {
    available: true,
    total: accounts.length,
    active: accounts.filter((account) => account.status === "active").length,
    disabled: accounts.filter((account) => account.status === "disabled").length,
    passwordChangeRequired: accounts.filter((account) => account.mustChangePassword).length,
    temporarilyLocked: accounts.filter((account) => account.lockUntil && new Date(account.lockUntil) > new Date()).length,
    roleBreakdown,
  };
}
async function billingSummary(instituteId) {
  const Sync = mongoose.models.Part115SubscriptionSyncState;
  const Action = mongoose.models.Part117SubscriptionAction;
  const Launch = mongoose.models.Part118ControlledLaunch;
  const result = {
    available: dbReady(),
    subscriptions: { total: null, statusBreakdown: {} },
    managerActions: { total: null, pending: null, accepted: null, failed: null },
    liveLaunch: { status: "not_configured", realMoneyFlag: String(process.env.NAXORA_RAZORPAY_LIVE_LAUNCHED || "").toLowerCase() === "true" },
  };
  if (!dbReady()) return result;

  if (Sync) {
    const states = await Sync.find({ instituteId }).select("currentStatus").lean();
    result.subscriptions.total = states.length;
    for (const state of states) {
      const key = cleanText(state.currentStatus || "unknown", 40).toLowerCase();
      result.subscriptions.statusBreakdown[key] = (result.subscriptions.statusBreakdown[key] || 0) + 1;
    }
  }
  if (Action) {
    const actions = await Action.find({ instituteId }).select("status").lean();
    result.managerActions.total = actions.length;
    result.managerActions.pending = actions.filter((action) => ["preview_ready", "executing"].includes(action.status)).length;
    result.managerActions.accepted = actions.filter((action) => action.status === "provider_accepted").length;
    result.managerActions.failed = actions.filter((action) => action.status === "provider_failed").length;
  }
  if (Launch) {
    const launch = await Launch.findOne({ instituteId }).sort({ createdAt: -1 }).select("status approvedAt rollbackApprovedAt").lean();
    if (launch) {
      result.liveLaunch = {
        ...result.liveLaunch,
        status: launch.status,
        approvedAt: launch.approvedAt || null,
        rollbackApprovedAt: launch.rollbackApprovedAt || null,
      };
    }
  }
  return result;
}
function dependencyHealth() {
  const names = new Set(mongoose.modelNames());
  return {
    databaseConnected: dbReady(),
    part116Access: names.has("Part116AccessSnapshot"),
    part120Identity: names.has("Part120UnifiedIdentity"),
    part115WebhookSync: names.has("Part115SubscriptionSyncState"),
    part117SubscriptionManager: names.has("Part117SubscriptionAction"),
    part118LiveReadiness: names.has("Part118ControlledLaunch"),
  };
}
function moduleDecision(module, subscription) {
  if (module.alwaysAvailable || module.billingControl) {
    return { allowed: true, reasonCode: "ACCESS_GRANTED" };
  }
  if (!module.featureKey) return { allowed: true, reasonCode: "ACCESS_GRANTED" };
  if (!subscription.available) {
    return {
      allowed: module.featureKey === "core.dashboard",
      reasonCode: "PART116_ACCESS_UNAVAILABLE",
    };
  }
  if (!subscription.roleEntitlements.includes(module.featureKey)) {
    return {
      allowed: false,
      reasonCode: module.v3 ? "ACTIVE_V3_SUBSCRIPTION_REQUIRED" : "PLAN_ENTITLEMENT_REQUIRED",
    };
  }
  return { allowed: true, reasonCode: "ACCESS_GRANTED" };
}
function publicModule(module, decision) {
  return {
    key: module.key,
    label: module.label,
    description: module.description,
    category: module.category,
    route: module.route,
    icon: module.icon,
    featureKey: module.featureKey || null,
    billingControl: Boolean(module.billingControl),
    v3: Boolean(module.v3),
    upcomingIntegration: Boolean(module.upcomingIntegration),
    allowed: decision.allowed,
    reasonCode: decision.reasonCode,
  };
}
async function moduleCatalogue(owner) {
  const subscription = await subscriptionSummary(owner);
  return {
    subscription,
    modules: OWNER_MODULES.map((module) => publicModule(module, moduleDecision(module, subscription))),
  };
}
async function ownerOverview(owner) {
  const [subscription, identities, metrics, billing] = await Promise.all([
    subscriptionSummary(owner),
    identitySummary(owner.instituteId),
    operationalMetrics(owner.instituteId),
    billingSummary(owner.instituteId),
  ]);
  const alerts = [];
  if (!dbReady()) alerts.push({ level: "critical", code: "DATABASE_DISCONNECTED", message: "MongoDB disconnected hai." });
  if (!subscription.available) alerts.push({ level: "warning", code: "ACCESS_ENGINE_UNAVAILABLE", message: "Part 116 entitlement summary unavailable hai." });
  if (subscription.pendingAuthenticatedPlanCodes.length) alerts.push({
    level: "warning",
    code: "SUBSCRIPTIONS_WAITING_FOR_ACTIVE",
    message: `${subscription.pendingAuthenticatedPlanCodes.length} Subscription authorisation active status ka wait kar rahi hai.`,
  });
  if (identities.disabled) alerts.push({
    level: "info",
    code: "DISABLED_ACCOUNTS",
    message: `${identities.disabled} unified accounts disabled hain.`,
  });
  if (identities.passwordChangeRequired) alerts.push({
    level: "info",
    code: "PASSWORD_CHANGE_REQUIRED",
    message: `${identities.passwordChangeRequired} users ko first-login password change karna hai.`,
  });
  if (billing.managerActions.failed) alerts.push({
    level: "warning",
    code: "FAILED_SUBSCRIPTION_ACTIONS",
    message: `${billing.managerActions.failed} Subscription Manager actions failed state me hain.`,
  });
  if (billing.liveLaunch.realMoneyFlag) alerts.push({
    level: "critical",
    code: "LIVE_PAYMENT_FLAG_ON",
    message: "Razorpay real-money launch flag ON hai. Settlement aur webhook monitoring check karein.",
  });

  return {
    owner,
    generatedAt: new Date().toISOString(),
    subscription,
    identities,
    metrics,
    billing,
    dependencyHealth: dependencyHealth(),
    alerts,
    metricPrecision: "Counts are generated only from institute-scoped operational models detected in the current MongoDB model registry.",
  };
}
async function recentActivity(instituteId) {
  if (!dbReady()) return [];
  const sources = [
    ["Part120AuthAudit", "authentication"],
    ["Part117SubscriptionManagerAudit", "subscription_manager"],
    ["Part118LiveLaunchAudit", "live_readiness"],
    ["Part121OwnerWorkspaceAudit", "owner_workspace"],
  ];
  const items = [];
  for (const [modelName, source] of sources) {
    const Model = mongoose.models[modelName];
    if (!Model) continue;
    try {
      const rows = await Model.find({ instituteId }).sort({ createdAt: -1 }).limit(20).lean();
      for (const row of rows) {
        items.push({
          id: String(row._id),
          source,
          action: cleanText(row.action || row.eventType || "activity", 100),
          result: cleanText(row.result || row.status || "", 60),
          reasonCode: cleanText(row.reasonCode || "", 100),
          createdAt: row.createdAt || null,
        });
      }
    } catch {
      // Keep other activity sources available.
    }
  }
  return items
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 30);
}
function findModule(command = "") {
  const text = cleanText(command, 500).toLowerCase();
  for (const [alias, key] of Object.entries(COMMAND_ALIASES)) {
    if (text.includes(alias)) return key;
  }
  return "";
}
function isOpenCommand(command = "") {
  return /(open|kholo|dikhao|show|launch|le chalo|screen|module)/i.test(command);
}
function safeSummary(overview) {
  return {
    basePlanCode: overview.subscription.basePlanCode,
    v3Active: overview.subscription.v3Active,
    accountTotal: overview.identities.total,
    activeAccounts: overview.identities.active,
    operationalMetrics: Object.fromEntries(
      Object.entries(overview.metrics).map(([key, value]) => [key, value.count])
    ),
    subscriptionStatusBreakdown: overview.billing.subscriptions.statusBreakdown,
    alertCount: overview.alerts.length,
  };
}

export async function getPart121OwnerOverview({ instituteId, userId = "owner", displayName = "Institute Owner" } = {}) {
  return ownerOverview({
    role: "institute_owner",
    instituteId: cleanId(instituteId),
    userId: cleanId(userId),
    displayName: cleanText(displayName, 120),
  });
}

export function registerPart121OwnerConsolidation({ app } = {}) {
  if (!app || typeof app.get !== "function" || typeof app.post !== "function") {
    throw new Error("Part 121 registration failed: Express app required.");
  }
  if (app.locals.part121OwnerConsolidationRegistered) return;
  app.locals.part121OwnerConsolidationRegistered = true;
  const models = defineModels();

  app.get(["/owner-workspace", "/owner-command-centre", "/part121"], (req, res) => {
    res.sendFile(path.join(frontendDir, "naxora-owner-workspace.html"));
  });
  app.get("/naxora-owner-workspace.css", (req, res) => {
    res.type("text/css").sendFile(path.join(frontendDir, "naxora-owner-workspace.css"));
  });
  app.get("/naxora-owner-workspace.js", (req, res) => {
    res.type("application/javascript").sendFile(path.join(frontendDir, "naxora-owner-workspace.js"));
  });

  app.get("/api/part121/status", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      name: PART_NAME,
      status: "owner_workspace_consolidation_active",
      ownerWorkspaceUrl: "/owner-workspace",
      integratedWithPart119Shell: true,
      commonLoginRequired: true,
      ownerOnly: true,
      part116EntitlementFiltering: true,
      operationalModelDiscovery: true,
      globalVaniOwnerNavigation: true,
      globalVaniMultiStepExecution: false,
      globalVaniMultiStepTargetPart: 125,
      oldOwnerRouteDeleted: false,
      nextPart: 122,
      nextPartName: "Teacher Module Consolidation",
    });
  });

  app.get("/api/part121/security-policy", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      ownerOnly: true,
      instituteIdMatchRequired: true,
      part120SessionCompatible: true,
      legacyOwnerSessionCompatible: true,
      moduleRoutesComeFromAllowlist: true,
      subscriptionAccessUsesPart116: true,
      crossInstituteCountsBlocked: true,
      unscopedModelsNotCounted: true,
      passwordsAndSecretsNeverReturned: true,
      vaniNavigationOnlyInPart121: true,
      sensitiveActionsRemainInOriginalSecuredModules: true,
    });
  });

  app.get("/api/part121/catalog", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      count: OWNER_MODULES.length,
      categories: [...new Set(OWNER_MODULES.map((module) => module.category))],
      modules: OWNER_MODULES.map((module) => ({
        key: module.key,
        label: module.label,
        description: module.description,
        category: module.category,
        icon: module.icon,
        featureKey: module.featureKey || null,
        billingControl: Boolean(module.billingControl),
        v3: Boolean(module.v3),
      })),
    });
  });

  app.get("/api/part121/overview", ownerOnly, async (req, res) => {
    try {
      const overview = await ownerOverview(req.part121Owner);
      res.json({ success: true, part: PART_NUMBER, overview });
    } catch (error) {
      res.status(500).json({
        success: false,
        part: PART_NUMBER,
        code: "OWNER_OVERVIEW_FAILED",
        message: error.message,
      });
    }
  });

  app.get("/api/part121/modules", ownerOnly, async (req, res) => {
    const catalogue = await moduleCatalogue(req.part121Owner);
    res.json({
      success: true,
      part: PART_NUMBER,
      subscription: catalogue.subscription,
      modules: catalogue.modules,
    });
  });

  app.get("/api/part121/activity", ownerOnly, async (req, res) => {
    const activity = await recentActivity(req.part121Owner.instituteId);
    res.json({
      success: true,
      part: PART_NUMBER,
      count: activity.length,
      activity,
    });
  });

  app.get("/api/part121/health", ownerOnly, async (req, res) => {
    const catalogue = await moduleCatalogue(req.part121Owner);
    const health = dependencyHealth();
    res.json({
      success: true,
      part: PART_NUMBER,
      health,
      availableModules: catalogue.modules.filter((module) => module.allowed).length,
      blockedModules: catalogue.modules.filter((module) => !module.allowed).length,
      blocked: catalogue.modules
        .filter((module) => !module.allowed)
        .map((module) => ({ key: module.key, label: module.label, reasonCode: module.reasonCode })),
    });
  });

  app.post("/api/part121/module/open", ownerOnly, async (req, res) => {
    const moduleKey = cleanText(req.body?.moduleKey || "", 100);
    const catalogue = await moduleCatalogue(req.part121Owner);
    const module = catalogue.modules.find((item) => item.key === moduleKey);
    if (!module) {
      await writeAudit(models, req, "open_module", "failed", moduleKey, { reasonCode: "UNKNOWN_MODULE" });
      return res.status(404).json({
        success: false,
        part: PART_NUMBER,
        code: "UNKNOWN_OWNER_MODULE",
        message: "Unknown Owner Workspace module.",
      });
    }
    if (!module.allowed) {
      await writeAudit(models, req, "open_module", "denied", moduleKey, { reasonCode: module.reasonCode });
      return res.status(402).json({
        success: false,
        part: PART_NUMBER,
        code: module.reasonCode,
        message: "Current NAXORA plan/V3 entitlement does not allow this module.",
        module,
      });
    }
    await writeAudit(models, req, "open_module", "success", moduleKey);
    res.json({
      success: true,
      part: PART_NUMBER,
      module,
      openInsideUnifiedShell: true,
      arbitraryUrlAccepted: false,
    });
  });

  app.post("/api/part121/vani/command", ownerOnly, async (req, res) => {
    const command = cleanText(req.body?.command || "", 500);
    if (!command) {
      return res.status(400).json({
        success: false,
        part: PART_NUMBER,
        code: "VANI_COMMAND_REQUIRED",
        message: "VANI command required.",
      });
    }
    if (/secret|api key|password|otp|cvv|upi pin|aadhaar|pan|bank statement/i.test(command)) {
      await writeAudit(models, req, "vani_command", "blocked", "", { reasonCode: "SENSITIVE_DATA_REQUEST" });
      return res.json({
        success: true,
        part: PART_NUMBER,
        replyText: "Password, OTP, payment secret aur KYC details VANI ko mat boliye. Private secured screen use karein.",
        spokenSafeSummary: "Sensitive owner details private rahengi.",
        actionExecuted: false,
        privateScreenFirst: true,
      });
    }

    try {
      const moduleKey = findModule(command);
      const catalogue = await moduleCatalogue(req.part121Owner);
      if (moduleKey && isOpenCommand(command)) {
        const module = catalogue.modules.find((item) => item.key === moduleKey);
        if (!module) {
          return res.json({
            success: true,
            part: PART_NUMBER,
            replyText: "Requested Owner module nahi mila.",
            spokenSafeSummary: "Module nahi mila.",
            actionExecuted: false,
          });
        }
        if (!module.allowed) {
          await writeAudit(models, req, "vani_open_module", "denied", moduleKey, { reasonCode: module.reasonCode });
          return res.json({
            success: true,
            part: PART_NUMBER,
            replyText: `${module.label} current plan ya V3 entitlement me available nahi hai.`,
            spokenSafeSummary: "Yeh module current subscription me available nahi hai.",
            actionExecuted: false,
            openModuleKey: null,
            reasonCode: module.reasonCode,
          });
        }
        await writeAudit(models, req, "vani_open_module", "success", moduleKey);
        return res.json({
          success: true,
          part: PART_NUMBER,
          replyText: `${module.label} unified app ke andar khol rahi hoon.`,
          spokenSafeSummary: `${module.label} khol rahi hoon.`,
          openModuleKey: module.key,
          actionExecuted: true,
          actionLevel: "safe_navigation",
        });
      }

      if (/overview|summary|status|aaj kya|institute kaisa|dashboard/i.test(command)) {
        const overview = await ownerOverview(req.part121Owner);
        await writeAudit(models, req, "vani_owner_summary", "success");
        return res.json({
          success: true,
          part: PART_NUMBER,
          replyText: `${overview.subscription.basePlanCode} base plan active view hai. ${overview.identities.active ?? 0} active unified accounts aur ${overview.alerts.length} owner alerts hain. Detailed metrics private screen par hain.`,
          spokenSafeSummary: `${overview.alerts.length} owner alerts hain.`,
          privateScreenDetails: safeSummary(overview),
          alerts: overview.alerts,
          actionExecuted: false,
        });
      }

      if (/pending|alerts|attention|problem|issue/i.test(command)) {
        const overview = await ownerOverview(req.part121Owner);
        return res.json({
          success: true,
          part: PART_NUMBER,
          replyText: overview.alerts.length
            ? `${overview.alerts.length} items aapki attention maang rahi hain. Details private screen par dikha rahi hoon.`
            : "Koi consolidated owner alert nahi mila.",
          spokenSafeSummary: overview.alerts.length
            ? `${overview.alerts.length} items attention maang rahi hain.`
            : "Koi owner alert nahi mila.",
          privateScreenDetails: overview.alerts,
          actionExecuted: false,
        });
      }

      return res.json({
        success: true,
        part: PART_NUMBER,
        replyText: "Main Owner Workspace summary dikha sakti hoon aur allowed owner modules open kar sakti hoon. Multi-step admission, fee, messaging aur business actions Part 125 me connect honge.",
        spokenSafeSummary: "Owner Workspace navigation ready hai.",
        allowedModuleCount: catalogue.modules.filter((module) => module.allowed).length,
        actionExecuted: false,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        part: PART_NUMBER,
        code: "OWNER_VANI_FAILED",
        message: error.message,
      });
    }
  });

  app.get("/api/part121/demo", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      name: PART_NAME,
      page: "/owner-workspace",
      flow: [
        "Part 120 verifies the common owner session",
        "Owner Workspace loads institute-scoped metrics",
        "Part 116 provides base-plan and V3 entitlements",
        "Part 120 provides role-account summary",
        "Parts 115–118 provide billing and launch summary",
        "Allowed modules open through Part 119 shell keys",
        "Global VANI provides owner summary and safe navigation",
      ],
      pending: {
        teacherWorkspace: 122,
        studentWorkspace: 123,
        parentStaffBranchWorkspaces: 124,
        multiStepVaniActions: 125,
        crossModuleE2E: 126,
        productionLaunch: 127,
      },
    });
  });
}
