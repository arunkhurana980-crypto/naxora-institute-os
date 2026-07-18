import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const PART_NUMBER = 129;
const PART_NAME = "VANI Bulk CSV and JSON Import";
const PREVIEW_TTL_MS = 30 * 60 * 1000;
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;
const MAX_TOTAL_ROWS = 500;
const MAX_ACCOUNT_ROWS = 100;
const MAX_BODY_BYTES = 1_500_000;
const IMPORT_ORDER = ["branches", "courses", "teachers", "classes", "students", "parents", "staff"];
const OWNER_ROLES = new Set(["institute_owner", "owner", "instituteowner"]);
const STAFF_ROLES = new Set(["branch_manager", "accountant", "counsellor", "staff"]);
const ACCOUNT_DATASETS = new Set(["teachers", "students", "parents", "staff"]);
const scryptAsync = promisify(crypto.scrypt);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, "../../frontend");

const DATASETS = Object.freeze({
  branches: {
    label: "Branches",
    required: ["branchName", "branchCode"],
    fields: ["branchName", "branchCode", "city", "address", "phone", "status"],
    unique: ["branchCode"],
  },
  courses: {
    label: "Courses",
    required: ["courseName", "courseCode"],
    fields: ["courseName", "courseCode", "description", "durationMonths", "feeAmount", "status"],
    unique: ["courseCode"],
  },
  teachers: {
    label: "Teachers",
    required: ["identifier", "displayName", "branchRefs"],
    fields: ["identifier", "displayName", "branchRefs", "subjects", "employeeCode", "phone", "status"],
    unique: ["identifier"],
    accountRole: "teacher",
  },
  classes: {
    label: "Batches / Classes",
    required: ["branchRef", "courseRef", "batchCode", "title"],
    fields: ["branchRef", "courseRef", "batchCode", "title", "teacherRef", "schedule", "startDate", "endDate", "capacity", "status"],
    unique: ["batchCode"],
  },
  students: {
    label: "Students",
    required: ["identifier", "displayName", "branchRef"],
    fields: ["identifier", "displayName", "branchRef", "classRef", "courseRef", "rollNumber", "admissionNumber", "phone", "status"],
    unique: ["identifier", "admissionNumber"],
    accountRole: "student",
  },
  parents: {
    label: "Parents and Student Links",
    required: ["identifier", "displayName", "studentRef"],
    fields: ["identifier", "displayName", "studentRef", "relationship", "phone", "status"],
    unique: ["identifier"],
    accountRole: "parent",
  },
  staff: {
    label: "Branch Manager / Accountant / Counsellor / Staff",
    required: ["identifier", "displayName", "accountRole"],
    fields: ["identifier", "displayName", "accountRole", "branchRefs", "instituteWide", "employeeCode", "phone", "status"],
    unique: ["identifier"],
    accountRole: "dynamic",
  },
  linked_package: {
    label: "Linked JSON Package",
    required: [],
    fields: [],
    unique: [],
  },
});

const TEMPLATE_ROWS = Object.freeze({
  branches: [{ branchName: "North Branch", branchCode: "NORTH", city: "Delhi", address: "", phone: "", status: "active" }],
  courses: [{ courseName: "JEE Foundation", courseCode: "JEEF", description: "", durationMonths: 12, feeAmount: 25000, status: "active" }],
  teachers: [{ identifier: "teacher01", displayName: "Demo Teacher", branchRefs: "NORTH", subjects: "Mathematics|Physics", employeeCode: "T001", phone: "", status: "active" }],
  classes: [{ branchRef: "NORTH", courseRef: "JEEF", batchCode: "JEE-A", title: "JEE Morning Batch", teacherRef: "teacher01", schedule: "Mon-Fri 07:00", startDate: "2026-07-20", endDate: "2027-07-19", capacity: 40, status: "active" }],
  students: [{ identifier: "student01", displayName: "Demo Student", branchRef: "NORTH", classRef: "JEE-A", courseRef: "JEEF", rollNumber: "R101", admissionNumber: "ADM101", phone: "", status: "active" }],
  parents: [{ identifier: "parent01", displayName: "Demo Parent", studentRef: "student01", relationship: "mother", phone: "", status: "active" }],
  staff: [{ identifier: "accounts01", displayName: "Demo Accountant", accountRole: "accountant", branchRefs: "", instituteWide: true, employeeCode: "A001", phone: "", status: "active" }],
});

const cleanText = (value = "", max = 255) => String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const cleanLong = (value = "", max = 3000) => String(value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ").trim().slice(0, max);
const cleanId = (value = "") => String(value ?? "").trim().replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 180);
const cleanCode = (value = "") => String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 80);
const cleanBool = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  const text = String(value ?? "").trim().toLowerCase();
  if (["true", "1", "yes", "haan", "on"].includes(text)) return true;
  if (["false", "0", "no", "nahi", "off"].includes(text)) return false;
  return fallback;
};
const cleanNumber = (value, min = 0, max = 10_000_000) => {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : null;
};
const normalizeStatus = (value = "") => ["active", "inactive", "disabled", "completed"].includes(String(value).toLowerCase()) ? String(value).toLowerCase() : "active";
const normalizeRole = (value = "") => ({ owner: "institute_owner", instituteowner: "institute_owner", branchmanager: "branch_manager", counselor: "counsellor" }[String(value).trim().toLowerCase().replace(/[\s-]+/g, "_")] || String(value).trim().toLowerCase().replace(/[\s-]+/g, "_"));
const list = (value, textMode = false, max = 50) => [...new Set((Array.isArray(value) ? value : String(value ?? "").split(/[|,;\n]/)).map(item => textMode ? cleanText(item, 100) : cleanText(item, 180)).filter(Boolean))].slice(0, max);
const sha256 = value => crypto.createHash("sha256").update(String(value ?? "")).digest("hex");
const createId = prefix => `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(5).toString("hex")}`;
const dbReady = () => mongoose.connection?.readyState === 1;

