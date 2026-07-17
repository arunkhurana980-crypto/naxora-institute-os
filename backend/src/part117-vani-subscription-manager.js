import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import Razorpay from "razorpay";

const PART_NUMBER = 117;
const PART_NAME = "VANI Subscription Manager";
const OWNER_ROLES = new Set(["institute_owner", "owner", "instituteowner"]);
const ACTIONS = new Set([
  "PAUSE_NOW",
  "RESUME_NOW",
  "CANCEL_CYCLE_END",
  "CANCEL_NOW",
  "CHANGE_PLAN_CYCLE_END",
  "CHANGE_PLAN_NOW",
]);
const SENSITIVE_ACTIONS = new Set([
  "PAUSE_NOW",
  "RESUME_NOW",
  "CANCEL_CYCLE_END",
  "CANCEL_NOW",
  "CHANGE_PLAN_CYCLE_END",
  "CHANGE_PLAN_NOW",
]);
const PLAN_RANK = Object.freeze({ FREE: 0, STARTER: 1, PROFESSIONAL: 2, BUSINESS: 3 });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, "../../frontend");

function normalizeRole(value = "") {
  const role = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return ({ owner: "institute_owner", instituteowner: "institute_owner" })[role] || role;
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
  ].map((v) => String(v || "").trim()).filter(Boolean);
}
function verifyJwt(token) {
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
function buildOwner(req) {
  let payload = req.user || req.auth || null;
  if (!payload && getBearer(req)) payload = verifyJwt(getBearer(req));
  if (!payload) {
    const e = new Error("Institute owner login required.");
    e.code = "OWNER_LOGIN_REQUIRED"; e.httpStatus = 401; throw e;
  }
  const role = normalizeRole(payload.role || payload.userRole || payload.accountRole || payload.user?.role || "");
  if (!OWNER_ROLES.has(role)) {
    const e = new Error("Only institute_owner can manage subscriptions.");
    e.code = "OWNER_ONLY"; e.httpStatus = 403; throw e;
  }
  const requested = cleanId(req.headers["x-naxora-institute-id"] || req.body?.instituteId || req.query?.instituteId || "");
  const tokenInstitute = cleanId(payload.instituteId || payload.institute_id || payload.user?.instituteId || payload.tenantId || "");
  if (tokenInstitute && requested && tokenInstitute !== requested) {
    const e = new Error("Institute context does not match login session.");
    e.code = "INSTITUTE_CONTEXT_MISMATCH"; e.httpStatus = 403; throw e;
  }
  const instituteId = tokenInstitute || requested;
  if (!instituteId) {
    const e = new Error("Valid instituteId required.");
    e.code = "INSTITUTE_ID_REQUIRED"; e.httpStatus = 400; throw e;
  }
  return {
    role: "institute_owner",
    instituteId,
    userId: cleanId(payload.userId || payload.id || payload._id || payload.sub || payload.user?.id || "owner"),
  };
}
function ownerOnly(req, res, next) {
  try { req.part117Owner = buildOwner(req); next(); }
  catch (e) {
    res.status(e.httpStatus || 401).json({
      success: false, part: PART_NUMBER, code: e.code || "OWNER_AUTH_FAILED",
      message: e.message, privateScreenFirst: true,
    });
  }
}
function providerState() {
  const mode = String(process.env.RAZORPAY_MODE || "test").trim().toLowerCase();
  const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
  const ownerSecret = String(process.env.NAXORA_OWNER_ACTION_SECRET || "").trim();
  return {
    mode,
    testModeLocked: mode === "test",
    keyIdConfigured: Boolean(keyId),
    keySecretConfigured: Boolean(keySecret),
    ownerActionSecretConfigured: Boolean(ownerSecret),
    providerReady: Boolean(mode === "test" && keyId.startsWith("rzp_test_") && keySecret),
    actionReady: Boolean(mode === "test" && keyId.startsWith("rzp_test_") && keySecret && ownerSecret),
  };
}
function requireTestProvider() {
  const state = providerState();
  if (!state.testModeLocked) {
    const e = new Error("Part 117 me Live subscription actions locked hain. RAZORPAY_MODE=test rakhein.");
    e.code = "LIVE_MODE_LOCKED_UNTIL_PART118"; e.httpStatus = 423; throw e;
  }
  if (!state.providerReady) {
    const e = new Error("Razorpay Test API credentials incomplete hain.");
    e.code = "TEST_PROVIDER_NOT_READY"; e.httpStatus = 412; throw e;
  }
  return state;
}
function providerClient() {
  requireTestProvider();
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}
function safeEqualText(left, right) {
  const a = crypto.createHash("sha256").update(String(left || "")).digest();
  const b = crypto.createHash("sha256").update(String(right || "")).digest();
  return crypto.timingSafeEqual(a, b);
}
function verifyOwnerAction(req) {
  const expected = String(process.env.NAXORA_OWNER_ACTION_SECRET || "").trim();
  if (!expected) {
    const e = new Error("NAXORA_OWNER_ACTION_SECRET Render Environment me configure karein.");
    e.code = "OWNER_ACTION_SECRET_MISSING"; e.httpStatus = 503; throw e;
  }
  const supplied = String(req.headers["x-naxora-owner-action-secret"] || "").trim();
  if (!supplied || !safeEqualText(supplied, expected)) {
    const e = new Error("Owner verification failed.");
    e.code = "OWNER_VERIFICATION_FAILED"; e.httpStatus = 403; throw e;
  }
  return true;
}
function hash(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}
function requestId(req) {
  return hash(`${Date.now()}:${req.ip || ""}:${crypto.randomUUID()}`).slice(0, 20);
}
function unixDate(value) {
  const seconds = Number(value || 0);
  return Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000) : null;
}
function publicError(error) {
  const status = Number(error?.statusCode || error?.status || 0);
  const description = cleanText(error?.error?.description || error?.description || "", 220);
  if (status === 401) return "Razorpay Test credentials invalid hain.";
  if (status === 400 && description) return `Razorpay action reject hui: ${description}`;
  if (status === 429) return "Razorpay rate limit hit hui. Thodi der baad retry karein.";
  return "Razorpay Test subscription action complete nahi hui. Private server logs check karein.";
}

