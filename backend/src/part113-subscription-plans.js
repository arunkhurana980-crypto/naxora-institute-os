import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import Razorpay from "razorpay";

const PART_NUMBER = 113;
const PART_NAME = "NAXORA Subscription Plans";
const OWNER_ROLES = new Set(["institute_owner", "owner", "instituteowner"]);
const ALLOWED_PERIODS = new Set(["monthly", "yearly"]);
const MAX_AMOUNT_PAISE = 4294967295;
const MIN_AMOUNT_PAISE = 100;
const CREATE_WINDOW_MS = 10 * 60 * 1000;
const CREATE_LIMIT = 5;
const createAttempts = new Map();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, "../../frontend");

const PLAN_TEMPLATES = [
  {
    code: "STARTER",
    name: "NAXORA Starter",
    description: "Core institute operations for a growing coaching institute.",
    features: ["Student records", "Attendance", "Basic fees", "Basic reports"],
    ownerOnlyV3: false,
  },
  {
    code: "PROFESSIONAL",
    name: "NAXORA Professional",
    description: "Advanced institute operations with VANI 2.0 workflows.",
    features: ["Advanced operations", "VANI 2.0", "Live classes", "AI support tools"],
    ownerOnlyV3: false,
  },
  {
    code: "BUSINESS",
    name: "NAXORA Business",
    description: "Multi-branch, franchise, marketing and marketplace operations.",
    features: ["Multi-branch", "Franchise", "Marketing", "Marketplace", "White-label controls"],
    ownerOnlyV3: false,
  },
  {
    code: "V3_AI",
    name: "NAXORA OS 3.0 AI",
    description: "Owner-only AI-first command centre subscription foundation.",
    features: ["Owner AI controls", "AI strategy", "Business growth AI", "VANI 3.0 access gate"],
    ownerOnlyV3: true,
  },
];

function normalizeRole(value = "") {
  return String(value).trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function cleanId(value = "") {
  return String(value).trim().replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 120);
}

function cleanText(value = "", max = 255) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function cleanPlanCode(value = "") {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "").slice(0, 50);
}

function isDatabaseReady() {
  return mongoose.connection?.readyState === 1;
}

function getJwtSecrets() {
  return [
    process.env.JWT_SECRET,
    process.env.JWT_ACCESS_SECRET,
    process.env.ACCESS_TOKEN_SECRET,
    process.env.NAXORA_JWT_SECRET,
  ].map((value) => String(value || "").trim()).filter(Boolean);
}

function getBearerToken(req) {
  const auth = String(req.headers.authorization || "").trim();
  return auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
}

function verifyJwtToken(token) {
  const secrets = getJwtSecrets();
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
      // Continue to the next configured existing JWT secret.
    }
  }
  const error = new Error("Login session invalid or expired.");
  error.code = "INVALID_SESSION";
  error.httpStatus = 401;
  throw error;
}

function buildOwnerContext(req) {
  const token = getBearerToken(req);
  let payload = req.user || req.auth || null;
  if (!payload && token) payload = verifyJwtToken(token);
  if (!payload) {
    const error = new Error("Owner login required.");
    error.code = "OWNER_LOGIN_REQUIRED";
    error.httpStatus = 401;
    throw error;
  }

  const role = normalizeRole(payload.role || payload.userRole || payload.accountRole || payload.user?.role || "");
  if (!OWNER_ROLES.has(role)) {
    const error = new Error("Only institute_owner can manage NAXORA subscription plans.");
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
    const error = new Error("Institute context does not match the login session.");
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
    userId: cleanId(payload.userId || payload.id || payload._id || payload.sub || payload.user?.id || "owner"),
  };
}

function ownerOnly(req, res, next) {
  try {
    req.part113Owner = buildOwnerContext(req);
    next();
  } catch (error) {
    res.status(error.httpStatus || 401).json({
      success: false,
      part: PART_NUMBER,
      code: error.code || "OWNER_AUTH_FAILED",
      message: error.message,
      privateScreenFirst: true,
    });
  }
}

