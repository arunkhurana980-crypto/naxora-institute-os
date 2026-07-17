import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const PART_NUMBER = 116;
const PART_NAME = "Subscription Feature Access Control";
const OWNER_ROLES = new Set(["institute_owner", "owner", "instituteowner"]);
const PLAN_RANK = Object.freeze({ FREE: 0, STARTER: 1, PROFESSIONAL: 2, BUSINESS: 3 });
const ACTIVE_UNLOCK_STATUSES = new Set(["active"]);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, "../../frontend");

const FEATURES = Object.freeze({
  "core.dashboard": { label: "Dashboard", module: "Core", plan: "FREE", roles: ["*"], route: "/dashboard" },
  "profile.self": { label: "My Profile", module: "Core", plan: "FREE", roles: ["*"], route: "/profile" },
  "students.manage": { label: "Student Management", module: "Students", plan: "STARTER", roles: ["institute_owner", "branch_manager", "counsellor", "staff"], route: "/student" },
  "attendance.manage": { label: "Attendance Management", module: "Attendance", plan: "STARTER", roles: ["institute_owner", "branch_manager", "teacher", "staff"], route: "/attendance" },
  "fees.manage": { label: "Fees and Receipts", module: "Finance", plan: "STARTER", roles: ["institute_owner", "accountant", "branch_manager"], route: "/fees" },
  "reports.basic": { label: "Basic Reports", module: "Reports", plan: "STARTER", roles: ["institute_owner", "branch_manager", "teacher", "accountant"], route: "/reports" },
  "student.portal": { label: "Student Portal", module: "Student", plan: "STARTER", roles: ["institute_owner", "student"], route: "/student" },
  "parent.portal": { label: "Parent Portal", module: "Parent", plan: "STARTER", roles: ["institute_owner", "parent"], route: "/parent" },
  "vani.v2": { label: "VANI 2.0", module: "VANI", plan: "PROFESSIONAL", roles: ["institute_owner", "branch_manager", "teacher", "student", "parent", "counsellor", "accountant", "staff"], route: "/vani" },
  "live.classes": { label: "Live Classes", module: "Live Classes", plan: "PROFESSIONAL", roles: ["institute_owner", "teacher", "student"], route: "/live-classes" },
  "ai.student_support": { label: "Advanced Student Support", module: "AI", plan: "PROFESSIONAL", roles: ["institute_owner", "teacher", "branch_manager"], route: "/advanced-student-support" },
  "ai.class_notes": { label: "AI Class Notes", module: "AI", plan: "PROFESSIONAL", roles: ["institute_owner", "teacher", "student"], route: "/ai-class-notes" },
  "branches.command_centre": { label: "Multi-Branch Command Centre", module: "Branches", plan: "BUSINESS", roles: ["institute_owner", "branch_manager"], route: "/multi-branch-command-centre" },
  "franchise.manage": { label: "Franchise Management", module: "Franchise", plan: "BUSINESS", roles: ["institute_owner"], route: "/franchise-management" },
  "marketing.automation": { label: "Automated Marketing", module: "Marketing", plan: "BUSINESS", roles: ["institute_owner", "counsellor"], route: "/automated-marketing" },
  "marketplace.manage": { label: "Institute Marketplace", module: "Marketplace", plan: "BUSINESS", roles: ["institute_owner"], route: "/institute-marketplace" },
  "white_label.manage": { label: "White-Label Controls", module: "White Label", plan: "BUSINESS", roles: ["institute_owner"], route: "/white-label-system" },
  "owner_ai.command_centre": { label: "AI Owner Command Centre", module: "NAXORA OS 3.0", plan: "FREE", v3: true, roles: ["institute_owner"], route: "/owner-ai-command-centre" },
  "vani.v3": { label: "Human-like VANI 3.0", module: "NAXORA OS 3.0", plan: "FREE", v3: true, roles: ["institute_owner"], route: "/vani-v3" },
  "ai.business_growth": { label: "AI Business Growth Engine", module: "NAXORA OS 3.0", plan: "FREE", v3: true, roles: ["institute_owner"], route: "/ai-business-growth" },
  "ai.advanced_automation": { label: "Advanced AI Automation", module: "NAXORA OS 3.0", plan: "FREE", v3: true, roles: ["institute_owner"], route: "/ai-automation" }
});

