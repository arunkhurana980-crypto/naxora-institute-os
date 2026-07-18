import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const PART = 133;
const NAME = "VANI Communication and Notifications";
const PREVIEW_TTL_MS = 30 * 60 * 1000;
const DUPLICATE_MS = 10 * 60 * 1000;
const MAX_RECIPIENTS = 500;
const CHANNELS = ["in_app", "email", "sms", "whatsapp"];
const TARGET_TYPES = ["identity", "role", "branch_role", "class_role", "student_parent", "crm_lead"];
const ALL_ROLES = ["institute_owner", "branch_manager", "teacher", "student", "parent", "accountant", "counsellor", "staff"];
const SENDER_ROLES = new Set(["institute_owner", "branch_manager", "teacher", "accountant", "counsellor", "staff"]);
const OWNER_ROLES = new Set(["institute_owner", "owner", "instituteowner"]);
const BRANCH_ROLES = new Set(["branch_manager", "accountant", "counsellor", "staff"]);
const SECRET_PATTERN = /(password|passcode|otp|cvv|upi\s*pin|api\s*key|secret|jwt|bank\s*account|card\s*number|aadhaar|aadhar|pan\s*(card|number)?|passport\s*number)/i;
const DELETE_PATTERN = /(delete permanently|purge|erase all|drop database|bulk delete)/i;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, "../../frontend");

const ACTIONS = Object.freeze({
  "communication.template.create": { label: "Create Template", roles: ["institute_owner", "branch_manager"], required: ["name", "subject", "body", "channels"] },
  "communication.template.update": { label: "Update Template", roles: ["institute_owner", "branch_manager"], required: ["templateId"] },
  "communication.notice.create": { label: "Create Draft Notice", roles: ["institute_owner", "branch_manager", "teacher", "staff"], required: ["title", "body", "targetType", "channels"] },
  "communication.notice.update": { label: "Update Draft Notice", roles: ["institute_owner", "branch_manager", "teacher", "staff"], required: ["noticeId"] },
  "communication.notice.publish": { label: "Publish Notice", roles: ["institute_owner", "branch_manager", "teacher", "staff"], required: ["noticeId"] },
  "communication.message.send": { label: "Send Role-Safe Message", roles: ["institute_owner", "branch_manager", "teacher", "accountant", "counsellor", "staff"], required: ["subject", "body", "targetType", "channels"] },
  "communication.notification.schedule": { label: "Schedule Notification", roles: ["institute_owner", "branch_manager", "teacher", "accountant", "counsellor", "staff"], required: ["subject", "body", "targetType", "channels", "scheduledAt"] },
  "communication.notification.reschedule": { label: "Reschedule Notification", roles: ["institute_owner", "branch_manager", "teacher", "accountant", "counsellor", "staff"], required: ["scheduleId", "scheduledAt"] },
  "communication.notification.cancel": { label: "Cancel Notification", roles: ["institute_owner", "branch_manager", "teacher", "accountant", "counsellor", "staff"], required: ["scheduleId"] },
  "communication.delivery.retry": { label: "Retry Failed Delivery", roles: ["institute_owner", "branch_manager"], required: ["deliveryId"] },
  "communication.preference.update": { label: "Update My Communication Preference", roles: ALL_ROLES, required: [] },
  "communication.delivery.summary": { label: "Generate Delivery Summary", roles: ["institute_owner", "branch_manager", "teacher", "accountant", "counsellor"], required: [] },
});

const PATTERNS = [
  ["communication.template.update", /(communication|message|notice).*template.*(update|edit|badlo)/i],
  ["communication.template.create", /(communication|message|notice).*template.*(create|banao|add)/i],
  ["communication.notice.publish", /(notice|announcement).*(publish|post|live)/i],
  ["communication.notice.update", /(notice|announcement).*(update|edit|badlo)/i],
  ["communication.notice.create", /(notice|announcement).*(create|draft|banao|add)/i],
  ["communication.notification.reschedule", /(notification|message|notice).*(reschedule|schedule update|time badlo)/i],
  ["communication.notification.cancel", /(notification|message|notice).*(cancel)/i],
  ["communication.notification.schedule", /(notification|message|notice).*(schedule|later|baad me)/i],
  ["communication.delivery.retry", /(delivery|message).*(retry|resend|dobara)/i],
  ["communication.preference.update", /(communication|notification).*(preference|consent|opt.?out).*(update|set|badlo)/i],
  ["communication.delivery.summary", /(communication|delivery|notification).*(summary|report).*(generate|banao|dikhao)/i],
  ["communication.message.send", /(message|notification).*(send|bhejo|deliver)/i],
];