function defineModels() {
  const actionSchema = new mongoose.Schema({
    instituteId: { type: String, required: true, index: true },
    ownerUserId: { type: String, required: true },
    localSubscriptionId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    razorpaySubscriptionId: { type: String, required: true, index: true },
    currentPlanCode: { type: String, default: "" },
    currentPlanId: { type: String, default: "" },
    targetLocalPlanId: { type: mongoose.Schema.Types.ObjectId, default: null },
    targetPlanCode: { type: String, default: "" },
    targetRazorpayPlanId: { type: String, default: "" },
    actionType: { type: String, enum: Array.from(ACTIONS), required: true },
    scheduleChangeAt: { type: String, enum: ["now", "cycle_end", "none"], default: "none" },
    confirmationText: { type: String, required: true },
    previewFingerprint: { type: String, required: true, index: true },
    reason: { type: String, default: "" },
    status: {
      type: String,
      enum: ["preview_ready", "executing", "provider_accepted", "provider_failed", "superseded"],
      default: "preview_ready",
      index: true,
    },
    providerBefore: { type: mongoose.Schema.Types.Mixed, default: null },
    providerAfter: { type: mongoose.Schema.Types.Mixed, default: null },
    accessImpact: { type: mongoose.Schema.Types.Mixed, default: null },
    providerActionAt: { type: Date, default: null },
    failureCode: { type: String, default: "" },
    failureMessage: { type: String, default: "" },
  }, { timestamps: true, strict: true });
  actionSchema.index({ instituteId: 1, previewFingerprint: 1 }, { unique: true });

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
    Action: mongoose.models.Part117SubscriptionAction || mongoose.model("Part117SubscriptionAction", actionSchema),
    Audit: mongoose.models.Part117SubscriptionManagerAudit || mongoose.model("Part117SubscriptionManagerAudit", auditSchema),
  };
}
function dependencies() {
  return {
    Plan: mongoose.models.Part113NaxoraSubscriptionPlan || null,
    Checkout: mongoose.models.Part114CheckoutSubscription || null,
    Sync: mongoose.models.Part115SubscriptionSyncState || null,
    Snapshot: mongoose.models.Part116AccessSnapshot || null,
  };
}
async function writeAudit(models, req, action, result, reasonCode = "", details = {}) {
  if (!dbReady()) return { saved: false };
  try {
    await models.Audit.create({
      instituteId: req.part117Owner?.instituteId || details.instituteId || "system",
      actorUserId: req.part117Owner?.userId || "system",
      action, result, reasonCode, requestId: requestId(req), details,
    });
    return { saved: true };
  } catch { return { saved: false }; }
}
function safeProviderSnapshot(entity = {}) {
  return {
    id: cleanId(entity.id),
    status: cleanText(entity.status, 40),
    planId: cleanId(entity.plan_id),
    customerId: cleanId(entity.customer_id),
    quantity: Number(entity.quantity || 1),
    totalCount: Number(entity.total_count || 0),
    paidCount: Number(entity.paid_count || 0),
    remainingCount: Number(entity.remaining_count || 0),
    currentStart: entity.current_start || null,
    currentEnd: entity.current_end || null,
    endedAt: entity.ended_at || null,
    hasScheduledChanges: Boolean(entity.has_scheduled_changes),
    scheduleChangeAt: cleanText(entity.schedule_change_at || "", 30),
  };
}
function publicAction(action) {
  return {
    id: String(action._id),
    localSubscriptionId: String(action.localSubscriptionId),
    razorpaySubscriptionId: action.razorpaySubscriptionId,
    currentPlanCode: action.currentPlanCode,
    targetPlanCode: action.targetPlanCode,
    actionType: action.actionType,
    scheduleChangeAt: action.scheduleChangeAt,
    status: action.status,
    reason: action.reason,
    accessImpact: action.accessImpact,
    providerBefore: action.providerBefore,
    providerAfter: action.providerAfter,
    providerActionAt: action.providerActionAt,
    failureCode: action.failureCode,
    failureMessage: action.failureMessage,
    createdAt: action.createdAt,
    updatedAt: action.updatedAt,
  };
}
function publicSubscription(local, sync, plan) {
  return {
    localSubscriptionId: String(local._id),
    razorpaySubscriptionId: local.razorpaySubscriptionId,
    planCode: cleanText(plan?.planCode || plan?.templateCode || local.planCode || "", 50).toUpperCase(),
    planName: plan?.name || local.planName || "",
    period: plan?.period || local.planPeriod || "",
    amountPaise: Number(plan?.amountPaise || local.amountPaise || 0),
    amountRupees: (Number(plan?.amountPaise || local.amountPaise || 0) / 100).toFixed(2),
    providerStatus: sync?.currentStatus || local.status || "",
    accessUnlockApplied: Boolean(sync?.accessUnlockApplied),
    lastEventType: sync?.lastEventType || "",
    currentStart: sync?.currentStart || null,
    currentEnd: sync?.currentEnd || null,
  };
}
async function loadSubscriptionContext(req, localSubscriptionId) {
  if (!dbReady()) {
    const e = new Error("MongoDB connection required.");
    e.code = "DATABASE_REQUIRED"; e.httpStatus = 503; throw e;
  }
  const { Plan, Checkout, Sync } = dependencies();
  if (!Plan || !Checkout || !Sync) {
    const e = new Error("Part 113–115 subscription models are not active.");
    e.code = "SUBSCRIPTION_DEPENDENCY_MISSING"; e.httpStatus = 503; throw e;
  }
  const id = cleanId(localSubscriptionId);
  if (!mongoose.isValidObjectId(id)) {
    const e = new Error("Valid local Part 114 Subscription ID required.");
    e.code = "INVALID_LOCAL_SUBSCRIPTION_ID"; e.httpStatus = 400; throw e;
  }
  const local = await Checkout.findOne({ _id: id, instituteId: req.part117Owner.instituteId });
  if (!local || !local.razorpaySubscriptionId) {
    const e = new Error("Provider-created Subscription not found for this institute.");
    e.code = "SUBSCRIPTION_NOT_FOUND"; e.httpStatus = 404; throw e;
  }
  const [sync, plan] = await Promise.all([
    Sync.findOne({ instituteId: req.part117Owner.instituteId, localSubscriptionId: local._id }),
    Plan.findOne({ _id: local.localPlanId, instituteId: req.part117Owner.instituteId }),
  ]);
  if (!plan) {
    const e = new Error("Current Subscription plan mapping not found.");
    e.code = "CURRENT_PLAN_NOT_FOUND"; e.httpStatus = 404; throw e;
  }
  return { local, sync, plan };
}
async function loadTargetPlan(req, targetLocalPlanId) {
  const { Plan } = dependencies();
  const id = cleanId(targetLocalPlanId);
  if (!mongoose.isValidObjectId(id)) {
    const e = new Error("Valid target Part 113 plan ID required.");
    e.code = "INVALID_TARGET_PLAN_ID"; e.httpStatus = 400; throw e;
  }
  const plan = await Plan.findOne({
    _id: id,
    instituteId: req.part117Owner.instituteId,
    status: "provider_created",
    razorpayPlanId: { $ne: "" },
  });
  if (!plan) {
    const e = new Error("Confirmed Razorpay Test target plan not found.");
    e.code = "TARGET_PLAN_NOT_FOUND"; e.httpStatus = 404; throw e;
  }
  return plan;
}
function validateActionState(actionType, status) {
  const current = String(status || "").toLowerCase();
  if (actionType === "PAUSE_NOW" && current !== "active") {
    const e = new Error("Pause sirf active Subscription par allowed hai.");
    e.code = "PAUSE_REQUIRES_ACTIVE"; e.httpStatus = 409; throw e;
  }
  if (actionType === "RESUME_NOW" && current !== "paused") {
    const e = new Error("Resume sirf paused Subscription par allowed hai.");
    e.code = "RESUME_REQUIRES_PAUSED"; e.httpStatus = 409; throw e;
  }
  if (actionType.startsWith("CHANGE_PLAN") && !["active", "authenticated"].includes(current)) {
    const e = new Error("Plan change sirf active ya authenticated Subscription par allowed hai.");
    e.code = "PLAN_CHANGE_STATE_NOT_ALLOWED"; e.httpStatus = 409; throw e;
  }
  if (actionType.startsWith("CANCEL") && ["cancelled", "completed", "expired"].includes(current)) {
    const e = new Error("Subscription already final state me hai.");
    e.code = "SUBSCRIPTION_ALREADY_FINAL"; e.httpStatus = 409; throw e;
  }
}
function scheduleFor(actionType) {
  if (actionType.endsWith("_CYCLE_END")) return "cycle_end";
  if (actionType.endsWith("_NOW")) return "now";
  return "none";
}
function confirmationFor(actionType, currentCode, targetCode = "") {
  if (actionType.startsWith("CHANGE_PLAN")) return `${actionType} ${currentCode} TO ${targetCode}`;
  return `${actionType} ${currentCode}`;
}
function impactFor(currentPlan, targetPlan, actionType) {
  const currentCode = cleanText(currentPlan?.planCode || currentPlan?.templateCode || "", 50).toUpperCase();
  const targetCode = cleanText(targetPlan?.planCode || targetPlan?.templateCode || "", 50).toUpperCase();
  if (actionType.startsWith("CANCEL")) {
    return {
      type: "access_loss",
      currentPlanCode: currentCode,
      targetPlanCode: "FREE",
      expectedAfterVerifiedWebhook: "Paid base-plan features lock; separate V3 stays only if its own active subscription remains.",
      irreversible: actionType === "CANCEL_NOW",
    };
  }
  if (actionType === "PAUSE_NOW") {
    return {
      type: "temporary_access_loss",
      currentPlanCode: currentCode,
      expectedAfterVerifiedWebhook: "Paid features lock while status is paused.",
      reversible: true,
    };
  }
  if (actionType === "RESUME_NOW") {
    return {
      type: "possible_access_restore",
      currentPlanCode: currentCode,
      expectedAfterVerifiedWebhook: "Access restores only when verified status becomes active.",
      immediateGuarantee: false,
    };
  }
  if (actionType.startsWith("CHANGE_PLAN")) {
    const currentRank = PLAN_RANK[currentCode] ?? (currentCode === "V3_AI" ? 100 : 0);
    const targetRank = PLAN_RANK[targetCode] ?? (targetCode === "V3_AI" ? 100 : 0);
    return {
      type: targetRank > currentRank ? "upgrade" : targetRank < currentRank ? "downgrade" : "lateral_change",
      currentPlanCode: currentCode,
      targetPlanCode: targetCode,
      schedule: scheduleFor(actionType),
      expectedAfterVerifiedWebhook: "Part 116 access recalculates from verified Part 115 status and new plan mapping.",
      immediateFinancialAdjustmentPossible: actionType === "CHANGE_PLAN_NOW",
    };
  }
  return { type: "status_change" };
}
async function createPreview(models, req, body) {
  requireTestProvider();
  const actionType = cleanText(body.actionType || "", 60).toUpperCase();
  if (!ACTIONS.has(actionType)) {
    const e = new Error("Valid subscription action required.");
    e.code = "INVALID_ACTION_TYPE"; e.httpStatus = 400; throw e;
  }
  const { local, sync, plan } = await loadSubscriptionContext(req, body.localSubscriptionId);
  const currentStatus = sync?.currentStatus || local.status;
  validateActionState(actionType, currentStatus);

  let targetPlan = null;
  if (actionType.startsWith("CHANGE_PLAN")) {
    targetPlan = await loadTargetPlan(req, body.targetLocalPlanId);
    if (String(targetPlan._id) === String(plan._id)) {
      const e = new Error("Target plan current plan ke same nahi ho sakta.");
      e.code = "SAME_PLAN_NOT_ALLOWED"; e.httpStatus = 400; throw e;
    }
  }

  const currentCode = cleanText(plan.planCode || plan.templateCode || local.planCode || "UNKNOWN", 50).toUpperCase();
  const targetCode = targetPlan ? cleanText(targetPlan.planCode || targetPlan.templateCode || "UNKNOWN", 50).toUpperCase() : "";
  const reason = cleanText(body.reason || "", 300);
  const confirmationText = confirmationFor(actionType, currentCode, targetCode);
  const fingerprint = hash([
    req.part117Owner.instituteId,
    local._id,
    actionType,
    targetPlan?._id || "",
    currentStatus,
    reason,
  ].join("|"));

  let action = await models.Action.findOne({ instituteId: req.part117Owner.instituteId, previewFingerprint: fingerprint });
  const duplicate = Boolean(action);
  if (!action) {
    const before = await providerClient().subscriptions.fetch(local.razorpaySubscriptionId);
    action = await models.Action.create({
      instituteId: req.part117Owner.instituteId,
      ownerUserId: req.part117Owner.userId,
      localSubscriptionId: local._id,
      razorpaySubscriptionId: local.razorpaySubscriptionId,
      currentPlanCode: currentCode,
      currentPlanId: plan.razorpayPlanId,
      targetLocalPlanId: targetPlan?._id || null,
      targetPlanCode: targetCode,
      targetRazorpayPlanId: targetPlan?.razorpayPlanId || "",
      actionType,
      scheduleChangeAt: scheduleFor(actionType),
      confirmationText,
      previewFingerprint: fingerprint,
      reason,
      status: "preview_ready",
      providerBefore: safeProviderSnapshot(before),
      accessImpact: impactFor(plan, targetPlan, actionType),
    });
  }
  await writeAudit(models, req, "subscription_action_preview", "success", duplicate ? "DUPLICATE_PREVIEW_RETURNED" : "PREVIEW_CREATED", {
    actionId: String(action._id), actionType, localSubscriptionId: String(local._id),
  });
  return { action, duplicate, subscription: publicSubscription(local, sync, plan), targetPlan };
}
async function invokeProviderAction(client, action) {
  const id = action.razorpaySubscriptionId;
  switch (action.actionType) {
    case "PAUSE_NOW":
      return client.subscriptions.pause(id, { pause_at: "now" });
    case "RESUME_NOW":
      return client.subscriptions.resume(id, { resume_at: "now" });
    case "CANCEL_CYCLE_END":
      return client.subscriptions.cancel(id, { cancel_at_cycle_end: true });
    case "CANCEL_NOW":
      return client.subscriptions.cancel(id, { cancel_at_cycle_end: false });
    case "CHANGE_PLAN_CYCLE_END":
      return client.subscriptions.update(id, {
        plan_id: action.targetRazorpayPlanId,
        schedule_change_at: "cycle_end",
        customer_notify: true,
      });
    case "CHANGE_PLAN_NOW":
      return client.subscriptions.update(id, {
        plan_id: action.targetRazorpayPlanId,
        schedule_change_at: "now",
        customer_notify: true,
      });
    default: {
      const e = new Error("Unsupported provider action.");
      e.code = "UNSUPPORTED_PROVIDER_ACTION"; e.httpStatus = 400; throw e;
    }
  }
}
async function executeAction(models, req, body) {
  requireTestProvider();
  verifyOwnerAction(req);
  if (!dbReady()) {
    const e = new Error("MongoDB connection required.");
    e.code = "DATABASE_REQUIRED"; e.httpStatus = 503; throw e;
  }
  const id = cleanId(body.actionId);
  if (!mongoose.isValidObjectId(id)) {
    const e = new Error("Valid action preview ID required.");
    e.code = "INVALID_ACTION_ID"; e.httpStatus = 400; throw e;
  }
  const action = await models.Action.findOne({ _id: id, instituteId: req.part117Owner.instituteId });
  if (!action) {
    const e = new Error("Subscription action preview not found.");
    e.code = "ACTION_PREVIEW_NOT_FOUND"; e.httpStatus = 404; throw e;
  }
  if (action.status === "provider_accepted") return { action, idempotent: true };
  if (String(body.confirmationText || "").trim() !== action.confirmationText) {
    const e = new Error(`Exact confirmation required: ${action.confirmationText}`);
    e.code = "EXACT_CONFIRMATION_REQUIRED"; e.httpStatus = 400; throw e;
  }

  const claimed = await models.Action.findOneAndUpdate(
    { _id: action._id, instituteId: req.part117Owner.instituteId, status: { $in: ["preview_ready", "provider_failed"] } },
    { $set: { status: "executing", failureCode: "", failureMessage: "" } },
    { new: true }
  );
  if (!claimed) {
    const current = await models.Action.findById(action._id);
    if (current?.status === "provider_accepted") return { action: current, idempotent: true };
    const e = new Error("Action already executing or state invalid.");
    e.code = "ACTION_IN_PROGRESS"; e.httpStatus = 409; throw e;
  }

  try {
    const result = await invokeProviderAction(providerClient(), claimed);
    claimed.status = "provider_accepted";
    claimed.providerAfter = safeProviderSnapshot(result);
    claimed.providerActionAt = new Date();
    await claimed.save();

    await writeAudit(models, req, "subscription_action_execute", "success", "PROVIDER_ACCEPTED_TEST_MODE", {
      actionId: String(claimed._id),
      actionType: claimed.actionType,
      razorpaySubscriptionId: claimed.razorpaySubscriptionId,
      providerStatus: result?.status || "",
    });
    return { action: claimed, idempotent: false };
  } catch (error) {
    claimed.status = "provider_failed";
    claimed.failureCode = cleanText(error?.error?.code || error?.code || "PROVIDER_ACTION_FAILED", 100);
    claimed.failureMessage = publicError(error);
    await claimed.save().catch(() => null);
    await writeAudit(models, req, "subscription_action_execute", "failed", claimed.failureCode, {
      actionId: String(claimed._id), actionType: claimed.actionType,
    });
    const wrapped = new Error(claimed.failureMessage);
    wrapped.code = "RAZORPAY_SUBSCRIPTION_ACTION_FAILED";
    wrapped.httpStatus = 502;
    throw wrapped;
  }
}
async function listSubscriptions(req) {
  if (!dbReady()) {
    const e = new Error("MongoDB connection required.");
    e.code = "DATABASE_REQUIRED"; e.httpStatus = 503; throw e;
  }
  const { Plan, Checkout, Sync } = dependencies();
  if (!Plan || !Checkout || !Sync) {
    const e = new Error("Parts 113–115 dependencies missing.");
    e.code = "SUBSCRIPTION_DEPENDENCY_MISSING"; e.httpStatus = 503; throw e;
  }
  const locals = await Checkout.find({
    instituteId: req.part117Owner.instituteId,
    razorpaySubscriptionId: { $ne: "" },
  }).sort({ createdAt: -1 }).limit(100).lean();
  const localIds = locals.map((x) => x._id);
  const [syncStates, plans] = await Promise.all([
    Sync.find({ instituteId: req.part117Owner.instituteId, localSubscriptionId: { $in: localIds } }).lean(),
    Plan.find({ instituteId: req.part117Owner.instituteId, _id: { $in: locals.map((x) => x.localPlanId).filter(Boolean) } }).lean(),
  ]);
  const syncMap = new Map(syncStates.map((x) => [String(x.localSubscriptionId), x]));
  const planMap = new Map(plans.map((x) => [String(x._id), x]));
  return locals.map((local) => publicSubscription(local, syncMap.get(String(local._id)), planMap.get(String(local.localPlanId))));
}
async function listTargetPlans(req) {
  const { Plan } = dependencies();
  if (!Plan) {
    const e = new Error("Part 113 plan model missing.");
    e.code = "PART113_DEPENDENCY_MISSING"; e.httpStatus = 503; throw e;
  }
  const plans = await Plan.find({
    instituteId: req.part117Owner.instituteId,
    status: "provider_created",
    razorpayPlanId: { $ne: "" },
  }).sort({ amountPaise: 1 }).lean();
  return plans.map((plan) => ({
    id: String(plan._id),
    planCode: cleanText(plan.planCode || plan.templateCode || "", 50).toUpperCase(),
    name: plan.name,
    period: plan.period,
    amountPaise: plan.amountPaise,
    amountRupees: (Number(plan.amountPaise || 0) / 100).toFixed(2),
    razorpayPlanId: plan.razorpayPlanId,
  }));
}
function parseVani(command = "") {
  const text = cleanText(command, 500).toLowerCase();
  let actionType = "";
  if (/pause|rok do|hold/.test(text)) actionType = "PAUSE_NOW";
  else if (/resume|dobara chalu|continue/.test(text)) actionType = "RESUME_NOW";
  else if (/cancel.*(cycle|end|period)|cycle.*cancel|end.*cancel/.test(text)) actionType = "CANCEL_CYCLE_END";
  else if (/cancel|band karo|terminate/.test(text)) actionType = "CANCEL_NOW";
  else if (/upgrade|downgrade|change plan|plan badlo/.test(text)) actionType = /now|abhi|immediate/.test(text) ? "CHANGE_PLAN_NOW" : "CHANGE_PLAN_CYCLE_END";
  return {
    text, actionType,
    list: /(subscription|plan).*(dikhao|show|list|status)|meri subscription/.test(text),
    accessImpact: /access|features|kya band|kya milega|impact/.test(text),
  };
}