function getRazorpayState() {
  const mode = String(process.env.RAZORPAY_MODE || "test").trim().toLowerCase();
  const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
  const missing = [];
  if (!keyId) missing.push("RAZORPAY_KEY_ID");
  if (!keySecret) missing.push("RAZORPAY_KEY_SECRET");
  return {
    mode,
    testModeLocked: mode === "test",
    liveModeBlocked: mode !== "test",
    keyIdConfigured: Boolean(keyId),
    keySecretConfigured: Boolean(keySecret),
    testKeyLooksCorrect: !keyId || keyId.startsWith("rzp_test_"),
    missing,
    ready: Boolean(mode === "test" && keyId && keySecret && keyId.startsWith("rzp_test_")),
  };
}

function requireTestProviderReady() {
  const state = getRazorpayState();
  if (state.liveModeBlocked) {
    const error = new Error("Part 113 me Razorpay Live Mode locked hai. RAZORPAY_MODE=test rakhein.");
    error.code = "LIVE_MODE_LOCKED";
    error.httpStatus = 423;
    throw error;
  }
  if (!state.ready) {
    const error = new Error(`Razorpay Test credentials pending: ${state.missing.join(", ") || "Test Key ID format"}`);
    error.code = "TEST_PROVIDER_NOT_READY";
    error.httpStatus = 412;
    throw error;
  }
  return state;
}

function getRazorpayClient() {
  requireTestProviderReady();
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

function amountToPaise(value) {
  const text = String(value ?? "").trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) {
    const error = new Error("Amount valid rupees value hona chahiye, maximum 2 decimal places ke saath.");
    error.code = "INVALID_AMOUNT";
    error.httpStatus = 400;
    throw error;
  }
  const paise = Math.round(Number(text) * 100);
  if (!Number.isSafeInteger(paise) || paise < MIN_AMOUNT_PAISE || paise > MAX_AMOUNT_PAISE) {
    const error = new Error("Plan amount ₹1 se provider maximum range ke andar hona chahiye.");
    error.code = "AMOUNT_OUT_OF_RANGE";
    error.httpStatus = 400;
    throw error;
  }
  return paise;
}

function paiseToRupees(paise) {
  return (Number(paise || 0) / 100).toFixed(2);
}

function resolveTemplate(code) {
  const normalized = cleanPlanCode(code);
  return PLAN_TEMPLATES.find((template) => template.code === normalized) || null;
}

function buildPlanInput(body = {}) {
  const template = resolveTemplate(body.planCode || body.templateCode);
  const planCode = cleanPlanCode(body.planCode || body.templateCode || body.name);
  if (!planCode) {
    const error = new Error("Plan code required.");
    error.code = "PLAN_CODE_REQUIRED";
    error.httpStatus = 400;
    throw error;
  }

  const period = String(body.period || "").trim().toLowerCase();
  if (!ALLOWED_PERIODS.has(period)) {
    const error = new Error("Part 113 me billing period monthly ya yearly hona chahiye.");
    error.code = "INVALID_PERIOD";
    error.httpStatus = 400;
    throw error;
  }

  const amountPaise = amountToPaise(body.amountRupees);
  const name = cleanText(body.name || template?.name || planCode, 120);
  const description = cleanText(body.description || template?.description || "NAXORA subscription plan", 255);
  if (!name) {
    const error = new Error("Plan name required.");
    error.code = "PLAN_NAME_REQUIRED";
    error.httpStatus = 400;
    throw error;
  }

  return {
    planCode,
    templateCode: template?.code || "CUSTOM",
    name,
    description,
    period,
    interval: 1,
    amountPaise,
    currency: "INR",
    features: template?.features || [],
    ownerOnlyV3: Boolean(template?.ownerOnlyV3),
  };
}

function planFingerprint(instituteId, input) {
  return crypto.createHash("sha256").update([
    instituteId,
    input.planCode,
    input.period,
    input.interval,
    input.amountPaise,
    input.currency,
    input.name,
  ].join("|")).digest("hex");
}

function confirmationText(input) {
  return `CREATE TEST PLAN ${input.planCode} INR ${paiseToRupees(input.amountPaise)} ${input.period.toUpperCase()}`;
}

