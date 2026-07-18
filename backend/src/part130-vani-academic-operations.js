import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const PART_NUMBER = 130;
const PART_NAME = "VANI Academic Operations";
const PREVIEW_TTL_MS = 30 * 60 * 1000;
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;
const MAX_BULK_STUDENTS = 100;
const ALL_ROLES = new Set([
  "institute_owner", "branch_manager", "teacher", "student",
  "parent", "accountant", "counsellor", "staff",
]);
const OWNER_ROLES = new Set(["institute_owner", "owner", "instituteowner"]);
const BRANCH_SCOPED_ROLES = new Set(["branch_manager", "staff"]);
const ACTION_DEFINITIONS = Object.freeze({
  "academic.timetable.create": {
    label: "Create Timetable Entry",
    roles: ["institute_owner", "branch_manager", "teacher"],
    requiredFields: ["classId", "subject", "dayOfWeek", "startTime", "endTime"],
    optionalFields: ["teacherId", "room", "status"],
    category: "Timetable",
  },
  "academic.timetable.update": {
    label: "Update Timetable Entry",
    roles: ["institute_owner", "branch_manager", "teacher"],
    requiredFields: ["timetableId"],
    optionalFields: ["subject", "dayOfWeek", "startTime", "endTime", "teacherId", "room", "status"],
    category: "Timetable",
  },
  "academic.attendance.bulk_mark": {
    label: "Bulk Mark Attendance",
    roles: ["institute_owner", "branch_manager", "teacher", "staff"],
    requiredFields: ["classId", "date", "attendanceEntries"],
    optionalFields: ["note"],
    category: "Attendance",
  },
  "academic.assignment.create": {
    label: "Create Academic Assignment",
    roles: ["institute_owner", "teacher"],
    requiredFields: ["classId", "title", "instructions", "dueDate"],
    optionalFields: ["subject", "maxMarks", "status"],
    category: "Assignments",
  },
  "academic.assignment.update": {
    label: "Update Academic Assignment",
    roles: ["institute_owner", "teacher"],
    requiredFields: ["assignmentId"],
    optionalFields: ["title", "instructions", "dueDate", "subject", "maxMarks", "status"],
    category: "Assignments",
  },
  "academic.assignment.review": {
    label: "Review Assignment Submission",
    roles: ["institute_owner", "teacher"],
    requiredFields: ["assignmentId", "studentId", "score"],
    optionalFields: ["feedback", "status"],
    category: "Assignments",
  },
  "academic.exam.create": {
    label: "Create Exam",
    roles: ["institute_owner", "branch_manager", "teacher"],
    requiredFields: ["classId", "title", "examDate", "maxMarks"],
    optionalFields: ["subject", "passingMarks", "status"],
    category: "Exams",
  },
  "academic.exam.update": {
    label: "Update Exam",
    roles: ["institute_owner", "branch_manager", "teacher"],
    requiredFields: ["examId"],
    optionalFields: ["title", "examDate", "maxMarks", "passingMarks", "subject", "status"],
    category: "Exams",
  },
  "academic.marks.bulk_record": {
    label: "Bulk Record Marks",
    roles: ["institute_owner", "branch_manager", "teacher"],
    requiredFields: ["examId", "markEntries"],
    optionalFields: ["remarks"],
    category: "Marks & Results",
  },
  "academic.result.publish": {
    label: "Publish Exam Result",
    roles: ["institute_owner", "branch_manager", "teacher"],
    requiredFields: ["examId"],
    optionalFields: ["message"],
    category: "Marks & Results",
  },
  "academic.progress.note.create": {
    label: "Create Student Progress Note",
    roles: ["institute_owner", "branch_manager", "teacher"],
    requiredFields: ["studentId", "title", "note"],
    optionalFields: ["classId", "category", "visibility"],
    category: "Student Progress",
  },
  "academic.progress.snapshot.generate": {
    label: "Generate Student Progress Snapshot",
    roles: ["institute_owner", "branch_manager", "teacher"],
    requiredFields: ["studentId"],
    optionalFields: ["classId"],
    category: "Student Progress",
  },
});

const ACTION_PATTERNS = Object.freeze([
  ["academic.attendance.bulk_mark", /(bulk|class|batch).*(attendance|hazri).*(mark|lagao|record)/i],
  ["academic.assignment.review", /(assignment|homework).*(review|check|score|marks)/i],
  ["academic.assignment.update", /(assignment|homework).*(update|edit|badlo)/i],
  ["academic.assignment.create", /(assignment|homework).*(create|banao|add)/i],
  ["academic.timetable.update", /(timetable|schedule).*(update|edit|badlo)/i],
  ["academic.timetable.create", /(timetable|schedule).*(create|banao|add)/i],
  ["academic.exam.update", /(exam|test).*(update|edit|badlo)/i],
  ["academic.exam.create", /(exam|test).*(create|banao|schedule|add)/i],
  ["academic.marks.bulk_record", /(marks|score).*(bulk|record|add|save)/i],
  ["academic.result.publish", /(result).*(publish|release|declare)/i],
  ["academic.progress.note.create", /(progress|student).*(note|remark|feedback).*(create|add|save|likho)/i],
  ["academic.progress.snapshot.generate", /(progress|student).*(summary|snapshot|report).*(generate|banao|dikhao)/i],
]);

