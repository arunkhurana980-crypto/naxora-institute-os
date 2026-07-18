import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const PART_NUMBER = "136.1";
const PART_NAME = "First Institute Owner Bootstrap and Common Login Route Hotfix";
const PREVIEW_TTL_MS = 20 * 60 * 1000;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX_ATTEMPTS = 8;
const TOKEN_TTL = "12h";
const TOKEN_ISSUER = "naxora-institute-os";
const TOKEN_AUDIENCE = "naxora-unified-app";
const BOOTSTRAP_LOCK_KEY = "global_first_institute_owner";
const scryptAsync = promisify(crypto.scrypt);
const rateBuckets = new Map();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, "../../frontend");

function cleanText(value = "", max = 255) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}
function cleanLong(value = "", max = 3000) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, max);
}
function cleanId(value = "") {
  return String(value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9:_-]/g, "")
    .slice(0, 180);
}
function normalizeIdentifier(value = "") {
  const raw = String(value ?? "").trim().slice(0, 180);
  if (!raw) return "";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return raw.toLowerCase();
  const phone = raw.replace(/[()\s-]/g, "");
  if (/^\+?\d{8,15}$/.test(phone)) return phone;
  return raw.toLowerCase().replace(/\s+/g, "");
}
function identifierType(identifier = "") {
  if (identifier.includes("@")) return "email";
  if (/^\+?\d{8,15}$/.test(identifier)) return "phone";
  return "login_id";
}
function dbReady() {
  return mongoose.connection?.readyState === 1;
}
function sha256(value) {
  return crypto.createHash("sha256").update(String(value ?? "")).digest("hex");
}
function safeEqual(left, right) {
  const a = crypto.createHash("sha256").update(String(left ?? "")).digest();
  const b = crypto.createHash("sha256").update(String(right ?? "")).digest();
  return crypto.timingSafeEqual(a, b);
}
function jwtSecret() {
  const value = [
    process.env.JWT_SECRET,
    process.env.JWT_ACCESS_SECRET,
    process.env.ACCESS_TOKEN_SECRET,
    process.env.NAXORA_JWT_SECRET,
  ].map(item => String(item ?? "").trim()).find(Boolean);
  if (!value) {
    throw Object.assign(new Error("JWT_SECRET Render Environment me configure karein."), {
      code: "JWT_CONFIGURATION_MISSING",
      httpStatus: 503,
    });
  }
  return value;
}
// PART 136.2 SECRET TRANSPORT FIX START
function normalizeBootstrapSecret(value = "") {
  let output = String(value ?? "").normalize("NFKC").replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
  if (output.length >= 2 && ((output.startsWith('"') && output.endsWith('"')) || (output.startsWith("'") && output.endsWith("'")))) {
    output = output.slice(1, -1).trim();
  }
  return output;
}
function bootstrapSecret() {
  return normalizeBootstrapSecret(process.env.NAXORA_OWNER_BOOTSTRAP_SECRET ?? "");
}
function suppliedBootstrapSecret(req) {
  const headerRaw = req.headers["x-naxora-bootstrap-secret"];
  const bodyRaw = req.body?.bootstrapSecret ?? req.body?._bootstrapSecret ?? "";
  const hasHeader = String(headerRaw ?? "").length > 0;
  const hasBody = String(bodyRaw ?? "").length > 0;
  const raw = hasHeader ? headerRaw : bodyRaw;
  const value = normalizeBootstrapSecret(raw);
  if (req.body && typeof req.body === "object") {
    delete req.body.bootstrapSecret;
    delete req.body._bootstrapSecret;
  }
  return { value, receivedVia: hasHeader ? "header" : hasBody ? "secure_body" : "none" };
}
function bootstrapSecretDiagnostic(expected, supplied) {
  return { receivedVia: supplied.receivedVia, suppliedLength: supplied.value.length, expectedLength: expected.length, normalizationApplied: true, bodyFallbackSupported: true, secretReturned: false };
}
function requireBootstrapSecret(req) {
  const expected = bootstrapSecret();
  if (!expected) throw Object.assign(new Error("NAXORA_OWNER_BOOTSTRAP_SECRET Render Environment me privately configure karein."), { code: "BOOTSTRAP_SECRET_NOT_CONFIGURED", httpStatus: 503 });
  if (expected.length < 24) throw Object.assign(new Error("NAXORA_OWNER_BOOTSTRAP_SECRET kam se kam 24 characters ka hona chahiye."), { code: "BOOTSTRAP_SECRET_TOO_SHORT", httpStatus: 503 });
  const supplied = suppliedBootstrapSecret(req);
  if (!supplied.value || !safeEqual(supplied.value, expected)) {
    throw Object.assign(new Error("Private bootstrap verification failed. Part 136.2 ne header aur secure body dono check kiye."), { code: "BOOTSTRAP_VERIFICATION_FAILED", httpStatus: 403, diagnostic: bootstrapSecretDiagnostic(expected, supplied) });
  }
  return { matched: true, receivedVia: supplied.receivedVia, suppliedLength: supplied.value.length, expectedLength: expected.length };
}
// PART 136.2 SECRET TRANSPORT FIX END
function secureTransport(req) {
  const forwarded = String(req.headers["x-forwarded-proto"] ?? "")
    .split(",")[0].trim().toLowerCase();
  const host = String(req.headers.host ?? "").toLowerCase();
  return req.secure || forwarded === "https" ||
    host.startsWith("localhost") || host.startsWith("127.0.0.1");
}
function requireSecureTransport(req) {
  if (!secureTransport(req)) {
    throw Object.assign(new Error("Owner bootstrap HTTPS par hi allowed hai."), {
      code: "HTTPS_REQUIRED",
      httpStatus: 400,
    });
  }
}
function rateKey(req) {
  return sha256(`${req.ip ?? req.socket?.remoteAddress ?? ""}|${req.headers["user-agent"] ?? ""}`)
    .slice(0, 24);
}
function checkRate(req) {
  const now = Date.now();
  const key = rateKey(req);
  const current = rateBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return;
  }
  current.count += 1;
  if (current.count > RATE_MAX_ATTEMPTS) {
    throw Object.assign(new Error("Too many bootstrap attempts. 15 minutes baad retry karein."), {
      code: "BOOTSTRAP_RATE_LIMITED",
      httpStatus: 429,
    });
  }
}
function passwordPolicy(password = "") {
  const value = String(password ?? "");
  const failures = [];
  if (value.length < 10) failures.push("at least 10 characters");
  if (value.length > 128) failures.push("maximum 128 characters");
  if (!/[A-Za-z]/.test(value)) failures.push("at least one letter");
  if (!/\d/.test(value)) failures.push("at least one number");
  return { valid: failures.length === 0, failures };
}
async function hashPassword(password) {
  const policy = passwordPolicy(password);
  if (!policy.valid) {
    throw Object.assign(new Error(
      `Password must contain ${policy.failures.join(", ")}.`
    ), {
      code: "WEAK_PASSWORD",
      httpStatus: 400,
    });
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await scryptAsync(String(password), salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  return {
    algorithm: "scrypt-v1",
    salt,
    hash: Buffer.from(derived).toString("hex"),
  };
}
function instituteSlug(name = "") {
  const words = String(name ?? "")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, " ")
    .trim()
    .split(/\s+/g)
    .filter(Boolean)
    .slice(0, 3);
  const slug = words.map(word => word.slice(0, 4)).join("")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 10);
  return slug || "INST";
}
function candidateInstituteId(name = "") {
  const slug = instituteSlug(name);
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `NX-${slug}-${random}`.slice(0, 28);
}
function confirmationText(preview) {
  return `CREATE FIRST OWNER ${preview.instituteId}`;
}
function createToken(identity) {
  return jwt.sign({
    sub: String(identity._id),
    identityId: String(identity._id),
    userId: String(identity._id),
    role: "institute_owner",
    instituteId: identity.instituteId,
    name: identity.displayName,
    displayName: identity.displayName,
    identifierType: identity.identifierType,
    tokenVersion: identity.tokenVersion,
    mustChangePassword: false,
    authSource: "part120",
  }, jwtSecret(), {
    algorithm: "HS256",
    expiresIn: TOKEN_TTL,
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
    jwtid: crypto.randomUUID(),
  });
}
function defineModels() {
  const previewSchema = new mongoose.Schema({
    previewId: { type: String, required: true, unique: true, index: true },
    instituteId: { type: String, required: true, index: true },
    instituteName: { type: String, required: true },
    ownerDisplayName: { type: String, required: true },
    identifierCanonical: { type: String, required: true },
    identifierType: {
      type: String,
      enum: ["email", "phone", "login_id"],
      required: true,
    },
    confirmationDigest: { type: String, required: true },
    status: {
      type: String,
      enum: ["preview_ready", "executing", "completed", "expired", "failed"],
      default: "preview_ready",
      index: true,
    },
    expiresAt: { type: Date, required: true, index: true },
    completedAt: { type: Date, default: null },
    failureCode: { type: String, default: "" },
  }, { timestamps: true, strict: true });

  const lockSchema = new mongoose.Schema({
    lockKey: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ["executing", "completed"],
      required: true,
      index: true,
    },
    instituteId: { type: String, default: "", index: true },
    instituteName: { type: String, default: "" },
    ownerIdentityId: { type: String, default: "" },
    completedAt: { type: Date, default: null },
  }, { timestamps: true, strict: true });

  const auditSchema = new mongoose.Schema({
    action: { type: String, required: true, index: true },
    result: { type: String, required: true },
    reasonCode: { type: String, default: "" },
    instituteId: { type: String, default: "", index: true },
    previewId: { type: String, default: "", index: true },
    ipHash: { type: String, default: "" },
    userAgentHash: { type: String, default: "" },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  }, { timestamps: true, strict: true });

  return {
    Preview: mongoose.models.Part1361OwnerBootstrapPreview ||
      mongoose.model("Part1361OwnerBootstrapPreview", previewSchema),
    Lock: mongoose.models.Part1361OwnerBootstrapLock ||
      mongoose.model("Part1361OwnerBootstrapLock", lockSchema),
    Audit: mongoose.models.Part1361OwnerBootstrapAudit ||
      mongoose.model("Part1361OwnerBootstrapAudit", auditSchema),
  };
}
function unifiedIdentityModel() {
  const model = mongoose.models.Part120UnifiedIdentity;
  if (!model) {
    throw Object.assign(new Error(
      "Part 120 unified identity model unavailable. Part 120 ko Part 136.1 se pehle register karein."
    ), {
      code: "PART120_IDENTITY_MODEL_UNAVAILABLE",
      httpStatus: 503,
    });
  }
  return model;
}
async function audit(models, req, action, result, reasonCode = "", details = {}) {
  if (!dbReady()) return;
  try {
    await models.Audit.create({
      action,
      result,
      reasonCode,
      instituteId: cleanId(details.instituteId || ""),
      previewId: cleanId(details.previewId || ""),
      ipHash: sha256(req.ip || req.socket?.remoteAddress || "").slice(0, 24),
      userAgentHash: sha256(req.headers["user-agent"] || "").slice(0, 24),
      details,
    });
  } catch {
    // Bootstrap result remains authoritative if audit write fails.
  }
}
async function bootstrapState(models) {
  if (!dbReady()) {
    return {
      databaseConnected: false,
      ownerExists: false,
      lockExists: false,
      bootstrapAvailable: false,
      reasonCode: "DATABASE_REQUIRED",
    };
  }
  const Identity = unifiedIdentityModel();
  const [owner, lock] = await Promise.all([
    Identity.findOne({ role: "institute_owner" }).select("_id instituteId displayName").lean(),
    models.Lock.findOne({ lockKey: BOOTSTRAP_LOCK_KEY }).lean(),
  ]);
  const secretConfigured = bootstrapSecret().length >= 24;
  return {
    databaseConnected: true,
    ownerExists: Boolean(owner),
    lockExists: Boolean(lock),
    secretConfigured,
    bootstrapAvailable: !owner && !lock && secretConfigured,
    reasonCode: owner
      ? "OWNER_ALREADY_EXISTS"
      : lock
        ? "BOOTSTRAP_ALREADY_LOCKED"
        : secretConfigured
          ? ""
          : "BOOTSTRAP_SECRET_NOT_CONFIGURED",
    completedInstituteId: lock?.status === "completed" ? lock.instituteId : "",
  };
}
function publicPreview(preview) {
  return {
    previewId: preview.previewId,
    instituteId: preview.instituteId,
    instituteName: preview.instituteName,
    ownerDisplayName: preview.ownerDisplayName,
    identifier: preview.identifierCanonical,
    identifierType: preview.identifierType,
    status: preview.status,
    confirmationTextRequired:
      preview.status === "preview_ready" ? confirmationText(preview) : null,
    expiresAt: preview.expiresAt,
    createdAt: preview.createdAt,
  };
}
async function ensureAvailable(models) {
  const state = await bootstrapState(models);
  if (!state.databaseConnected) {
    throw Object.assign(new Error("MongoDB connection required."), {
      code: "DATABASE_REQUIRED",
      httpStatus: 503,
    });
  }
  if (state.ownerExists || state.lockExists) {
    throw Object.assign(new Error(
      "First Owner bootstrap already completed or permanently locked."
    ), {
      code: state.ownerExists ? "OWNER_ALREADY_EXISTS" : "BOOTSTRAP_ALREADY_LOCKED",
      httpStatus: 409,
    });
  }
  return state;
}