function publicPlan(plan) {
  if (!plan) return null;
  return {
    id: String(plan._id),
    planCode: plan.planCode,
    templateCode: plan.templateCode,
    name: plan.name,
    description: plan.description,
    period: plan.period,
    interval: plan.interval,
    amountPaise: plan.amountPaise,
    amountRupees: paiseToRupees(plan.amountPaise),
    currency: plan.currency,
    status: plan.status,
    razorpayPlanId: plan.razorpayPlanId || "",
    providerCreatedAt: plan.providerCreatedAt || null,
    archivedAt: plan.archivedAt || null,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}

function defineModels() {
  const planSchema = new mongoose.Schema({
    instituteId: { type: String, required: true, index: true },
    planCode: { type: String, required: true },
    templateCode: { type: String, default: "CUSTOM" },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    period: { type: String, enum: ["monthly", "yearly"], required: true },
    interval: { type: Number, default: 1, min: 1 },
    amountPaise: { type: Number, required: true, min: MIN_AMOUNT_PAISE, max: MAX_AMOUNT_PAISE },
    currency: { type: String, default: "INR", enum: ["INR"] },
    features: { type: [String], default: [] },
    ownerOnlyV3: { type: Boolean, default: false },
    fingerprint: { type: String, required: true },
    confirmationText: { type: String, required: true },
    status: {
      type: String,
      default: "preview_ready",
      enum: ["preview_ready", "creating", "provider_created", "provider_failed", "archived_local"],
    },
    razorpayPlanId: { type: String, default: "" },
    providerItemId: { type: String, default: "" },
    providerSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    providerCreatedAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },
    createdByUserId: { type: String, default: "" },
    confirmedByUserId: { type: String, default: "" },
    confirmedAt: { type: Date, default: null },
    failureCode: { type: String, default: "" },
    failureMessage: { type: String, default: "" },
  }, { timestamps: true, strict: true });
  planSchema.index({ instituteId: 1, fingerprint: 1 }, { unique: true });
  planSchema.index({ instituteId: 1, razorpayPlanId: 1 }, { sparse: true });

  const auditSchema = new mongoose.Schema({
    instituteId: { type: String, required: true, index: true },
    actorUserId: { type: String, default: "" },
    action: { type: String, required: true },
    result: { type: String, required: true },
    requestId: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  }, { timestamps: true, strict: true });

  return {
    Plan: mongoose.models.Part113NaxoraSubscriptionPlan || mongoose.model("Part113NaxoraSubscriptionPlan", planSchema),
    Audit: mongoose.models.Part113SubscriptionPlanAudit || mongoose.model("Part113SubscriptionPlanAudit", auditSchema),
  };
}

function requestId(req) {
  return crypto.createHash("sha256").update(`${Date.now()}:${req.ip || ""}:${crypto.randomUUID()}`).digest("hex").slice(0, 20);
}

async function writeAudit(Audit, req, action, result, details = {}) {
  if (!isDatabaseReady()) return { saved: false, reason: "database_not_connected" };
  try {
    await Audit.create({
      instituteId: req.part113Owner?.instituteId || "unknown",
      actorUserId: req.part113Owner?.userId || "unknown",
      action,
      result,
      requestId: requestId(req),
      details,
    });
    return { saved: true };
  } catch {
    return { saved: false, reason: "audit_write_failed" };
  }
}

function rateLimitCreate(req, res, next) {
  const key = `${req.ip || "unknown"}:${req.part113Owner?.instituteId || "unknown"}`;
  const now = Date.now();
  const recent = (createAttempts.get(key) || []).filter((time) => now - time < CREATE_WINDOW_MS);
  if (recent.length >= CREATE_LIMIT) {
    return res.status(429).json({
      success: false,
      part: PART_NUMBER,
      code: "PLAN_CREATE_RATE_LIMIT",
      message: "10 minutes me maximum 5 provider plan create attempts allowed hain.",
    });
  }
  recent.push(now);
  createAttempts.set(key, recent);
  next();
}

