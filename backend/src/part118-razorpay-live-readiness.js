import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import Razorpay from "razorpay";

const PART_NUMBER = 118;
const PART_NAME = "Razorpay Live Readiness and Controlled Launch";
const OWNER_ROLES = new Set(["institute_owner", "owner", "instituteowner"]);
const REQUIRED_EVIDENCE_KEYS = Object.freeze([
  "adultMerchantApproved",
  "legalEntityConfirmed",
  "razorpayAccountActivated",
  "websiteSubmitted",
  "websiteVerified",
  "policyPagesPublished",
  "pricingPublished",
  "supportContactPublished",
  "bankSettlementConfirmed",
  "refundProcessReady",
  "testPlanCreated",
  "testCheckoutPassed",
  "testWebhookPassed",
  "testAccessGatePassed",
  "liveWebhookDashboardConfigured",
  "liveWebhookAlertEmailConfigured",
]);
const PUBLIC_URL_FIELDS = Object.freeze([
  "websiteUrl",
  "pricingUrl",
  "termsUrl",
  "privacyUrl",
  "contactUrl",
  "cancellationRefundUrl",
  "shippingPolicyUrl",
]);
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
function cleanEmail(value = "") {
  const email = String(value || "").trim().toLowerCase().slice(0, 180);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
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
      // Try another existing JWT secret.
    }
  }
  const error = new Error("Login session invalid or expired.");
  error.code = "INVALID_SESSION";
  error.httpStatus = 401;
  throw error;
}
function buildOwner(req) {
  let payload = req.user || req.auth || null;
  if (!payload && getBearer(req)) payload = verifyJwt(getBearer(req));
  if (!payload) {
    const error = new Error("Institute owner login required.");
    error.code = "OWNER_LOGIN_REQUIRED";
    error.httpStatus = 401;
    throw error;
  }
  const role = normalizeRole(payload.role || payload.userRole || payload.accountRole || payload.user?.role || "");
  if (!OWNER_ROLES.has(role)) {
    const error = new Error("Only institute_owner can approve Razorpay Live launch.");
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
    userId: cleanId(payload.userId || payload.id || payload._id || payload.sub || payload.user?.id || "owner"),
  };
}
function ownerOnly(req, res, next) {
  try {
    req.part118Owner = buildOwner(req);
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
function safeEqualText(left, right) {
  const a = crypto.createHash("sha256").update(String(left || "")).digest();
  const b = crypto.createHash("sha256").update(String(right || "")).digest();
  return crypto.timingSafeEqual(a, b);
}
function verifyOwnerAction(req) {
  const expected = String(process.env.NAXORA_OWNER_ACTION_SECRET || "").trim();
  if (!expected) {
    const error = new Error("NAXORA_OWNER_ACTION_SECRET Render Environment me configure karein.");
    error.code = "OWNER_ACTION_SECRET_MISSING";
    error.httpStatus = 503;
    throw error;
  }
  const supplied = String(req.headers["x-naxora-owner-action-secret"] || "").trim();
  if (!supplied || !safeEqualText(supplied, expected)) {
    const error = new Error("Private owner verification failed.");
    error.code = "OWNER_VERIFICATION_FAILED";
    error.httpStatus = 403;
    throw error;
  }
}
function hash(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}
function requestId(req) {
  return hash(`${Date.now()}:${req.ip || ""}:${crypto.randomUUID()}`).slice(0, 20);
}
function parseBoolean(value) {
  return ["1", "true", "yes", "approved", "pass"].includes(String(value || "").trim().toLowerCase());
}
function safeHttpsUrl(value) {
  const text = String(value || "").trim().slice(0, 500);
  if (!text) return "";
  try {
    const url = new URL(text);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}
function maskKey(value = "") {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.length < 10) return "configured";
  return `${text.slice(0, 8)}…${text.slice(-4)}`;
}
function envState() {
  const baseUrl = safeHttpsUrl(process.env.NAXORA_PUBLIC_BASE_URL);
  const liveKeyId = String(process.env.RAZORPAY_LIVE_KEY_ID || "").trim();
  const liveKeySecret = String(process.env.RAZORPAY_LIVE_KEY_SECRET || "").trim();
  const liveWebhookSecret = String(process.env.RAZORPAY_LIVE_WEBHOOK_SECRET || "").trim();
  const ownerActionSecret = String(process.env.NAXORA_OWNER_ACTION_SECRET || "").trim();
  const supportEmail = cleanEmail(process.env.NAXORA_RAZORPAY_SUPPORT_EMAIL);
  const liveLaunched = parseBoolean(process.env.NAXORA_RAZORPAY_LIVE_LAUNCHED);

  const publicUrls = {
    websiteUrl: safeHttpsUrl(process.env.NAXORA_RAZORPAY_WEBSITE_URL || baseUrl),
    pricingUrl: safeHttpsUrl(process.env.NAXORA_RAZORPAY_PRICING_URL),
    termsUrl: safeHttpsUrl(process.env.NAXORA_RAZORPAY_TERMS_URL),
    privacyUrl: safeHttpsUrl(process.env.NAXORA_RAZORPAY_PRIVACY_URL),
    contactUrl: safeHttpsUrl(process.env.NAXORA_RAZORPAY_CONTACT_URL),
    cancellationRefundUrl: safeHttpsUrl(process.env.NAXORA_RAZORPAY_CANCELLATION_REFUND_URL),
    shippingPolicyUrl: safeHttpsUrl(process.env.NAXORA_RAZORPAY_SHIPPING_POLICY_URL),
  };
  const allPublicUrlsConfigured = Object.values(publicUrls).every(Boolean);
  const liveKeyLooksCorrect = Boolean(liveKeyId && liveKeyId.startsWith("rzp_live_"));
  return {
    baseUrl,
    publicUrls,
    allPublicUrlsConfigured,
    supportEmail,
    liveKeyIdConfigured: Boolean(liveKeyId),
    liveKeyIdMasked: maskKey(liveKeyId),
    liveKeyLooksCorrect,
    liveKeySecretConfigured: Boolean(liveKeySecret),
    liveWebhookSecretConfigured: Boolean(liveWebhookSecret),
    ownerActionSecretConfigured: Boolean(ownerActionSecret),
    liveCredentialsReady: Boolean(liveKeyLooksCorrect && liveKeySecret),
    launchFlagEnabled: liveLaunched,
    realMoneyCollectionEnabled: liveLaunched,
    testModePreservedForParts112To117: !liveLaunched,
  };
}
function defineModels() {
  const evidenceSchema = new mongoose.Schema({
    instituteId: { type: String, required: true, unique: true, index: true },
    adultMerchantApproved: { type: Boolean, default: false },
    legalEntityConfirmed: { type: Boolean, default: false },
    razorpayAccountActivated: { type: Boolean, default: false },
    websiteSubmitted: { type: Boolean, default: false },
    websiteVerified: { type: Boolean, default: false },
    policyPagesPublished: { type: Boolean, default: false },
    pricingPublished: { type: Boolean, default: false },
    supportContactPublished: { type: Boolean, default: false },
    bankSettlementConfirmed: { type: Boolean, default: false },
    refundProcessReady: { type: Boolean, default: false },
    testPlanCreated: { type: Boolean, default: false },
    testCheckoutPassed: { type: Boolean, default: false },
    testWebhookPassed: { type: Boolean, default: false },
    testAccessGatePassed: { type: Boolean, default: false },
    liveWebhookDashboardConfigured: { type: Boolean, default: false },
    liveWebhookAlertEmailConfigured: { type: Boolean, default: false },
    websiteUrl: { type: String, default: "" },
    pricingUrl: { type: String, default: "" },
    termsUrl: { type: String, default: "" },
    privacyUrl: { type: String, default: "" },
    contactUrl: { type: String, default: "" },
    cancellationRefundUrl: { type: String, default: "" },
    shippingPolicyUrl: { type: String, default: "" },
    supportEmail: { type: String, default: "" },
    adultApproverName: { type: String, default: "" },
    reviewNote: { type: String, default: "" },
    checkedByUserId: { type: String, default: "" },
    checkedAt: { type: Date, default: null },
  }, { timestamps: true, strict: true });

  const launchSchema = new mongoose.Schema({
    instituteId: { type: String, required: true, index: true },
    ownerUserId: { type: String, required: true },
    readinessDigest: { type: String, required: true, index: true },
    confirmationText: { type: String, required: true },
    status: {
      type: String,
      enum: [
        "preview_ready",
        "approved_pending_environment_switch",
        "launched_by_environment",
        "rollback_preview_ready",
        "rollback_approved_pending_environment_switch",
      ],
      default: "preview_ready",
      index: true,
    },
    readinessSnapshot: { type: mongoose.Schema.Types.Mixed, required: true },
    approvedAt: { type: Date, default: null },
    rollbackConfirmationText: { type: String, default: "" },
    rollbackApprovedAt: { type: Date, default: null },
  }, { timestamps: true, strict: true });
  launchSchema.index({ instituteId: 1, readinessDigest: 1 }, { unique: true });

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
    Evidence: mongoose.models.Part118LiveReadinessEvidence || mongoose.model("Part118LiveReadinessEvidence", evidenceSchema),
    Launch: mongoose.models.Part118ControlledLaunch || mongoose.model("Part118ControlledLaunch", launchSchema),
    Audit: mongoose.models.Part118LiveLaunchAudit || mongoose.model("Part118LiveLaunchAudit", auditSchema),
  };
}
async function writeAudit(models, req, action, result, reasonCode = "", details = {}) {
  if (!dbReady()) return { saved: false };
  try {
    await models.Audit.create({
      instituteId: req.part118Owner?.instituteId || details.instituteId || "system",
      actorUserId: req.part118Owner?.userId || "system",
      action,
      result,
      reasonCode,
      requestId: requestId(req),
      details,
    });
    return { saved: true };
  } catch {
    return { saved: false };
  }
}
function dependencyState() {
  return {
    part113: Boolean(mongoose.models.Part113NaxoraSubscriptionPlan),
    part114: Boolean(mongoose.models.Part114CheckoutSubscription),
    part115: Boolean(mongoose.models.Part115SubscriptionSyncState),
    part116: Boolean(mongoose.models.Part116AccessSnapshot),
    part117: Boolean(mongoose.models.Part117SubscriptionAction),
  };
}
function sanitizedEvidenceInput(body = {}) {
  const result = {};
  for (const key of REQUIRED_EVIDENCE_KEYS) result[key] = body[key] === true;
  for (const key of PUBLIC_URL_FIELDS) result[key] = safeHttpsUrl(body[key]);
  result.supportEmail = cleanEmail(body.supportEmail);
  result.adultApproverName = cleanText(body.adultApproverName, 120);
  result.reviewNote = cleanText(body.reviewNote, 500);
  return result;
}
function evidenceChecks(evidence, environment, deps) {
  const checks = [];
  for (const key of REQUIRED_EVIDENCE_KEYS) {
    checks.push({
      id: key,
      group: "manual_evidence",
      label: key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()),
      pass: Boolean(evidence?.[key]),
      blocking: true,
    });
  }
  for (const key of PUBLIC_URL_FIELDS) {
    checks.push({
      id: key,
      group: "public_website",
      label: `${key.replace(/([A-Z])/g, " $1")} uses HTTPS`,
      pass: Boolean(evidence?.[key] || environment.publicUrls[key]),
      blocking: true,
    });
  }
  checks.push(
    { id: "supportEmail", group: "public_website", label: "Valid customer support email", pass: Boolean(evidence?.supportEmail || environment.supportEmail), blocking: true },
    { id: "adultApproverName", group: "legal_owner", label: "Adult legal merchant approver recorded", pass: Boolean(evidence?.adultApproverName), blocking: true },
    { id: "database", group: "technical", label: "MongoDB connected", pass: dbReady(), blocking: true },
    { id: "parts113to117", group: "technical", label: "Parts 113–117 dependencies active", pass: Object.values(deps).every(Boolean), blocking: true },
    { id: "baseUrl", group: "technical", label: "NAXORA public HTTPS base URL", pass: Boolean(environment.baseUrl), blocking: true },
    { id: "liveKeyId", group: "live_credentials", label: "Live Key ID begins rzp_live_", pass: environment.liveKeyLooksCorrect, blocking: true },
    { id: "liveKeySecret", group: "live_credentials", label: "Live Key Secret configured privately", pass: environment.liveKeySecretConfigured, blocking: true },
    { id: "liveWebhookSecret", group: "live_credentials", label: "Separate Live Webhook Secret configured", pass: environment.liveWebhookSecretConfigured, blocking: true },
    { id: "ownerActionSecret", group: "live_credentials", label: "Owner Action Secret configured", pass: environment.ownerActionSecretConfigured, blocking: true },
    { id: "liveLaunchFlag", group: "launch_state", label: "Manual Live launch flag", pass: environment.launchFlagEnabled, blocking: false }
  );
  return checks;
}
async function readinessFor(models, instituteId) {
  const evidence = dbReady() ? await models.Evidence.findOne({ instituteId }).lean() : null;
  const environment = envState();
  const deps = dependencyState();
  const checks = evidenceChecks(evidence, environment, deps);
  const blockingChecks = checks.filter((check) => check.blocking);
  const passedBlocking = blockingChecks.filter((check) => check.pass).length;
  const allBlockingPassed = passedBlocking === blockingChecks.length;
  return {
    instituteId,
    evidence: evidence || null,
    environment,
    dependencies: deps,
    checks,
    summary: {
      totalBlocking: blockingChecks.length,
      passedBlocking,
      failedBlocking: blockingChecks.length - passedBlocking,
      allBlockingPassed,
      providerProbeRequired: true,
      launchApprovalPossible: allBlockingPassed,
      realMoneyCollectionEnabled: environment.realMoneyCollectionEnabled,
    },
  };
}
function confirmationText(instituteId, readinessDigest) {
  return `APPROVE LIVE LAUNCH ${instituteId} ${readinessDigest.slice(0, 10).toUpperCase()}`;
}
function rollbackText(instituteId) {
  return `ROLL BACK LIVE PAYMENTS ${instituteId}`;
}
async function providerProbe() {
  const state = envState();
  if (!state.liveCredentialsReady) {
    const error = new Error("Live API credentials readiness check failed.");
    error.code = "LIVE_CREDENTIALS_NOT_READY";
    error.httpStatus = 412;
    throw error;
  }
  try {
    const client = new Razorpay({
      key_id: process.env.RAZORPAY_LIVE_KEY_ID,
      key_secret: process.env.RAZORPAY_LIVE_KEY_SECRET,
    });
    const response = await client.plans.all({ count: 1 });
    return {
      success: true,
      mode: "live",
      credentialsAuthenticated: true,
      readOnlyProbe: true,
      planCountReturned: Array.isArray(response?.items) ? response.items.length : 0,
      providerSecretsReturned: false,
    };
  } catch (error) {
    const status = Number(error?.statusCode || error?.status || 0);
    const message = status === 401
      ? "Razorpay Live credentials invalid hain."
      : "Razorpay Live read-only connectivity probe complete nahi hui.";
    const wrapped = new Error(message);
    wrapped.code = "LIVE_PROVIDER_PROBE_FAILED";
    wrapped.httpStatus = 502;
    throw wrapped;
  }
}
function parseVani(command = "") {
  const text = cleanText(command, 500).toLowerCase();
  return {
    text,
    readiness: /readiness|ready|go live|live status|launch status/.test(text),
    checklist: /checklist|requirements|kya pending|pending checks/.test(text),
    approve: /approve|launch karo|live on|go live karo/.test(text),
    rollback: /rollback|live off|payments band|test mode/.test(text),
    probe: /live key|connectivity|provider check|razorpay check/.test(text),
  };
}

