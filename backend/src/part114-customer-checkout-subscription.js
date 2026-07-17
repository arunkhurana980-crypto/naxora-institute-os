import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import Razorpay from "razorpay";

const PART_NUMBER = 114;
const PART_NAME = "Customer Checkout and Subscription Activation";
const OWNER_ROLES = new Set(["institute_owner", "owner", "instituteowner"]);
const CREATE_LIMIT = 5;
const CREATE_WINDOW_MS = 10 * 60 * 1000;
const createAttempts = new Map();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, "../../frontend");

function normalizeRole(value = "") {
  return String(value).trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function cleanId(value = "") {
  return String(value || "").trim().replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 140);
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
    const error = new Error("Valid test customer email required.");
    error.code = "INVALID_CUSTOMER_EMAIL";
    error.httpStatus = 400;
    throw error;
  }
  return email;
}

function cleanContact(value = "") {
  const contact = String(value || "").replace(/[^0-9+]/g, "").slice(0, 16);
  if (!/^\+?[0-9]{10,15}$/.test(contact)) {
    const error = new Error("Valid test contact number required, 10 to 15 digits.");
    error.code = "INVALID_CUSTOMER_CONTACT";
    error.httpStatus = 400;
    throw error;
  }
  return contact;
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
      // Try the next configured secret.
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
    const error = new Error("Institute owner login required.");
    error.code = "OWNER_LOGIN_REQUIRED";
    error.httpStatus = 401;
    throw error;
  }

  const role = normalizeRole(payload.role || payload.userRole || payload.accountRole || payload.user?.role || "");
  if (!OWNER_ROLES.has(role)) {
    const error = new Error("Only institute_owner can create and authorise a NAXORA subscription.");
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
    req.part114Owner = buildOwnerContext(req);
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

function rateLimitCreate(req, res, next) {
  const key = `${req.ip || "unknown"}:${req.part114Owner?.instituteId || "unknown"}`;
  const now = Date.now();
  const recent = (createAttempts.get(key) || []).filter((time) => now - time < CREATE_WINDOW_MS);
  if (recent.length >= CREATE_LIMIT) {
    return res.status(429).json({
      success: false,
      part: PART_NUMBER,
      code: "SUBSCRIPTION_CREATE_RATE_LIMIT",
      message: "10 minutes me maximum 5 Test Subscription create attempts allowed hain.",
    });
  }
  recent.push(now);
  createAttempts.set(key, recent);
  next();
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
    keyId,
    keyIdConfigured: Boolean(keyId),
    keySecretConfigured: Boolean(keySecret),
    testKeyLooksCorrect: !keyId || keyId.startsWith("rzp_test_"),
    missing,
    ready: Boolean(mode === "test" && keyId && keySecret && keyId.startsWith("rzp_test_")),
  };
}

