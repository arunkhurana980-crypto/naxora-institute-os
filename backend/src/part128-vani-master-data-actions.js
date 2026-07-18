import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const PART_NUMBER = 128;
const PART_NAME = "VANI Master Data Actions";
const PREVIEW_TTL_MS = 30 * 60 * 1000;
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;
const scryptAsync = promisify(crypto.scrypt);
const OWNER_ROLES = new Set(["institute_owner", "owner", "instituteowner"]);
const STAFF_ROLES = new Set(["branch_manager", "accountant", "counsellor", "staff"]);
const ACCOUNT_CREATE_ACTIONS = new Set([
  "master.teacher.create",
  "master.student.create",
  "master.parent.create_link",
  "master.staff.create",
]);

const ACTIONS = Object.freeze({
  "master.branch.create": { label: "Create Branch", required: ["branchName", "branchCode"] },
  "master.branch.update": { label: "Update Branch", required: ["branchId"] },
  "master.course.create": { label: "Create Course", required: ["courseName", "courseCode"] },
  "master.course.update": { label: "Update Course", required: ["courseId"] },
  "master.class.create": { label: "Create Batch/Class", required: ["branchId", "courseId", "batchCode", "title"] },
  "master.class.update": { label: "Update Batch/Class", required: ["classId"] },
  "master.teacher.create": { label: "Create Teacher", required: ["identifier", "displayName", "branchIds"] },
  "master.teacher.update": { label: "Update Teacher", required: ["teacherId"] },
  "master.student.create": { label: "Create Student", required: ["identifier", "displayName", "branchId"] },
  "master.student.update": { label: "Update Student", required: ["studentId"] },
  "master.parent.create_link": { label: "Create Parent and Link Student", required: ["identifier", "displayName", "studentId"] },
  "master.parent.link": { label: "Link Existing Parent", required: ["parentIdentityId", "studentId"] },
  "master.staff.create": { label: "Create Staff Role Account", required: ["identifier", "displayName", "accountRole"] },
  "master.staff.update_scope": { label: "Update Staff Role Scope", required: ["staffIdentityId", "accountRole"] },
});

const PATTERNS = Object.freeze([
  ["master.parent.create_link", /(parent|guardian).*(create|banao).*(link|student)/i],
  ["master.parent.link", /(parent|guardian).*(link|jodo|connect)/i],
  ["master.branch.update", /branch.*(update|edit|badlo)/i],
  ["master.branch.create", /branch.*(create|banao|add)/i],
  ["master.course.update", /course.*(update|edit|badlo)/i],
  ["master.course.create", /course.*(create|banao|add)/i],
  ["master.class.update", /(class|batch).*(update|edit|badlo)/i],
  ["master.class.create", /(class|batch).*(create|banao|add)/i],
  ["master.teacher.update", /teacher.*(update|edit|link|assign|badlo)/i],
  ["master.teacher.create", /teacher.*(create|banao|add)/i],
  ["master.student.update", /student.*(update|edit|link|assign|badlo)/i],
  ["master.student.create", /student.*(create|banao|add|admission)/i],
  ["master.staff.update_scope", /(staff|branch manager|accountant|counsellor|counselor).*(update|scope|assign|edit)/i],
  ["master.staff.create", /(staff|branch manager|accountant|counsellor|counselor).*(create|banao|add)/i],
]);

const BLOCKED = /(password|passcode|otp|cvv|upi\s*pin|api\s*key|owner\s*secret|jwt|razorpay\s*secret|bank\s*account|card\s*number|delete|erase|purge|drop database)/i;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, "../../frontend");