const COMMAND_ALIASES = Object.freeze({
  dashboard: "core.dashboard",
  profile: "profile.self",
  student: "students.manage",
  attendance: "attendance.manage",
  fees: "fees.manage",
  report: "reports.basic",
  vani: "vani.v2",
  "live class": "live.classes",
  branch: "branches.command_centre",
  franchise: "franchise.manage",
  marketing: "marketing.automation",
  marketplace: "marketplace.manage",
  "white label": "white_label.manage",
  "owner ai": "owner_ai.command_centre",
  "vani 3": "vani.v3",
  "business growth": "ai.business_growth",
  automation: "ai.advanced_automation"
});

function normalizeRole(value = "") {
  const role = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return ({ owner: "institute_owner", instituteowner: "institute_owner", branchmanager: "branch_manager" })[role] || role;
}
function cleanId(value = "") {
  return String(value || "").trim().replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 180);
}
function cleanText(value = "", max = 255) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
function dbReady() {
  return mongoose.connection?.readyState === 1;
}
function bearer(req) {
  const auth = String(req.headers.authorization || "").trim();
  return auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
}
function jwtSecrets() {
  return [process.env.JWT_SECRET, process.env.JWT_ACCESS_SECRET, process.env.ACCESS_TOKEN_SECRET, process.env.NAXORA_JWT_SECRET]
    .map((v) => String(v || "").trim()).filter(Boolean);
}
function verifyToken(token) {
  const secrets = jwtSecrets();
  if (!secrets.length) {
    const e = new Error("JWT server configuration missing.");
    e.code = "AUTH_CONFIGURATION_MISSING"; e.httpStatus = 503; throw e;
  }
  for (const secret of secrets) {
    try { return jwt.verify(token, secret, { algorithms: ["HS256", "HS384", "HS512"] }); } catch {}
  }
  const e = new Error("Login session invalid or expired.");
  e.code = "INVALID_SESSION"; e.httpStatus = 401; throw e;
}
function userContext(req) {
  let payload = req.user || req.auth || null;
  if (!payload && bearer(req)) payload = verifyToken(bearer(req));
  if (!payload) {
    const e = new Error("Login required."); e.code = "LOGIN_REQUIRED"; e.httpStatus = 401; throw e;
  }
  const role = normalizeRole(payload.role || payload.userRole || payload.accountRole || payload.user?.role || "");
  if (!role) {
    const e = new Error("Valid user role required."); e.code = "ROLE_REQUIRED"; e.httpStatus = 400; throw e;
  }
  const requested = cleanId(req.headers["x-naxora-institute-id"] || req.body?.instituteId || req.query?.instituteId || "");
  const tokenInstitute = cleanId(payload.instituteId || payload.institute_id || payload.user?.instituteId || payload.tenantId || "");
  if (tokenInstitute && requested && tokenInstitute !== requested) {
    const e = new Error("Institute context does not match login session.");
    e.code = "INSTITUTE_CONTEXT_MISMATCH"; e.httpStatus = 403; throw e;
  }
  const instituteId = tokenInstitute || requested;
  if (!instituteId) {
    const e = new Error("Valid instituteId required."); e.code = "INSTITUTE_ID_REQUIRED"; e.httpStatus = 400; throw e;
  }
  return {
    role,
    instituteId,
    userId: cleanId(payload.userId || payload.id || payload._id || payload.sub || payload.user?.id || "user")
  };
}
function authenticated(req, res, next) {
  try { req.part116User = userContext(req); next(); }
  catch (e) { res.status(e.httpStatus || 401).json({ success: false, part: PART_NUMBER, code: e.code || "AUTH_FAILED", message: e.message }); }
}
function ownerOnly(req, res, next) {
  try {
    const context = userContext(req);
    if (!OWNER_ROLES.has(context.role)) {
      const e = new Error("Only institute_owner can view institute-wide subscription controls.");
      e.code = "OWNER_ONLY"; e.httpStatus = 403; throw e;
    }
    req.part116User = { ...context, role: "institute_owner" };
    next();
  } catch (e) {
    res.status(e.httpStatus || 401).json({ success: false, part: PART_NUMBER, code: e.code || "OWNER_AUTH_FAILED", message: e.message, privateScreenFirst: true });
  }
}

