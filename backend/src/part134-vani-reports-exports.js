import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const PART_NUMBER = 134;
const PART_NAME = "VANI Reports and Exports";
const PREVIEW_TTL_MS = 30 * 60 * 1000;
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;
const REPORT_ROW_LIMIT = 1000;
const EXPORT_BYTE_LIMIT = 2 * 1024 * 1024;
const EXPORT_LIFETIME_MS = 24 * 60 * 60 * 1000;
const DOWNLOAD_TICKET_LIFETIME_MS = 5 * 60 * 1000;
const MAX_DATE_RANGE_DAYS = 366;

const ALL_ROLES = [
  "institute_owner", "branch_manager", "teacher", "student", "parent",
  "accountant", "counsellor", "staff",
];
const OWNER_ALIASES = new Set(["institute_owner", "owner", "instituteowner"]);
const BRANCH_SCOPED = new Set(["branch_manager", "accountant", "counsellor", "staff"]);

const REPORT_TYPES = Object.freeze({
  executive: { label: "Executive Overview", roles: ["institute_owner", "branch_manager"] },
  branch: { label: "Branch Overview", roles: ["institute_owner", "branch_manager", "staff"] },
  attendance: { label: "Attendance Report", roles: ["institute_owner", "branch_manager", "teacher", "staff", "student", "parent"] },
  academic: { label: "Academic Performance Report", roles: ["institute_owner", "branch_manager", "teacher", "student", "parent"] },
  finance: { label: "Fees and Finance Report", roles: ["institute_owner", "branch_manager", "accountant", "student", "parent"] },
  crm: { label: "Admissions and CRM Report", roles: ["institute_owner", "branch_manager", "counsellor"] },
  communication: { label: "Communication Delivery Report", roles: ["institute_owner", "branch_manager", "teacher", "accountant", "counsellor"] },
  student: { label: "Student 360 Report", roles: ["institute_owner", "branch_manager", "teacher", "student", "parent"] },
});

const ACTIONS = Object.freeze({
  "reports.executive.generate": { label: "Generate Executive Overview", roles: REPORT_TYPES.executive.roles, required: [], reportType: "executive" },
  "reports.branch.generate": { label: "Generate Branch Overview", roles: REPORT_TYPES.branch.roles, required: [], reportType: "branch" },
  "reports.attendance.generate": { label: "Generate Attendance Report", roles: REPORT_TYPES.attendance.roles, required: [], reportType: "attendance" },
  "reports.academic.generate": { label: "Generate Academic Performance Report", roles: REPORT_TYPES.academic.roles, required: [], reportType: "academic" },
  "reports.finance.generate": { label: "Generate Fees and Finance Report", roles: REPORT_TYPES.finance.roles, required: [], reportType: "finance" },
  "reports.crm.generate": { label: "Generate Admissions and CRM Report", roles: REPORT_TYPES.crm.roles, required: [], reportType: "crm" },
  "reports.communication.generate": { label: "Generate Communication Delivery Report", roles: REPORT_TYPES.communication.roles, required: [], reportType: "communication" },
  "reports.student.generate": { label: "Generate Student 360 Report", roles: REPORT_TYPES.student.roles, required: ["studentId"], reportType: "student" },
  "reports.export.csv": { label: "Create CSV Export", roles: ALL_ROLES, required: ["reportId"], exportFormat: "csv" },
  "reports.export.json": { label: "Create JSON Export", roles: ALL_ROLES, required: ["reportId"], exportFormat: "json" },
  "reports.export.html": { label: "Create Print-ready HTML Export", roles: ALL_ROLES, required: ["reportId"], exportFormat: "html" },
  "reports.export.revoke": { label: "Revoke Report Export", roles: ALL_ROLES, required: ["exportId"] },
});

const PATTERNS = [
  ["reports.export.revoke", /(report|export).*(revoke|cancel|disable)/i],
  ["reports.export.csv", /(report|export).*(csv)/i],
  ["reports.export.json", /(report|export).*(json)/i],
  ["reports.export.html", /(report|export).*(html|print)/i],
  ["reports.student.generate", /(student).*(360|full|combined|progress).*(report|summary|generate|banao|dikhao)/i],
  ["reports.attendance.generate", /(attendance|hazri).*(report|summary).*(generate|banao|dikhao)/i],
  ["reports.academic.generate", /(academic|marks|result).*(report|summary).*(generate|banao|dikhao)/i],
  ["reports.finance.generate", /(finance|fees|invoice|collection).*(report|summary).*(generate|banao|dikhao)/i],
  ["reports.crm.generate", /(crm|admission|lead).*(report|summary).*(generate|banao|dikhao)/i],
  ["reports.communication.generate", /(communication|delivery|notification).*(report|summary).*(generate|banao|dikhao)/i],
  ["reports.branch.generate", /(branch).*(report|overview|summary).*(generate|banao|dikhao)/i],
  ["reports.executive.generate", /(executive|owner|institute).*(report|overview|dashboard|summary).*(generate|banao|dikhao)/i],
];

const SENSITIVE = /(password|passcode|otp|cvv|upi\s*pin|api\s*key|secret|jwt|bank\s*account|card\s*number|aadhaar|aadhar|pan\s*(card|number)?|passport\s*number)/i;
const DESTRUCTIVE = /(delete permanently|purge|erase all|drop database|bulk delete)/i;
const BLOCKED_FORMAT = /\b(pdf|xlsx|excel)\b/i;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, "../../frontend");

