import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import Razorpay from "razorpay";

const PART_NUMBER = 115;
const PART_NAME = "Secure Razorpay Webhooks and Subscription Status Sync";
const OWNER_ROLES = new Set(["institute_owner", "owner", "instituteowner"]);
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
const EVENT_DEFAULT_STATUS = {
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
};
const LOCAL_STATUS_ALLOWLIST = new Set([
  "created",
  "authenticated",
  "active",
  "pending",
  "halted",
  "cancelled",
  "completed",
  "paused",
  "expired",
  "signature_verified",
]);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, "../../frontend");

function normalizeRole(value = "") {
  return String(value).trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function cleanId(value = "") {
  return String(value || "").trim().replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 180);
}

function cleanText(value = "", max = 255) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
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
      // Try the next existing configured secret.
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
    const error = new Error("Only institute_owner can view webhook and subscription sync controls.");
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
    req.part115Owner = buildOwnerContext(req);
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

function getProviderState() {
  const mode = String(process.env.RAZORPAY_MODE || "test").trim().toLowerCase();
  const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
  const webhookSecret = String(process.env.RAZORPAY_WEBHOOK_SECRET || "").trim();
  return {
    mode,
    testModeLocked: mode === "test",
    keyIdConfigured: Boolean(keyId),
    keySecretConfigured: Boolean(keySecret),
    webhookSecretConfigured: Boolean(webhookSecret),
    apiReady: Boolean(mode === "test" && keyId.startsWith("rzp_test_") && keySecret),
    webhookReady: Boolean(mode === "test" && webhookSecret),
  };
}

function requireTestWebhookReady() {
  const state = getProviderState();
  if (!state.testModeLocked) {
    const error = new Error("Part 115 me Live Mode locked hai. RAZORPAY_MODE=test rakhein.");
    error.code = "LIVE_MODE_LOCKED";
    error.httpStatus = 423;
    throw error;
  }
  if (!state.webhookSecretConfigured) {
    const error = new Error("RAZORPAY_WEBHOOK_SECRET Render Environment me configure karein.");
    error.code = "WEBHOOK_SECRET_MISSING";
    error.httpStatus = 503;
    throw error;
  }
  return state;
}

function requireTestApiReady() {
  const state = getProviderState();
  if (!state.testModeLocked) {
    const error = new Error("Part 115 me Live Mode locked hai.");
    error.code = "LIVE_MODE_LOCKED";
    error.httpStatus = 423;
    throw error;
  }
  if (!state.apiReady) {
    const error = new Error("Razorpay Test API credentials incomplete hain.");
    error.code = "TEST_API_NOT_READY";
    error.httpStatus = 412;
    throw error;
  }
  return state;
}