export function registerPart117VaniSubscriptionManager({ app } = {}) {
  if (!app || typeof app.get !== "function" || typeof app.post !== "function") {
    throw new Error("Part 117 registration failed: Express app required.");
  }
  if (app.locals.part117VaniSubscriptionManagerRegistered) return;
  app.locals.part117VaniSubscriptionManagerRegistered = true;
  const models = defineModels();

  app.get(["/vani-subscription-manager", "/subscription-manager", "/part117"], (req, res) => {
    res.sendFile(path.join(frontendDir, "vani-subscription-manager.html"));
  });
  app.get("/vani-subscription-manager.css", (req, res) => {
    res.type("text/css").sendFile(path.join(frontendDir, "vani-subscription-manager.css"));
  });
  app.get("/vani-subscription-manager.js", (req, res) => {
    res.type("application/javascript").sendFile(path.join(frontendDir, "vani-subscription-manager.js"));
  });

  app.get("/api/part117/status", (req, res) => {
    const state = providerState();
    const d = dependencies();
    res.json({
      success: true, part: PART_NUMBER, name: PART_NAME,
      status: "owner_verified_test_subscription_manager_active",
      testModeLocked: state.testModeLocked,
      providerReady: state.providerReady,
      ownerActionSecretConfigured: state.ownerActionSecretConfigured,
      actionReady: state.actionReady && dbReady() && Boolean(d.Plan && d.Checkout && d.Sync && d.Snapshot),
      databaseConnected: dbReady(),
      part113Ready: Boolean(d.Plan),
      part114Ready: Boolean(d.Checkout),
      part115Ready: Boolean(d.Sync),
      part116Ready: Boolean(d.Snapshot),
      previewRequired: true,
      exactConfirmationRequired: true,
      ownerVerificationRequired: true,
      liveActionsEnabled: false,
      nextPart: 118,
      nextPartName: "Razorpay Live Readiness and Controlled Launch",
    });
  });

  app.get("/api/part117/security-policy", (req, res) => {
    res.json({
      success: true, part: PART_NUMBER,
      ownerOnly: true, instituteIdMatchRequired: true,
      privateScreenFirst: true, previewRequired: true,
      exactConfirmationRequired: true, ownerVerificationRequired: true,
      ownerActionSecretNeverReturned: true, providerSecretsNeverReturned: true,
      liveModeBlockedUntilPart118: true,
      cancelNowMarkedIrreversible: true,
      planChangeNowMayCreateProrationAdjustment: true,
      customerNotificationRequestedForPlanChange: true,
      part115WebhookRemainsStatusAuthority: true,
      part116AccessRecalculatesAfterVerifiedWebhook: true,
    });
  });

  app.get("/api/part117/subscriptions", ownerOnly, async (req, res) => {
    try {
      const subscriptions = await listSubscriptions(req);
      res.json({ success: true, part: PART_NUMBER, count: subscriptions.length, subscriptions });
    } catch (e) {
      res.status(e.httpStatus || 500).json({ success: false, part: PART_NUMBER, code: e.code || "SUBSCRIPTION_LIST_FAILED", message: e.message });
    }
  });

  app.get("/api/part117/target-plans", ownerOnly, async (req, res) => {
    try {
      const plans = await listTargetPlans(req);
      res.json({ success: true, part: PART_NUMBER, count: plans.length, plans });
    } catch (e) {
      res.status(e.httpStatus || 500).json({ success: false, part: PART_NUMBER, code: e.code || "TARGET_PLAN_LIST_FAILED", message: e.message });
    }
  });

  app.get("/api/part117/actions", ownerOnly, async (req, res) => {
    if (!dbReady()) return res.status(503).json({ success: false, part: PART_NUMBER, code: "DATABASE_REQUIRED", message: "MongoDB connection required." });
    const actions = await models.Action.find({ instituteId: req.part117Owner.instituteId }).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ success: true, part: PART_NUMBER, count: actions.length, actions: actions.map(publicAction) });
  });

  app.post("/api/part117/action/preview", ownerOnly, async (req, res) => {
    try {
      const result = await createPreview(models, req, req.body || {});
      res.json({
        success: true, part: PART_NUMBER, duplicate: result.duplicate,
        action: publicAction(result.action),
        subscription: result.subscription,
        confirmationTextRequired: result.action.confirmationText,
        ownerVerificationRequired: true,
        needsConfirmation: result.action.status !== "provider_accepted",
        warnings: [
          "Part 117 Test Mode only hai.",
          "Provider action ke baad Part 115 verified webhook status authority rahega.",
          "Part 116 feature access webhook sync ke baad recalculate hoga.",
          result.action.actionType === "CANCEL_NOW" ? "Cancel-now irreversible hai; cancelled Subscription restart nahi hoti." : "",
          result.action.actionType === "CHANGE_PLAN_NOW" ? "Immediate plan change test invoice/credit adjustment create kar sakta hai." : "",
        ].filter(Boolean),
      });
    } catch (e) {
      res.status(e.httpStatus || 500).json({ success: false, part: PART_NUMBER, code: e.code || "ACTION_PREVIEW_FAILED", message: e.message });
    }
  });

  app.post("/api/part117/action/execute-confirmed", ownerOnly, async (req, res) => {
    try {
      const result = await executeAction(models, req, req.body || {});
      res.json({
        success: true, part: PART_NUMBER,
        idempotent: result.idempotent,
        message: result.idempotent ? "Existing provider-accepted Test action returned." : "Razorpay Test subscription action accepted.",
        action: publicAction(result.action),
        webhookSyncPending: true,
        part116AccessRecalculationPending: true,
        realMoneyLiveActionExecuted: false,
      });
    } catch (e) {
      res.status(e.httpStatus || 500).json({
        success: false, part: PART_NUMBER,
        code: e.code || "ACTION_EXECUTE_FAILED", message: e.message,
        providerActionAccepted: false, realMoneyLiveActionExecuted: false,
      });
    }
  });

  app.post("/api/part117/vani/command", ownerOnly, async (req, res) => {
    const command = cleanText(req.body?.command || "", 500);
    if (!command) return res.status(400).json({ success: false, part: PART_NUMBER, message: "VANI command required." });
    const parsed = parseVani(command);

    if (/secret|api key|key secret|webhook secret|owner secret|password|otp|cvv|upi pin/.test(parsed.text)) {
      await writeAudit(models, req, "vani_sensitive_subscription_request", "blocked", "SENSITIVE_DATA_REQUEST");
      return res.json({
        success: true, part: PART_NUMBER,
        replyText: "Owner verification secret, API Secret, OTP, CVV aur UPI PIN VANI ko mat boliye. Private verification field use karein.",
        spokenSafeSummary: "Sensitive subscription details private screen par rahengi.",
        actionExecuted: false, privateScreenFirst: true,
      });
    }
    if (/live|real payment|production/.test(parsed.text)) {
      return res.json({
        success: true, part: PART_NUMBER,
        replyText: "Part 117 me Live subscription actions locked hain. Part 118 readiness aur controlled launch ke baad hi Live Mode enable hoga.",
        spokenSafeSummary: "Live subscription action abhi safety lock me hai.",
        actionExecuted: false,
      });
    }
    try {
      if (parsed.list || parsed.accessImpact) {
        const subscriptions = await listSubscriptions(req);
        return res.json({
          success: true, part: PART_NUMBER,
          replyText: `${subscriptions.length} Subscription records mile. Status aur access-impact details private screen par hain.`,
          spokenSafeSummary: `${subscriptions.length} subscriptions mile.`,
          privateScreenDetails: subscriptions,
          actionExecuted: false,
        });
      }
      if (parsed.actionType) {
        const missing = [];
        if (!req.body?.localSubscriptionId) missing.push("local Subscription selection");
        if (parsed.actionType.startsWith("CHANGE_PLAN") && !req.body?.targetLocalPlanId) missing.push("target plan");
        if (missing.length) {
          return res.json({
            success: true, part: PART_NUMBER,
            replyText: `${parsed.actionType} preview ke liye ${missing.join(" aur ")} chahiye. Main pehle safe preview banaungi.`,
            spokenSafeSummary: "Subscription action ke liye kuch details pending hain.",
            detectedAction: parsed.actionType, missingDetails: missing, actionExecuted: false,
          });
        }
        const result = await createPreview(models, req, {
          actionType: parsed.actionType,
          localSubscriptionId: req.body.localSubscriptionId,
          targetLocalPlanId: req.body.targetLocalPlanId,
          reason: req.body.reason || command,
        });
        return res.json({
          success: true, part: PART_NUMBER,
          replyText: `${parsed.actionType} Test preview ready hai. Access impact check karke exact confirmation aur private owner verification dijiye.`,
          spokenSafeSummary: "Subscription action preview ready hai.",
          action: publicAction(result.action),
          subscription: result.subscription,
          confirmationTextRequired: result.action.confirmationText,
          ownerVerificationRequired: true,
          actionExecuted: false,
        });
      }
      const subscriptions = await listSubscriptions(req);
      res.json({
        success: true, part: PART_NUMBER,
        replyText: "Main Subscription status dikha sakti hoon aur pause, resume, cancel ya plan-change ka safe Test preview bana sakti hoon. Risky action exact confirmation aur private owner verification ke bina execute nahi hoga.",
        spokenSafeSummary: "Subscription Manager ready hai.",
        subscriptionCount: subscriptions.length,
        supportedActions: Array.from(ACTIONS),
        actionExecuted: false,
      });
    } catch (e) {
      res.status(e.httpStatus || 500).json({ success: false, part: PART_NUMBER, code: e.code || "VANI_SUBSCRIPTION_MANAGER_FAILED", message: e.message });
    }
  });

  app.get("/api/part117/demo", (req, res) => {
    res.json({
      success: true, part: PART_NUMBER, name: PART_NAME, page: "/vani-subscription-manager",
      supportedActions: Array.from(ACTIONS),
      flow: [
        "Owner selects Subscription and optional target plan",
        "VANI/owner creates preview",
        "Access impact and risk warnings shown",
        "Exact confirmation entered",
        "Private owner verification completed",
        "Razorpay Test action executed",
        "Part 115 webhook verifies final status",
        "Part 116 recalculates feature access",
      ],
      safety: {
        testModeOnly: true, liveActionsEnabled: false,
        previewRequired: true, exactConfirmationRequired: true,
        ownerVerificationRequired: true, providerSecretsReturned: false,
      },
    });
  });
}
