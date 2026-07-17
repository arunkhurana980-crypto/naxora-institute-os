import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import Razorpay from "razorpay";

const PART_NUMBER = 112;
const PART_NAME = "Razorpay Test Mode Foundation";
const OWNER_ROLES = new Set(["institute_owner", "owner", "instituteowner"]);
const CONNECTION_WINDOW_MS = 10 * 60 * 1000;
const CONNECTION_LIMIT = 5;
const connectionAttempts = new Map();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, "../../frontend");

function normalizeRole(value = "") {
  return String(value).trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function cleanId(value = "") {
  return String(value).trim().replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 120);
}

function maskValue(value = "") {
  const text = String(value || "");
  if (!text) return "not_configured";
  if (text.length <= 8) return "configured_hidden";
  return `${text.slice(0, 4)}...${text.slice(-4)}`;
}

function isDatabaseReady() {
  return mongoose.connection?.readyState === 1;
}

function publicBaseUrl(req) {
  const configured = String(process.env.NAXORA_PUBLIC_BASE_URL || "").trim().replace(/\/$/, "");
  if (configured) return configured;
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const protocol = forwardedProto || req.protocol || "https";
  const host = req.get("host");
  return host ? `${protocol}://${host}` : "https://naxora-institute-os.onrender.com";
}

function getEnvironmentState() {
  const mode = String(process.env.RAZORPAY_MODE || "test").trim().toLowerCase();
  const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
  const webhookSecret = String(process.env.RAZORPAY_WEBHOOK_SECRET || "").trim();

  const missing = [];
  if (!keyId) missing.push("RAZORPAY_KEY_ID");
  if (!keySecret) missing.push("RAZORPAY_KEY_SECRET");
  if (!webhookSecret) missing.push("RAZORPAY_WEBHOOK_SECRET");

  const testKeyLooksCorrect = !keyId || keyId.startsWith("rzp_test_");
  const liveModeBlocked = mode !== "test";

  return {
    mode,
    testModeLocked: mode === "test",
    liveModeBlocked,
    keyIdConfigured: Boolean(keyId),
    keySecretConfigured: Boolean(keySecret),
    webhookSecretConfigured: Boolean(webhookSecret),
    keyIdMasked: maskValue(keyId),
    testKeyLooksCorrect,
    missing,
    credentialsReady: Boolean(keyId && keySecret && mode === "test" && testKeyLooksCorrect),
    foundationReady: Boolean(keyId && keySecret && webhookSecret && mode === "test" && testKeyLooksCorrect),
    livePaymentsEnabled: false,
    realMoneyCollectionEnabled: false,
    checkoutEnabled: false,
    subscriptionCreationEnabled: false,
    webhookProcessingEnabled: false,
  };
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
  if (!auth.toLowerCase().startsWith("bearer ")) return "";
  return auth.slice(7).trim();
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
      // Try the next configured secret. Final failure is handled below.
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

  const role = normalizeRole(
    payload.role || payload.userRole || payload.accountRole || payload.user?.role || ""
  );
  if (!OWNER_ROLES.has(role)) {
    const error = new Error("Only institute_owner can access Razorpay provider controls.");
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
    email: String(payload.email || payload.user?.email || "").trim().toLowerCase().slice(0, 180),
  };
}