function defineModels() {
  const snapshotSchema = new mongoose.Schema({
    instituteId: { type: String, required: true, unique: true, index: true },
    basePlanCode: { type: String, default: "FREE" },
    v3Active: { type: Boolean, default: false },
    activeSubscriptionIds: { type: [String], default: [] },
    activePlanCodes: { type: [String], default: [] },
    pendingAuthenticatedPlanCodes: { type: [String], default: [] },
    entitlements: { type: [String], default: [] },
    source: { type: String, default: "part115_verified_sync" },
    calculatedAt: { type: Date, default: Date.now },
    warningCodes: { type: [String], default: [] },
    commercialLiveMode: { type: Boolean, default: false }
  }, { timestamps: true, strict: true });

  const auditSchema = new mongoose.Schema({
    instituteId: { type: String, required: true, index: true },
    actorUserId: { type: String, default: "system" },
    actorRole: { type: String, default: "" },
    action: { type: String, required: true },
    featureKey: { type: String, default: "" },
    result: { type: String, required: true },
    reasonCode: { type: String, default: "" },
    requestId: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} }
  }, { timestamps: true, strict: true });

  return {
    Snapshot: mongoose.models.Part116AccessSnapshot || mongoose.model("Part116AccessSnapshot", snapshotSchema),
    Audit: mongoose.models.Part116AccessAudit || mongoose.model("Part116AccessAudit", auditSchema)
  };
}
function deps() {
  return {
    Plan: mongoose.models.Part113NaxoraSubscriptionPlan || null,
    Checkout: mongoose.models.Part114CheckoutSubscription || null,
    Sync: mongoose.models.Part115SubscriptionSyncState || null
  };
}
function reqId(req) {
  return crypto.createHash("sha256").update(`${Date.now()}:${req.ip || ""}:${crypto.randomUUID()}`).digest("hex").slice(0, 20);
}
async function audit(models, req, action, result, reasonCode = "", details = {}, featureKey = "") {
  if (!dbReady()) return { saved: false };
  try {
    await models.Audit.create({
      instituteId: req.part116User?.instituteId || details.instituteId || "unknown",
      actorUserId: req.part116User?.userId || "system",
      actorRole: req.part116User?.role || "system",
      action, featureKey, result, reasonCode, requestId: reqId(req), details
    });
    return { saved: true };
  } catch { return { saved: false }; }
}
function planCode(plan) {
  return cleanText(plan?.planCode || plan?.templateCode || "UNKNOWN", 50).toUpperCase();
}
function highestBase(codes) {
  return codes.filter((code) => Object.hasOwn(PLAN_RANK, code))
    .sort((a, b) => PLAN_RANK[b] - PLAN_RANK[a])[0] || "FREE";
}
function baseEntitlements(basePlanCode) {
  const rank = PLAN_RANK[basePlanCode] ?? 0;
  return Object.entries(FEATURES)
    .filter(([, feature]) => !feature.v3 && (PLAN_RANK[feature.plan] ?? 0) <= rank)
    .map(([key]) => key);
}
function v3Entitlements() {
  return Object.entries(FEATURES).filter(([, feature]) => feature.v3).map(([key]) => key);
}
function roleAllowed(feature, role) {
  return feature.roles.includes("*") || feature.roles.includes(role);
}