function requireTestProviderReady() {
  const state = getRazorpayState();
  if (!state.testModeLocked) {
    const error = new Error("Part 114 me Live Mode locked hai. RAZORPAY_MODE=test rakhein.");
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

function parseTotalCount(value, period) {
  const totalCount = Number(value);
  const max = period === "yearly" ? 100 : 1200;
  if (!Number.isInteger(totalCount) || totalCount < 1 || totalCount > max) {
    const error = new Error(`Total billing cycles 1 se ${max} ke beech integer hone chahiye.`);
    error.code = "INVALID_TOTAL_COUNT";
    error.httpStatus = 400;
    throw error;
  }
  return totalCount;
}

function safeProviderError(error) {
  const status = Number(error?.statusCode || error?.status || 0);
  const providerDescription = cleanText(error?.error?.description || error?.description || "", 180);
  if (status === 401) return "Razorpay Test credentials invalid hain.";
  if (status === 400 && providerDescription) return `Razorpay ne Subscription reject ki: ${providerDescription}`;
  if (status === 429) return "Razorpay rate limit hit hui. Thodi der baad retry karein.";
  return "Razorpay Test Subscription request complete nahi hui. Private server logs check karein.";
}

function confirmationText(plan, totalCount) {
  return `CREATE TEST SUBSCRIPTION ${plan.planCode} ${totalCount} CYCLES`;
}

function createFingerprint(instituteId, planId, totalCount, email, contact) {
  return crypto.createHash("sha256")
    .update([instituteId, planId, totalCount, email, contact].join("|"))
    .digest("hex");
}

function digest(value = "") {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function requestId(req) {
  return digest(`${Date.now()}:${req.ip || ""}:${crypto.randomUUID()}`).slice(0, 20);
}

function safeEqualHex(a, b) {
  try {
    const left = Buffer.from(String(a || ""), "hex");
    const right = Buffer.from(String(b || ""), "hex");
    return left.length > 0 && left.length === right.length && crypto.timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

function defineModels() {
  const checkoutSchema = new mongoose.Schema({
    instituteId: { type: String, required: true, index: true },
    ownerUserId: { type: String, required: true },
    localPlanId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    planCode: { type: String, required: true },
    planName: { type: String, required: true },
    planPeriod: { type: String, enum: ["monthly", "yearly"], required: true },
    amountPaise: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    razorpayPlanId: { type: String, required: true },
    totalCount: { type: Number, required: true },
    quantity: { type: Number, default: 1 },
    customerNotify: { type: Boolean, default: false },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerContact: { type: String, required: true },
    testDataConfirmed: { type: Boolean, default: false },
    consentAccepted: { type: Boolean, default: false },
    fingerprint: { type: String, required: true },
    confirmationText: { type: String, required: true },
    status: {
      type: String,
      default: "preview_ready",
      enum: [
        "preview_ready",
        "creating",
        "provider_created",
        "checkout_opened",
        "signature_verified",
        "authenticated",
        "active",
        "pending",
        "halted",
        "cancelled",
        "completed",
        "expired",
        "provider_failed",
        "verification_failed",
      ],
    },
    razorpaySubscriptionId: { type: String, default: "", index: true },
    razorpayCustomerId: { type: String, default: "" },
    razorpayPaymentId: { type: String, default: "" },
    signatureDigest: { type: String, default: "" },
    signatureVerifiedAt: { type: Date, default: null },
    providerCreatedAt: { type: Date, default: null },
    providerStatusCheckedAt: { type: Date, default: null },
    providerSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    failureCode: { type: String, default: "" },
    failureMessage: { type: String, default: "" },
  }, { timestamps: true, strict: true });
  checkoutSchema.index({ instituteId: 1, fingerprint: 1 }, { unique: true });
  checkoutSchema.index({ instituteId: 1, razorpaySubscriptionId: 1 }, { sparse: true });

  const auditSchema = new mongoose.Schema({
    instituteId: { type: String, required: true, index: true },
    actorUserId: { type: String, default: "" },
    action: { type: String, required: true },
    result: { type: String, required: true },
    requestId: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  }, { timestamps: true, strict: true });

  return {
    Checkout: mongoose.models.Part114CheckoutSubscription || mongoose.model("Part114CheckoutSubscription", checkoutSchema),
    Audit: mongoose.models.Part114CheckoutAudit || mongoose.model("Part114CheckoutAudit", auditSchema),
  };
}

function getPart113PlanModel() {
  return mongoose.models.Part113NaxoraSubscriptionPlan || null;
}

async function writeAudit(Audit, req, action, result, details = {}) {
  if (!isDatabaseReady()) return { saved: false, reason: "database_not_connected" };
  try {
    await Audit.create({
      instituteId: req.part114Owner?.instituteId || "unknown",
      actorUserId: req.part114Owner?.userId || "unknown",
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

function publicPlan(plan) {
  return {
    id: String(plan._id),
    planCode: plan.planCode,
    name: plan.name,
    description: plan.description,
    period: plan.period,
    amountPaise: plan.amountPaise,
    amountRupees: (Number(plan.amountPaise || 0) / 100).toFixed(2),
    currency: plan.currency,
    razorpayPlanId: plan.razorpayPlanId,
    status: plan.status,
    defaultTotalCount: plan.period === "yearly" ? 1 : 12,
  };
}

function publicSubscription(record) {
  if (!record) return null;
  return {
    id: String(record._id),
    planCode: record.planCode,
    planName: record.planName,
    planPeriod: record.planPeriod,
    amountPaise: record.amountPaise,
    amountRupees: (Number(record.amountPaise || 0) / 100).toFixed(2),
    currency: record.currency,
    totalCount: record.totalCount,
    customerName: record.customerName,
    customerEmailMasked: record.customerEmail.replace(/^(.{2}).*(@.*)$/, "$1***$2"),
    customerContactMasked: `${record.customerContact.slice(0, 3)}******${record.customerContact.slice(-2)}`,
    status: record.status,
    razorpaySubscriptionId: record.razorpaySubscriptionId,
    signatureVerifiedAt: record.signatureVerifiedAt,
    providerStatusCheckedAt: record.providerStatusCheckedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function findEligiblePlan(req, localPlanId) {
  if (!isDatabaseReady()) {
    const error = new Error("MongoDB connection required.");
    error.code = "DATABASE_REQUIRED";
    error.httpStatus = 503;
    throw error;
  }
  const Plan = getPart113PlanModel();
  if (!Plan) {
    const error = new Error("Part 113 plan model not active. Part 113 routes and installer verify karein.");
    error.code = "PART113_DEPENDENCY_MISSING";
    error.httpStatus = 503;
    throw error;
  }
  const id = cleanId(localPlanId);
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error("Valid local plan ID required.");
    error.code = "INVALID_PLAN_ID";
    error.httpStatus = 400;
    throw error;
  }
  const plan = await Plan.findOne({
    _id: id,
    instituteId: req.part114Owner.instituteId,
    status: "provider_created",
    razorpayPlanId: { $ne: "" },
  });
  if (!plan) {
    const error = new Error("Confirmed Razorpay Test Plan not found for this institute.");
    error.code = "ELIGIBLE_PLAN_NOT_FOUND";
    error.httpStatus = 404;
    throw error;
  }
  return plan;
}

function buildPreviewInput(body, plan) {
  const customerName = cleanText(body.customerName, 100);
  if (customerName.length < 2) {
    const error = new Error("Test customer name required.");
    error.code = "CUSTOMER_NAME_REQUIRED";
    error.httpStatus = 400;
    throw error;
  }
  const customerEmail = cleanEmail(body.customerEmail);
  const customerContact = cleanContact(body.customerContact);
  const totalCount = parseTotalCount(body.totalCount, plan.period);
  if (body.consentAccepted !== true) {
    const error = new Error("Customer authorisation consent acknowledgement required.");
    error.code = "CONSENT_REQUIRED";
    error.httpStatus = 400;
    throw error;
  }
  if (body.testDataConfirmed !== true) {
    const error = new Error("Confirm karein ki Part 114 me Test Mode/test contact details use ho rahi hain.");
    error.code = "TEST_DATA_CONFIRMATION_REQUIRED";
    error.httpStatus = 400;
    throw error;
  }
  return { customerName, customerEmail, customerContact, totalCount };
}

async function createPreview(models, req, body) {
  const plan = await findEligiblePlan(req, body.localPlanId);
  const input = buildPreviewInput(body, plan);
  const fingerprint = createFingerprint(
    req.part114Owner.instituteId,
    String(plan._id),
    input.totalCount,
    input.customerEmail,
    input.customerContact
  );
  const expectedConfirmation = confirmationText(plan, input.totalCount);

  let record = await models.Checkout.findOne({
    instituteId: req.part114Owner.instituteId,
    fingerprint,
  });
  let duplicate = Boolean(record);

  if (!record) {
    record = await models.Checkout.create({
      instituteId: req.part114Owner.instituteId,
      ownerUserId: req.part114Owner.userId,
      localPlanId: plan._id,
      planCode: plan.planCode,
      planName: plan.name,
      planPeriod: plan.period,
      amountPaise: plan.amountPaise,
      currency: plan.currency || "INR",
      razorpayPlanId: plan.razorpayPlanId,
      totalCount: input.totalCount,
      quantity: 1,
      customerNotify: false,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerContact: input.customerContact,
      testDataConfirmed: true,
      consentAccepted: true,
      fingerprint,
      confirmationText: expectedConfirmation,
      status: "preview_ready",
    });
  }

  await writeAudit(models.Audit, req, "subscription_checkout_preview", "success", {
    localSubscriptionId: String(record._id),
    planCode: record.planCode,
    totalCount: record.totalCount,
    duplicate,
  });

  return { record, duplicate };
}

async function createProviderSubscription(models, req, body) {
  requireTestProviderReady();
  if (!isDatabaseReady()) {
    const error = new Error("MongoDB connection required.");
    error.code = "DATABASE_REQUIRED";
    error.httpStatus = 503;
    throw error;
  }

  const id = cleanId(body.localSubscriptionId);
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error("Valid local subscription preview ID required.");
    error.code = "INVALID_SUBSCRIPTION_PREVIEW_ID";
    error.httpStatus = 400;
    throw error;
  }

  const record = await models.Checkout.findOne({
    _id: id,
    instituteId: req.part114Owner.instituteId,
  });
  if (!record) {
    const error = new Error("Subscription preview not found.");
    error.code = "SUBSCRIPTION_PREVIEW_NOT_FOUND";
    error.httpStatus = 404;
    throw error;
  }

  if (record.razorpaySubscriptionId) {
    return { record, idempotent: true };
  }

  if (String(body.confirmationText || "").trim() !== record.confirmationText) {
    const error = new Error(`Exact confirmation required: ${record.confirmationText}`);
    error.code = "EXACT_CONFIRMATION_REQUIRED";
    error.httpStatus = 400;
    throw error;
  }

  const claimed = await models.Checkout.findOneAndUpdate(
    {
      _id: record._id,
      instituteId: req.part114Owner.instituteId,
      status: { $in: ["preview_ready", "provider_failed"] },
      razorpaySubscriptionId: "",
    },
    { $set: { status: "creating", failureCode: "", failureMessage: "" } },
    { new: true }
  );

  if (!claimed) {
    const current = await models.Checkout.findById(record._id);
    if (current?.razorpaySubscriptionId) return { record: current, idempotent: true };
    const error = new Error("Subscription creation already running or record state invalid.");
    error.code = "SUBSCRIPTION_CREATE_IN_PROGRESS";
    error.httpStatus = 409;
    throw error;
  }

  try {
    const client = getRazorpayClient();
    const providerSubscription = await client.subscriptions.create({
      plan_id: claimed.razorpayPlanId,
      total_count: claimed.totalCount,
      quantity: 1,
      customer_notify: false,
      notes: {
        naxora_part: String(PART_NUMBER),
        naxora_mode: "test",
        naxora_institute_id: claimed.instituteId,
        naxora_plan_code: claimed.planCode,
        naxora_local_subscription_id: String(claimed._id),
      },
    });

    claimed.razorpaySubscriptionId = cleanText(providerSubscription?.id || "", 140);
    claimed.razorpayCustomerId = cleanText(providerSubscription?.customer_id || "", 140);
    claimed.status = providerSubscription?.status || "provider_created";
    claimed.providerCreatedAt = new Date();
    claimed.providerStatusCheckedAt = new Date();
    claimed.providerSnapshot = {
      id: providerSubscription?.id || "",
      entity: providerSubscription?.entity || "subscription",
      plan_id: providerSubscription?.plan_id || claimed.razorpayPlanId,
      status: providerSubscription?.status || "created",
      total_count: providerSubscription?.total_count ?? claimed.totalCount,
      paid_count: providerSubscription?.paid_count ?? 0,
      remaining_count: providerSubscription?.remaining_count ?? claimed.totalCount,
      customer_id: providerSubscription?.customer_id || "",
      created_at: providerSubscription?.created_at || null,
      charge_at: providerSubscription?.charge_at || null,
    };
    await claimed.save();

    await writeAudit(models.Audit, req, "razorpay_test_subscription_create", "success", {
      localSubscriptionId: String(claimed._id),
      razorpaySubscriptionId: claimed.razorpaySubscriptionId,
      planCode: claimed.planCode,
      totalCount: claimed.totalCount,
    });

    return { record: claimed, idempotent: false };
  } catch (error) {
    const message = safeProviderError(error);
    claimed.status = "provider_failed";
    claimed.failureCode = cleanText(error?.error?.code || error?.code || "PROVIDER_ERROR", 80);
    claimed.failureMessage = message;
    await claimed.save().catch(() => null);
    await writeAudit(models.Audit, req, "razorpay_test_subscription_create", "failed", {
      localSubscriptionId: String(claimed._id),
      providerStatus: Number(error?.statusCode || error?.status || 0),
    });
    const wrapped = new Error(message);
    wrapped.code = "RAZORPAY_SUBSCRIPTION_CREATE_FAILED";
    wrapped.httpStatus = 502;
    throw wrapped;
  }
}

async function fetchProviderStatus(record) {
  const client = getRazorpayClient();
  const subscription = await client.subscriptions.fetch(record.razorpaySubscriptionId);
  record.status = cleanText(subscription?.status || record.status, 40);
  record.razorpayCustomerId = cleanText(subscription?.customer_id || record.razorpayCustomerId, 140);
  record.providerStatusCheckedAt = new Date();
  record.providerSnapshot = {
    id: subscription?.id || record.razorpaySubscriptionId,
    entity: subscription?.entity || "subscription",
    plan_id: subscription?.plan_id || record.razorpayPlanId,
    status: subscription?.status || record.status,
    total_count: subscription?.total_count ?? record.totalCount,
    paid_count: subscription?.paid_count ?? 0,
    remaining_count: subscription?.remaining_count ?? null,
    customer_id: subscription?.customer_id || "",
    current_start: subscription?.current_start || null,
    current_end: subscription?.current_end || null,
    charge_at: subscription?.charge_at || null,
    created_at: subscription?.created_at || null,
  };
  await record.save();
  return subscription;
}

function parseVaniCommand(command = "") {
  const text = String(command || "").trim().toLowerCase();
  const planCode = /professional/.test(text) ? "PROFESSIONAL"
    : /business/.test(text) ? "BUSINESS"
      : /(v3|3\.0|ai plan|os 3)/.test(text) ? "V3_AI"
        : /starter/.test(text) ? "STARTER" : "";
  const countMatch = text.match(/(\d+)\s*(?:cycle|cycles|month|months|year|years|baar)/);
  return {
    text,
    planCode,
    totalCount: countMatch ? Number(countMatch[1]) : null,
    list: /(subscription|checkout).*(dikhao|show|list)|list.*subscription/.test(text),
    status: /status|active|authenticated|verify|refresh/.test(text),
    create: /checkout|subscription.*(banao|create|ready)|authorise|authorize/.test(text),
  };
}

export function registerPart114CustomerCheckout({ app } = {}) {
  if (!app || typeof app.get !== "function" || typeof app.post !== "function") {
    throw new Error("Part 114 registration failed: Express app is required.");
  }
  if (app.locals.part114CustomerCheckoutRegistered) return;
  app.locals.part114CustomerCheckoutRegistered = true;

  const models = defineModels();

  app.get(["/subscription-checkout", "/customer-subscription-checkout", "/part114"], (req, res) => {
    res.sendFile(path.join(frontendDir, "customer-subscription-checkout.html"));
  });
  app.get("/customer-subscription-checkout.css", (req, res) => {
    res.type("text/css").sendFile(path.join(frontendDir, "customer-subscription-checkout.css"));
  });
  app.get("/customer-subscription-checkout.js", (req, res) => {
    res.type("application/javascript").sendFile(path.join(frontendDir, "customer-subscription-checkout.js"));
  });

  app.get("/api/part114/status", (req, res) => {
    const provider = getRazorpayState();
    res.json({
      success: true,
      part: PART_NUMBER,
      name: PART_NAME,
      status: "active_test_checkout",
      testModeLocked: provider.testModeLocked,
      providerReady: provider.ready,
      databaseConnected: isDatabaseReady(),
      planDependencyReady: Boolean(getPart113PlanModel()),
      testSubscriptionCreationEnabled: provider.ready && isDatabaseReady() && Boolean(getPart113PlanModel()),
      checkoutEnabled: provider.ready,
      serverSignatureVerificationEnabled: true,
      liveModeEnabled: false,
      realMoneyCollectionEnabled: false,
      webhookAuthorityEnabled: false,
      featureAccessUnlockEnabled: false,
      nextPart: 115,
      nextPartName: "Secure Webhooks and Status Sync",
    });
  });

  app.get("/api/part114/security-policy", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      ownerLoginRequired: true,
      instituteIdMatchRequired: true,
      testModeOnly: true,
      testContactDataRecommended: true,
      customerConsentRequired: true,
      exactConfirmationRequired: true,
      customerCheckoutInteractionRequired: true,
      serverSignatureVerificationRequired: true,
      storedSubscriptionIdUsedForSignature: true,
      returnedSubscriptionIdMustMatchStoredId: true,
      providerSecretsNeverReturned: true,
      paymentCardOrUpiDataNeverTouchesNaxoraServer: true,
      liveModeBlocked: true,
      refundsBlocked: true,
      cancellationBlockedUntilControlledManagementPart: true,
      webhookAuthorityPendingPart115: true,
      featureAccessUnlockPendingPart116: true,
    });
  });

  app.get("/api/part114/plans", ownerOnly, async (req, res) => {
    if (!isDatabaseReady()) {
      return res.status(503).json({ success: false, part: PART_NUMBER, code: "DATABASE_REQUIRED", message: "MongoDB connection required." });
    }
    const Plan = getPart113PlanModel();
    if (!Plan) {
      return res.status(503).json({ success: false, part: PART_NUMBER, code: "PART113_DEPENDENCY_MISSING", message: "Part 113 plan model not active." });
    }
    const plans = await Plan.find({
      instituteId: req.part114Owner.instituteId,
      status: "provider_created",
      razorpayPlanId: { $ne: "" },
    }).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ success: true, part: PART_NUMBER, count: plans.length, plans: plans.map(publicPlan) });
  });

  app.get("/api/part114/subscriptions/local", ownerOnly, async (req, res) => {
    if (!isDatabaseReady()) {
      return res.status(503).json({ success: false, part: PART_NUMBER, code: "DATABASE_REQUIRED", message: "MongoDB connection required." });
    }
    const records = await models.Checkout.find({ instituteId: req.part114Owner.instituteId })
      .sort({ createdAt: -1 }).limit(100).lean();
    res.json({ success: true, part: PART_NUMBER, count: records.length, subscriptions: records.map(publicSubscription) });
  });

  app.post("/api/part114/subscription/preview", ownerOnly, async (req, res) => {
    try {
      const result = await createPreview(models, req, req.body || {});
      res.json({
        success: true,
        part: PART_NUMBER,
        duplicate: result.duplicate,
        preview: publicSubscription(result.record),
        confirmationTextRequired: result.record.confirmationText,
        needsConfirmation: !result.record.razorpaySubscriptionId,
        customerMustAuthoriseInRazorpayCheckout: true,
        customerNotify: false,
        warnings: [
          "Part 114 Test Mode only hai.",
          "Razorpay Checkout me customer khud authorisation complete karega.",
          "NAXORA card, UPI PIN, CVV ya bank credentials receive nahi karega.",
          "Final recurring status automation Part 115 webhooks ke baad authoritative hogi.",
        ],
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "SUBSCRIPTION_PREVIEW_FAILED",
        message: error.message,
      });
    }
  });

  app.post("/api/part114/subscription/create-confirmed", ownerOnly, rateLimitCreate, async (req, res) => {
    try {
      const result = await createProviderSubscription(models, req, req.body || {});
      res.json({
        success: true,
        part: PART_NUMBER,
        idempotent: result.idempotent,
        message: result.idempotent
          ? "Existing Razorpay Test Subscription returned; duplicate create nahi hua."
          : "Razorpay Test Subscription created. Customer Checkout authorisation ab pending hai.",
        subscription: publicSubscription(result.record),
        checkoutReady: Boolean(result.record.razorpaySubscriptionId),
        realMoneyMoved: false,
        featureAccessUnlocked: false,
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "SUBSCRIPTION_CREATE_FAILED",
        message: error.message,
        realMoneyMoved: false,
      });
    }
  });

  app.get("/api/part114/checkout/options/:id", ownerOnly, async (req, res) => {
    try {
      const state = requireTestProviderReady();
      if (!isDatabaseReady()) throw Object.assign(new Error("MongoDB connection required."), { code: "DATABASE_REQUIRED", httpStatus: 503 });
      const id = cleanId(req.params.id);
      if (!mongoose.isValidObjectId(id)) throw Object.assign(new Error("Invalid local subscription ID."), { code: "INVALID_SUBSCRIPTION_ID", httpStatus: 400 });
      const record = await models.Checkout.findOne({ _id: id, instituteId: req.part114Owner.instituteId });
      if (!record || !record.razorpaySubscriptionId) throw Object.assign(new Error("Created Test Subscription not found."), { code: "SUBSCRIPTION_NOT_READY", httpStatus: 404 });

      if (record.status === "provider_created" || record.status === "created") {
        record.status = "checkout_opened";
        await record.save();
      }

      res.json({
        success: true,
        part: PART_NUMBER,
        localSubscriptionId: String(record._id),
        options: {
          key: state.keyId,
          subscription_id: record.razorpaySubscriptionId,
          name: "NAXORA Institute OS",
          description: `${record.planName} • ${record.totalCount} billing cycles • TEST MODE`,
          prefill: {
            name: record.customerName,
            email: record.customerEmail,
            contact: record.customerContact,
          },
          notes: {
            naxora_institute_id: record.instituteId,
            naxora_plan_code: record.planCode,
          },
          theme: { color: "#0B6CFB" },
        },
        keySecretReturned: false,
        testMode: true,
        customerAuthorisationRequired: true,
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({ success: false, part: PART_NUMBER, code: error.code || "CHECKOUT_OPTIONS_FAILED", message: error.message });
    }
  });

  app.post("/api/part114/checkout/verify", ownerOnly, async (req, res) => {
    try {
      requireTestProviderReady();
      if (!isDatabaseReady()) throw Object.assign(new Error("MongoDB connection required."), { code: "DATABASE_REQUIRED", httpStatus: 503 });

      const id = cleanId(req.body?.localSubscriptionId);
      if (!mongoose.isValidObjectId(id)) throw Object.assign(new Error("Invalid local subscription ID."), { code: "INVALID_SUBSCRIPTION_ID", httpStatus: 400 });
      const record = await models.Checkout.findOne({ _id: id, instituteId: req.part114Owner.instituteId });
      if (!record || !record.razorpaySubscriptionId) throw Object.assign(new Error("Created Test Subscription not found."), { code: "SUBSCRIPTION_NOT_READY", httpStatus: 404 });

      const paymentId = cleanText(req.body?.razorpay_payment_id || "", 140);
      const returnedSubscriptionId = cleanText(req.body?.razorpay_subscription_id || "", 140);
      const signature = cleanText(req.body?.razorpay_signature || "", 256);
      if (!paymentId || !returnedSubscriptionId || !signature) {
        throw Object.assign(new Error("Checkout response fields missing."), { code: "CHECKOUT_RESPONSE_INCOMPLETE", httpStatus: 400 });
      }
      if (returnedSubscriptionId !== record.razorpaySubscriptionId) {
        record.status = "verification_failed";
        record.failureCode = "SUBSCRIPTION_ID_MISMATCH";
        record.failureMessage = "Returned subscription ID did not match the server-created ID.";
        await record.save();
        await writeAudit(models.Audit, req, "subscription_checkout_signature", "blocked_id_mismatch", { localSubscriptionId: String(record._id) });
        throw Object.assign(new Error("Checkout subscription ID mismatch. Activation rejected."), { code: "SUBSCRIPTION_ID_MISMATCH", httpStatus: 400 });
      }

      const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${paymentId}|${record.razorpaySubscriptionId}`)
        .digest("hex");

      if (!safeEqualHex(expected, signature)) {
        record.status = "verification_failed";
        record.failureCode = "INVALID_RAZORPAY_SIGNATURE";
        record.failureMessage = "Server-side signature verification failed.";
        await record.save();
        await writeAudit(models.Audit, req, "subscription_checkout_signature", "failed", { localSubscriptionId: String(record._id) });
        throw Object.assign(new Error("Razorpay signature verification failed. Subscription activation rejected."), { code: "INVALID_RAZORPAY_SIGNATURE", httpStatus: 400 });
      }

      record.razorpayPaymentId = paymentId;
      record.signatureDigest = digest(signature);
      record.signatureVerifiedAt = new Date();
      record.status = "signature_verified";
      record.failureCode = "";
      record.failureMessage = "";
      await record.save();

      let providerStatus = "signature_verified";
      try {
        const provider = await fetchProviderStatus(record);
        providerStatus = provider?.status || record.status;
      } catch (providerError) {
        // Signature is valid. Provider refresh can be retried without changing that result.
        record.providerStatusCheckedAt = new Date();
        await record.save().catch(() => null);
      }

      await writeAudit(models.Audit, req, "subscription_checkout_signature", "success", {
        localSubscriptionId: String(record._id),
        razorpaySubscriptionId: record.razorpaySubscriptionId,
        providerStatus,
      });

      res.json({
        success: true,
        part: PART_NUMBER,
        message: "Checkout signature verified. Razorpay Test Subscription state recorded.",
        subscription: publicSubscription(record),
        providerStatus,
        signatureVerified: true,
        activationRecorded: ["authenticated", "active"].includes(providerStatus),
        featureAccessUnlocked: false,
        webhookConfirmationPending: true,
        realMoneyMoved: false,
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "CHECKOUT_VERIFICATION_FAILED",
        message: error.message,
        activationRecorded: false,
        featureAccessUnlocked: false,
      });
    }
  });

  app.post("/api/part114/subscription/:id/refresh", ownerOnly, async (req, res) => {
    try {
      requireTestProviderReady();
      if (!isDatabaseReady()) throw Object.assign(new Error("MongoDB connection required."), { code: "DATABASE_REQUIRED", httpStatus: 503 });
      const id = cleanId(req.params.id);
      if (!mongoose.isValidObjectId(id)) throw Object.assign(new Error("Invalid local subscription ID."), { code: "INVALID_SUBSCRIPTION_ID", httpStatus: 400 });
      const record = await models.Checkout.findOne({ _id: id, instituteId: req.part114Owner.instituteId });
      if (!record || !record.razorpaySubscriptionId) throw Object.assign(new Error("Provider subscription not found."), { code: "SUBSCRIPTION_NOT_READY", httpStatus: 404 });
      const provider = await fetchProviderStatus(record);
      await writeAudit(models.Audit, req, "subscription_status_refresh", "success", {
        localSubscriptionId: String(record._id),
        providerStatus: provider?.status || record.status,
      });
      res.json({
        success: true,
        part: PART_NUMBER,
        subscription: publicSubscription(record),
        providerStatus: provider?.status || record.status,
        featureAccessUnlocked: false,
        webhookAuthorityPending: true,
      });
    } catch (error) {
      res.status(error.httpStatus || 502).json({ success: false, part: PART_NUMBER, code: error.code || "SUBSCRIPTION_REFRESH_FAILED", message: safeProviderError(error) });
    }
  });

  app.post("/api/part114/vani/command", ownerOnly, async (req, res) => {
    const command = cleanText(req.body?.command || "", 500);
    if (!command) return res.status(400).json({ success: false, part: PART_NUMBER, message: "VANI command required." });
    const parsed = parseVaniCommand(command);

    if (/secret|api key|key secret|password|cvv|upi pin|otp|bank|card number/.test(parsed.text)) {
      await writeAudit(models.Audit, req, "vani_sensitive_checkout_request", "blocked", {});
      return res.json({
        success: true,
        part: PART_NUMBER,
        replyText: "CVV, OTP, UPI PIN, card number, bank credentials aur API Secret VANI ko mat boliye. Payment authorisation sirf Razorpay Checkout ke private screen par hogi.",
        spokenSafeSummary: "Payment credentials private Razorpay screen par hi enter hongi.",
        actionExecuted: false,
        privateScreenFirst: true,
      });
    }

    if (/live mode|real payment|real money|go live/.test(parsed.text)) {
      return res.json({
        success: true,
        part: PART_NUMBER,
        replyText: "Part 114 me Live Mode locked hai. Sirf Test Subscription aur Test Checkout available hain.",
        spokenSafeSummary: "Live payment abhi safety lock me hai.",
        actionExecuted: false,
      });
    }

    if (parsed.list || parsed.status) {
      if (!isDatabaseReady()) return res.status(503).json({ success: false, part: PART_NUMBER, message: "MongoDB connection required." });
      const records = await models.Checkout.find({ instituteId: req.part114Owner.instituteId }).sort({ createdAt: -1 }).limit(20).lean();
      return res.json({
        success: true,
        part: PART_NUMBER,
        replyText: `${records.length} Test Subscription records mile. Sensitive details private screen par hain.`,
        spokenSafeSummary: `${records.length} Test Subscription records mile.`,
        privateScreenDetails: records.map(publicSubscription),
        actionExecuted: false,
      });
    }

    if (parsed.create) {
      const missing = [];
      if (!parsed.planCode) missing.push("plan name");
      if (!parsed.totalCount) missing.push("billing cycle count");
      missing.push("test customer name, email and contact");
      missing.push("customer consent acknowledgement");
      return res.json({
        success: true,
        part: PART_NUMBER,
        replyText: `Checkout preview ke liye ${missing.join(", ")} chahiye. Main details collect karke preview banaungi; customer authorisation khud Razorpay Checkout me karega.`,
        spokenSafeSummary: "Checkout preview ke liye kuch details aur customer consent chahiye.",
        detected: { planCode: parsed.planCode, totalCount: parsed.totalCount },
        missingDetails: missing,
        nextAction: "Open Part 114 private checkout form",
        actionExecuted: false,
      });
    }

    const state = getRazorpayState();
    res.json({
      success: true,
      part: PART_NUMBER,
      replyText: state.ready
        ? "Razorpay Test Checkout ready hai. Pehle confirmed Test Plan select karein, customer details aur cycle count dein, preview confirm karein, phir customer Razorpay screen par authorise karega."
        : `Razorpay Test setup pending hai: ${state.missing.join(", ") || "Test Key ID format"}.`,
      spokenSafeSummary: state.ready ? "Test Checkout foundation ready hai." : "Razorpay Test setup pending hai.",
      actionExecuted: false,
    });
  });

  app.get("/api/part114/demo", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      name: PART_NAME,
      page: "/subscription-checkout",
      flow: [
        "Select confirmed Part 113 Test Plan",
        "Enter test customer details and cycle count",
        "Preview and exact owner confirmation",
        "Create Razorpay Test Subscription",
        "Customer authorises in Razorpay Checkout",
        "Server verifies signature using stored subscription ID",
        "Provider status recorded; webhook authority remains Part 115",
      ],
      safety: {
        testModeOnly: true,
        cardDataHandledByRazorpayOnly: true,
        signatureVerificationRequired: true,
        realMoneyMoved: false,
        featureAccessUnlocked: false,
      },
    });
  });
}