function ownerOnly(req, res, next) {
  try {
    req.part112Owner = buildOwnerContext(req);
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

function rateLimitConnectionTest(req, res, next) {
  const key = `${req.ip || "unknown"}:${req.part112Owner?.instituteId || "unknown"}`;
  const now = Date.now();
  const recent = (connectionAttempts.get(key) || []).filter((time) => now - time < CONNECTION_WINDOW_MS);
  if (recent.length >= CONNECTION_LIMIT) {
    return res.status(429).json({
      success: false,
      part: PART_NUMBER,
      code: "CONNECTION_TEST_RATE_LIMIT",
      message: "10 minutes me maximum 5 connection tests allowed hain.",
    });
  }
  recent.push(now);
  connectionAttempts.set(key, recent);
  next();
}

function safeErrorMessage(error) {
  const status = Number(error?.statusCode || error?.status || 0);
  if (status === 401) return "Razorpay Test credentials accepted nahi hui. Test Key ID/Secret dobara check karein.";
  if (status === 403) return "Razorpay account ya API permission ne request block ki.";
  if (status === 429) return "Razorpay rate limit hit hui. Thodi der baad dobara test karein.";
  if (error?.code === "ENOTFOUND" || error?.code === "ECONNREFUSED" || error?.code === "ETIMEDOUT") {
    return "Razorpay network connection abhi available nahi hai.";
  }
  return "Razorpay connection test complete nahi ho saka. Private server logs check karein.";
}

function hashRequestId(req) {
  const source = `${Date.now()}:${req.ip || ""}:${crypto.randomUUID()}`;
  return crypto.createHash("sha256").update(source).digest("hex").slice(0, 20);
}

function defineModels() {
  const providerConfigSchema = new mongoose.Schema({
    instituteId: { type: String, required: true, index: true },
    provider: { type: String, default: "razorpay", enum: ["razorpay"] },
    mode: { type: String, default: "test", enum: ["test"] },
    status: { type: String, default: "waiting_for_keys" },
    keyIdMasked: { type: String, default: "not_configured" },
    webhookConfigured: { type: Boolean, default: false },
    liveModeEnabled: { type: Boolean, default: false },
    confirmedByUserId: { type: String, default: "" },
    confirmedAt: { type: Date, default: null },
    lastConnectionTestAt: { type: Date, default: null },
    lastConnectionTestOk: { type: Boolean, default: false },
  }, { timestamps: true, strict: true });
  providerConfigSchema.index({ instituteId: 1, provider: 1 }, { unique: true });

  const planDraftSchema = new mongoose.Schema({
    instituteId: { type: String, required: true, index: true },
    internalCode: { type: String, required: true },
    name: { type: String, required: true },
    billingPeriod: { type: String, enum: ["monthly", "yearly"], required: true },
    amountPaise: { type: Number, min: 0, required: true },
    currency: { type: String, default: "INR" },
    status: { type: String, default: "draft", enum: ["draft", "ready_for_part113", "archived"] },
    razorpayPlanId: { type: String, default: "" },
  }, { timestamps: true, strict: true });
  planDraftSchema.index({ instituteId: 1, internalCode: 1, billingPeriod: 1 }, { unique: true });

  const subscriptionRecordSchema = new mongoose.Schema({
    instituteId: { type: String, required: true, index: true },
    planCode: { type: String, default: "" },
    razorpayCustomerId: { type: String, default: "" },
    razorpaySubscriptionId: { type: String, default: "" },
    status: { type: String, default: "foundation_only" },
    liveMode: { type: Boolean, default: false },
  }, { timestamps: true, strict: true });

  const auditSchema = new mongoose.Schema({
    instituteId: { type: String, required: true, index: true },
    actorUserId: { type: String, default: "" },
    action: { type: String, required: true },
    result: { type: String, required: true },
    requestId: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  }, { timestamps: true, strict: true });

  return {
    ProviderConfig: mongoose.models.Part112RazorpayProviderConfig || mongoose.model("Part112RazorpayProviderConfig", providerConfigSchema),
    PlanDraft: mongoose.models.Part112SubscriptionPlanDraft || mongoose.model("Part112SubscriptionPlanDraft", planDraftSchema),
    SubscriptionRecord: mongoose.models.Part112SubscriptionRecord || mongoose.model("Part112SubscriptionRecord", subscriptionRecordSchema),
    Audit: mongoose.models.Part112PaymentAudit || mongoose.model("Part112PaymentAudit", auditSchema),
  };
}

async function writeAudit(Audit, req, action, result, details = {}) {
  if (!isDatabaseReady()) return { saved: false, reason: "database_not_connected" };
  try {
    await Audit.create({
      instituteId: req.part112Owner?.instituteId || "unknown",
      actorUserId: req.part112Owner?.userId || "unknown",
      action,
      result,
      requestId: hashRequestId(req),
      details,
    });
    return { saved: true };
  } catch {
    return { saved: false, reason: "audit_write_failed" };
  }
}

async function runConnectionTest(req, models) {
  const env = getEnvironmentState();
  if (env.liveModeBlocked) {
    const error = new Error("Part 112 me Live Mode locked hai. RAZORPAY_MODE=test rakhein.");
    error.code = "LIVE_MODE_LOCKED";
    error.httpStatus = 423;
    throw error;
  }
  if (!env.credentialsReady) {
    const error = new Error(`Test credentials incomplete: ${env.missing.join(", ") || "test key format"}`);
    error.code = "TEST_CREDENTIALS_INCOMPLETE";
    error.httpStatus = 412;
    throw error;
  }

  const client = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  try {
    const response = await client.orders.all({ count: 1 });
    if (isDatabaseReady()) {
      await models.ProviderConfig.findOneAndUpdate(
        { instituteId: req.part112Owner.instituteId, provider: "razorpay" },
        {
          $set: {
            mode: "test",
            status: "test_connection_ok",
            keyIdMasked: env.keyIdMasked,
            webhookConfigured: env.webhookSecretConfigured,
            liveModeEnabled: false,
            lastConnectionTestAt: new Date(),
            lastConnectionTestOk: true,
          },
          $setOnInsert: { instituteId: req.part112Owner.instituteId, provider: "razorpay" },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    await writeAudit(models.Audit, req, "razorpay_test_connection", "success", {
      mode: "test",
      returnedItemCount: Number(response?.count || response?.items?.length || 0),
    });
    return {
      success: true,
      connected: true,
      mode: "test",
      message: "Razorpay Test Mode connection successful.",
      returnedItemCount: Number(response?.count || response?.items?.length || 0),
      realMoneyMoved: false,
    };
  } catch (error) {
    if (isDatabaseReady()) {
      await models.ProviderConfig.findOneAndUpdate(
        { instituteId: req.part112Owner.instituteId, provider: "razorpay" },
        {
          $set: {
            mode: "test",
            status: "test_connection_failed",
            keyIdMasked: env.keyIdMasked,
            webhookConfigured: env.webhookSecretConfigured,
            liveModeEnabled: false,
            lastConnectionTestAt: new Date(),
            lastConnectionTestOk: false,
          },
          $setOnInsert: { instituteId: req.part112Owner.instituteId, provider: "razorpay" },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).catch(() => null);
    }
    await writeAudit(models.Audit, req, "razorpay_test_connection", "failed", {
      mode: "test",
      providerStatus: Number(error?.statusCode || error?.status || 0),
    });
    const wrapped = new Error(safeErrorMessage(error));
    wrapped.code = "RAZORPAY_CONNECTION_FAILED";
    wrapped.httpStatus = 502;
    throw wrapped;
  }
}

function setupPreview(req) {
  const env = getEnvironmentState();
  return {
    part: PART_NUMBER,
    name: PART_NAME,
    instituteId: req.part112Owner.instituteId,
    mode: env.mode,
    safeActions: [
      "Test credentials readiness check",
      "Read-only Razorpay connection test",
      "Masked provider configuration record",
      "Owner-only VANI setup guidance",
      "Audit logging without secrets",
    ],
    blockedActions: [
      "Live payment collection",
      "Checkout creation",
      "Subscription creation",
      "Refunds",
      "Plan price publishing",
      "Webhook event processing",
    ],
    missing: env.missing,
    needsConfirmation: true,
    confirmationTextRequired: "CONFIRM RAZORPAY TEST MODE",
    secretStorageRule: "Secrets must be stored only in Render Environment variables.",
  };
}

function checklist(req) {
  const env = getEnvironmentState();
  return [
    { id: "adult-account-owner", label: "Adult legal account owner/KYC ready", automatic: false, status: "manual_check" },
    { id: "test-mode", label: "RAZORPAY_MODE=test", automatic: true, status: env.testModeLocked ? "pass" : "fail" },
    { id: "test-key-id", label: "Test Key ID configured", automatic: true, status: env.keyIdConfigured && env.testKeyLooksCorrect ? "pass" : "pending" },
    { id: "test-key-secret", label: "Test Key Secret configured", automatic: true, status: env.keySecretConfigured ? "pass" : "pending" },
    { id: "webhook-secret", label: "Webhook secret reserved", automatic: true, status: env.webhookSecretConfigured ? "pass" : "pending" },
    { id: "connection", label: "Read-only test connection passed", automatic: false, status: "run_test" },
    { id: "real-money", label: "Real-money actions locked in Part 112", automatic: true, status: "pass" },
  ];
}

function interpretVaniCommand(command = "") {
  const text = String(command).trim().toLowerCase();
  if (!text) return "missing";
  if (/secret|api key|key secret|password|pan|bank/.test(text)) return "sensitive";
  if (/live mode|real payment|real money|go live/.test(text)) return "live";
  if (/connection|connect|credential.*test|test.*credential/.test(text)) return "connection";
  if (/confirm|activate setup|save setup/.test(text)) return "confirm";
  if (/missing|pending|kya bacha|readiness|ready/.test(text)) return "readiness";
  if (/setup|configure|razorpay|subscription|payment/.test(text)) return "status";
  return "status";
}

export function registerPart112RazorpayFoundation({ app } = {}) {
  if (!app || typeof app.get !== "function" || typeof app.post !== "function") {
    throw new Error("Part 112 registration failed: Express app is required.");
  }
  if (app.locals.part112RazorpayRegistered) return;
  app.locals.part112RazorpayRegistered = true;

  const models = defineModels();

  app.get(["/razorpay-test-mode-foundation", "/razorpay-settings", "/part112"], (req, res) => {
    res.sendFile(path.join(frontendDir, "razorpay-test-mode-foundation.html"));
  });
  app.get("/razorpay-test-mode-foundation.css", (req, res) => {
    res.type("text/css").sendFile(path.join(frontendDir, "razorpay-test-mode-foundation.css"));
  });
  app.get("/razorpay-test-mode-foundation.js", (req, res) => {
    res.type("application/javascript").sendFile(path.join(frontendDir, "razorpay-test-mode-foundation.js"));
  });

  app.get("/api/part112/status", (req, res) => {
    const env = getEnvironmentState();
    res.json({
      success: true,
      part: PART_NUMBER,
      name: PART_NAME,
      status: "active_foundation",
      mode: env.mode,
      testModeLocked: env.testModeLocked,
      liveModeBlocked: env.liveModeBlocked,
      credentialsConfigured: env.keyIdConfigured && env.keySecretConfigured,
      webhookSecretConfigured: env.webhookSecretConfigured,
      foundationReady: env.foundationReady,
      realMoneyCollectionEnabled: false,
      checkoutEnabled: false,
      subscriptionCreationEnabled: false,
      databaseConnected: isDatabaseReady(),
      nextPart: 113,
      nextPartName: "NAXORA Subscription Plans",
    });
  });

  app.get("/api/part112/security-policy", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      ownerOnlyProviderControls: true,
      privateScreenFirst: true,
      secretsNeverReturnedByApi: true,
      secretsNeverStoredInMongoDb: true,
      secretsNeverSpokenByVani: true,
      testModeOnly: true,
      livePaymentsBlocked: true,
      refundsBlocked: true,
      checkoutBlocked: true,
      subscriptionCreationBlockedUntilPart114: true,
      webhookProcessingBlockedUntilPart115: true,
      auditLogEnabled: true,
    });
  });

  app.get("/api/part112/checklist", (req, res) => {
    res.json({ success: true, part: PART_NUMBER, checklist: checklist(req) });
  });

  app.get("/api/part112/config", ownerOnly, async (req, res) => {
    const env = getEnvironmentState();
    const saved = isDatabaseReady()
      ? await models.ProviderConfig.findOne({ instituteId: req.part112Owner.instituteId, provider: "razorpay" }).lean().catch(() => null)
      : null;
    res.json({
      success: true,
      part: PART_NUMBER,
      instituteId: req.part112Owner.instituteId,
      environment: {
        mode: env.mode,
        testModeLocked: env.testModeLocked,
        liveModeBlocked: env.liveModeBlocked,
        keyIdConfigured: env.keyIdConfigured,
        keySecretConfigured: env.keySecretConfigured,
        webhookSecretConfigured: env.webhookSecretConfigured,
        keyIdMasked: env.keyIdMasked,
        testKeyLooksCorrect: env.testKeyLooksCorrect,
        missing: env.missing,
      },
      savedProviderConfig: saved ? {
        status: saved.status,
        mode: saved.mode,
        keyIdMasked: saved.keyIdMasked,
        webhookConfigured: saved.webhookConfigured,
        liveModeEnabled: false,
        confirmedAt: saved.confirmedAt,
        lastConnectionTestAt: saved.lastConnectionTestAt,
        lastConnectionTestOk: saved.lastConnectionTestOk,
      } : null,
      secretsReturned: false,
    });
  });

  app.get("/api/part112/readiness", ownerOnly, (req, res) => {
    const env = getEnvironmentState();
    res.json({
      success: true,
      part: PART_NUMBER,
      instituteId: req.part112Owner.instituteId,
      foundationReady: env.foundationReady,
      credentialsReady: env.credentialsReady,
      missing: env.missing,
      warnings: [
        ...(env.liveModeBlocked ? ["RAZORPAY_MODE must remain test in Part 112."] : []),
        ...(!env.testKeyLooksCorrect ? ["RAZORPAY_KEY_ID should start with rzp_test_."] : []),
        "Part 112 does not collect real money.",
      ],
      checklist: checklist(req),
    });
  });

  app.post("/api/part112/setup/preview", ownerOnly, (req, res) => {
    res.json({ success: true, preview: setupPreview(req) });
  });

  app.post("/api/part112/setup/confirm", ownerOnly, async (req, res) => {
    const confirmationText = String(req.body?.confirmationText || "").trim();
    if (confirmationText !== "CONFIRM RAZORPAY TEST MODE") {
      return res.status(400).json({
        success: false,
        part: PART_NUMBER,
        code: "CONFIRMATION_TEXT_REQUIRED",
        message: "Exact confirmation text required: CONFIRM RAZORPAY TEST MODE",
      });
    }

    const env = getEnvironmentState();
    if (env.liveModeBlocked) {
      return res.status(423).json({
        success: false,
        part: PART_NUMBER,
        code: "LIVE_MODE_LOCKED",
        message: "Part 112 setup can only be confirmed when RAZORPAY_MODE=test.",
      });
    }

    let saved = null;
    if (isDatabaseReady()) {
      saved = await models.ProviderConfig.findOneAndUpdate(
        { instituteId: req.part112Owner.instituteId, provider: "razorpay" },
        {
          $set: {
            mode: "test",
            status: env.foundationReady ? "test_foundation_ready" : "waiting_for_environment_variables",
            keyIdMasked: env.keyIdMasked,
            webhookConfigured: env.webhookSecretConfigured,
            liveModeEnabled: false,
            confirmedByUserId: req.part112Owner.userId,
            confirmedAt: new Date(),
          },
          $setOnInsert: { instituteId: req.part112Owner.instituteId, provider: "razorpay" },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    const audit = await writeAudit(models.Audit, req, "razorpay_test_setup_confirm", "success", {
      foundationReady: env.foundationReady,
      missing: env.missing,
      liveModeEnabled: false,
    });

    res.json({
      success: true,
      part: PART_NUMBER,
      message: env.foundationReady
        ? "Razorpay Test Mode foundation confirmed."
        : "Setup confirmation saved, but environment variables are still pending.",
      foundationReady: env.foundationReady,
      missing: env.missing,
      databaseRecordSaved: Boolean(saved),
      audit,
      realMoneyCollectionEnabled: false,
    });
  });

  app.post("/api/part112/connection-test", ownerOnly, rateLimitConnectionTest, async (req, res) => {
    try {
      const result = await runConnectionTest(req, models);
      res.json({ ...result, part: PART_NUMBER });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "CONNECTION_TEST_FAILED",
        message: error.message,
        realMoneyMoved: false,
      });
    }
  });

  app.post("/api/part112/vani/command", ownerOnly, async (req, res) => {
    const command = String(req.body?.command || "").trim().slice(0, 500);
    const intent = interpretVaniCommand(command);
    const env = getEnvironmentState();

    if (intent === "missing") {
      return res.status(400).json({
        success: false,
        part: PART_NUMBER,
        message: "VANI command likhiye ya boliye.",
      });
    }

    if (intent === "sensitive") {
      await writeAudit(models.Audit, req, "vani_sensitive_provider_request", "blocked", {});
      return res.json({
        success: true,
        part: PART_NUMBER,
        intent,
        replyText: "API Key Secret, password, PAN aur bank details chat ya voice me mat boliye. Inhe sirf private Render Environment screen me add karein.",
        spokenSafeSummary: "Sensitive provider details private screen par hi manage hongi.",
        privateScreenFirst: true,
        actionExecuted: false,
      });
    }

    if (intent === "live") {
      await writeAudit(models.Audit, req, "vani_live_mode_request", "blocked_part112", {});
      return res.json({
        success: true,
        part: PART_NUMBER,
        intent,
        replyText: "Part 112 me Live Mode locked hai. Pehle Test Mode, checkout, signature verification aur webhook testing complete hogi.",
        spokenSafeSummary: "Live Mode abhi safety lock me hai.",
        needsOwnerVerification: true,
        actionExecuted: false,
      });
    }

    if (intent === "connection") {
      try {
        const result = await runConnectionTest(req, models);
        return res.json({
          success: true,
          part: PART_NUMBER,
          intent,
          replyText: result.message,
          spokenSafeSummary: "Razorpay Test Mode connection successful hai.",
          privateScreenDetails: result,
          actionExecuted: true,
          actionLevel: "safe_read_only_test",
        });
      } catch (error) {
        return res.status(error.httpStatus || 500).json({
          success: false,
          part: PART_NUMBER,
          intent,
          replyText: error.message,
          spokenSafeSummary: "Razorpay test connection me setup pending hai.",
          actionExecuted: false,
          code: error.code || "CONNECTION_TEST_FAILED",
        });
      }
    }

    if (intent === "confirm") {
      return res.json({
        success: true,
        part: PART_NUMBER,
        intent,
        replyText: "Main pehle setup preview dikha rahi hoon. Confirm button par exact owner confirmation ke baad sirf Test Mode configuration record save hoga.",
        spokenSafeSummary: "Test Mode setup confirmation pending hai.",
        preview: setupPreview(req),
        needsConfirmation: true,
        confirmationTextRequired: "CONFIRM RAZORPAY TEST MODE",
        actionExecuted: false,
      });
    }

    const replyText = env.foundationReady
      ? "Razorpay Test Mode environment ready hai. Ab read-only connection test chala sakte hain. Real payment abhi locked hai."
      : `Razorpay Test Mode setup pending hai. Missing: ${env.missing.join(", ") || "Test Key ID format check"}.`;

    res.json({
      success: true,
      part: PART_NUMBER,
      intent,
      replyText,
      spokenSafeSummary: env.foundationReady
        ? "Razorpay Test Mode foundation ready hai."
        : "Razorpay Test Mode setup me kuch details pending hain.",
      privateScreenDetails: {
        mode: env.mode,
        foundationReady: env.foundationReady,
        missing: env.missing,
        keyIdMasked: env.keyIdMasked,
        livePaymentsEnabled: false,
      },
      nextAction: env.credentialsReady ? "Run Test Connection" : "Add Test keys in Render Environment",
      actionExecuted: false,
    });
  });

  app.get("/api/part112/demo", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      name: PART_NAME,
      page: "/razorpay-test-mode-foundation",
      commands: [
        "VANI, Razorpay setup status dikhao",
        "VANI, setup me kya pending hai?",
        "VANI, Razorpay test connection check karo",
        "VANI, live mode start karo",
      ],
      expectedSafety: {
        ownerLoginRequiredForProviderControls: true,
        secretsNeverReturned: true,
        liveModeRequestBlocked: true,
        realMoneyMoved: false,
      },
    });
  });
}