export function registerPart118LiveReadiness({ app } = {}) {
  if (!app || typeof app.get !== "function" || typeof app.post !== "function") {
    throw new Error("Part 118 registration failed: Express app required.");
  }
  if (app.locals.part118LiveReadinessRegistered) return;
  app.locals.part118LiveReadinessRegistered = true;
  const models = defineModels();

  app.get(["/razorpay-live-readiness", "/controlled-payment-launch", "/part118"], (req, res) => {
    res.sendFile(path.join(frontendDir, "razorpay-live-readiness.html"));
  });
  app.get("/razorpay-live-readiness.css", (req, res) => {
    res.type("text/css").sendFile(path.join(frontendDir, "razorpay-live-readiness.css"));
  });
  app.get("/razorpay-live-readiness.js", (req, res) => {
    res.type("application/javascript").sendFile(path.join(frontendDir, "razorpay-live-readiness.js"));
  });

  app.get("/api/part118/status", (req, res) => {
    const environment = envState();
    const deps = dependencyState();
    res.json({
      success: true,
      part: PART_NUMBER,
      name: PART_NAME,
      status: environment.launchFlagEnabled ? "live_launch_flag_enabled" : "live_readiness_gate_active",
      databaseConnected: dbReady(),
      dependencies: deps,
      liveKeyIdConfigured: environment.liveKeyIdConfigured,
      liveKeyIdMasked: environment.liveKeyIdMasked,
      liveKeyLooksCorrect: environment.liveKeyLooksCorrect,
      liveKeySecretConfigured: environment.liveKeySecretConfigured,
      liveWebhookSecretConfigured: environment.liveWebhookSecretConfigured,
      ownerActionSecretConfigured: environment.ownerActionSecretConfigured,
      controlledApprovalRequired: true,
      automaticEnvironmentMutationEnabled: false,
      kycDocumentsStoredInNaxora: false,
      realMoneyCollectionEnabled: environment.realMoneyCollectionEnabled,
      unifiedSingleAppReady: false,
      nextPart: 119,
      nextPartName: "Unified Single App Shell",
    });
  });

  app.get("/api/part118/requirements", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      evidenceKeys: REQUIRED_EVIDENCE_KEYS,
      publicUrlFields: PUBLIC_URL_FIELDS,
      requiredPrivateEnvironmentVariables: [
        "RAZORPAY_LIVE_KEY_ID",
        "RAZORPAY_LIVE_KEY_SECRET",
        "RAZORPAY_LIVE_WEBHOOK_SECRET",
        "NAXORA_OWNER_ACTION_SECRET",
      ],
      launchFlag: "NAXORA_RAZORPAY_LIVE_LAUNCHED",
      rule: "Real money must remain disabled until adult merchant onboarding, account/website approval, Live keys, webhook testing and exact owner approval are complete.",
      identityOrBankDocumentsMustBeUploadedOnlyToRazorpay: true,
    });
  });

  app.get("/api/part118/security-policy", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      ownerOnlyPrivateControls: true,
      instituteIdMatchRequired: true,
      adultLegalMerchantApprovalRequired: true,
      privateOwnerVerificationRequired: true,
      exactConfirmationRequired: true,
      publicHttpsPoliciesRequired: true,
      liveApiSecretNeverReturned: true,
      liveWebhookSecretNeverReturned: true,
      identityDocumentsNotAcceptedByNaxora: true,
      bankDocumentsNotAcceptedByNaxora: true,
      providerProbeReadOnly: true,
      launchDoesNotAutomaticallyEditRenderEnvironment: true,
      rollbackPlanRequired: true,
      singleAppMergePendingPart119To127: true,
    });
  });

  app.get("/api/part118/readiness", ownerOnly, async (req, res) => {
    try {
      const readiness = await readinessFor(models, req.part118Owner.instituteId);
      const latestLaunch = dbReady()
        ? await models.Launch.findOne({ instituteId: req.part118Owner.instituteId }).sort({ createdAt: -1 }).lean()
        : null;
      res.json({
        success: true,
        part: PART_NUMBER,
        readiness,
        latestLaunch: latestLaunch ? {
          id: String(latestLaunch._id),
          status: latestLaunch.status,
          approvedAt: latestLaunch.approvedAt,
          rollbackApprovedAt: latestLaunch.rollbackApprovedAt,
          createdAt: latestLaunch.createdAt,
        } : null,
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "READINESS_FAILED",
        message: error.message,
      });
    }
  });

  app.post("/api/part118/evidence", ownerOnly, async (req, res) => {
    try {
      if (!dbReady()) {
        const error = new Error("MongoDB connection required.");
        error.code = "DATABASE_REQUIRED";
        error.httpStatus = 503;
        throw error;
      }
      const input = sanitizedEvidenceInput(req.body || {});
      if (!input.adultApproverName && input.adultMerchantApproved) {
        const error = new Error("Adult legal merchant approver name required.");
        error.code = "ADULT_APPROVER_REQUIRED";
        error.httpStatus = 400;
        throw error;
      }
      const evidence = await models.Evidence.findOneAndUpdate(
        { instituteId: req.part118Owner.instituteId },
        {
          $set: {
            ...input,
            checkedByUserId: req.part118Owner.userId,
            checkedAt: new Date(),
          },
          $setOnInsert: { instituteId: req.part118Owner.instituteId },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      await writeAudit(models, req, "live_readiness_evidence_update", "success", "NON_SENSITIVE_EVIDENCE_ONLY", {
        evidenceId: String(evidence._id),
        checkedKeys: REQUIRED_EVIDENCE_KEYS.filter((key) => evidence[key]),
      });
      res.json({
        success: true,
        part: PART_NUMBER,
        message: "Non-sensitive readiness evidence saved.",
        evidence,
        identityOrBankDocumentsStored: false,
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "EVIDENCE_SAVE_FAILED",
        message: error.message,
      });
    }
  });

  app.post("/api/part118/provider-probe", ownerOnly, async (req, res) => {
    try {
      const result = await providerProbe();
      await writeAudit(models, req, "live_provider_read_only_probe", "success", "LIVE_CREDENTIALS_AUTHENTICATED", {});
      res.json({ success: true, part: PART_NUMBER, result });
    } catch (error) {
      await writeAudit(models, req, "live_provider_read_only_probe", "failed", error.code || "PROBE_FAILED", {});
      res.status(error.httpStatus || 502).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "PROVIDER_PROBE_FAILED",
        message: error.message,
      });
    }
  });

  app.post("/api/part118/launch/preview", ownerOnly, async (req, res) => {
    try {
      if (!dbReady()) {
        const error = new Error("MongoDB connection required.");
        error.code = "DATABASE_REQUIRED";
        error.httpStatus = 503;
        throw error;
      }
      const readiness = await readinessFor(models, req.part118Owner.instituteId);
      if (!readiness.summary.allBlockingPassed) {
        const error = new Error(`${readiness.summary.failedBlocking} blocking readiness checks pending hain.`);
        error.code = "LIVE_READINESS_INCOMPLETE";
        error.httpStatus = 409;
        throw error;
      }
      const probe = await providerProbe();
      const readinessDigest = hash(JSON.stringify({
        instituteId: readiness.instituteId,
        checks: readiness.checks.map((check) => [check.id, check.pass]),
        liveKeyIdMasked: readiness.environment.liveKeyIdMasked,
        providerProbe: probe.credentialsAuthenticated,
      }));
      const exactConfirmation = confirmationText(req.part118Owner.instituteId, readinessDigest);
      let launch = await models.Launch.findOne({
        instituteId: req.part118Owner.instituteId,
        readinessDigest,
      });
      const duplicate = Boolean(launch);
      if (!launch) {
        launch = await models.Launch.create({
          instituteId: req.part118Owner.instituteId,
          ownerUserId: req.part118Owner.userId,
          readinessDigest,
          confirmationText: exactConfirmation,
          status: "preview_ready",
          readinessSnapshot: {
            summary: readiness.summary,
            checks: readiness.checks,
            environment: {
              baseUrl: readiness.environment.baseUrl,
              publicUrls: readiness.environment.publicUrls,
              supportEmail: readiness.environment.supportEmail,
              liveKeyIdMasked: readiness.environment.liveKeyIdMasked,
              liveKeyLooksCorrect: readiness.environment.liveKeyLooksCorrect,
              liveWebhookSecretConfigured: readiness.environment.liveWebhookSecretConfigured,
            },
            providerProbe: probe,
          },
        });
      }
      await writeAudit(models, req, "live_launch_preview", "success", duplicate ? "DUPLICATE_PREVIEW_RETURNED" : "PREVIEW_CREATED", {
        launchId: String(launch._id),
      });
      res.json({
        success: true,
        part: PART_NUMBER,
        duplicate,
        launch: {
          id: String(launch._id),
          status: launch.status,
          readinessSnapshot: launch.readinessSnapshot,
          createdAt: launch.createdAt,
        },
        confirmationTextRequired: launch.confirmationText,
        ownerVerificationRequired: true,
        automaticEnvironmentMutationEnabled: false,
        realMoneyEnabledByThisPreview: false,
        nextManualStepAfterApproval: "Adult merchant owner updates Render only after reviewing approval record and rollback plan.",
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "LAUNCH_PREVIEW_FAILED",
        message: error.message,
      });
    }
  });

  app.post("/api/part118/launch/approve-confirmed", ownerOnly, async (req, res) => {
    try {
      verifyOwnerAction(req);
      if (!dbReady()) {
        const error = new Error("MongoDB connection required.");
        error.code = "DATABASE_REQUIRED";
        error.httpStatus = 503;
        throw error;
      }
      const id = cleanId(req.body?.launchId);
      if (!mongoose.isValidObjectId(id)) {
        const error = new Error("Valid launch preview ID required.");
        error.code = "INVALID_LAUNCH_ID";
        error.httpStatus = 400;
        throw error;
      }
      const launch = await models.Launch.findOne({
        _id: id,
        instituteId: req.part118Owner.instituteId,
      });
      if (!launch) {
        const error = new Error("Launch preview not found.");
        error.code = "LAUNCH_PREVIEW_NOT_FOUND";
        error.httpStatus = 404;
        throw error;
      }
      if (String(req.body?.confirmationText || "").trim() !== launch.confirmationText) {
        const error = new Error(`Exact confirmation required: ${launch.confirmationText}`);
        error.code = "EXACT_CONFIRMATION_REQUIRED";
        error.httpStatus = 400;
        throw error;
      }
      const readiness = await readinessFor(models, req.part118Owner.instituteId);
      if (!readiness.summary.allBlockingPassed) {
        const error = new Error("Readiness changed; create a fresh launch preview.");
        error.code = "READINESS_CHANGED";
        error.httpStatus = 409;
        throw error;
      }
      await providerProbe();
      launch.status = "approved_pending_environment_switch";
      launch.approvedAt = new Date();
      launch.rollbackConfirmationText = rollbackText(req.part118Owner.instituteId);
      await launch.save();
      await writeAudit(models, req, "live_launch_approval", "success", "APPROVED_PENDING_MANUAL_ENV_SWITCH", {
        launchId: String(launch._id),
      });
      res.json({
        success: true,
        part: PART_NUMBER,
        message: "Controlled Live launch approved. Real money is still OFF until the adult merchant owner performs the documented manual environment switch.",
        launch: {
          id: String(launch._id),
          status: launch.status,
          approvedAt: launch.approvedAt,
          rollbackConfirmationText: launch.rollbackConfirmationText,
        },
        automaticEnvironmentMutationEnabled: false,
        realMoneyEnabledByThisApi: false,
        requiredManualSwitch: [
          "Keep a Render environment backup.",
          "Configure approved Live credentials and Live webhook secret privately.",
          "Set NAXORA_RAZORPAY_LIVE_LAUNCHED=true only during the supervised launch window.",
          "Deploy and run a low-value controlled transaction using the adult merchant account.",
          "Verify Live webhook, captured payment/subscription state and settlement dashboard.",
          "Rollback immediately if any check fails.",
        ],
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "LIVE_APPROVAL_FAILED",
        message: error.message,
        realMoneyEnabledByThisApi: false,
      });
    }
  });

  app.post("/api/part118/rollback/preview", ownerOnly, async (req, res) => {
    try {
      if (!dbReady()) {
        const error = new Error("MongoDB connection required.");
        error.code = "DATABASE_REQUIRED";
        error.httpStatus = 503;
        throw error;
      }
      const launch = await models.Launch.findOne({
        instituteId: req.part118Owner.instituteId,
        status: { $in: ["approved_pending_environment_switch", "launched_by_environment"] },
      }).sort({ createdAt: -1 });
      if (!launch) {
        const error = new Error("Approved launch record not found.");
        error.code = "APPROVED_LAUNCH_NOT_FOUND";
        error.httpStatus = 404;
        throw error;
      }
      launch.status = "rollback_preview_ready";
      launch.rollbackConfirmationText = rollbackText(req.part118Owner.instituteId);
      await launch.save();
      res.json({
        success: true,
        part: PART_NUMBER,
        launchId: String(launch._id),
        confirmationTextRequired: launch.rollbackConfirmationText,
        rollbackDoesNotAutomaticallyEditRender: true,
        instructions: [
          "Set NAXORA_RAZORPAY_LIVE_LAUNCHED=false.",
          "Restore the Test Mode deployment/environment backup.",
          "Do not delete provider payment or Subscription records.",
          "Review live transactions and settlements in Razorpay Dashboard.",
          "Notify affected customers when required.",
        ],
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "ROLLBACK_PREVIEW_FAILED",
        message: error.message,
      });
    }
  });

  app.post("/api/part118/rollback/approve-confirmed", ownerOnly, async (req, res) => {
    try {
      verifyOwnerAction(req);
      if (!dbReady()) {
        const error = new Error("MongoDB connection required.");
        error.code = "DATABASE_REQUIRED";
        error.httpStatus = 503;
        throw error;
      }
      const id = cleanId(req.body?.launchId);
      if (!mongoose.isValidObjectId(id)) {
        const error = new Error("Valid launch ID required.");
        error.code = "INVALID_LAUNCH_ID";
        error.httpStatus = 400;
        throw error;
      }
      const launch = await models.Launch.findOne({
        _id: id,
        instituteId: req.part118Owner.instituteId,
      });
      if (!launch) {
        const error = new Error("Launch record not found.");
        error.code = "LAUNCH_NOT_FOUND";
        error.httpStatus = 404;
        throw error;
      }
      if (String(req.body?.confirmationText || "").trim() !== launch.rollbackConfirmationText) {
        const error = new Error(`Exact rollback confirmation required: ${launch.rollbackConfirmationText}`);
        error.code = "EXACT_ROLLBACK_CONFIRMATION_REQUIRED";
        error.httpStatus = 400;
        throw error;
      }
      launch.status = "rollback_approved_pending_environment_switch";
      launch.rollbackApprovedAt = new Date();
      await launch.save();
      await writeAudit(models, req, "live_launch_rollback_approval", "success", "ROLLBACK_PENDING_MANUAL_ENV_SWITCH", {
        launchId: String(launch._id),
      });
      res.json({
        success: true,
        part: PART_NUMBER,
        message: "Rollback approved. Adult merchant owner must now set the Live launch flag false and deploy the saved Test environment.",
        automaticEnvironmentMutationEnabled: false,
        realMoneyDisabledByThisApi: false,
        launch: {
          id: String(launch._id),
          status: launch.status,
          rollbackApprovedAt: launch.rollbackApprovedAt,
        },
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "ROLLBACK_APPROVAL_FAILED",
        message: error.message,
      });
    }
  });

  app.post("/api/part118/vani/command", ownerOnly, async (req, res) => {
    const command = cleanText(req.body?.command || "", 500);
    if (!command) {
      return res.status(400).json({
        success: false,
        part: PART_NUMBER,
        message: "VANI command required.",
      });
    }
    const parsed = parseVani(command);
    if (/secret|api key|key secret|webhook secret|password|otp|cvv|upi pin|pan|aadhaar|bank statement/.test(parsed.text)) {
      await writeAudit(models, req, "vani_sensitive_live_launch_request", "blocked", "SENSITIVE_DATA_REQUEST");
      return res.json({
        success: true,
        part: PART_NUMBER,
        replyText: "API Secret, Webhook Secret, password, OTP, KYC identity document aur bank document VANI/chat me mat dijiye. Inhe sirf Razorpay Dashboard aur private Render environment me handle karein.",
        spokenSafeSummary: "Sensitive merchant details private dashboards me rahengi.",
        actionExecuted: false,
        privateScreenFirst: true,
      });
    }
    try {
      const readiness = await readinessFor(models, req.part118Owner.instituteId);
      if (parsed.approve) {
        return res.json({
          success: true,
          part: PART_NUMBER,
          replyText: readiness.summary.allBlockingPassed
            ? "All blocking checks pass hain. Main launch preview bana sakti hoon; exact confirmation aur private owner verification ke baad bhi environment switch manually hoga."
            : `${readiness.summary.failedBlocking} blocking checks pending hain. Live launch preview abhi nahi banega.`,
          spokenSafeSummary: readiness.summary.allBlockingPassed
            ? "Live launch preview ke liye readiness complete hai."
            : `${readiness.summary.failedBlocking} checks pending hain.`,
          missingChecks: readiness.checks.filter((check) => check.blocking && !check.pass),
          actionExecuted: false,
        });
      }
      if (parsed.rollback) {
        return res.json({
          success: true,
          part: PART_NUMBER,
          replyText: "Rollback preview private screen se banega. Exact rollback confirmation aur owner verification ke baad adult merchant owner Render ka Live flag false karega.",
          spokenSafeSummary: "Rollback manual supervised process hai.",
          actionExecuted: false,
        });
      }
      if (parsed.probe) {
        const probe = await providerProbe();
        return res.json({
          success: true,
          part: PART_NUMBER,
          replyText: "Razorpay Live credentials ka read-only connectivity probe pass hua. Secrets private hain.",
          spokenSafeSummary: "Live provider connectivity pass hai.",
          privateScreenDetails: probe,
          actionExecuted: false,
        });
      }
      return res.json({
        success: true,
        part: PART_NUMBER,
        replyText: `${readiness.summary.passedBlocking} of ${readiness.summary.totalBlocking} blocking checks pass hain. ${readiness.summary.failedBlocking} pending hain. Real money ${readiness.environment.realMoneyCollectionEnabled ? "enabled flag par hai" : "abhi OFF hai"}.`,
        spokenSafeSummary: `${readiness.summary.failedBlocking} Live launch checks pending hain.`,
        privateScreenDetails: readiness,
        actionExecuted: false,
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "VANI_LIVE_READINESS_FAILED",
        message: error.message,
      });
    }
  });

  app.get("/api/part118/demo", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      name: PART_NAME,
      page: "/razorpay-live-readiness",
      flow: [
        "Adult legal merchant completes Razorpay activation and website review",
        "Public pricing and policy pages are verified",
        "Test Plan, Checkout, Webhook and Access Gate tests pass",
        "Live keys and separate Live webhook secret are saved privately",
        "Read-only Live credential probe passes",
        "Owner creates launch preview",
        "Exact confirmation and private verification approve launch",
        "Adult merchant owner performs supervised manual environment switch",
        "Low-value controlled Live transaction is verified",
        "Rollback flag is available if any check fails",
      ],
      safety: {
        automaticRealMoneyEnable: false,
        identityDocumentsStoredByNaxora: false,
        bankDocumentsStoredByNaxora: false,
        adultMerchantOwnerRequired: true,
        singleAppMergePending: true,
      },
    });
  });
}