function getRazorpayClient() {
  requireTestApiReady();
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

function publicBaseUrl(req) {
  const configured = String(process.env.NAXORA_PUBLIC_BASE_URL || "").trim().replace(/\/$/, "");
  if (configured) return configured;
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const protocol = forwardedProto || req.protocol || "https";
  const host = req.get("host");
  return host ? `${protocol}://${host}` : "https://naxora-institute-os.onrender.com";
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hmacHex(secret, rawBody) {
  return crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
}

function safeEqualHex(leftHex, rightHex) {
  try {
    const left = Buffer.from(String(leftHex || ""), "hex");
    const right = Buffer.from(String(rightHex || ""), "hex");
    return left.length > 0 && left.length === right.length && crypto.timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

function unixToDate(value) {
  const seconds = Number(value || 0);
  return Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000) : null;
}

function dateToUnixMs(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function eventStatus(eventType, subscriptionEntity, currentStatus = "") {
  const entityStatus = cleanText(subscriptionEntity?.status || "", 40).toLowerCase();
  if (LOCAL_STATUS_ALLOWLIST.has(entityStatus)) return entityStatus;
  const mapped = EVENT_DEFAULT_STATUS[eventType] || "";
  if (LOCAL_STATUS_ALLOWLIST.has(mapped)) return mapped;
  return LOCAL_STATUS_ALLOWLIST.has(currentStatus) ? currentStatus : "created";
}

function compactSnapshot(eventType, payload) {
  const subscription = payload?.subscription?.entity || {};
  const payment = payload?.payment?.entity || {};
  const invoice = payload?.invoice?.entity || {};
  return {
    event: eventType,
    subscription: {
      id: cleanId(subscription.id),
      planId: cleanId(subscription.plan_id),
      customerId: cleanId(subscription.customer_id),
      status: cleanText(subscription.status, 40),
      quantity: Number(subscription.quantity || 1),
      totalCount: Number(subscription.total_count || 0),
      paidCount: Number(subscription.paid_count || 0),
      remainingCount: Number(subscription.remaining_count || 0),
      currentStart: subscription.current_start || null,
      currentEnd: subscription.current_end || null,
      endedAt: subscription.ended_at || null,
      chargeAt: subscription.charge_at || null,
    },
    payment: payment.id ? {
      id: cleanId(payment.id),
      status: cleanText(payment.status, 40),
      amount: Number(payment.amount || 0),
      currency: cleanText(payment.currency || "INR", 10),
      invoiceId: cleanId(payment.invoice_id),
    } : null,
    invoice: invoice.id ? {
      id: cleanId(invoice.id),
      status: cleanText(invoice.status, 40),
      amount: Number(invoice.amount || 0),
      amountPaid: Number(invoice.amount_paid || 0),
      amountDue: Number(invoice.amount_due || 0),
      currency: cleanText(invoice.currency || "INR", 10),
    } : null,
  };
}

function defineModels() {
  const eventSchema = new mongoose.Schema({
    provider: { type: String, default: "razorpay", enum: ["razorpay"] },
    providerEventId: { type: String, required: true, unique: true, index: true },
    payloadDigest: { type: String, required: true, index: true },
    signatureDigest: { type: String, required: true },
    eventType: { type: String, required: true, index: true },
    eventCreatedAt: { type: Date, default: null, index: true },
    receivedAt: { type: Date, default: Date.now },
    processedAt: { type: Date, default: null },
    processingStatus: {
      type: String,
      default: "received",
      enum: ["received", "processed", "duplicate", "ignored", "unmatched", "out_of_order_ignored", "failed"],
      index: true,
    },
    instituteId: { type: String, default: "", index: true },
    localSubscriptionId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    razorpaySubscriptionId: { type: String, default: "", index: true },
    safeSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
    failureCode: { type: String, default: "" },
    failureMessage: { type: String, default: "" },
  }, { timestamps: true, strict: true });

  const syncSchema = new mongoose.Schema({
    instituteId: { type: String, required: true, index: true },
    localSubscriptionId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    razorpaySubscriptionId: { type: String, required: true, unique: true, index: true },
    razorpayPlanId: { type: String, default: "" },
    currentStatus: { type: String, default: "created", index: true },
    lastEventId: { type: String, default: "" },
    lastEventType: { type: String, default: "" },
    lastEventCreatedAt: { type: Date, default: null },
    lastProcessedAt: { type: Date, default: null },
    lastPaymentId: { type: String, default: "" },
    lastInvoiceId: { type: String, default: "" },
    customerId: { type: String, default: "" },
    totalCount: { type: Number, default: 0 },
    paidCount: { type: Number, default: 0 },
    remainingCount: { type: Number, default: 0 },
    currentStart: { type: Date, default: null },
    currentEnd: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    accessCandidate: { type: Boolean, default: false },
    accessUnlockApplied: { type: Boolean, default: false },
    source: { type: String, default: "webhook" },
  }, { timestamps: true, strict: true });

  const auditSchema = new mongoose.Schema({
    instituteId: { type: String, required: true, index: true },
    actorUserId: { type: String, default: "system" },
    action: { type: String, required: true },
    result: { type: String, required: true },
    requestId: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  }, { timestamps: true, strict: true });

  return {
    Event: mongoose.models.Part115RazorpayWebhookEvent || mongoose.model("Part115RazorpayWebhookEvent", eventSchema),
    Sync: mongoose.models.Part115SubscriptionSyncState || mongoose.model("Part115SubscriptionSyncState", syncSchema),
    Audit: mongoose.models.Part115WebhookAudit || mongoose.model("Part115WebhookAudit", auditSchema),
  };
}

function getPart114Model() {
  return mongoose.models.Part114CheckoutSubscription || null;
}

function requestId(req) {
  return sha256(`${Date.now()}:${req.ip || ""}:${crypto.randomUUID()}`).slice(0, 20);
}

async function writeAudit(Audit, req, action, result, details = {}) {
  if (!isDatabaseReady()) return { saved: false, reason: "database_not_connected" };
  try {
    await Audit.create({
      instituteId: req.part115Owner?.instituteId || details.instituteId || "system",
      actorUserId: req.part115Owner?.userId || "system",
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

function publicEvent(event) {
  return {
    id: String(event._id),
    eventType: event.eventType,
    providerEventId: event.providerEventId,
    processingStatus: event.processingStatus,
    razorpaySubscriptionId: event.razorpaySubscriptionId,
    eventCreatedAt: event.eventCreatedAt,
    receivedAt: event.receivedAt,
    processedAt: event.processedAt,
    safeSnapshot: event.safeSnapshot,
    failureCode: event.failureCode,
    failureMessage: event.failureMessage,
  };
}

function publicSync(sync) {
  return {
    id: String(sync._id),
    localSubscriptionId: String(sync.localSubscriptionId),
    razorpaySubscriptionId: sync.razorpaySubscriptionId,
    razorpayPlanId: sync.razorpayPlanId,
    currentStatus: sync.currentStatus,
    lastEventType: sync.lastEventType,
    lastEventCreatedAt: sync.lastEventCreatedAt,
    lastProcessedAt: sync.lastProcessedAt,
    paidCount: sync.paidCount,
    remainingCount: sync.remainingCount,
    currentStart: sync.currentStart,
    currentEnd: sync.currentEnd,
    endedAt: sync.endedAt,
    accessCandidate: sync.accessCandidate,
    accessUnlockApplied: false,
    source: sync.source,
  };
}

async function processVerifiedEvent(models, req, eventRecord, body) {
  const eventType = cleanText(body?.event || "", 100);
  if (!SUPPORTED_EVENTS.has(eventType)) {
    eventRecord.processingStatus = "ignored";
    eventRecord.processedAt = new Date();
    await eventRecord.save();
    return { outcome: "ignored", matched: false, statusUpdated: false };
  }

  const snapshot = compactSnapshot(eventType, body?.payload || {});
  const subscriptionId = cleanId(snapshot.subscription.id);
  eventRecord.safeSnapshot = snapshot;
  eventRecord.razorpaySubscriptionId = subscriptionId;

  if (!subscriptionId) {
    eventRecord.processingStatus = "failed";
    eventRecord.failureCode = "SUBSCRIPTION_ID_MISSING";
    eventRecord.failureMessage = "Supported subscription event did not contain subscription.entity.id.";
    eventRecord.processedAt = new Date();
    await eventRecord.save();
    const error = new Error("Webhook subscription ID missing.");
    error.code = "SUBSCRIPTION_ID_MISSING";
    error.httpStatus = 400;
    throw error;
  }

  const Part114 = getPart114Model();
  if (!Part114) {
    eventRecord.processingStatus = "failed";
    eventRecord.failureCode = "PART114_MODEL_MISSING";
    eventRecord.failureMessage = "Part 114 subscription model is not registered.";
    eventRecord.processedAt = new Date();
    await eventRecord.save();
    const error = new Error("Part 114 subscription model not active.");
    error.code = "PART114_MODEL_MISSING";
    error.httpStatus = 503;
    throw error;
  }

  const local = await Part114.findOne({ razorpaySubscriptionId: subscriptionId });
  if (!local) {
    eventRecord.processingStatus = "unmatched";
    eventRecord.processedAt = new Date();
    eventRecord.failureCode = "LOCAL_SUBSCRIPTION_NOT_FOUND";
    eventRecord.failureMessage = "Webhook verified but no Part 114 local Subscription matched yet.";
    await eventRecord.save();
    return { outcome: "unmatched", matched: false, statusUpdated: false };
  }

  eventRecord.instituteId = local.instituteId;
  eventRecord.localSubscriptionId = local._id;

  let sync = await models.Sync.findOne({ razorpaySubscriptionId: subscriptionId });
  const incomingTime = dateToUnixMs(eventRecord.eventCreatedAt) || Date.now();
  const previousTime = dateToUnixMs(sync?.lastEventCreatedAt);
  if (sync && previousTime > incomingTime) {
    eventRecord.processingStatus = "out_of_order_ignored";
    eventRecord.processedAt = new Date();
    eventRecord.failureCode = "OLDER_THAN_LAST_EVENT";
    eventRecord.failureMessage = "Valid older webhook stored but did not overwrite newer subscription state.";
    await eventRecord.save();
    return { outcome: "out_of_order_ignored", matched: true, statusUpdated: false, sync };
  }

  const status = eventStatus(eventType, snapshot.subscription, local.status);
  const accessCandidate = ["authenticated", "active"].includes(status);
  const paymentId = cleanId(snapshot.payment?.id);
  const invoiceId = cleanId(snapshot.invoice?.id || snapshot.payment?.invoiceId);

  sync = await models.Sync.findOneAndUpdate(
    { razorpaySubscriptionId: subscriptionId },
    {
      $set: {
        instituteId: local.instituteId,
        localSubscriptionId: local._id,
        razorpayPlanId: cleanId(snapshot.subscription.planId || local.razorpayPlanId),
        currentStatus: status,
        lastEventId: eventRecord.providerEventId,
        lastEventType: eventType,
        lastEventCreatedAt: eventRecord.eventCreatedAt || new Date(),
        lastProcessedAt: new Date(),
        lastPaymentId: paymentId || sync?.lastPaymentId || "",
        lastInvoiceId: invoiceId || sync?.lastInvoiceId || "",
        customerId: cleanId(snapshot.subscription.customerId || local.razorpayCustomerId),
        totalCount: Number(snapshot.subscription.totalCount || local.totalCount || 0),
        paidCount: Number(snapshot.subscription.paidCount || 0),
        remainingCount: Number(snapshot.subscription.remainingCount || 0),
        currentStart: unixToDate(snapshot.subscription.currentStart),
        currentEnd: unixToDate(snapshot.subscription.currentEnd),
        endedAt: unixToDate(snapshot.subscription.endedAt),
        accessCandidate,
        accessUnlockApplied: false,
        source: "webhook",
      },
      $setOnInsert: {
        instituteId: local.instituteId,
        localSubscriptionId: local._id,
        razorpaySubscriptionId: subscriptionId,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const part114Snapshot = {
    source: "verified_webhook",
    event: eventType,
    eventId: eventRecord.providerEventId,
    eventCreatedAt: eventRecord.eventCreatedAt,
    subscription: snapshot.subscription,
    payment: snapshot.payment,
    invoice: snapshot.invoice,
  };

  await Part114.updateOne(
    { _id: local._id, instituteId: local.instituteId },
    {
      $set: {
        status,
        providerStatusCheckedAt: new Date(),
        providerSnapshot: part114Snapshot,
        razorpayCustomerId: cleanId(snapshot.subscription.customerId || local.razorpayCustomerId),
        razorpayPaymentId: paymentId || local.razorpayPaymentId || "",
      },
    },
    { strict: false }
  );

  eventRecord.processingStatus = "processed";
  eventRecord.processedAt = new Date();
  eventRecord.failureCode = "";
  eventRecord.failureMessage = "";
  await eventRecord.save();

  await writeAudit(models.Audit, req, "razorpay_webhook_event", "processed", {
    instituteId: local.instituteId,
    eventType,
    providerEventId: eventRecord.providerEventId,
    razorpaySubscriptionId: subscriptionId,
    resultingStatus: status,
  });

  return { outcome: "processed", matched: true, statusUpdated: true, status, sync };
}

async function reconcileSubscription(models, req, localId) {
  if (!isDatabaseReady()) {
    const error = new Error("MongoDB connection required.");
    error.code = "DATABASE_REQUIRED";
    error.httpStatus = 503;
    throw error;
  }
  const Part114 = getPart114Model();
  if (!Part114) {
    const error = new Error("Part 114 subscription model not active.");
    error.code = "PART114_MODEL_MISSING";
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

  const local = await Part114.findOne({ _id: id, instituteId: req.part115Owner.instituteId });
  if (!local || !local.razorpaySubscriptionId) {
    const error = new Error("Provider-created Part 114 Subscription not found for this institute.");
    error.code = "SUBSCRIPTION_NOT_FOUND";
    error.httpStatus = 404;
    throw error;
  }

  const client = getRazorpayClient();
  const provider = await client.subscriptions.fetch(local.razorpaySubscriptionId);
  const status = eventStatus("subscription.updated", provider, local.status);
  const sync = await models.Sync.findOneAndUpdate(
    { razorpaySubscriptionId: local.razorpaySubscriptionId },
    {
      $set: {
        instituteId: local.instituteId,
        localSubscriptionId: local._id,
        razorpayPlanId: cleanId(provider.plan_id || local.razorpayPlanId),
        currentStatus: status,
        lastEventType: "manual.reconcile",
        lastProcessedAt: new Date(),
        customerId: cleanId(provider.customer_id || local.razorpayCustomerId),
        totalCount: Number(provider.total_count || local.totalCount || 0),
        paidCount: Number(provider.paid_count || 0),
        remainingCount: Number(provider.remaining_count || 0),
        currentStart: unixToDate(provider.current_start),
        currentEnd: unixToDate(provider.current_end),
        endedAt: unixToDate(provider.ended_at),
        accessCandidate: ["authenticated", "active"].includes(status),
        accessUnlockApplied: false,
        source: "manual_api_reconcile",
      },
      $setOnInsert: {
        instituteId: local.instituteId,
        localSubscriptionId: local._id,
        razorpaySubscriptionId: local.razorpaySubscriptionId,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await Part114.updateOne(
    { _id: local._id, instituteId: local.instituteId },
    {
      $set: {
        status,
        providerStatusCheckedAt: new Date(),
        providerSnapshot: {
          source: "manual_api_reconcile",
          id: provider.id,
          plan_id: provider.plan_id,
          customer_id: provider.customer_id,
          status: provider.status,
          total_count: provider.total_count,
          paid_count: provider.paid_count,
          remaining_count: provider.remaining_count,
          current_start: provider.current_start,
          current_end: provider.current_end,
          ended_at: provider.ended_at,
        },
        razorpayCustomerId: cleanId(provider.customer_id || local.razorpayCustomerId),
      },
    },
    { strict: false }
  );

  await writeAudit(models.Audit, req, "subscription_manual_reconcile", "success", {
    localSubscriptionId: String(local._id),
    razorpaySubscriptionId: local.razorpaySubscriptionId,
    providerStatus: status,
  });

  return { local, provider, sync, status };
}

function parseVaniCommand(command = "") {
  const text = String(command || "").trim().toLowerCase();
  return {
    text,
    setup: /webhook.*(setup|url|configure|ready)|setup.*webhook/.test(text),
    failures: /fail|error|problem|retry|unmatched|duplicate/.test(text),
    events: /event|webhook.*(dikhao|show|list)|list.*webhook/.test(text),
    subscriptions: /subscription.*(status|sync|dikhao|show)|sync.*subscription/.test(text),
    reconcile: /reconcile|refresh|sync now|abhi sync/.test(text),
  };
}

export function registerPart115RazorpayWebhooks({ app } = {}) {
  if (!app || typeof app.get !== "function" || typeof app.post !== "function") {
    throw new Error("Part 115 registration failed: Express app is required.");
  }
  if (app.locals.part115RazorpayWebhooksRegistered) return;
  app.locals.part115RazorpayWebhooksRegistered = true;

  const models = defineModels();

  app.get(["/webhook-monitor", "/razorpay-webhook-monitor", "/part115"], (req, res) => {
    res.sendFile(path.join(frontendDir, "razorpay-webhook-monitor.html"));
  });
  app.get("/razorpay-webhook-monitor.css", (req, res) => {
    res.type("text/css").sendFile(path.join(frontendDir, "razorpay-webhook-monitor.css"));
  });
  app.get("/razorpay-webhook-monitor.js", (req, res) => {
    res.type("application/javascript").sendFile(path.join(frontendDir, "razorpay-webhook-monitor.js"));
  });

  app.get("/api/part115/status", (req, res) => {
    const provider = getProviderState();
    res.json({
      success: true,
      part: PART_NUMBER,
      name: PART_NAME,
      status: "secure_test_webhook_sync_active",
      testModeLocked: provider.testModeLocked,
      webhookSecretConfigured: provider.webhookSecretConfigured,
      webhookEndpointReady: provider.webhookReady && isDatabaseReady() && Boolean(getPart114Model()),
      rawBodyCaptureExpected: true,
      signatureVerificationEnabled: true,
      duplicateEventProtectionEnabled: true,
      outOfOrderProtectionEnabled: true,
      databaseConnected: isDatabaseReady(),
      part114DependencyReady: Boolean(getPart114Model()),
      featureAccessUnlockEnabled: false,
      liveModeEnabled: false,
      nextPart: 116,
      nextPartName: "Subscription Feature Access Control",
    });
  });

  app.get("/api/part115/security-policy", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      publicWebhookEndpoint: "/api/part115/webhooks/razorpay",
      webhookSignatureRequired: true,
      rawBodyRequired: true,
      webhookSecretSeparateFromApiSecret: true,
      duplicateProtectionUsesEventId: true,
      payloadDigestFallbackEnabled: true,
      outOfOrderEventsStoredButCannotOverwriteNewerState: true,
      fullWebhookPayloadNotStored: true,
      paymentCredentialsNeverStored: true,
      ownerOnlyMonitoring: true,
      tenantFilteredMonitoring: true,
      liveModeBlocked: true,
      featureAccessUnlockPendingPart116: true,
    });
  });

  app.get("/api/part115/setup", ownerOnly, (req, res) => {
    const provider = getProviderState();
    res.json({
      success: true,
      part: PART_NUMBER,
      instituteId: req.part115Owner.instituteId,
      mode: provider.mode,
      webhookUrl: `${publicBaseUrl(req)}/api/part115/webhooks/razorpay`,
      webhookSecretConfiguredInRender: provider.webhookSecretConfigured,
      activeEventsToSelect: Array.from(SUPPORTED_EVENTS),
      dashboardRule: "Razorpay Dashboard Test Mode me exactly same webhook secret use karein jo Render RAZORPAY_WEBHOOK_SECRET me stored hai.",
      secretsReturned: false,
      testModeOnly: true,
    });
  });

  app.post("/api/part115/webhooks/razorpay", async (req, res) => {
    try {
      requireTestWebhookReady();
      if (!isDatabaseReady()) {
        const error = new Error("MongoDB connection required for idempotent webhook processing.");
        error.code = "DATABASE_REQUIRED";
        error.httpStatus = 503;
        throw error;
      }

      const rawBody = Buffer.isBuffer(req.rawBody) ? req.rawBody : null;
      if (!rawBody || rawBody.length === 0) {
        const error = new Error("Raw webhook request body unavailable. Express JSON verify hook required.");
        error.code = "RAW_BODY_REQUIRED";
        error.httpStatus = 500;
        throw error;
      }

      const receivedSignature = cleanText(req.get("x-razorpay-signature") || "", 256);
      if (!receivedSignature) {
        const error = new Error("X-Razorpay-Signature header missing.");
        error.code = "WEBHOOK_SIGNATURE_MISSING";
        error.httpStatus = 400;
        throw error;
      }

      const expectedSignature = hmacHex(process.env.RAZORPAY_WEBHOOK_SECRET, rawBody);
      if (!safeEqualHex(expectedSignature, receivedSignature)) {
        const error = new Error("Razorpay webhook signature verification failed.");
        error.code = "INVALID_WEBHOOK_SIGNATURE";
        error.httpStatus = 400;
        throw error;
      }

      const payloadDigest = sha256(rawBody);
      const headerEventId = cleanText(req.get("x-razorpay-event-id") || "", 180);
      const providerEventId = headerEventId || `digest_${payloadDigest}`;
      const body = req.body || {};
      const eventType = cleanText(body.event || "unknown", 100);
      const eventCreatedAt = unixToDate(body.created_at) || new Date();

      let eventRecord;
      try {
        eventRecord = await models.Event.create({
          providerEventId,
          payloadDigest,
          signatureDigest: sha256(receivedSignature),
          eventType,
          eventCreatedAt,
          receivedAt: new Date(),
          processingStatus: "received",
        });
      } catch (error) {
        if (error?.code === 11000) {
          return res.status(200).json({
            success: true,
            part: PART_NUMBER,
            duplicate: true,
            message: "Duplicate webhook already received; no state change repeated.",
          });
        }
        throw error;
      }

      const result = await processVerifiedEvent(models, req, eventRecord, body);
      return res.status(200).json({
        success: true,
        part: PART_NUMBER,
        duplicate: false,
        eventType,
        processingStatus: result.outcome,
        matched: result.matched,
        statusUpdated: result.statusUpdated,
      });
    } catch (error) {
      return res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "WEBHOOK_PROCESSING_FAILED",
        message: error.message,
      });
    }
  });

  app.get("/api/part115/events", ownerOnly, async (req, res) => {
    if (!isDatabaseReady()) {
      return res.status(503).json({ success: false, part: PART_NUMBER, code: "DATABASE_REQUIRED", message: "MongoDB connection required." });
    }
    const status = cleanText(req.query?.status || "", 40);
    const query = { instituteId: req.part115Owner.instituteId };
    if (status) query.processingStatus = status;
    const events = await models.Event.find(query).sort({ receivedAt: -1 }).limit(100).lean();
    res.json({ success: true, part: PART_NUMBER, count: events.length, events: events.map(publicEvent) });
  });

  app.get("/api/part115/sync-states", ownerOnly, async (req, res) => {
    if (!isDatabaseReady()) {
      return res.status(503).json({ success: false, part: PART_NUMBER, code: "DATABASE_REQUIRED", message: "MongoDB connection required." });
    }
    const syncStates = await models.Sync.find({ instituteId: req.part115Owner.instituteId })
      .sort({ lastProcessedAt: -1 }).limit(100).lean();
    res.json({ success: true, part: PART_NUMBER, count: syncStates.length, syncStates: syncStates.map(publicSync) });
  });

  app.get("/api/part115/health", ownerOnly, async (req, res) => {
    if (!isDatabaseReady()) {
      return res.status(503).json({ success: false, part: PART_NUMBER, code: "DATABASE_REQUIRED", message: "MongoDB connection required." });
    }
    const instituteId = req.part115Owner.instituteId;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [processed, unmatched, failed, outOfOrder, totalSync] = await Promise.all([
      models.Event.countDocuments({ instituteId, processingStatus: "processed", receivedAt: { $gte: since } }),
      models.Event.countDocuments({ instituteId, processingStatus: "unmatched", receivedAt: { $gte: since } }),
      models.Event.countDocuments({ instituteId, processingStatus: "failed", receivedAt: { $gte: since } }),
      models.Event.countDocuments({ instituteId, processingStatus: "out_of_order_ignored", receivedAt: { $gte: since } }),
      models.Sync.countDocuments({ instituteId }),
    ]);
    res.json({
      success: true,
      part: PART_NUMBER,
      window: "last_24_hours",
      processed,
      unmatched,
      failed,
      outOfOrderSafelyIgnored: outOfOrder,
      totalSyncedSubscriptions: totalSync,
      healthy: failed === 0,
    });
  });

  app.post("/api/part115/subscription/:id/reconcile", ownerOnly, async (req, res) => {
    try {
      const result = await reconcileSubscription(models, req, req.params.id);
      res.json({
        success: true,
        part: PART_NUMBER,
        message: "Razorpay Test Subscription reconciled through provider API.",
        syncState: publicSync(result.sync),
        providerStatus: result.status,
        featureAccessUnlocked: false,
      });
    } catch (error) {
      res.status(error.httpStatus || 502).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "RECONCILE_FAILED",
        message: error.message,
      });
    }
  });

  app.post("/api/part115/vani/command", ownerOnly, async (req, res) => {
    const command = cleanText(req.body?.command || "", 500);
    if (!command) return res.status(400).json({ success: false, part: PART_NUMBER, message: "VANI command required." });
    const parsed = parseVaniCommand(command);

    if (/secret|api key|key secret|webhook secret|password|otp|cvv|upi pin/.test(parsed.text)) {
      await writeAudit(models.Audit, req, "vani_sensitive_webhook_request", "blocked", {});
      return res.json({
        success: true,
        part: PART_NUMBER,
        replyText: "Webhook Secret, API Secret, password, OTP, CVV aur UPI PIN voice/chat me mat boliye. Secret sirf private Render aur Razorpay Dashboard screens me use hoga.",
        spokenSafeSummary: "Sensitive payment secrets private screen par hi rahenge.",
        actionExecuted: false,
        privateScreenFirst: true,
      });
    }

    if (/live mode|go live|real payment/.test(parsed.text)) {
      return res.json({
        success: true,
        part: PART_NUMBER,
        replyText: "Part 115 me Live Mode locked hai. Test webhooks verify aur sync honge.",
        spokenSafeSummary: "Live Mode abhi safety lock me hai.",
        actionExecuted: false,
      });
    }

    if (parsed.setup) {
      const provider = getProviderState();
      return res.json({
        success: true,
        part: PART_NUMBER,
        replyText: provider.webhookReady
          ? "Webhook Secret configured hai. Private setup screen se Test Mode URL aur event list copy karke Razorpay Dashboard me save karein."
          : "RAZORPAY_WEBHOOK_SECRET Render Environment me pending hai.",
        spokenSafeSummary: provider.webhookReady ? "Test webhook setup ready hai." : "Webhook Secret setup pending hai.",
        privateScreenDetails: {
          webhookUrl: `${publicBaseUrl(req)}/api/part115/webhooks/razorpay`,
          activeEventsToSelect: Array.from(SUPPORTED_EVENTS),
          secretConfigured: provider.webhookSecretConfigured,
          secretsReturned: false,
        },
        actionExecuted: false,
      });
    }

    if (parsed.reconcile) {
      const localId = cleanId(req.body?.localSubscriptionId || "");
      if (!localId) {
        return res.json({
          success: true,
          part: PART_NUMBER,
          replyText: "Provider sync ke liye local Part 114 Subscription ID private screen me select ya enter karein.",
          spokenSafeSummary: "Subscription ID required hai.",
          missingDetails: ["local Part 114 Subscription ID"],
          actionExecuted: false,
        });
      }
      try {
        const result = await reconcileSubscription(models, req, localId);
        return res.json({
          success: true,
          part: PART_NUMBER,
          replyText: `Subscription provider status ${result.status} ke saath sync ho gayi. Feature access Part 116 me apply hoga.`,
          spokenSafeSummary: `Subscription status ${result.status} hai.`,
          privateScreenDetails: publicSync(result.sync),
          actionExecuted: true,
          actionLevel: "safe_read_only_reconcile",
        });
      } catch (error) {
        return res.status(error.httpStatus || 500).json({ success: false, part: PART_NUMBER, code: error.code || "VANI_RECONCILE_FAILED", message: error.message });
      }
    }

    if (parsed.failures || parsed.events) {
      if (!isDatabaseReady()) return res.status(503).json({ success: false, part: PART_NUMBER, message: "MongoDB connection required." });
      const events = await models.Event.find({ instituteId: req.part115Owner.instituteId })
        .sort({ receivedAt: -1 }).limit(20).lean();
      const issueCount = events.filter((event) => ["failed", "unmatched"].includes(event.processingStatus)).length;
      return res.json({
        success: true,
        part: PART_NUMBER,
        replyText: `${events.length} recent webhook events mile; ${issueCount} ko attention chahiye. Details private screen par hain.`,
        spokenSafeSummary: `${issueCount} webhook events ko attention chahiye.`,
        privateScreenDetails: events.map(publicEvent),
        actionExecuted: false,
      });
    }

    if (parsed.subscriptions) {
      if (!isDatabaseReady()) return res.status(503).json({ success: false, part: PART_NUMBER, message: "MongoDB connection required." });
      const syncStates = await models.Sync.find({ instituteId: req.part115Owner.instituteId })
        .sort({ lastProcessedAt: -1 }).limit(20).lean();
      const activeCount = syncStates.filter((item) => ["authenticated", "active"].includes(item.currentStatus)).length;
      return res.json({
        success: true,
        part: PART_NUMBER,
        replyText: `${syncStates.length} subscriptions sync ledger me hain; ${activeCount} active/authenticated candidate hain. Access abhi Part 116 tak locked hai.`,
        spokenSafeSummary: `${activeCount} subscriptions active ya authenticated hain.`,
        privateScreenDetails: syncStates.map(publicSync),
        actionExecuted: false,
      });
    }

    const provider = getProviderState();
    res.json({
      success: true,
      part: PART_NUMBER,
      replyText: provider.webhookReady
        ? "Test webhook verification ready hai. Main setup URL, recent events, failures aur subscription sync status dikha sakti hoon."
        : "Webhook Secret configuration pending hai.",
      spokenSafeSummary: provider.webhookReady ? "Test webhook system ready hai." : "Webhook setup pending hai.",
      actionExecuted: false,
    });
  });

  app.get("/api/part115/demo", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      name: PART_NAME,
      page: "/webhook-monitor",
      webhookEndpoint: "/api/part115/webhooks/razorpay",
      supportedEvents: Array.from(SUPPORTED_EVENTS),
      safety: {
        rawBodySignatureVerification: true,
        duplicateEventProtection: true,
        outOfOrderProtection: true,
        fullPayloadStorage: false,
        featureAccessUnlocked: false,
        liveModeEnabled: false,
      },
    });
  });
}