const text = (v = "", n = 255) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const long = (v = "", n = 8000) => String(v ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ").trim().slice(0, n);
const id = (v = "") => String(v ?? "").trim().replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 180);
const ids = (v, n = MAX_RECIPIENTS) => [...new Set((Array.isArray(v) ? v : String(v ?? "").split(/[\n,|]/)).map(id).filter(Boolean))].slice(0, n);
const bool = (v, fallback = false) => typeof v === "boolean" ? v : ["true", "yes", "1", "haan", "on"].includes(String(v ?? "").toLowerCase()) ? true : ["false", "no", "0", "nahi", "off"].includes(String(v ?? "").toLowerCase()) ? false : fallback;
const date = (v = "") => { const s = String(v ?? "").trim(); if (!s) return ""; const d = new Date(s.length === 10 ? `${s}T00:00:00.000Z` : s); return Number.isNaN(d.getTime()) ? "" : d.toISOString(); };
const role = (v = "") => ({ owner: "institute_owner", instituteowner: "institute_owner", branchmanager: "branch_manager", counselor: "counsellor", guardian: "parent", learner: "student", faculty: "teacher" }[String(v ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_")] || String(v ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_"));
const channels = v => [...new Set((Array.isArray(v) ? v : String(v ?? "").split(/[\n,|]/)).map(x => text(x, 30).toLowerCase().replace(/[\s-]+/g, "_")).filter(x => CHANNELS.includes(x)))];
const sha = v => crypto.createHash("sha256").update(String(v ?? "")).digest("hex");
const makeId = p => `${p}_${Date.now().toString(36)}_${crypto.randomBytes(5).toString("hex")}`;
const dbReady = () => mongoose.connection?.readyState === 1;

function jwtSecrets() {
  return [process.env.JWT_SECRET, process.env.JWT_ACCESS_SECRET, process.env.ACCESS_TOKEN_SECRET, process.env.NAXORA_JWT_SECRET].map(v => String(v || "").trim()).filter(Boolean);
}
function verifyJwt(token) {
  const secrets = jwtSecrets();
  if (!secrets.length) throw Object.assign(new Error("JWT server configuration missing."), { code: "JWT_CONFIGURATION_MISSING", httpStatus: 503 });
  for (const secret of secrets) { try { return jwt.verify(token, secret, { algorithms: ["HS256", "HS384", "HS512"] }); } catch {} }
  throw Object.assign(new Error("Login session invalid or expired."), { code: "INVALID_SESSION", httpStatus: 401 });
}
function context(req) {
  const auth = String(req.headers.authorization || "");
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const p = req.part120Context || req.user || req.auth || (token ? verifyJwt(token) : null);
  if (!p) throw Object.assign(new Error("Common login required."), { code: "LOGIN_REQUIRED", httpStatus: 401 });
  const r0 = role(p.role || p.userRole || p.accountRole || p.user?.role || "");
  const r = OWNER_ROLES.has(r0) ? "institute_owner" : r0;
  if (!ALL_ROLES.includes(r)) throw Object.assign(new Error("Unsupported role."), { code: "ROLE_DENIED", httpStatus: 403 });
  const tokenInstitute = id(p.instituteId || p.institute_id || p.user?.instituteId || p.tenantId || "");
  const requested = id(req.headers["x-naxora-institute-id"] || req.body?.instituteId || req.query?.instituteId || "");
  if (tokenInstitute && requested && tokenInstitute !== requested) throw Object.assign(new Error("Institute context mismatch."), { code: "INSTITUTE_CONTEXT_MISMATCH", httpStatus: 403 });
  const instituteId = tokenInstitute || requested;
  if (!instituteId) throw Object.assign(new Error("Valid instituteId required."), { code: "INSTITUTE_ID_REQUIRED", httpStatus: 400 });
  const userId = id(p.userId || p.identityId || p.id || p._id || p.sub || "user");
  return { instituteId, userId, identityId: id(p.identityId || p.sub || userId), role: r, displayName: text(p.displayName || p.name || p.email || r, 120) };
}
function auth(req, res, next) {
  try { req.part133 = context(req); next(); }
  catch (e) { res.status(e.httpStatus || 401).json({ success: false, part: PART, code: e.code || "AUTH_FAILED", message: e.message }); }
}

function defineModels() {
  const action = new mongoose.Schema({ actionId: { type: String, unique: true, index: true }, instituteId: { type: String, index: true }, actorUserId: String, actorIdentityId: String, actorRole: String, actorDisplayName: String, actionType: { type: String, index: true }, actionLabel: String, status: { type: String, default: "preview_ready", index: true }, payload: mongoose.Schema.Types.Mixed, fingerprint: { type: String, index: true }, confirmationDigest: String, previewExpiresAt: Date, executedAt: Date, result: mongoose.Schema.Types.Mixed, failureCode: String, failureMessage: String, rollbackApplied: Boolean }, { timestamps: true });
  const record = new mongoose.Schema({ recordId: { type: String, unique: true, index: true }, instituteId: { type: String, index: true }, kind: { type: String, index: true }, ownerUserId: { type: String, index: true }, branchId: { type: String, index: true, default: "" }, status: { type: String, index: true, default: "active" }, data: mongoose.Schema.Types.Mixed, actionId: String }, { timestamps: true });
  const delivery = new mongoose.Schema({ deliveryId: { type: String, unique: true, index: true }, instituteId: { type: String, index: true }, messageId: { type: String, index: true }, sourceType: String, sourceId: String, recipientIdentityId: { type: String, index: true, default: "" }, recipientLeadId: { type: String, index: true, default: "" }, recipientRole: String, branchId: { type: String, index: true, default: "" }, studentId: String, channel: { type: String, index: true }, addressMasked: String, addressEncrypted: String, subject: String, body: String, consentSource: String, status: { type: String, index: true }, attempts: Number, providerName: String, providerStatusCode: Number, providerMessage: String, deliveredAt: Date, lastAttemptAt: Date, readAt: Date, archivedAt: Date, actionId: String }, { timestamps: true });
  const preference = new mongoose.Schema({ instituteId: { type: String, index: true }, identityId: { type: String, index: true }, externalConsent: Boolean, blockedChannels: [String], updatedByUserId: String, actionId: String }, { timestamps: true });
  preference.index({ instituteId: 1, identityId: 1 }, { unique: true });
  return {
    Action: mongoose.models.Part133CommunicationAction || mongoose.model("Part133CommunicationAction", action),
    Record: mongoose.models.Part133CommunicationRecord || mongoose.model("Part133CommunicationRecord", record),
    Delivery: mongoose.models.Part133Delivery || mongoose.model("Part133Delivery", delivery),
    Preference: mongoose.models.Part133CommunicationPreference || mongoose.model("Part133CommunicationPreference", preference),
  };
}

const publicRecord = row => { const o = row?.toObject ? row.toObject() : { ...(row || {}) }; delete o.__v; delete o.addressEncrypted; return o; };
const confirmation = a => `CONFIRM ${String(a.actionType || "").toUpperCase().replace(/\./g, " ")} ${String(a.actionId || "").slice(-8).toUpperCase()}`;
const publicAction = a => ({ actionId: a.actionId, actionType: a.actionType, actionLabel: a.actionLabel, actorRole: a.actorRole, status: a.status, payload: a.payload, confirmationTextRequired: a.status === "preview_ready" ? confirmation(a) : null, previewExpiresAt: a.previewExpiresAt, executedAt: a.executedAt, result: a.result || {}, failureCode: a.failureCode || "", failureMessage: a.failureMessage || "", rollbackApplied: Boolean(a.rollbackApplied), createdAt: a.createdAt });

function normalizePayload(raw = {}) {
  const p = {};
  for (const f of ["templateId", "noticeId", "scheduleId", "deliveryId", "branchId", "classId"]) if (raw[f] !== undefined) p[f] = id(raw[f]);
  for (const f of ["identityIds", "studentIds", "leadIds"]) if (raw[f] !== undefined) p[f] = ids(raw[f]);
  for (const [f, n] of Object.entries({ name: 180, category: 80, subject: 240, title: 240, body: 8000, targetType: 50, targetRole: 50, priority: 30, status: 30, reason: 1000 })) if (raw[f] !== undefined) p[f] = long(raw[f], n);
  if (raw.channels !== undefined) p.channels = channels(raw.channels);
  if (raw.blockedChannels !== undefined) p.blockedChannels = channels(raw.blockedChannels);
  if (raw.externalConsent !== undefined) p.externalConsent = bool(raw.externalConsent);
  for (const f of ["scheduledAt", "expiresAt", "fromDate", "toDate"]) if (raw[f] !== undefined) p[f] = date(raw[f]);
  if (p.targetRole !== undefined) p.targetRole = role(p.targetRole);
  if (p.targetType !== undefined) p.targetType = TARGET_TYPES.includes(p.targetType) ? p.targetType : "";
  return p;
}
const targetOf = p => ({ targetType: p.targetType || "", targetRole: p.targetRole || "", branchId: p.branchId || "", classId: p.classId || "", identityIds: p.identityIds || [], studentIds: p.studentIds || [], leadIds: p.leadIds || [] });

async function scopeFor(c) {
  if (c.role === "institute_owner") return { available: true, instituteWide: true, branchIds: [] };
  const Scope = mongoose.models.Part124RoleScopeAssignment;
  if (!Scope) return { available: false, instituteWide: false, branchIds: [] };
  const s = await Scope.findOne({ instituteId: c.instituteId, identityId: c.identityId, role: c.role, status: "active" }).lean();
  return { available: Boolean(s), instituteWide: Boolean(s?.instituteWide), branchIds: (s?.branchIds || []).map(id) };
}
function nativeModels() {
  const m = { Identity: mongoose.models.Part120UnifiedIdentity, Branch: mongoose.models.Part128Branch, ClassBatch: mongoose.models.Part128ClassBatch, Teacher: mongoose.models.Part128TeacherProfile, Student: mongoose.models.Part128StudentProfile, ParentLink: mongoose.models.Part128ParentStudentLink, Staff: mongoose.models.Part128StaffProfile, Lead: mongoose.models.Part132CrmLead };
  if (!m.Identity || !m.Branch || !m.ClassBatch || !m.Teacher || !m.Student || !m.ParentLink || !m.Staff) throw Object.assign(new Error("Parts 120, 124 and 128 models are required."), { code: "NATIVE_MODELS_MISSING", httpStatus: 503 });
  return m;
}
async function requireBranch(c, branchId) {
  const row = await nativeModels().Branch.findOne({ instituteId: c.instituteId, branchId, status: { $ne: "disabled" } });
  if (!row) throw Object.assign(new Error("Branch not found."), { code: "BRANCH_NOT_FOUND", httpStatus: 404 });
  return row;
}
async function requireClass(c, classId) {
  const row = await nativeModels().ClassBatch.findOne({ instituteId: c.instituteId, classId, status: { $ne: "disabled" } });
  if (!row) throw Object.assign(new Error("Class not found."), { code: "CLASS_NOT_FOUND", httpStatus: 404 });
  return row;
}
function enforceBranch(c, scope, branchId) {
  if (c.role === "institute_owner" || scope.instituteWide) return;
  if (!scope.available || !branchId || !scope.branchIds.includes(branchId)) throw Object.assign(new Error("Target is outside assigned Branch scope."), { code: "BRANCH_SCOPE_MISMATCH", httpStatus: 403 });
}
async function validateTarget(c, t) {
  const scope = await scopeFor(c);
  if (!TARGET_TYPES.includes(t.targetType)) throw Object.assign(new Error("Valid targetType required."), { code: "TARGET_TYPE_REQUIRED", httpStatus: 400 });
  if (["student", "parent"].includes(c.role)) throw Object.assign(new Error("Student and Parent cannot broadcast."), { code: "BROADCAST_ROLE_DENIED", httpStatus: 403 });
  if (c.role === "counsellor" && t.targetType !== "crm_lead") throw Object.assign(new Error("Counsellor can target assigned CRM Leads only."), { code: "COUNSELLOR_TARGET_LIMIT", httpStatus: 403 });
  if (c.role === "teacher" && !["class_role", "student_parent"].includes(t.targetType)) throw Object.assign(new Error("Teacher target must be assigned Class/Students."), { code: "TEACHER_TARGET_LIMIT", httpStatus: 403 });
  if (c.role === "accountant" && !["branch_role", "student_parent"].includes(t.targetType)) throw Object.assign(new Error("Accountant target must be scoped Students/Parents."), { code: "ACCOUNTANT_TARGET_LIMIT", httpStatus: 403 });
  if (c.role === "staff" && t.targetType !== "branch_role") throw Object.assign(new Error("Staff target must be branch_role."), { code: "STAFF_TARGET_LIMIT", httpStatus: 403 });
  if (["identity", "role"].includes(t.targetType) && c.role !== "institute_owner") throw Object.assign(new Error("Institute-wide/direct target is Owner-only."), { code: "OWNER_TARGET_REQUIRED", httpStatus: 403 });
  if (t.targetType === "identity" && !t.identityIds.length) throw Object.assign(new Error("identityIds required."), { code: "IDENTITY_TARGET_REQUIRED", httpStatus: 400 });
  if (t.targetType === "role" && !t.targetRole) throw Object.assign(new Error("targetRole required."), { code: "ROLE_TARGET_REQUIRED", httpStatus: 400 });
  if (t.targetType === "branch_role") { if (!t.branchId || !t.targetRole) throw Object.assign(new Error("branchId and targetRole required."), { code: "BRANCH_ROLE_FIELDS_REQUIRED", httpStatus: 400 }); await requireBranch(c, t.branchId); enforceBranch(c, scope, t.branchId); }
  if (t.targetType === "class_role") {
    if (!t.classId || !t.targetRole) throw Object.assign(new Error("classId and targetRole required."), { code: "CLASS_ROLE_FIELDS_REQUIRED", httpStatus: 400 });
    const row = await requireClass(c, t.classId); enforceBranch(c, scope, row.branchId);
    if (c.role === "teacher" && ![c.identityId, c.userId].includes(row.teacherId)) throw Object.assign(new Error("Teacher can target only assigned Class."), { code: "TEACHER_CLASS_SCOPE_MISMATCH", httpStatus: 403 });
  }
  if (t.targetType === "student_parent") {
    if (!t.studentIds.length) throw Object.assign(new Error("studentIds required."), { code: "STUDENT_TARGET_REQUIRED", httpStatus: 400 });
    const rows = await nativeModels().Student.find({ instituteId: c.instituteId, studentId: { $in: t.studentIds }, status: { $ne: "disabled" } }).lean();
    if (rows.length !== t.studentIds.length) throw Object.assign(new Error("Invalid Student target."), { code: "STUDENT_TARGET_INVALID", httpStatus: 400 });
    for (const s of rows) {
      enforceBranch(c, scope, s.branchId);
      if (c.role === "teacher") { const cl = await requireClass(c, s.classId); if (![c.identityId, c.userId].includes(cl.teacherId)) throw Object.assign(new Error("Teacher can target only assigned Students."), { code: "TEACHER_STUDENT_SCOPE_MISMATCH", httpStatus: 403 }); }
    }
  }
  if (t.targetType === "crm_lead") {
    if (!t.leadIds.length) throw Object.assign(new Error("leadIds required."), { code: "LEAD_TARGET_REQUIRED", httpStatus: 400 });
    const Lead = nativeModels().Lead;
    if (!Lead) throw Object.assign(new Error("Part 132 CRM model missing."), { code: "PART132_MODEL_MISSING", httpStatus: 503 });
    const rows = await Lead.find({ instituteId: c.instituteId, leadId: { $in: t.leadIds } }).lean();
    if (rows.length !== t.leadIds.length) throw Object.assign(new Error("Invalid CRM Lead target."), { code: "LEAD_TARGET_INVALID", httpStatus: 400 });
    for (const lead of rows) { enforceBranch(c, scope, lead.branchId); if (c.role === "counsellor" && ![c.identityId, c.userId].includes(lead.assignedCounsellorId)) throw Object.assign(new Error("Counsellor can target assigned Leads only."), { code: "COUNSELLOR_LEAD_SCOPE_MISMATCH", httpStatus: 403 }); }
  }
  return scope;
}

async function validate(models, c, actionType, raw) {
  const d = ACTIONS[actionType];
  if (!d) throw Object.assign(new Error("Unknown communication action."), { code: "UNKNOWN_ACTION", httpStatus: 404 });
  if (!d.roles.includes(c.role)) throw Object.assign(new Error(`${c.role} cannot use ${actionType}.`), { code: "ACTION_ROLE_DENIED", httpStatus: 403 });
  const p = normalizePayload(raw);
  const missing = d.required.filter(f => p[f] === undefined || p[f] === null || p[f] === "" || (Array.isArray(p[f]) && !p[f].length));
  if (missing.length) throw Object.assign(new Error(`Required fields missing: ${missing.join(", ")}`), { code: "FIELDS_REQUIRED", httpStatus: 400, missingFields: missing });
  if (p.channels && !p.channels.length) throw Object.assign(new Error("At least one valid channel required."), { code: "CHANNEL_REQUIRED", httpStatus: 400 });
  if ([p.subject, p.title, p.body, p.reason].some(v => v && SECRET_PATTERN.test(v))) throw Object.assign(new Error("Passwords, OTPs, banking or ID-document numbers cannot be sent."), { code: "SENSITIVE_CONTENT_BLOCKED", httpStatus: 400 });
  if (actionType === "communication.notification.schedule" && new Date(p.scheduledAt).getTime() <= Date.now()) throw Object.assign(new Error("scheduledAt must be in future."), { code: "SCHEDULE_NOT_FUTURE", httpStatus: 400 });
  if (["communication.notice.create", "communication.message.send", "communication.notification.schedule"].includes(actionType)) await validateTarget(c, targetOf(p));
  if (actionType === "communication.notice.update" || actionType === "communication.notice.publish") {
    const notice = await models.Record.findOne({ instituteId: c.instituteId, recordId: p.noticeId, kind: "notice" });
    if (!notice) throw Object.assign(new Error("Notice not found."), { code: "NOTICE_NOT_FOUND", httpStatus: 404 });
    if (notice.status !== "draft") throw Object.assign(new Error("Only draft Notice can change/publish."), { code: "NOTICE_STATE_CONFLICT", httpStatus: 409 });
    await validateTarget(c, actionType === "communication.notice.update" ? { ...notice.data.target, ...targetOf(p), targetType: p.targetType || notice.data.target.targetType } : notice.data.target);
  }
  if (actionType === "communication.template.update") {
    const row = await models.Record.findOne({ instituteId: c.instituteId, recordId: p.templateId, kind: "template" });
    if (!row) throw Object.assign(new Error("Template not found."), { code: "TEMPLATE_NOT_FOUND", httpStatus: 404 });
  }
  if (["communication.notification.reschedule", "communication.notification.cancel"].includes(actionType)) {
    const row = await models.Record.findOne({ instituteId: c.instituteId, recordId: p.scheduleId, kind: "schedule", ...(c.role === "institute_owner" ? {} : { ownerUserId: c.userId }) });
    if (!row) throw Object.assign(new Error("Schedule not found."), { code: "SCHEDULE_NOT_FOUND", httpStatus: 404 });
    if (row.status !== "scheduled") throw Object.assign(new Error("Schedule cannot change now."), { code: "SCHEDULE_STATE_CONFLICT", httpStatus: 409 });
    if (actionType.endsWith("reschedule") && new Date(p.scheduledAt).getTime() <= Date.now()) throw Object.assign(new Error("New time must be future."), { code: "SCHEDULE_NOT_FUTURE", httpStatus: 400 });
  }
  if (actionType === "communication.delivery.retry") {
    const row = await models.Delivery.findOne({ instituteId: c.instituteId, deliveryId: p.deliveryId });
    if (!row) throw Object.assign(new Error("Delivery not found."), { code: "DELIVERY_NOT_FOUND", httpStatus: 404 });
    if (!["failed", "skipped_provider_unconfigured"].includes(row.status)) throw Object.assign(new Error("Delivery is not retryable."), { code: "DELIVERY_NOT_RETRYABLE", httpStatus: 409 });
  }
  if (actionType === "communication.delivery.summary" && p.branchId) { const scope = await scopeFor(c); await requireBranch(c, p.branchId); enforceBranch(c, scope, p.branchId); }
  return { d, p };
}

async function preview(models, c, actionType, raw) {
  if (!dbReady()) throw Object.assign(new Error("MongoDB connection required."), { code: "DATABASE_REQUIRED", httpStatus: 503 });
  const { d, p } = await validate(models, c, actionType, raw);
  const fp = sha(JSON.stringify({ instituteId: c.instituteId, actor: c.userId, actionType, p }));
  const reusable = await models.Action.findOne({ instituteId: c.instituteId, actorUserId: c.userId, fingerprint: fp, status: "preview_ready", previewExpiresAt: { $gt: new Date() } }).sort({ createdAt: -1 });
  if (reusable) return { action: reusable, reusedPreview: true };
  const recent = await models.Action.findOne({ instituteId: c.instituteId, actorUserId: c.userId, fingerprint: fp, status: "executed_native", executedAt: { $gt: new Date(Date.now() - DUPLICATE_MS) } }).sort({ executedAt: -1 });
  if (recent) throw Object.assign(new Error("Same action was executed recently."), { code: "DUPLICATE_ACTION", httpStatus: 409, existingAction: publicAction(recent) });
  const actionId = makeId("comm");
  const row = await models.Action.create({ actionId, instituteId: c.instituteId, actorUserId: c.userId, actorIdentityId: c.identityId, actorRole: c.role, actorDisplayName: c.displayName, actionType, actionLabel: d.label, status: "preview_ready", payload: p, fingerprint: fp, confirmationDigest: sha(confirmation({ actionId, actionType })), previewExpiresAt: new Date(Date.now() + PREVIEW_TTL_MS), result: {}, rollbackApplied: false });
  return { action: row, reusedPreview: false };
}

function addressKey() { const raw = String(process.env.NAXORA_COMM_ADDRESS_ENCRYPTION_KEY || process.env.JWT_SECRET || ""); return raw ? crypto.createHash("sha256").update(raw).digest() : null; }
function encryptAddress(value) { const key = addressKey(); if (!key || !value) return ""; const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv("aes-256-gcm", key, iv); const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]); return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64"); }
function decryptAddress(value) { const key = addressKey(); if (!key || !value) return ""; try { const b = Buffer.from(value, "base64"); const d = crypto.createDecipheriv("aes-256-gcm", key, b.subarray(0, 12)); d.setAuthTag(b.subarray(12, 28)); return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8"); } catch { return ""; } }
function maskAddress(v = "") { if (!v) return ""; if (v.includes("@")) { const [a, b] = v.split("@"); return `${a.slice(0, 2)}***@${b}`; } return `${v.slice(0, 3)}***${v.slice(-2)}`; }

async function hydrate(c, identityIds, meta = {}) {
  const { Identity, Teacher, Student, Staff } = nativeModels();
  const valid = identityIds.filter(mongoose.isValidObjectId);
  const rows = await Identity.find({ _id: { $in: valid }, instituteId: c.instituteId, status: "active" }).lean();
  const stringIds = rows.map(r => String(r._id));
  const [teachers, students, staff] = await Promise.all([Teacher.find({ instituteId: c.instituteId, identityId: { $in: stringIds } }).lean(), Student.find({ instituteId: c.instituteId, identityId: { $in: stringIds } }).lean(), Staff.find({ instituteId: c.instituteId, identityId: { $in: stringIds } }).lean()]);
  const phone = {}; for (const p of [...teachers, ...students, ...staff]) phone[p.identityId] = p.phone || "";
  return rows.map(r => { const rid = String(r._id); const m = meta[rid] || {}; return { recipientIdentityId: rid, recipientLeadId: "", recipientRole: r.role, branchId: m.branchId || "", studentId: m.studentId || (r.role === "student" ? rid : ""), email: r.identifierType === "email" ? r.identifierCanonical : "", phone: phone[rid] || (r.identifierType === "phone" ? r.identifierCanonical : ""), leadConsent: null, consentSource: "part133_preference" }; });
}
async function resolveRecipients(c, t) {
  const { Identity, Teacher, Student, ParentLink, Staff, ClassBatch, Lead } = nativeModels();
  const identitySet = new Set(); const meta = {}; const leadRows = [];
  const add = (x, m = {}) => { const v = id(x); if (v) { identitySet.add(v); meta[v] = { ...(meta[v] || {}), ...m }; } };
  if (t.targetType === "identity") t.identityIds.forEach(add);
  if (t.targetType === "role") (await Identity.find({ instituteId: c.instituteId, role: t.targetRole, status: "active" }).select("_id").lean()).forEach(r => add(String(r._id)));
  if (t.targetType === "branch_role") {
    if (t.targetRole === "student") (await Student.find({ instituteId: c.instituteId, branchId: t.branchId, status: { $ne: "disabled" } }).lean()).forEach(r => add(r.identityId, { branchId: r.branchId, studentId: r.studentId }));
    else if (t.targetRole === "teacher") (await Teacher.find({ instituteId: c.instituteId, branchIds: t.branchId, status: { $ne: "disabled" } }).lean()).forEach(r => add(r.identityId, { branchId: t.branchId }));
    else if (t.targetRole === "parent") { const ss = await Student.find({ instituteId: c.instituteId, branchId: t.branchId, status: { $ne: "disabled" } }).select("studentId branchId").lean(); const map = Object.fromEntries(ss.map(s => [s.studentId, s])); (await ParentLink.find({ instituteId: c.instituteId, studentId: { $in: ss.map(s => s.studentId) }, status: "active" }).lean()).forEach(r => add(r.parentIdentityId, { branchId: map[r.studentId]?.branchId || t.branchId, studentId: r.studentId })); }
    else if (["branch_manager", "accountant", "counsellor", "staff"].includes(t.targetRole)) (await Staff.find({ instituteId: c.instituteId, role: t.targetRole, status: { $ne: "disabled" }, $or: [{ branchIds: t.branchId }, { instituteWide: true }] }).lean()).forEach(r => add(r.identityId, { branchId: t.branchId }));
    else if (t.targetRole === "institute_owner") (await Identity.find({ instituteId: c.instituteId, role: "institute_owner", status: "active" }).select("_id").lean()).forEach(r => add(String(r._id)));
  }
  if (t.targetType === "class_role") {
    const cl = await ClassBatch.findOne({ instituteId: c.instituteId, classId: t.classId }).lean();
    if (t.targetRole === "student") (await Student.find({ instituteId: c.instituteId, classId: t.classId, status: { $ne: "disabled" } }).lean()).forEach(r => add(r.identityId, { branchId: r.branchId, studentId: r.studentId }));
    else if (t.targetRole === "parent") { const ss = await Student.find({ instituteId: c.instituteId, classId: t.classId, status: { $ne: "disabled" } }).select("studentId branchId").lean(); const map = Object.fromEntries(ss.map(s => [s.studentId, s])); (await ParentLink.find({ instituteId: c.instituteId, studentId: { $in: ss.map(s => s.studentId) }, status: "active" }).lean()).forEach(r => add(r.parentIdentityId, { branchId: map[r.studentId]?.branchId || cl?.branchId || "", studentId: r.studentId })); }
    else if (t.targetRole === "teacher") add(cl?.teacherId, { branchId: cl?.branchId || "" });
  }
  if (t.targetType === "student_parent") {
    const ss = await Student.find({ instituteId: c.instituteId, studentId: { $in: t.studentIds }, status: { $ne: "disabled" } }).lean();
    const includeStudents = !t.targetRole || ["student", "both"].includes(t.targetRole); const includeParents = !t.targetRole || ["parent", "both"].includes(t.targetRole);
    if (includeStudents) ss.forEach(r => add(r.identityId, { branchId: r.branchId, studentId: r.studentId }));
    if (includeParents) { const map = Object.fromEntries(ss.map(s => [s.studentId, s])); (await ParentLink.find({ instituteId: c.instituteId, studentId: { $in: ss.map(s => s.studentId) }, status: "active" }).lean()).forEach(r => add(r.parentIdentityId, { branchId: map[r.studentId]?.branchId || "", studentId: r.studentId })); }
  }
  if (t.targetType === "crm_lead") for (const lead of await Lead.find({ instituteId: c.instituteId, leadId: { $in: t.leadIds } }).lean()) leadRows.push({ recipientIdentityId: "", recipientLeadId: lead.leadId, recipientRole: "crm_lead", branchId: lead.branchId, studentId: "", email: lead.email || "", phone: lead.phone || "", leadConsent: Boolean(lead.consentToContact) && !Boolean(lead.doNotContact), consentSource: "part132_lead_consent" });
  const result = [...await hydrate(c, [...identitySet], meta), ...leadRows];
  if (!result.length) throw Object.assign(new Error("No active recipients resolved."), { code: "NO_RECIPIENTS", httpStatus: 400 });
  if (result.length > MAX_RECIPIENTS) throw Object.assign(new Error(`Recipient limit is ${MAX_RECIPIENTS}.`), { code: "RECIPIENT_LIMIT", httpStatus: 400 });
  return result;
}

function provider(channel) {
  const map = { email: [process.env.NAXORA_COMM_EMAIL_WEBHOOK_URL, process.env.NAXORA_COMM_EMAIL_PROVIDER_NAME || "email_webhook"], sms: [process.env.NAXORA_COMM_SMS_WEBHOOK_URL, process.env.NAXORA_COMM_SMS_PROVIDER_NAME || "sms_webhook"], whatsapp: [process.env.NAXORA_COMM_WHATSAPP_WEBHOOK_URL, process.env.NAXORA_COMM_WHATSAPP_PROVIDER_NAME || "whatsapp_webhook"] };
  const [url = "", name = ""] = map[channel] || [];
  return { url: String(url || "").trim(), name: text(name, 80), token: String(process.env.NAXORA_COMM_PROVIDER_TOKEN || "").trim() };
}
function safeUrl(value) { try { const u = new URL(value); const h = u.hostname.toLowerCase(); if (u.protocol !== "https:" || h === "localhost" || h === "::1" || h.endsWith(".local") || /^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h)) return ""; return u.toString(); } catch { return ""; } }
async function callProvider(channel, recipient, subject, body, meta) {
  const p = provider(channel); const url = safeUrl(p.url);
  if (!url) return { status: "skipped_provider_unconfigured", providerName: p.name, providerStatusCode: null, providerMessage: "Provider not configured or unsafe." };
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...(p.token ? { Authorization: `Bearer ${p.token}` } : {}) }, body: JSON.stringify({ channel, to: channel === "email" ? recipient.email : recipient.phone, subject, body, metadata: meta }), signal: controller.signal });
    const msg = text(await response.text().catch(() => ""), 300);
    return { status: response.ok ? "provider_accepted" : "failed", providerName: p.name, providerStatusCode: response.status, providerMessage: msg || response.statusText };
  } catch (e) { return { status: "failed", providerName: p.name, providerStatusCode: null, providerMessage: text(e.message || "Provider request failed.", 300) }; }
  finally { clearTimeout(timeout); }
}
async function permission(models, c, recipient, channel) {
  if (channel === "in_app") return recipient.recipientIdentityId ? { allowed: true, status: "queued", consentSource: "authenticated_account" } : { allowed: false, status: "skipped_channel_unavailable", consentSource: "" };
  const address = channel === "email" ? recipient.email : recipient.phone;
  if (!address) return { allowed: false, status: "skipped_no_address", consentSource: recipient.consentSource };
  if (recipient.recipientLeadId) return recipient.leadConsent ? { allowed: true, status: "queued", consentSource: "part132_lead_consent" } : { allowed: false, status: "skipped_no_consent", consentSource: "part132_lead_consent" };
  const pref = await models.Preference.findOne({ instituteId: c.instituteId, identityId: recipient.recipientIdentityId }).lean();
  if (!pref?.externalConsent) return { allowed: false, status: "skipped_no_consent", consentSource: "part133_preference" };
  if ((pref.blockedChannels || []).includes(channel)) return { allowed: false, status: "skipped_opt_out", consentSource: "part133_preference" };
  return { allowed: true, status: "queued", consentSource: "part133_preference" };
}
async function deliver(models, c, messageId, sourceType, sourceId, recipient, channel, subject, body, actionId) {
  const perm = await permission(models, c, recipient, channel); const address = channel === "email" ? recipient.email : ["sms", "whatsapp"].includes(channel) ? recipient.phone : "";
  const row = await models.Delivery.create({ deliveryId: makeId("delivery"), instituteId: c.instituteId, messageId, sourceType, sourceId, recipientIdentityId: recipient.recipientIdentityId, recipientLeadId: recipient.recipientLeadId, recipientRole: recipient.recipientRole, branchId: recipient.branchId, studentId: recipient.studentId, channel, addressMasked: maskAddress(address), addressEncrypted: encryptAddress(address), subject, body, consentSource: perm.consentSource, status: perm.status, attempts: 0, providerName: "", providerStatusCode: null, providerMessage: "", deliveredAt: null, lastAttemptAt: null, actionId });
  if (!perm.allowed) return row;
  row.attempts = 1; row.lastAttemptAt = new Date();
  if (channel === "in_app") { row.status = "delivered_in_app"; row.deliveredAt = new Date(); await row.save(); return row; }
  const result = await callProvider(channel, recipient, subject, body, { instituteId: c.instituteId, messageId, deliveryId: row.deliveryId, recipientRole: recipient.recipientRole });
  Object.assign(row, result); if (result.status === "provider_accepted") row.deliveredAt = new Date(); await row.save(); return row;
}
async function dispatch(models, c, payload, sourceType, sourceId, actionId) {
  const target = payload.target || targetOf(payload); await validateTarget(c, target); const recipients = await resolveRecipients(c, target); const messageId = makeId("message");
  const message = await models.Record.create({ recordId: messageId, instituteId: c.instituteId, kind: "message", ownerUserId: c.userId, branchId: target.branchId || "", status: "sent", data: { sourceType, sourceId, subject: payload.subject || payload.title, body: payload.body, target, channels: payload.channels, priority: payload.priority || "normal", recipientCount: recipients.length, deliveryCount: recipients.length * payload.channels.length, providerAcceptedIsNotFinalDelivery: true }, actionId });
  const deliveries = [];
  for (const recipient of recipients) for (const channel of payload.channels) deliveries.push(await deliver(models, c, messageId, sourceType, sourceId, recipient, channel, payload.subject || payload.title, payload.body, actionId));
  const summary = {}; for (const d of deliveries) summary[d.status] = (summary[d.status] || 0) + 1;
  return { message, deliveries, summary };
}