function safeProviderError(error) {
  const status = Number(error?.statusCode || error?.status || 0);
  const description = cleanText(error?.error?.description || error?.description || "", 180);
  if (status === 401) return "Razorpay Test API credentials invalid hain.";
  if (status === 400 && description) return `Razorpay ne plan reject kiya: ${description}`;
  if (status === 429) return "Razorpay rate limit hit hui. Thodi der baad dobara try karein.";
  return "Razorpay Test Plan create nahi ho saka. Private server logs check karein.";
}

async function createPreview(models, req, body) {
  if (!isDatabaseReady()) {
    const error = new Error("MongoDB connection required for duplicate-safe plan preview.");
    error.code = "DATABASE_REQUIRED";
    error.httpStatus = 503;
    throw error;
  }
  const input = buildPlanInput(body);
  const fingerprint = planFingerprint(req.part113Owner.instituteId, input);
  const confirmText = confirmationText(input);

  const existing = await models.Plan.findOne({
    instituteId: req.part113Owner.instituteId,
    fingerprint,
  });
  if (existing) {
    return {
      plan: existing,
      duplicate: true,
      alreadyProviderCreated: Boolean(existing.razorpayPlanId),
    };
  }

  const plan = await models.Plan.create({
    instituteId: req.part113Owner.instituteId,
    ...input,
    fingerprint,
    confirmationText: confirmText,
    status: "preview_ready",
    createdByUserId: req.part113Owner.userId,
  });

  await writeAudit(models.Audit, req, "subscription_plan_preview", "success", {
    localPlanId: String(plan._id),
    planCode: plan.planCode,
    period: plan.period,
    amountPaise: plan.amountPaise,
  });

  return { plan, duplicate: false, alreadyProviderCreated: false };
}

async function createProviderPlan(models, req, { draftId, confirmationText: providedConfirmation }) {
  if (!isDatabaseReady()) {
    const error = new Error("MongoDB connection required.");
    error.code = "DATABASE_REQUIRED";
    error.httpStatus = 503;
    throw error;
  }
  requireTestProviderReady();
  const safeDraftId = cleanId(draftId);
  if (!mongoose.isValidObjectId(safeDraftId)) {
    const error = new Error("Valid plan draft ID required.");
    error.code = "INVALID_DRAFT_ID";
    error.httpStatus = 400;
    throw error;
  }

  const plan = await models.Plan.findOne({
    _id: safeDraftId,
    instituteId: req.part113Owner.instituteId,
  });
  if (!plan) {
    const error = new Error("Plan preview not found for this institute.");
    error.code = "PLAN_PREVIEW_NOT_FOUND";
    error.httpStatus = 404;
    throw error;
  }

  if (plan.razorpayPlanId) {
    return { plan, idempotent: true, providerCreated: true };
  }

  if (String(providedConfirmation || "").trim() !== plan.confirmationText) {
    const error = new Error(`Exact confirmation required: ${plan.confirmationText}`);
    error.code = "EXACT_CONFIRMATION_REQUIRED";
    error.httpStatus = 400;
    throw error;
  }

  const claimed = await models.Plan.findOneAndUpdate(
    {
      _id: plan._id,
      instituteId: req.part113Owner.instituteId,
      status: { $in: ["preview_ready", "provider_failed"] },
      razorpayPlanId: "",
    },
    {
      $set: {
        status: "creating",
        confirmedByUserId: req.part113Owner.userId,
        confirmedAt: new Date(),
        failureCode: "",
        failureMessage: "",
      },
    },
    { new: true }
  );

  if (!claimed) {
    const current = await models.Plan.findById(plan._id);
    if (current?.razorpayPlanId) return { plan: current, idempotent: true, providerCreated: true };
    const error = new Error("Plan creation already running or plan is not in a creatable state.");
    error.code = "PLAN_CREATE_IN_PROGRESS";
    error.httpStatus = 409;
    throw error;
  }

  const client = getRazorpayClient();
  try {
    const providerPlan = await client.plans.create({
      period: claimed.period,
      interval: claimed.interval,
      item: {
        name: claimed.name,
        amount: claimed.amountPaise,
        currency: claimed.currency,
        description: claimed.description,
      },
      notes: {
        naxora_part: String(PART_NUMBER),
        naxora_institute_id: claimed.instituteId,
        naxora_plan_code: claimed.planCode,
        naxora_template: claimed.templateCode,
        naxora_mode: "test",
      },
    });

    claimed.status = "provider_created";
    claimed.razorpayPlanId = cleanText(providerPlan?.id || "", 120);
    claimed.providerItemId = cleanText(providerPlan?.item?.id || "", 120);
    claimed.providerSnapshot = {
      id: providerPlan?.id || "",
      entity: providerPlan?.entity || "plan",
      period: providerPlan?.period || claimed.period,
      interval: providerPlan?.interval || claimed.interval,
      item: {
        id: providerPlan?.item?.id || "",
        name: providerPlan?.item?.name || claimed.name,
        amount: providerPlan?.item?.amount ?? claimed.amountPaise,
        currency: providerPlan?.item?.currency || claimed.currency,
        active: providerPlan?.item?.active ?? true,
      },
      created_at: providerPlan?.created_at || null,
    };
    claimed.providerCreatedAt = new Date();
    await claimed.save();

    await writeAudit(models.Audit, req, "razorpay_test_plan_create", "success", {
      localPlanId: String(claimed._id),
      razorpayPlanId: claimed.razorpayPlanId,
      planCode: claimed.planCode,
      amountPaise: claimed.amountPaise,
      period: claimed.period,
    });

    return { plan: claimed, idempotent: false, providerCreated: true };
  } catch (error) {
    const message = safeProviderError(error);
    claimed.status = "provider_failed";
    claimed.failureCode = cleanText(error?.error?.code || error?.code || "PROVIDER_ERROR", 80);
    claimed.failureMessage = message;
    await claimed.save().catch(() => null);
    await writeAudit(models.Audit, req, "razorpay_test_plan_create", "failed", {
      localPlanId: String(claimed._id),
      providerStatus: Number(error?.statusCode || error?.status || 0),
    });
    const wrapped = new Error(message);
    wrapped.code = "RAZORPAY_PLAN_CREATE_FAILED";
    wrapped.httpStatus = 502;
    throw wrapped;
  }
}