const SENSITIVE_PATTERN = /(password|passcode|otp|cvv|upi\s*pin|api\s*key|secret|jwt|bank\s*account|card\s*number)/i;
const BLOCKED_PATTERN = /(delete permanently|drop database|purge|refund|transfer money|charge card|collect payment)/i;
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
function cleanIdList(value, max = MAX_BULK_STUDENTS) {
  const list = Array.isArray(value) ? value : String(value ?? "").split(/[|,;\n]/g);
  return [...new Set(list.map(cleanId).filter(Boolean))].slice(0, max);
}
function cleanDate(value = "", dateOnly = false) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const parsed = new Date(text.length === 10 ? `${text}T00:00:00.000Z` : text);
  if (Number.isNaN(parsed.getTime())) return "";
  return dateOnly ? parsed.toISOString().slice(0, 10) : parsed.toISOString();
}
function cleanNumber(value, min = 0, max = 1000000) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : null;
}
function normalizeRole(value = "") {
  const role = String(value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return ({ owner: "institute_owner", instituteowner: "institute_owner", branchmanager: "branch_manager", counselor: "counsellor", guardian: "parent", faculty: "teacher", learner: "student" })[role] || role;
}
function normalizeStatus(value = "", allowed = ["active", "inactive", "disabled"], fallback = allowed[0]) {
  const status = cleanText(value, 30).toLowerCase();
  return allowed.includes(status) ? status : fallback;
}
function normalizeAttendance(value = "") {
  const status = cleanText(value, 30).toLowerCase();
  const aliases = { p: "present", a: "absent", l: "late", e: "excused", present: "present", absent: "absent", late: "late", excused: "excused" };
  return aliases[status] || "";
}
function normalizeDay(value = "") {
  const day = cleanText(value, 20).toLowerCase();
  const aliases = { mon: "monday", tue: "tuesday", wed: "wednesday", thu: "thursday", fri: "friday", sat: "saturday", sun: "sunday" };
  return aliases[day] || day;
}
function normalizeTime(value = "") {
  const text = String(value ?? "").trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(text) ? text : "";
}
function dbReady() { return mongoose.connection?.readyState === 1; }
function sha256(value) { return crypto.createHash("sha256").update(String(value ?? "")).digest("hex"); }
function stableObject(value) {
  if (Array.isArray(value)) return value.map(stableObject);
  if (value && typeof value === "object") return Object.keys(value).sort().reduce((acc, key) => { acc[key] = stableObject(value[key]); return acc; }, {});
  return value;
}
function createId(prefix) { return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(5).toString("hex")}`; }
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
  const role = normalizeRole(payload.role || payload.userRole || payload.accountRole || payload.user?.role || "");
  if (!ALL_ROLES.has(role) && !OWNER_ROLES.has(role)) throw Object.assign(new Error("This login role is not supported by Part 130."), { code: "UNSUPPORTED_ROLE", httpStatus: 403 });
  const tokenInstituteId = cleanId(payload.instituteId || payload.institute_id || payload.user?.instituteId || payload.tenantId || "");
  const requested = cleanId(req.headers["x-naxora-institute-id"] || req.body?.instituteId || req.query?.instituteId || "");
  if (tokenInstituteId && requested && tokenInstituteId !== requested) throw Object.assign(new Error("Institute context mismatch."), { code: "INSTITUTE_CONTEXT_MISMATCH", httpStatus: 403 });
  const instituteId = tokenInstituteId || requested;
  if (!instituteId) throw Object.assign(new Error("Valid instituteId required."), { code: "INSTITUTE_ID_REQUIRED", httpStatus: 400 });
  const userId = cleanId(payload.userId || payload.identityId || payload.id || payload._id || payload.sub || "user");
  const identityId = cleanId(payload.identityId || payload.sub || userId);
  return {
    instituteId,
    userId,
    identityId,
    role: OWNER_ROLES.has(role) ? "institute_owner" : role,
    displayName: cleanText(payload.displayName || payload.name || payload.fullName || payload.email || role, 120),
    referenceIds: [...new Set([userId, identityId, payload.studentId, payload.teacherId, payload.profileId].map(cleanId).filter(Boolean))],
  };
}
function authenticated(req, res, next) {
  try { req.part130Context = actionContext(req); next(); }
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
    actionType: { type: String, enum: Object.keys(ACTION_DEFINITIONS), required: true, index: true },
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
    rollbackApplied: { type: Boolean, default: false },
  }, { timestamps: true, strict: true });
  actionSchema.index({ instituteId: 1, actorUserId: 1, fingerprint: 1, createdAt: -1 });

  const timetableSchema = new mongoose.Schema({
    timetableId: { type: String, required: true, unique: true, index: true },
    instituteId: { type: String, required: true, index: true },
    branchId: { type: String, required: true, index: true },
    courseId: { type: String, required: true, index: true },
    classId: { type: String, required: true, index: true },
    subject: { type: String, required: true },
    teacherId: { type: String, default: "", index: true },
    dayOfWeek: { type: String, required: true, index: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    room: { type: String, default: "" },
    status: { type: String, enum: ["active", "inactive", "disabled"], default: "active", index: true },
    createdByActionId: { type: String, required: true },
    updatedByActionId: { type: String, required: true },
  }, { timestamps: true, strict: true });
  timetableSchema.index({ instituteId: 1, classId: 1, dayOfWeek: 1, startTime: 1 }, { unique: true });

  const attendanceSchema = new mongoose.Schema({
    attendanceId: { type: String, required: true, unique: true, index: true },
    instituteId: { type: String, required: true, index: true },
    branchId: { type: String, required: true, index: true },
    classId: { type: String, required: true, index: true },
    studentId: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },
    status: { type: String, enum: ["present", "absent", "late", "excused"], required: true, index: true },
    note: { type: String, default: "" },
    markedByUserId: { type: String, required: true },
    updatedByActionId: { type: String, required: true },
  }, { timestamps: true, strict: true });
  attendanceSchema.index({ instituteId: 1, classId: 1, studentId: 1, date: 1 }, { unique: true });

  const assignmentSchema = new mongoose.Schema({
    assignmentId: { type: String, required: true, unique: true, index: true },
    instituteId: { type: String, required: true, index: true },
    branchId: { type: String, required: true, index: true },
    classId: { type: String, required: true, index: true },
    courseId: { type: String, required: true, index: true },
    teacherId: { type: String, default: "", index: true },
    title: { type: String, required: true },
    subject: { type: String, default: "" },
    instructions: { type: String, required: true },
    dueDate: { type: Date, required: true, index: true },
    maxMarks: { type: Number, default: null },
    status: { type: String, enum: ["draft", "published", "closed", "inactive"], default: "draft", index: true },
    createdByActionId: { type: String, required: true },
    updatedByActionId: { type: String, required: true },
  }, { timestamps: true, strict: true });

  const reviewSchema = new mongoose.Schema({
    reviewId: { type: String, required: true, unique: true, index: true },
    instituteId: { type: String, required: true, index: true },
    assignmentId: { type: String, required: true, index: true },
    classId: { type: String, required: true, index: true },
    studentId: { type: String, required: true, index: true },
    score: { type: Number, required: true },
    feedback: { type: String, default: "" },
    status: { type: String, enum: ["reviewed", "needs_revision"], default: "reviewed", index: true },
    reviewedByUserId: { type: String, required: true },
    updatedByActionId: { type: String, required: true },
  }, { timestamps: true, strict: true });
  reviewSchema.index({ instituteId: 1, assignmentId: 1, studentId: 1 }, { unique: true });

  const examSchema = new mongoose.Schema({
    examId: { type: String, required: true, unique: true, index: true },
    instituteId: { type: String, required: true, index: true },
    branchId: { type: String, required: true, index: true },
    classId: { type: String, required: true, index: true },
    courseId: { type: String, required: true, index: true },
    teacherId: { type: String, default: "", index: true },
    title: { type: String, required: true },
    subject: { type: String, default: "" },
    examDate: { type: Date, required: true, index: true },
    maxMarks: { type: Number, required: true },
    passingMarks: { type: Number, default: null },
    status: { type: String, enum: ["draft", "scheduled", "completed", "published", "inactive"], default: "scheduled", index: true },
    createdByActionId: { type: String, required: true },
    updatedByActionId: { type: String, required: true },
  }, { timestamps: true, strict: true });

  const markSchema = new mongoose.Schema({
    markId: { type: String, required: true, unique: true, index: true },
    instituteId: { type: String, required: true, index: true },
    examId: { type: String, required: true, index: true },
    classId: { type: String, required: true, index: true },
    studentId: { type: String, required: true, index: true },
    marksObtained: { type: Number, required: true },
    maxMarks: { type: Number, required: true },
    percentage: { type: Number, required: true },
    grade: { type: String, default: "" },
    remarks: { type: String, default: "" },
    recordedByUserId: { type: String, required: true },
    updatedByActionId: { type: String, required: true },
  }, { timestamps: true, strict: true });
  markSchema.index({ instituteId: 1, examId: 1, studentId: 1 }, { unique: true });

  const publicationSchema = new mongoose.Schema({
    publicationId: { type: String, required: true, unique: true, index: true },
    instituteId: { type: String, required: true, index: true },
    examId: { type: String, required: true, index: true },
    classId: { type: String, required: true, index: true },
    message: { type: String, default: "" },
    studentCount: { type: Number, default: 0 },
    status: { type: String, enum: ["published"], default: "published", index: true },
    publishedByUserId: { type: String, required: true },
    publishedAt: { type: Date, required: true },
    actionId: { type: String, required: true },
  }, { timestamps: true, strict: true });
  publicationSchema.index({ instituteId: 1, examId: 1 }, { unique: true });

  const noteSchema = new mongoose.Schema({
    noteId: { type: String, required: true, unique: true, index: true },
    instituteId: { type: String, required: true, index: true },
    studentId: { type: String, required: true, index: true },
    classId: { type: String, default: "", index: true },
    title: { type: String, required: true },
    note: { type: String, required: true },
    category: { type: String, enum: ["academic", "attendance", "behaviour", "support", "achievement"], default: "academic", index: true },
    visibility: { type: String, enum: ["staff_only", "student_parent"], default: "staff_only", index: true },
    createdByUserId: { type: String, required: true },
    actionId: { type: String, required: true },
  }, { timestamps: true, strict: true });

  const snapshotSchema = new mongoose.Schema({
    snapshotId: { type: String, required: true, unique: true, index: true },
    instituteId: { type: String, required: true, index: true },
    studentId: { type: String, required: true, index: true },
    classId: { type: String, default: "", index: true },
    attendance: { type: mongoose.Schema.Types.Mixed, default: {} },
    assignments: { type: mongoose.Schema.Types.Mixed, default: {} },
    exams: { type: mongoose.Schema.Types.Mixed, default: {} },
    notes: { type: mongoose.Schema.Types.Mixed, default: {} },
    generatedByUserId: { type: String, required: true },
    actionId: { type: String, required: true },
    generatedAt: { type: Date, required: true },
  }, { timestamps: true, strict: true });

  const auditSchema = new mongoose.Schema({
    instituteId: { type: String, required: true, index: true },
    actionId: { type: String, required: true, index: true },
    actorUserId: { type: String, required: true },
    actorRole: { type: String, required: true },
    event: { type: String, required: true },
    result: { type: String, required: true },
    actionType: { type: String, required: true, index: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  }, { timestamps: true, strict: true });

  return {
    Action: mongoose.models.Part130AcademicAction || mongoose.model("Part130AcademicAction", actionSchema),
    Timetable: mongoose.models.Part130TimetableEntry || mongoose.model("Part130TimetableEntry", timetableSchema),
    Attendance: mongoose.models.Part130AttendanceRecord || mongoose.model("Part130AttendanceRecord", attendanceSchema),
    Assignment: mongoose.models.Part130AcademicAssignment || mongoose.model("Part130AcademicAssignment", assignmentSchema),
    Review: mongoose.models.Part130AssignmentReview || mongoose.model("Part130AssignmentReview", reviewSchema),
    Exam: mongoose.models.Part130Exam || mongoose.model("Part130Exam", examSchema),
    Mark: mongoose.models.Part130ExamMark || mongoose.model("Part130ExamMark", markSchema),
    Publication: mongoose.models.Part130ResultPublication || mongoose.model("Part130ResultPublication", publicationSchema),
    ProgressNote: mongoose.models.Part130ProgressNote || mongoose.model("Part130ProgressNote", noteSchema),
    Snapshot: mongoose.models.Part130ProgressSnapshot || mongoose.model("Part130ProgressSnapshot", snapshotSchema),
    Audit: mongoose.models.Part130AcademicAudit || mongoose.model("Part130AcademicAudit", auditSchema),
  };
}

async function writeAudit(models, context, action, event, result, details = {}) {
  if (!dbReady()) return;
  try {
    await models.Audit.create({
      instituteId: context.instituteId,
      actionId: action.actionId,
      actorUserId: context.userId,
      actorRole: context.role,
      event,
      result,
      actionType: action.actionType,
      details,
    });
  } catch {}
}
function actionDefinition(actionType) { return ACTION_DEFINITIONS[actionType] || null; }
function roleCanUse(role, actionType) { return Boolean(actionDefinition(actionType)?.roles.includes(role)); }
function confirmationText(action) {
  return `CONFIRM ${String(action.actionType || "").toUpperCase().replace(/\./g, " ")} ${String(action.actionId || "").slice(-8).toUpperCase()}`;
}
function gradeFromPercentage(value) {
  if (value >= 90) return "A+";
  if (value >= 80) return "A";
  if (value >= 70) return "B";
  if (value >= 60) return "C";
  if (value >= 50) return "D";
  return "E";
}
function parsePairs(value, type) {
  const raw = Array.isArray(value) ? value : String(value ?? "").split(/[|;\n]/g);
  const entries = [];
  for (const item of raw) {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const studentId = cleanId(item.studentId);
      if (type === "attendance") entries.push({ studentId, status: normalizeAttendance(item.status), note: cleanText(item.note, 500) });
      else entries.push({ studentId, marksObtained: cleanNumber(item.marksObtained ?? item.marks, 0, 100000), remarks: cleanText(item.remarks, 500) });
      continue;
    }
    const parts = String(item ?? "").split(":");
    const studentId = cleanId(parts.shift());
    const valuePart = parts.shift();
    const remarks = parts.join(":");
    if (type === "attendance") entries.push({ studentId, status: normalizeAttendance(valuePart), note: cleanText(remarks, 500) });
    else entries.push({ studentId, marksObtained: cleanNumber(valuePart, 0, 100000), remarks: cleanText(remarks, 500) });
  }
  const unique = new Map();
  for (const entry of entries) if (entry.studentId) unique.set(entry.studentId, entry);
  return [...unique.values()].slice(0, MAX_BULK_STUDENTS);
}
function normalizePayload(actionType, raw = {}) {
  const payload = {};
  for (const field of ["timetableId", "branchId", "courseId", "classId", "teacherId", "assignmentId", "studentId", "examId"]) {
    if (raw[field] !== undefined) payload[field] = cleanId(raw[field]);
  }
  const textFields = {
    subject: 160, room: 80, title: 200, instructions: 5000, feedback: 3000,
    remarks: 1000, message: 3000, note: 5000, category: 40, visibility: 40,
  };
  for (const [field, max] of Object.entries(textFields)) if (raw[field] !== undefined) payload[field] = cleanLong(raw[field], max);
  if (raw.dayOfWeek !== undefined) payload.dayOfWeek = normalizeDay(raw.dayOfWeek);
  if (raw.startTime !== undefined) payload.startTime = normalizeTime(raw.startTime);
  if (raw.endTime !== undefined) payload.endTime = normalizeTime(raw.endTime);
  if (raw.date !== undefined) payload.date = cleanDate(raw.date, true);
  if (raw.dueDate !== undefined) payload.dueDate = cleanDate(raw.dueDate);
  if (raw.examDate !== undefined) payload.examDate = cleanDate(raw.examDate);
  if (raw.maxMarks !== undefined) payload.maxMarks = cleanNumber(raw.maxMarks, 1, 100000);
  if (raw.passingMarks !== undefined) payload.passingMarks = cleanNumber(raw.passingMarks, 0, 100000);
  if (raw.score !== undefined) payload.score = cleanNumber(raw.score, 0, 100000);
  if (raw.status !== undefined) {
    const allowed = actionType.includes("assignment") ? ["draft", "published", "closed", "inactive", "reviewed", "needs_revision"]
      : actionType.includes("exam") ? ["draft", "scheduled", "completed", "published", "inactive"]
      : ["active", "inactive", "disabled"];
    payload.status = normalizeStatus(raw.status, allowed, allowed[0]);
  }
  if (raw.attendanceEntries !== undefined) payload.attendanceEntries = parsePairs(raw.attendanceEntries, "attendance");
  if (raw.markEntries !== undefined) payload.markEntries = parsePairs(raw.markEntries, "marks");
  if (actionType === "academic.progress.note.create") {
    payload.category = normalizeStatus(payload.category, ["academic", "attendance", "behaviour", "support", "achievement"], "academic");
    payload.visibility = normalizeStatus(payload.visibility, ["staff_only", "student_parent"], "staff_only");
  }
  return payload;
}
function validateBasic(actionType, payload) {
  const definition = actionDefinition(actionType);
  if (!definition) throw Object.assign(new Error("Unknown Part 130 academic action."), { code: "UNKNOWN_ACADEMIC_ACTION", httpStatus: 404 });
  const missing = definition.requiredFields.filter(field => payload[field] === undefined || payload[field] === null || payload[field] === "" || (Array.isArray(payload[field]) && payload[field].length === 0));
  if (missing.length) throw Object.assign(new Error(`Required fields missing: ${missing.join(", ")}`), { code: "ACADEMIC_FIELDS_REQUIRED", httpStatus: 400, missingFields: missing });
  if (payload.startTime && payload.endTime && payload.startTime >= payload.endTime) throw Object.assign(new Error("Timetable endTime must be after startTime."), { code: "INVALID_TIME_RANGE", httpStatus: 400 });
  if (payload.dayOfWeek && !["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].includes(payload.dayOfWeek)) throw Object.assign(new Error("Invalid dayOfWeek."), { code: "INVALID_DAY_OF_WEEK", httpStatus: 400 });
  if (payload.attendanceEntries) {
    if (payload.attendanceEntries.length > MAX_BULK_STUDENTS) throw Object.assign(new Error(`Maximum ${MAX_BULK_STUDENTS} attendance rows.`), { code: "BULK_LIMIT_EXCEEDED", httpStatus: 400 });
    const invalid = payload.attendanceEntries.filter(row => !row.studentId || !["present", "absent", "late", "excused"].includes(row.status));
    if (invalid.length) throw Object.assign(new Error("Every attendance entry needs studentId and valid status."), { code: "INVALID_ATTENDANCE_ENTRIES", httpStatus: 400 });
  }
  if (payload.markEntries) {
    if (payload.markEntries.length > MAX_BULK_STUDENTS) throw Object.assign(new Error(`Maximum ${MAX_BULK_STUDENTS} mark rows.`), { code: "BULK_LIMIT_EXCEEDED", httpStatus: 400 });
    const invalid = payload.markEntries.filter(row => !row.studentId || row.marksObtained === null);
    if (invalid.length) throw Object.assign(new Error("Every mark entry needs studentId and marksObtained."), { code: "INVALID_MARK_ENTRIES", httpStatus: 400 });
  }
  return definition;
}
async function loadScope(context) {
  if (context.role === "institute_owner" || context.role === "teacher" || context.role === "student") return { available: true, instituteWide: context.role === "institute_owner", branchIds: [], childStudentIds: [] };
  const Scope = mongoose.models.Part124RoleScopeAssignment;
  if (!Scope || !dbReady()) return { available: false, instituteWide: false, branchIds: [], childStudentIds: [] };
  const assignment = await Scope.findOne({ instituteId: context.instituteId, identityId: context.identityId, role: context.role, status: "active" }).lean();
  return {
    available: Boolean(assignment),
    instituteWide: Boolean(assignment?.instituteWide),
    branchIds: cleanIdList(assignment?.branchIds, 100),
    childStudentIds: cleanIdList(assignment?.childStudentIds, 100),
  };
}
function part128Models() {
  const models = {
    Branch: mongoose.models.Part128Branch,
    Course: mongoose.models.Part128Course,
    ClassBatch: mongoose.models.Part128ClassBatch,
    Teacher: mongoose.models.Part128TeacherProfile,
    Student: mongoose.models.Part128StudentProfile,
  };
  if (!models.Branch || !models.Course || !models.ClassBatch || !models.Teacher || !models.Student) {
    throw Object.assign(new Error("Part 128 master-data models unavailable. Apply and register Part 128 first."), { code: "PART128_MODELS_MISSING", httpStatus: 503 });
  }
  return models;
}
async function requireClass(context, classId) {
  const { ClassBatch } = part128Models();
  const record = await ClassBatch.findOne({ instituteId: context.instituteId, classId, status: { $ne: "disabled" } });
  if (!record) throw Object.assign(new Error("Class/Batch not found inside this institute."), { code: "CLASS_NOT_FOUND", httpStatus: 404 });
  return record;
}
async function requireStudent(context, studentId, classId = "") {
  const { Student } = part128Models();
  const record = await Student.findOne({ instituteId: context.instituteId, studentId, status: { $ne: "disabled" } });
  if (!record) throw Object.assign(new Error(`Student not found inside this institute: ${studentId}`), { code: "STUDENT_NOT_FOUND", httpStatus: 404 });
  if (classId && record.classId !== classId) throw Object.assign(new Error(`Student ${studentId} is not linked to selected class.`), { code: "STUDENT_CLASS_MISMATCH", httpStatus: 400 });
  return record;
}
async function requireTeacher(context, teacherId) {
  const { Teacher } = part128Models();
  const record = await Teacher.findOne({ instituteId: context.instituteId, identityId: teacherId, status: { $ne: "disabled" } });
  if (!record) throw Object.assign(new Error("Teacher not found inside this institute."), { code: "TEACHER_NOT_FOUND", httpStatus: 404 });
  return record;
}
async function enforceClassScope(context, scope, classRecord) {
  if (context.role === "institute_owner") return;
  if (context.role === "teacher") {
    if (!classRecord.teacherId || !context.referenceIds.includes(cleanId(classRecord.teacherId))) throw Object.assign(new Error("Teacher can manage only an assigned Part 128 Class."), { code: "TEACHER_CLASS_SCOPE_MISMATCH", httpStatus: 403 });
    return;
  }
  if (BRANCH_SCOPED_ROLES.has(context.role)) {
    if (!scope.available) throw Object.assign(new Error("Owner-assigned Part 124 branch scope required."), { code: "ROLE_SCOPE_REQUIRED", httpStatus: 403 });
    if (!scope.instituteWide && !scope.branchIds.includes(classRecord.branchId)) throw Object.assign(new Error("Class is outside assigned branch scope."), { code: "BRANCH_SCOPE_MISMATCH", httpStatus: 403 });
  }
}
async function validateReferences(context, actionType, payload) {
  const scope = await loadScope(context);
  let classRecord = null;
  if (payload.classId) {
    classRecord = await requireClass(context, payload.classId);
    await enforceClassScope(context, scope, classRecord);
  }
  if (payload.timetableId) {
    const Timetable = mongoose.models.Part130TimetableEntry;
    const row = await Timetable?.findOne({ instituteId: context.instituteId, timetableId: payload.timetableId });
    if (!row) throw Object.assign(new Error("Timetable entry not found."), { code: "TIMETABLE_NOT_FOUND", httpStatus: 404 });
    classRecord = await requireClass(context, row.classId);
    await enforceClassScope(context, scope, classRecord);
  }
  if (payload.assignmentId) {
    const Assignment = mongoose.models.Part130AcademicAssignment;
    const row = await Assignment?.findOne({ instituteId: context.instituteId, assignmentId: payload.assignmentId });
    if (!row) throw Object.assign(new Error("Academic assignment not found."), { code: "ASSIGNMENT_NOT_FOUND", httpStatus: 404 });
    classRecord = await requireClass(context, row.classId);
    await enforceClassScope(context, scope, classRecord);
  }
  if (payload.examId) {
    const Exam = mongoose.models.Part130Exam;
    const row = await Exam?.findOne({ instituteId: context.instituteId, examId: payload.examId });
    if (!row) throw Object.assign(new Error("Exam not found."), { code: "EXAM_NOT_FOUND", httpStatus: 404 });
    classRecord = await requireClass(context, row.classId);
    await enforceClassScope(context, scope, classRecord);
  }
  if (payload.teacherId) await requireTeacher(context, payload.teacherId);
  if (payload.studentId) {
    const student = await requireStudent(context, payload.studentId, classRecord?.classId || payload.classId || "");
    if (context.role === "student" && !context.referenceIds.includes(student.studentId)) throw Object.assign(new Error("Student can access only own progress."), { code: "CROSS_STUDENT_ACCESS_BLOCKED", httpStatus: 403 });
    if (context.role === "parent" && !scope.childStudentIds.includes(student.studentId)) throw Object.assign(new Error("Parent can access only linked child."), { code: "PARENT_CHILD_SCOPE_MISMATCH", httpStatus: 403 });
  }
  for (const row of payload.attendanceEntries || []) await requireStudent(context, row.studentId, classRecord?.classId || payload.classId);
  for (const row of payload.markEntries || []) await requireStudent(context, row.studentId, classRecord?.classId || payload.classId || "");
  return { scope, classRecord };
}
async function validateAction(context, actionType, rawPayload) {
  const definition = actionDefinition(actionType);
  if (!definition) throw Object.assign(new Error("Unknown Part 130 action."), { code: "UNKNOWN_ACADEMIC_ACTION", httpStatus: 404 });
  if (!roleCanUse(context.role, actionType)) throw Object.assign(new Error(`${context.role} cannot use ${actionType}.`), { code: "ACTION_ROLE_DENIED", httpStatus: 403 });
  const payload = normalizePayload(actionType, rawPayload);
  validateBasic(actionType, payload);
  const references = await validateReferences(context, actionType, payload);
  if (actionType === "academic.assignment.review") {
    const assignment = await mongoose.models.Part130AcademicAssignment.findOne({ instituteId: context.instituteId, assignmentId: payload.assignmentId });
    if (payload.score > (assignment.maxMarks ?? 100000)) throw Object.assign(new Error("Assignment review score exceeds maxMarks."), { code: "SCORE_EXCEEDS_MAX_MARKS", httpStatus: 400 });
  }
  if (actionType === "academic.marks.bulk_record") {
    const exam = await mongoose.models.Part130Exam.findOne({ instituteId: context.instituteId, examId: payload.examId });
    const invalid = payload.markEntries.filter(row => row.marksObtained > exam.maxMarks);
    if (invalid.length) throw Object.assign(new Error("One or more marks exceed exam maxMarks."), { code: "MARKS_EXCEED_MAX_MARKS", httpStatus: 400 });
  }
  return { definition, payload, ...references };
}
function publicAction(action) {
  return {
    actionId: action.actionId,
    actionType: action.actionType,
    actionLabel: action.actionLabel,
    actorRole: action.actorRole,
    status: action.status,
    payload: action.payload,
    confirmationTextRequired: action.status === "preview_ready" ? confirmationText(action) : null,
    previewExpiresAt: action.previewExpiresAt,
    executedAt: action.executedAt,
    result: action.result || {},
    failureCode: action.failureCode || "",
    failureMessage: action.failureMessage || "",
    rollbackApplied: Boolean(action.rollbackApplied),
    createdAt: action.createdAt,
    updatedAt: action.updatedAt,
  };
}
async function createPreview(models, context, actionType, rawPayload) {
  if (!dbReady()) throw Object.assign(new Error("MongoDB connection required."), { code: "DATABASE_REQUIRED", httpStatus: 503 });
  const { definition, payload } = await validateAction(context, actionType, rawPayload);
  const digest = sha256(JSON.stringify(stableObject({ instituteId: context.instituteId, actorUserId: context.userId, actionType, payload })));
  const now = new Date();
  const reusable = await models.Action.findOne({ instituteId: context.instituteId, actorUserId: context.userId, fingerprint: digest, status: "preview_ready", previewExpiresAt: { $gt: now } }).sort({ createdAt: -1 });
  if (reusable) return { action: reusable, reusedPreview: true };
  const recent = await models.Action.findOne({ instituteId: context.instituteId, actorUserId: context.userId, fingerprint: digest, status: "executed_native", executedAt: { $gt: new Date(Date.now() - DUPLICATE_WINDOW_MS) } }).sort({ executedAt: -1 });
  if (recent) throw Object.assign(new Error("Same academic action was executed recently. Duplicate blocked."), { code: "DUPLICATE_ACADEMIC_ACTION", httpStatus: 409, existingAction: publicAction(recent) });
  const actionId = createId("academic");
  const exact = confirmationText({ actionId, actionType });
  const action = await models.Action.create({
    actionId, instituteId: context.instituteId, actorUserId: context.userId, actorIdentityId: context.identityId,
    actorRole: context.role, actorDisplayName: context.displayName, actionType, actionLabel: definition.label,
    status: "preview_ready", payload, fingerprint: digest, confirmationDigest: sha256(exact),
    previewExpiresAt: new Date(Date.now() + PREVIEW_TTL_MS),
  });
  await writeAudit(models, context, action, "preview_created", "success");
  return { action, reusedPreview: false };
}
function recordObject(record) {
  if (!record) return null;
  const object = typeof record.toObject === "function" ? record.toObject() : { ...record };
  delete object.__v;
  return object;
}
function registerUpdateUndo(undo, record) {
  const before = record.toObject();
  undo.push(async () => { record.set(before); await record.save(); });
}
function registerCreateUndo(undo, Model, record) {
  undo.push(async () => { await Model.deleteOne({ _id: record._id }); });
}
async function calculateSnapshot(models, context, studentId, classId = "") {
  const student = await requireStudent(context, studentId, classId);
  const effectiveClassId = classId || student.classId || "";
  const attendanceQuery = { instituteId: context.instituteId, studentId };
  if (effectiveClassId) attendanceQuery.classId = effectiveClassId;
  const [attendanceRows, reviews, marks, notes] = await Promise.all([
    models.Attendance.find(attendanceQuery).lean(),
    models.Review.find({ instituteId: context.instituteId, studentId, ...(effectiveClassId ? { classId: effectiveClassId } : {}) }).lean(),
    models.Mark.find({ instituteId: context.instituteId, studentId, ...(effectiveClassId ? { classId: effectiveClassId } : {}) }).lean(),
    models.ProgressNote.find({ instituteId: context.instituteId, studentId, ...(effectiveClassId ? { classId: effectiveClassId } : {}) }).lean(),
  ]);
  const attendanceCounts = attendanceRows.reduce((acc, row) => { acc[row.status] = (acc[row.status] || 0) + 1; return acc; }, {});
  const totalAttendance = attendanceRows.length;
  const attended = (attendanceCounts.present || 0) + (attendanceCounts.late || 0) + (attendanceCounts.excused || 0);
  const examAverage = marks.length ? marks.reduce((sum, row) => sum + Number(row.percentage || 0), 0) / marks.length : null;
  const assignmentAverage = reviews.length ? reviews.reduce((sum, row) => sum + Number(row.score || 0), 0) / reviews.length : null;
  return {
    studentId,
    classId: effectiveClassId,
    attendance: { total: totalAttendance, counts: attendanceCounts, attendancePercentage: totalAttendance ? Number(((attended / totalAttendance) * 100).toFixed(2)) : null },
    assignments: { reviewedCount: reviews.length, averageRawScore: assignmentAverage === null ? null : Number(assignmentAverage.toFixed(2)) },
    exams: { recordedExamCount: marks.length, averagePercentage: examAverage === null ? null : Number(examAverage.toFixed(2)) },
    notes: { total: notes.length, studentParentVisible: notes.filter(row => row.visibility === "student_parent").length },
  };
}
async function executeAction(models, context, action) {
  const p = action.payload || {};
  const undo = [];
  let result = {};
  try {
    switch (action.actionType) {
      case "academic.timetable.create": {
        const classRecord = await requireClass(context, p.classId);
        const teacherId = p.teacherId || classRecord.teacherId || "";
        if (teacherId) await requireTeacher(context, teacherId);
        const row = await models.Timetable.create({ timetableId: createId("timetable"), instituteId: context.instituteId, branchId: classRecord.branchId, courseId: classRecord.courseId, classId: classRecord.classId, subject: p.subject, teacherId, dayOfWeek: p.dayOfWeek, startTime: p.startTime, endTime: p.endTime, room: p.room || "", status: p.status || "active", createdByActionId: action.actionId, updatedByActionId: action.actionId });
        registerCreateUndo(undo, models.Timetable, row);
        result = { entity: "timetable", record: recordObject(row) };
        break;
      }
      case "academic.timetable.update": {
        const row = await models.Timetable.findOne({ instituteId: context.instituteId, timetableId: p.timetableId });
        registerUpdateUndo(undo, row);
        if (p.teacherId) await requireTeacher(context, p.teacherId);
        for (const field of ["subject", "teacherId", "dayOfWeek", "startTime", "endTime", "room", "status"]) if (p[field] !== undefined) row[field] = p[field];
        if (row.startTime >= row.endTime) throw Object.assign(new Error("Timetable endTime must be after startTime."), { code: "INVALID_TIME_RANGE", httpStatus: 400 });
        row.updatedByActionId = action.actionId;
        await row.save();
        result = { entity: "timetable", record: recordObject(row) };
        break;
      }
      case "academic.attendance.bulk_mark": {
        const classRecord = await requireClass(context, p.classId);
        const records = [];
        for (const entry of p.attendanceEntries) {
          const existing = await models.Attendance.findOne({ instituteId: context.instituteId, classId: classRecord.classId, studentId: entry.studentId, date: p.date });
          if (existing) {
            registerUpdateUndo(undo, existing);
            existing.status = entry.status;
            existing.note = entry.note || p.note || "";
            existing.markedByUserId = context.userId;
            existing.updatedByActionId = action.actionId;
            await existing.save();
            records.push(recordObject(existing));
          } else {
            const row = await models.Attendance.create({ attendanceId: createId("attendance"), instituteId: context.instituteId, branchId: classRecord.branchId, classId: classRecord.classId, studentId: entry.studentId, date: p.date, status: entry.status, note: entry.note || p.note || "", markedByUserId: context.userId, updatedByActionId: action.actionId });
            registerCreateUndo(undo, models.Attendance, row);
            records.push(recordObject(row));
          }
        }
        result = { entity: "attendance", affectedCount: records.length, records };
        break;
      }
      case "academic.assignment.create": {
        const classRecord = await requireClass(context, p.classId);
        const row = await models.Assignment.create({ assignmentId: createId("assignment130"), instituteId: context.instituteId, branchId: classRecord.branchId, classId: classRecord.classId, courseId: classRecord.courseId, teacherId: classRecord.teacherId || context.identityId, title: p.title, subject: p.subject || "", instructions: p.instructions, dueDate: p.dueDate, maxMarks: p.maxMarks ?? null, status: p.status || "draft", createdByActionId: action.actionId, updatedByActionId: action.actionId });
        registerCreateUndo(undo, models.Assignment, row);
        result = { entity: "assignment", record: recordObject(row) };
        break;
      }
      case "academic.assignment.update": {
        const row = await models.Assignment.findOne({ instituteId: context.instituteId, assignmentId: p.assignmentId });
        registerUpdateUndo(undo, row);
        for (const field of ["title", "subject", "instructions", "dueDate", "maxMarks", "status"]) if (p[field] !== undefined) row[field] = p[field];
        row.updatedByActionId = action.actionId;
        await row.save();
        result = { entity: "assignment", record: recordObject(row) };
        break;
      }
      case "academic.assignment.review": {
        const assignment = await models.Assignment.findOne({ instituteId: context.instituteId, assignmentId: p.assignmentId });
        const existing = await models.Review.findOne({ instituteId: context.instituteId, assignmentId: assignment.assignmentId, studentId: p.studentId });
        if (existing) {
          registerUpdateUndo(undo, existing);
          existing.score = p.score;
          existing.feedback = p.feedback || "";
          existing.status = p.status || "reviewed";
          existing.reviewedByUserId = context.userId;
          existing.updatedByActionId = action.actionId;
          await existing.save();
          result = { entity: "assignment_review", record: recordObject(existing) };
        } else {
          const row = await models.Review.create({ reviewId: createId("review"), instituteId: context.instituteId, assignmentId: assignment.assignmentId, classId: assignment.classId, studentId: p.studentId, score: p.score, feedback: p.feedback || "", status: p.status || "reviewed", reviewedByUserId: context.userId, updatedByActionId: action.actionId });
          registerCreateUndo(undo, models.Review, row);
          result = { entity: "assignment_review", record: recordObject(row) };
        }
        break;
      }
      case "academic.exam.create": {
        const classRecord = await requireClass(context, p.classId);
        if (p.passingMarks !== null && p.passingMarks > p.maxMarks) throw Object.assign(new Error("passingMarks cannot exceed maxMarks."), { code: "INVALID_PASSING_MARKS", httpStatus: 400 });
        const row = await models.Exam.create({ examId: createId("exam"), instituteId: context.instituteId, branchId: classRecord.branchId, classId: classRecord.classId, courseId: classRecord.courseId, teacherId: classRecord.teacherId || context.identityId, title: p.title, subject: p.subject || "", examDate: p.examDate, maxMarks: p.maxMarks, passingMarks: p.passingMarks ?? null, status: p.status || "scheduled", createdByActionId: action.actionId, updatedByActionId: action.actionId });
        registerCreateUndo(undo, models.Exam, row);
        result = { entity: "exam", record: recordObject(row) };
        break;
      }
      case "academic.exam.update": {
        const row = await models.Exam.findOne({ instituteId: context.instituteId, examId: p.examId });
        registerUpdateUndo(undo, row);
        for (const field of ["title", "subject", "examDate", "maxMarks", "passingMarks", "status"]) if (p[field] !== undefined) row[field] = p[field];
        if (row.passingMarks !== null && row.passingMarks > row.maxMarks) throw Object.assign(new Error("passingMarks cannot exceed maxMarks."), { code: "INVALID_PASSING_MARKS", httpStatus: 400 });
        row.updatedByActionId = action.actionId;
        await row.save();
        result = { entity: "exam", record: recordObject(row) };
        break;
      }
      case "academic.marks.bulk_record": {
        const exam = await models.Exam.findOne({ instituteId: context.instituteId, examId: p.examId });
        const records = [];
        for (const entry of p.markEntries) {
          const percentage = Number(((entry.marksObtained / exam.maxMarks) * 100).toFixed(2));
          const existing = await models.Mark.findOne({ instituteId: context.instituteId, examId: exam.examId, studentId: entry.studentId });
          if (existing) {
            registerUpdateUndo(undo, existing);
            existing.marksObtained = entry.marksObtained;
            existing.maxMarks = exam.maxMarks;
            existing.percentage = percentage;
            existing.grade = gradeFromPercentage(percentage);
            existing.remarks = entry.remarks || p.remarks || "";
            existing.recordedByUserId = context.userId;
            existing.updatedByActionId = action.actionId;
            await existing.save();
            records.push(recordObject(existing));
          } else {
            const row = await models.Mark.create({ markId: createId("mark"), instituteId: context.instituteId, examId: exam.examId, classId: exam.classId, studentId: entry.studentId, marksObtained: entry.marksObtained, maxMarks: exam.maxMarks, percentage, grade: gradeFromPercentage(percentage), remarks: entry.remarks || p.remarks || "", recordedByUserId: context.userId, updatedByActionId: action.actionId });
            registerCreateUndo(undo, models.Mark, row);
            records.push(recordObject(row));
          }
        }
        result = { entity: "marks", affectedCount: records.length, records };
        break;
      }
      case "academic.result.publish": {
        const exam = await models.Exam.findOne({ instituteId: context.instituteId, examId: p.examId });
        const markCount = await models.Mark.countDocuments({ instituteId: context.instituteId, examId: exam.examId });
        if (!markCount) throw Object.assign(new Error("Record marks before publishing results."), { code: "MARKS_REQUIRED_BEFORE_PUBLISH", httpStatus: 409 });
        const existing = await models.Publication.findOne({ instituteId: context.instituteId, examId: exam.examId });
        if (existing) {
          result = { entity: "result_publication", idempotentExisting: true, record: recordObject(existing) };
        } else {
          registerUpdateUndo(undo, exam);
          const row = await models.Publication.create({ publicationId: createId("result"), instituteId: context.instituteId, examId: exam.examId, classId: exam.classId, message: p.message || "Results are available in your private NAXORA account.", studentCount: markCount, status: "published", publishedByUserId: context.userId, publishedAt: new Date(), actionId: action.actionId });
          registerCreateUndo(undo, models.Publication, row);
          exam.status = "published";
          exam.updatedByActionId = action.actionId;
          await exam.save();
          result = { entity: "result_publication", record: recordObject(row) };
        }
        break;
      }
      case "academic.progress.note.create": {
        const student = await requireStudent(context, p.studentId, p.classId || "");
        const row = await models.ProgressNote.create({ noteId: createId("progressnote"), instituteId: context.instituteId, studentId: student.studentId, classId: p.classId || student.classId || "", title: p.title, note: p.note, category: p.category || "academic", visibility: p.visibility || "staff_only", createdByUserId: context.userId, actionId: action.actionId });
        registerCreateUndo(undo, models.ProgressNote, row);
        result = { entity: "progress_note", record: recordObject(row) };
        break;
      }
      case "academic.progress.snapshot.generate": {
        const snapshot = await calculateSnapshot(models, context, p.studentId, p.classId || "");
        const row = await models.Snapshot.create({ snapshotId: createId("snapshot"), instituteId: context.instituteId, studentId: snapshot.studentId, classId: snapshot.classId, attendance: snapshot.attendance, assignments: snapshot.assignments, exams: snapshot.exams, notes: snapshot.notes, generatedByUserId: context.userId, actionId: action.actionId, generatedAt: new Date() });
        registerCreateUndo(undo, models.Snapshot, row);
        result = { entity: "progress_snapshot", record: recordObject(row) };
        break;
      }
      default: throw Object.assign(new Error("No executor for this Part 130 action."), { code: "ACADEMIC_EXECUTOR_MISSING", httpStatus: 500 });
    }
    return result;
  } catch (error) {
    let rollbackApplied = false;
    for (const step of undo.reverse()) {
      try { await step(); rollbackApplied = true; } catch {}
    }
    error.rollbackApplied = rollbackApplied;
    throw error;
  }
}
async function confirmAndExecute(models, context, actionId, exactConfirmation) {
  const action = await models.Action.findOne({ actionId, instituteId: context.instituteId, actorUserId: context.userId });
  if (!action) throw Object.assign(new Error("Academic action not found for this user."), { code: "ACADEMIC_ACTION_NOT_FOUND", httpStatus: 404 });
  if (action.status === "executed_native") return { action, idempotentReplay: true };
  if (action.status !== "preview_ready") throw Object.assign(new Error(`Action cannot execute from status ${action.status}.`), { code: "ACADEMIC_ACTION_STATE_CONFLICT", httpStatus: 409 });
  if (new Date(action.previewExpiresAt).getTime() <= Date.now()) {
    action.status = "expired"; await action.save();
    throw Object.assign(new Error("Academic preview expired. Create a fresh preview."), { code: "ACADEMIC_PREVIEW_EXPIRED", httpStatus: 410 });
  }
  if (sha256(String(exactConfirmation ?? "").trim()) !== action.confirmationDigest) throw Object.assign(new Error(`Exact confirmation required: ${confirmationText(action)}`), { code: "EXACT_CONFIRMATION_REQUIRED", httpStatus: 400 });
  await validateAction(context, action.actionType, action.payload);
  const claimed = await models.Action.findOneAndUpdate({ _id: action._id, status: "preview_ready" }, { status: "executing" }, { new: true });
  if (!claimed) throw Object.assign(new Error("Another request is executing this action."), { code: "ACADEMIC_EXECUTION_IN_PROGRESS", httpStatus: 409 });
  try {
    const result = await executeAction(models, context, claimed);
    claimed.status = "executed_native";
    claimed.executedAt = new Date();
    claimed.result = result;
    claimed.failureCode = "";
    claimed.failureMessage = "";
    claimed.rollbackApplied = false;
    await claimed.save();
    await writeAudit(models, context, claimed, "action_executed", "native_success", { entity: result.entity });
    return { action: claimed, idempotentReplay: false };
  } catch (error) {
    claimed.status = "failed";
    claimed.failureCode = cleanText(error.code || "ACADEMIC_EXECUTION_FAILED", 120);
    claimed.failureMessage = cleanText(error.message || "Academic action failed.", 500);
    claimed.rollbackApplied = Boolean(error.rollbackApplied);
    await claimed.save();
    await writeAudit(models, context, claimed, "action_executed", "failed", { failureCode: claimed.failureCode, rollbackApplied: claimed.rollbackApplied });
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
function inferActionType(command = "") {
  for (const [actionType, pattern] of ACTION_PATTERNS) if (pattern.test(command)) return actionType;
  return "";
}
function parseCommand(command = "") {
  const text = cleanLong(command, 4000);
  if (SENSITIVE_PATTERN.test(text)) throw Object.assign(new Error("Password, OTP or secrets VANI academic command me mat likhiye."), { code: "SENSITIVE_COMMAND_BLOCKED", httpStatus: 400 });
  if (BLOCKED_PATTERN.test(text)) throw Object.assign(new Error("This destructive, payment or refund command is not supported by Part 130."), { code: "BLOCKED_COMMAND", httpStatus: 400 });
  const actionType = inferActionType(text);
  if (!actionType) throw Object.assign(new Error("Academic action samajh nahi aaya. Catalog example use karein."), { code: "ACADEMIC_COMMAND_NOT_RECOGNISED", httpStatus: 400 });
  return { actionType, payload: extractKeyValues(text) };
}
async function roleSafeStudentSummary(models, context, studentId, classId = "") {
  const scope = await loadScope(context);
  if (context.role === "student" && !context.referenceIds.includes(studentId)) throw Object.assign(new Error("Student can view only own progress."), { code: "CROSS_STUDENT_ACCESS_BLOCKED", httpStatus: 403 });
  if (context.role === "parent" && !scope.childStudentIds.includes(studentId)) throw Object.assign(new Error("Parent can view only linked child progress."), { code: "PARENT_CHILD_SCOPE_MISMATCH", httpStatus: 403 });
  const student = await requireStudent(context, studentId, classId);
  if (["teacher", "branch_manager", "staff"].includes(context.role) && student.classId) {
    const classRecord = await requireClass(context, student.classId);
    await enforceClassScope(context, scope, classRecord);
  }
  const summary = await calculateSnapshot(models, context, studentId, classId);
  const notesQuery = { instituteId: context.instituteId, studentId, ...(summary.classId ? { classId: summary.classId } : {}) };
  if (["student", "parent"].includes(context.role)) notesQuery.visibility = "student_parent";
  const [notes, snapshots, publications] = await Promise.all([
    models.ProgressNote.find(notesQuery).sort({ createdAt: -1 }).limit(20).lean(),
    models.Snapshot.find({ instituteId: context.instituteId, studentId }).sort({ generatedAt: -1 }).limit(10).lean(),
    models.Publication.find({ instituteId: context.instituteId, ...(summary.classId ? { classId: summary.classId } : {}) }).sort({ publishedAt: -1 }).limit(20).lean(),
  ]);
  return { summary, notes, snapshots, publications };
}
async function academicRecordFilters(context) {
  const base = { instituteId: context.instituteId };
  if (context.role === "institute_owner") {
    return Object.fromEntries(["timetable", "attendance", "assignments", "reviews", "exams", "marks", "resultPublications", "progressNotes", "snapshots"].map(key => [key, { ...base }]));
  }
  if (!["branch_manager", "teacher", "staff"].includes(context.role)) {
    throw Object.assign(new Error("This role cannot open institute academic records."), { code: "ACADEMIC_RECORDS_ROLE_DENIED", httpStatus: 403 });
  }
  const scope = await loadScope(context);
  const { ClassBatch, Student } = part128Models();
  let classes = [];
  if (context.role === "teacher") {
    classes = await ClassBatch.find({ instituteId: context.instituteId, teacherId: { $in: context.referenceIds }, status: { $ne: "disabled" } }).select({ classId: 1 }).lean();
  } else if (scope.available && scope.instituteWide) {
    classes = await ClassBatch.find({ instituteId: context.instituteId, status: { $ne: "disabled" } }).select({ classId: 1 }).lean();
  } else {
    if (!scope.available || !scope.branchIds.length) throw Object.assign(new Error("Owner-assigned Part 124 branch scope required."), { code: "ROLE_SCOPE_REQUIRED", httpStatus: 403 });
    classes = await ClassBatch.find({ instituteId: context.instituteId, branchId: { $in: scope.branchIds }, status: { $ne: "disabled" } }).select({ classId: 1 }).lean();
  }
  const classIds = classes.map(row => row.classId).filter(Boolean);
  const students = classIds.length ? await Student.find({ instituteId: context.instituteId, classId: { $in: classIds }, status: { $ne: "disabled" } }).select({ studentId: 1 }).lean() : [];
  const studentIds = students.map(row => row.studentId).filter(Boolean);
  return {
    timetable: { ...base, classId: { $in: classIds } },
    attendance: { ...base, classId: { $in: classIds } },
    assignments: { ...base, classId: { $in: classIds } },
    reviews: { ...base, classId: { $in: classIds } },
    exams: { ...base, classId: { $in: classIds } },
    marks: { ...base, classId: { $in: classIds } },
    resultPublications: { ...base, classId: { $in: classIds } },
    progressNotes: { ...base, studentId: { $in: studentIds } },
    snapshots: { ...base, studentId: { $in: studentIds } },
  };
}
async function scopedRecords(models, context) {
  const map = { timetable: models.Timetable, attendance: models.Attendance, assignments: models.Assignment, reviews: models.Review, exams: models.Exam, marks: models.Mark, resultPublications: models.Publication, progressNotes: models.ProgressNote, snapshots: models.Snapshot };
  const filters = await academicRecordFilters(context);
  const rows = await Promise.all(Object.entries(map).map(async ([key, Model]) => {
    const query = filters[key];
    const [count, records] = await Promise.all([
      Model.countDocuments(query),
      Model.find(query).sort({ createdAt: -1 }).limit(50).lean(),
    ]);
    return [key, count, records];
  }));
  return {
    counts: Object.fromEntries(rows.map(([key, count]) => [key, count])),
    records: Object.fromEntries(rows.map(([key, , records]) => [key, records])),
  };
}

export function registerPart130VaniAcademicOperations({ app } = {}) {
  if (!app || typeof app.get !== "function" || typeof app.post !== "function") throw new Error("Part 130 registration failed: Express app required.");
  if (app.locals.part130VaniAcademicOperationsRegistered) return;
  app.locals.part130VaniAcademicOperationsRegistered = true;
  const models = defineModels();

  app.get(["/academic-vani", "/vani-academic-operations", "/part130"], (req, res) => res.sendFile(path.join(frontendDir, "naxora-academic-vani.html")));
  app.get("/naxora-academic-vani.css", (req, res) => res.type("text/css").sendFile(path.join(frontendDir, "naxora-academic-vani.css")));
  app.get("/naxora-academic-vani.js", (req, res) => res.type("application/javascript").sendFile(path.join(frontendDir, "naxora-academic-vani.js")));
  app.get("/naxora-part130-global-vani-bridge.js", (req, res) => res.type("application/javascript").sendFile(path.join(frontendDir, "naxora-part130-global-vani-bridge.js")));

  app.get("/api/part130/status", (req, res) => res.json({
    success: true, part: PART_NUMBER, name: PART_NAME, status: "vani_academic_operations_active", page: "/academic-vani",
    actionCount: Object.keys(ACTION_DEFINITIONS).length, timetable: true, bulkAttendance: true, assignmentsAndReview: true,
    examsMarksResults: true, progressNotesAndSnapshots: true, part128MasterReferencesRequired: true,
    part124RoleScopesEnforced: true, previewRequired: true, exactConfirmationRequired: true,
    duplicateProtectionMinutes: DUPLICATE_WINDOW_MS / 60000, maximumBulkStudentsPerAction: MAX_BULK_STUDENTS,
    rollbackOnPartialFailure: true, deleteActionsEnabled: false, moneyActionsEnabled: false,
    allFeatureVaniComplete: false, targetFinalAcceptancePart: 136, nextPart: 131, nextPartName: "VANI Fees and Finance Operations",
  }));
  app.get("/api/part130/security-policy", (req, res) => res.json({
    success: true, part: PART_NUMBER, jwtRoleAndInstituteRequired: true, roleActionMatrixEnforced: true,
    teacherAssignedClassScopeEnforced: true, part124BranchScopeEnforced: true, parentChildScopeEnforced: true,
    studentSelfScopeEnforced: true, crossInstituteReferencesBlocked: true, previewBeforeWrite: true,
    exactConfirmationRequired: true, duplicateActionProtection: true, partialFailureRollback: true,
    sensitiveCommandTextBlocked: true, destructiveCommandsBlocked: true, paymentAndRefundCommandsBlocked: true,
  }));
  app.get("/api/part130/catalog", (req, res) => res.json({
    success: true, part: PART_NUMBER,
    actions: Object.entries(ACTION_DEFINITIONS).map(([actionType, definition]) => ({ actionType, ...definition, example: {
      "academic.timetable.create": 'timetable create classId=CLASS_ID subject=Maths dayOfWeek=monday startTime=08:00 endTime=09:00 room=A1',
      "academic.timetable.update": 'timetable update timetableId=TIMETABLE_ID startTime=09:00 endTime=10:00',
      "academic.attendance.bulk_mark": 'bulk attendance mark classId=CLASS_ID date=2026-07-20 attendanceEntries=STUDENT1:present|STUDENT2:absent',
      "academic.assignment.create": 'assignment create classId=CLASS_ID title="Algebra Practice" instructions="Solve questions 1 to 20" dueDate=2026-07-25 maxMarks=20 status=published',
      "academic.assignment.update": 'assignment update assignmentId=ASSIGNMENT_ID dueDate=2026-07-27 status=published',
      "academic.assignment.review": 'assignment review assignmentId=ASSIGNMENT_ID studentId=STUDENT_ID score=18 feedback="Good work"',
      "academic.exam.create": 'exam create classId=CLASS_ID title="Unit Test 1" examDate=2026-07-30 maxMarks=100 passingMarks=35 status=scheduled',
      "academic.exam.update": 'exam update examId=EXAM_ID examDate=2026-08-01',
      "academic.marks.bulk_record": 'marks bulk record examId=EXAM_ID markEntries=STUDENT1:88|STUDENT2:74',
      "academic.result.publish": 'result publish examId=EXAM_ID message="Unit Test results published"',
      "academic.progress.note.create": 'progress note create studentId=STUDENT_ID title="Algebra Improvement" note="Weekly practice recommended" visibility=student_parent',
      "academic.progress.snapshot.generate": 'progress snapshot generate studentId=STUDENT_ID',
    }[actionType] })),
  }));
  app.get("/api/part130/demo", (req, res) => res.json({
    success: true, part: PART_NUMBER,
    flow: ["Role login", "Allowed academic command", "Part 128 record and Part 124 scope validation", "Preview", "Exact confirmation", "Native MongoDB execution", "Audit", "Rollback on partial failure"],
    supportedActionTypes: Object.keys(ACTION_DEFINITIONS),
    notSupported: ["Fees or finance operations — Part 131", "Delete/purge", "Passwords or secrets in commands", "Direct payments/refunds", "All-feature VANI completion — Part 136 acceptance"],
  }));

  app.post("/api/part130/actions/preview", authenticated, async (req, res) => {
    try {
      const result = await createPreview(models, req.part130Context, cleanText(req.body?.actionType, 100), req.body?.payload || {});
      res.json({ success: true, part: PART_NUMBER, action: publicAction(result.action), reusedPreview: result.reusedPreview, replyText: `${result.action.actionLabel} preview ready. Exact confirmation required.` });
    } catch (error) {
      res.status(error.httpStatus || 500).json({ success: false, part: PART_NUMBER, code: error.code || "ACADEMIC_PREVIEW_FAILED", message: error.message, missingFields: error.missingFields || [], existingAction: error.existingAction || null });
    }
  });
  app.post("/api/part130/vani/command", authenticated, async (req, res) => {
    try {
      const command = cleanLong(req.body?.command, 4000);
      const parsed = parseCommand(command);
      const result = await createPreview(models, req.part130Context, parsed.actionType, parsed.payload);
      res.json({ success: true, part: PART_NUMBER, command, interpretedActionType: parsed.actionType, interpretedPayload: result.action.payload, action: publicAction(result.action), reusedPreview: result.reusedPreview, replyText: `${result.action.actionLabel} ka preview ready hai. Academic VANI screen par review aur exact-confirm karein.`, openModuleKey: "academic-vani" });
    } catch (error) {
      res.status(error.httpStatus || 500).json({ success: false, part: PART_NUMBER, code: error.code || "ACADEMIC_COMMAND_FAILED", message: error.message, missingFields: error.missingFields || [], openModuleKey: "academic-vani" });
    }
  });
  app.post("/api/part130/actions/:actionId/confirm", authenticated, async (req, res) => {
    try {
      const result = await confirmAndExecute(models, req.part130Context, cleanId(req.params.actionId), req.body?.confirmationText);
      res.json({ success: true, part: PART_NUMBER, action: publicAction(result.action), idempotentReplay: result.idempotentReplay, replyText: result.idempotentReplay ? "Academic action pehle hi execute ho chuka hai." : "Academic action MongoDB me successfully execute ho gaya." });
    } catch (error) {
      res.status(error.httpStatus || 500).json({ success: false, part: PART_NUMBER, code: error.code || "ACADEMIC_EXECUTION_FAILED", message: error.message, action: error.action ? publicAction(error.action) : null, rollbackApplied: Boolean(error.rollbackApplied || error.action?.rollbackApplied) });
    }
  });
  app.post("/api/part130/actions/:actionId/cancel", authenticated, async (req, res) => {
    const action = await models.Action.findOne({ actionId: cleanId(req.params.actionId), instituteId: req.part130Context.instituteId, actorUserId: req.part130Context.userId });
    if (!action) return res.status(404).json({ success: false, part: PART_NUMBER, code: "ACADEMIC_ACTION_NOT_FOUND", message: "Academic action not found." });
    if (action.status === "preview_ready") { action.status = "cancelled"; action.cancelledAt = new Date(); await action.save(); await writeAudit(models, req.part130Context, action, "action_cancelled", "success"); }
    res.json({ success: true, part: PART_NUMBER, action: publicAction(action) });
  });
  app.get("/api/part130/actions", authenticated, async (req, res) => {
    const actions = await models.Action.find({ instituteId: req.part130Context.instituteId, ...(req.part130Context.role === "institute_owner" ? {} : { actorUserId: req.part130Context.userId }) }).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, part: PART_NUMBER, actions: actions.map(publicAction) });
  });
  app.get("/api/part130/records", authenticated, async (req, res) => {
    try {
      const data = await scopedRecords(models, req.part130Context);
      res.json({ success: true, part: PART_NUMBER, ...data });
    } catch (error) {
      res.status(error.httpStatus || 500).json({ success: false, part: PART_NUMBER, code: error.code || "ACADEMIC_RECORDS_FAILED", message: error.message });
    }
  });
  app.get("/api/part130/student-summary", authenticated, async (req, res) => {
    try {
      if (!["institute_owner", "branch_manager", "teacher", "student", "parent", "staff"].includes(req.part130Context.role)) {
        throw Object.assign(new Error("This role cannot access academic Student summaries."), { code: "STUDENT_SUMMARY_ROLE_DENIED", httpStatus: 403 });
      }
      const studentId = cleanId(req.query.studentId || req.part130Context.referenceIds.find(value => value) || "");
      if (!studentId) throw Object.assign(new Error("studentId required."), { code: "STUDENT_ID_REQUIRED", httpStatus: 400 });
      const data = await roleSafeStudentSummary(models, req.part130Context, studentId, cleanId(req.query.classId || ""));
      res.json({ success: true, part: PART_NUMBER, ...data });
    } catch (error) {
      res.status(error.httpStatus || 500).json({ success: false, part: PART_NUMBER, code: error.code || "STUDENT_SUMMARY_FAILED", message: error.message });
    }
  });
}