async function execute(models, c, action) {
  const p = action.payload;
  switch (action.actionType) {
    case "communication.template.create": return { entity: "template", record: publicRecord(await models.Record.create({ recordId: makeId("template"), instituteId: c.instituteId, kind: "template", ownerUserId: c.userId, branchId: p.branchId || "", status: p.status || "active", data: { name: p.name, category: p.category || "general", subject: p.subject, body: p.body, channels: p.channels }, actionId: action.actionId })) };
    case "communication.template.update": { const r = await models.Record.findOne({ instituteId: c.instituteId, recordId: p.templateId, kind: "template" }); r.data = { ...r.data, ...Object.fromEntries(["name", "category", "subject", "body", "channels"].filter(k => p[k] !== undefined).map(k => [k, p[k]])) }; if (p.status) r.status = p.status; r.actionId = action.actionId; await r.save(); return { entity: "template", record: publicRecord(r) }; }
    case "communication.notice.create": return { entity: "notice_draft", record: publicRecord(await models.Record.create({ recordId: makeId("notice"), instituteId: c.instituteId, kind: "notice", ownerUserId: c.userId, branchId: p.branchId || "", status: "draft", data: { title: p.title, body: p.body, target: targetOf(p), channels: p.channels, priority: p.priority || "normal", expiresAt: p.expiresAt || null }, actionId: action.actionId })) };
    case "communication.notice.update": { const r = await models.Record.findOne({ instituteId: c.instituteId, recordId: p.noticeId, kind: "notice" }); r.data = { ...r.data, ...Object.fromEntries(["title", "body", "channels", "priority", "expiresAt"].filter(k => p[k] !== undefined).map(k => [k, p[k]])) }; if (["targetType", "targetRole", "branchId", "classId", "identityIds", "studentIds", "leadIds"].some(k => p[k] !== undefined)) r.data.target = { ...r.data.target, ...targetOf(p), targetType: p.targetType || r.data.target.targetType }; r.branchId = r.data.target.branchId || ""; r.actionId = action.actionId; await r.save(); return { entity: "notice_draft", record: publicRecord(r) }; }
    case "communication.notice.publish": { const n = await models.Record.findOne({ instituteId: c.instituteId, recordId: p.noticeId, kind: "notice" }); const sent = await dispatch(models, c, { subject: n.data.title, body: n.data.body, target: n.data.target, channels: n.data.channels, priority: n.data.priority }, "notice", n.recordId, action.actionId); n.status = "published"; n.data.publishedAt = new Date(); n.data.messageId = sent.message.recordId; n.actionId = action.actionId; await n.save(); return { entity: "published_notice", notice: publicRecord(n), deliverySummary: sent.summary }; }
    case "communication.message.send": { const sent = await dispatch(models, c, p, "message", "", action.actionId); return { entity: "message", message: publicRecord(sent.message), deliverySummary: sent.summary, providerAcceptedIsNotFinalDelivery: true }; }
    case "communication.notification.schedule": return { entity: "schedule", record: publicRecord(await models.Record.create({ recordId: makeId("schedule"), instituteId: c.instituteId, kind: "schedule", ownerUserId: c.userId, branchId: p.branchId || "", status: "scheduled", data: { subject: p.subject, body: p.body, target: targetOf(p), channels: p.channels, priority: p.priority || "normal", scheduledAt: p.scheduledAt, actorContext: c, lockedAt: null, messageId: "", failureMessage: "" }, actionId: action.actionId })), schedulerRunsWhileServiceActive: true };
    case "communication.notification.reschedule": { const r = await models.Record.findOne({ instituteId: c.instituteId, recordId: p.scheduleId, kind: "schedule" }); r.data.scheduledAt = p.scheduledAt; r.data.lockedAt = null; r.actionId = action.actionId; await r.save(); return { entity: "schedule", record: publicRecord(r) }; }
    case "communication.notification.cancel": { const r = await models.Record.findOne({ instituteId: c.instituteId, recordId: p.scheduleId, kind: "schedule" }); r.status = "cancelled"; r.data.cancelledAt = new Date(); r.data.reason = p.reason || ""; r.actionId = action.actionId; await r.save(); return { entity: "schedule", record: publicRecord(r) }; }
    case "communication.delivery.retry": { const d = await models.Delivery.findOne({ instituteId: c.instituteId, deliveryId: p.deliveryId }); const address = decryptAddress(d.addressEncrypted); const recipient = { recipientIdentityId: d.recipientIdentityId, recipientLeadId: d.recipientLeadId, recipientRole: d.recipientRole, branchId: d.branchId, studentId: d.studentId, email: d.channel === "email" ? address : "", phone: ["sms", "whatsapp"].includes(d.channel) ? address : "", leadConsent: Boolean(d.recipientLeadId), consentSource: d.consentSource }; const perm = await permission(models, c, recipient, d.channel); d.attempts += 1; d.lastAttemptAt = new Date(); if (!perm.allowed) d.status = perm.status; else { const r = await callProvider(d.channel, recipient, d.subject, d.body, { instituteId: c.instituteId, messageId: d.messageId, deliveryId: d.deliveryId }); Object.assign(d, r); if (r.status === "provider_accepted") d.deliveredAt = new Date(); } d.actionId = action.actionId; await d.save(); return { entity: "delivery_retry", record: publicRecord(d), providerAcceptedIsNotFinalDelivery: true }; }
    case "communication.preference.update": { const r = await models.Preference.findOneAndUpdate({ instituteId: c.instituteId, identityId: c.identityId }, { $set: { externalConsent: p.externalConsent ?? false, blockedChannels: p.blockedChannels || [], updatedByUserId: c.userId, actionId: action.actionId } }, { upsert: true, new: true, runValidators: true }); return { entity: "preference", record: publicRecord(r) }; }
    case "communication.delivery.summary": { const q = { instituteId: c.instituteId }; if (p.branchId) q.branchId = p.branchId; if (p.fromDate || p.toDate) { q.createdAt = {}; if (p.fromDate) q.createdAt.$gte = new Date(p.fromDate); if (p.toDate) q.createdAt.$lte = new Date(p.toDate); } const rows = await models.Delivery.find(q).limit(300).lean(); const byStatus = {}; const byChannel = {}; for (const x of rows) { byStatus[x.status] = (byStatus[x.status] || 0) + 1; byChannel[x.channel] = (byChannel[x.channel] || 0) + 1; } const summary = { total: rows.length, acceptedOrDelivered: rows.filter(x => ["delivered_in_app", "provider_accepted"].includes(x.status)).length, failed: rows.filter(x => x.status === "failed").length, skipped: rows.filter(x => String(x.status).startsWith("skipped_")).length, byStatus, byChannel }; return { entity: "delivery_summary", record: publicRecord(await models.Record.create({ recordId: makeId("commreport"), instituteId: c.instituteId, kind: "report", ownerUserId: c.userId, branchId: p.branchId || "", status: "generated", data: { filters: p, summary }, actionId: action.actionId })) }; }
    default: throw Object.assign(new Error("Executor missing."), { code: "EXECUTOR_MISSING", httpStatus: 500 });
  }
}