function cleanText(value = "", max = 255) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
function cleanLong(value = "", max = 5000) {
  return String(value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ").trim().slice(0, max);
}
function cleanId(value = "") {
  return String(value ?? "").trim().replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 180);
}
function cleanDate(value = "") {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const parsed = new Date(text.length === 10 ? `${text}T00:00:00.000Z` : text);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}
function normalizeRole(value = "") {
  const role = String(value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return ({ owner: "institute_owner", instituteowner: "institute_owner", branchmanager: "branch_manager", counselor: "counsellor", guardian: "parent", learner: "student", faculty: "teacher" })[role] || role;
}
function dbReady() { return mongoose.connection?.readyState === 1; }
function sha256(value) { return crypto.createHash("sha256").update(String(value ?? "")).digest("hex"); }
function createId(prefix) { return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(5).toString("hex")}`; }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.keys(value).sort().reduce((out, key) => { out[key] = stable(value[key]); return out; }, {});
  return value;
}
function safeNumber(value) { const n = Number(value || 0); return Number.isFinite(n) ? n : 0; }
function round(value, digits = 2) { const factor = 10 ** digits; return Math.round((safeNumber(value) + Number.EPSILON) * factor) / factor; }
function safeDate(value) {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? cleanText(value, 40) : parsed.toISOString();
}
function displayName(row = {}) {
  return cleanText(row.displayName || row.studentName || row.name || row.fullName || row.branchName || row.courseName || row.className || row.batchName || "", 180);
}
function jwtSecrets() {
  return [process.env.JWT_SECRET, process.env.JWT_ACCESS_SECRET, process.env.ACCESS_TOKEN_SECRET, process.env.NAXORA_JWT_SECRET]
    .map(value => String(value ?? "").trim()).filter(Boolean);
}
function verifyJwt(token) {
  const secrets = jwtSecrets();
  if (!secrets.length) throw Object.assign(new Error("JWT server configuration missing."), { code: "JWT_CONFIGURATION_MISSING", httpStatus: 503 });
  for (const secret of secrets) {
    try { return jwt.verify(token, secret, { algorithms: ["HS256", "HS384", "HS512"] }); } catch {}
  }
  throw Object.assign(new Error("Login session invalid or expired."), { code: "INVALID_SESSION", httpStatus: 401 });
}
function actionContext(req) {
  const auth = String(req.headers.authorization ?? "").trim();
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const payload = req.part120Context || req.user || req.auth || (token ? verifyJwt(token) : null);
  if (!payload) throw Object.assign(new Error("Common role login required."), { code: "LOGIN_REQUIRED", httpStatus: 401 });
  const rawRole = normalizeRole(payload.role || payload.userRole || payload.accountRole || payload.user?.role || "");
  const role = OWNER_ALIASES.has(rawRole) ? "institute_owner" : rawRole;
  if (!ALL_ROLES.includes(role)) throw Object.assign(new Error("This role is not supported by Part 134."), { code: "REPORT_ROLE_DENIED", httpStatus: 403 });
  const tokenInstituteId = cleanId(payload.instituteId || payload.institute_id || payload.user?.instituteId || payload.tenantId || "");
  const requestedInstituteId = cleanId(req.headers["x-naxora-institute-id"] || req.body?.instituteId || req.query?.instituteId || "");
  if (tokenInstituteId && requestedInstituteId && tokenInstituteId !== requestedInstituteId) throw Object.assign(new Error("Institute context mismatch."), { code: "INSTITUTE_CONTEXT_MISMATCH", httpStatus: 403 });
  const instituteId = tokenInstituteId || requestedInstituteId;
  if (!instituteId) throw Object.assign(new Error("Valid instituteId required."), { code: "INSTITUTE_ID_REQUIRED", httpStatus: 400 });
  const userId = cleanId(payload.userId || payload.identityId || payload.id || payload._id || payload.sub || "user");
  const identityId = cleanId(payload.identityId || payload.sub || userId);
  return {
    instituteId, userId, identityId, role,
    displayName: cleanText(payload.displayName || payload.name || payload.email || role, 120),
    referenceIds: [...new Set([userId, identityId, payload.studentId, payload.student_id, payload.profileId, payload.studentProfileId].map(cleanId).filter(Boolean))],
  };
}
function authenticated(req, res, next) {
  try { req.part134Context = actionContext(req); next(); }
  catch (error) { res.status(error.httpStatus || 401).json({ success: false, part: PART_NUMBER, code: error.code || "AUTH_FAILED", message: error.message }); }
}

function defineModels() {
  const actionSchema = new mongoose.Schema({
    actionId: { type: String, required: true, unique: true, index: true },
    instituteId: { type: String, required: true, index: true },
    actorUserId: { type: String, required: true, index: true },
    actorIdentityId: { type: String, required: true },
    actorRole: { type: String, required: true, index: true },
    actorDisplayName: { type: String, required: true },
    actionType: { type: String, enum: Object.keys(ACTIONS), required: true, index: true },
    actionLabel: { type: String, required: true },
    status: { type: String, enum: ["preview_ready", "executing", "executed_native", "failed", "cancelled", "expired"], default: "preview_ready", index: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    fingerprint: { type: String, required: true, index: true },
    confirmationDigest: { type: String, required: true },
    previewExpiresAt: { type: Date, required: true, index: true },
    executedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    result: { type: mongoose.Schema.Types.Mixed, default: {} },
    failureCode: { type: String, default: "" },
    failureMessage: { type: String, default: "" },
  }, { timestamps: true, strict: true });
  actionSchema.index({ instituteId: 1, actorUserId: 1, fingerprint: 1, createdAt: -1 });

  const reportSchema = new mongoose.Schema({
    reportId: { type: String, required: true, unique: true, index: true },
    instituteId: { type: String, required: true, index: true },
    reportType: { type: String, enum: Object.keys(REPORT_TYPES), required: true, index: true },
    title: { type: String, required: true },
    filters: { type: mongoose.Schema.Types.Mixed, default: {} },
    scopeSummary: { type: mongoose.Schema.Types.Mixed, default: {} },
    columns: { type: [String], default: [] },
    rows: { type: [mongoose.Schema.Types.Mixed], default: [] },
    summary: { type: mongoose.Schema.Types.Mixed, default: {} },
    rowCount: { type: Number, default: 0 },
    truncated: { type: Boolean, default: false },
    generatedByUserId: { type: String, required: true, index: true },
    generatedByRole: { type: String, required: true },
    generatedAt: { type: Date, required: true, index: true },
    status: { type: String, enum: ["active", "revoked"], default: "active", index: true },
    actionId: { type: String, required: true },
  }, { timestamps: true, strict: true });

  const exportSchema = new mongoose.Schema({
    exportId: { type: String, required: true, unique: true, index: true },
    instituteId: { type: String, required: true, index: true },
    reportId: { type: String, required: true, index: true },
    reportType: { type: String, required: true, index: true },
    format: { type: String, enum: ["csv", "json", "html"], required: true, index: true },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    content: { type: String, required: true, select: false },
    byteSize: { type: Number, required: true },
    expiresAt: { type: Date, required: true, index: true },
    status: { type: String, enum: ["active", "revoked", "expired"], default: "active", index: true },
    revokeReason: { type: String, default: "" },
    revokedAt: { type: Date, default: null },
    createdByUserId: { type: String, required: true, index: true },
    createdByRole: { type: String, required: true },
    actionId: { type: String, required: true },
    downloadCount: { type: Number, default: 0 },
    lastDownloadedAt: { type: Date, default: null },
    ticketHash: { type: String, default: "", index: true },
    ticketExpiresAt: { type: Date, default: null },
    ticketUsedAt: { type: Date, default: null },
  }, { timestamps: true, strict: true });

  const auditSchema = new mongoose.Schema({
    instituteId: { type: String, required: true, index: true },
    actionId: { type: String, required: true, index: true },
    actorUserId: { type: String, required: true },
    actorRole: { type: String, required: true },
    actionType: { type: String, required: true, index: true },
    event: { type: String, required: true },
    result: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  }, { timestamps: true, strict: true });

  return {
    Action: mongoose.models.Part134ReportAction || mongoose.model("Part134ReportAction", actionSchema),
    Report: mongoose.models.Part134ReportSnapshot || mongoose.model("Part134ReportSnapshot", reportSchema),
    Export: mongoose.models.Part134Export || mongoose.model("Part134Export", exportSchema),
    Audit: mongoose.models.Part134ReportAudit || mongoose.model("Part134ReportAudit", auditSchema),
  };
}
function recordObject(record) {
  if (!record) return null;
  const object = typeof record.toObject === "function" ? record.toObject() : { ...record };
  delete object.__v; delete object.content; delete object.ticketHash;
  return object;
}
function publicAction(action) {
  return {
    actionId: action.actionId, actionType: action.actionType, actionLabel: action.actionLabel,
    actorRole: action.actorRole, status: action.status, payload: action.payload,
    confirmationTextRequired: action.status === "preview_ready" ? confirmationText(action) : null,
    previewExpiresAt: action.previewExpiresAt, executedAt: action.executedAt,
    result: action.result || {}, failureCode: action.failureCode || "", failureMessage: action.failureMessage || "",
    createdAt: action.createdAt, updatedAt: action.updatedAt,
  };
}
function confirmationText(action) {
  return `CONFIRM ${String(action.actionType || "").toUpperCase().replace(/\./g, " ")} ${String(action.actionId || "").slice(-8).toUpperCase()}`;
}
async function audit(models, context, action, event, result, details = {}) {
  try {
    await models.Audit.create({ instituteId: context.instituteId, actionId: action.actionId, actorUserId: context.userId, actorRole: context.role, actionType: action.actionType, event, result, details });
  } catch {}
}

function normalizePayload(raw = {}) {
  const payload = {};
  for (const key of ["branchId", "classId", "studentId", "reportId", "exportId"]) {
    if (raw[key] !== undefined) payload[key] = cleanId(raw[key]);
  }
  for (const key of ["fromDate", "toDate"]) {
    if (raw[key] !== undefined) payload[key] = cleanDate(raw[key]);
  }
  if (raw.reason !== undefined) payload.reason = cleanLong(raw.reason, 1000);
  return payload;
}
function validateDates(payload) {
  if (payload.fromDate && payload.toDate) {
    const from = new Date(payload.fromDate);
    const to = new Date(payload.toDate);
    if (to < from) throw Object.assign(new Error("toDate cannot be before fromDate."), { code: "INVALID_DATE_RANGE", httpStatus: 400 });
    if ((to.getTime() - from.getTime()) / 86400000 > MAX_DATE_RANGE_DAYS) {
      throw Object.assign(new Error(`Maximum date range is ${MAX_DATE_RANGE_DAYS} days.`), { code: "DATE_RANGE_TOO_LARGE", httpStatus: 400 });
    }
  }
}
function requiredModel(name) {
  const model = mongoose.models[name];
  if (!model) throw Object.assign(new Error(`${name} model unavailable. Apply the required earlier Part first.`), { code: "REPORT_SOURCE_MODEL_MISSING", httpStatus: 503, modelName: name });
  return model;
}
function optionalModel(name) { return mongoose.models[name] || null; }

async function loadScope(context) {
  if (context.role === "institute_owner" || context.role === "student") return { available: true, instituteWide: context.role === "institute_owner", branchIds: [], childStudentIds: [] };
  const Scope = mongoose.models.Part124RoleScopeAssignment;
  if (!Scope) return { available: false, instituteWide: false, branchIds: [], childStudentIds: [] };
  const row = await Scope.findOne({ instituteId: context.instituteId, identityId: context.identityId, role: context.role, status: "active" }).lean();
  return {
    available: Boolean(row),
    instituteWide: Boolean(row?.instituteWide),
    branchIds: Array.isArray(row?.branchIds) ? row.branchIds.map(cleanId).filter(Boolean) : [],
    childStudentIds: Array.isArray(row?.childStudentIds) ? row.childStudentIds.map(cleanId).filter(Boolean) : [],
  };
}
async function requireBranch(context, branchId) {
  const Branch = requiredModel("Part128Branch");
  const row = await Branch.findOne({ instituteId: context.instituteId, branchId, status: { $ne: "disabled" } }).lean();
  if (!row) throw Object.assign(new Error("Branch not found inside this institute."), { code: "BRANCH_NOT_FOUND", httpStatus: 404 });
  return row;
}
async function requireClass(context, classId) {
  const ClassBatch = requiredModel("Part128ClassBatch");
  const row = await ClassBatch.findOne({ instituteId: context.instituteId, classId, status: { $ne: "disabled" } }).lean();
  if (!row) throw Object.assign(new Error("Class/Batch not found inside this institute."), { code: "CLASS_NOT_FOUND", httpStatus: 404 });
  return row;
}
async function requireStudent(context, studentId) {
  const Student = requiredModel("Part128StudentProfile");
  const row = await Student.findOne({ instituteId: context.instituteId, studentId, status: { $ne: "disabled" } }).lean();
  if (!row) throw Object.assign(new Error("Student not found inside this institute."), { code: "STUDENT_NOT_FOUND", httpStatus: 404 });
  return row;
}
async function selfStudent(context) {
  const Student = requiredModel("Part128StudentProfile");
  const row = await Student.findOne({
    instituteId: context.instituteId,
    status: { $ne: "disabled" },
    $or: [
      { identityId: { $in: [context.identityId, context.userId] } },
      { studentId: { $in: context.referenceIds } },
    ],
  }).lean();
  if (!row) throw Object.assign(new Error("Student profile not linked to this login."), { code: "STUDENT_PROFILE_REFERENCE_MISSING", httpStatus: 403 });
  return row;
}
async function teacherClasses(context) {
  if (context.role !== "teacher") return [];
  const ClassBatch = requiredModel("Part128ClassBatch");
  const rows = await ClassBatch.find({
    instituteId: context.instituteId,
    teacherId: { $in: [context.identityId, context.userId] },
    status: { $ne: "disabled" },
  }).select("classId").lean();
  return rows.map(row => cleanId(row.classId)).filter(Boolean);
}
function enforceBranchScope(context, scope, branchId) {
  if (!BRANCH_SCOPED.has(context.role) || context.role === "counsellor") return;
  if (!scope.available) throw Object.assign(new Error("Owner-assigned Part 124 report scope required."), { code: "ROLE_SCOPE_REQUIRED", httpStatus: 403 });
  if (!scope.instituteWide && branchId && !scope.branchIds.includes(branchId)) throw Object.assign(new Error("Report is outside assigned Branch scope."), { code: "BRANCH_SCOPE_MISMATCH", httpStatus: 403 });
}
async function resolveScope(context, reportType, payload) {
  const scope = await loadScope(context);
  const resolved = { branchIds: [], classIds: [], studentIds: [], assignedLeadOnly: false, selfOrChild: false };

  if (payload.branchId) {
    await requireBranch(context, payload.branchId);
    enforceBranchScope(context, scope, payload.branchId);
    if (context.role === "counsellor" && !scope.instituteWide && !scope.branchIds.includes(payload.branchId)) {
      throw Object.assign(new Error("CRM report is outside assigned Branch scope."), { code: "BRANCH_SCOPE_MISMATCH", httpStatus: 403 });
    }
    resolved.branchIds = [payload.branchId];
  } else if (BRANCH_SCOPED.has(context.role) && scope.available && !scope.instituteWide) {
    resolved.branchIds = scope.branchIds;
  }

  if (payload.classId) {
    const classBatch = await requireClass(context, payload.classId);
    if (resolved.branchIds.length && !resolved.branchIds.includes(classBatch.branchId)) throw Object.assign(new Error("Class is outside Branch scope."), { code: "CLASS_BRANCH_SCOPE_MISMATCH", httpStatus: 403 });
    if (context.role === "teacher") {
      const allowed = await teacherClasses(context);
      if (!allowed.includes(payload.classId)) throw Object.assign(new Error("Teacher can report only assigned Classes."), { code: "TEACHER_CLASS_SCOPE_MISMATCH", httpStatus: 403 });
    }
    resolved.classIds = [payload.classId];
    if (!resolved.branchIds.length) resolved.branchIds = [classBatch.branchId];
  } else if (context.role === "teacher") {
    resolved.classIds = await teacherClasses(context);
    if (!resolved.classIds.length) throw Object.assign(new Error("Teacher has no assigned Classes."), { code: "TEACHER_CLASS_SCOPE_REQUIRED", httpStatus: 403 });
  }

  if (payload.studentId) {
    const student = await requireStudent(context, payload.studentId);
    if (context.role === "student") {
      const mine = await selfStudent(context);
      if (mine.studentId !== payload.studentId) throw Object.assign(new Error("Student can report only their own data."), { code: "STUDENT_SELF_SCOPE_MISMATCH", httpStatus: 403 });
    }
    if (context.role === "parent" && (!scope.available || !scope.childStudentIds.includes(payload.studentId))) {
      throw Object.assign(new Error("Parent can report only an Owner-linked child."), { code: "PARENT_CHILD_SCOPE_MISMATCH", httpStatus: 403 });
    }
    if (resolved.branchIds.length && !resolved.branchIds.includes(student.branchId)) throw Object.assign(new Error("Student is outside Branch scope."), { code: "STUDENT_BRANCH_SCOPE_MISMATCH", httpStatus: 403 });
    if (resolved.classIds.length && !resolved.classIds.includes(student.classId)) throw Object.assign(new Error("Student is outside Class scope."), { code: "STUDENT_CLASS_SCOPE_MISMATCH", httpStatus: 403 });
    resolved.studentIds = [student.studentId];
    if (!resolved.branchIds.length) resolved.branchIds = [student.branchId];
    if (!resolved.classIds.length && student.classId) resolved.classIds = [student.classId];
    resolved.selfOrChild = ["student", "parent"].includes(context.role);
  } else if (context.role === "student") {
    const mine = await selfStudent(context);
    resolved.studentIds = [mine.studentId];
    resolved.branchIds = [mine.branchId];
    resolved.classIds = mine.classId ? [mine.classId] : [];
    resolved.selfOrChild = true;
  } else if (context.role === "parent" && ["attendance", "academic", "finance", "student"].includes(reportType)) {
    if (!scope.available || !scope.childStudentIds.length) throw Object.assign(new Error("Parent has no linked child scope."), { code: "PARENT_CHILD_SCOPE_REQUIRED", httpStatus: 403 });
    if (reportType === "student" && scope.childStudentIds.length !== 1) throw Object.assign(new Error("studentId required when Parent has multiple children."), { code: "STUDENT_ID_REQUIRED", httpStatus: 400 });
    resolved.studentIds = scope.childStudentIds;
    resolved.selfOrChild = true;
  }
  if (context.role === "counsellor" && reportType === "crm") resolved.assignedLeadOnly = true;
  return { scope, resolved };
}

async function validateAction(models, context, actionType, rawPayload) {
  const definition = ACTIONS[actionType];
  if (!definition) throw Object.assign(new Error("Unknown Part 134 report action."), { code: "UNKNOWN_REPORT_ACTION", httpStatus: 404 });
  if (!definition.roles.includes(context.role)) throw Object.assign(new Error(`${context.role} cannot use ${actionType}.`), { code: "REPORT_ACTION_ROLE_DENIED", httpStatus: 403 });
  const payload = normalizePayload(rawPayload);
  const missing = definition.required.filter(field => !payload[field]);
  if (missing.length) throw Object.assign(new Error(`Required fields missing: ${missing.join(", ")}`), { code: "REPORT_FIELDS_REQUIRED", httpStatus: 400, missingFields: missing });
  validateDates(payload);
  if (definition.reportType) await resolveScope(context, definition.reportType, payload);
  if (definition.exportFormat) {
    const report = await models.Report.findOne({ instituteId: context.instituteId, reportId: payload.reportId, status: "active" });
    if (!report) throw Object.assign(new Error("Active report snapshot not found."), { code: "REPORT_NOT_FOUND", httpStatus: 404 });
    if (context.role !== "institute_owner" && report.generatedByUserId !== context.userId) throw Object.assign(new Error("Non-owner can export only their own report."), { code: "REPORT_EXPORT_ACCESS_DENIED", httpStatus: 403 });
  }
  if (actionType === "reports.export.revoke") {
    const row = await models.Export.findOne({ instituteId: context.instituteId, exportId: payload.exportId });
    if (!row) throw Object.assign(new Error("Report export not found."), { code: "EXPORT_NOT_FOUND", httpStatus: 404 });
    if (context.role !== "institute_owner" && row.createdByUserId !== context.userId) throw Object.assign(new Error("Non-owner can revoke only their own export."), { code: "EXPORT_ACCESS_DENIED", httpStatus: 403 });
    if (row.status !== "active") throw Object.assign(new Error(`Export cannot be revoked from ${row.status}.`), { code: "EXPORT_STATE_CONFLICT", httpStatus: 409 });
  }
  return { definition, payload };
}
function fingerprint(context, actionType, payload) {
  return sha256(JSON.stringify(stable({ instituteId: context.instituteId, actorUserId: context.userId, actionType, payload })));
}
async function createPreview(models, context, actionType, rawPayload) {
  if (!dbReady()) throw Object.assign(new Error("MongoDB connection required."), { code: "DATABASE_REQUIRED", httpStatus: 503 });
  const { definition, payload } = await validateAction(models, context, actionType, rawPayload);
  const fp = fingerprint(context, actionType, payload);
  const reusable = await models.Action.findOne({ instituteId: context.instituteId, actorUserId: context.userId, fingerprint: fp, status: "preview_ready", previewExpiresAt: { $gt: new Date() } }).sort({ createdAt: -1 });
  if (reusable) return { action: reusable, reusedPreview: true };
  const recent = await models.Action.findOne({ instituteId: context.instituteId, actorUserId: context.userId, fingerprint: fp, status: "executed_native", executedAt: { $gt: new Date(Date.now() - DUPLICATE_WINDOW_MS) } }).sort({ executedAt: -1 });
  if (recent) throw Object.assign(new Error("Same report action was executed recently."), { code: "DUPLICATE_REPORT_ACTION", httpStatus: 409, existingAction: publicAction(recent) });
  const actionId = createId("reportaction");
  const action = await models.Action.create({
    actionId, instituteId: context.instituteId, actorUserId: context.userId, actorIdentityId: context.identityId,
    actorRole: context.role, actorDisplayName: context.displayName, actionType, actionLabel: definition.label,
    status: "preview_ready", payload, fingerprint: fp,
    confirmationDigest: sha256(confirmationText({ actionId, actionType })),
    previewExpiresAt: new Date(Date.now() + PREVIEW_TTL_MS),
  });
  await audit(models, context, action, "preview_created", "success");
  return { action, reusedPreview: false };
}

function dateRange(fromDate, toDate) {
  if (!fromDate && !toDate) return null;
  const query = {};
  if (fromDate) query.$gte = new Date(fromDate);
  if (toDate) query.$lte = new Date(toDate);
  return query;
}
function stringDateRange(fromDate, toDate) {
  if (!fromDate && !toDate) return null;
  const query = {};
  if (fromDate) query.$gte = fromDate.slice(0, 10);
  if (toDate) query.$lte = toDate.slice(0, 10);
  return query;
}
function applyScope(query, resolved) {
  if (resolved.branchIds.length) query.branchId = { $in: resolved.branchIds };
  if (resolved.classIds.length) query.classId = { $in: resolved.classIds };
  if (resolved.studentIds.length) query.studentId = { $in: resolved.studentIds };
  return query;
}
function columns(rows) {
  const result = [], seen = new Set();
  for (const row of rows) for (const key of Object.keys(row || {})) if (!seen.has(key)) { seen.add(key); result.push(key); }
  return result.slice(0, 80);
}
async function nameMap(instituteId, ids) {
  const Student = requiredModel("Part128StudentProfile");
  const rows = await Student.find({ instituteId, studentId: { $in: [...new Set(ids.filter(Boolean))] } }).lean();
  return Object.fromEntries(rows.map(row => [row.studentId, displayName(row) || row.studentId]));
}

async function reportExecutive(context, payload, scope) {
  const Branch = requiredModel("Part128Branch");
  const Course = requiredModel("Part128Course");
  const ClassBatch = requiredModel("Part128ClassBatch");
  const Teacher = requiredModel("Part128TeacherProfile");
  const Student = requiredModel("Part128StudentProfile");
  const Attendance = optionalModel("Part130AttendanceRecord");
  const Invoice = optionalModel("Part131Invoice");
  const Lead = optionalModel("Part132CrmLead");
  const Message = optionalModel("Part133Message");
  const branchFilter = { instituteId: context.instituteId, ...(scope.branchIds.length ? { branchId: { $in: scope.branchIds } } : {}) };
  const [branches, courses, classes, teachers, students, attendance, invoices, leads, messages] = await Promise.all([
    Branch.countDocuments({ ...branchFilter, status: { $ne: "disabled" } }),
    Course.countDocuments({ instituteId: context.instituteId, status: { $ne: "disabled" } }),
    ClassBatch.countDocuments({ ...branchFilter, status: { $ne: "disabled" } }),
    Teacher.countDocuments({ instituteId: context.instituteId, status: { $ne: "disabled" }, ...(scope.branchIds.length ? { branchIds: { $in: scope.branchIds } } : {}) }),
    Student.countDocuments({ ...branchFilter, status: { $ne: "disabled" } }),
    Attendance ? Attendance.find({ ...branchFilter, ...(stringDateRange(payload.fromDate, payload.toDate) ? { date: stringDateRange(payload.fromDate, payload.toDate) } : {}) }).select("status").limit(REPORT_ROW_LIMIT).lean() : [],
    Invoice ? Invoice.find({ ...branchFilter, ...(dateRange(payload.fromDate, payload.toDate) ? { issueDate: dateRange(payload.fromDate, payload.toDate) } : {}) }).select("amount outstandingAmount status").limit(REPORT_ROW_LIMIT).lean() : [],
    Lead ? Lead.find({ ...branchFilter, ...(dateRange(payload.fromDate, payload.toDate) ? { createdAt: dateRange(payload.fromDate, payload.toDate) } : {}) }).select("stage status").limit(REPORT_ROW_LIMIT).lean() : [],
    Message ? Message.countDocuments({ instituteId: context.instituteId, ...(dateRange(payload.fromDate, payload.toDate) ? { createdAt: dateRange(payload.fromDate, payload.toDate) } : {}) }) : 0,
  ]);
  const presentLike = attendance.filter(row => ["present", "late"].includes(row.status)).length;
  const summary = {
    branches, courses, classes, teachers, students,
    attendanceRecords: attendance.length,
    attendancePresentLikePercent: attendance.length ? round(presentLike / attendance.length * 100) : 0,
    invoices: invoices.length,
    invoiceTotal: round(invoices.reduce((sum, row) => sum + safeNumber(row.amount), 0)),
    outstandingTotal: round(invoices.reduce((sum, row) => sum + safeNumber(row.outstandingAmount), 0)),
    leads: leads.length,
    admittedLeads: leads.filter(row => row.stage === "admitted").length,
    messages,
  };
  return { title: "Executive Overview", summary, rows: [summary] };
}

async function reportBranch(context, payload, scope) {
  const Branch = requiredModel("Part128Branch");
  const ClassBatch = requiredModel("Part128ClassBatch");
  const Teacher = requiredModel("Part128TeacherProfile");
  const Student = requiredModel("Part128StudentProfile");
  const Invoice = optionalModel("Part131Invoice");
  const Lead = optionalModel("Part132CrmLead");
  const branches = await Branch.find({ instituteId: context.instituteId, ...(scope.branchIds.length ? { branchId: { $in: scope.branchIds } } : {}), status: { $ne: "disabled" } }).lean();
  const rows = [];
  for (const branch of branches) {
    const branchId = branch.branchId;
    const [classes, teachers, students, invoices, leads] = await Promise.all([
      ClassBatch.countDocuments({ instituteId: context.instituteId, branchId, status: { $ne: "disabled" } }),
      Teacher.countDocuments({ instituteId: context.instituteId, branchIds: branchId, status: { $ne: "disabled" } }),
      Student.countDocuments({ instituteId: context.instituteId, branchId, status: { $ne: "disabled" } }),
      Invoice ? Invoice.find({ instituteId: context.instituteId, branchId, ...(dateRange(payload.fromDate, payload.toDate) ? { issueDate: dateRange(payload.fromDate, payload.toDate) } : {}) }).select("amount outstandingAmount").limit(REPORT_ROW_LIMIT).lean() : [],
      Lead ? Lead.countDocuments({ instituteId: context.instituteId, branchId, ...(dateRange(payload.fromDate, payload.toDate) ? { createdAt: dateRange(payload.fromDate, payload.toDate) } : {}) }) : 0,
    ]);
    rows.push({
      branchId,
      branchName: displayName(branch) || branchId,
      city: cleanText(branch.city || "", 120),
      classes, teachers, students,
      invoices: invoices.length,
      invoiceTotal: round(invoices.reduce((sum, row) => sum + safeNumber(row.amount), 0)),
      outstandingTotal: round(invoices.reduce((sum, row) => sum + safeNumber(row.outstandingAmount), 0)),
      leads,
    });
  }
  return {
    title: "Branch Overview",
    summary: {
      branchCount: rows.length,
      classes: rows.reduce((sum, row) => sum + row.classes, 0),
      teachers: rows.reduce((sum, row) => sum + row.teachers, 0),
      students: rows.reduce((sum, row) => sum + row.students, 0),
      invoiceTotal: round(rows.reduce((sum, row) => sum + row.invoiceTotal, 0)),
      outstandingTotal: round(rows.reduce((sum, row) => sum + row.outstandingTotal, 0)),
      leads: rows.reduce((sum, row) => sum + row.leads, 0),
    },
    rows,
  };
}

async function reportAttendance(context, payload, scope) {
  const Attendance = requiredModel("Part130AttendanceRecord");
  const query = applyScope({ instituteId: context.instituteId }, scope);
  if (stringDateRange(payload.fromDate, payload.toDate)) query.date = stringDateRange(payload.fromDate, payload.toDate);
  const source = await Attendance.find(query).sort({ date: -1, studentId: 1 }).limit(REPORT_ROW_LIMIT + 1).lean();
  const names = await nameMap(context.instituteId, source.map(row => row.studentId));
  const rows = source.slice(0, REPORT_ROW_LIMIT).map(row => ({
    date: row.date, branchId: row.branchId, classId: row.classId,
    studentId: row.studentId, studentName: names[row.studentId] || row.studentId,
    status: row.status,
  }));
  const present = rows.filter(row => row.status === "present").length;
  const late = rows.filter(row => row.status === "late").length;
  const absent = rows.filter(row => row.status === "absent").length;
  const excused = rows.filter(row => row.status === "excused").length;
  return {
    title: "Attendance Report",
    summary: {
      totalRecords: rows.length, present, late, absent, excused,
      presentLikePercent: rows.length ? round((present + late) / rows.length * 100) : 0,
    },
    rows,
    truncated: source.length > REPORT_ROW_LIMIT,
  };
}

async function reportAcademic(context, payload, scope) {
  const Mark = requiredModel("Part130ExamMark");
  const Exam = requiredModel("Part130Exam");
  const markQuery = applyScope({ instituteId: context.instituteId }, scope);
  const marks = await Mark.find(markQuery).limit(REPORT_ROW_LIMIT + 1).lean();
  const examIds = [...new Set(marks.map(row => row.examId).filter(Boolean))];
  const examQuery = { instituteId: context.instituteId, examId: { $in: examIds } };
  if (dateRange(payload.fromDate, payload.toDate)) examQuery.examDate = dateRange(payload.fromDate, payload.toDate);
  const exams = await Exam.find(examQuery).lean();
  const examMap = Object.fromEntries(exams.map(row => [row.examId, row]));
  const filtered = marks.filter(row => examMap[row.examId]).slice(0, REPORT_ROW_LIMIT);
  const names = await nameMap(context.instituteId, filtered.map(row => row.studentId));
  const rows = filtered.map(row => ({
    examId: row.examId,
    examTitle: cleanText(examMap[row.examId]?.title || row.examId, 180),
    examDate: safeDate(examMap[row.examId]?.examDate),
    subject: cleanText(examMap[row.examId]?.subject || "", 120),
    classId: row.classId,
    studentId: row.studentId,
    studentName: names[row.studentId] || row.studentId,
    marksObtained: round(row.marksObtained),
    maxMarks: round(row.maxMarks),
    percentage: round(row.percentage),
    grade: cleanText(row.grade || "", 20),
  }));
  return {
    title: "Academic Performance Report",
    summary: {
      markRecords: rows.length,
      exams: new Set(rows.map(row => row.examId)).size,
      students: new Set(rows.map(row => row.studentId)).size,
      averagePercentage: rows.length ? round(rows.reduce((sum, row) => sum + row.percentage, 0) / rows.length) : 0,
      passLikeCount: rows.filter(row => row.percentage >= 35).length,
    },
    rows,
    truncated: marks.length > REPORT_ROW_LIMIT,
  };
}

async function reportFinance(context, payload, scope) {
  const Invoice = requiredModel("Part131Invoice");
  const Receipt = requiredModel("Part131ManualReceipt");
  const query = applyScope({ instituteId: context.instituteId }, scope);
  if (dateRange(payload.fromDate, payload.toDate)) query.issueDate = dateRange(payload.fromDate, payload.toDate);
  const invoices = await Invoice.find(query).sort({ issueDate: -1 }).limit(REPORT_ROW_LIMIT + 1).lean();
  const selected = invoices.slice(0, REPORT_ROW_LIMIT);
  const receipts = await Receipt.find({
    instituteId: context.instituteId,
    invoiceId: { $in: selected.map(row => row.invoiceId) },
    status: { $in: ["active", "correction_requested"] },
  }).select("invoiceId amount").limit(REPORT_ROW_LIMIT).lean();
  const receiptTotals = {};
  for (const receipt of receipts) receiptTotals[receipt.invoiceId] = safeNumber(receiptTotals[receipt.invoiceId]) + safeNumber(receipt.amount);
  const names = await nameMap(context.instituteId, selected.map(row => row.studentId));
  const rows = selected.map(row => ({
    invoiceId: row.invoiceId, invoiceNumber: row.invoiceNumber,
    branchId: row.branchId, studentId: row.studentId,
    studentName: names[row.studentId] || row.studentId,
    issueDate: safeDate(row.issueDate), dueDate: safeDate(row.dueDate),
    description: cleanText(row.description || "", 240),
    amount: round(row.amount), paidAmount: round(row.paidAmount),
    recordedManualOfflineTotal: round(receiptTotals[row.invoiceId] || 0),
    outstandingAmount: round(row.outstandingAmount), status: row.status,
  }));
  return {
    title: "Fees and Finance Report",
    summary: {
      invoices: rows.length,
      invoiceTotal: round(rows.reduce((sum, row) => sum + row.amount, 0)),
      paidAmount: round(rows.reduce((sum, row) => sum + row.paidAmount, 0)),
      outstandingAmount: round(rows.reduce((sum, row) => sum + row.outstandingAmount, 0)),
      paidInvoices: rows.filter(row => row.status === "paid").length,
      overdueInvoices: rows.filter(row => row.status === "overdue").length,
      liveSettlementVerified: false,
    },
    rows,
    truncated: invoices.length > REPORT_ROW_LIMIT,
  };
}

async function reportCrm(context, payload, scope) {
  const Lead = requiredModel("Part132CrmLead");
  const FollowUp = requiredModel("Part132CrmFollowUp");
  const Admission = requiredModel("Part132Admission");
  const query = { instituteId: context.instituteId };
  if (scope.branchIds.length) query.branchId = { $in: scope.branchIds };
  if (scope.assignedLeadOnly) query.assignedCounsellorId = { $in: [context.identityId, context.userId] };
  if (dateRange(payload.fromDate, payload.toDate)) query.createdAt = dateRange(payload.fromDate, payload.toDate);
  const leads = await Lead.find(query).sort({ createdAt: -1 }).limit(REPORT_ROW_LIMIT + 1).lean();
  const selected = leads.slice(0, REPORT_ROW_LIMIT);
  const ids = selected.map(row => row.leadId);
  const [followups, admissions] = await Promise.all([
    FollowUp.find({ instituteId: context.instituteId, leadId: { $in: ids } }).select("leadId status").limit(REPORT_ROW_LIMIT).lean(),
    Admission.find({ instituteId: context.instituteId, leadId: { $in: ids } }).select("leadId admissionNumber status").limit(REPORT_ROW_LIMIT).lean(),
  ]);
  const pending = {};
  for (const row of followups) if (row.status === "scheduled") pending[row.leadId] = (pending[row.leadId] || 0) + 1;
  const admissionMap = Object.fromEntries(admissions.map(row => [row.leadId, row]));
  const rows = selected.map(row => ({
    leadId: row.leadId, branchId: row.branchId,
    studentName: cleanText(row.studentName || "", 180),
    source: cleanText(row.source || "", 100),
    stage: row.stage, priority: row.priority,
    assignedCounsellorId: row.assignedCounsellorId || "",
    consentToContact: Boolean(row.consentToContact),
    doNotContact: Boolean(row.doNotContact),
    nextFollowUpAt: safeDate(row.nextFollowUpAt),
    pendingFollowUps: pending[row.leadId] || 0,
    admissionNumber: admissionMap[row.leadId]?.admissionNumber || "",
    admissionStatus: admissionMap[row.leadId]?.status || "",
    status: row.status,
  }));
  const admitted = rows.filter(row => row.admissionNumber).length;
  return {
    title: "Admissions and CRM Report",
    summary: {
      leads: rows.length,
      activeLeads: rows.filter(row => row.status === "active").length,
      qualifiedLeads: rows.filter(row => row.stage === "qualified").length,
      admissions: admitted,
      conversionRatePercent: rows.length ? round(admitted / rows.length * 100) : 0,
      doNotContactCount: rows.filter(row => row.doNotContact).length,
      pendingFollowUps: rows.reduce((sum, row) => sum + row.pendingFollowUps, 0),
    },
    rows,
    truncated: leads.length > REPORT_ROW_LIMIT,
  };
}

async function reportCommunication(context, payload, scope) {
  const Delivery = requiredModel("Part133Delivery");
  const Message = requiredModel("Part133Message");
  const query = { instituteId: context.instituteId };
  if (scope.branchIds.length) query.branchId = { $in: scope.branchIds };
  if (dateRange(payload.fromDate, payload.toDate)) query.createdAt = dateRange(payload.fromDate, payload.toDate);
  if (["teacher", "accountant", "counsellor"].includes(context.role)) {
    const messages = await Message.find({ instituteId: context.instituteId, createdByUserId: context.userId }).select("messageId").lean();
    query.messageId = { $in: messages.map(row => row.messageId) };
  }
  const source = await Delivery.find(query).sort({ createdAt: -1 }).limit(REPORT_ROW_LIMIT + 1).lean();
  const rows = source.slice(0, REPORT_ROW_LIMIT).map(row => ({
    deliveryId: row.deliveryId, messageId: row.messageId, sourceType: row.sourceType,
    recipientRole: row.recipientRole, branchId: row.branchId, studentId: row.studentId,
    channel: row.channel, addressMasked: row.addressMasked || "", status: row.status,
    attempts: safeNumber(row.attempts), providerName: cleanText(row.providerName || "", 100),
    createdAt: safeDate(row.createdAt), deliveredAt: safeDate(row.deliveredAt), readAt: safeDate(row.readAt),
  }));
  return {
    title: "Communication Delivery Report",
    summary: {
      deliveries: rows.length,
      deliveredOrAccepted: rows.filter(row => ["delivered_in_app", "provider_accepted"].includes(row.status)).length,
      failed: rows.filter(row => row.status === "failed").length,
      skipped: rows.filter(row => String(row.status).startsWith("skipped_")).length,
      inApp: rows.filter(row => row.channel === "in_app").length,
      email: rows.filter(row => row.channel === "email").length,
      sms: rows.filter(row => row.channel === "sms").length,
      whatsapp: rows.filter(row => row.channel === "whatsapp").length,
      providerAcceptedMeansFinalDelivery: false,
    },
    rows,
    truncated: source.length > REPORT_ROW_LIMIT,
  };
}

async function reportStudent(context, payload, scope) {
  const studentId = scope.studentIds[0] || payload.studentId;
  if (!studentId) throw Object.assign(new Error("studentId required for Student 360."), { code: "STUDENT_ID_REQUIRED", httpStatus: 400 });
  const student = await requireStudent(context, studentId);
  const Attendance = requiredModel("Part130AttendanceRecord");
  const Mark = requiredModel("Part130ExamMark");
  const Exam = requiredModel("Part130Exam");
  const Invoice = requiredModel("Part131Invoice");
  const [attendance, marks, invoices] = await Promise.all([
    Attendance.find({ instituteId: context.instituteId, studentId, ...(stringDateRange(payload.fromDate, payload.toDate) ? { date: stringDateRange(payload.fromDate, payload.toDate) } : {}) }).sort({ date: -1 }).limit(REPORT_ROW_LIMIT).lean(),
    Mark.find({ instituteId: context.instituteId, studentId }).limit(REPORT_ROW_LIMIT).lean(),
    Invoice.find({ instituteId: context.instituteId, studentId, ...(dateRange(payload.fromDate, payload.toDate) ? { issueDate: dateRange(payload.fromDate, payload.toDate) } : {}) }).sort({ issueDate: -1 }).limit(REPORT_ROW_LIMIT).lean(),
  ]);
  const exams = await Exam.find({ instituteId: context.instituteId, examId: { $in: [...new Set(marks.map(row => row.examId))] }, ...(dateRange(payload.fromDate, payload.toDate) ? { examDate: dateRange(payload.fromDate, payload.toDate) } : {}) }).lean();
  const examMap = Object.fromEntries(exams.map(row => [row.examId, row]));
  const rows = [
    ...attendance.map(row => ({ recordType: "attendance", date: row.date, title: "Attendance", status: row.status, value: row.status, referenceId: row.attendanceId })),
    ...marks.filter(row => examMap[row.examId]).map(row => ({ recordType: "academic", date: safeDate(examMap[row.examId]?.examDate), title: cleanText(examMap[row.examId]?.title || row.examId, 180), status: row.grade || "", value: `${round(row.marksObtained)}/${round(row.maxMarks)} (${round(row.percentage)}%)`, referenceId: row.markId })),
    ...invoices.map(row => ({ recordType: "finance", date: safeDate(row.issueDate), title: cleanText(row.description || row.invoiceNumber, 180), status: row.status, value: `Amount ${round(row.amount)} • Outstanding ${round(row.outstandingAmount)}`, referenceId: row.invoiceId })),
  ].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, REPORT_ROW_LIMIT);
  const presentLike = attendance.filter(row => ["present", "late"].includes(row.status)).length;
  return {
    title: `Student 360 — ${displayName(student) || studentId}`,
    summary: {
      studentId, studentName: displayName(student) || studentId,
      branchId: student.branchId || "", classId: student.classId || "", courseId: student.courseId || "",
      attendanceRecords: attendance.length,
      attendancePresentLikePercent: attendance.length ? round(presentLike / attendance.length * 100) : 0,
      academicRecords: marks.length,
      averagePercentage: marks.length ? round(marks.reduce((sum, row) => sum + safeNumber(row.percentage), 0) / marks.length) : 0,
      invoices: invoices.length,
      totalOutstanding: round(invoices.reduce((sum, row) => sum + safeNumber(row.outstandingAmount), 0)),
    },
    rows,
    truncated: false,
  };
}
async function generateData(context, reportType, payload, scope) {
  if (reportType === "executive") return reportExecutive(context, payload, scope);
  if (reportType === "branch") return reportBranch(context, payload, scope);
  if (reportType === "attendance") return reportAttendance(context, payload, scope);
  if (reportType === "academic") return reportAcademic(context, payload, scope);
  if (reportType === "finance") return reportFinance(context, payload, scope);
  if (reportType === "crm") return reportCrm(context, payload, scope);
  if (reportType === "communication") return reportCommunication(context, payload, scope);
  if (reportType === "student") return reportStudent(context, payload, scope);
  throw Object.assign(new Error("Unsupported report type."), { code: "REPORT_TYPE_UNSUPPORTED", httpStatus: 400 });
}

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}
function makeCsv(report) {
  const cols = report.columns || [];
  return `\uFEFF${[cols.map(csvCell).join(","), ...(report.rows || []).map(row => cols.map(col => csvCell(row?.[col])).join(","))].join("\r\n")}`;
}
function escapeHtml(value = "") {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]);
}
function makeHtml(report) {
  const cols = report.columns || [];
  const summary = Object.entries(report.summary || {}).map(([key, value]) => `<tr><th>${escapeHtml(key)}</th><td>${escapeHtml(typeof value === "object" ? JSON.stringify(value) : value)}</td></tr>`).join("");
  const head = cols.map(col => `<th>${escapeHtml(col)}</th>`).join("");
  const body = (report.rows || []).map(row => `<tr>${cols.map(col => `<td>${escapeHtml(typeof row?.[col] === "object" ? JSON.stringify(row?.[col]) : row?.[col])}</td>`).join("")}</tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(report.title)}</title><style>body{font-family:Arial,sans-serif;margin:24px;color:#111}table{width:100%;border-collapse:collapse;margin:14px 0;font-size:12px}th,td{border:1px solid #bbb;padding:6px;text-align:left;vertical-align:top}th{background:#eee}@media print{body{margin:8mm}}</style></head><body><h1>${escapeHtml(report.title)}</h1><p>Generated ${escapeHtml(report.generatedAt)} • Rows ${escapeHtml(report.rowCount)}</p><h2>Summary</h2><table>${summary}</table><h2>Rows</h2><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
}
function makeJson(report) {
  return JSON.stringify({
    schemaVersion: 1, reportId: report.reportId, reportType: report.reportType,
    title: report.title, filters: report.filters, scopeSummary: report.scopeSummary,
    generatedAt: report.generatedAt, rowCount: report.rowCount, truncated: report.truncated,
    summary: report.summary, columns: report.columns, rows: report.rows,
  }, null, 2);
}
function safeFileName(value = "report") {
  return String(value || "report").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "report";
}
function exportMeta(format) {
  if (format === "csv") return { extension: "csv", mimeType: "text/csv; charset=utf-8" };
  if (format === "json") return { extension: "json", mimeType: "application/json; charset=utf-8" };
  return { extension: "html", mimeType: "text/html; charset=utf-8" };
}
function exportContent(format, report) {
  if (format === "csv") return makeCsv(report);
  if (format === "json") return makeJson(report);
  if (format === "html") return makeHtml(report);
  throw Object.assign(new Error("Unsupported export format."), { code: "EXPORT_FORMAT_UNSUPPORTED", httpStatus: 400 });
}