const cleanText = (value = "", max = 255) => String(value || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const cleanLong = (value = "", max = 4000) => String(value || "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ").trim().slice(0, max);
const cleanId = (value = "") => String(value || "").trim().replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 180);
const cleanCode = (value = "") => String(value || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 60);
const cleanList = (value, max = 50) => [...new Set((Array.isArray(value) ? value : String(value || "").split(/[,\n]/)).map(cleanId).filter(Boolean))].slice(0, max);
const cleanTextList = (value, max = 30) => [...new Set((Array.isArray(value) ? value : String(value || "").split(/[,\n]/)).map(v => cleanText(v, 100)).filter(Boolean))].slice(0, max);
const cleanBool = (value, fallback = false) => typeof value === "boolean" ? value : ["true", "1", "yes", "haan", "on"].includes(String(value || "").toLowerCase()) ? true : ["false", "0", "no", "nahi", "off"].includes(String(value || "").toLowerCase()) ? false : fallback;
const cleanNumber = (value, min = 0, max = 10000000) => value === "" || value === null || value === undefined ? null : Number.isFinite(Number(value)) ? Math.max(min, Math.min(max, Number(value))) : null;
const normalizeRole = (value = "") => ({ owner: "institute_owner", instituteowner: "institute_owner", branchmanager: "branch_manager", counselor: "counsellor" }[String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_")] || String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_"));
const normalizeStatus = (value = "") => ["active", "inactive", "disabled", "completed"].includes(String(value || "").toLowerCase()) ? String(value).toLowerCase() : "active";
const dbReady = () => mongoose.connection?.readyState === 1;
const sha256 = value => crypto.createHash("sha256").update(String(value || "")).digest("hex");
const createId = prefix => `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;

function normalizeIdentifier(value = "") {
  const raw = String(value || "").trim().slice(0, 180);
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return raw.toLowerCase();
  const phone = raw.replace(/[()\s-]/g, "");
  if (/^\+?\d{8,15}$/.test(phone)) return phone;
  return raw.toLowerCase().replace(/\s+/g, "");
}
function identifierType(identifier) {
  if (identifier.includes("@")) return "email";
  if (/^\+?\d{8,15}$/.test(identifier)) return "phone";
  return "login_id";
}
function jwtSecrets() {
  return [process.env.JWT_SECRET, process.env.JWT_ACCESS_SECRET, process.env.ACCESS_TOKEN_SECRET, process.env.NAXORA_JWT_SECRET].map(v => String(v || "").trim()).filter(Boolean);
}
function verifyJwt(token) {
  const secrets = jwtSecrets();
  if (!secrets.length) throw Object.assign(new Error("JWT server configuration missing."), { code: "JWT_CONFIGURATION_MISSING", httpStatus: 503 });
  for (const secret of secrets) {
    try { return jwt.verify(token, secret, { algorithms: ["HS256", "HS384", "HS512"] }); } catch {}
  }
  throw Object.assign(new Error("Login session invalid or expired."), { code: "INVALID_SESSION", httpStatus: 401 });
}
function context(req) {
  const auth = String(req.headers.authorization || "").trim();
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const payload = req.part120Context || req.user || req.auth || (token ? verifyJwt(token) : null);
  if (!payload) throw Object.assign(new Error("Institute Owner login required."), { code: "OWNER_LOGIN_REQUIRED", httpStatus: 401 });
  const role = normalizeRole(payload.role || payload.userRole || payload.accountRole || payload.user?.role || "");
  if (!OWNER_ROLES.has(role)) throw Object.assign(new Error("Only institute_owner can confirm Part 128 writes."), { code: "OWNER_ONLY", httpStatus: 403 });
  const tokenInstituteId = cleanId(payload.instituteId || payload.institute_id || payload.user?.instituteId || payload.tenantId || "");
  const requested = cleanId(req.headers["x-naxora-institute-id"] || req.body?.instituteId || req.query?.instituteId || "");
  if (tokenInstituteId && requested && tokenInstituteId !== requested) throw Object.assign(new Error("Institute context mismatch."), { code: "INSTITUTE_CONTEXT_MISMATCH", httpStatus: 403 });
  const instituteId = tokenInstituteId || requested;
  if (!instituteId) throw Object.assign(new Error("Valid instituteId required."), { code: "INSTITUTE_ID_REQUIRED", httpStatus: 400 });
  return {
    instituteId,
    userId: cleanId(payload.userId || payload.identityId || payload.id || payload._id || payload.sub || "owner"),
    identityId: cleanId(payload.identityId || payload.sub || payload.userId || "owner"),
    displayName: cleanText(payload.displayName || payload.name || payload.email || "Institute Owner", 120),
    role: "institute_owner",
  };
}
function ownerOnly(req, res, next) {
  try { req.part128Owner = context(req); next(); }
  catch (error) { res.status(error.httpStatus || 401).json({ success: false, part: PART_NUMBER, code: error.code || "OWNER_AUTH_FAILED", message: error.message }); }
}
function verifyOwnerSecret(req) {
  const expected = String(process.env.NAXORA_OWNER_ACTION_SECRET || "").trim();
  if (!expected) throw Object.assign(new Error("NAXORA_OWNER_ACTION_SECRET configure karein."), { code: "OWNER_ACTION_SECRET_MISSING", httpStatus: 503 });
  const supplied = String(req.headers["x-naxora-owner-action-secret"] || "").trim();
  const a = crypto.createHash("sha256").update(supplied).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  if (!supplied || !crypto.timingSafeEqual(a, b)) throw Object.assign(new Error("Private Owner verification failed."), { code: "OWNER_VERIFICATION_FAILED", httpStatus: 403 });
}
function passwordPolicy(password = "") {
  const failures = [];
  if (password.length < 10) failures.push("10 characters");
  if (!/[A-Za-z]/.test(password)) failures.push("one letter");
  if (!/\d/.test(password)) failures.push("one number");
  return failures;
}
async function hashPassword(password) {
  const failures = passwordPolicy(password);
  if (failures.length) throw Object.assign(new Error(`Temporary password needs ${failures.join(", ")}.`), { code: "WEAK_TEMPORARY_PASSWORD", httpStatus: 400 });
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return { algorithm: "scrypt-v1", salt, hash: Buffer.from(derived).toString("hex") };
}

function defineModels() {
  const actionSchema = new mongoose.Schema({
    actionId: { type: String, required: true, unique: true, index: true },
    instituteId: { type: String, required: true, index: true },
    actorUserId: { type: String, required: true, index: true },
    actorIdentityId: { type: String, required: true },
    actorDisplayName: { type: String, required: true },
    actionType: { type: String, enum: Object.keys(ACTIONS), required: true, index: true },
    actionLabel: { type: String, required: true },
    status: { type: String, enum: ["preview_ready", "executing", "executed_native", "failed", "cancelled", "expired"], default: "preview_ready", index: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    fingerprint: { type: String, required: true, index: true },
    confirmationDigest: { type: String, required: true },
    previewExpiresAt: { type: Date, required: true, index: true },
    executedAt: { type: Date, default: null },
    result: { type: mongoose.Schema.Types.Mixed, default: {} },
    failureCode: { type: String, default: "" },
    failureMessage: { type: String, default: "" },
    rollbackApplied: { type: Boolean, default: false },
    passwordRequiredAtConfirmation: { type: Boolean, default: false },
  }, { timestamps: true, strict: true });
  actionSchema.index({ instituteId: 1, fingerprint: 1, createdAt: -1 });

  const base = fields => new mongoose.Schema({
    instituteId: { type: String, required: true, index: true },
    status: { type: String, enum: ["active", "inactive", "disabled", "completed"], default: "active", index: true },
    createdByActionId: { type: String, required: true },
    updatedByActionId: { type: String, required: true },
    ...fields,
  }, { timestamps: true, strict: true });

  const BranchSchema = base({ branchId: { type: String, required: true, unique: true, index: true }, branchCode: { type: String, required: true }, branchName: { type: String, required: true }, city: String, address: String, phone: String });
  BranchSchema.index({ instituteId: 1, branchCode: 1 }, { unique: true });
  const CourseSchema = base({ courseId: { type: String, required: true, unique: true, index: true }, courseCode: { type: String, required: true }, courseName: { type: String, required: true }, description: String, durationMonths: Number, feeAmount: Number });
  CourseSchema.index({ instituteId: 1, courseCode: 1 }, { unique: true });
  const ClassSchema = base({ classId: { type: String, required: true, unique: true, index: true }, branchId: { type: String, required: true, index: true }, courseId: { type: String, required: true, index: true }, batchCode: { type: String, required: true }, title: { type: String, required: true }, teacherId: { type: String, default: "", index: true }, schedule: String, startDate: Date, endDate: Date, capacity: Number });
  ClassSchema.index({ instituteId: 1, batchCode: 1 }, { unique: true });
  const TeacherSchema = base({ teacherId: { type: String, required: true, unique: true, index: true }, identityId: { type: String, required: true, index: true }, branchIds: [String], subjects: [String], employeeCode: String, phone: String });
  TeacherSchema.index({ instituteId: 1, identityId: 1 }, { unique: true });
  const StudentSchema = base({ studentId: { type: String, required: true, unique: true, index: true }, identityId: { type: String, required: true, index: true }, branchId: { type: String, required: true, index: true }, classId: { type: String, default: "", index: true }, courseId: { type: String, default: "", index: true }, rollNumber: String, admissionNumber: String, phone: String });
  StudentSchema.index({ instituteId: 1, identityId: 1 }, { unique: true });
  const ParentSchema = base({ linkId: { type: String, required: true, unique: true, index: true }, parentIdentityId: { type: String, required: true, index: true }, studentId: { type: String, required: true, index: true }, relationship: String });
  ParentSchema.index({ instituteId: 1, parentIdentityId: 1, studentId: 1 }, { unique: true });
  const StaffSchema = base({ staffId: { type: String, required: true, unique: true, index: true }, identityId: { type: String, required: true, index: true }, role: { type: String, enum: [...STAFF_ROLES], required: true, index: true }, branchIds: [String], instituteWide: Boolean, employeeCode: String, phone: String });
  StaffSchema.index({ instituteId: 1, identityId: 1 }, { unique: true });
  const AuditSchema = new mongoose.Schema({ instituteId: { type: String, required: true, index: true }, actionId: { type: String, required: true, index: true }, actorUserId: String, actionType: String, event: String, result: String, details: mongoose.Schema.Types.Mixed }, { timestamps: true, strict: true });

  return {
    Action: mongoose.models.Part128MasterDataAction || mongoose.model("Part128MasterDataAction", actionSchema),
    Branch: mongoose.models.Part128Branch || mongoose.model("Part128Branch", BranchSchema),
    Course: mongoose.models.Part128Course || mongoose.model("Part128Course", CourseSchema),
    ClassBatch: mongoose.models.Part128ClassBatch || mongoose.model("Part128ClassBatch", ClassSchema),
    Teacher: mongoose.models.Part128TeacherProfile || mongoose.model("Part128TeacherProfile", TeacherSchema),
    Student: mongoose.models.Part128StudentProfile || mongoose.model("Part128StudentProfile", StudentSchema),
    ParentLink: mongoose.models.Part128ParentStudentLink || mongoose.model("Part128ParentStudentLink", ParentSchema),
    Staff: mongoose.models.Part128StaffProfile || mongoose.model("Part128StaffProfile", StaffSchema),
    Audit: mongoose.models.Part128MasterDataAudit || mongoose.model("Part128MasterDataAudit", AuditSchema),
  };
}

async function audit(models, ctx, action, event, result, details = {}) {
  try { await models.Audit.create({ instituteId: ctx.instituteId, actionId: action.actionId, actorUserId: ctx.userId, actionType: action.actionType, event, result, details }); } catch {}
}
function normalizePayload(raw = {}) {
  const p = {};
  for (const key of ["branchId", "courseId", "classId", "teacherId", "studentId", "parentIdentityId", "staffIdentityId"]) if (raw[key] !== undefined) p[key] = cleanId(raw[key]);
  if (raw.branchIds !== undefined) p.branchIds = cleanList(raw.branchIds);
  if (raw.subjects !== undefined) p.subjects = cleanTextList(raw.subjects);
  for (const key of ["branchName", "city", "address", "phone", "courseName", "description", "batchCode", "title", "schedule", "identifier", "displayName", "employeeCode", "rollNumber", "admissionNumber", "relationship"]) if (raw[key] !== undefined) p[key] = cleanLong(raw[key], key === "description" ? 2000 : 300);
  if (raw.branchCode !== undefined) p.branchCode = cleanCode(raw.branchCode);
  if (raw.courseCode !== undefined) p.courseCode = cleanCode(raw.courseCode);
  if (raw.accountRole !== undefined) p.accountRole = normalizeRole(raw.accountRole);
  if (raw.status !== undefined) p.status = normalizeStatus(raw.status);
  if (raw.instituteWide !== undefined) p.instituteWide = cleanBool(raw.instituteWide);
  if (raw.durationMonths !== undefined) p.durationMonths = cleanNumber(raw.durationMonths, 1, 120);
  if (raw.feeAmount !== undefined) p.feeAmount = cleanNumber(raw.feeAmount, 0, 10000000);
  if (raw.capacity !== undefined) p.capacity = cleanNumber(raw.capacity, 1, 10000);
  if (raw.startDate) p.startDate = new Date(raw.startDate);
  if (raw.endDate) p.endDate = new Date(raw.endDate);
  return p;
}
function validate(actionType, payload) {
  const def = ACTIONS[actionType];
  if (!def) throw Object.assign(new Error("Unknown Part 128 action."), { code: "UNKNOWN_MASTER_ACTION", httpStatus: 404 });
  const missing = def.required.filter(key => payload[key] === undefined || payload[key] === "" || (Array.isArray(payload[key]) && !payload[key].length));
  if (missing.length) throw Object.assign(new Error(`Required fields missing: ${missing.join(", ")}`), { code: "MASTER_FIELDS_REQUIRED", httpStatus: 400, missingFields: missing });
  if (payload.accountRole && !STAFF_ROLES.has(payload.accountRole)) throw Object.assign(new Error("Invalid staff accountRole."), { code: "INVALID_STAFF_ROLE", httpStatus: 400 });
  if (["master.staff.create", "master.staff.update_scope"].includes(actionType) && !payload.instituteWide && !(payload.branchIds || []).length) throw Object.assign(new Error("Staff scope needs branchIds or instituteWide=true."), { code: "STAFF_SCOPE_REQUIRED", httpStatus: 400 });
  return def;
}
function confirmationText(action) { return `CONFIRM ${action.actionType.toUpperCase().replace(/\./g, " ")} ${action.actionId.slice(-8).toUpperCase()}`; }
function publicAction(action) {
  return { actionId: action.actionId, actionType: action.actionType, actionLabel: action.actionLabel, status: action.status, payload: action.payload, confirmationTextRequired: action.status === "preview_ready" ? confirmationText(action) : null, previewExpiresAt: action.previewExpiresAt, executedAt: action.executedAt, result: action.result || {}, failureCode: action.failureCode || "", failureMessage: action.failureMessage || "", rollbackApplied: Boolean(action.rollbackApplied), passwordRequiredAtConfirmation: Boolean(action.passwordRequiredAtConfirmation), createdAt: action.createdAt, updatedAt: action.updatedAt };
}
async function createPreview(models, ctx, actionType, rawPayload) {
  if (!dbReady()) throw Object.assign(new Error("MongoDB connection required."), { code: "DATABASE_REQUIRED", httpStatus: 503 });
  const payload = normalizePayload(rawPayload);
  const def = validate(actionType, payload);
  const fp = sha256(JSON.stringify({ instituteId: ctx.instituteId, userId: ctx.userId, actionType, payload }));
  const reusable = await models.Action.findOne({ instituteId: ctx.instituteId, actorUserId: ctx.userId, fingerprint: fp, status: "preview_ready", previewExpiresAt: { $gt: new Date() } }).sort({ createdAt: -1 });
  if (reusable) return { action: reusable, reusedPreview: true };
  const duplicate = await models.Action.findOne({ instituteId: ctx.instituteId, actorUserId: ctx.userId, fingerprint: fp, status: "executed_native", executedAt: { $gt: new Date(Date.now() - DUPLICATE_WINDOW_MS) } });
  if (duplicate) throw Object.assign(new Error("Same action executed recently. Duplicate blocked."), { code: "DUPLICATE_MASTER_ACTION", httpStatus: 409, existingAction: publicAction(duplicate) });
  const actionId = createId("master");
  const temp = { actionId, actionType };
  const action = await models.Action.create({ actionId, instituteId: ctx.instituteId, actorUserId: ctx.userId, actorIdentityId: ctx.identityId, actorDisplayName: ctx.displayName, actionType, actionLabel: def.label, payload, fingerprint: fp, confirmationDigest: sha256(confirmationText(temp)), previewExpiresAt: new Date(Date.now() + PREVIEW_TTL_MS), passwordRequiredAtConfirmation: ACCOUNT_CREATE_ACTIONS.has(actionType) });
  await audit(models, ctx, action, "preview_created", "success");
  return { action, reusedPreview: false };
}
async function requireRecord(Model, filter, code, message) {
  const record = await Model.findOne(filter);
  if (!record) throw Object.assign(new Error(message), { code, httpStatus: 404 });
  return record;
}
async function validateBranches(models, instituteId, branchIds) {
  const ids = cleanList(branchIds);
  const count = await models.Branch.countDocuments({ instituteId, branchId: { $in: ids }, status: { $ne: "disabled" } });
  if (count !== ids.length) throw Object.assign(new Error("One or more branchIds are invalid."), { code: "BRANCH_SCOPE_INVALID", httpStatus: 400 });
  return ids;
}
async function requireIdentity(Identity, instituteId, id, role = "") {
  if (!mongoose.isValidObjectId(id)) throw Object.assign(new Error("Identity reference invalid."), { code: "INVALID_IDENTITY_REFERENCE", httpStatus: 400 });
  const identity = await Identity.findOne({ _id: id, instituteId, ...(role ? { role } : {}) });
  if (!identity) throw Object.assign(new Error(`Matching ${role || "account"} not found in institute.`), { code: "IDENTITY_NOT_FOUND", httpStatus: 404 });
  return identity;
}
async function createIdentity(Identity, ctx, action, role, payload, password) {
  const identifierCanonical = normalizeIdentifier(payload.identifier);
  if (!identifierCanonical) throw Object.assign(new Error("Valid identifier required."), { code: "ACCOUNT_IDENTIFIER_REQUIRED", httpStatus: 400 });
  if (await Identity.exists({ instituteId: ctx.instituteId, identifierCanonical })) throw Object.assign(new Error("Login identifier already exists."), { code: "ACCOUNT_IDENTIFIER_EXISTS", httpStatus: 409 });
  const hashed = await hashPassword(password);
  return Identity.create({ instituteId: ctx.instituteId, identifierCanonical, identifierType: identifierType(identifierCanonical), displayName: payload.displayName, role, passwordAlgorithm: hashed.algorithm, passwordSalt: hashed.salt, passwordHash: hashed.hash, status: "active", tokenVersion: 1, mustChangePassword: true, adoptedFromLegacy: false, createdByUserId: `part128_master:${action.actionId}`, failedLoginAttempts: 0, lockUntil: null, lastPasswordChangeAt: new Date() });
}
const publicIdentity = identity => ({ identityId: String(identity._id), identifier: identity.identifierCanonical, displayName: identity.displayName, role: identity.role, status: identity.status, mustChangePassword: Boolean(identity.mustChangePassword), passwordReturned: false });
const publicRecord = record => { const obj = record?.toObject ? record.toObject() : record; if (obj) delete obj.__v; return obj; };

async function execute(models, ctx, action, password = "") {
  const Identity = mongoose.models.Part120UnifiedIdentity;
  const Scope = mongoose.models.Part124RoleScopeAssignment;
  if (!Identity) throw Object.assign(new Error("Part 120 identity model unavailable."), { code: "PART120_IDENTITY_MODEL_MISSING", httpStatus: 503 });
  if (!Scope) throw Object.assign(new Error("Part 124 role-scope model unavailable."), { code: "PART124_SCOPE_MODEL_MISSING", httpStatus: 503 });
  const p = action.payload;
  const created = [];
  try {
    switch (action.actionType) {
      case "master.branch.create": {
        const record = await models.Branch.create({ instituteId: ctx.instituteId, branchId: createId("branch"), branchCode: p.branchCode, branchName: p.branchName, city: p.city || "", address: p.address || "", phone: p.phone || "", status: p.status || "active", createdByActionId: action.actionId, updatedByActionId: action.actionId });
        created.push([models.Branch, record._id]); return { entity: "branch", record: publicRecord(record) };
      }
      case "master.branch.update": {
        const record = await requireRecord(models.Branch, { instituteId: ctx.instituteId, branchId: p.branchId }, "BRANCH_NOT_FOUND", "Branch not found.");
        for (const key of ["branchName", "branchCode", "city", "address", "phone", "status"]) if (p[key] !== undefined) record[key] = p[key];
        record.updatedByActionId = action.actionId; await record.save(); return { entity: "branch", record: publicRecord(record) };
      }
      case "master.course.create": {
        const record = await models.Course.create({ instituteId: ctx.instituteId, courseId: createId("course"), courseCode: p.courseCode, courseName: p.courseName, description: p.description || "", durationMonths: p.durationMonths, feeAmount: p.feeAmount, status: p.status || "active", createdByActionId: action.actionId, updatedByActionId: action.actionId });
        created.push([models.Course, record._id]); return { entity: "course", record: publicRecord(record) };
      }
      case "master.course.update": {
        const record = await requireRecord(models.Course, { instituteId: ctx.instituteId, courseId: p.courseId }, "COURSE_NOT_FOUND", "Course not found.");
        for (const key of ["courseName", "courseCode", "description", "durationMonths", "feeAmount", "status"]) if (p[key] !== undefined) record[key] = p[key];
        record.updatedByActionId = action.actionId; await record.save(); return { entity: "course", record: publicRecord(record) };
      }
      case "master.class.create": {
        await requireRecord(models.Branch, { instituteId: ctx.instituteId, branchId: p.branchId }, "BRANCH_NOT_FOUND", "Branch not found.");
        await requireRecord(models.Course, { instituteId: ctx.instituteId, courseId: p.courseId }, "COURSE_NOT_FOUND", "Course not found.");
        if (p.teacherId) await requireIdentity(Identity, ctx.instituteId, p.teacherId, "teacher");
        const record = await models.ClassBatch.create({ instituteId: ctx.instituteId, classId: createId("class"), branchId: p.branchId, courseId: p.courseId, batchCode: p.batchCode, title: p.title, teacherId: p.teacherId || "", schedule: p.schedule || "", startDate: p.startDate || null, endDate: p.endDate || null, capacity: p.capacity, status: p.status || "active", createdByActionId: action.actionId, updatedByActionId: action.actionId });
        created.push([models.ClassBatch, record._id]); return { entity: "class", record: publicRecord(record) };
      }
      case "master.class.update": {
        const record = await requireRecord(models.ClassBatch, { instituteId: ctx.instituteId, classId: p.classId }, "CLASS_NOT_FOUND", "Class not found.");
        if (p.branchId) await requireRecord(models.Branch, { instituteId: ctx.instituteId, branchId: p.branchId }, "BRANCH_NOT_FOUND", "Branch not found.");
        if (p.courseId) await requireRecord(models.Course, { instituteId: ctx.instituteId, courseId: p.courseId }, "COURSE_NOT_FOUND", "Course not found.");
        if (p.teacherId) await requireIdentity(Identity, ctx.instituteId, p.teacherId, "teacher");
        for (const key of ["branchId", "courseId", "batchCode", "title", "teacherId", "schedule", "startDate", "endDate", "capacity", "status"]) if (p[key] !== undefined) record[key] = p[key];
        record.updatedByActionId = action.actionId; await record.save(); return { entity: "class", record: publicRecord(record) };
      }
      case "master.teacher.create": {
        const branchIds = await validateBranches(models, ctx.instituteId, p.branchIds);
        const identity = await createIdentity(Identity, ctx, action, "teacher", p, password); created.push([Identity, identity._id]);
        const record = await models.Teacher.create({ instituteId: ctx.instituteId, teacherId: String(identity._id), identityId: String(identity._id), branchIds, subjects: p.subjects || [], employeeCode: p.employeeCode || "", phone: p.phone || "", status: p.status || "active", createdByActionId: action.actionId, updatedByActionId: action.actionId }); created.push([models.Teacher, record._id]);
        return { entity: "teacher", account: publicIdentity(identity), record: publicRecord(record) };
      }
      case "master.teacher.update": {
        const identity = await requireIdentity(Identity, ctx.instituteId, p.teacherId, "teacher");
        const record = await requireRecord(models.Teacher, { instituteId: ctx.instituteId, identityId: String(identity._id) }, "TEACHER_PROFILE_NOT_FOUND", "Teacher profile not found.");
        if (p.branchIds) record.branchIds = await validateBranches(models, ctx.instituteId, p.branchIds);
        for (const key of ["subjects", "employeeCode", "phone", "status"]) if (p[key] !== undefined) record[key] = p[key];
        if (p.displayName) identity.displayName = p.displayName; if (p.status) identity.status = p.status === "disabled" ? "disabled" : "active";
        record.updatedByActionId = action.actionId; await identity.save(); await record.save(); return { entity: "teacher", account: publicIdentity(identity), record: publicRecord(record) };
      }
      case "master.student.create": {
        await requireRecord(models.Branch, { instituteId: ctx.instituteId, branchId: p.branchId }, "BRANCH_NOT_FOUND", "Branch not found.");
        if (p.courseId) await requireRecord(models.Course, { instituteId: ctx.instituteId, courseId: p.courseId }, "COURSE_NOT_FOUND", "Course not found.");
        if (p.classId) await requireRecord(models.ClassBatch, { instituteId: ctx.instituteId, classId: p.classId, branchId: p.branchId }, "CLASS_NOT_FOUND", "Class not found in selected branch.");
        const identity = await createIdentity(Identity, ctx, action, "student", p, password); created.push([Identity, identity._id]);
        const record = await models.Student.create({ instituteId: ctx.instituteId, studentId: String(identity._id), identityId: String(identity._id), branchId: p.branchId, classId: p.classId || "", courseId: p.courseId || "", rollNumber: p.rollNumber || "", admissionNumber: p.admissionNumber || "", phone: p.phone || "", status: p.status || "active", createdByActionId: action.actionId, updatedByActionId: action.actionId }); created.push([models.Student, record._id]);
        return { entity: "student", account: publicIdentity(identity), record: publicRecord(record) };
      }
      case "master.student.update": {
        const identity = await requireIdentity(Identity, ctx.instituteId, p.studentId, "student");
        const record = await requireRecord(models.Student, { instituteId: ctx.instituteId, identityId: String(identity._id) }, "STUDENT_PROFILE_NOT_FOUND", "Student profile not found.");
        if (p.branchId) await requireRecord(models.Branch, { instituteId: ctx.instituteId, branchId: p.branchId }, "BRANCH_NOT_FOUND", "Branch not found.");
        if (p.courseId) await requireRecord(models.Course, { instituteId: ctx.instituteId, courseId: p.courseId }, "COURSE_NOT_FOUND", "Course not found.");
        if (p.classId) await requireRecord(models.ClassBatch, { instituteId: ctx.instituteId, classId: p.classId }, "CLASS_NOT_FOUND", "Class not found.");
        for (const key of ["branchId", "classId", "courseId", "rollNumber", "admissionNumber", "phone", "status"]) if (p[key] !== undefined) record[key] = p[key];
        if (p.displayName) identity.displayName = p.displayName; if (p.status) identity.status = p.status === "disabled" ? "disabled" : "active";
        record.updatedByActionId = action.actionId; await identity.save(); await record.save(); return { entity: "student", account: publicIdentity(identity), record: publicRecord(record) };
      }
      case "master.parent.create_link": {
        await requireIdentity(Identity, ctx.instituteId, p.studentId, "student");
        const identity = await createIdentity(Identity, ctx, action, "parent", p, password); created.push([Identity, identity._id]);
        const record = await models.ParentLink.create({ instituteId: ctx.instituteId, linkId: createId("parentlink"), parentIdentityId: String(identity._id), studentId: p.studentId, relationship: p.relationship || "guardian", status: p.status || "active", createdByActionId: action.actionId, updatedByActionId: action.actionId }); created.push([models.ParentLink, record._id]);
        const scope = await Scope.findOneAndUpdate({ instituteId: ctx.instituteId, identityId: String(identity._id) }, { $set: { role: "parent", branchIds: [], childStudentIds: [p.studentId], instituteWide: false, status: "active", updatedByUserId: ctx.userId }, $setOnInsert: { createdByUserId: ctx.userId } }, { upsert: true, new: true, runValidators: true }); created.push([Scope, scope._id]);
        return { entity: "parent_link", account: publicIdentity(identity), record: publicRecord(record) };
      }
      case "master.parent.link": {
        const parent = await requireIdentity(Identity, ctx.instituteId, p.parentIdentityId, "parent");
        await requireIdentity(Identity, ctx.instituteId, p.studentId, "student");
        const record = await models.ParentLink.findOneAndUpdate({ instituteId: ctx.instituteId, parentIdentityId: String(parent._id), studentId: p.studentId }, { $set: { relationship: p.relationship || "guardian", status: p.status || "active", updatedByActionId: action.actionId }, $setOnInsert: { linkId: createId("parentlink"), createdByActionId: action.actionId } }, { upsert: true, new: true, runValidators: true });
        const scope = await Scope.findOne({ instituteId: ctx.instituteId, identityId: String(parent._id) });
        const childStudentIds = [...new Set([...(scope?.childStudentIds || []), p.studentId])];
        await Scope.findOneAndUpdate({ instituteId: ctx.instituteId, identityId: String(parent._id) }, { $set: { role: "parent", branchIds: [], childStudentIds, instituteWide: false, status: "active", updatedByUserId: ctx.userId }, $setOnInsert: { createdByUserId: ctx.userId } }, { upsert: true, new: true, runValidators: true });
        return { entity: "parent_link", account: publicIdentity(parent), record: publicRecord(record) };
      }
      case "master.staff.create": {
        const branchIds = p.instituteWide ? [] : await validateBranches(models, ctx.instituteId, p.branchIds);
        const identity = await createIdentity(Identity, ctx, action, p.accountRole, p, password); created.push([Identity, identity._id]);
        const record = await models.Staff.create({ instituteId: ctx.instituteId, staffId: String(identity._id), identityId: String(identity._id), role: p.accountRole, branchIds, instituteWide: Boolean(p.instituteWide), employeeCode: p.employeeCode || "", phone: p.phone || "", status: p.status || "active", createdByActionId: action.actionId, updatedByActionId: action.actionId }); created.push([models.Staff, record._id]);
        const scope = await Scope.create({ instituteId: ctx.instituteId, identityId: String(identity._id), role: p.accountRole, branchIds, childStudentIds: [], instituteWide: Boolean(p.instituteWide), status: "active", createdByUserId: ctx.userId, updatedByUserId: ctx.userId }); created.push([Scope, scope._id]);
        return { entity: "staff", account: publicIdentity(identity), record: publicRecord(record) };
      }
      case "master.staff.update_scope": {
        const identity = await requireIdentity(Identity, ctx.instituteId, p.staffIdentityId, p.accountRole);
        const record = await requireRecord(models.Staff, { instituteId: ctx.instituteId, identityId: String(identity._id) }, "STAFF_PROFILE_NOT_FOUND", "Staff profile not found.");
        const instituteWide = p.instituteWide !== undefined ? Boolean(p.instituteWide) : Boolean(record.instituteWide);
        const branchIds = instituteWide ? [] : p.branchIds ? await validateBranches(models, ctx.instituteId, p.branchIds) : record.branchIds;
        if (!instituteWide && !branchIds.length) throw Object.assign(new Error("Staff scope needs branchIds or instituteWide=true."), { code: "STAFF_SCOPE_REQUIRED", httpStatus: 400 });
        record.role = p.accountRole; record.branchIds = branchIds; record.instituteWide = instituteWide;
        for (const key of ["employeeCode", "phone", "status"]) if (p[key] !== undefined) record[key] = p[key];
        if (p.displayName) identity.displayName = p.displayName; if (p.status) identity.status = p.status === "disabled" ? "disabled" : "active";
        record.updatedByActionId = action.actionId; await identity.save(); await record.save();
        await Scope.findOneAndUpdate({ instituteId: ctx.instituteId, identityId: String(identity._id) }, { $set: { role: p.accountRole, branchIds, childStudentIds: [], instituteWide, status: record.status === "disabled" ? "disabled" : "active", updatedByUserId: ctx.userId }, $setOnInsert: { createdByUserId: ctx.userId } }, { upsert: true, new: true, runValidators: true });
        return { entity: "staff", account: publicIdentity(identity), record: publicRecord(record) };
      }
      default: throw Object.assign(new Error("Executor missing."), { code: "MASTER_EXECUTOR_MISSING", httpStatus: 500 });
    }
  } catch (error) {
    let rolledBack = false;
    for (const [Model, id] of created.reverse()) { try { await Model.deleteOne({ _id: id }); rolledBack = true; } catch {} }
    error.rollbackApplied = rolledBack;
    throw error;
  }
}

async function confirmAndExecute(models, ctx, actionId, exact, password) {
  const action = await models.Action.findOne({ actionId, instituteId: ctx.instituteId, actorUserId: ctx.userId });
  if (!action) throw Object.assign(new Error("Part 128 action not found."), { code: "MASTER_ACTION_NOT_FOUND", httpStatus: 404 });
  if (action.status === "executed_native") return { action, idempotentReplay: true };
  if (action.status !== "preview_ready") throw Object.assign(new Error(`Action cannot execute from ${action.status}.`), { code: "MASTER_ACTION_STATE_CONFLICT", httpStatus: 409 });
  if (new Date(action.previewExpiresAt).getTime() <= Date.now()) { action.status = "expired"; await action.save(); throw Object.assign(new Error("Preview expired."), { code: "MASTER_PREVIEW_EXPIRED", httpStatus: 410 }); }
  if (sha256(String(exact || "").trim()) !== action.confirmationDigest) throw Object.assign(new Error(`Exact confirmation required: ${confirmationText(action)}`), { code: "EXACT_CONFIRMATION_REQUIRED", httpStatus: 400 });
  if (ACCOUNT_CREATE_ACTIONS.has(action.actionType) && passwordPolicy(password).length) throw Object.assign(new Error("Valid temporary password required."), { code: "WEAK_TEMPORARY_PASSWORD", httpStatus: 400 });
  action.status = "executing"; await action.save();
  try {
    const result = await execute(models, ctx, action, password);
    action.status = "executed_native"; action.executedAt = new Date(); action.result = result; await action.save(); await audit(models, ctx, action, "action_executed", "native_success", { entity: result.entity });
    return { action, idempotentReplay: false };
  } catch (error) {
    action.status = "failed"; action.failureCode = cleanText(error.code || "MASTER_EXECUTION_FAILED", 120); action.failureMessage = cleanText(error.message, 500); action.rollbackApplied = Boolean(error.rollbackApplied); await action.save(); await audit(models, ctx, action, "action_executed", "failed", { failureCode: action.failureCode, rollbackApplied: action.rollbackApplied }); error.action = action; throw error;
  }
}
function extract(command) {
  const result = {}; const regex = /([a-zA-Z][a-zA-Z0-9_]*)\s*=\s*("[^"]*"|'[^']*'|[^\s]+)/g; let match;
  while ((match = regex.exec(command))) { let value = match[2]; if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1); result[match[1]] = value; }
  return result;
}
function parseCommand(command = "") {
  const text = cleanLong(command, 3000);
  if (BLOCKED.test(text)) throw Object.assign(new Error("Sensitive or destructive command blocked."), { code: "BLOCKED_MASTER_COMMAND", httpStatus: 400 });
  const actionType = PATTERNS.find(([, pattern]) => pattern.test(text))?.[0] || "";
  if (!actionType) throw Object.assign(new Error("Master-data command samajh nahi aaya."), { code: "MASTER_COMMAND_NOT_RECOGNISED", httpStatus: 400 });
  const payload = extract(text);
  if (payload.branchIds) payload.branchIds = cleanList(payload.branchIds);
  if (payload.subjects) payload.subjects = cleanTextList(payload.subjects);
  if (payload.instituteWide !== undefined) payload.instituteWide = cleanBool(payload.instituteWide);
  if (actionType === "master.staff.create" && !payload.accountRole) payload.accountRole = /branch manager/i.test(text) ? "branch_manager" : /accountant/i.test(text) ? "accountant" : /counsell?or/i.test(text) ? "counsellor" : "staff";
  return { actionType, payload };
}
async function counts(models, instituteId) {
  const entries = await Promise.all([["branches", models.Branch], ["courses", models.Course], ["classes", models.ClassBatch], ["teachers", models.Teacher], ["students", models.Student], ["parentLinks", models.ParentLink], ["staff", models.Staff]].map(async ([key, Model]) => [key, await Model.countDocuments({ instituteId })]));
  return Object.fromEntries(entries);
}
async function records(models, instituteId) {
  const entries = await Promise.all([["branches", models.Branch], ["courses", models.Course], ["classes", models.ClassBatch], ["teachers", models.Teacher], ["students", models.Student], ["parentLinks", models.ParentLink], ["staff", models.Staff]].map(async ([key, Model]) => [key, await Model.find({ instituteId }).sort({ createdAt: -1 }).limit(50).lean()]));
  return Object.fromEntries(entries);
}

export function registerPart128VaniMasterDataActions({ app } = {}) {
  if (!app || typeof app.get !== "function" || typeof app.post !== "function") throw new Error("Part 128 registration requires Express app.");
  if (app.locals.part128VaniMasterDataRegistered) return;
  app.locals.part128VaniMasterDataRegistered = true;
  const models = defineModels();

  app.get(["/master-data-vani", "/vani-master-data", "/part128"], (req, res) => res.sendFile(path.join(frontendDir, "naxora-master-data-vani.html")));
  app.get("/naxora-master-data-vani.css", (req, res) => res.type("text/css").sendFile(path.join(frontendDir, "naxora-master-data-vani.css")));
  app.get("/naxora-master-data-vani.js", (req, res) => res.type("application/javascript").sendFile(path.join(frontendDir, "naxora-master-data-vani.js")));
  app.get("/naxora-part128-global-vani-bridge.js", (req, res) => res.type("application/javascript").sendFile(path.join(frontendDir, "naxora-part128-global-vani-bridge.js")));

  app.get("/api/part128/status", (req, res) => res.json({ success: true, part: PART_NUMBER, name: PART_NAME, status: "vani_master_data_actions_active", page: "/master-data-vani", actionCount: Object.keys(ACTIONS).length, part120AccountIntegration: true, part124ScopeIntegration: true, ownerOnlyConfirmedWrites: true, previewRequired: true, exactConfirmationRequired: true, ownerActionSecretRequired: true, temporaryPasswordPrivate: true, duplicateProtectionMinutes: 10, partialFailureRollback: true, deleteActionsEnabled: false, moneyActionsEnabled: false, allFeatureVaniComplete: false, targetFinalAcceptancePart: 136, nextPart: 129 }));
  app.get("/api/part128/security-policy", (req, res) => res.json({ success: true, part: PART_NUMBER, ownerOnly: true, instituteIsolation: true, exactConfirmationRequired: true, temporaryPasswordNeverStoredInAction: true, temporaryPasswordNeverReturned: true, firstLoginPasswordChangeRequired: true, parentAndStaffScopesServerSide: true, duplicateProtection: true, partialFailureRollback: true, destructiveCommandsBlocked: true }));
  app.get("/api/part128/catalog", (req, res) => res.json({ success: true, part: PART_NUMBER, actions: Object.entries(ACTIONS).map(([actionType, def]) => ({ actionType, label: def.label, requiredFields: def.required, passwordRequired: ACCOUNT_CREATE_ACTIONS.has(actionType) })) }));

  app.post("/api/part128/actions/preview", ownerOnly, async (req, res) => {
    try { const result = await createPreview(models, req.part128Owner, cleanText(req.body?.actionType, 100), req.body?.payload || {}); res.json({ success: true, part: PART_NUMBER, action: publicAction(result.action), reusedPreview: result.reusedPreview }); }
    catch (error) { res.status(error.httpStatus || 500).json({ success: false, part: PART_NUMBER, code: error.code || "MASTER_PREVIEW_FAILED", message: error.message, missingFields: error.missingFields || [], existingAction: error.existingAction || null }); }
  });
  app.post("/api/part128/vani/command", ownerOnly, async (req, res) => {
    try { const parsed = parseCommand(req.body?.command || ""); const result = await createPreview(models, req.part128Owner, parsed.actionType, parsed.payload); res.json({ success: true, part: PART_NUMBER, interpretedActionType: parsed.actionType, interpretedPayload: result.action.payload, action: publicAction(result.action), reusedPreview: result.reusedPreview, replyText: `${result.action.actionLabel} preview ready. Master Data VANI screen par exact-confirm karein.`, openModuleKey: "master-data-vani" }); }
    catch (error) { res.status(error.httpStatus || 500).json({ success: false, part: PART_NUMBER, code: error.code || "MASTER_COMMAND_FAILED", message: error.message, missingFields: error.missingFields || [], openModuleKey: "master-data-vani" }); }
  });
  app.post("/api/part128/actions/:actionId/confirm", ownerOnly, async (req, res) => {
    try { verifyOwnerSecret(req); const result = await confirmAndExecute(models, req.part128Owner, cleanId(req.params.actionId), req.body?.confirmationText, String(req.body?.temporaryPassword || "")); res.json({ success: true, part: PART_NUMBER, action: publicAction(result.action), idempotentReplay: result.idempotentReplay, passwordReturned: false }); }
    catch (error) { res.status(error.httpStatus || 500).json({ success: false, part: PART_NUMBER, code: error.code || "MASTER_EXECUTION_FAILED", message: error.message, action: error.action ? publicAction(error.action) : null, rollbackApplied: Boolean(error.rollbackApplied || error.action?.rollbackApplied) }); }
  });
  app.post("/api/part128/actions/:actionId/cancel", ownerOnly, async (req, res) => {
    const action = await models.Action.findOne({ actionId: cleanId(req.params.actionId), instituteId: req.part128Owner.instituteId, actorUserId: req.part128Owner.userId });
    if (!action) return res.status(404).json({ success: false, part: PART_NUMBER, code: "MASTER_ACTION_NOT_FOUND", message: "Action not found." });
    if (action.status === "preview_ready") { action.status = "cancelled"; await action.save(); await audit(models, req.part128Owner, action, "action_cancelled", "success"); }
    res.json({ success: true, part: PART_NUMBER, action: publicAction(action) });
  });
  app.get("/api/part128/actions", ownerOnly, async (req, res) => res.json({ success: true, part: PART_NUMBER, actions: (await models.Action.find({ instituteId: req.part128Owner.instituteId }).sort({ createdAt: -1 }).limit(100)).map(publicAction) }));
  app.get("/api/part128/records", ownerOnly, async (req, res) => res.json({ success: true, part: PART_NUMBER, counts: await counts(models, req.part128Owner.instituteId), records: await records(models, req.part128Owner.instituteId) }));
  app.get("/api/part128/demo", (req, res) => res.json({ success: true, part: PART_NUMBER, flow: ["Owner command", "Preview", "Exact confirmation", "Private password when needed", "Owner Secret", "Part 120 account", "Part 124 scope", "Part 128 native record", "Audit"], notSupported: ["Bulk import — Part 129", "Delete actions", "Direct money actions", "All-feature completion — Part 136"] }));
}