async function confirmExecute(models, c, actionId, exact) {
  const action = await models.Action.findOne({ actionId, instituteId: c.instituteId, actorUserId: c.userId });
  if (!action) throw Object.assign(new Error("Action not found."), { code: "ACTION_NOT_FOUND", httpStatus: 404 });
  if (action.status === "executed_native") return { action, idempotentReplay: true };
  if (action.status !== "preview_ready") throw Object.assign(new Error("Action state conflict."), { code: "ACTION_STATE_CONFLICT", httpStatus: 409 });
  if (new Date(action.previewExpiresAt).getTime() <= Date.now()) { action.status = "expired"; await action.save(); throw Object.assign(new Error("Preview expired."), { code: "PREVIEW_EXPIRED", httpStatus: 410 }); }
  if (sha(String(exact || "").trim()) !== action.confirmationDigest) throw Object.assign(new Error(`Exact confirmation required: ${confirmation(action)}`), { code: "EXACT_CONFIRMATION_REQUIRED", httpStatus: 400 });
  await validate(models, c, action.actionType, action.payload);
  const claimed = await models.Action.findOneAndUpdate({ _id: action._id, status: "preview_ready" }, { status: "executing" }, { new: true });
  if (!claimed) throw Object.assign(new Error("Another request is executing."), { code: "EXECUTION_IN_PROGRESS", httpStatus: 409 });
  try { const result = await execute(models, c, claimed); claimed.status = "executed_native"; claimed.executedAt = new Date(); claimed.result = result; claimed.failureCode = ""; claimed.failureMessage = ""; claimed.rollbackApplied = false; await claimed.save(); return { action: claimed, idempotentReplay: false }; }
  catch (e) { claimed.status = "failed"; claimed.failureCode = text(e.code || "EXECUTION_FAILED", 120); claimed.failureMessage = text(e.message || "Communication action failed.", 500); claimed.rollbackApplied = false; await claimed.save(); e.action = claimed; throw e; }
}

