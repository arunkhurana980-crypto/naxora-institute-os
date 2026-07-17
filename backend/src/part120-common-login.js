import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const PART_NUMBER = 120;
const PART_NAME = "Common Login, JWT Session and Role Routing";
const scryptAsync = promisify(crypto.scrypt);
const SUPPORTED_ROLES = new Set([
  "institute_owner",
  "branch_manager",
  "teacher",
  "student",
  "parent",
  "accountant",
  "counsellor",
  "staff",
]);
const OWNER_ROLES = new Set(["institute_owner", "owner", "instituteowner"]);
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 8;
const ACCOUNT_LOCK_ATTEMPTS = 5;
const ACCOUNT_LOCK_MS = 15 * 60 * 1000;
const DEFAULT_TOKEN_TTL = "12h";
const REMEMBER_TOKEN_TTL = "7d";
const TOKEN_ISSUER = "naxora-institute-os";
const TOKEN_AUDIENCE = "naxora-unified-app";
const loginBuckets = new Map();

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
    branchmanager: "branch_manager",
    accounts: "accountant",
    counselor: "counsellor",
  };
  return aliases[role] || role;
}
function normalizeIdentifier(value = "") {
  const raw = String(value || "").trim().slice(0, 180);
  if (!raw) return "";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return raw.toLowerCase();
  const phoneCandidate = raw.replace(/[()\s-]/g, "");
  if (/^\+?\d{8,15}$/.test(phoneCandidate)) return phoneCandidate;
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
function jwtSecrets() {
  return [
    process.env.JWT_SECRET,
    process.env.JWT_ACCESS_SECRET,
    process.env.ACCESS_TOKEN_SECRET,
    process.env.NAXORA_JWT_SECRET,
  ].map((value) => String(value || "").trim()).filter(Boolean);
}
function signingSecret() {
  const secrets = jwtSecrets();
  if (!secrets.length) {
    const error = new Error("JWT_SECRET Render Environment me configure karein.");
    error.code = "JWT_CONFIGURATION_MISSING";
    error.httpStatus = 503;
    throw error;
  }
  return secrets[0];
}
function getBearer(req) {
  const auth = String(req.headers.authorization || "").trim();
  return auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
}
function verifyAnyJwt(token) {
  const secrets = jwtSecrets();
  if (!secrets.length) {
    const error = new Error("JWT server configuration missing.");
    error.code = "JWT_CONFIGURATION_MISSING";
    error.httpStatus = 503;
    throw error;
  }
  for (const secret of secrets) {
    try {
      return jwt.verify(token, secret, { algorithms: ["HS256", "HS384", "HS512"] });
    } catch {
      // Try the next configured secret for legacy compatibility.
    }
  }
  const error = new Error("Login session invalid or expired.");
  error.code = "INVALID_SESSION";
  error.httpStatus = 401;
  throw error;
}
function tokenContext(payload = {}) {
  const role = normalizeRole(payload.role || payload.userRole || payload.accountRole || payload.user?.role || "");
  const instituteId = cleanId(
    payload.instituteId || payload.institute_id || payload.user?.instituteId || payload.tenantId || ""
  );
  return {
    identityId: cleanId(payload.identityId || payload.sub || ""),
    userId: cleanId(payload.userId || payload.id || payload._id || payload.sub || payload.user?.id || "user"),
    role,
    instituteId,
    displayName: cleanText(
      payload.name || payload.displayName || payload.fullName || payload.user?.name || payload.email || role,
      120
    ),
    tokenVersion: Number(payload.tokenVersion || 0),
    authSource: cleanText(payload.authSource || "legacy", 40),
    mustChangePassword: Boolean(payload.mustChangePassword),
  };
}
function passwordPolicy(password = "") {
  const value = String(password || "");
  const failures = [];
  if (value.length < 10) failures.push("at least 10 characters");
  if (value.length > 128) failures.push("maximum 128 characters");
  if (!/[A-Za-z]/.test(value)) failures.push("at least one letter");
  if (!/\d/.test(value)) failures.push("at least one number");
  return {
    valid: failures.length === 0,
    failures,
  };
}
async function hashPassword(password) {
  const policy = passwordPolicy(password);
  if (!policy.valid) {
    const error = new Error(`Password must contain ${policy.failures.join(", ")}.`);
    error.code = "WEAK_PASSWORD";
    error.httpStatus = 400;
    throw error;
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
async function verifyPassword(password, record) {
  if (!record?.passwordSalt || !record?.passwordHash) return false;
  try {
    const derived = await scryptAsync(String(password || ""), record.passwordSalt, 64, {
      N: 16384,
      r: 8,
      p: 1,
      maxmem: 64 * 1024 * 1024,
    });
    const actual = Buffer.from(derived);
    const expected = Buffer.from(record.passwordHash, "hex");
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
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
function defineModels() {
  const identitySchema = new mongoose.Schema({
    instituteId: { type: String, required: true, index: true },
    identifierCanonical: { type: String, required: true },
    identifierType: { type: String, enum: ["email", "phone", "login_id"], required: true },
    displayName: { type: String, required: true },
    role: { type: String, enum: Array.from(SUPPORTED_ROLES), required: true, index: true },
    passwordAlgorithm: { type: String, default: "scrypt-v1" },
    passwordSalt: { type: String, required: true, select: false },
    passwordHash: { type: String, required: true, select: false },
    status: { type: String, enum: ["active", "disabled"], default: "active", index: true },
    tokenVersion: { type: Number, default: 1 },
    mustChangePassword: { type: Boolean, default: false },
    adoptedFromLegacy: { type: Boolean, default: false },
    createdByUserId: { type: String, default: "self_adoption" },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    lastPasswordChangeAt: { type: Date, default: Date.now },
  }, { timestamps: true, strict: true });
  identitySchema.index({ instituteId: 1, identifierCanonical: 1 }, { unique: true });

  const auditSchema = new mongoose.Schema({
    instituteId: { type: String, required: true, index: true },
    identityId: { type: String, default: "" },
    actorUserId: { type: String, default: "anonymous" },
    action: { type: String, required: true },
    result: { type: String, required: true },
    reasonCode: { type: String, default: "" },
    ipHash: { type: String, default: "" },
    userAgentHash: { type: String, default: "" },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  }, { timestamps: true, strict: true });

  return {
    Identity: mongoose.models.Part120UnifiedIdentity ||
      mongoose.model("Part120UnifiedIdentity", identitySchema),
    Audit: mongoose.models.Part120AuthAudit ||
      mongoose.model("Part120AuthAudit", auditSchema),
  };
}
function hashPrivate(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex").slice(0, 24);
}
async function writeAudit(models, req, action, result, reasonCode = "", details = {}, identityId = "") {
  if (!dbReady()) return { saved: false };
  try {
    await models.Audit.create({
      instituteId: cleanId(details.instituteId || req.part120Context?.instituteId || "unknown"),
      identityId: cleanId(identityId || details.identityId || ""),
      actorUserId: cleanId(req.part120Context?.userId || "anonymous"),
      action,
      result,
      reasonCode,
      ipHash: hashPrivate(req.ip || req.socket?.remoteAddress || ""),
      userAgentHash: hashPrivate(req.headers["user-agent"] || ""),
      details,
    });
    return { saved: true };
  } catch {
    return { saved: false };
  }
}
function loginBucketKey(req, instituteId, identifier) {
  return hashPrivate(`${req.ip || ""}|${instituteId}|${identifier}`);
}
function checkLoginRate(req, instituteId, identifier) {
  const now = Date.now();
  const key = loginBucketKey(req, instituteId, identifier);
  const bucket = loginBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    loginBuckets.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return;
  }
  bucket.count += 1;
  if (bucket.count > LOGIN_MAX_ATTEMPTS) {
    const error = new Error("Too many login attempts. 15 minutes baad retry karein.");
    error.code = "LOGIN_RATE_LIMITED";
    error.httpStatus = 429;
    throw error;
  }
}
function clearLoginBucket(req, instituteId, identifier) {
  loginBuckets.delete(loginBucketKey(req, instituteId, identifier));
}
function createToken(identity, rememberMe = false) {
  const payload = {
    sub: String(identity._id),
    identityId: String(identity._id),
    userId: String(identity._id),
    role: identity.role,
    instituteId: identity.instituteId,
    name: identity.displayName,
    displayName: identity.displayName,
    identifierType: identity.identifierType,
    tokenVersion: identity.tokenVersion,
    mustChangePassword: Boolean(identity.mustChangePassword),
    authSource: "part120",
  };
  return jwt.sign(payload, signingSecret(), {
    algorithm: "HS256",
    expiresIn: rememberMe ? REMEMBER_TOKEN_TTL : DEFAULT_TOKEN_TTL,
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
    jwtid: crypto.randomUUID(),
  });
}
function publicIdentity(identity) {
  return {
    id: String(identity._id),
    instituteId: identity.instituteId,
    identifier: identity.identifierCanonical,
    identifierType: identity.identifierType,
    displayName: identity.displayName,
    role: identity.role,
    status: identity.status,
    mustChangePassword: identity.mustChangePassword,
    adoptedFromLegacy: identity.adoptedFromLegacy,
    lastLoginAt: identity.lastLoginAt,
    lastPasswordChangeAt: identity.lastPasswordChangeAt,
    createdAt: identity.createdAt,
    updatedAt: identity.updatedAt,
  };
}
async function validateUnifiedContext(models, payload) {
  const context = tokenContext(payload);
  if (context.authSource !== "part120") return { ...context, legacyCompatible: true };
  if (!dbReady()) {
    const error = new Error("MongoDB connection required for unified session validation.");
    error.code = "DATABASE_REQUIRED";
    error.httpStatus = 503;
    throw error;
  }
  if (!mongoose.isValidObjectId(context.identityId)) {
    const error = new Error("Unified identity reference invalid.");
    error.code = "INVALID_UNIFIED_IDENTITY";
    error.httpStatus = 401;
    throw error;
  }
  const identity = await models.Identity.findById(context.identityId);
  if (!identity || identity.status !== "active") {
    const error = new Error("Account disabled or not found.");
    error.code = "ACCOUNT_DISABLED";
    error.httpStatus = 401;
    throw error;
  }
  if (Number(identity.tokenVersion) !== Number(context.tokenVersion)) {
    const error = new Error("Session revoked. Please login again.");
    error.code = "SESSION_REVOKED";
    error.httpStatus = 401;
    throw error;
  }
  return {
    identityId: String(identity._id),
    userId: String(identity._id),
    role: identity.role,
    instituteId: identity.instituteId,
    displayName: identity.displayName,
    tokenVersion: identity.tokenVersion,
    authSource: "part120",
    mustChangePassword: identity.mustChangePassword,
    legacyCompatible: false,
    identity,
  };
}
function requireToken(req) {
  const token = getBearer(req);
  if (!token) {
    const error = new Error("Login required.");
    error.code = "LOGIN_REQUIRED";
    error.httpStatus = 401;
    throw error;
  }
  return verifyAnyJwt(token);
}
function authenticated(models) {
  return async function part120Authenticated(req, res, next) {
    try {
      const payload = requireToken(req);
      req.part120Context = await validateUnifiedContext(models, payload);
      next();
    } catch (error) {
      res.status(error.httpStatus || 401).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "AUTH_FAILED",
        message: error.message,
      });
    }
  };
}
function ownerOnly(models) {
  return async function part120OwnerOnly(req, res, next) {
    try {
      const payload = requireToken(req);
      const context = await validateUnifiedContext(models, payload);
      if (!OWNER_ROLES.has(context.role)) {
        const error = new Error("Only institute_owner can manage unified accounts.");
        error.code = "OWNER_ONLY";
        error.httpStatus = 403;
        throw error;
      }
      req.part120Context = { ...context, role: "institute_owner" };
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
  };
}
function confirmationForCreate(instituteId, role, identifier) {
  return `CREATE ${role.toUpperCase()} ACCOUNT ${identifier.toUpperCase()} FOR ${instituteId}`;
}
function confirmationForStatus(identity, nextStatus) {
  return `${nextStatus === "disabled" ? "DISABLE" : "ENABLE"} ACCOUNT ${String(identity._id)}`;
}
function confirmationForReset(identity) {
  return `RESET PASSWORD ${String(identity._id)}`;
}
function instituteFromPayloadOrBody(payload, body = {}) {
  const context = tokenContext(payload);
  const requestInstituteId = cleanId(body.instituteId || "");
  if (context.instituteId && requestInstituteId && context.instituteId !== requestInstituteId) {
    const error = new Error("Institute context does not match existing session.");
    error.code = "INSTITUTE_CONTEXT_MISMATCH";
    error.httpStatus = 403;
    throw error;
  }
  return context.instituteId || requestInstituteId;
}
function genericLoginError() {
  const error = new Error("Institute ID, login ID or password is incorrect.");
  error.code = "INVALID_CREDENTIALS";
  error.httpStatus = 401;
  return error;
}

export function registerPart120CommonLogin({ app } = {}) {
  if (!app || typeof app.get !== "function" || typeof app.post !== "function") {
    throw new Error("Part 120 registration failed: Express app required.");
  }
  if (app.locals.part120CommonLoginRegistered) return;
  app.locals.part120CommonLoginRegistered = true;
  const models = defineModels();
  const auth = authenticated(models);
  const owner = ownerOnly(models);

  // Unified-token consistency middleware applies to all API routes registered after Part 120.
  app.use("/api", async (req, res, next) => {
    const token = getBearer(req);
    if (!token) return next();
    try {
      const payload = verifyAnyJwt(token);
      const context = tokenContext(payload);
      if (context.authSource !== "part120") return next();
      req.part120Context = await validateUnifiedContext(models, payload);
      return next();
    } catch (error) {
      return res.status(error.httpStatus || 401).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "UNIFIED_SESSION_INVALID",
        message: error.message,
      });
    }
  });

  app.get(["/login", "/signin", "/common-login", "/part120"], (req, res) => {
    res.sendFile(path.join(frontendDir, "naxora-common-login.html"));
  });
  app.get(["/change-password", "/first-login-password"], (req, res) => {
    res.sendFile(path.join(frontendDir, "naxora-change-password.html"));
  });
  app.get(["/account-access-manager", "/unified-account-manager"], (req, res) => {
    res.sendFile(path.join(frontendDir, "naxora-account-access-manager.html"));
  });
  app.get("/naxora-common-auth.css", (req, res) => {
    res.type("text/css").sendFile(path.join(frontendDir, "naxora-common-auth.css"));
  });
  app.get("/naxora-common-login.js", (req, res) => {
    res.type("application/javascript").sendFile(path.join(frontendDir, "naxora-common-login.js"));
  });
  app.get("/naxora-change-password.js", (req, res) => {
    res.type("application/javascript").sendFile(path.join(frontendDir, "naxora-change-password.js"));
  });
  app.get("/naxora-account-access-manager.js", (req, res) => {
    res.type("application/javascript").sendFile(path.join(frontendDir, "naxora-account-access-manager.js"));
  });
  app.get("/naxora-common-session.js", (req, res) => {
    res.type("application/javascript").sendFile(path.join(frontendDir, "naxora-common-session.js"));
  });

  app.get("/api/part120/status", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      name: PART_NAME,
      status: "common_login_and_unified_identity_active",
      databaseConnected: dbReady(),
      jwtConfigured: jwtSecrets().length > 0,
      ownerActionSecretConfigured: Boolean(String(process.env.NAXORA_OWNER_ACTION_SECRET || "").trim()),
      supportedRoles: Array.from(SUPPORTED_ROLES),
      commonLoginUrl: "/login",
      unifiedAppUrl: "/app",
      legacySessionAdoptionEnabled: true,
      selfSignupEnabled: false,
      ownerProvisioningEnabled: true,
      accountLockoutEnabled: true,
      loginRateLimitEnabled: true,
      tokenRevocationEnabled: true,
      passwordHashing: "scrypt-v1",
      cookiesUsed: false,
      nextPart: 121,
      nextPartName: "Owner Module Consolidation",
    });
  });

  app.get("/api/part120/security-policy", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      passwordsReturned: false,
      passwordHashesReturned: false,
      passwordsLogged: false,
      selfSignupDisabled: true,
      existingSessionAdoptionRequiresValidJwt: true,
      accountProvisioningOwnerOnly: true,
      sensitiveAccountChangesRequireOwnerVerification: true,
      exactConfirmationRequiredForAccountChanges: true,
      genericInvalidCredentialResponse: true,
      accountLockoutAfterFailures: ACCOUNT_LOCK_ATTEMPTS,
      rateLimitWindowMinutes: LOGIN_WINDOW_MS / 60000,
      localStorageUsedOnlyWhenRememberMe: true,
      sessionStorageDefault: true,
      unifiedTokensRevocableByTokenVersion: true,
    });
  });

  app.post("/api/part120/auth/login", async (req, res) => {
    const instituteId = cleanId(req.body?.instituteId);
    const identifier = normalizeIdentifier(req.body?.identifier);
    const password = String(req.body?.password || "");
    const rememberMe = Boolean(req.body?.rememberMe);
    try {
      if (!dbReady()) {
        const error = new Error("MongoDB connection required.");
        error.code = "DATABASE_REQUIRED";
        error.httpStatus = 503;
        throw error;
      }
      if (!instituteId || !identifier || !password) throw genericLoginError();
      checkLoginRate(req, instituteId, identifier);

      const identity = await models.Identity.findOne({
        instituteId,
        identifierCanonical: identifier,
      }).select("+passwordSalt +passwordHash");

      if (!identity) {
        await writeAudit(models, req, "login", "failed", "INVALID_CREDENTIALS", { instituteId });
        throw genericLoginError();
      }
      if (identity.status !== "active") {
        await writeAudit(models, req, "login", "failed", "ACCOUNT_DISABLED", { instituteId }, String(identity._id));
        throw genericLoginError();
      }
      if (identity.lockUntil && identity.lockUntil.getTime() > Date.now()) {
        const error = new Error("Account temporarily locked. 15 minutes baad retry karein.");
        error.code = "ACCOUNT_TEMPORARILY_LOCKED";
        error.httpStatus = 423;
        throw error;
      }

      const valid = await verifyPassword(password, identity);
      if (!valid) {
        identity.failedLoginAttempts = Number(identity.failedLoginAttempts || 0) + 1;
        if (identity.failedLoginAttempts >= ACCOUNT_LOCK_ATTEMPTS) {
          identity.lockUntil = new Date(Date.now() + ACCOUNT_LOCK_MS);
          identity.failedLoginAttempts = 0;
        }
        await identity.save();
        await writeAudit(models, req, "login", "failed", "INVALID_CREDENTIALS", { instituteId }, String(identity._id));
        throw genericLoginError();
      }

      identity.failedLoginAttempts = 0;
      identity.lockUntil = null;
      identity.lastLoginAt = new Date();
      await identity.save();
      clearLoginBucket(req, instituteId, identifier);
      const token = createToken(identity, rememberMe);
      await writeAudit(models, req, "login", "success", "UNIFIED_LOGIN_SUCCESS", {
        instituteId,
        role: identity.role,
        rememberMe,
      }, String(identity._id));

      res.json({
        success: true,
        part: PART_NUMBER,
        token,
        tokenType: "Bearer",
        expiresIn: rememberMe ? REMEMBER_TOKEN_TTL : DEFAULT_TOKEN_TTL,
        rememberMe,
        requiresPasswordChange: identity.mustChangePassword,
        redirectTo: identity.mustChangePassword ? "/change-password" : "/app",
        session: publicIdentity(identity),
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "LOGIN_FAILED",
        message: error.message,
      });
    }
  });

  app.get("/api/part120/auth/session", auth, async (req, res) => {
    const context = req.part120Context;
    res.json({
      success: true,
      part: PART_NUMBER,
      session: {
        identityId: context.identityId || "",
        userId: context.userId,
        instituteId: context.instituteId,
        role: context.role,
        displayName: context.displayName,
        authSource: context.authSource,
        legacyCompatible: Boolean(context.legacyCompatible),
        mustChangePassword: Boolean(context.mustChangePassword),
      },
      redirectTo: context.mustChangePassword ? "/change-password" : "/app",
      tokenReturned: false,
    });
  });

  app.post("/api/part120/auth/adopt-session", async (req, res) => {
    try {
      if (!dbReady()) {
        const error = new Error("MongoDB connection required.");
        error.code = "DATABASE_REQUIRED";
        error.httpStatus = 503;
        throw error;
      }
      const payload = requireToken(req);
      const legacyContext = tokenContext(payload);
      if (!SUPPORTED_ROLES.has(legacyContext.role)) {
        const error = new Error("Supported existing NAXORA role required.");
        error.code = "UNSUPPORTED_ROLE";
        error.httpStatus = 403;
        throw error;
      }
      if (legacyContext.authSource === "part120") {
        const error = new Error("Session already uses the Part 120 common login.");
        error.code = "ALREADY_UNIFIED";
        error.httpStatus = 409;
        throw error;
      }

      const instituteId = instituteFromPayloadOrBody(payload, req.body || {});
      const identifier = normalizeIdentifier(req.body?.identifier);
      const displayName = cleanText(req.body?.displayName || legacyContext.displayName, 120);
      if (!instituteId || !identifier || !displayName) {
        const error = new Error("Institute ID, Login ID and display name required.");
        error.code = "ADOPTION_DETAILS_REQUIRED";
        error.httpStatus = 400;
        throw error;
      }
      const passwordRecord = await hashPassword(req.body?.newPassword);
      const duplicate = await models.Identity.findOne({ instituteId, identifierCanonical: identifier });
      if (duplicate) {
        const error = new Error("This Login ID already has a unified account.");
        error.code = "UNIFIED_ACCOUNT_EXISTS";
        error.httpStatus = 409;
        throw error;
      }

      const identity = await models.Identity.create({
        instituteId,
        identifierCanonical: identifier,
        identifierType: identifierType(identifier),
        displayName,
        role: legacyContext.role,
        passwordAlgorithm: passwordRecord.algorithm,
        passwordSalt: passwordRecord.salt,
        passwordHash: passwordRecord.hash,
        status: "active",
        tokenVersion: 1,
        mustChangePassword: false,
        adoptedFromLegacy: true,
        createdByUserId: legacyContext.userId,
        lastPasswordChangeAt: new Date(),
      });
      const token = createToken(identity, Boolean(req.body?.rememberMe));
      req.part120Context = {
        instituteId,
        userId: legacyContext.userId,
      };
      await writeAudit(models, req, "adopt_legacy_session", "success", "UNIFIED_IDENTITY_CREATED", {
        instituteId,
        role: identity.role,
      }, String(identity._id));

      res.status(201).json({
        success: true,
        part: PART_NUMBER,
        message: "Existing NAXORA session adopted into the common login.",
        token,
        rememberMe: Boolean(req.body?.rememberMe),
        redirectTo: "/app",
        session: publicIdentity(identity),
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "SESSION_ADOPTION_FAILED",
        message: error.message,
      });
    }
  });

  app.post("/api/part120/auth/change-password", auth, async (req, res) => {
    try {
      if (req.part120Context.authSource !== "part120") {
        const error = new Error("Adopt the existing session before changing the unified password.");
        error.code = "UNIFIED_ACCOUNT_REQUIRED";
        error.httpStatus = 409;
        throw error;
      }
      const identity = await models.Identity.findById(req.part120Context.identityId)
        .select("+passwordSalt +passwordHash");
      if (!identity) {
        const error = new Error("Unified account not found.");
        error.code = "ACCOUNT_NOT_FOUND";
        error.httpStatus = 404;
        throw error;
      }
      const currentValid = await verifyPassword(req.body?.currentPassword, identity);
      if (!currentValid) {
        const error = new Error("Current password is incorrect.");
        error.code = "CURRENT_PASSWORD_INCORRECT";
        error.httpStatus = 401;
        throw error;
      }
      const record = await hashPassword(req.body?.newPassword);
      identity.passwordAlgorithm = record.algorithm;
      identity.passwordSalt = record.salt;
      identity.passwordHash = record.hash;
      identity.mustChangePassword = false;
      identity.tokenVersion += 1;
      identity.lastPasswordChangeAt = new Date();
      await identity.save();
      const token = createToken(identity, Boolean(req.body?.rememberMe));
      await writeAudit(models, req, "change_password", "success", "PASSWORD_CHANGED", {
        instituteId: identity.instituteId,
      }, String(identity._id));
      res.json({
        success: true,
        part: PART_NUMBER,
        message: "Password changed and old sessions revoked.",
        token,
        rememberMe: Boolean(req.body?.rememberMe),
        redirectTo: "/app",
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "PASSWORD_CHANGE_FAILED",
        message: error.message,
      });
    }
  });

  app.post("/api/part120/auth/logout-all", auth, async (req, res) => {
    try {
      if (req.part120Context.authSource !== "part120") {
        return res.json({
          success: true,
          part: PART_NUMBER,
          message: "Legacy session logout is client-side only. Local token clear karein.",
          serverSessionsRevoked: false,
        });
      }
      await models.Identity.updateOne(
        { _id: req.part120Context.identityId },
        { $inc: { tokenVersion: 1 } }
      );
      await writeAudit(models, req, "logout_all", "success", "TOKEN_VERSION_INCREMENTED", {
        instituteId: req.part120Context.instituteId,
      }, req.part120Context.identityId);
      res.json({
        success: true,
        part: PART_NUMBER,
        message: "All unified sessions revoked.",
        serverSessionsRevoked: true,
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "LOGOUT_ALL_FAILED",
        message: error.message,
      });
    }
  });

  app.get("/api/part120/admin/accounts", owner, async (req, res) => {
    try {
      const accounts = await models.Identity.find({
        instituteId: req.part120Context.instituteId,
      }).sort({ role: 1, displayName: 1 }).lean();
      res.json({
        success: true,
        part: PART_NUMBER,
        count: accounts.length,
        accounts: accounts.map((account) => ({
          ...publicIdentity(account),
          confirmations: {
            disable: confirmationForStatus(account, "disabled"),
            enable: confirmationForStatus(account, "active"),
            resetPassword: confirmationForReset(account),
          },
        })),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        part: PART_NUMBER,
        code: "ACCOUNT_LIST_FAILED",
        message: error.message,
      });
    }
  });

  app.post("/api/part120/admin/accounts/create-preview", owner, async (req, res) => {
    const identifier = normalizeIdentifier(req.body?.identifier);
    const displayName = cleanText(req.body?.displayName, 120);
    const role = normalizeRole(req.body?.role);
    if (!identifier || !displayName || !SUPPORTED_ROLES.has(role)) {
      return res.status(400).json({
        success: false,
        part: PART_NUMBER,
        code: "ACCOUNT_DETAILS_INVALID",
        message: "Valid Login ID, display name and role required.",
      });
    }
    const existing = await models.Identity.findOne({
      instituteId: req.part120Context.instituteId,
      identifierCanonical: identifier,
    }).lean();
    if (existing) {
      return res.status(409).json({
        success: false,
        part: PART_NUMBER,
        code: "LOGIN_ID_ALREADY_EXISTS",
        message: "This Login ID already exists in the institute.",
      });
    }
    res.json({
      success: true,
      part: PART_NUMBER,
      preview: {
        instituteId: req.part120Context.instituteId,
        identifier,
        identifierType: identifierType(identifier),
        displayName,
        role,
        mustChangePassword: true,
      },
      confirmationTextRequired: confirmationForCreate(
        req.part120Context.instituteId,
        role,
        identifier
      ),
      ownerVerificationRequired: true,
      passwordNotStoredInPreview: true,
    });
  });

  app.post("/api/part120/admin/accounts/create-confirmed", owner, async (req, res) => {
    try {
      verifyOwnerAction(req);
      const identifier = normalizeIdentifier(req.body?.identifier);
      const displayName = cleanText(req.body?.displayName, 120);
      const role = normalizeRole(req.body?.role);
      if (!identifier || !displayName || !SUPPORTED_ROLES.has(role)) {
        const error = new Error("Valid Login ID, display name and role required.");
        error.code = "ACCOUNT_DETAILS_INVALID";
        error.httpStatus = 400;
        throw error;
      }
      const requiredConfirmation = confirmationForCreate(
        req.part120Context.instituteId,
        role,
        identifier
      );
      if (String(req.body?.confirmationText || "").trim() !== requiredConfirmation) {
        const error = new Error(`Exact confirmation required: ${requiredConfirmation}`);
        error.code = "EXACT_CONFIRMATION_REQUIRED";
        error.httpStatus = 400;
        throw error;
      }
      const passwordRecord = await hashPassword(req.body?.temporaryPassword);
      const identity = await models.Identity.create({
        instituteId: req.part120Context.instituteId,
        identifierCanonical: identifier,
        identifierType: identifierType(identifier),
        displayName,
        role,
        passwordAlgorithm: passwordRecord.algorithm,
        passwordSalt: passwordRecord.salt,
        passwordHash: passwordRecord.hash,
        status: "active",
        tokenVersion: 1,
        mustChangePassword: true,
        adoptedFromLegacy: false,
        createdByUserId: req.part120Context.userId,
        lastPasswordChangeAt: new Date(),
      });
      await writeAudit(models, req, "create_account", "success", "ACCOUNT_CREATED", {
        instituteId: identity.instituteId,
        role: identity.role,
      }, String(identity._id));
      res.status(201).json({
        success: true,
        part: PART_NUMBER,
        message: "Unified role account created. Temporary password share privately; first login par change required hoga.",
        account: publicIdentity(identity),
        temporaryPasswordReturned: false,
      });
    } catch (error) {
      const duplicate = error?.code === 11000;
      res.status(duplicate ? 409 : error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: duplicate ? "LOGIN_ID_ALREADY_EXISTS" : error.code || "ACCOUNT_CREATE_FAILED",
        message: duplicate ? "This Login ID already exists in the institute." : error.message,
      });
    }
  });

  app.post("/api/part120/admin/accounts/status-confirmed", owner, async (req, res) => {
    try {
      verifyOwnerAction(req);
      const identityId = cleanId(req.body?.identityId);
      const nextStatus = req.body?.nextStatus === "active" ? "active" : "disabled";
      if (!mongoose.isValidObjectId(identityId)) {
        const error = new Error("Valid identity ID required.");
        error.code = "INVALID_IDENTITY_ID";
        error.httpStatus = 400;
        throw error;
      }
      const identity = await models.Identity.findOne({
        _id: identityId,
        instituteId: req.part120Context.instituteId,
      });
      if (!identity) {
        const error = new Error("Account not found.");
        error.code = "ACCOUNT_NOT_FOUND";
        error.httpStatus = 404;
        throw error;
      }
      const requiredConfirmation = confirmationForStatus(identity, nextStatus);
      if (String(req.body?.confirmationText || "").trim() !== requiredConfirmation) {
        const error = new Error(`Exact confirmation required: ${requiredConfirmation}`);
        error.code = "EXACT_CONFIRMATION_REQUIRED";
        error.httpStatus = 400;
        throw error;
      }
      if (String(identity._id) === String(req.part120Context.identityId) && nextStatus === "disabled") {
        const error = new Error("Current owner cannot disable the active account being used.");
        error.code = "CANNOT_DISABLE_CURRENT_ACCOUNT";
        error.httpStatus = 409;
        throw error;
      }
      identity.status = nextStatus;
      identity.tokenVersion += 1;
      await identity.save();
      await writeAudit(models, req, "change_account_status", "success", `ACCOUNT_${nextStatus.toUpperCase()}`, {
        instituteId: identity.instituteId,
      }, String(identity._id));
      res.json({
        success: true,
        part: PART_NUMBER,
        message: `Account ${nextStatus}. Existing unified sessions revoked.`,
        account: publicIdentity(identity),
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "ACCOUNT_STATUS_FAILED",
        message: error.message,
      });
    }
  });

  app.post("/api/part120/admin/accounts/reset-password-confirmed", owner, async (req, res) => {
    try {
      verifyOwnerAction(req);
      const identityId = cleanId(req.body?.identityId);
      if (!mongoose.isValidObjectId(identityId)) {
        const error = new Error("Valid identity ID required.");
        error.code = "INVALID_IDENTITY_ID";
        error.httpStatus = 400;
        throw error;
      }
      const identity = await models.Identity.findOne({
        _id: identityId,
        instituteId: req.part120Context.instituteId,
      }).select("+passwordSalt +passwordHash");
      if (!identity) {
        const error = new Error("Account not found.");
        error.code = "ACCOUNT_NOT_FOUND";
        error.httpStatus = 404;
        throw error;
      }
      const requiredConfirmation = confirmationForReset(identity);
      if (String(req.body?.confirmationText || "").trim() !== requiredConfirmation) {
        const error = new Error(`Exact confirmation required: ${requiredConfirmation}`);
        error.code = "EXACT_CONFIRMATION_REQUIRED";
        error.httpStatus = 400;
        throw error;
      }
      const record = await hashPassword(req.body?.temporaryPassword);
      identity.passwordAlgorithm = record.algorithm;
      identity.passwordSalt = record.salt;
      identity.passwordHash = record.hash;
      identity.mustChangePassword = true;
      identity.tokenVersion += 1;
      identity.lastPasswordChangeAt = new Date();
      identity.failedLoginAttempts = 0;
      identity.lockUntil = null;
      await identity.save();
      await writeAudit(models, req, "reset_password", "success", "TEMPORARY_PASSWORD_SET", {
        instituteId: identity.instituteId,
      }, String(identity._id));
      res.json({
        success: true,
        part: PART_NUMBER,
        message: "Temporary password set. Existing sessions revoked and first-login password change required.",
        account: publicIdentity(identity),
        temporaryPasswordReturned: false,
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "PASSWORD_RESET_FAILED",
        message: error.message,
      });
    }
  });

  app.get("/api/part120/demo", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      name: PART_NAME,
      loginUrl: "/login",
      appUrl: "/app",
      accountManagerUrl: "/account-access-manager",
      flow: [
        "Existing role user adopts a valid legacy session once",
        "Owner creates remaining role accounts from Account Access Manager",
        "All roles login through the same /login page",
        "JWT contains role and instituteId",
        "Part 119 automatically filters and opens the unified app",
        "Temporary passwords require first-login change",
        "Owner can disable accounts or reset passwords with confirmation",
      ],
      pending: {
        ownerModuleConsolidation: 121,
        teacherModuleConsolidation: 122,
        studentModuleConsolidation: 123,
        otherRoleConsolidation: 124,
        globalVaniActions: 125,
        crossModuleE2E: 126,
        unifiedProductionLaunch: 127,
      },
    });
  });
}