async function executeAction(models, context, action) {
  const definition = ACTIONS[action.actionType];
  const payload = action.payload || {};
  if (definition.reportType) {
    const { resolved } = await resolveScope(context, definition.reportType, payload);
    const generated = await generateData(context, definition.reportType, payload, resolved);
    const rows = (generated.rows || []).slice(0, REPORT_ROW_LIMIT);
    const report = await models.Report.create({
      reportId: createId("report"),
      instituteId: context.instituteId,
      reportType: definition.reportType,
      title: generated.title || REPORT_TYPES[definition.reportType].label,
      filters: payload,
      scopeSummary: {
        role: context.role,
        branchIds: resolved.branchIds,
        classIds: resolved.classIds,
        studentIds: resolved.studentIds,
        assignedLeadOnly: resolved.assignedLeadOnly,
        selfOrLinkedChild: resolved.selfOrChild,
      },
      columns: columns(rows),
      rows,
      summary: generated.summary || {},
      rowCount: rows.length,
      truncated: Boolean(generated.truncated || (generated.rows || []).length > REPORT_ROW_LIMIT),
      generatedByUserId: context.userId,
      generatedByRole: context.role,
      generatedAt: new Date(),
      status: "active",
      actionId: action.actionId,
    });
    return { entity: "report_snapshot", record: recordObject(report), supportedExports: ["csv", "json", "html"], unsupportedExports: ["pdf", "xlsx"] };
  }
  if (definition.exportFormat) {
    const report = await models.Report.findOne({ instituteId: context.instituteId, reportId: payload.reportId, status: "active" }).lean();
    const content = exportContent(definition.exportFormat, report);
    const byteSize = Buffer.byteLength(content, "utf8");
    if (byteSize > EXPORT_BYTE_LIMIT) throw Object.assign(new Error("Export exceeds 2 MB. Use narrower filters."), { code: "EXPORT_TOO_LARGE", httpStatus: 413 });
    const meta = exportMeta(definition.exportFormat);
    const row = await models.Export.create({
      exportId: createId("export"),
      instituteId: context.instituteId,
      reportId: report.reportId,
      reportType: report.reportType,
      format: definition.exportFormat,
      fileName: `${safeFileName(report.title)}-${report.reportId.slice(-8)}.${meta.extension}`,
      mimeType: meta.mimeType,
      content,
      byteSize,
      expiresAt: new Date(Date.now() + EXPORT_LIFETIME_MS),
      status: "active",
      createdByUserId: context.userId,
      createdByRole: context.role,
      actionId: action.actionId,
    });
    return { entity: "report_export", record: recordObject(row), ticketEndpoint: `/api/part134/exports/${row.exportId}/ticket`, oneTimeTicketRequired: true };
  }
  if (action.actionType === "reports.export.revoke") {
    const row = await models.Export.findOne({ instituteId: context.instituteId, exportId: payload.exportId });
    row.status = "revoked";
    row.revokeReason = payload.reason || "";
    row.revokedAt = new Date();
    row.ticketHash = "";
    row.ticketExpiresAt = null;
    row.ticketUsedAt = null;
    await row.save();
    return { entity: "report_export_revocation", record: recordObject(row) };
  }
  throw Object.assign(new Error("No executor for this Part 134 action."), { code: "REPORT_EXECUTOR_MISSING", httpStatus: 500 });
}
async function confirmAndExecute(models, context, actionId, exactConfirmation) {
  const action = await models.Action.findOne({ actionId, instituteId: context.instituteId, actorUserId: context.userId });
  if (!action) throw Object.assign(new Error("Report action not found."), { code: "REPORT_ACTION_NOT_FOUND", httpStatus: 404 });
  if (action.status === "executed_native") return { action, idempotentReplay: true };
  if (action.status !== "preview_ready") throw Object.assign(new Error(`Action cannot execute from ${action.status}.`), { code: "REPORT_ACTION_STATE_CONFLICT", httpStatus: 409 });
  if (new Date(action.previewExpiresAt).getTime() <= Date.now()) {
    action.status = "expired"; await action.save();
    throw Object.assign(new Error("Report preview expired."), { code: "REPORT_PREVIEW_EXPIRED", httpStatus: 410 });
  }
  if (sha256(String(exactConfirmation ?? "").trim()) !== action.confirmationDigest) throw Object.assign(new Error(`Exact confirmation required: ${confirmationText(action)}`), { code: "EXACT_CONFIRMATION_REQUIRED", httpStatus: 400 });
  await validateAction(models, context, action.actionType, action.payload);
  const claimed = await models.Action.findOneAndUpdate({ _id: action._id, status: "preview_ready" }, { status: "executing" }, { new: true });
  if (!claimed) throw Object.assign(new Error("Another request is executing this action."), { code: "REPORT_EXECUTION_IN_PROGRESS", httpStatus: 409 });
  try {
    const result = await executeAction(models, context, claimed);
    claimed.status = "executed_native"; claimed.executedAt = new Date(); claimed.result = result; claimed.failureCode = ""; claimed.failureMessage = "";
    await claimed.save();
    await audit(models, context, claimed, "action_executed", "native_success", { entity: result.entity });
    return { action: claimed, idempotentReplay: false };
  } catch (error) {
    claimed.status = "failed"; claimed.failureCode = cleanText(error.code || "REPORT_EXECUTION_FAILED", 120); claimed.failureMessage = cleanText(error.message || "Report action failed.", 500);
    await claimed.save();
    await audit(models, context, claimed, "action_executed", "failed", { failureCode: claimed.failureCode });
    error.action = claimed;
    throw error;
  }
}
function extractKeyValues(command) {
  const result = {};
  const regex = /([a-zA-Z][a-zA-Z0-9_]*)\s*=\s*("[^"]*"|'[^']*'|[^\s]+)/g;
  let match;
  while ((match = regex.exec(command))) {
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    result[match[1]] = value;
  }
  return result;
}
function parseCommand(command = "") {
  const text = cleanLong(command, 5000);
  if (SENSITIVE.test(text)) throw Object.assign(new Error("Password, OTP, Aadhaar, PAN, bank ya secret data report command me mat likhiye."), { code: "SENSITIVE_COMMAND_BLOCKED", httpStatus: 400 });
  if (DESTRUCTIVE.test(text)) throw Object.assign(new Error("Part 134 destructive report commands support nahi karta."), { code: "DESTRUCTIVE_COMMAND_BLOCKED", httpStatus: 400 });
  if (BLOCKED_FORMAT.test(text)) throw Object.assign(new Error("Part 134 me PDF/XLSX export nahi hai. CSV, JSON ya print-ready HTML use karein."), { code: "EXPORT_FORMAT_NOT_SUPPORTED", httpStatus: 400 });
  const match = PATTERNS.find(([, pattern]) => pattern.test(text));
  if (!match) throw Object.assign(new Error("Report action samajh nahi aaya. Catalog example use karein."), { code: "REPORT_COMMAND_NOT_RECOGNISED", httpStatus: 400 });
  return { actionType: match[0], payload: extractKeyValues(text) };
}
function canAccess(context, createdByUserId) { return context.role === "institute_owner" || createdByUserId === context.userId; }
async function expireExports(models) {
  await models.Export.updateMany({ status: "active", expiresAt: { $lte: new Date() } }, { $set: { status: "expired", ticketHash: "", ticketExpiresAt: null, ticketUsedAt: null } });
}