function parseCommand(command) {
  const source = long(command, 5000);
  if (SECRET_PATTERN.test(source)) throw Object.assign(new Error("Password, OTP, Aadhaar, PAN, bank or secret data blocked."), { code: "SENSITIVE_COMMAND_BLOCKED", httpStatus: 400 });
  if (DELETE_PATTERN.test(source)) throw Object.assign(new Error("Destructive command blocked."), { code: "DESTRUCTIVE_COMMAND_BLOCKED", httpStatus: 400 });
  const actionType = PATTERNS.find(([, re]) => re.test(source))?.[0];
  if (!actionType) throw Object.assign(new Error("Communication action not recognised."), { code: "COMMAND_NOT_RECOGNISED", httpStatus: 400 });
  const payload = {}; const re = /([a-zA-Z][a-zA-Z0-9_]*)\s*=\s*("[^"]*"|'[^']*'|[^\s]+)/g; let m;
  while ((m = re.exec(source))) { let value = m[2]; if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1); payload[m[1]] = value; }
  return { actionType, payload };
}

async function processDue(models) {
  if (!dbReady()) return;
  const row = await models.Record.findOneAndUpdate({ kind: "schedule", status: "scheduled", "data.scheduledAt": { $lte: new Date().toISOString() }, $or: [{ "data.lockedAt": null }, { "data.lockedAt": { $lt: new Date(Date.now() - 10 * 60 * 1000) } }] }, { $set: { status: "processing", "data.lockedAt": new Date() } }, { sort: { "data.scheduledAt": 1 }, new: true });
  if (!row) return;
  const c = row.data.actorContext;
  try { const sent = await dispatch(models, c, { subject: row.data.subject, body: row.data.body, target: row.data.target, channels: row.data.channels, priority: row.data.priority }, "scheduled", row.recordId, row.actionId); row.status = "sent"; row.data.messageId = sent.message.recordId; row.data.sentAt = new Date(); row.data.failureMessage = ""; await row.save(); }
  catch (e) { row.status = "failed"; row.data.failureMessage = text(e.message, 500); await row.save(); }
}