async function evidenceFor(instituteId, models, persist = true) {
  if (!dbReady()) {
    const e = new Error("MongoDB connection required for subscription access control.");
    e.code = "DATABASE_REQUIRED"; e.httpStatus = 503; throw e;
  }
  const { Plan, Checkout, Sync } = deps();
  if (!Plan || !Checkout || !Sync) {
    const e = new Error("Part 113, 114 or 115 subscription models are not active.");
    e.code = "SUBSCRIPTION_DEPENDENCY_MISSING"; e.httpStatus = 503; throw e;
  }

  const syncStates = await Sync.find({ instituteId }).sort({ lastProcessedAt: -1 }).lean();
  const localIds = syncStates.map((x) => x.localSubscriptionId).filter(Boolean);
  const checkouts = localIds.length ? await Checkout.find({ _id: { $in: localIds }, instituteId }).lean() : [];
  const checkoutMap = new Map(checkouts.map((x) => [String(x._id), x]));
  const planIds = checkouts.map((x) => x.localPlanId).filter(Boolean);
  const plans = planIds.length ? await Plan.find({ _id: { $in: planIds }, instituteId }).lean() : [];
  const planMap = new Map(plans.map((x) => [String(x._id), x]));

  const rows = syncStates.map((sync) => {
    const checkout = checkoutMap.get(String(sync.localSubscriptionId)) || null;
    const plan = checkout ? planMap.get(String(checkout.localPlanId)) || null : null;
    return {
      sync, checkout, plan,
      code: planCode(plan),
      matched: Boolean(checkout && plan),
      active: ACTIVE_UNLOCK_STATUSES.has(String(sync.currentStatus || "").toLowerCase()),
      authenticated: String(sync.currentStatus || "").toLowerCase() === "authenticated"
    };
  });

  const active = rows.filter((x) => x.matched && x.active);
  const activePlanCodes = [...new Set(active.map((x) => x.code))];
  const basePlanCode = highestBase(activePlanCodes);
  const v3Active = activePlanCodes.includes("V3_AI");
  const pendingAuthenticatedPlanCodes = [...new Set(rows.filter((x) => x.matched && x.authenticated).map((x) => x.code))];
  const entitlements = [...new Set([...baseEntitlements(basePlanCode), ...(v3Active ? v3Entitlements() : [])])].sort();
  const warnings = [];
  if (!active.length) warnings.push("NO_ACTIVE_SUBSCRIPTION");
  if (pendingAuthenticatedPlanCodes.length) warnings.push("AUTHENTICATED_WAITING_FOR_ACTIVE");
  if (rows.some((x) => !x.matched)) warnings.push("UNMATCHED_SUBSCRIPTION_EVIDENCE");
  const testMode = String(process.env.RAZORPAY_MODE || "test").toLowerCase() !== "live";
  if (testMode) warnings.push("TEST_MODE_ONLY");

  if (persist) {
    await models.Snapshot.findOneAndUpdate(
      { instituteId },
      { $set: {
        basePlanCode, v3Active,
        activeSubscriptionIds: active.map((x) => String(x.sync.razorpaySubscriptionId || "")),
        activePlanCodes, pendingAuthenticatedPlanCodes, entitlements,
        source: "part115_verified_sync", calculatedAt: new Date(),
        warningCodes: warnings, commercialLiveMode: !testMode
      }, $setOnInsert: { instituteId } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const activeIds = active.map((x) => x.sync._id);
    await Sync.updateMany({ instituteId, _id: { $in: activeIds } }, { $set: { accessUnlockApplied: true } });
    await Sync.updateMany({ instituteId, _id: { $nin: activeIds } }, { $set: { accessUnlockApplied: false } });
  }

  return {
    instituteId, basePlanCode, v3Active, activePlanCodes, pendingAuthenticatedPlanCodes,
    entitlements, warnings, source: "part115_verified_sync", testModeOnly: testMode,
    commercialLiveAccessEnabled: !testMode,
    activeSubscriptions: active.map((x) => ({
      localSubscriptionId: String(x.checkout._id),
      razorpaySubscriptionId: x.sync.razorpaySubscriptionId,
      planCode: x.code,
      planName: x.plan?.name || x.code,
      status: x.sync.currentStatus,
      lastEventType: x.sync.lastEventType,
      lastProcessedAt: x.sync.lastProcessedAt,
      currentStart: x.sync.currentStart,
      currentEnd: x.sync.currentEnd,
      accessUnlockApplied: true
    }))
  };
}

function decisionFor(featureKey, role, evidence) {
  const feature = FEATURES[featureKey];
  if (!feature) return { exists: false, allowed: false, featureKey, role, reasonCode: "UNKNOWN_FEATURE", message: "Unknown NAXORA feature key.", httpStatus: 404 };
  if (!roleAllowed(feature, role)) return { exists: true, allowed: false, featureKey, feature, role, reasonCode: "ROLE_NOT_ALLOWED", message: "Aapke role ko is feature ki permission nahi hai.", httpStatus: 403 };
  if (feature.v3) {
    if (role !== "institute_owner") return { exists: true, allowed: false, featureKey, feature, role, reasonCode: "V3_OWNER_ONLY", message: "NAXORA OS 3.0 owner controls sirf institute_owner ke liye hain.", httpStatus: 403 };
    if (!evidence.v3Active) return { exists: true, allowed: false, featureKey, feature, role, reasonCode: "ACTIVE_V3_SUBSCRIPTION_REQUIRED", message: "Is feature ke liye active separate V3_AI subscription required hai.", httpStatus: 402 };
  }
  const requiredRank = PLAN_RANK[feature.plan] ?? 0;
  const currentRank = PLAN_RANK[evidence.basePlanCode] ?? 0;
  if (!feature.v3 && currentRank < requiredRank) {
    return {
      exists: true, allowed: false, featureKey, feature, role,
      reasonCode: evidence.basePlanCode === "FREE" ? "ACTIVE_SUBSCRIPTION_REQUIRED" : "PLAN_UPGRADE_REQUIRED",
      message: evidence.basePlanCode === "FREE"
        ? `Is feature ke liye active ${feature.plan} ya higher subscription required hai.`
        : `Current ${evidence.basePlanCode} plan me yeh feature included nahi hai. ${feature.plan} ya higher plan required hai.`,
      httpStatus: 402
    };
  }
  return { exists: true, allowed: true, featureKey, feature, role, reasonCode: "ACCESS_GRANTED", message: "Subscription and role access granted.", httpStatus: 200 };
}

async function accessFor(context, models, persist = true) {
  const evidence = await evidenceFor(context.instituteId, models, persist);
  const roleEntitlements = evidence.entitlements.filter((key) => roleAllowed(FEATURES[key], context.role));
  return {
    ...evidence, role: context.role, userId: context.userId, roleEntitlements,
    roleNavigation: roleEntitlements.map((key) => ({
      featureKey: key, label: FEATURES[key].label, module: FEATURES[key].module,
      routeHint: FEATURES[key].route, requiresV3: Boolean(FEATURES[key].v3)
    }))
  };
}

export async function resolvePart116Access({ instituteId, role, userId = "system", persist = true } = {}) {
  const context = { instituteId: cleanId(instituteId), role: normalizeRole(role), userId: cleanId(userId) };
  if (!context.instituteId || !context.role) {
    const e = new Error("instituteId and role are required.");
    e.code = "ACCESS_CONTEXT_REQUIRED"; e.httpStatus = 400; throw e;
  }
  return accessFor(context, defineModels(), persist);
}

export function createPart116FeatureGate(featureKey) {
  const key = cleanText(featureKey, 100);
  return async function part116FeatureGate(req, res, next) {
    try {
      const models = defineModels();
      const context = userContext(req);
      req.part116User = context;
      const evidence = await evidenceFor(context.instituteId, models, true);
      const decision = decisionFor(key, context.role, evidence);
      await audit(models, req, "feature_gate", decision.allowed ? "allowed" : "denied", decision.reasonCode, { basePlanCode: evidence.basePlanCode, v3Active: evidence.v3Active }, key);
      if (!decision.allowed) return res.status(decision.httpStatus || 403).json({ success: false, part: PART_NUMBER, code: decision.reasonCode, message: decision.message, featureKey: key });
      req.part116Access = { evidence, decision };
      next();
    } catch (e) {
      res.status(e.httpStatus || 500).json({ success: false, part: PART_NUMBER, code: e.code || "FEATURE_GATE_FAILED", message: e.message });
    }
  };
}

function commandFeature(text) {
  const lower = String(text || "").toLowerCase();
  for (const [alias, key] of Object.entries(COMMAND_ALIASES)) if (lower.includes(alias)) return key;
  for (const key of Object.keys(FEATURES)) if (lower.includes(key.toLowerCase())) return key;
  return "";
}

export function registerPart116SubscriptionAccess({ app } = {}) {
  if (!app || typeof app.get !== "function" || typeof app.post !== "function") throw new Error("Part 116 registration failed: Express app required.");
  if (app.locals.part116SubscriptionAccessRegistered) return;
  app.locals.part116SubscriptionAccessRegistered = true;
  const models = defineModels();

  app.get(["/subscription-access-control", "/feature-access-control", "/part116"], (req, res) => res.sendFile(path.join(frontendDir, "subscription-access-control.html")));
  app.get("/subscription-access-control.css", (req, res) => res.type("text/css").sendFile(path.join(frontendDir, "subscription-access-control.css")));
  app.get("/subscription-access-control.js", (req, res) => res.type("application/javascript").sendFile(path.join(frontendDir, "subscription-access-control.js")));
  app.get("/naxora-subscription-access-client.js", (req, res) => res.type("application/javascript").sendFile(path.join(frontendDir, "naxora-subscription-access-client.js")));

  app.get("/api/part116/status", (req, res) => {
    const d = deps();
    res.json({
      success: true, part: PART_NUMBER, name: PART_NAME, status: "verified_subscription_access_engine_active",
      databaseConnected: dbReady(), part113DependencyReady: Boolean(d.Plan), part114DependencyReady: Boolean(d.Checkout), part115DependencyReady: Boolean(d.Sync),
      activeStatusRequiredForUnlock: true, authenticatedStatusUnlocksFeatures: false,
      basePlansSupported: ["STARTER", "PROFESSIONAL", "BUSINESS"], separateV3SubscriptionSupported: true, v3OwnerOnly: true,
      backendGateAvailable: true, frontendAccessClientAvailable: true,
      testModeAccessEvaluationEnabled: true,
      commercialLiveAccessEnabled: String(process.env.RAZORPAY_MODE || "test").toLowerCase() === "live",
      nextPart: 117, nextPartName: "VANI Subscription Manager"
    });
  });

  app.get("/api/part116/catalog", (req, res) => res.json({
    success: true, part: PART_NUMBER, basePlanRank: PLAN_RANK,
    activeUnlockStatuses: Array.from(ACTIVE_UNLOCK_STATUSES),
    note: "Authenticated means customer authorisation completed, but paid features unlock only when provider status becomes active.",
    features: Object.entries(FEATURES).map(([featureKey, feature]) => ({ featureKey, ...feature, requiresV3: Boolean(feature.v3) }))
  }));

  app.get("/api/part116/security-policy", (req, res) => res.json({
    success: true, part: PART_NUMBER, jwtRequiredForPrivateAccess: true, instituteIdMatchRequired: true,
    backendEnforcementRequired: true, frontendButtonHidingIsNotSecurity: true, verifiedPart115StatusIsAuthority: true,
    onlyActiveStatusUnlocksPaidFeatures: true, authenticatedDoesNotUnlockPaidFeatures: true,
    pendingHaltedCancelledCompletedDoNotUnlock: true, v3SeparateSubscriptionRequired: true, v3OwnerOnly: true,
    teacherStudentParentCannotUseOwnerV3Controls: true, noManualSubscriptionOverrideInPart116: true, accessDecisionAudited: true,
    testModeOnlyUntilPart118: String(process.env.RAZORPAY_MODE || "test").toLowerCase() !== "live"
  }));

  app.get("/api/part116/access/me", authenticated, async (req, res) => {
    try { res.json({ success: true, part: PART_NUMBER, access: await accessFor(req.part116User, models, true), providerSecretsReturned: false }); }
    catch (e) { res.status(e.httpStatus || 500).json({ success: false, part: PART_NUMBER, code: e.code || "ACCESS_RESOLUTION_FAILED", message: e.message }); }
  });

  app.get("/api/part116/navigation", authenticated, async (req, res) => {
    try {
      const access = await accessFor(req.part116User, models, true);
      res.json({ success: true, part: PART_NUMBER, role: access.role, basePlanCode: access.basePlanCode, v3Active: access.v3Active, navigation: access.roleNavigation, deniedFeaturesAreNotReturned: true });
    } catch (e) { res.status(e.httpStatus || 500).json({ success: false, part: PART_NUMBER, code: e.code || "NAVIGATION_RESOLUTION_FAILED", message: e.message }); }
  });

  app.post("/api/part116/access/check", authenticated, async (req, res) => {
    try {
      const key = cleanText(req.body?.featureKey || "", 100);
      const evidence = await evidenceFor(req.part116User.instituteId, models, true);
      const decision = decisionFor(key, req.part116User.role, evidence);
      await audit(models, req, "feature_check", decision.allowed ? "allowed" : "denied", decision.reasonCode, { basePlanCode: evidence.basePlanCode, v3Active: evidence.v3Active }, key);
      res.status(decision.allowed ? 200 : decision.httpStatus || 403).json({
        success: decision.allowed, part: PART_NUMBER, decision,
        subscription: { basePlanCode: evidence.basePlanCode, v3Active: evidence.v3Active, pendingAuthenticatedPlanCodes: evidence.pendingAuthenticatedPlanCodes, source: evidence.source }
      });
    } catch (e) { res.status(e.httpStatus || 500).json({ success: false, part: PART_NUMBER, code: e.code || "FEATURE_CHECK_FAILED", message: e.message }); }
  });

  app.get("/api/part116/gated/:featureKey", authenticated, async (req, res) => {
    try {
      const key = cleanText(req.params.featureKey || "", 100);
      const evidence = await evidenceFor(req.part116User.instituteId, models, true);
      const decision = decisionFor(key, req.part116User.role, evidence);
      await audit(models, req, "gated_demo_route", decision.allowed ? "allowed" : "denied", decision.reasonCode, { basePlanCode: evidence.basePlanCode, v3Active: evidence.v3Active }, key);
      if (!decision.allowed) return res.status(decision.httpStatus || 403).json({ success: false, part: PART_NUMBER, code: decision.reasonCode, message: decision.message, featureKey: key });
      res.json({ success: true, part: PART_NUMBER, featureKey: key, message: "Backend feature gate passed.", role: req.part116User.role, basePlanCode: evidence.basePlanCode, v3Active: evidence.v3Active });
    } catch (e) { res.status(e.httpStatus || 500).json({ success: false, part: PART_NUMBER, code: e.code || "GATED_ROUTE_FAILED", message: e.message }); }
  });

  app.get("/api/part116/institute-access", ownerOnly, async (req, res) => {
    try {
      const access = await accessFor(req.part116User, models, true);
      const snapshot = await models.Snapshot.findOne({ instituteId: req.part116User.instituteId }).lean();
      res.json({ success: true, part: PART_NUMBER, instituteId: req.part116User.instituteId, access, snapshot });
    } catch (e) { res.status(e.httpStatus || 500).json({ success: false, part: PART_NUMBER, code: e.code || "INSTITUTE_ACCESS_FAILED", message: e.message }); }
  });

  app.post("/api/part116/recalculate", ownerOnly, async (req, res) => {
    try {
      const access = await accessFor(req.part116User, models, true);
      await audit(models, req, "subscription_access_recalculate", "success", "RECALCULATED_FROM_PART115", { basePlanCode: access.basePlanCode, v3Active: access.v3Active, activePlanCodes: access.activePlanCodes });
      res.json({ success: true, part: PART_NUMBER, message: "Subscription access recalculated from verified Part 115 sync states.", access, externalPaymentActionExecuted: false });
    } catch (e) { res.status(e.httpStatus || 500).json({ success: false, part: PART_NUMBER, code: e.code || "RECALCULATE_FAILED", message: e.message }); }
  });

  app.post("/api/part116/vani/command", authenticated, async (req, res) => {
    const command = cleanText(req.body?.command || "", 500);
    if (!command) return res.status(400).json({ success: false, part: PART_NUMBER, message: "VANI command required." });
    const lower = command.toLowerCase();
    if (/secret|api key|key secret|webhook secret|password|otp|cvv|upi pin/.test(lower)) {
      await audit(models, req, "vani_sensitive_access_request", "blocked", "SENSITIVE_DATA_REQUEST");
      return res.json({ success: true, part: PART_NUMBER, replyText: "Payment secrets, OTP, CVV aur UPI PIN VANI ko mat boliye. Access verified provider status se check hoga.", spokenSafeSummary: "Sensitive payment details private rahengi.", actionExecuted: false, privateScreenFirst: true });
    }
    try {
      const access = await accessFor(req.part116User, models, true);
      const key = commandFeature(lower);
      if (key) {
        const decision = decisionFor(key, req.part116User.role, access);
        await audit(models, req, "vani_feature_access_check", decision.allowed ? "allowed" : "denied", decision.reasonCode, { basePlanCode: access.basePlanCode, v3Active: access.v3Active }, key);
        return res.json({
          success: true, part: PART_NUMBER,
          replyText: decision.allowed ? `${FEATURES[key].label} aapke role aur active subscription me available hai.` : decision.message,
          spokenSafeSummary: decision.allowed ? "Yeh feature aapke liye available hai." : "Yeh feature abhi available nahi hai.",
          decision, privateScreenDetails: { basePlanCode: access.basePlanCode, v3Active: access.v3Active, pendingAuthenticatedPlanCodes: access.pendingAuthenticatedPlanCodes },
          actionExecuted: false
        });
      }
      if (/upgrade|higher plan|unlock|plan change/.test(lower)) {
        return res.json({
          success: true, part: PART_NUMBER,
          replyText: "Plan change ya upgrade Part 117 me preview, confirmation aur owner verification ke saath hoga.",
          spokenSafeSummary: "Plan upgrade Part 117 me secure confirmation ke saath hoga.",
          currentAccess: { basePlanCode: access.basePlanCode, v3Active: access.v3Active }, actionExecuted: false
        });
      }
      res.json({
        success: true, part: PART_NUMBER,
        replyText: `Current base access ${access.basePlanCode} hai. V3 owner access ${access.v3Active ? "active" : "inactive"} hai. Aapke role ko ${access.roleEntitlements.length} feature entitlements mil rahe hain.`,
        spokenSafeSummary: `Aapke role ko ${access.roleEntitlements.length} features available hain.`,
        privateScreenDetails: access, actionExecuted: false
      });
    } catch (e) { res.status(e.httpStatus || 500).json({ success: false, part: PART_NUMBER, code: e.code || "VANI_ACCESS_FAILED", message: e.message }); }
  });

  app.get("/api/part116/demo", (req, res) => res.json({
    success: true, part: PART_NUMBER, name: PART_NAME, page: "/subscription-access-control",
    testFlow: ["Use active Part 115 synced subscription evidence", "Resolve highest active base plan", "Resolve separate active V3_AI", "Filter by logged-in role", "Enforce backend gate", "Generate role-safe navigation"],
    examples: ["GET /api/part116/gated/fees.manage", "POST /api/part116/access/check", "VANI, marketplace access check karo", "VANI, owner AI access check karo"],
    safety: { authenticatedDoesNotUnlock: true, activeStatusRequired: true, v3OwnerOnly: true, frontendHidingIsNotSecurity: true, backendGateAvailable: true, liveCommercialMode: false }
  }));
}