export function registerPart134VaniReportsExports({ app } = {}) {
  if (!app || typeof app.get !== "function" || typeof app.post !== "function") throw new Error("Part 134 registration failed: Express app required.");
  if (app.locals.part134ReportsRegistered) return;
  app.locals.part134ReportsRegistered = true;
  const models = defineModels();

  app.get(["/reports-vani", "/exports-vani", "/part134"], (req, res) => res.sendFile(path.join(frontendDir, "naxora-reports-vani.html")));
  app.get("/naxora-reports-vani.css", (req, res) => res.type("text/css").sendFile(path.join(frontendDir, "naxora-reports-vani.css")));
  app.get("/naxora-reports-vani.js", (req, res) => res.type("application/javascript").sendFile(path.join(frontendDir, "naxora-reports-vani.js")));
  app.get("/naxora-part134-global-vani-bridge.js", (req, res) => res.type("application/javascript").sendFile(path.join(frontendDir, "naxora-part134-global-vani-bridge.js")));

  app.get("/api/part134/status", (req, res) => res.json({
    success: true, part: PART_NUMBER, name: PART_NAME, status: "vani_reports_exports_active", page: "/reports-vani",
    actionCount: Object.keys(ACTIONS).length, reportTypes: Object.keys(REPORT_TYPES),
    csvExport: true, jsonExport: true, printReadyHtmlExport: true, pdfExport: false, xlsxExport: false,
    exportExpiryHours: 24, oneTimeDownloadTicketMinutes: 5, rowLimit: REPORT_ROW_LIMIT,
    allFeatureVaniComplete: false, targetFinalAcceptancePart: 136,
    nextPart: 135, nextPartName: "VANI Conversational Workflow Engine",
  }));
  app.get("/api/part134/security-policy", (req, res) => res.json({
    success: true, part: PART_NUMBER, instituteIsolation: true, roleBranchClassChildScope: true,
    assignedCounsellorLeadScope: true, previewRequired: true, exactConfirmationRequired: true,
    maximumDateRangeDays: MAX_DATE_RANGE_DAYS, maximumReportRows: REPORT_ROW_LIMIT,
    maximumExportBytes: EXPORT_BYTE_LIMIT, exportLifetimeHours: 24,
    oneTimeDownloadTicketMinutes: 5, passwordsOtpSecretsExcluded: true,
    crmPhoneEmailExcluded: true, paymentReferencesExcluded: true,
    pdfXlsxNotClaimed: true, exportContentNotReturnedInHistory: true,
  }));
  app.get("/api/part134/catalog", (req, res) => {
    const examples = {
      "reports.executive.generate": 'executive overview report generate branchId=BRANCH_ID fromDate=2026-08-01 toDate=2026-08-31',
      "reports.branch.generate": 'branch overview report generate branchId=BRANCH_ID',
      "reports.attendance.generate": 'attendance report generate classId=CLASS_ID fromDate=2026-08-01 toDate=2026-08-31',
      "reports.academic.generate": 'academic report generate studentId=STUDENT_ID',
      "reports.finance.generate": 'finance report generate branchId=BRANCH_ID',
      "reports.crm.generate": 'crm report generate branchId=BRANCH_ID',
      "reports.communication.generate": 'communication delivery report generate branchId=BRANCH_ID',
      "reports.student.generate": 'student 360 report generate studentId=STUDENT_ID',
      "reports.export.csv": 'report export csv reportId=REPORT_ID',
      "reports.export.json": 'report export json reportId=REPORT_ID',
      "reports.export.html": 'report export html reportId=REPORT_ID',
      "reports.export.revoke": 'report export revoke exportId=EXPORT_ID reason="No longer required"',
    };
    res.json({ success: true, part: PART_NUMBER, supportedExportFormats: ["csv", "json", "html"], unsupportedExportFormats: ["pdf", "xlsx"], actions: Object.entries(ACTIONS).map(([actionType, definition]) => ({ actionType, label: definition.label, roles: definition.roles, requiredFields: definition.required, reportType: definition.reportType || null, exportFormat: definition.exportFormat || null, example: examples[actionType] })) });
  });
  app.get("/api/part134/demo", (req, res) => res.json({
    success: true, part: PART_NUMBER,
    flow: ["Login and role scope", "Preview", "Exact confirmation", "Report snapshot", "CSV/JSON/HTML export", "One-time download ticket", "Audit"],
    notSupported: ["PDF", "XLSX", "Unscoped dump", "Passwords, OTPs, full CRM contacts or payment references", "All-feature VANI completion before Part 136 acceptance"],
  }));

  app.post("/api/part134/actions/preview", authenticated, async (req, res) => {
    try {
      const result = await createPreview(models, req.part134Context, cleanText(req.body?.actionType, 140), req.body?.payload || {});
      res.json({ success: true, part: PART_NUMBER, action: publicAction(result.action), reusedPreview: result.reusedPreview, replyText: `${result.action.actionLabel} preview ready. Exact confirmation required hai.` });
    } catch (error) {
      res.status(error.httpStatus || 500).json({ success: false, part: PART_NUMBER, code: error.code || "REPORT_PREVIEW_FAILED", message: error.message, missingFields: error.missingFields || [], existingAction: error.existingAction || null, modelName: error.modelName || "" });
    }
  });
  app.post("/api/part134/vani/command", authenticated, async (req, res) => {
    try {
      const parsed = parseCommand(req.body?.command || "");
      const result = await createPreview(models, req.part134Context, parsed.actionType, parsed.payload);
      res.json({ success: true, part: PART_NUMBER, interpretedActionType: parsed.actionType, interpretedPayload: result.action.payload, action: publicAction(result.action), reusedPreview: result.reusedPreview, replyText: `${result.action.actionLabel} ka preview ready hai.`, openModuleKey: "reports-vani" });
    } catch (error) {
      res.status(error.httpStatus || 500).json({ success: false, part: PART_NUMBER, code: error.code || "REPORT_COMMAND_FAILED", message: error.message, missingFields: error.missingFields || [], modelName: error.modelName || "", openModuleKey: "reports-vani" });
    }
  });
  app.post("/api/part134/actions/:actionId/confirm", authenticated, async (req, res) => {
    try {
      const result = await confirmAndExecute(models, req.part134Context, cleanId(req.params.actionId), req.body?.confirmationText);
      res.json({ success: true, part: PART_NUMBER, action: publicAction(result.action), idempotentReplay: result.idempotentReplay, replyText: result.idempotentReplay ? "Ye reports action pehle execute ho chuka hai." : "Reports action successfully execute ho gaya." });
    } catch (error) {
      res.status(error.httpStatus || 500).json({ success: false, part: PART_NUMBER, code: error.code || "REPORT_EXECUTION_FAILED", message: error.message, action: error.action ? publicAction(error.action) : null, modelName: error.modelName || "" });
    }
  });
  app.post("/api/part134/actions/:actionId/cancel", authenticated, async (req, res) => {
    const action = await models.Action.findOne({ actionId: cleanId(req.params.actionId), instituteId: req.part134Context.instituteId, actorUserId: req.part134Context.userId });
    if (!action) return res.status(404).json({ success: false, part: PART_NUMBER, code: "REPORT_ACTION_NOT_FOUND", message: "Report action not found." });
    if (action.status === "preview_ready") { action.status = "cancelled"; action.cancelledAt = new Date(); await action.save(); }
    return res.json({ success: true, part: PART_NUMBER, action: publicAction(action) });
  });
  app.get("/api/part134/actions", authenticated, async (req, res) => {
    const rows = await models.Action.find({ instituteId: req.part134Context.instituteId, ...(req.part134Context.role === "institute_owner" ? {} : { actorUserId: req.part134Context.userId }) }).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, part: PART_NUMBER, actions: rows.map(publicAction) });
  });
  app.get("/api/part134/reports", authenticated, async (req, res) => {
    const rows = await models.Report.find({ instituteId: req.part134Context.instituteId, status: "active", ...(req.part134Context.role === "institute_owner" ? {} : { generatedByUserId: req.part134Context.userId }) }).sort({ generatedAt: -1 }).limit(100).lean();
    res.json({ success: true, part: PART_NUMBER, reports: rows.map(recordObject) });
  });
  app.get("/api/part134/reports/:reportId", authenticated, async (req, res) => {
    const row = await models.Report.findOne({ instituteId: req.part134Context.instituteId, reportId: cleanId(req.params.reportId), status: "active" }).lean();
    if (!row || !canAccess(req.part134Context, row.generatedByUserId)) return res.status(404).json({ success: false, part: PART_NUMBER, code: "REPORT_NOT_FOUND", message: "Report not found." });
    res.json({ success: true, part: PART_NUMBER, report: recordObject(row) });
  });
  app.get("/api/part134/exports", authenticated, async (req, res) => {
    await expireExports(models);
    const rows = await models.Export.find({ instituteId: req.part134Context.instituteId, ...(req.part134Context.role === "institute_owner" ? {} : { createdByUserId: req.part134Context.userId }) }).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ success: true, part: PART_NUMBER, exports: rows.map(recordObject) });
  });
  app.post("/api/part134/exports/:exportId/ticket", authenticated, async (req, res) => {
    await expireExports(models);
    const row = await models.Export.findOne({ instituteId: req.part134Context.instituteId, exportId: cleanId(req.params.exportId), status: "active", expiresAt: { $gt: new Date() } });
    if (!row || !canAccess(req.part134Context, row.createdByUserId)) return res.status(404).json({ success: false, part: PART_NUMBER, code: "EXPORT_NOT_FOUND", message: "Active export not found." });
    const ticket = crypto.randomBytes(32).toString("base64url");
    row.ticketHash = sha256(ticket); row.ticketExpiresAt = new Date(Date.now() + DOWNLOAD_TICKET_LIFETIME_MS); row.ticketUsedAt = null; await row.save();
    res.json({ success: true, part: PART_NUMBER, export: recordObject(row), downloadUrl: `/api/part134/download/${ticket}`, ticketExpiresAt: row.ticketExpiresAt, oneTimeTicket: true });
  });
  app.get("/api/part134/download/:ticket", async (req, res) => {
    const ticket = String(req.params.ticket || "");
    if (!/^[a-zA-Z0-9_-]{30,100}$/.test(ticket)) return res.status(404).send("Download ticket not found.");
    const now = new Date();
    const row = await models.Export.findOneAndUpdate(
      { ticketHash: sha256(ticket), status: "active", expiresAt: { $gt: now }, ticketExpiresAt: { $gt: now }, ticketUsedAt: null },
      { $set: { ticketUsedAt: now, lastDownloadedAt: now }, $inc: { downloadCount: 1 } },
      { new: true }
    ).select("+content");
    if (!row) return res.status(410).send("Download ticket expired, used, revoked or invalid.");
    res.setHeader("Content-Type", row.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${safeFileName(row.fileName)}"`);
    res.setHeader("Cache-Control", "no-store");
    res.send(row.content);
  });
}