export function registerPart133VaniCommunicationNotifications({ app } = {}) {
  if (!app || typeof app.get !== "function") throw new Error("Express app required.");
  if (app.locals.part133CommunicationRegistered) return;
  app.locals.part133CommunicationRegistered = true;
  const models = defineModels();

  app.get(["/communication-vani", "/notifications-vani", "/part133"], (req, res) => res.sendFile(path.join(frontendDir, "naxora-communication-vani.html")));
  app.get("/naxora-communication-vani.css", (req, res) => res.type("text/css").sendFile(path.join(frontendDir, "naxora-communication-vani.css")));
  app.get("/naxora-communication-vani.js", (req, res) => res.type("application/javascript").sendFile(path.join(frontendDir, "naxora-communication-vani.js")));
  app.get("/naxora-part133-global-vani-bridge.js", (req, res) => res.type("application/javascript").sendFile(path.join(frontendDir, "naxora-part133-global-vani-bridge.js")));

  app.get("/api/part133/status", (req, res) => res.json({ success: true, part: PART, name: NAME, status: "vani_communication_notifications_active", page: "/communication-vani", actionCount: Object.keys(ACTIONS).length, templates: true, notices: true, roleSafeMessages: true, scheduledNotifications: true, inAppInbox: true, emailSmsWhatsappProviderReady: true, providerUrlsServerOnly: true, providerAcceptedMeansFinalDelivery: false, consentAndOptOut: true, deliveryTracking: true, schedulerRunsWhileServiceActive: true, guaranteedSchedulerOnSleepingService: false, allFeatureVaniComplete: false, targetFinalAcceptancePart: 136, nextPart: 134, nextPartName: "VANI Reports and Exports" }));
  app.get("/api/part133/security-policy", (req, res) => res.json({ success: true, part: PART, instituteRoleBranchClassLeadIsolation: true, exactConfirmationRequired: true, duplicateProtectionMinutes: DUPLICATE_MS / 60000, maxRecipients: MAX_RECIPIENTS, externalIdentityDeliveryRequiresSelfConsent: true, crmLeadDeliveryRequiresConsentAndNoDoNotContact: true, providerUrlAcceptedFromClient: false, providerUrlPrivateEnvironmentOnly: true, privateProviderUrlsBlocked: true, addressMaskedInApi: true, addressEncryptedWhenKeyConfigured: true, providerAcceptedIsNotFinalDelivery: true, passwordsOtpBankingDataBlocked: true }));
  app.get("/api/part133/catalog", (req, res) => { const examples = { "communication.template.create": 'communication template create name="Fee Reminder" subject="Fee reminder" body="Please review pending fee." channels=in_app,email', "communication.template.update": 'communication template update templateId=TEMPLATE_ID subject="Updated reminder"', "communication.notice.create": 'notice create title="Holiday Notice" body="Institute will remain closed tomorrow." targetType=branch_role branchId=BRANCH_ID targetRole=student channels=in_app', "communication.notice.update": 'notice update noticeId=NOTICE_ID body="Updated timing."', "communication.notice.publish": 'notice publish noticeId=NOTICE_ID', "communication.message.send": 'message send subject="Assignment update" body="Please check assignment." targetType=class_role classId=CLASS_ID targetRole=student channels=in_app', "communication.notification.schedule": 'notification schedule subject="Class reminder" body="Class starts at 8 AM." targetType=class_role classId=CLASS_ID targetRole=student channels=in_app scheduledAt=2026-08-10T07:00:00+05:30', "communication.notification.reschedule": 'notification reschedule scheduleId=SCHEDULE_ID scheduledAt=2026-08-10T07:30:00+05:30', "communication.notification.cancel": 'notification cancel scheduleId=SCHEDULE_ID reason="Class postponed"', "communication.delivery.retry": 'delivery retry deliveryId=DELIVERY_ID', "communication.preference.update": 'communication preference update externalConsent=true blockedChannels=sms', "communication.delivery.summary": 'communication delivery summary generate branchId=BRANCH_ID fromDate=2026-08-01 toDate=2026-08-31' }; res.json({ success: true, part: PART, channels: CHANNELS, targetTypes: TARGET_TYPES, actions: Object.entries(ACTIONS).map(([actionType, d]) => ({ actionType, label: d.label, roles: d.roles, requiredFields: d.required, example: examples[actionType] })) }); });
  app.get("/api/part133/demo", (req, res) => res.json({ success: true, part: PART, flow: ["role and scope validation", "recipient resolution", "consent and opt-out", "preview", "exact confirmation", "in-app or private provider delivery", "honest delivery status"], notSupported: ["client supplied provider URL", "secret/OTP delivery", "guaranteed scheduler while service sleeps", "guaranteed final delivery from provider acceptance", "all-feature VANI before Part 136"] }));

  app.post("/api/part133/actions/preview", auth, async (req, res) => { try { const r = await preview(models, req.part133, text(req.body?.actionType, 140), req.body?.payload || {}); res.json({ success: true, part: PART, action: publicAction(r.action), reusedPreview: r.reusedPreview }); } catch (e) { res.status(e.httpStatus || 500).json({ success: false, part: PART, code: e.code || "PREVIEW_FAILED", message: e.message, missingFields: e.missingFields || [], existingAction: e.existingAction || null }); } });
  app.post("/api/part133/vani/command", auth, async (req, res) => { try { const parsed = parseCommand(req.body?.command || ""); const r = await preview(models, req.part133, parsed.actionType, parsed.payload); res.json({ success: true, part: PART, interpretedActionType: parsed.actionType, interpretedPayload: r.action.payload, action: publicAction(r.action), reusedPreview: r.reusedPreview, replyText: `${r.action.actionLabel} preview ready. Communication VANI screen par exact-confirm karein.`, openModuleKey: "communication-vani" }); } catch (e) { res.status(e.httpStatus || 500).json({ success: false, part: PART, code: e.code || "COMMAND_FAILED", message: e.message, missingFields: e.missingFields || [], openModuleKey: "communication-vani" }); } });
  app.post("/api/part133/actions/:actionId/confirm", auth, async (req, res) => { try { const r = await confirmExecute(models, req.part133, id(req.params.actionId), req.body?.confirmationText); res.json({ success: true, part: PART, action: publicAction(r.action), idempotentReplay: r.idempotentReplay, providerAcceptedMeansFinalDelivery: false, replyText: "Action executed. Every delivery has its actual status." }); } catch (e) { res.status(e.httpStatus || 500).json({ success: false, part: PART, code: e.code || "EXECUTION_FAILED", message: e.message, action: e.action ? publicAction(e.action) : null }); } });
  app.post("/api/part133/actions/:actionId/cancel", auth, async (req, res) => { const row = await models.Action.findOne({ actionId: id(req.params.actionId), instituteId: req.part133.instituteId, actorUserId: req.part133.userId }); if (!row) return res.status(404).json({ success: false, part: PART, code: "ACTION_NOT_FOUND" }); if (row.status === "preview_ready") { row.status = "cancelled"; await row.save(); } res.json({ success: true, part: PART, action: publicAction(row) }); });
  app.get("/api/part133/actions", auth, async (req, res) => { const rows = await models.Action.find({ instituteId: req.part133.instituteId, ...(req.part133.role === "institute_owner" ? {} : { actorUserId: req.part133.userId }) }).sort({ createdAt: -1 }).limit(100); res.json({ success: true, part: PART, actions: rows.map(publicAction) }); });
  app.get("/api/part133/records", auth, async (req, res) => { const base = { instituteId: req.part133.instituteId }; const own = req.part133.role === "institute_owner" ? {} : { ownerUserId: req.part133.userId }; const [templates, notices, messages, schedules, reports, preference] = await Promise.all([models.Record.find({ ...base, kind: "template", ...(BRANCH_ROLES.has(req.part133.role) ? own : {}) }).sort({ updatedAt: -1 }).limit(100).lean(), models.Record.find({ ...base, kind: "notice", ...own }).sort({ updatedAt: -1 }).limit(100).lean(), models.Record.find({ ...base, kind: "message", ...own }).sort({ createdAt: -1 }).limit(100).lean(), models.Record.find({ ...base, kind: "schedule", ...own }).sort({ createdAt: -1 }).limit(100).lean(), models.Record.find({ ...base, kind: "report", ...own }).sort({ createdAt: -1 }).limit(100).lean(), models.Preference.findOne({ ...base, identityId: req.part133.identityId }).lean()]); const messageIds = messages.map(x => x.recordId); const deliveries = await models.Delivery.find(req.part133.role === "institute_owner" ? base : { ...base, $or: [{ recipientIdentityId: req.part133.identityId }, { messageId: { $in: messageIds } }] }).sort({ createdAt: -1 }).limit(300).lean(); res.json({ success: true, part: PART, records: { templates, notices, messages, schedules, deliveries: deliveries.map(publicRecord), reports, preference: preference ? [preference] : [] } }); });
  app.get("/api/part133/inbox", auth, async (req, res) => { const rows = await models.Delivery.find({ instituteId: req.part133.instituteId, recipientIdentityId: req.part133.identityId, channel: "in_app", archivedAt: null }).sort({ createdAt: -1 }).limit(100).lean(); res.json({ success: true, part: PART, unreadCount: rows.filter(x => !x.readAt).length, inbox: rows.map(publicRecord) }); });
  app.post("/api/part133/inbox/:deliveryId/read", auth, async (req, res) => { const row = await models.Delivery.findOneAndUpdate({ instituteId: req.part133.instituteId, deliveryId: id(req.params.deliveryId), recipientIdentityId: req.part133.identityId, channel: "in_app" }, { $set: { readAt: new Date() } }, { new: true }); if (!row) return res.status(404).json({ success: false, part: PART, code: "INBOX_ITEM_NOT_FOUND" }); res.json({ success: true, part: PART, item: publicRecord(row) }); });
  app.post("/api/part133/inbox/:deliveryId/archive", auth, async (req, res) => { const row = await models.Delivery.findOneAndUpdate({ instituteId: req.part133.instituteId, deliveryId: id(req.params.deliveryId), recipientIdentityId: req.part133.identityId, channel: "in_app" }, { $set: { archivedAt: new Date() } }, { new: true }); if (!row) return res.status(404).json({ success: false, part: PART, code: "INBOX_ITEM_NOT_FOUND" }); res.json({ success: true, part: PART, item: publicRecord(row) }); });

  const timer = setInterval(() => processDue(models).catch(() => {}), 60 * 1000);
  if (typeof timer.unref === "function") timer.unref();
  app.locals.part133Scheduler = timer;
}