function normalizeIdentifier(value = "") {
  const raw = String(value ?? "").trim().slice(0, 180);
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
function safeObject(value) {
  if (Array.isArray(value)) return value.map(safeObject);
  if (value && typeof value === "object") return Object.keys(value).sort().reduce((acc, key) => { acc[key] = safeObject(value[key]); return acc; }, {});
  return value;
}
function jwtSecrets() {
  return [process.env.JWT_SECRET, process.env.JWT_ACCESS_SECRET, process.env.ACCESS_TOKEN_SECRET, process.env.NAXORA_JWT_SECRET].map(value => String(value ?? "").trim()).filter(Boolean);
}
function verifyJwt(token) {
  const secrets = jwtSecrets();
  if (!secrets.length) throw Object.assign(new Error("JWT server configuration missing."), { code: "JWT_CONFIGURATION_MISSING", httpStatus: 503 });
  for (const secret of secrets) {
    try { return jwt.verify(token, secret, { algorithms: ["HS256", "HS384", "HS512"] }); } catch {}
  }
  throw Object.assign(new Error("Login session invalid or expired."), { code: "INVALID_SESSION", httpStatus: 401 });
}
function ownerContext(req) {
  const auth = String(req.headers.authorization ?? "").trim();
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const payload = req.part120Context || req.user || req.auth || (token ? verifyJwt(token) : null);
  if (!payload) throw Object.assign(new Error("Institute Owner login required."), { code: "OWNER_LOGIN_REQUIRED", httpStatus: 401 });
  const role = normalizeRole(payload.role || payload.userRole || payload.accountRole || payload.user?.role || "");
  if (!OWNER_ROLES.has(role)) throw Object.assign(new Error("Only institute_owner can preview and confirm Part 129 imports."), { code: "OWNER_ONLY", httpStatus: 403 });
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
  try { req.part129Owner = ownerContext(req); next(); }
  catch (error) { res.status(error.httpStatus || 401).json({ success: false, part: PART_NUMBER, code: error.code || "OWNER_AUTH_FAILED", message: error.message }); }
}
function verifyOwnerSecret(req) {
  const expected = String(process.env.NAXORA_OWNER_ACTION_SECRET || "").trim();
  if (!expected) throw Object.assign(new Error("NAXORA_OWNER_ACTION_SECRET Render Environment me configure karein."), { code: "OWNER_ACTION_SECRET_MISSING", httpStatus: 503 });
  const supplied = String(req.headers["x-naxora-owner-action-secret"] || "").trim();
  const left = crypto.createHash("sha256").update(supplied).digest();
  const right = crypto.createHash("sha256").update(expected).digest();
  if (!supplied || !crypto.timingSafeEqual(left, right)) throw Object.assign(new Error("Private Owner verification failed."), { code: "OWNER_VERIFICATION_FAILED", httpStatus: 403 });
}
function passwordFailures(password = "") {
  const failures = [];
  if (password.length < 10) failures.push("at least 10 characters");
  if (password.length > 128) failures.push("maximum 128 characters");
  if (!/[A-Za-z]/.test(password)) failures.push("one letter");
  if (!/\d/.test(password)) failures.push("one number");
  return failures;
}
async function hashPassword(password) {
  const failures = passwordFailures(password);
  if (failures.length) throw Object.assign(new Error(`Temporary password requires ${failures.join(", ")}.`), { code: "WEAK_TEMPORARY_PASSWORD", httpStatus: 400 });
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return { algorithm: "scrypt-v1", salt, hash: Buffer.from(derived).toString("hex") };
}

function defineModels() {
  const importSchema = new mongoose.Schema({
    importId: { type: String, required: true, unique: true, index: true },
    instituteId: { type: String, required: true, index: true },
    actorUserId: { type: String, required: true, index: true },
    actorIdentityId: { type: String, required: true },
    actorDisplayName: { type: String, required: true },
    datasetType: { type: String, enum: Object.keys(DATASETS), required: true, index: true },
    datasetLabel: { type: String, default: "" },
    fileName: { type: String, default: "" },
    fileType: { type: String, enum: ["csv", "json", "manual"], default: "manual" },
    status: { type: String, enum: ["preview_ready", "executing", "executed_native", "failed", "cancelled", "expired"], default: "preview_ready", index: true },
    mapping: { type: mongoose.Schema.Types.Mixed, default: {} },
    options: { type: mongoose.Schema.Types.Mixed, default: {} },
    normalizedData: { type: mongoose.Schema.Types.Mixed, required: true },
    rowCount: { type: Number, required: true },
    accountRowCount: { type: Number, default: 0 },
    validationErrors: { type: [mongoose.Schema.Types.Mixed], default: [] },
    warnings: { type: [mongoose.Schema.Types.Mixed], default: [] },
    duplicateSummary: { type: mongoose.Schema.Types.Mixed, default: {} },
    fingerprint: { type: String, required: true, index: true },
    confirmationDigest: { type: String, required: true },
    previewExpiresAt: { type: Date, required: true, index: true },
    executedAt: { type: Date, default: null },
    result: { type: mongoose.Schema.Types.Mixed, default: {} },
    failureCode: { type: String, default: "" },
    failureMessage: { type: String, default: "" },
    rollbackApplied: { type: Boolean, default: false },
  }, { timestamps: true, strict: true });
  importSchema.index({ instituteId: 1, fingerprint: 1, createdAt: -1 });

  const auditSchema = new mongoose.Schema({
    instituteId: { type: String, required: true, index: true },
    importId: { type: String, required: true, index: true },
    actorUserId: { type: String, required: true },
    event: { type: String, required: true },
    result: { type: String, required: true },
    datasetType: { type: String, required: true },
    rowCount: { type: Number, default: 0 },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  }, { timestamps: true, strict: true });

  return {
    Import: mongoose.models.Part129BulkImport || mongoose.model("Part129BulkImport", importSchema),
    Audit: mongoose.models.Part129BulkImportAudit || mongoose.model("Part129BulkImportAudit", auditSchema),
  };
}
async function writeAudit(models, context, record, event, result, details = {}) {
  try {
    await models.Audit.create({ instituteId: context.instituteId, importId: record.importId, actorUserId: context.userId, event, result, datasetType: record.datasetType, rowCount: record.rowCount, details });
  } catch {}
}
function part128Models() {
  const required = {
    Branch: mongoose.models.Part128Branch,
    Course: mongoose.models.Part128Course,
    ClassBatch: mongoose.models.Part128ClassBatch,
    Teacher: mongoose.models.Part128TeacherProfile,
    Student: mongoose.models.Part128StudentProfile,
    ParentLink: mongoose.models.Part128ParentStudentLink,
    Staff: mongoose.models.Part128StaffProfile,
    Identity: mongoose.models.Part120UnifiedIdentity,
    Scope: mongoose.models.Part124RoleScopeAssignment,
  };
  const missing = Object.entries(required).filter(([, Model]) => !Model).map(([name]) => name);
  if (missing.length) throw Object.assign(new Error(`Required Part 120/124/128 models unavailable: ${missing.join(", ")}`), { code: "BULK_IMPORT_MODELS_MISSING", httpStatus: 503 });
  return required;
}
function bodySize(value) {
  return Buffer.byteLength(JSON.stringify(value ?? null), "utf8");
}
function canonicalHeader(value = "") {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}
function applyMapping(row, mapping, datasetType) {
  const fields = DATASETS[datasetType]?.fields || [];
  const source = row && typeof row === "object" && !Array.isArray(row) ? row : {};
  const keyLookup = Object.keys(source).reduce((acc, key) => { acc[canonicalHeader(key)] = key; return acc; }, {});
  const output = {};
  for (const field of fields) {
    const configured = mapping?.[field];
    const sourceKey = configured && Object.prototype.hasOwnProperty.call(source, configured)
      ? configured
      : keyLookup[canonicalHeader(configured || field)];
    if (sourceKey !== undefined) output[field] = source[sourceKey];
  }
  return output;
}
function cleanDate(value) {
  if (value === undefined || value === null || value === "") return null;
  const date = new Date(String(value).length === 10 ? `${value}T00:00:00.000Z` : value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
function normalizeRow(datasetType, raw, sourceRow) {
  const row = { sourceRow };
  const text = (key, max = 300) => { if (raw[key] !== undefined) row[key] = cleanLong(raw[key], max); };
  switch (datasetType) {
    case "branches":
      text("branchName", 160); row.branchCode = cleanCode(raw.branchCode); text("city", 100); text("address", 500); text("phone", 40); row.status = normalizeStatus(raw.status); break;
    case "courses":
      text("courseName", 160); row.courseCode = cleanCode(raw.courseCode); text("description", 2000); row.durationMonths = cleanNumber(raw.durationMonths, 1, 120); row.feeAmount = cleanNumber(raw.feeAmount, 0, 10_000_000); row.status = normalizeStatus(raw.status); break;
    case "teachers":
      row.identifier = normalizeIdentifier(raw.identifier); text("displayName", 140); row.branchRefs = list(raw.branchRefs); row.subjects = list(raw.subjects, true, 30); text("employeeCode", 80); text("phone", 40); row.status = normalizeStatus(raw.status); break;
    case "classes":
      row.branchRef = cleanText(raw.branchRef, 180); row.courseRef = cleanText(raw.courseRef, 180); row.batchCode = cleanCode(raw.batchCode); text("title", 180); row.teacherRef = cleanText(raw.teacherRef, 180); text("schedule", 500); row.startDate = cleanDate(raw.startDate); row.endDate = cleanDate(raw.endDate); row.capacity = cleanNumber(raw.capacity, 1, 10_000); row.status = normalizeStatus(raw.status); break;
    case "students":
      row.identifier = normalizeIdentifier(raw.identifier); text("displayName", 140); row.branchRef = cleanText(raw.branchRef, 180); row.classRef = cleanText(raw.classRef, 180); row.courseRef = cleanText(raw.courseRef, 180); text("rollNumber", 80); text("admissionNumber", 100); text("phone", 40); row.status = normalizeStatus(raw.status); break;
    case "parents":
      row.identifier = normalizeIdentifier(raw.identifier); text("displayName", 140); row.studentRef = cleanText(raw.studentRef, 180); text("relationship", 60); text("phone", 40); row.status = normalizeStatus(raw.status); row.relationship ||= "guardian"; break;
    case "staff":
      row.identifier = normalizeIdentifier(raw.identifier); text("displayName", 140); row.accountRole = normalizeRole(raw.accountRole); row.branchRefs = list(raw.branchRefs); row.instituteWide = cleanBool(raw.instituteWide, false); text("employeeCode", 80); text("phone", 40); row.status = normalizeStatus(raw.status); break;
    default: break;
  }
  return row;
}
function missingFields(datasetType, row) {
  return (DATASETS[datasetType]?.required || []).filter(field => row[field] === undefined || row[field] === null || row[field] === "" || (Array.isArray(row[field]) && row[field].length === 0));
}
function normalizeInput(datasetType, body) {
  if (!DATASETS[datasetType]) throw Object.assign(new Error("Unsupported datasetType."), { code: "INVALID_DATASET_TYPE", httpStatus: 400 });
  if (bodySize(body) > MAX_BODY_BYTES) throw Object.assign(new Error("Import payload is too large. Maximum 1.5 MB request."), { code: "IMPORT_PAYLOAD_TOO_LARGE", httpStatus: 413 });
  const sensitiveKey = /(password|passcode|otp|cvv|upi.?pin|api.?key|secret|jwt|razorpay|bank.?account|card.?number)/i;
  const scanRows = rows => {
    for (const row of Array.isArray(rows) ? rows : []) {
      const blocked = Object.keys(row && typeof row === "object" ? row : {}).find(key => sensitiveKey.test(canonicalHeader(key)));
      if (blocked) throw Object.assign(new Error(`Sensitive column is not allowed in import files: ${blocked}`), { code: "SENSITIVE_IMPORT_COLUMN_BLOCKED", httpStatus: 400 });
    }
  };
  if (datasetType === "linked_package") {
    const packageValue = body.package && typeof body.package === "object" ? body.package : {};
    for (const type of IMPORT_ORDER) scanRows(packageValue[type]);
  } else scanRows(body.rows);
  if (datasetType === "linked_package") {
    const pkg = body.package && typeof body.package === "object" ? body.package : {};
    const normalized = {};
    let total = 0;
    for (const type of IMPORT_ORDER) {
      const rows = Array.isArray(pkg[type]) ? pkg[type] : [];
      normalized[type] = rows.map((row, index) => normalizeRow(type, row, index + 1));
      total += rows.length;
    }
    return { normalized, rowCount: total };
  }
  const rawRows = Array.isArray(body.rows) ? body.rows : [];
  const mapping = body.mapping && typeof body.mapping === "object" ? body.mapping : {};
  const normalized = rawRows.map((raw, index) => normalizeRow(datasetType, applyMapping(raw, mapping, datasetType), index + 1));
  return { normalized, rowCount: normalized.length };
}
async function existingReferenceMaps(models, instituteId) {
  const [branches, courses, classes, identities, students] = await Promise.all([
    models.Branch.find({ instituteId }).lean(),
    models.Course.find({ instituteId }).lean(),
    models.ClassBatch.find({ instituteId }).lean(),
    models.Identity.find({ instituteId }).lean(),
    models.Student.find({ instituteId }).lean(),
  ]);
  const map = list => new Map(list);
  return {
    branchByCode: map(branches.map(item => [String(item.branchCode || "").toUpperCase(), item.branchId])),
    branchById: map(branches.map(item => [String(item.branchId), item.branchId])),
    courseByCode: map(courses.map(item => [String(item.courseCode || "").toUpperCase(), item.courseId])),
    courseById: map(courses.map(item => [String(item.courseId), item.courseId])),
    classByCode: map(classes.map(item => [String(item.batchCode || "").toUpperCase(), item.classId])),
    classById: map(classes.map(item => [String(item.classId), item.classId])),
    identityByIdentifier: map(identities.map(item => [String(item.identifierCanonical || "").toLowerCase(), String(item._id)])),
    identityById: map(identities.map(item => [String(item._id), String(item._id)])),
    roleByIdentityId: map(identities.map(item => [String(item._id), item.role])),
    teacherByIdentifier: map(identities.filter(item => item.role === "teacher").map(item => [String(item.identifierCanonical || "").toLowerCase(), String(item._id)])),
    teacherById: map(identities.filter(item => item.role === "teacher").map(item => [String(item._id), String(item._id)])),
    studentByIdentifier: map(identities.filter(item => item.role === "student").map(item => [String(item.identifierCanonical || "").toLowerCase(), String(item._id)])),
    studentById: map([...identities.filter(item => item.role === "student").map(item => [String(item._id), String(item._id)]), ...students.map(item => [String(item.studentId), String(item.studentId)])]),
    admissionNumbers: new Set(students.map(item => String(item.admissionNumber || "").toLowerCase()).filter(Boolean)),
  };
}
function resolveReference(reference, byId, byCode, transform = value => value) {
  const text = cleanText(reference, 180);
  if (!text) return "";
  return byId.get(text) || byCode.get(transform(text)) || "";
}
function errorItem(datasetType, row, code, message, field = "") {
  return { datasetType, sourceRow: row.sourceRow, code, field, message };
}
async function validateNormalized(datasetType, normalized, options, models, instituteId) {
  const refs = await existingReferenceMaps(models, instituteId);
  const onDuplicate = options.onDuplicate === "skip" ? "skip" : "error";
  const errors = [];
  const warnings = [];
  const duplicateSummary = { policy: onDuplicate, database: 0, file: 0, skipped: 0 };
  const output = datasetType === "linked_package" ? Object.fromEntries(IMPORT_ORDER.map(type => [type, []])) : [];
  const seen = {
    branchCode: new Set(), courseCode: new Set(), batchCode: new Set(), identifier: new Set(), admissionNumber: new Set(),
  };
  const local = {
    branchByCode: new Map(), courseByCode: new Map(), classByCode: new Map(), teacherByIdentifier: new Map(), studentByIdentifier: new Map(),
  };

  const allRows = datasetType === "linked_package"
    ? IMPORT_ORDER.flatMap(type => (normalized[type] || []).map(row => ({ type, row })))
    : normalized.map(row => ({ type: datasetType, row }));

  for (const { type, row } of allRows) {
    const current = { ...row, skip: false, skipReason: "" };
    const missing = missingFields(type, current);
    for (const field of missing) errors.push(errorItem(type, current, "REQUIRED_FIELD_MISSING", `Required field missing: ${field}`, field));
    if (type === "staff" && !STAFF_ROLES.has(current.accountRole)) errors.push(errorItem(type, current, "INVALID_STAFF_ROLE", "accountRole must be branch_manager, accountant, counsellor or staff.", "accountRole"));
    if (type === "staff" && !current.instituteWide && !(current.branchRefs || []).length) errors.push(errorItem(type, current, "STAFF_SCOPE_REQUIRED", "Staff needs branchRefs or instituteWide=true.", "branchRefs"));

    const duplicate = (key, value, dbSetOrMap, label) => {
      const normalizedValue = String(value || "").toLowerCase();
      if (!normalizedValue) return;
      const fileDuplicate = seen[key].has(normalizedValue);
      const dbDuplicate = dbSetOrMap instanceof Map ? dbSetOrMap.has(value) || dbSetOrMap.has(normalizedValue) : dbSetOrMap.has(normalizedValue);
      if (fileDuplicate || dbDuplicate) {
        duplicateSummary[fileDuplicate ? "file" : "database"] += 1;
        if (onDuplicate === "skip") {
          current.skip = true; current.skipReason ||= `${label} duplicate`; duplicateSummary.skipped += 1;
          warnings.push(errorItem(type, current, "DUPLICATE_SKIPPED", `${label} duplicate row will be skipped.`));
        } else errors.push(errorItem(type, current, "DUPLICATE_FOUND", `${label} already exists or repeats in this file.`));
      }
      seen[key].add(normalizedValue);
    };

    if (type === "branches") duplicate("branchCode", current.branchCode, refs.branchByCode, "branchCode");
    if (type === "courses") duplicate("courseCode", current.courseCode, refs.courseByCode, "courseCode");
    if (type === "classes") duplicate("batchCode", current.batchCode, refs.classByCode, "batchCode");
    if (ACCOUNT_DATASETS.has(type)) duplicate("identifier", current.identifier, refs.identityByIdentifier, "identifier");
    if (type === "students" && current.admissionNumber) duplicate("admissionNumber", current.admissionNumber, refs.admissionNumbers, "admissionNumber");

    if (type === "branches" && current.branchCode && !current.skip) local.branchByCode.set(current.branchCode, `pending:branch:${current.branchCode}`);
    if (type === "courses" && current.courseCode && !current.skip) local.courseByCode.set(current.courseCode, `pending:course:${current.courseCode}`);
    if (type === "teachers" && current.identifier && !current.skip) local.teacherByIdentifier.set(current.identifier, `pending:teacher:${current.identifier}`);
    if (type === "classes" && current.batchCode && !current.skip) local.classByCode.set(current.batchCode, `pending:class:${current.batchCode}`);
    if (type === "students" && current.identifier && !current.skip) local.studentByIdentifier.set(current.identifier, `pending:student:${current.identifier}`);

    const branchExists = ref => Boolean(resolveReference(ref, refs.branchById, new Map([...refs.branchByCode, ...local.branchByCode]), value => value.toUpperCase()));
    const courseExists = ref => Boolean(resolveReference(ref, refs.courseById, new Map([...refs.courseByCode, ...local.courseByCode]), value => value.toUpperCase()));
    const classExists = ref => Boolean(resolveReference(ref, refs.classById, new Map([...refs.classByCode, ...local.classByCode]), value => value.toUpperCase()));
    const teacherExists = ref => Boolean(resolveReference(ref, refs.teacherById, new Map([...refs.teacherByIdentifier, ...local.teacherByIdentifier]), value => value.toLowerCase()));
    const studentExists = ref => Boolean(resolveReference(ref, refs.studentById, new Map([...refs.studentByIdentifier, ...local.studentByIdentifier]), value => value.toLowerCase()));

    if (type === "teachers") for (const ref of current.branchRefs || []) if (!branchExists(ref)) errors.push(errorItem(type, current, "BRANCH_REFERENCE_NOT_FOUND", `Branch reference not found: ${ref}`, "branchRefs"));
    if (type === "classes") {
      if (current.branchRef && !branchExists(current.branchRef)) errors.push(errorItem(type, current, "BRANCH_REFERENCE_NOT_FOUND", `Branch reference not found: ${current.branchRef}`, "branchRef"));
      if (current.courseRef && !courseExists(current.courseRef)) errors.push(errorItem(type, current, "COURSE_REFERENCE_NOT_FOUND", `Course reference not found: ${current.courseRef}`, "courseRef"));
      if (current.teacherRef && !teacherExists(current.teacherRef)) errors.push(errorItem(type, current, "TEACHER_REFERENCE_NOT_FOUND", `Teacher reference not found: ${current.teacherRef}`, "teacherRef"));
    }
    if (type === "students") {
      if (current.branchRef && !branchExists(current.branchRef)) errors.push(errorItem(type, current, "BRANCH_REFERENCE_NOT_FOUND", `Branch reference not found: ${current.branchRef}`, "branchRef"));
      if (current.courseRef && !courseExists(current.courseRef)) errors.push(errorItem(type, current, "COURSE_REFERENCE_NOT_FOUND", `Course reference not found: ${current.courseRef}`, "courseRef"));
      if (current.classRef && !classExists(current.classRef)) errors.push(errorItem(type, current, "CLASS_REFERENCE_NOT_FOUND", `Class reference not found: ${current.classRef}`, "classRef"));
    }
    if (type === "parents" && current.studentRef && !studentExists(current.studentRef)) errors.push(errorItem(type, current, "STUDENT_REFERENCE_NOT_FOUND", `Student reference not found: ${current.studentRef}`, "studentRef"));
    if (type === "staff" && !current.instituteWide) for (const ref of current.branchRefs || []) if (!branchExists(ref)) errors.push(errorItem(type, current, "BRANCH_REFERENCE_NOT_FOUND", `Branch reference not found: ${ref}`, "branchRefs"));

    if (datasetType === "linked_package") output[type].push(current); else output.push(current);
  }
  return { normalized: output, errors, warnings, duplicateSummary };
}
function confirmationText(record) {
  return `CONFIRM BULK IMPORT ${record.datasetType.toUpperCase()} ${String(record.importId).slice(-8).toUpperCase()}`;
}
function publicImport(record, includeData = false) {
  return {
    importId: record.importId,
    datasetType: record.datasetType,
    datasetLabel: record.datasetLabel,
    fileName: record.fileName,
    fileType: record.fileType,
    status: record.status,
    rowCount: record.rowCount,
    accountRowCount: record.accountRowCount,
    mapping: record.mapping,
    options: record.options,
    validationErrors: record.validationErrors,
    warnings: record.warnings,
    duplicateSummary: record.duplicateSummary,
    canConfirm: record.status === "preview_ready" && record.validationErrors.length === 0,
    confirmationTextRequired: record.status === "preview_ready" && record.validationErrors.length === 0 ? confirmationText(record) : null,
    previewExpiresAt: record.previewExpiresAt,
    executedAt: record.executedAt,
    result: record.result || {},
    failureCode: record.failureCode || "",
    failureMessage: record.failureMessage || "",
    rollbackApplied: Boolean(record.rollbackApplied),
    normalizedData: includeData ? record.normalizedData : undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
async function createPreview(models, context, body) {
  if (!dbReady()) throw Object.assign(new Error("MongoDB connection required."), { code: "DATABASE_REQUIRED", httpStatus: 503 });
  const datasetType = cleanText(body.datasetType, 50);
  const options = { onDuplicate: body.options?.onDuplicate === "skip" ? "skip" : "error", allOrNothing: true, chunkSize: Math.max(5, Math.min(50, Number(body.options?.chunkSize) || 25)) };
  const input = normalizeInput(datasetType, body);
  if (!input.rowCount) throw Object.assign(new Error("Import file contains no rows."), { code: "IMPORT_ROWS_REQUIRED", httpStatus: 400 });
  if (input.rowCount > MAX_TOTAL_ROWS) throw Object.assign(new Error(`Maximum ${MAX_TOTAL_ROWS} rows per preview.`), { code: "IMPORT_ROW_LIMIT_EXCEEDED", httpStatus: 400 });
  const p128 = part128Models();
  const validated = await validateNormalized(datasetType, input.normalized, options, p128, context.instituteId);
  const accountRowCount = datasetType === "linked_package"
    ? ["teachers", "students", "parents", "staff"].reduce((sum, type) => sum + (validated.normalized[type] || []).filter(row => !row.skip).length, 0)
    : ACCOUNT_DATASETS.has(datasetType) ? validated.normalized.filter(row => !row.skip).length : 0;
  if (accountRowCount > MAX_ACCOUNT_ROWS) throw Object.assign(new Error(`Maximum ${MAX_ACCOUNT_ROWS} new login accounts per import.`), { code: "ACCOUNT_ROW_LIMIT_EXCEEDED", httpStatus: 400 });
  const digestInput = { instituteId: context.instituteId, datasetType, normalizedData: validated.normalized, options };
  const fingerprint = sha256(JSON.stringify(safeObject(digestInput)));
  const now = new Date();
  const reusable = await models.Import.findOne({ instituteId: context.instituteId, actorUserId: context.userId, fingerprint, status: "preview_ready", previewExpiresAt: { $gt: now } }).sort({ createdAt: -1 });
  if (reusable) return { record: reusable, reusedPreview: true };
  const recent = await models.Import.findOne({ instituteId: context.instituteId, actorUserId: context.userId, fingerprint, status: "executed_native", executedAt: { $gt: new Date(Date.now() - DUPLICATE_WINDOW_MS) } }).sort({ executedAt: -1 });
  if (recent) throw Object.assign(new Error("Same import was executed recently. Duplicate import blocked."), { code: "DUPLICATE_IMPORT_PROTECTED", httpStatus: 409, existingImport: publicImport(recent) });
  const importId = createId("bulk");
  const temporary = { importId, datasetType };
  const record = await models.Import.create({
    importId,
    instituteId: context.instituteId,
    actorUserId: context.userId,
    actorIdentityId: context.identityId,
    actorDisplayName: context.displayName,
    datasetType,
    datasetLabel: cleanText(body.datasetLabel || body.fileName || DATASETS[datasetType].label, 180),
    fileName: cleanText(body.fileName, 180),
    fileType: ["csv", "json"].includes(body.fileType) ? body.fileType : "manual",
    status: "preview_ready",
    mapping: body.mapping && typeof body.mapping === "object" ? body.mapping : {},
    options,
    normalizedData: validated.normalized,
    rowCount: input.rowCount,
    accountRowCount,
    validationErrors: validated.errors.slice(0, 200),
    warnings: validated.warnings.slice(0, 200),
    duplicateSummary: validated.duplicateSummary,
    fingerprint,
    confirmationDigest: sha256(confirmationText(temporary)),
    previewExpiresAt: new Date(Date.now() + PREVIEW_TTL_MS),
  });
  await writeAudit(models, context, record, "preview_created", validated.errors.length ? "validation_failed" : "success", { errorCount: validated.errors.length, warningCount: validated.warnings.length });
  return { record, reusedPreview: false };
}
async function createIdentity(models, context, importRecord, role, row, temporaryPassword) {
  const identifierCanonical = normalizeIdentifier(row.identifier);
  const exists = await models.Identity.findOne({ instituteId: context.instituteId, identifierCanonical });
  if (exists) throw Object.assign(new Error(`Identifier already exists during execution: ${identifierCanonical}`), { code: "IDENTIFIER_EXISTS_DURING_EXECUTION", httpStatus: 409 });
  const password = await hashPassword(temporaryPassword);
  return models.Identity.create({
    instituteId: context.instituteId,
    identifierCanonical,
    identifierType: identifierType(identifierCanonical),
    displayName: row.displayName,
    role,
    passwordAlgorithm: password.algorithm,
    passwordSalt: password.salt,
    passwordHash: password.hash,
    status: "active",
    tokenVersion: 1,
    mustChangePassword: true,
    adoptedFromLegacy: false,
    createdByUserId: `part129_bulk:${importRecord.importId}`,
    failedLoginAttempts: 0,
    lockUntil: null,
    lastPasswordChangeAt: new Date(),
  });
}
async function executionMaps(models, instituteId) {
  const refs = await existingReferenceMaps(models, instituteId);
  return {
    branchByCode: refs.branchByCode,
    branchById: refs.branchById,
    courseByCode: refs.courseByCode,
    courseById: refs.courseById,
    classByCode: refs.classByCode,
    classById: refs.classById,
    identityByIdentifier: refs.identityByIdentifier,
    identityById: refs.identityById,
    teacherByIdentifier: refs.teacherByIdentifier,
    teacherById: refs.teacherById,
    studentByIdentifier: refs.studentByIdentifier,
    studentById: refs.studentById,
  };
}
function resolveExec(ref, byId, byCode, upper = false) {
  const text = cleanText(ref, 180);
  return byId.get(text) || byCode.get(upper ? text.toUpperCase() : text.toLowerCase()) || "";
}
async function executeRows(models, context, importRecord, temporaryPassword) {
  const data = importRecord.normalizedData;
  const datasets = importRecord.datasetType === "linked_package" ? IMPORT_ORDER : [importRecord.datasetType];
  const maps = await executionMaps(models, context.instituteId);
  const created = [];
  const result = { created: Object.fromEntries(IMPORT_ORDER.map(type => [type, 0])), skipped: 0, totalCreated: 0, accountPasswordReturned: false };
  const track = (Model, document) => { created.push([Model, document._id]); return document; };
  const rowsFor = type => importRecord.datasetType === "linked_package" ? (data[type] || []) : type === importRecord.datasetType ? data : [];
  try {
    for (const type of datasets) {
      const rows = rowsFor(type);
      for (let offset = 0; offset < rows.length; offset += importRecord.options.chunkSize || 25) {
        const chunk = rows.slice(offset, offset + (importRecord.options.chunkSize || 25));
        for (const row of chunk) {
          if (row.skip) { result.skipped += 1; continue; }
          if (type === "branches") {
            const doc = track(models.Branch, await models.Branch.create({ instituteId: context.instituteId, branchId: createId("branch"), branchCode: row.branchCode, branchName: row.branchName, city: row.city || "", address: row.address || "", phone: row.phone || "", status: row.status || "active", createdByActionId: importRecord.importId, updatedByActionId: importRecord.importId }));
            maps.branchByCode.set(row.branchCode, doc.branchId); maps.branchById.set(doc.branchId, doc.branchId);
          } else if (type === "courses") {
            const doc = track(models.Course, await models.Course.create({ instituteId: context.instituteId, courseId: createId("course"), courseCode: row.courseCode, courseName: row.courseName, description: row.description || "", durationMonths: row.durationMonths, feeAmount: row.feeAmount, status: row.status || "active", createdByActionId: importRecord.importId, updatedByActionId: importRecord.importId }));
            maps.courseByCode.set(row.courseCode, doc.courseId); maps.courseById.set(doc.courseId, doc.courseId);
          } else if (type === "teachers") {
            const branchIds = row.branchRefs.map(ref => resolveExec(ref, maps.branchById, maps.branchByCode, true)).filter(Boolean);
            if (branchIds.length !== row.branchRefs.length) throw Object.assign(new Error(`Teacher branch reference changed after preview at row ${row.sourceRow}.`), { code: "IMPORT_REFERENCE_DRIFT", httpStatus: 409 });
            const identity = track(models.Identity, await createIdentity(models, context, importRecord, "teacher", row, temporaryPassword));
            const doc = track(models.Teacher, await models.Teacher.create({ instituteId: context.instituteId, teacherId: String(identity._id), identityId: String(identity._id), branchIds, subjects: row.subjects || [], employeeCode: row.employeeCode || "", phone: row.phone || "", status: row.status || "active", createdByActionId: importRecord.importId, updatedByActionId: importRecord.importId }));
            maps.identityByIdentifier.set(row.identifier, String(identity._id)); maps.identityById.set(String(identity._id), String(identity._id)); maps.teacherByIdentifier.set(row.identifier, String(identity._id)); maps.teacherById.set(String(identity._id), String(identity._id));
          } else if (type === "classes") {
            const branchId = resolveExec(row.branchRef, maps.branchById, maps.branchByCode, true);
            const courseId = resolveExec(row.courseRef, maps.courseById, maps.courseByCode, true);
            const teacherId = row.teacherRef ? resolveExec(row.teacherRef, maps.teacherById, maps.teacherByIdentifier, false) : "";
            if (!branchId || !courseId || (row.teacherRef && !teacherId)) throw Object.assign(new Error(`Class reference changed after preview at row ${row.sourceRow}.`), { code: "IMPORT_REFERENCE_DRIFT", httpStatus: 409 });
            const doc = track(models.ClassBatch, await models.ClassBatch.create({ instituteId: context.instituteId, classId: createId("class"), branchId, courseId, batchCode: row.batchCode, title: row.title, teacherId, schedule: row.schedule || "", startDate: row.startDate ? new Date(row.startDate) : null, endDate: row.endDate ? new Date(row.endDate) : null, capacity: row.capacity, status: row.status || "active", createdByActionId: importRecord.importId, updatedByActionId: importRecord.importId }));
            maps.classByCode.set(row.batchCode, doc.classId); maps.classById.set(doc.classId, doc.classId);
          } else if (type === "students") {
            const branchId = resolveExec(row.branchRef, maps.branchById, maps.branchByCode, true);
            const courseId = row.courseRef ? resolveExec(row.courseRef, maps.courseById, maps.courseByCode, true) : "";
            const classId = row.classRef ? resolveExec(row.classRef, maps.classById, maps.classByCode, true) : "";
            if (!branchId || (row.courseRef && !courseId) || (row.classRef && !classId)) throw Object.assign(new Error(`Student reference changed after preview at row ${row.sourceRow}.`), { code: "IMPORT_REFERENCE_DRIFT", httpStatus: 409 });
            const identity = track(models.Identity, await createIdentity(models, context, importRecord, "student", row, temporaryPassword));
            const doc = track(models.Student, await models.Student.create({ instituteId: context.instituteId, studentId: String(identity._id), identityId: String(identity._id), branchId, classId, courseId, rollNumber: row.rollNumber || "", admissionNumber: row.admissionNumber || "", phone: row.phone || "", status: row.status || "active", createdByActionId: importRecord.importId, updatedByActionId: importRecord.importId }));
            maps.identityByIdentifier.set(row.identifier, String(identity._id)); maps.identityById.set(String(identity._id), String(identity._id)); maps.studentByIdentifier.set(row.identifier, String(identity._id)); maps.studentById.set(String(identity._id), String(identity._id));
          } else if (type === "parents") {
            const studentId = resolveExec(row.studentRef, maps.studentById, maps.studentByIdentifier, false);
            if (!studentId) throw Object.assign(new Error(`Parent Student reference changed after preview at row ${row.sourceRow}.`), { code: "IMPORT_REFERENCE_DRIFT", httpStatus: 409 });
            const identity = track(models.Identity, await createIdentity(models, context, importRecord, "parent", row, temporaryPassword));
            track(models.ParentLink, await models.ParentLink.create({ instituteId: context.instituteId, linkId: createId("parentlink"), parentIdentityId: String(identity._id), studentId, relationship: row.relationship || "guardian", status: row.status || "active", createdByActionId: importRecord.importId, updatedByActionId: importRecord.importId }));
            track(models.Scope, await models.Scope.create({ instituteId: context.instituteId, identityId: String(identity._id), role: "parent", branchIds: [], childStudentIds: [studentId], instituteWide: false, status: "active", createdByUserId: context.userId, updatedByUserId: context.userId }));
            maps.identityByIdentifier.set(row.identifier, String(identity._id)); maps.identityById.set(String(identity._id), String(identity._id));
          } else if (type === "staff") {
            const branchIds = row.instituteWide ? [] : row.branchRefs.map(ref => resolveExec(ref, maps.branchById, maps.branchByCode, true)).filter(Boolean);
            if (!row.instituteWide && branchIds.length !== row.branchRefs.length) throw Object.assign(new Error(`Staff branch reference changed after preview at row ${row.sourceRow}.`), { code: "IMPORT_REFERENCE_DRIFT", httpStatus: 409 });
            const identity = track(models.Identity, await createIdentity(models, context, importRecord, row.accountRole, row, temporaryPassword));
            track(models.Staff, await models.Staff.create({ instituteId: context.instituteId, staffId: String(identity._id), identityId: String(identity._id), role: row.accountRole, branchIds, instituteWide: Boolean(row.instituteWide), employeeCode: row.employeeCode || "", phone: row.phone || "", status: row.status || "active", createdByActionId: importRecord.importId, updatedByActionId: importRecord.importId }));
            track(models.Scope, await models.Scope.create({ instituteId: context.instituteId, identityId: String(identity._id), role: row.accountRole, branchIds, childStudentIds: [], instituteWide: Boolean(row.instituteWide), status: "active", createdByUserId: context.userId, updatedByUserId: context.userId }));
            maps.identityByIdentifier.set(row.identifier, String(identity._id)); maps.identityById.set(String(identity._id), String(identity._id));
          }
          result.created[type] += 1;
          result.totalCreated += 1;
        }
      }
    }
    return result;
  } catch (error) {
    let rollbackApplied = false;
    for (const [Model, id] of created.reverse()) {
      try { await Model.deleteOne({ _id: id }); rollbackApplied = true; } catch {}
    }
    error.rollbackApplied = rollbackApplied;
    error.createdBeforeRollback = created.length;
    throw error;
  }
}
async function confirmImport(models, context, importId, exactConfirmation, temporaryPassword) {
  const record = await models.Import.findOne({ importId, instituteId: context.instituteId, actorUserId: context.userId });
  if (!record) throw Object.assign(new Error("Bulk import preview not found for this Owner."), { code: "IMPORT_NOT_FOUND", httpStatus: 404 });
  if (record.status === "executed_native") return { record, idempotentReplay: true };
  if (record.status !== "preview_ready") throw Object.assign(new Error(`Import cannot execute from status ${record.status}.`), { code: "IMPORT_STATE_CONFLICT", httpStatus: 409 });
  if (record.validationErrors.length) throw Object.assign(new Error("Validation errors must be fixed before confirmation."), { code: "IMPORT_VALIDATION_ERRORS_PRESENT", httpStatus: 400 });
  if (new Date(record.previewExpiresAt).getTime() <= Date.now()) { record.status = "expired"; await record.save(); throw Object.assign(new Error("Import preview expired. Create a fresh preview."), { code: "IMPORT_PREVIEW_EXPIRED", httpStatus: 410 }); }
  if (sha256(String(exactConfirmation || "").trim()) !== record.confirmationDigest) throw Object.assign(new Error(`Exact confirmation required: ${confirmationText(record)}`), { code: "EXACT_CONFIRMATION_REQUIRED", httpStatus: 400 });
  if (record.accountRowCount && passwordFailures(String(temporaryPassword || "")).length) throw Object.assign(new Error("A valid private temporary password is required for account rows."), { code: "WEAK_TEMPORARY_PASSWORD", httpStatus: 400 });
  const locked = await models.Import.findOneAndUpdate({ _id: record._id, status: "preview_ready" }, { status: "executing" }, { new: true });
  if (!locked) throw Object.assign(new Error("Another request is already executing this import."), { code: "IMPORT_EXECUTION_IN_PROGRESS", httpStatus: 409 });
  try {
    const p128 = part128Models();
    const result = await executeRows(p128, context, locked, String(temporaryPassword || ""));
    locked.status = "executed_native";
    locked.executedAt = new Date();
    locked.result = result;
    locked.failureCode = "";
    locked.failureMessage = "";
    locked.rollbackApplied = false;
    await locked.save();
    await writeAudit(models, context, locked, "import_executed", "native_success", { totalCreated: result.totalCreated, skipped: result.skipped });
    return { record: locked, idempotentReplay: false };
  } catch (error) {
    locked.status = "failed";
    locked.failureCode = cleanText(error.code || "BULK_IMPORT_FAILED", 120);
    locked.failureMessage = cleanText(error.message || "Bulk import failed.", 500);
    locked.rollbackApplied = Boolean(error.rollbackApplied);
    await locked.save();
    await writeAudit(models, context, locked, "import_executed", "failed", { failureCode: locked.failureCode, rollbackApplied: locked.rollbackApplied });
    error.record = locked;
    throw error;
  }
}
function linkedTemplate() {
  return {
    schemaVersion: 1,
    datasetLabel: "NAXORA Linked Import Example",
    branches: TEMPLATE_ROWS.branches,
    courses: TEMPLATE_ROWS.courses,
    teachers: TEMPLATE_ROWS.teachers,
    classes: TEMPLATE_ROWS.classes,
    students: TEMPLATE_ROWS.students,
    parents: TEMPLATE_ROWS.parents,
    staff: TEMPLATE_ROWS.staff,
  };
}
function csvEscape(value) {
  const text = Array.isArray(value) ? value.join("|") : String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
function csvTemplate(datasetType) {
  const fields = DATASETS[datasetType].fields;
  const rows = TEMPLATE_ROWS[datasetType] || [];
  return [fields.join(","), ...rows.map(row => fields.map(field => csvEscape(row[field])).join(","))].join("\n");
}

export function registerPart129VaniBulkImport({ app } = {}) {
  if (!app || typeof app.get !== "function" || typeof app.post !== "function") throw new Error("Part 129 registration requires Express app.");
  if (app.locals.part129VaniBulkImportRegistered) return;
  app.locals.part129VaniBulkImportRegistered = true;
  const models = defineModels();

  app.get(["/bulk-import-vani", "/vani-bulk-import", "/part129"], (req, res) => res.sendFile(path.join(frontendDir, "naxora-bulk-import-vani.html")));
  app.get("/naxora-bulk-import-vani.css", (req, res) => res.type("text/css").sendFile(path.join(frontendDir, "naxora-bulk-import-vani.css")));
  app.get("/naxora-bulk-import-vani.js", (req, res) => res.type("application/javascript").sendFile(path.join(frontendDir, "naxora-bulk-import-vani.js")));
  app.get("/naxora-part129-global-vani-bridge.js", (req, res) => res.type("application/javascript").sendFile(path.join(frontendDir, "naxora-part129-global-vani-bridge.js")));

  app.get("/api/part129/status", (req, res) => res.json({
    success: true, part: PART_NUMBER, name: PART_NAME, status: "vani_bulk_csv_json_import_active", page: "/bulk-import-vani",
    csvImport: true, jsonImport: true, linkedJsonPackage: true, columnMapping: true, duplicateDetection: true,
    duplicatePolicies: ["error", "skip"], previewRequired: true, exactConfirmationRequired: true,
    ownerActionSecretRequired: true, chunkedImport: true, allOrNothingRollback: true,
    maxRowsPerImport: MAX_TOTAL_ROWS, maxAccountRowsPerImport: MAX_ACCOUNT_ROWS,
    localFileSelectionRequired: true, vaniCannotSecretlyReadFiles: true,
    passwordInFileBlockedByDesign: true, passwordReturnedByApi: false,
    deleteActionsEnabled: false, directMoneyActionsEnabled: false,
    allFeatureVaniComplete: false, targetFinalAcceptancePart: 136, nextPart: 130,
    nextPartName: "VANI Academic Operations",
  }));
  app.get("/api/part129/security-policy", (req, res) => res.json({
    success: true, part: PART_NUMBER, ownerOnly: true, instituteIsolation: true, serverSideValidation: true,
    allowedColumnsOnly: true, rowAndPayloadLimits: true, duplicateProtection: true,
    exactConfirmationRequired: true, ownerSecretRequired: true, temporaryPasswordPrivateAtConfirmation: true,
    temporaryPasswordNeverStoredInPreview: true, temporaryPasswordNeverReturned: true,
    firstLoginPasswordChangeRequired: true, linkedReferencesValidated: true,
    chunkedExecution: true, allOrNothingRollback: true, destructiveImportDisabled: true,
    directPaymentFieldsUnsupported: true,
  }));
  app.get("/api/part129/catalog", (req, res) => res.json({
    success: true, part: PART_NUMBER,
    datasets: Object.entries(DATASETS).map(([datasetType, definition]) => ({ datasetType, ...definition, csvSupported: datasetType !== "linked_package", jsonSupported: true })),
    importOrder: IMPORT_ORDER, maxRows: MAX_TOTAL_ROWS, maxAccountRows: MAX_ACCOUNT_ROWS,
  }));
  app.get("/api/part129/templates/:datasetType", (req, res) => {
    const datasetType = cleanText(req.params.datasetType, 50);
    if (!DATASETS[datasetType]) return res.status(404).json({ success: false, part: PART_NUMBER, code: "TEMPLATE_NOT_FOUND", message: "Unknown template dataset." });
    if (datasetType === "linked_package") return res.json(linkedTemplate());
    const format = req.query.format === "json" ? "json" : "csv";
    if (format === "json") return res.json(TEMPLATE_ROWS[datasetType]);
    res.type("text/csv").setHeader("Content-Disposition", `attachment; filename=naxora-${datasetType}-template.csv`).send(csvTemplate(datasetType));
  });
  app.post("/api/part129/vani/command", ownerOnly, (req, res) => {
    const command = cleanLong(req.body?.command, 1000);
    if (!/(bulk|csv|json|spreadsheet|excel|import|upload).*(data|student|teacher|branch|course|batch|class|parent|staff|file)?/i.test(command)) {
      return res.status(400).json({ success: false, part: PART_NUMBER, code: "BULK_IMPORT_COMMAND_NOT_RECOGNISED", message: "Bulk import command samajh nahi aaya.", openModuleKey: "bulk-import-vani" });
    }
    res.json({ success: true, part: PART_NUMBER, openModuleKey: "bulk-import-vani", fileSelectionRequired: true, previewCreated: false, replyText: "Bulk Import screen khol rahi hoon. Browser security ke kaaran file Owner ko manually select karni hogi; uske baad mapping, validation aur preview hoga." });
  });
  app.post("/api/part129/imports/preview", ownerOnly, async (req, res) => {
    try {
      const result = await createPreview(models, req.part129Owner, req.body || {});
      res.json({ success: true, part: PART_NUMBER, import: publicImport(result.record, true), reusedPreview: result.reusedPreview, replyText: result.record.validationErrors.length ? "Preview ready, lekin validation errors fix karni hain." : "Import preview ready. Exact confirmation aur private Owner verification required hai." });
    } catch (error) {
      res.status(error.httpStatus || 500).json({ success: false, part: PART_NUMBER, code: error.code || "IMPORT_PREVIEW_FAILED", message: error.message, existingImport: error.existingImport || null });
    }
  });
  app.post("/api/part129/imports/:importId/confirm", ownerOnly, async (req, res) => {
    try {
      verifyOwnerSecret(req);
      const result = await confirmImport(models, req.part129Owner, cleanId(req.params.importId), req.body?.confirmationText, String(req.body?.temporaryPassword || ""));
      res.json({ success: true, part: PART_NUMBER, import: publicImport(result.record), idempotentReplay: result.idempotentReplay, passwordReturned: false, replyText: result.idempotentReplay ? "Import pehle hi execute ho chuka hai." : "Bulk import MongoDB me successfully execute ho gaya." });
    } catch (error) {
      res.status(error.httpStatus || 500).json({ success: false, part: PART_NUMBER, code: error.code || "IMPORT_EXECUTION_FAILED", message: error.message, import: error.record ? publicImport(error.record) : null, rollbackApplied: Boolean(error.rollbackApplied || error.record?.rollbackApplied) });
    }
  });
  app.post("/api/part129/imports/:importId/cancel", ownerOnly, async (req, res) => {
    const record = await models.Import.findOne({ importId: cleanId(req.params.importId), instituteId: req.part129Owner.instituteId, actorUserId: req.part129Owner.userId });
    if (!record) return res.status(404).json({ success: false, part: PART_NUMBER, code: "IMPORT_NOT_FOUND", message: "Import preview not found." });
    if (record.status === "preview_ready") { record.status = "cancelled"; await record.save(); await writeAudit(models, req.part129Owner, record, "import_cancelled", "success"); }
    res.json({ success: true, part: PART_NUMBER, import: publicImport(record) });
  });
  app.get("/api/part129/imports", ownerOnly, async (req, res) => {
    const imports = await models.Import.find({ instituteId: req.part129Owner.instituteId }).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, part: PART_NUMBER, imports: imports.map(record => publicImport(record)) });
  });
  app.get("/api/part129/imports/:importId", ownerOnly, async (req, res) => {
    const record = await models.Import.findOne({ importId: cleanId(req.params.importId), instituteId: req.part129Owner.instituteId });
    if (!record) return res.status(404).json({ success: false, part: PART_NUMBER, code: "IMPORT_NOT_FOUND", message: "Import not found." });
    res.json({ success: true, part: PART_NUMBER, import: publicImport(record, true) });
  });
  app.get("/api/part129/demo", (req, res) => res.json({
    success: true, part: PART_NUMBER,
    flow: ["Owner asks VANI to open Bulk Import", "Owner manually selects CSV/JSON file", "Browser parses file locally", "Owner maps columns", "Server validates rows and linked references", "Duplicates are blocked or explicitly skipped", "Preview and exact confirmation", "Private temporary password for account rows", "Private Owner Action Secret", "Chunked MongoDB import", "All-or-nothing rollback on failure", "Audit and result"],
    supported: Object.keys(DATASETS),
    notSupported: ["Silent file access", "Passwords or secrets inside CSV/JSON", "Update/delete imports", "Direct payment or refund import", "All-feature VANI completion — target Part 136"],
  }));
}
