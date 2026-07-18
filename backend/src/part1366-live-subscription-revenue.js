import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import Razorpay from "razorpay";

const PART_NUMBER = "136.6";
const PART_NAME = "Razorpay Live Subscription Revenue Bridge";
const OWNER_ROLES = new Set(["institute_owner", "owner", "instituteowner"]);
const CREATE_WINDOW_MS = 15 * 60 * 1000;
const CREATE_LIMIT = 5;
const PLAN_CACHE_MS = 5 * 60 * 1000;
const createAttempts = new Map();
const planCache = new Map();

const SUPPORTED_EVENTS = new Set([
  "subscription.authenticated",
  "subscription.activated",
  "subscription.charged",
  "subscription.completed",
  "subscription.updated",
  "subscription.pending",
  "subscription.halted",
  "subscription.cancelled",
  "subscription.paused",
  "subscription.resumed",
]);

const EVENT_STATUS = Object.freeze({
  "subscription.authenticated": "authenticated",
  "subscription.activated": "active",
  "subscription.charged": "active",
  "subscription.completed": "completed",
  "subscription.updated": "",
  "subscription.pending": "pending",
  "subscription.halted": "halted",
  "subscription.cancelled": "cancelled",
  "subscription.paused": "paused",
  "subscription.resumed": "active",
});

const ACTIVE_STATUS = "active";
const BLOCKING_CURRENT_STATUSES = new Set([
  "creating",
  "created",
  "checkout_opened",
  "signature_verified",
  "authenticated",
  "active",
  "pending",
  "halted",
  "paused",
]);

const PLAN_RANK = Object.freeze({
  FREE: 0,
  STARTER: 1,
  PROFESSIONAL: 2,
  BUSINESS: 3,
});

const BASE_ENTITLEMENTS = Object.freeze({
  FREE: [
    "core.dashboard",
    "profile.self",
  ],
  STARTER: [
    "core.dashboard",
    "profile.self",
    "students.manage",
    "attendance.manage",
    "fees.manage",
    "reports.basic",
    "student.portal",
    "parent.portal",
  ],
  PROFESSIONAL: [
    "core.dashboard",
    "profile.self",
    "students.manage",
    "attendance.manage",
    "fees.manage",
    "reports.basic",
    "student.portal",
    "parent.portal",
    "vani.v2",
    "live.classes",
    "ai.student_support",
    "ai.class_notes",
  ],
  BUSINESS: [
    "core.dashboard",
    "profile.self",
    "students.manage",
    "attendance.manage",
    "fees.manage",
    "reports.basic",
    "student.portal",
    "parent.portal",
    "vani.v2",
    "live.classes",
    "ai.student_support",
    "ai.class_notes",
    "branches.command_centre",
    "franchise.manage",
    "marketing.automation",
    "marketplace.manage",
    "white_label.manage",
  ],
});

const PLAN_CONFIG = Object.freeze([
  {
    code: "STARTER",
    period: "monthly",
    env: "NAXORA_LIVE_PLAN_STARTER_MONTHLY_ID",
    label: "NAXORA Starter Monthly",
    description: "Core student, attendance, fees and basic reports.",
  },
  {
    code: "STARTER",
    period: "yearly",
    env: "NAXORA_LIVE_PLAN_STARTER_YEARLY_ID",
    label: "NAXORA Starter Yearly",
    description: "Core institute operations billed yearly.",
  },
  {
    code: "PROFESSIONAL",
    period: "monthly",
    env: "NAXORA_LIVE_PLAN_PROFESSIONAL_MONTHLY_ID",
    label: "NAXORA Professional Monthly",
    description: "Advanced operations, VANI 2.0, live classes and AI tools.",
  },
  {
    code: "PROFESSIONAL",
    period: "yearly",
    env: "NAXORA_LIVE_PLAN_PROFESSIONAL_YEARLY_ID",
    label: "NAXORA Professional Yearly",
    description: "Professional features billed yearly.",
  },
  {
    code: "BUSINESS",
    period: "monthly",
    env: "NAXORA_LIVE_PLAN_BUSINESS_MONTHLY_ID",
    label: "NAXORA Business Monthly",
    description: "Multi-branch, franchise, marketing, marketplace and white label.",
  },
  {
    code: "BUSINESS",
    period: "yearly",
    env: "NAXORA_LIVE_PLAN_BUSINESS_YEARLY_ID",
    label: "NAXORA Business Yearly",
    description: "Business features billed yearly.",
  },
]);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, "../../frontend");

function normalizeRole(value = "") {
  const role = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return ({
    owner: "institute_owner",
    instituteowner: "institute_owner",
  })[role] || role;
}

function cleanId(value = "") {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9:_-]/g, "")
    .slice(0, 180);
}

function cleanText(value = "", max = 255) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function cleanEmail(value = "") {
  const email = String(value || "").trim().toLowerCase().slice(0, 180);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const error = new Error("Valid billing email required.");
    error.code = "INVALID_BILLING_EMAIL";
    error.httpStatus = 400;
    throw error;
  }
  return email;
}

function cleanContact(value = "") {
  const contact = String(value || "").replace(/[^0-9+]/g, "").slice(0, 16);
  if (!/^\+?[0-9]{10,15}$/.test(contact)) {
    const error = new Error("Valid billing contact required, 10 to 15 digits.");
    error.code = "INVALID_BILLING_CONTACT";
    error.httpStatus = 400;
    throw error;
  }
  return contact;
}

function parseBoolean(value) {
  return ["1", "true", "yes", "approved", "enabled", "active"].includes(
    String(value || "").trim().toLowerCase()
  );
}