function parseVaniCommand(command = "") {
  const text = String(command || "").trim().toLowerCase();
  const planCode = /professional/.test(text) ? "PROFESSIONAL"
    : /business/.test(text) ? "BUSINESS"
      : /(v3|3\.0|ai plan|os 3)/.test(text) ? "V3_AI"
        : /starter/.test(text) ? "STARTER" : "";
  const period = /(yearly|annual|saal|year)/.test(text) ? "yearly"
    : /(monthly|month|mahina)/.test(text) ? "monthly" : "";
  const amountMatch = text.match(/(?:₹|rs\.?|inr|rupees?|price|amount)\s*[:=]?\s*(\d+(?:\.\d{1,2})?)/i)
    || text.match(/(\d+(?:\.\d{1,2})?)\s*(?:rs\.?|rupees?|inr)/i);
  const amountRupees = amountMatch?.[1] || "";
  const intent = /(list|dikhao|show).*plan|plans.*dikhao/.test(text) ? "list"
    : /(create|banao|publish|provider)/.test(text) ? "create"
      : /(preview|draft|plan banao)/.test(text) ? "preview" : "status";
  return { text, planCode, period, amountRupees, intent };
}

export function registerPart113SubscriptionPlans({ app } = {}) {
  if (!app || typeof app.get !== "function" || typeof app.post !== "function") {
    throw new Error("Part 113 registration failed: Express app is required.");
  }
  if (app.locals.part113SubscriptionPlansRegistered) return;
  app.locals.part113SubscriptionPlansRegistered = true;

  const models = defineModels();

  app.get(["/subscription-plans", "/naxora-subscription-plans", "/part113"], (req, res) => {
    res.sendFile(path.join(frontendDir, "naxora-subscription-plans.html"));
  });
  app.get("/naxora-subscription-plans.css", (req, res) => {
    res.type("text/css").sendFile(path.join(frontendDir, "naxora-subscription-plans.css"));
  });
  app.get("/naxora-subscription-plans.js", (req, res) => {
    res.type("application/javascript").sendFile(path.join(frontendDir, "naxora-subscription-plans.js"));
  });

  app.get("/api/part113/status", (req, res) => {
    const provider = getRazorpayState();
    res.json({
      success: true,
      part: PART_NUMBER,
      name: PART_NAME,
      status: "active_test_plan_foundation",
      providerMode: provider.mode,
      testModeLocked: provider.testModeLocked,
      providerReady: provider.ready,
      databaseConnected: isDatabaseReady(),
      planPreviewEnabled: true,
      razorpayTestPlanCreationEnabled: provider.ready && isDatabaseReady(),
      customerSubscriptionCreationEnabled: false,
      checkoutEnabled: false,
      livePlanCreationEnabled: false,
      nextPart: 114,
      nextPartName: "Customer Checkout and Subscription Activation",
    });
  });

  app.get("/api/part113/templates", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      currency: "INR",
      allowedPeriods: ["monthly", "yearly"],
      pricesLocked: false,
      note: "Owner must enter and approve actual prices. Templates do not auto-publish prices.",
      templates: PLAN_TEMPLATES,
    });
  });

  app.get("/api/part113/security-policy", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      ownerOnly: true,
      validInstituteIdRequired: true,
      privateScreenFirst: true,
      testModeOnly: true,
      exactConfirmationRequired: true,
      duplicateFingerprintProtection: true,
      providerPlanUpdateBlocked: true,
      providerPlanDeleteBlocked: true,
      liveModeBlocked: true,
      customerCheckoutBlockedUntilPart114: true,
      subscriptionCreationBlockedUntilPart114: true,
      providerSecretsNeverReturned: true,
      auditLogEnabled: true,
    });
  });

  app.get("/api/part113/readiness", ownerOnly, async (req, res) => {
    const provider = getRazorpayState();
    const localCount = isDatabaseReady()
      ? await models.Plan.countDocuments({ instituteId: req.part113Owner.instituteId }).catch(() => 0)
      : 0;
    res.json({
      success: true,
      part: PART_NUMBER,
      instituteId: req.part113Owner.instituteId,
      ready: provider.ready && isDatabaseReady(),
      provider,
      databaseConnected: isDatabaseReady(),
      localPlanCount: localCount,
      blocked: ["Live plans", "Customer subscriptions", "Checkout", "Plan edit/delete at provider"],
    });
  });

  app.get("/api/part113/plans/local", ownerOnly, async (req, res) => {
    if (!isDatabaseReady()) {
      return res.status(503).json({ success: false, part: PART_NUMBER, code: "DATABASE_REQUIRED", message: "MongoDB connection required." });
    }
    const plans = await models.Plan.find({ instituteId: req.part113Owner.instituteId }).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ success: true, part: PART_NUMBER, count: plans.length, plans: plans.map(publicPlan) });
  });

  app.get("/api/part113/plans/provider", ownerOnly, async (req, res) => {
    try {
      const client = getRazorpayClient();
      const response = await client.plans.all({ count: 100, skip: 0 });
      const items = (response?.items || []).map((item) => ({
        id: item.id,
        period: item.period,
        interval: item.interval,
        name: item.item?.name || "",
        amountPaise: item.item?.amount ?? item.item?.unit_amount ?? 0,
        amountRupees: paiseToRupees(item.item?.amount ?? item.item?.unit_amount ?? 0),
        currency: item.item?.currency || "INR",
        active: item.item?.active ?? true,
        createdAtUnix: item.created_at || null,
      }));
      res.json({ success: true, part: PART_NUMBER, mode: "test", count: items.length, plans: items, secretsReturned: false });
    } catch (error) {
      res.status(error.httpStatus || 502).json({ success: false, part: PART_NUMBER, code: error.code || "PROVIDER_FETCH_FAILED", message: safeProviderError(error) });
    }
  });

  app.post("/api/part113/plan/preview", ownerOnly, async (req, res) => {
    try {
      const result = await createPreview(models, req, req.body || {});
      res.json({
        success: true,
        part: PART_NUMBER,
        duplicate: result.duplicate,
        alreadyProviderCreated: result.alreadyProviderCreated,
        preview: publicPlan(result.plan),
        confirmationTextRequired: result.plan.confirmationText,
        warnings: [
          "Razorpay plan provider par create hone ke baad edit/delete nahi hoga.",
          "Price aur billing period confirm karne se pehle dobara check karein.",
          "Part 113 Test Mode only hai; customer se payment collect nahi hogi.",
        ],
        needsConfirmation: !result.alreadyProviderCreated,
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({ success: false, part: PART_NUMBER, code: error.code || "PLAN_PREVIEW_FAILED", message: error.message });
    }
  });

  app.post("/api/part113/plan/create-confirmed", ownerOnly, rateLimitCreate, async (req, res) => {
    try {
      const result = await createProviderPlan(models, req, {
        draftId: req.body?.draftId,
        confirmationText: req.body?.confirmationText,
      });
      res.json({
        success: true,
        part: PART_NUMBER,
        message: result.idempotent ? "Existing Razorpay Test Plan returned; duplicate create nahi hua." : "Razorpay Test Plan created successfully.",
        idempotent: result.idempotent,
        plan: publicPlan(result.plan),
        customerSubscriptionCreated: false,
        checkoutStarted: false,
        realMoneyMoved: false,
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({ success: false, part: PART_NUMBER, code: error.code || "PLAN_CREATE_FAILED", message: error.message, realMoneyMoved: false });
    }
  });

  app.post("/api/part113/plan/:id/archive-preview", ownerOnly, async (req, res) => {
    if (!isDatabaseReady()) return res.status(503).json({ success: false, part: PART_NUMBER, message: "MongoDB connection required." });
    const id = cleanId(req.params.id);
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, part: PART_NUMBER, message: "Invalid local plan ID." });
    const plan = await models.Plan.findOne({ _id: id, instituteId: req.part113Owner.instituteId });
    if (!plan) return res.status(404).json({ success: false, part: PART_NUMBER, message: "Plan not found." });
    res.json({
      success: true,
      part: PART_NUMBER,
      preview: publicPlan(plan),
      confirmationTextRequired: `ARCHIVE LOCAL PLAN ${plan.planCode}`,
      providerPlanWillRemain: Boolean(plan.razorpayPlanId),
      warning: "Archive sirf NAXORA local list me hoga. Razorpay provider plan delete/edit nahi hoga.",
    });
  });

  app.post("/api/part113/plan/:id/archive-confirm", ownerOnly, async (req, res) => {
    if (!isDatabaseReady()) return res.status(503).json({ success: false, part: PART_NUMBER, message: "MongoDB connection required." });
    const id = cleanId(req.params.id);
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, part: PART_NUMBER, message: "Invalid local plan ID." });
    const plan = await models.Plan.findOne({ _id: id, instituteId: req.part113Owner.instituteId });
    if (!plan) return res.status(404).json({ success: false, part: PART_NUMBER, message: "Plan not found." });
    const expected = `ARCHIVE LOCAL PLAN ${plan.planCode}`;
    if (String(req.body?.confirmationText || "").trim() !== expected) {
      return res.status(400).json({ success: false, part: PART_NUMBER, code: "EXACT_CONFIRMATION_REQUIRED", message: `Exact confirmation required: ${expected}` });
    }
    plan.status = "archived_local";
    plan.archivedAt = new Date();
    await plan.save();
    await writeAudit(models.Audit, req, "local_plan_archive", "success", { localPlanId: String(plan._id), razorpayPlanId: plan.razorpayPlanId || "" });
    res.json({ success: true, part: PART_NUMBER, message: "Local plan archived. Razorpay provider plan unchanged hai.", plan: publicPlan(plan) });
  });

  app.post("/api/part113/vani/command", ownerOnly, async (req, res) => {
    const command = cleanText(req.body?.command || "", 500);
    if (!command) return res.status(400).json({ success: false, part: PART_NUMBER, message: "VANI command required." });
    const parsed = parseVaniCommand(command);

    if (/secret|api key|key secret|password|bank|pan/.test(parsed.text)) {
      await writeAudit(models.Audit, req, "vani_sensitive_plan_request", "blocked", {});
      return res.json({
        success: true,
        part: PART_NUMBER,
        replyText: "Provider secret, password, PAN aur bank details voice/chat me mat boliye. Private Render/Razorpay screen use karein.",
        spokenSafeSummary: "Sensitive provider details private screen par hi rahengi.",
        actionExecuted: false,
        privateScreenFirst: true,
      });
    }

    if (/(live mode|real payment|go live)/.test(parsed.text)) {
      return res.json({
        success: true,
        part: PART_NUMBER,
        replyText: "Part 113 me Live Mode locked hai. Sirf Razorpay Test Plans create ho sakte hain.",
        spokenSafeSummary: "Live Mode abhi safety lock me hai.",
        actionExecuted: false,
      });
    }

    if (parsed.intent === "list") {
      if (!isDatabaseReady()) return res.status(503).json({ success: false, part: PART_NUMBER, message: "MongoDB connection required." });
      const plans = await models.Plan.find({ instituteId: req.part113Owner.instituteId }).sort({ createdAt: -1 }).limit(20).lean();
      return res.json({
        success: true,
        part: PART_NUMBER,
        replyText: `${plans.length} local subscription plan records mile. Details private screen par dikh rahi hain.`,
        spokenSafeSummary: `${plans.length} subscription plan records mile.`,
        privateScreenDetails: plans.map(publicPlan),
        actionExecuted: false,
      });
    }

    if (parsed.intent === "preview" || parsed.intent === "create") {
      const missingDetails = [];
      if (!parsed.planCode) missingDetails.push("plan name: Starter, Professional, Business ya V3 AI");
      if (!parsed.period) missingDetails.push("billing period: monthly ya yearly");
      if (!parsed.amountRupees) missingDetails.push("price in rupees");
      if (missingDetails.length) {
        return res.json({
          success: true,
          part: PART_NUMBER,
          replyText: `Plan preview ke liye mujhe ${missingDetails.join(", ")} chahiye.`,
          spokenSafeSummary: "Plan ki kuch details pending hain.",
          missingDetails,
          actionExecuted: false,
        });
      }
      try {
        const template = resolveTemplate(parsed.planCode);
        const result = await createPreview(models, req, {
          planCode: parsed.planCode,
          name: template?.name,
          description: template?.description,
          period: parsed.period,
          amountRupees: parsed.amountRupees,
        });
        return res.json({
          success: true,
          part: PART_NUMBER,
          replyText: result.alreadyProviderCreated
            ? "Ye exact Test Plan pehle se provider par bana hua hai. Duplicate create nahi karungi."
            : "Test Plan preview ready hai. Price aur billing period check karke exact confirmation dijiye.",
          spokenSafeSummary: "Subscription plan preview ready hai.",
          preview: publicPlan(result.plan),
          confirmationTextRequired: result.plan.confirmationText,
          needsConfirmation: !result.alreadyProviderCreated,
          actionExecuted: false,
        });
      } catch (error) {
        return res.status(error.httpStatus || 500).json({ success: false, part: PART_NUMBER, message: error.message, code: error.code || "VANI_PLAN_PREVIEW_FAILED" });
      }
    }

    const state = getRazorpayState();
    res.json({
      success: true,
      part: PART_NUMBER,
      replyText: state.ready
        ? "Razorpay Test Plan system ready hai. Plan name, monthly/yearly period aur price bataiye."
        : `Razorpay Test setup pending hai: ${state.missing.join(", ") || "Test Key ID format"}.`,
      spokenSafeSummary: state.ready ? "Test Plan system ready hai." : "Razorpay Test setup pending hai.",
      templates: PLAN_TEMPLATES.map(({ code, name }) => ({ code, name })),
      actionExecuted: false,
    });
  });

  app.get("/api/part113/demo", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      name: PART_NAME,
      page: "/subscription-plans",
      examples: [
        "VANI, Professional monthly plan price INR 2999 ka preview banao",
        "VANI, Business yearly plan price ₹29999 ka preview banao",
        "VANI, subscription plans dikhao",
      ],
      safety: {
        testModeOnly: true,
        exactConfirmationRequired: true,
        customerSubscriptionCreated: false,
        checkoutStarted: false,
        realMoneyMoved: false,
      },
    });
  });
}