export function registerPart1361FirstOwnerBootstrap({ app } = {}) {
  if (!app || typeof app.get !== "function" || typeof app.post !== "function") {
    throw new Error("Part 136.1 registration failed: Express app required.");
  }
  if (app.locals.part1361OwnerBootstrapRegistered) return;
  app.locals.part1361OwnerBootstrapRegistered = true;
  const models = defineModels();

  app.get(["/owner-bootstrap", "/first-owner-setup", "/part1361"], (req, res) => {
    res.sendFile(path.join(frontendDir, "naxora-owner-bootstrap.html"));
  });
  app.get("/naxora-owner-bootstrap.css", (req, res) => {
    res.type("text/css").sendFile(
      path.join(frontendDir, "naxora-owner-bootstrap.css")
    );
  });
  app.get("/naxora-owner-bootstrap.js", (req, res) => {
    res.type("application/javascript").sendFile(
      path.join(frontendDir, "naxora-owner-bootstrap.js")
    );
  });
  app.get("/naxora-part1361-common-login-bridge.js", (req, res) => {
    res.type("application/javascript").sendFile(
      path.join(frontendDir, "naxora-part1361-common-login-bridge.js")
    );
  });

  app.get("/api/part1361/status", async (req, res) => {
    try {
      const state = await bootstrapState(models);
      res.json({
        success: true,
        part: PART_NUMBER,
        name: PART_NAME,
        status: "first_owner_bootstrap_hotfix_active",
        commonLoginUrl: "/common-login",
        ownerBootstrapUrl: "/owner-bootstrap",
        loginRouteRedirectFixed: true,
        databaseConnected: state.databaseConnected,
        bootstrapSecretConfigured: Boolean(state.secretConfigured),
        secretTransportFixActive: true,
        secretHeaderSupported: true,
        secretSecureBodyFallbackSupported: true,
        secretNormalizationApplied: true,
        bootstrapAvailable: state.bootstrapAvailable,
        bootstrapReasonCode: state.reasonCode,
        firstOwnerExists: state.ownerExists,
        bootstrapLocked: state.lockExists,
        generatedInstituteId: true,
        ownerJwtIncludesInstituteId: true,
        passwordHashing: "scrypt-v1",
        bootstrapSecretReturned: false,
        passwordReturned: false,
        selfSignupForAdditionalOwners: false,
        plannedPartAfter136: null,
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "BOOTSTRAP_STATUS_FAILED",
        message: error.message,
        diagnostic: error.diagnostic || null,
      });
    }
  });

  app.get("/api/part1361/security-policy", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      httpsRequired: true,
      privateBootstrapSecretRequired: true,
      minimumBootstrapSecretLength: 24,
      bootstrapSecretStoredInMongo: false,
      bootstrapSecretReturned: false,
      passwordStoredInPreview: false,
      passwordReturned: false,
      passwordHashing: "scrypt-v1",
      exactConfirmationRequired: true,
      previewExpiryMinutes: PREVIEW_TTL_MS / 60000,
      oneTimeGlobalBootstrapLock: true,
      repeatedFirstOwnerCreationBlocked: true,
      rateLimitWindowMinutes: RATE_WINDOW_MS / 60000,
      rateLimitAttempts: RATE_MAX_ATTEMPTS,
      ownerTokenUsesPart120Claims: true,
      additionalInstituteProvisioningIncluded: false,
    });
  });

  // PART 136.2 VERIFY SECRET ROUTE START
  app.post("/api/part1361/bootstrap/verify-secret", async (req, res) => {
    try {
      requireSecureTransport(req);
      checkRate(req);
      const verification = requireBootstrapSecret(req);
      await ensureAvailable(models);
      res.set("Cache-Control", "no-store");
      res.json({ success: true, part: "136.2", matched: true, receivedVia: verification.receivedVia, suppliedLength: verification.suppliedLength, expectedLength: verification.expectedLength, secretReturned: false });
    } catch (error) {
      res.set("Cache-Control", "no-store");
      res.status(error.httpStatus || 500).json({ success: false, part: "136.2", code: error.code || "BOOTSTRAP_SECRET_VERIFY_FAILED", message: error.message, diagnostic: error.diagnostic || null });
    }
  });
  // PART 136.2 VERIFY SECRET ROUTE END

  app.post("/api/part1361/bootstrap/preview", async (req, res) => {
    try {
      requireSecureTransport(req);
      checkRate(req);
      requireBootstrapSecret(req);
      await ensureAvailable(models);

      const instituteName = cleanText(req.body?.instituteName, 160);
      const ownerDisplayName = cleanText(req.body?.ownerDisplayName, 120);
      const identifier = normalizeIdentifier(req.body?.identifier);
      if (instituteName.length < 2) {
        throw Object.assign(new Error("Institute name required."), {
          code: "INSTITUTE_NAME_REQUIRED",
          httpStatus: 400,
        });
      }
      if (ownerDisplayName.length < 2) {
        throw Object.assign(new Error("Owner display name required."), {
          code: "OWNER_NAME_REQUIRED",
          httpStatus: 400,
        });
      }
      if (!identifier) {
        throw Object.assign(new Error("Owner Email, Phone ya Login ID required."), {
          code: "OWNER_IDENTIFIER_REQUIRED",
          httpStatus: 400,
        });
      }

      const Identity = unifiedIdentityModel();
      let instituteId = "";
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const candidate = candidateInstituteId(instituteName);
        const collision = await Identity.exists({ instituteId: candidate });
        if (!collision) {
          instituteId = candidate;
          break;
        }
      }
      if (!instituteId) {
        throw Object.assign(new Error("Unique Institute ID generate nahi ho saki."), {
          code: "INSTITUTE_ID_GENERATION_FAILED",
          httpStatus: 503,
        });
      }

      await models.Preview.updateMany(
        { status: "preview_ready", expiresAt: { $lte: new Date() } },
        { $set: { status: "expired" } }
      );

      const previewId = `ownerpreview_${Date.now().toString(36)}_${crypto.randomBytes(6).toString("hex")}`;
      const confirmation = `CREATE FIRST OWNER ${instituteId}`;
      const preview = await models.Preview.create({
        previewId,
        instituteId,
        instituteName,
        ownerDisplayName,
        identifierCanonical: identifier,
        identifierType: identifierType(identifier),
        confirmationDigest: sha256(confirmation),
        status: "preview_ready",
        expiresAt: new Date(Date.now() + PREVIEW_TTL_MS),
      });
      await audit(models, req, "bootstrap_preview", "success", "", {
        previewId,
        instituteId,
        identifierType: preview.identifierType,
      });

      res.json({
        success: true,
        part: PART_NUMBER,
        preview: publicPreview(preview),
        message:
          "Institute ID preview ready hai. Details check karke exact confirmation aur password submit karein.",
      });
    } catch (error) {
      await audit(models, req, "bootstrap_preview", "failed", error.code || "PREVIEW_FAILED");
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "BOOTSTRAP_PREVIEW_FAILED",
        message: error.message,
        diagnostic: error.diagnostic || null,
      });
    }
  });

  app.post("/api/part1361/bootstrap/confirm", async (req, res) => {
    let lockCreated = false;
    let preview = null;
    try {
      requireSecureTransport(req);
      checkRate(req);
      requireBootstrapSecret(req);
      await ensureAvailable(models);

      const previewId = cleanId(req.body?.previewId);
      const exactConfirmation = cleanLong(req.body?.confirmationText, 300);
      const password = String(req.body?.password ?? "");
      if (!previewId) {
        throw Object.assign(new Error("Bootstrap preview ID required."), {
          code: "BOOTSTRAP_PREVIEW_REQUIRED",
          httpStatus: 400,
        });
      }

      preview = await models.Preview.findOne({
        previewId,
        status: "preview_ready",
      });
      if (!preview) {
        throw Object.assign(new Error("Active bootstrap preview not found."), {
          code: "BOOTSTRAP_PREVIEW_NOT_FOUND",
          httpStatus: 404,
        });
      }
      if (new Date(preview.expiresAt).getTime() <= Date.now()) {
        preview.status = "expired";
        await preview.save();
        throw Object.assign(new Error("Bootstrap preview expired. Fresh preview banayein."), {
          code: "BOOTSTRAP_PREVIEW_EXPIRED",
          httpStatus: 410,
        });
      }
      if (sha256(exactConfirmation) !== preview.confirmationDigest) {
        throw Object.assign(new Error(
          `Exact confirmation required: ${confirmationText(preview)}`
        ), {
          code: "EXACT_CONFIRMATION_REQUIRED",
          httpStatus: 400,
        });
      }

      const passwordRecord = await hashPassword(password);
      const Identity = unifiedIdentityModel();

      const claimedPreview = await models.Preview.findOneAndUpdate(
        { _id: preview._id, status: "preview_ready" },
        { $set: { status: "executing" } },
        { new: true }
      );
      if (!claimedPreview) {
        throw Object.assign(new Error("Bootstrap preview already being used."), {
          code: "BOOTSTRAP_PREVIEW_IN_USE",
          httpStatus: 409,
        });
      }
      preview = claimedPreview;

      try {
        await models.Lock.create({
          lockKey: BOOTSTRAP_LOCK_KEY,
          status: "executing",
          instituteId: preview.instituteId,
          instituteName: preview.instituteName,
        });
        lockCreated = true;
      } catch (error) {
        if (error?.code === 11000) {
          throw Object.assign(new Error("First Owner bootstrap already locked."), {
            code: "BOOTSTRAP_ALREADY_LOCKED",
            httpStatus: 409,
          });
        }
        throw error;
      }

      const existingOwner = await Identity.findOne({ role: "institute_owner" }).lean();
      if (existingOwner) {
        throw Object.assign(new Error("An Institute Owner already exists."), {
          code: "OWNER_ALREADY_EXISTS",
          httpStatus: 409,
        });
      }

      const identity = await Identity.create({
        instituteId: preview.instituteId,
        identifierCanonical: preview.identifierCanonical,
        identifierType: preview.identifierType,
        displayName: preview.ownerDisplayName,
        role: "institute_owner",
        passwordAlgorithm: passwordRecord.algorithm,
        passwordSalt: passwordRecord.salt,
        passwordHash: passwordRecord.hash,
        status: "active",
        tokenVersion: 1,
        mustChangePassword: false,
        adoptedFromLegacy: false,
        createdByUserId: "part1361_first_owner_bootstrap",
        failedLoginAttempts: 0,
        lockUntil: null,
        lastLoginAt: new Date(),
        lastPasswordChangeAt: new Date(),
      });

      await models.Lock.updateOne(
        { lockKey: BOOTSTRAP_LOCK_KEY },
        {
          $set: {
            status: "completed",
            instituteId: preview.instituteId,
            instituteName: preview.instituteName,
            ownerIdentityId: String(identity._id),
            completedAt: new Date(),
          },
        }
      );
      preview.status = "completed";
      preview.completedAt = new Date();
      preview.failureCode = "";
      await preview.save();

      const token = createToken(identity);
      await audit(models, req, "bootstrap_confirm", "success", "", {
        previewId: preview.previewId,
        instituteId: preview.instituteId,
        ownerIdentityId: String(identity._id),
      });

      res.json({
        success: true,
        part: PART_NUMBER,
        token,
        tokenType: "Bearer",
        expiresIn: TOKEN_TTL,
        rememberMe: false,
        redirectTo: "/app",
        institute: {
          instituteId: preview.instituteId,
          instituteName: preview.instituteName,
        },
        session: {
          id: String(identity._id),
          identityId: String(identity._id),
          userId: String(identity._id),
          instituteId: identity.instituteId,
          identifier: identity.identifierCanonical,
          identifierType: identity.identifierType,
          displayName: identity.displayName,
          role: identity.role,
          status: identity.status,
          mustChangePassword: false,
          authSource: "part120",
        },
        message:
          "First Institute Owner account create ho gaya. Institute ID securely save karein.",
        bootstrapSecretReturned: false,
        passwordReturned: false,
      });
    } catch (error) {
      if (preview && preview.status === "executing") {
        preview.status = "failed";
        preview.failureCode = cleanText(error.code || "BOOTSTRAP_FAILED", 120);
        await preview.save().catch(() => {});
      }
      if (lockCreated) {
        await models.Lock.deleteOne({
          lockKey: BOOTSTRAP_LOCK_KEY,
          status: "executing",
        }).catch(() => {});
      }
      await audit(models, req, "bootstrap_confirm", "failed", error.code || "CONFIRM_FAILED", {
        previewId: preview?.previewId || cleanId(req.body?.previewId),
        instituteId: preview?.instituteId || "",
      });
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "BOOTSTRAP_CONFIRM_FAILED",
        message: error.message,
        diagnostic: error.diagnostic || null,
      });
    }
  });
}