function dbReady() {
  return mongoose.connection?.readyState === 1;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hmacHex(secret, value) {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

function safeEqualHex(leftHex, rightHex) {
  try {
    const left = Buffer.from(String(leftHex || ""), "hex");
    const right = Buffer.from(String(rightHex || ""), "hex");
    return (
      left.length > 0 &&
      left.length === right.length &&
      crypto.timingSafeEqual(left, right)
    );
  } catch {
    return false;
  }
}

function requestId(req) {
  return sha256(
    `${Date.now()}:${req.ip || ""}:${crypto.randomUUID()}`
  ).slice(0, 20);
}

function bearer(req) {
  const auth = String(req.headers.authorization || "").trim();
  return auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : "";
}

function jwtSecrets() {
  return [
    process.env.JWT_SECRET,
    process.env.JWT_ACCESS_SECRET,
    process.env.ACCESS_TOKEN_SECRET,
    process.env.NAXORA_JWT_SECRET,
  ].map(value => String(value || "").trim()).filter(Boolean);
}

function verifyToken(token) {
  const secrets = jwtSecrets();
  if (!secrets.length) {
    const error = new Error("JWT server configuration missing.");
    error.code = "AUTH_CONFIGURATION_MISSING";
    error.httpStatus = 503;
    throw error;
  }

  for (const secret of secrets) {
    try {
      return jwt.verify(token, secret, {
        algorithms: ["HS256", "HS384", "HS512"],
      });
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
  let payload = req.user || req.auth || null;
  if (!payload && bearer(req)) payload = verifyToken(bearer(req));

  if (!payload) {
    const error = new Error("Institute Owner login required.");
    error.code = "OWNER_LOGIN_REQUIRED";
    error.httpStatus = 401;
    throw error;
  }

  const role = normalizeRole(
    payload.role ||
    payload.userRole ||
    payload.accountRole ||
    payload.user?.role ||
    ""
  );

  if (!OWNER_ROLES.has(role)) {
    const error = new Error(
      "Only institute_owner can start a NAXORA commercial subscription."
    );
    error.code = "OWNER_ONLY";
    error.httpStatus = 403;
    throw error;
  }

  const requestedInstituteId = cleanId(
    req.headers["x-naxora-institute-id"] ||
    req.body?.instituteId ||
    req.query?.instituteId ||
    ""
  );

  const tokenInstituteId = cleanId(
    payload.instituteId ||
    payload.institute_id ||
    payload.user?.instituteId ||
    payload.tenantId ||
    ""
  );

  if (
    tokenInstituteId &&
    requestedInstituteId &&
    tokenInstituteId !== requestedInstituteId
  ) {
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
    userId: cleanId(
      payload.userId ||
      payload.id ||
      payload._id ||
      payload.sub ||
      payload.user?.id ||
      "owner"
    ),
    displayName: cleanText(
      payload.displayName ||
      payload.name ||
      payload.user?.name ||
      "Institute Owner",
      120
    ),
    email: String(
      payload.email ||
      payload.identifier ||
      payload.user?.email ||
      ""
    ).trim().toLowerCase().slice(0, 180),
  };
}

function ownerOnly(req, res, next) {
  try {
    req.part1366Owner = ownerContext(req);
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

function rateLimitCreate(req, res, next) {
  const key = `${req.ip || "unknown"}:${req.part1366Owner?.instituteId || "unknown"}`;
  const now = Date.now();
  const recent = (createAttempts.get(key) || [])
    .filter(time => now - time < CREATE_WINDOW_MS);

  if (recent.length >= CREATE_LIMIT) {
    return res.status(429).json({
      success: false,
      part: PART_NUMBER,
      code: "LIVE_SUBSCRIPTION_CREATE_RATE_LIMIT",
      message: "15 minutes me maximum 5 Live Subscription attempts allowed hain.",
    });
  }

  recent.push(now);
  createAttempts.set(key, recent);
  next();
}

function configuredPlans() {
  return PLAN_CONFIG.map(config => ({
    ...config,
    planId: cleanId(process.env[config.env] || ""),
  })).filter(config => config.planId.startsWith("plan_"));
}

function liveState() {
  const keyId = String(process.env.RAZORPAY_LIVE_KEY_ID || "").trim();
  const keySecret = String(process.env.RAZORPAY_LIVE_KEY_SECRET || "").trim();
  const webhookSecret = String(
    process.env.RAZORPAY_LIVE_WEBHOOK_SECRET || ""
  ).trim();

  const adultMerchantApproved = parseBoolean(
    process.env.NAXORA_ADULT_MERCHANT_APPROVED
  );
  const settlementBankConfirmed = parseBoolean(
    process.env.NAXORA_SETTLEMENT_BANK_CONFIRMED
  );
  const launchEnabled = parseBoolean(
    process.env.NAXORA_RAZORPAY_LIVE_LAUNCHED
  );

  const plans = configuredPlans();

  return {
    keyId,
    keyIdConfigured: Boolean(keyId),
    keySecretConfigured: Boolean(keySecret),
    keyLooksLive: keyId.startsWith("rzp_live_"),
    webhookSecretConfigured: Boolean(webhookSecret),
    adultMerchantApproved,
    settlementBankConfirmed,
    launchEnabled,
    configuredPlanCount: plans.length,
    liveCredentialsReady: Boolean(
      keyId.startsWith("rzp_live_") && keySecret
    ),
    webhookReady: Boolean(webhookSecret),
    createSubscriptionEnabled: Boolean(
      keyId.startsWith("rzp_live_") &&
      keySecret &&
      webhookSecret &&
      adultMerchantApproved &&
      settlementBankConfirmed &&
      launchEnabled &&
      plans.length > 0
    ),
  };
}

function requireLiveCredentials() {
  const state = liveState();

  if (!state.adultMerchantApproved) {
    const error = new Error(
      "Adult legal Razorpay merchant approval confirmation pending hai."
    );
    error.code = "ADULT_MERCHANT_APPROVAL_REQUIRED";
    error.httpStatus = 423;
    throw error;
  }

  if (!state.settlementBankConfirmed) {
    const error = new Error(
      "Razorpay settlement bank confirmation pending hai."
    );
    error.code = "SETTLEMENT_BANK_CONFIRMATION_REQUIRED";
    error.httpStatus = 423;
    throw error;
  }

  if (!state.liveCredentialsReady) {
    const error = new Error(
      "Razorpay Live Key ID/Secret Render Environment me incomplete hain."
    );
    error.code = "LIVE_CREDENTIALS_NOT_READY";
    error.httpStatus = 412;
    throw error;
  }

  return state;
}

function requireLiveLaunch() {
  const state = requireLiveCredentials();

  if (!state.webhookReady) {
    const error = new Error(
      "RAZORPAY_LIVE_WEBHOOK_SECRET Render Environment me configure karein."
    );
    error.code = "LIVE_WEBHOOK_SECRET_REQUIRED";
    error.httpStatus = 412;
    throw error;
  }

  if (!state.launchEnabled) {
    const error = new Error(
      "Controlled launch flag off hai. Final checks ke baad NAXORA_RAZORPAY_LIVE_LAUNCHED=true karein."
    );
    error.code = "LIVE_LAUNCH_FLAG_OFF";
    error.httpStatus = 423;
    throw error;
  }

  if (!configuredPlans().length) {
    const error = new Error("Kam se kam ek Live Razorpay Plan ID configure karein.");
    error.code = "LIVE_PLAN_REQUIRED";
    error.httpStatus = 412;
    throw error;
  }

  return state;
}

function requireLiveWebhook() {
  const secret = String(
    process.env.RAZORPAY_LIVE_WEBHOOK_SECRET || ""
  ).trim();

  if (!secret) {
    const error = new Error("Live webhook secret not configured.");
    error.code = "LIVE_WEBHOOK_SECRET_REQUIRED";
    error.httpStatus = 503;
    throw error;
  }

  return secret;
}

function liveClient() {
  requireLiveCredentials();
  return new Razorpay({
    key_id: process.env.RAZORPAY_LIVE_KEY_ID,
    key_secret: process.env.RAZORPAY_LIVE_KEY_SECRET,
  });
}

function parseTotalCount(period) {
  const envName = period === "yearly"
    ? "NAXORA_LIVE_YEARLY_TOTAL_COUNT"
    : "NAXORA_LIVE_MONTHLY_TOTAL_COUNT";

  const defaultValue = period === "yearly" ? 1 : 12;
  const maximum = period === "yearly" ? 10 : 120;
  const value = Number(process.env[envName] || defaultValue);

  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    return defaultValue;
  }

  return value;
}

function publicPlan(config, providerPlan) {
  return {
    code: config.code,
    period: config.period,
    label: config.label,
    description: config.description,
    razorpayPlanId: config.planId,
    amountPaise: Number(
      providerPlan?.item?.amount ||
      providerPlan?.item?.unit_amount ||
      0
    ),
    amountRupees: (
      Number(
        providerPlan?.item?.amount ||
        providerPlan?.item?.unit_amount ||
        0
      ) / 100
    ).toFixed(2),
    currency: providerPlan?.item?.currency || "INR",
    providerName: cleanText(
      providerPlan?.item?.name || config.label,
      120
    ),
    providerPeriod: providerPlan?.period || config.period,
    providerInterval: Number(providerPlan?.interval || 1),
    totalCount: parseTotalCount(config.period),
  };
}

async function fetchConfiguredPlan(config) {
  const cached = planCache.get(config.planId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const providerPlan = await liveClient().plans.fetch(config.planId);

  if (
    cleanText(providerPlan?.period, 20).toLowerCase() !== config.period
  ) {
    const error = new Error(
      `${config.env} ka Razorpay billing period ${config.period} nahi hai.`
    );
    error.code = "LIVE_PLAN_PERIOD_MISMATCH";
    error.httpStatus = 412;
    throw error;
  }

  const result = publicPlan(config, providerPlan);
  planCache.set(config.planId, {
    value: result,
    expiresAt: Date.now() + PLAN_CACHE_MS,
  });
  return result;
}

async function listProviderPlans() {
  requireLiveCredentials();
  const configs = configuredPlans();
  const plans = [];

  for (const config of configs) {
    plans.push(await fetchConfiguredPlan(config));
  }

  return plans;
}

function planConfig(code, period) {
  const cleanCode = cleanText(code, 30).toUpperCase();
  const cleanPeriod = cleanText(period, 20).toLowerCase();
  return configuredPlans().find(
    config => config.code === cleanCode && config.period === cleanPeriod
  ) || null;
}

function safeProviderError(error) {
  const status = Number(error?.statusCode || error?.status || 0);
  const description = cleanText(
    error?.error?.description || error?.description || "",
    180
  );

  if (status === 401) return "Razorpay Live credentials invalid hain.";
  if (status === 400 && description) {
    return `Razorpay ne Live Subscription reject ki: ${description}`;
  }
  if (status === 429) {
    return "Razorpay rate limit hit hui. Thodi der baad retry karein.";
  }
  return "Razorpay Live Subscription request complete nahi hui.";
}

function defineModels() {
  const subscriptionSchema = new mongoose.Schema({
    instituteId: { type: String, required: true, index: true },
    ownerUserId: { type: String, required: true },
    planCode: {
      type: String,
      enum: ["STARTER", "PROFESSIONAL", "BUSINESS"],
      required: true,
      index: true,
    },
    billingPeriod: {
      type: String,
      enum: ["monthly", "yearly"],
      required: true,
    },
    razorpayPlanId: { type: String, required: true, index: true },
    razorpaySubscriptionId: {
      type: String,
      default: "",
      unique: true,
      sparse: true,
      index: true,
    },
    razorpayCustomerId: { type: String, default: "" },
    razorpayPaymentId: { type: String, default: "" },
    amountPaise: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    totalCount: { type: Number, required: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerContact: { type: String, required: true },
    consentAccepted: { type: Boolean, default: false },
    status: {
      type: String,
      enum: [
        "creating",
        "created",
        "checkout_opened",
        "signature_verified",
        "authenticated",
        "active",
        "pending",
        "halted",
        "cancelled",
        "completed",
        "paused",
        "expired",
        "provider_failed",
        "verification_failed",
      ],
      default: "creating",
      index: true,
    },
    checkoutSignatureDigest: { type: String, default: "" },
    checkoutVerifiedAt: { type: Date, default: null },
    lastWebhookEventId: { type: String, default: "" },
    lastWebhookEventType: { type: String, default: "" },
    lastWebhookAt: { type: Date, default: null },
    currentStart: { type: Date, default: null },
    currentEnd: { type: Date, default: null },
    paidCount: { type: Number, default: 0 },
    remainingCount: { type: Number, default: 0 },
    providerSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
    failureCode: { type: String, default: "" },
    failureMessage: { type: String, default: "" },
  }, { timestamps: true, strict: true });

  subscriptionSchema.index(
    { instituteId: 1, createdAt: -1 }
  );

  const eventSchema = new mongoose.Schema({
    providerEventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    eventType: { type: String, required: true, index: true },
    payloadDigest: { type: String, required: true },
    signatureDigest: { type: String, required: true },
    instituteId: { type: String, default: "", index: true },
    razorpaySubscriptionId: { type: String, default: "", index: true },
    processingStatus: {
      type: String,
      enum: [
        "received",
        "processed",
        "duplicate",
        "ignored",
        "unmatched",
        "failed",
      ],
      default: "received",
      index: true,
    },
    resultingStatus: { type: String, default: "" },
    safeSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
    failureCode: { type: String, default: "" },
    processedAt: { type: Date, default: null },
  }, { timestamps: true, strict: true });

  const auditSchema = new mongoose.Schema({
    instituteId: { type: String, required: true, index: true },
    actorUserId: { type: String, default: "system" },
    action: { type: String, required: true },
    result: { type: String, required: true },
    reasonCode: { type: String, default: "" },
    requestId: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  }, { timestamps: true, strict: true });

  return {
    Subscription:
      mongoose.models.Part1366LiveSubscription ||
      mongoose.model(
        "Part1366LiveSubscription",
        subscriptionSchema
      ),
    Event:
      mongoose.models.Part1366LiveWebhookEvent ||
      mongoose.model(
        "Part1366LiveWebhookEvent",
        eventSchema
      ),
    Audit:
      mongoose.models.Part1366LiveRevenueAudit ||
      mongoose.model(
        "Part1366LiveRevenueAudit",
        auditSchema
      ),
  };
}

async function audit(models, req, action, result, reasonCode = "", details = {}) {
  if (!dbReady()) return;

  try {
    await models.Audit.create({
      instituteId:
        req.part1366Owner?.instituteId ||
        details.instituteId ||
        "system",
      actorUserId:
        req.part1366Owner?.userId ||
        "system",
      action,
      result,
      reasonCode,
      requestId: requestId(req),
      details,
    });
  } catch {
    // Provider and subscription result remain authoritative.
  }
}

function publicSubscription(record) {
  if (!record) return null;

  return {
    id: String(record._id),
    instituteId: record.instituteId,
    planCode: record.planCode,
    billingPeriod: record.billingPeriod,
    razorpayPlanId: record.razorpayPlanId,
    razorpaySubscriptionId: record.razorpaySubscriptionId,
    amountPaise: record.amountPaise,
    amountRupees: (Number(record.amountPaise || 0) / 100).toFixed(2),
    currency: record.currency,
    totalCount: record.totalCount,
    customerName: record.customerName,
    customerEmailMasked: record.customerEmail.replace(
      /^(.{2}).*(@.*)$/,
      "$1***$2"
    ),
    customerContactMasked:
      `${record.customerContact.slice(0, 3)}******${record.customerContact.slice(-2)}`,
    status: record.status,
    checkoutVerifiedAt: record.checkoutVerifiedAt,
    lastWebhookEventType: record.lastWebhookEventType,
    lastWebhookAt: record.lastWebhookAt,
    currentStart: record.currentStart,
    currentEnd: record.currentEnd,
    paidCount: record.paidCount,
    remainingCount: record.remainingCount,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapEventStatus(eventType, entity, currentStatus) {
  const providerStatus = cleanText(entity?.status || "", 40).toLowerCase();
  const allowed = new Set([
    "created",
    "authenticated",
    "active",
    "pending",
    "halted",
    "cancelled",
    "completed",
    "paused",
    "expired",
  ]);

  if (allowed.has(providerStatus)) return providerStatus;

  const mapped = EVENT_STATUS[eventType] || "";
  if (allowed.has(mapped)) return mapped;

  return allowed.has(currentStatus) ? currentStatus : "created";
}

function toDate(unix) {
  const value = Number(unix || 0);
  return Number.isFinite(value) && value > 0
    ? new Date(value * 1000)
    : null;
}

function safeWebhookSnapshot(eventType, payload) {
  const subscription = payload?.subscription?.entity || {};
  const payment = payload?.payment?.entity || {};
  const invoice = payload?.invoice?.entity || {};

  return {
    eventType,
    subscription: {
      id: cleanId(subscription.id),
      planId: cleanId(subscription.plan_id),
      customerId: cleanId(subscription.customer_id),
      status: cleanText(subscription.status, 40),
      totalCount: Number(subscription.total_count || 0),
      paidCount: Number(subscription.paid_count || 0),
      remainingCount: Number(subscription.remaining_count || 0),
      currentStart: subscription.current_start || null,
      currentEnd: subscription.current_end || null,
    },
    payment: payment.id ? {
      id: cleanId(payment.id),
      status: cleanText(payment.status, 40),
      amount: Number(payment.amount || 0),
      currency: cleanText(payment.currency || "INR", 10),
    } : null,
    invoice: invoice.id ? {
      id: cleanId(invoice.id),
      status: cleanText(invoice.status, 40),
      amountPaid: Number(invoice.amount_paid || 0),
      amountDue: Number(invoice.amount_due || 0),
      currency: cleanText(invoice.currency || "INR", 10),
    } : null,
  };
}

function highestPlan(codes) {
  return [...new Set(codes)]
    .filter(code => Object.hasOwn(PLAN_RANK, code))
    .sort((a, b) => PLAN_RANK[b] - PLAN_RANK[a])[0] || "FREE";
}

async function recalculateAccess(models, instituteId) {
  const Snapshot = mongoose.models.Part116AccessSnapshot;
  if (!Snapshot) {
    const error = new Error(
      "Part 116 access model not active. Server registration order check karein."
    );
    error.code = "PART116_ACCESS_MODEL_MISSING";
    error.httpStatus = 503;
    throw error;
  }

  const active = await models.Subscription.find({
    instituteId,
    status: ACTIVE_STATUS,
  }).sort({ updatedAt: -1 }).lean();

  const activePlanCodes = [
    ...new Set(active.map(item => item.planCode)),
  ];
  const basePlanCode = highestPlan(activePlanCodes);
  const entitlements = BASE_ENTITLEMENTS[basePlanCode] || BASE_ENTITLEMENTS.FREE;

  await Snapshot.findOneAndUpdate(
    { instituteId },
    {
      $set: {
        basePlanCode,
        v3Active: false,
        activeSubscriptionIds: active.map(
          item => item.razorpaySubscriptionId
        ),
        activePlanCodes,
        pendingAuthenticatedPlanCodes: [],
        entitlements,
        source: "part1366_live_verified_webhook",
        calculatedAt: new Date(),
        warningCodes: active.length
          ? []
          : ["NO_ACTIVE_LIVE_SUBSCRIPTION"],
        commercialLiveMode: active.length > 0,
      },
      $setOnInsert: { instituteId },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return {
    basePlanCode,
    activePlanCodes,
    activeSubscriptionIds: active.map(
      item => item.razorpaySubscriptionId
    ),
    entitlements,
    commercialLiveMode: active.length > 0,
  };
}

async function createLiveSubscription(models, req, body) {
  requireLiveLaunch();

  if (!dbReady()) {
    const error = new Error("MongoDB connection required.");
    error.code = "DATABASE_REQUIRED";
    error.httpStatus = 503;
    throw error;
  }

  const config = planConfig(body.planCode, body.billingPeriod);
  if (!config) {
    const error = new Error("Configured Live Plan not found.");
    error.code = "LIVE_PLAN_NOT_CONFIGURED";
    error.httpStatus = 404;
    throw error;
  }

  const customerName = cleanText(body.customerName, 120);
  if (customerName.length < 2) {
    const error = new Error("Billing customer name required.");
    error.code = "CUSTOMER_NAME_REQUIRED";
    error.httpStatus = 400;
    throw error;
  }

  const customerEmail = cleanEmail(body.customerEmail);
  const customerContact = cleanContact(body.customerContact);

  if (body.consentAccepted !== true) {
    const error = new Error(
      "Recurring subscription authorisation consent required."
    );
    error.code = "SUBSCRIPTION_CONSENT_REQUIRED";
    error.httpStatus = 400;
    throw error;
  }

  const current = await models.Subscription.findOne({
    instituteId: req.part1366Owner.instituteId,
    status: { $in: Array.from(BLOCKING_CURRENT_STATUSES) },
  }).sort({ createdAt: -1 });

  if (current) {
    const error = new Error(
      `Institute ki existing subscription ${current.status} state me hai. Duplicate billing block ki gayi.`
    );
    error.code = "EXISTING_SUBSCRIPTION_BLOCKS_NEW_BILLING";
    error.httpStatus = 409;
    error.currentSubscription = publicSubscription(current);
    throw error;
  }

  const plan = await fetchConfiguredPlan(config);
  const record = await models.Subscription.create({
    instituteId: req.part1366Owner.instituteId,
    ownerUserId: req.part1366Owner.userId,
    planCode: config.code,
    billingPeriod: config.period,
    razorpayPlanId: config.planId,
    amountPaise: plan.amountPaise,
    currency: plan.currency,
    totalCount: plan.totalCount,
    customerName,
    customerEmail,
    customerContact,
    consentAccepted: true,
    status: "creating",
  });

  try {
    const provider = await liveClient().subscriptions.create({
      plan_id: config.planId,
      total_count: plan.totalCount,
      quantity: 1,
      customer_notify: true,
      notes: {
        naxora_part: PART_NUMBER,
        naxora_mode: "live",
        naxora_institute_id: record.instituteId,
        naxora_plan_code: record.planCode,
        naxora_local_subscription_id: String(record._id),
      },
    });

    record.razorpaySubscriptionId = cleanId(provider?.id || "");
    record.razorpayCustomerId = cleanId(provider?.customer_id || "");
    record.status = cleanText(provider?.status || "created", 40);
    record.remainingCount = Number(
      provider?.remaining_count ?? plan.totalCount
    );
    record.providerSnapshot = {
      id: provider?.id || "",
      planId: provider?.plan_id || config.planId,
      status: provider?.status || "created",
      totalCount: provider?.total_count ?? plan.totalCount,
      paidCount: provider?.paid_count ?? 0,
      remainingCount: provider?.remaining_count ?? plan.totalCount,
      createdAt: provider?.created_at || null,
      chargeAt: provider?.charge_at || null,
    };
    await record.save();

    await audit(
      models,
      req,
      "live_subscription_create",
      "success",
      "PROVIDER_SUBSCRIPTION_CREATED",
      {
        localSubscriptionId: String(record._id),
        razorpaySubscriptionId: record.razorpaySubscriptionId,
        planCode: record.planCode,
        billingPeriod: record.billingPeriod,
      }
    );

    return {
      record,
      checkout: {
        keyId: String(process.env.RAZORPAY_LIVE_KEY_ID || "").trim(),
        subscriptionId: record.razorpaySubscriptionId,
        merchantName: cleanText(
          process.env.NAXORA_SUBSCRIPTION_BRAND_NAME ||
          "NAXORA Institute OS",
          100
        ),
        description:
          `${record.planCode} ${record.billingPeriod} subscription`,
        prefill: {
          name: record.customerName,
          email: record.customerEmail,
          contact: record.customerContact,
        },
        theme: {
          color: "#49d6c8",
        },
      },
    };
  } catch (error) {
    record.status = "provider_failed";
    record.failureCode = cleanText(
      error?.error?.code || error?.code || "PROVIDER_ERROR",
      80
    );
    record.failureMessage = safeProviderError(error);
    await record.save().catch(() => null);

    await audit(
      models,
      req,
      "live_subscription_create",
      "failed",
      record.failureCode,
      { localSubscriptionId: String(record._id) }
    );

    const wrapped = new Error(record.failureMessage);
    wrapped.code = "LIVE_SUBSCRIPTION_CREATE_FAILED";
    wrapped.httpStatus = 502;
    throw wrapped;
  }
}

async function verifyCheckout(models, req, body) {
  requireLiveLaunch();

  if (!dbReady()) {
    const error = new Error("MongoDB connection required.");
    error.code = "DATABASE_REQUIRED";
    error.httpStatus = 503;
    throw error;
  }

  const localId = cleanId(body.localSubscriptionId);
  if (!mongoose.isValidObjectId(localId)) {
    const error = new Error("Valid local Subscription ID required.");
    error.code = "INVALID_LOCAL_SUBSCRIPTION_ID";
    error.httpStatus = 400;
    throw error;
  }

  const record = await models.Subscription.findOne({
    _id: localId,
    instituteId: req.part1366Owner.instituteId,
  });

  if (!record) {
    const error = new Error("Live Subscription record not found.");
    error.code = "LIVE_SUBSCRIPTION_NOT_FOUND";
    error.httpStatus = 404;
    throw error;
  }

  const paymentId = cleanId(body.razorpay_payment_id);
  const returnedSubscriptionId = cleanId(
    body.razorpay_subscription_id
  );
  const signature = cleanText(body.razorpay_signature, 256);

  if (
    !paymentId ||
    !returnedSubscriptionId ||
    !signature
  ) {
    const error = new Error("Razorpay checkout verification fields missing.");
    error.code = "CHECKOUT_VERIFICATION_FIELDS_MISSING";
    error.httpStatus = 400;
    throw error;
  }

  if (
    returnedSubscriptionId !== record.razorpaySubscriptionId
  ) {
    record.status = "verification_failed";
    record.failureCode = "SUBSCRIPTION_ID_MISMATCH";
    await record.save();

    const error = new Error(
      "Returned Razorpay Subscription ID stored ID se match nahi karti."
    );
    error.code = "SUBSCRIPTION_ID_MISMATCH";
    error.httpStatus = 400;
    throw error;
  }

  const expected = hmacHex(
    process.env.RAZORPAY_LIVE_KEY_SECRET,
    `${paymentId}|${record.razorpaySubscriptionId}`
  );

  if (!safeEqualHex(expected, signature)) {
    record.status = "verification_failed";
    record.failureCode = "INVALID_CHECKOUT_SIGNATURE";
    await record.save();

    await audit(
      models,
      req,
      "live_checkout_signature",
      "failed",
      "INVALID_CHECKOUT_SIGNATURE",
      { localSubscriptionId: String(record._id) }
    );

    const error = new Error("Razorpay Checkout signature invalid hai.");
    error.code = "INVALID_CHECKOUT_SIGNATURE";
    error.httpStatus = 400;
    throw error;
  }

  record.razorpayPaymentId = paymentId;
  record.checkoutSignatureDigest = sha256(signature);
  record.checkoutVerifiedAt = new Date();
  record.status = "signature_verified";
  record.failureCode = "";
  record.failureMessage = "";
  await record.save();

  await audit(
    models,
    req,
    "live_checkout_signature",
    "success",
    "SIGNATURE_VERIFIED",
    {
      localSubscriptionId: String(record._id),
      razorpaySubscriptionId: record.razorpaySubscriptionId,
      razorpayPaymentId: paymentId,
    }
  );

  return record;
}

async function reconcile(models, req, localId) {
  requireLiveCredentials();

  if (!dbReady()) {
    const error = new Error("MongoDB connection required.");
    error.code = "DATABASE_REQUIRED";
    error.httpStatus = 503;
    throw error;
  }

  const id = cleanId(localId);
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error("Valid local Subscription ID required.");
    error.code = "INVALID_LOCAL_SUBSCRIPTION_ID";
    error.httpStatus = 400;
    throw error;
  }

  const record = await models.Subscription.findOne({
    _id: id,
    instituteId: req.part1366Owner.instituteId,
  });

  if (!record?.razorpaySubscriptionId) {
    const error = new Error("Provider-created Live Subscription not found.");
    error.code = "LIVE_SUBSCRIPTION_NOT_FOUND";
    error.httpStatus = 404;
    throw error;
  }

  const provider = await liveClient().subscriptions.fetch(
    record.razorpaySubscriptionId
  );

  record.status = mapEventStatus(
    "subscription.updated",
    provider,
    record.status
  );
  record.razorpayCustomerId = cleanId(
    provider?.customer_id || record.razorpayCustomerId
  );
  record.currentStart = toDate(provider?.current_start);
  record.currentEnd = toDate(provider?.current_end);
  record.paidCount = Number(provider?.paid_count || 0);
  record.remainingCount = Number(provider?.remaining_count || 0);
  record.providerSnapshot = {
    source: "live_provider_reconcile",
    id: provider?.id || record.razorpaySubscriptionId,
    status: provider?.status || record.status,
    planId: provider?.plan_id || record.razorpayPlanId,
    customerId: provider?.customer_id || "",
    paidCount: provider?.paid_count || 0,
    remainingCount: provider?.remaining_count || 0,
    currentStart: provider?.current_start || null,
    currentEnd: provider?.current_end || null,
  };
  await record.save();

  const access = await recalculateAccess(
    models,
    record.instituteId
  );

  await audit(
    models,
    req,
    "live_subscription_reconcile",
    "success",
    "PROVIDER_STATUS_FETCHED",
    {
      localSubscriptionId: String(record._id),
      resultingStatus: record.status,
    }
  );

  return { record, access };
}

export function registerPart1366LiveSubscriptionRevenue({ app } = {}) {
  if (
    !app ||
    typeof app.get !== "function" ||
    typeof app.post !== "function"
  ) {
    throw new Error(
      "Part 136.6 registration failed: Express app required."
    );
  }

  if (app.locals.part1366LiveRevenueRegistered) return;
  app.locals.part1366LiveRevenueRegistered = true;

  const models = defineModels();

  app.get(
    [
      "/live-subscriptions",
      "/commercial-subscriptions",
      "/subscribe-live",
      "/part1366",
    ],
    (req, res) => {
      res.set("Cache-Control", "no-store");
      res.sendFile(
        path.join(frontendDir, "naxora-live-subscriptions.html")
      );
    }
  );

  app.get("/naxora-live-subscriptions.css", (req, res) => {
    res.set("Cache-Control", "no-cache");
    res.type("text/css").sendFile(
      path.join(frontendDir, "naxora-live-subscriptions.css")
    );
  });

  app.get("/naxora-live-subscriptions.js", (req, res) => {
    res.set("Cache-Control", "no-cache");
    res.type("application/javascript").sendFile(
      path.join(frontendDir, "naxora-live-subscriptions.js")
    );
  });

  app.get("/api/part1366/status", (req, res) => {
    const state = liveState();
    res.json({
      success: true,
      part: PART_NUMBER,
      name: PART_NAME,
      status: state.createSubscriptionEnabled
        ? "live_subscription_revenue_enabled"
        : "live_subscription_revenue_locked",
      databaseConnected: dbReady(),
      adultMerchantApproved: state.adultMerchantApproved,
      settlementBankConfirmed: state.settlementBankConfirmed,
      liveKeyIdConfigured: state.keyIdConfigured,
      liveKeyLooksCorrect: state.keyLooksLive,
      liveKeySecretConfigured: state.keySecretConfigured,
      liveWebhookSecretConfigured: state.webhookSecretConfigured,
      launchFlagEnabled: state.launchEnabled,
      configuredPlanCount: state.configuredPlanCount,
      createSubscriptionEnabled: state.createSubscriptionEnabled,
      serverCheckoutSignatureVerification: true,
      liveWebhookSignatureVerification: true,
      accessUnlockAuthority: "verified_live_webhook_or_provider_reconcile",
      testParts112To117Preserved: true,
      cardOrUpiCredentialsTouchNaxoraServer: false,
      refundsFromNaxoraBlocked: true,
      manualMoneyTransferFromNaxoraBlocked: true,
      settlementHandledByRazorpay: true,
      page: "/live-subscriptions",
      webhookUrl:
        `${String(
          process.env.NAXORA_PUBLIC_BASE_URL ||
          "https://naxora-institute-os.onrender.com"
        ).replace(/\/$/, "")}/api/part1366/webhooks/razorpay-live`,
    });
  });

  app.get("/api/part1366/security-policy", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      ownerLoginRequiredForCheckout: true,
      adultLegalMerchantRequired: true,
      settlementBankConfirmationRequired: true,
      liveKeySecretNeverReturned: true,
      liveWebhookSecretNeverReturned: true,
      customerCardDataHandledOnlyByRazorpayCheckout: true,
      checkoutSignatureVerifiedServerSide: true,
      storedSubscriptionIdUsedForSignature: true,
      liveWebhookRawBodyVerification: true,
      duplicateWebhookProtection: true,
      accessUnlockRequiresActiveStatus: true,
      authenticatedOnlyDoesNotUnlock: true,
      duplicateCommercialSubscriptionBlocked: true,
      cancellationAndRefundNotAutomated: true,
      testModeEnvironmentPreserved: true,
    });
  });

  app.get("/api/part1366/plans", ownerOnly, async (req, res) => {
    try {
      const plans = await listProviderPlans();
      res.json({
        success: true,
        part: PART_NUMBER,
        count: plans.length,
        plans,
        launchEnabled: liveState().launchEnabled,
      });
    } catch (error) {
      res.status(error.httpStatus || 502).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "LIVE_PLAN_FETCH_FAILED",
        message: error.message,
      });
    }
  });

  app.get(
    "/api/part1366/subscription/current",
    ownerOnly,
    async (req, res) => {
      if (!dbReady()) {
        return res.status(503).json({
          success: false,
          part: PART_NUMBER,
          code: "DATABASE_REQUIRED",
          message: "MongoDB connection required.",
        });
      }

      const records = await models.Subscription.find({
        instituteId: req.part1366Owner.instituteId,
      }).sort({ createdAt: -1 }).limit(20).lean();

      res.json({
        success: true,
        part: PART_NUMBER,
        count: records.length,
        subscriptions: records.map(publicSubscription),
      });
    }
  );

  app.post(
    "/api/part1366/subscription/create",
    ownerOnly,
    rateLimitCreate,
    async (req, res) => {
      try {
        const result = await createLiveSubscription(
          models,
          req,
          req.body || {}
        );

        res.status(201).json({
          success: true,
          part: PART_NUMBER,
          subscription: publicSubscription(result.record),
          checkout: result.checkout,
          message:
            "Live Subscription created. Customer must complete Razorpay Checkout authorisation.",
          cardDataStoredByNaxora: false,
          accessUnlocked: false,
          accessUnlockWaitsForActiveWebhook: true,
        });
      } catch (error) {
        res.status(error.httpStatus || 500).json({
          success: false,
          part: PART_NUMBER,
          code: error.code || "LIVE_SUBSCRIPTION_CREATE_FAILED",
          message: error.message,
          currentSubscription: error.currentSubscription || null,
        });
      }
    }
  );

  app.post(
    "/api/part1366/subscription/verify",
    ownerOnly,
    async (req, res) => {
      try {
        const record = await verifyCheckout(
          models,
          req,
          req.body || {}
        );

        res.json({
          success: true,
          part: PART_NUMBER,
          subscription: publicSubscription(record),
          checkoutSignatureVerified: true,
          accessUnlocked: false,
          message:
            "Checkout signature verified. Active webhook ya provider reconcile ke baad paid access unlock hoga.",
        });
      } catch (error) {
        res.status(error.httpStatus || 500).json({
          success: false,
          part: PART_NUMBER,
          code: error.code || "LIVE_CHECKOUT_VERIFY_FAILED",
          message: error.message,
        });
      }
    }
  );

  app.post(
    "/api/part1366/subscription/:id/reconcile",
    ownerOnly,
    async (req, res) => {
      try {
        const result = await reconcile(
          models,
          req,
          req.params.id
        );

        res.json({
          success: true,
          part: PART_NUMBER,
          subscription: publicSubscription(result.record),
          access: result.access,
          message:
            "Live provider status reconciled. Active status par access snapshot updated.",
        });
      } catch (error) {
        res.status(error.httpStatus || 500).json({
          success: false,
          part: PART_NUMBER,
          code: error.code || "LIVE_RECONCILE_FAILED",
          message: error.message,
        });
      }
    }
  );

  app.post(
    "/api/part1366/webhooks/razorpay-live",
    async (req, res) => {
      let eventRecord = null;

      try {
        const secret = requireLiveWebhook();

        if (!dbReady()) {
          const error = new Error(
            "MongoDB connection required for Live webhook processing."
          );
          error.code = "DATABASE_REQUIRED";
          error.httpStatus = 503;
          throw error;
        }

        const rawBody = Buffer.isBuffer(req.rawBody)
          ? req.rawBody
          : null;

        if (!rawBody?.length) {
          const error = new Error(
            "Raw webhook body unavailable. Express JSON verify hook required."
          );
          error.code = "RAW_BODY_REQUIRED";
          error.httpStatus = 500;
          throw error;
        }

        const signature = cleanText(
          req.get("x-razorpay-signature") || "",
          256
        );

        if (!signature) {
          const error = new Error("X-Razorpay-Signature missing.");
          error.code = "WEBHOOK_SIGNATURE_MISSING";
          error.httpStatus = 400;
          throw error;
        }

        const expected = hmacHex(secret, rawBody);
        if (!safeEqualHex(expected, signature)) {
          const error = new Error(
            "Razorpay Live webhook signature invalid."
          );
          error.code = "INVALID_LIVE_WEBHOOK_SIGNATURE";
          error.httpStatus = 400;
          throw error;
        }

        const payloadDigest = sha256(rawBody);
        const body = req.body || {};
        const eventType = cleanText(body.event || "unknown", 100);
        const providerEventId =
          cleanText(req.get("x-razorpay-event-id") || "", 180) ||
          `digest_${payloadDigest}`;

        try {
          eventRecord = await models.Event.create({
            providerEventId,
            eventType,
            payloadDigest,
            signatureDigest: sha256(signature),
            processingStatus: "received",
          });
        } catch (error) {
          if (error?.code === 11000) {
            return res.status(200).json({
              success: true,
              part: PART_NUMBER,
              duplicate: true,
              message:
                "Duplicate Live webhook already processed; no repeated state change.",
            });
          }
          throw error;
        }

        if (!SUPPORTED_EVENTS.has(eventType)) {
          eventRecord.processingStatus = "ignored";
          eventRecord.processedAt = new Date();
          await eventRecord.save();

          return res.status(200).json({
            success: true,
            part: PART_NUMBER,
            ignored: true,
            eventType,
          });
        }

        const snapshot = safeWebhookSnapshot(
          eventType,
          body.payload || {}
        );
        const subscriptionId = cleanId(snapshot.subscription.id);

        eventRecord.safeSnapshot = snapshot;
        eventRecord.razorpaySubscriptionId = subscriptionId;

        if (!subscriptionId) {
          const error = new Error(
            "Subscription webhook did not contain subscription ID."
          );
          error.code = "SUBSCRIPTION_ID_MISSING";
          error.httpStatus = 400;
          throw error;
        }

        const local = await models.Subscription.findOne({
          razorpaySubscriptionId: subscriptionId,
        });

        if (!local) {
          eventRecord.processingStatus = "unmatched";
          eventRecord.processedAt = new Date();
          eventRecord.failureCode = "LOCAL_SUBSCRIPTION_NOT_FOUND";
          await eventRecord.save();

          return res.status(200).json({
            success: true,
            part: PART_NUMBER,
            matched: false,
            processingStatus: "unmatched",
          });
        }

        const status = mapEventStatus(
          eventType,
          snapshot.subscription,
          local.status
        );

        local.status = status;
        local.razorpayCustomerId =
          snapshot.subscription.customerId ||
          local.razorpayCustomerId;
        local.razorpayPaymentId =
          snapshot.payment?.id ||
          local.razorpayPaymentId;
        local.lastWebhookEventId = providerEventId;
        local.lastWebhookEventType = eventType;
        local.lastWebhookAt = new Date();
        local.currentStart = toDate(
          snapshot.subscription.currentStart
        );
        local.currentEnd = toDate(
          snapshot.subscription.currentEnd
        );
        local.paidCount = Number(
          snapshot.subscription.paidCount || 0
        );
        local.remainingCount = Number(
          snapshot.subscription.remainingCount || 0
        );
        local.providerSnapshot = {
          source: "verified_live_webhook",
          ...snapshot,
        };
        local.failureCode = "";
        local.failureMessage = "";
        await local.save();

        const access = await recalculateAccess(
          models,
          local.instituteId
        );

        eventRecord.instituteId = local.instituteId;
        eventRecord.processingStatus = "processed";
        eventRecord.resultingStatus = status;
        eventRecord.processedAt = new Date();
        await eventRecord.save();

        await audit(
          models,
          req,
          "live_subscription_webhook",
          "processed",
          "SIGNATURE_VERIFIED",
          {
            instituteId: local.instituteId,
            providerEventId,
            eventType,
            razorpaySubscriptionId: subscriptionId,
            resultingStatus: status,
            basePlanCode: access.basePlanCode,
          }
        );

        return res.status(200).json({
          success: true,
          part: PART_NUMBER,
          duplicate: false,
          matched: true,
          eventType,
          resultingStatus: status,
          accessUpdated: true,
        });
      } catch (error) {
        if (eventRecord) {
          eventRecord.processingStatus = "failed";
          eventRecord.failureCode = cleanText(
            error.code || "WEBHOOK_FAILED",
            100
          );
          eventRecord.processedAt = new Date();
          await eventRecord.save().catch(() => null);
        }

        return res.status(error.httpStatus || 500).json({
          success: false,
          part: PART_NUMBER,
          code: error.code || "LIVE_WEBHOOK_FAILED",
          message: error.message,
        });
      }
    }
  );

  app.get(
    "/api/part1366/webhook-health",
    ownerOnly,
    async (req, res) => {
      if (!dbReady()) {
        return res.status(503).json({
          success: false,
          part: PART_NUMBER,
          code: "DATABASE_REQUIRED",
          message: "MongoDB connection required.",
        });
      }

      const since = new Date(
        Date.now() - 24 * 60 * 60 * 1000
      );

      const [
        processed,
        failed,
        unmatched,
        latest,
      ] = await Promise.all([
        models.Event.countDocuments({
          instituteId: req.part1366Owner.instituteId,
          processingStatus: "processed",
          createdAt: { $gte: since },
        }),
        models.Event.countDocuments({
          instituteId: req.part1366Owner.instituteId,
          processingStatus: "failed",
          createdAt: { $gte: since },
        }),
        models.Event.countDocuments({
          processingStatus: "unmatched",
          createdAt: { $gte: since },
        }),
        models.Event.findOne({
          instituteId: req.part1366Owner.instituteId,
        }).sort({ createdAt: -1 }).lean(),
      ]);

      res.json({
        success: true,
        part: PART_NUMBER,
        window: "last_24_hours",
        processed,
        failed,
        unmatched,
        healthy: failed === 0,
        latestEvent: latest ? {
          eventType: latest.eventType,
          processingStatus: latest.processingStatus,
          resultingStatus: latest.resultingStatus,
          createdAt: latest.createdAt,
        } : null,
      });
    }
  );
}
