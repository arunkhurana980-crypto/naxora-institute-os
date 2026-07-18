import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const PART_NUMBER = "136.4";
const PART_NAME = "Simple Institute Owner Signup and Login";
const scryptAsync = promisify(crypto.scrypt);
const signupBuckets = new Map();
const loginBuckets = new Map();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, "../../frontend");

const cleanText = (value = "", max = 255) => String(value ?? "")
  .replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const cleanId = (value = "") => String(value ?? "").trim()
  .replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 180);
const dbReady = () => mongoose.connection?.readyState === 1;
const hashPrivate = value => crypto.createHash("sha256").update(String(value ?? "")).digest("hex").slice(0, 24);

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
function jwtSecrets() {
  return [process.env.JWT_SECRET, process.env.JWT_ACCESS_SECRET, process.env.ACCESS_TOKEN_SECRET, process.env.NAXORA_JWT_SECRET]
    .map(v => String(v ?? "").trim()).filter(Boolean);
}
function signingSecret() {
  const secret = jwtSecrets()[0];
  if (!secret) throw Object.assign(new Error("JWT_SECRET Render Environment me configure karein."), { code: "JWT_CONFIGURATION_MISSING", httpStatus: 503 });
  return secret;
}
function secureTransport(req) {
  const proto = String(req.headers["x-forwarded-proto"] ?? "").split(",")[0].trim().toLowerCase();
  const host = String(req.headers.host ?? "").toLowerCase();
  return Boolean(req.secure || proto === "https" || host.startsWith("localhost") || host.startsWith("127.0.0.1"));
}
function passwordPolicy(password = "") {
  const p = String(password ?? "");
  const failures = [];
  if (p.length < 10) failures.push("at least 10 characters");
  if (p.length > 128) failures.push("maximum 128 characters");
  if (!/[A-Za-z]/.test(p)) failures.push("at least one letter");
  if (!/\d/.test(p)) failures.push("at least one number");
  return failures;
}
async function hashPassword(password) {
  const failures = passwordPolicy(password);
  if (failures.length) throw Object.assign(new Error(`Password must contain ${failures.join(", ")}.`), { code: "WEAK_PASSWORD", httpStatus: 400 });
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await scryptAsync(String(password), salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return { algorithm: "scrypt-v1", salt, hash: Buffer.from(derived).toString("hex") };
}
async function verifyPassword(password, identity) {
  if (!identity?.passwordSalt || !identity?.passwordHash) return false;
  try {
    const derived = await scryptAsync(String(password ?? ""), identity.passwordSalt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
    const actual = Buffer.from(derived);
    const expected = Buffer.from(identity.passwordHash, "hex");
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch { return false; }
}
function slug(name = "") {
  const value = String(name ?? "").normalize("NFKD").replace(/[^\w\s-]/g, " ").trim()
    .split(/\s+/).filter(Boolean).slice(0, 3).map(v => v.slice(0, 4)).join("")
    .replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10);
  return value || "INST";
}
const candidateInstituteId = name => `NX-${slug(name)}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`.slice(0, 28);
function bucketKey(req, identifier) {
  return hashPrivate(`${req.ip ?? req.socket?.remoteAddress ?? ""}|${req.headers["user-agent"] ?? ""}|${identifier}`);
}
function checkRate(map, key, max, windowMs, message, code) {
  const now = Date.now();
  const bucket = map.get(key);
  if (!bucket || bucket.resetAt <= now) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count += 1;
  if (bucket.count > max) throw Object.assign(new Error(message), { code, httpStatus: 429 });
}
function identityModel() {
  const model = mongoose.models.Part120UnifiedIdentity;
  if (!model) throw Object.assign(new Error("Part 120 identity model unavailable."), { code: "PART120_IDENTITY_MODEL_UNAVAILABLE", httpStatus: 503 });
  return model;
}
function createToken(identity, rememberMe = false) {
  return jwt.sign({
    sub: String(identity._id), identityId: String(identity._id), userId: String(identity._id),
    role: "institute_owner", instituteId: identity.instituteId,
    name: identity.displayName, displayName: identity.displayName,
    identifierType: identity.identifierType, tokenVersion: identity.tokenVersion,
    mustChangePassword: false, authSource: "part120",
  }, signingSecret(), {
    algorithm: "HS256", expiresIn: rememberMe ? "7d" : "12h",
    issuer: "naxora-institute-os", audience: "naxora-unified-app", jwtid: crypto.randomUUID(),
  });
}
function publicSession(identity) {
  return {
    id: String(identity._id), identityId: String(identity._id), userId: String(identity._id),
    instituteId: identity.instituteId, identifier: identity.identifierCanonical,
    identifierType: identity.identifierType, displayName: identity.displayName,
    role: "institute_owner", status: identity.status, mustChangePassword: false, authSource: "part120",
  };
}
function defineModels() {
  const directorySchema = new mongoose.Schema({
    identifierCanonical: { type: String, required: true, unique: true, index: true },
    identifierType: { type: String, enum: ["email", "phone", "login_id"], required: true },
    instituteId: { type: String, required: true, unique: true, index: true },
    identityId: { type: String, default: "", index: true },
    status: { type: String, enum: ["provisioning", "active", "disabled"], default: "provisioning", index: true },
  }, { timestamps: true, strict: true });
  const instituteSchema = new mongoose.Schema({
    instituteId: { type: String, required: true, unique: true, index: true },
    instituteName: { type: String, required: true },
    ownerIdentityId: { type: String, required: true, index: true },
    ownerIdentifierCanonical: { type: String, required: true, index: true },
    status: { type: String, enum: ["trial", "active", "suspended"], default: "trial", index: true },
    onboardingStatus: { type: String, enum: ["owner_created", "setup_in_progress", "ready"], default: "owner_created" },
    trialStartedAt: { type: Date, default: Date.now },
  }, { timestamps: true, strict: true });
  const auditSchema = new mongoose.Schema({
    instituteId: { type: String, default: "", index: true }, identityId: { type: String, default: "", index: true },
    action: { type: String, required: true }, result: { type: String, required: true }, reasonCode: { type: String, default: "" },
    ipHash: String, userAgentHash: String, details: mongoose.Schema.Types.Mixed,
  }, { timestamps: true, strict: true });
  return {
    Directory: mongoose.models.Part1364OwnerDirectory || mongoose.model("Part1364OwnerDirectory", directorySchema),
    Institute: mongoose.models.Part1364InstituteProfile || mongoose.model("Part1364InstituteProfile", instituteSchema),
    Audit: mongoose.models.Part1364OwnerAccessAudit || mongoose.model("Part1364OwnerAccessAudit", auditSchema),
  };
}
async function audit(models, req, action, result, reasonCode = "", details = {}) {
  if (!dbReady()) return;
  try {
    await models.Audit.create({
      instituteId: cleanId(details.instituteId || ""), identityId: cleanId(details.identityId || ""),
      action, result, reasonCode, ipHash: hashPrivate(req.ip || ""), userAgentHash: hashPrivate(req.headers["user-agent"] || ""), details,
    });
  } catch {}
}
async function uniqueInstituteId(models, instituteName) {
  const Identity = identityModel();
  for (let i = 0; i < 12; i += 1) {
    const instituteId = candidateInstituteId(instituteName);
    const collision = await Promise.all([
      models.Directory.exists({ instituteId }), models.Institute.exists({ instituteId }), Identity.exists({ instituteId }),
    ]);
    if (!collision.some(Boolean)) return instituteId;
  }
  throw Object.assign(new Error("Unique Institute ID generate nahi ho saki."), { code: "INSTITUTE_ID_GENERATION_FAILED", httpStatus: 503 });
}
async function ownerForLogin(models, identifier) {
  const Identity = identityModel();
  const directory = await models.Directory.findOne({ identifierCanonical: identifier, status: "active" }).lean();
  if (directory?.identityId && mongoose.isValidObjectId(directory.identityId)) {
    const identity = await Identity.findById(directory.identityId).select("+passwordSalt +passwordHash");
    if (identity) return identity;
  }
  const matches = await Identity.find({ role: "institute_owner", identifierCanonical: identifier })
    .select("+passwordSalt +passwordHash").limit(2);
  if (matches.length > 1) throw Object.assign(new Error("Multiple Owner accounts mile. Common Login me Institute ID use karein."), { code: "MULTIPLE_OWNER_ACCOUNTS", httpStatus: 409 });
  if (matches.length === 1) {
    const identity = matches[0];
    await models.Directory.updateOne({ identifierCanonical: identifier }, { $setOnInsert: {
      identifierCanonical: identifier, identifierType: identity.identifierType,
      instituteId: identity.instituteId, identityId: String(identity._id), status: "active",
    } }, { upsert: true }).catch(() => {});
    return identity;
  }
  return null;
}

export function registerPart1364SimpleOwnerAccess({ app } = {}) {
  if (!app || typeof app.get !== "function" || typeof app.post !== "function") throw new Error("Part 136.4 registration failed: Express app required.");
  if (app.locals.part1364SimpleOwnerAccessRegistered) return;
  app.locals.part1364SimpleOwnerAccessRegistered = true;
  const models = defineModels();

  app.get(["/owner-access", "/owner-login", "/owner-signin", "/create-institute", "/owner-signup", "/start-institute"], (req, res) => {
    res.set("Cache-Control", "no-store");
    res.sendFile(path.join(frontendDir, "naxora-owner-access.html"));
  });
  app.get("/naxora-owner-access.css", (req, res) => {
    res.set("Cache-Control", "no-cache");
    res.type("text/css").sendFile(path.join(frontendDir, "naxora-owner-access.css"));
  });
  app.get("/naxora-owner-access.js", (req, res) => {
    res.set("Cache-Control", "no-cache");
    res.type("application/javascript").sendFile(path.join(frontendDir, "naxora-owner-access.js"));
  });

  app.get("/api/part1364/status", (req, res) => res.json({
    success: true, part: PART_NUMBER, name: PART_NAME, status: "simple_owner_signup_and_login_active",
    ownerLoginUrl: "/owner-login", createInstituteUrl: "/create-institute",
    ownerLoginNeedsInstituteId: false, ownerLoginFields: ["identifier", "password"],
    instituteIdGeneratedAutomatically: true, autoLoginAfterSignup: true,
    commonLoginStillUsedByOtherRoles: true, renderSecretRequiredForCustomerSignup: false,
    signedLinkRequiredForCustomerSignup: false, emailVerificationIncluded: false,
    captchaIncluded: false, signupRateLimitEnabled: true, ownerIdentifierGloballyUniqueForSimpleLogin: true,
  }));
  app.get("/api/part1364/security-policy", (req, res) => res.json({
    success: true, part: PART_NUMBER, httpsRequiredForSignup: true, passwordHashing: "scrypt-v1",
    passwordReturned: false, genericInvalidLoginResponse: true,
    loginRateLimitWindowMinutes: 15, signupRateLimitWindowMinutes: 60,
    signupAttemptsPerWindow: 5, accountLockAfterFailures: 5,
    publicOwnerSignup: true, bootstrapSecretUsedByCustomer: false,
    emailVerificationIncluded: false, recommendedBeforeLargeScalePublicLaunch: ["Email or phone verification", "CAPTCHA or bot protection"],
  }));

  app.post("/api/part1364/owner/signup", async (req, res) => {
    const identifier = normalizeIdentifier(req.body?.identifier);
    let directoryReserved = false, identityId = "", instituteId = "";
    try {
      if (!secureTransport(req)) throw Object.assign(new Error("Owner signup HTTPS par hi allowed hai."), { code: "HTTPS_REQUIRED", httpStatus: 400 });
      if (!dbReady()) throw Object.assign(new Error("MongoDB connection required."), { code: "DATABASE_REQUIRED", httpStatus: 503 });
      checkRate(signupBuckets, bucketKey(req, identifier), 5, 60 * 60 * 1000, "Too many signup attempts. One hour baad retry karein.", "OWNER_SIGNUP_RATE_LIMITED");

      const instituteName = cleanText(req.body?.instituteName, 160);
      const ownerName = cleanText(req.body?.ownerDisplayName, 120);
      const password = String(req.body?.password ?? "");
      const confirmation = String(req.body?.passwordConfirmation ?? "");
      if (instituteName.length < 2) throw Object.assign(new Error("Institute name required."), { code: "INSTITUTE_NAME_REQUIRED", httpStatus: 400 });
      if (ownerName.length < 2) throw Object.assign(new Error("Owner full name required."), { code: "OWNER_NAME_REQUIRED", httpStatus: 400 });
      if (!identifier) throw Object.assign(new Error("Owner Email, Phone ya Login ID required."), { code: "OWNER_IDENTIFIER_REQUIRED", httpStatus: 400 });
      if (password !== confirmation) throw Object.assign(new Error("Password aur Confirm Password match nahi karte."), { code: "PASSWORD_CONFIRMATION_MISMATCH", httpStatus: 400 });
      if (req.body?.termsAccepted !== true) throw Object.assign(new Error("Terms acknowledgement required."), { code: "TERMS_ACCEPTANCE_REQUIRED", httpStatus: 400 });

      const Identity = identityModel();
      const existing = await Promise.all([
        models.Directory.exists({ identifierCanonical: identifier }),
        Identity.exists({ role: "institute_owner", identifierCanonical: identifier }),
      ]);
      if (existing.some(Boolean)) throw Object.assign(new Error("Is Owner Login ID ka account pehle se bana hai. Owner Sign In use karein."), { code: "OWNER_IDENTIFIER_ALREADY_REGISTERED", httpStatus: 409 });

      const pw = await hashPassword(password);
      instituteId = await uniqueInstituteId(models, instituteName);
      try {
        await models.Directory.create({ identifierCanonical: identifier, identifierType: identifierType(identifier), instituteId, identityId: "", status: "provisioning" });
        directoryReserved = true;
      } catch (error) {
        if (error?.code === 11000) throw Object.assign(new Error("Owner Login ID already reserved hai."), { code: "OWNER_SIGNUP_CONFLICT", httpStatus: 409 });
        throw error;
      }

      const identity = await Identity.create({
        instituteId, identifierCanonical: identifier, identifierType: identifierType(identifier),
        displayName: ownerName, role: "institute_owner", passwordAlgorithm: pw.algorithm,
        passwordSalt: pw.salt, passwordHash: pw.hash, status: "active", tokenVersion: 1,
        mustChangePassword: false, adoptedFromLegacy: false,
        createdByUserId: "part1364_self_service_owner_signup", failedLoginAttempts: 0,
        lockUntil: null, lastLoginAt: new Date(), lastPasswordChangeAt: new Date(),
      });
      identityId = String(identity._id);
      await models.Institute.create({
        instituteId, instituteName, ownerIdentityId: identityId,
        ownerIdentifierCanonical: identifier, status: "trial", onboardingStatus: "owner_created", trialStartedAt: new Date(),
      });
      await models.Directory.updateOne({ identifierCanonical: identifier, instituteId }, { $set: { identityId, status: "active" } });
      const token = createToken(identity, false);
      await audit(models, req, "owner_signup", "success", "", { instituteId, identityId, identifierType: identity.identifierType });
      res.status(201).json({
        success: true, part: PART_NUMBER, token, tokenType: "Bearer", expiresIn: "12h",
        rememberMe: false, redirectTo: "/app",
        institute: { instituteId, instituteName, status: "trial", onboardingStatus: "owner_created" },
        session: publicSession(identity), message: "Institute aur Owner account successfully create ho gaye.", passwordReturned: false,
      });
    } catch (error) {
      const Identity = mongoose.models.Part120UnifiedIdentity;
      if (identityId) await Identity?.deleteOne({ _id: identityId }).catch(() => {});
      if (instituteId) await models.Institute.deleteOne({ instituteId }).catch(() => {});
      if (directoryReserved && instituteId) await models.Directory.deleteOne({ identifierCanonical: identifier, instituteId, status: "provisioning" }).catch(() => {});
      await audit(models, req, "owner_signup", "failed", error.code || "OWNER_SIGNUP_FAILED", { instituteId, identifierType: identifierType(identifier) });
      res.status(error.httpStatus || 500).json({ success: false, part: PART_NUMBER, code: error.code || "OWNER_SIGNUP_FAILED", message: error.message });
    }
  });

  app.post("/api/part1364/owner/login", async (req, res) => {
    const identifier = normalizeIdentifier(req.body?.identifier);
    const password = String(req.body?.password ?? "");
    const rememberMe = Boolean(req.body?.rememberMe);
    try {
      if (!dbReady()) throw Object.assign(new Error("MongoDB connection required."), { code: "DATABASE_REQUIRED", httpStatus: 503 });
      if (!identifier || !password) throw Object.assign(new Error("Owner Login ID ya password incorrect hai."), { code: "INVALID_OWNER_CREDENTIALS", httpStatus: 401 });
      checkRate(loginBuckets, bucketKey(req, identifier), 8, 15 * 60 * 1000, "Too many Owner login attempts. 15 minutes baad retry karein.", "OWNER_LOGIN_RATE_LIMITED");
      const identity = await ownerForLogin(models, identifier);
      if (!identity || identity.role !== "institute_owner" || identity.status !== "active") throw Object.assign(new Error("Owner Login ID ya password incorrect hai."), { code: "INVALID_OWNER_CREDENTIALS", httpStatus: 401 });
      if (identity.lockUntil && identity.lockUntil.getTime() > Date.now()) throw Object.assign(new Error("Owner account temporarily locked hai. 15 minutes baad retry karein."), { code: "OWNER_ACCOUNT_TEMPORARILY_LOCKED", httpStatus: 423 });
      const valid = await verifyPassword(password, identity);
      if (!valid) {
        identity.failedLoginAttempts = Number(identity.failedLoginAttempts || 0) + 1;
        if (identity.failedLoginAttempts >= 5) {
          identity.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
          identity.failedLoginAttempts = 0;
        }
        await identity.save();
        throw Object.assign(new Error("Owner Login ID ya password incorrect hai."), { code: "INVALID_OWNER_CREDENTIALS", httpStatus: 401 });
      }
      identity.failedLoginAttempts = 0;
      identity.lockUntil = null;
      identity.lastLoginAt = new Date();
      await identity.save();
      loginBuckets.delete(bucketKey(req, identifier));
      const token = createToken(identity, rememberMe);
      await audit(models, req, "owner_login", "success", "", { instituteId: identity.instituteId, identityId: String(identity._id), rememberMe });
      res.json({
        success: true, part: PART_NUMBER, token, tokenType: "Bearer",
        expiresIn: rememberMe ? "7d" : "12h", rememberMe, redirectTo: "/app", session: publicSession(identity),
      });
    } catch (error) {
      await audit(models, req, "owner_login", "failed", error.code || "OWNER_LOGIN_FAILED");
      res.status(error.httpStatus || 500).json({
        success: false, part: PART_NUMBER, code: error.code || "OWNER_LOGIN_FAILED",
        message: error.message, commonLoginFallback: error.code === "MULTIPLE_OWNER_ACCOUNTS" ? "/common-login" : null,
      });
    }
  });
}
