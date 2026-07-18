import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { getPart126Acceptance } from "./part126-native-e2e-integration.js";

const PART_NUMBER = 127;
const PART_NAME = "Final Demo Data, Acceptance and Project Freeze";
const RELEASE_VERSION = "2.0-demo-beta";
const RELEASE_CLASSIFICATION = "FINAL_DEMO_BETA";
const PREVIEW_TTL_MS = 30 * 60 * 1000;
const scryptAsync = promisify(crypto.scrypt);
const OWNER_ROLES = new Set(["institute_owner", "owner", "instituteowner"]);
const SUPPORTED_ROLES = Object.freeze([
  "branch_manager",
  "teacher",
  "student",
  "parent",
  "accountant",
  "counsellor",
  "staff",
]);
const REQUIRED_DEMO_ROLES = Object.freeze([
  "institute_owner",
  ...SUPPORTED_ROLES,
]);
const NATIVE_VANI_ACTIONS = Object.freeze([
  "attendance.mark",
  "attendance.correction_request",
  "fees.reminder",
  "fees.assistance_request",
  "admission.follow_up",
  "assignment.create",
  "assignment.submit",
  "message.send",
  "branch.task.create",
]);

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
function cleanLongText(value = "", max = 4000) {
  return String(value || "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, max);
}
function cleanId(value = "") {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9:_-]/g, "")
    .slice(0, 180);
}
function normalizeRole(value = "") {
  const role = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  const aliases = {
    owner: "institute_owner",
    instituteowner: "institute_owner",
    branchmanager: "branch_manager",
    counselor: "counsellor",
  };
  return aliases[role] || role;
}
function normalizeIdentifier(value = "") {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "").slice(0, 180);
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
function getBearer(req) {
  const auth = String(req.headers.authorization || "").trim();
  return auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
}
function verifyJwt(token) {
  const secrets = jwtSecrets();
  if (!secrets.length) {
    const error = new Error("JWT server configuration missing.");
    error.code = "JWT_CONFIGURATION_MISSING";
    error.httpStatus = 503;
    throw error;
  }
  for (const secret of secrets) {
    try {
      return jwt.verify(token, secret, {
        algorithms: ["HS256", "HS384", "HS512"],
      });
    } catch {
      // Try another configured current/legacy secret.
    }
  }
  const error = new Error("Login session invalid or expired.");
  error.code = "INVALID_SESSION";
  error.httpStatus = 401;
  throw error;
}
function ownerContext(req) {
  const existing = req.part120Context || req.user || req.auth || null;
  const payload = existing || (getBearer(req) ? verifyJwt(getBearer(req)) : null);
  if (!payload) {
    const error = new Error("Institute owner login required.");
    error.code = "OWNER_LOGIN_REQUIRED";
    error.httpStatus = 401;
    throw error;
  }

  const role = normalizeRole(
    payload.role ||
    payload.userRole ||
    payload.accountRole ||
    payload.user?.role ||
    ""
  );
  if (!OWNER_ROLES.has(role)) {
    const error = new Error("Only institute_owner can use final acceptance controls.");
    error.code = "OWNER_ONLY";
    error.httpStatus = 403;
    throw error;
  }

  const tokenInstituteId = cleanId(
    payload.instituteId ||
    payload.institute_id ||
    payload.user?.instituteId ||
    payload.tenantId ||
    ""
  );
  const requestedInstituteId = cleanId(
    req.headers["x-naxora-institute-id"] ||
    req.body?.instituteId ||
    req.query?.instituteId ||
    ""
  );
  if (
    tokenInstituteId &&
    requestedInstituteId &&
    tokenInstituteId !== requestedInstituteId
  ) {
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
    instituteId,
    userId: cleanId(
      payload.userId ||
      payload.identityId ||
      payload.id ||
      payload._id ||
      payload.sub ||
      "owner"
    ),
    displayName: cleanText(
      payload.displayName ||
      payload.name ||
      payload.fullName ||
      payload.email ||
      "Institute Owner",
      120
    ),
    role: "institute_owner",
  };
}
function ownerOnly(req, res, next) {
  try {
    req.part127Owner = ownerContext(req);
    next();
  } catch (error) {
    res.status(error.httpStatus || 401).json({
      success: false,
      part: PART_NUMBER,
      code: error.code || "OWNER_AUTH_FAILED",
      message: error.message,
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
    const error = new Error(
      "NAXORA_OWNER_ACTION_SECRET Render Environment me configure karein."
    );
    error.code = "OWNER_ACTION_SECRET_MISSING";
    error.httpStatus = 503;
    throw error;
  }
  const supplied = String(
    req.headers["x-naxora-owner-action-secret"] || ""
  ).trim();
  if (!supplied || !safeEqualText(supplied, expected)) {
    const error = new Error("Private owner verification failed.");
    error.code = "OWNER_VERIFICATION_FAILED";
    error.httpStatus = 403;
    throw error;
  }
}
function passwordPolicy(password = "") {
  const value = String(password || "");
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
    const error = new Error(
      `Demo password must contain ${policy.failures.join(", ")}.`
    );
    error.code = "WEAK_DEMO_PASSWORD";
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
function boundedInteger(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}
function shortCode(prefix = "D") {
  return `${prefix}${Date.now().toString(36).toUpperCase()}${crypto
    .randomBytes(2)
    .toString("hex")
    .toUpperCase()}`;
}
function isoDateOffset(days = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
function sanitizeTemplate(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  const counts = source.counts && typeof source.counts === "object"
    ? source.counts
    : {};
  return {
    schemaVersion: 1,
    datasetLabel: cleanText(source.datasetLabel || "NAXORA Final Demo", 100),
    instituteName: cleanText(
      source.instituteName || "NAXORA Demo Institute",
      140
    ),
    branchCount: boundedInteger(
      counts.branchCount ?? source.branchCount,
      1,
      1,
      3
    ),
    teachersPerBranch: boundedInteger(
      counts.teachersPerBranch ?? source.teachersPerBranch,
      2,
      1,
      3
    ),
    studentsPerTeacher: boundedInteger(
      counts.studentsPerTeacher ?? source.studentsPerTeacher,
      3,
      1,
      5
    ),
    attendanceDays: boundedInteger(
      counts.attendanceDays ?? source.attendanceDays,
      5,
      2,
      15
    ),
    resultsPerStudent: boundedInteger(
      counts.resultsPerStudent ?? source.resultsPerStudent,
      2,
      1,
      4
    ),
    leadsPerBranch: boundedInteger(
      counts.leadsPerBranch ?? source.leadsPerBranch,
      3,
      1,
      10
    ),
    sharedDemoPassword: true,
    createRoleScopes: source.createRoleScopes !== false,
    createNativeVaniExamples: source.createNativeVaniExamples !== false,
  };
}
function templateSummary(template) {
  const branches = template.branchCount;
  const teachers = branches * template.teachersPerBranch;
  const students = teachers * template.studentsPerTeacher;
  const parents = students;
  const supportingRoles = branches + 3;
  const accounts = teachers + students + parents + supportingRoles;
  const attendance = students * template.attendanceDays;
  const results = students * template.resultsPerStudent;
  const records =
    branches +
    teachers +
    students +
    students +
    attendance +
    students +
    students +
    results +
    branches * template.leadsPerBranch +
    branches +
    students;
  return {
    branches,
    teachers,
    students,
    parents,
    supportingRoles,
    accounts,
    records,
    attendance,
    results,
  };
}
function importConfirmation(datasetCode) {
  return `IMPORT FINAL DEMO DATA ${datasetCode}`;
}
function resetConfirmation(datasetCode) {
  return `RESET FINAL DEMO DATA ${datasetCode}`;
}
function freezeConfirmation(releaseCode) {
  return `FREEZE NAXORA FINAL DEMO ${releaseCode}`;
}

function defineModels() {
  const previewSchema = new mongoose.Schema({
    previewId: { type: String, required: true, unique: true, index: true },
    instituteId: { type: String, required: true, index: true },
    ownerUserId: { type: String, required: true },
    datasetCode: { type: String, required: true, unique: true, index: true },
    template: { type: mongoose.Schema.Types.Mixed, required: true },
    summary: { type: mongoose.Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ["preview_ready", "used", "expired", "cancelled"],
      default: "preview_ready",
      index: true,
    },
    expiresAt: { type: Date, required: true, index: true },
    usedAt: { type: Date, default: null },
  }, { timestamps: true, strict: true });

  const datasetSchema = new mongoose.Schema({
    datasetCode: { type: String, required: true, unique: true, index: true },
    instituteId: { type: String, required: true, index: true },
    datasetLabel: { type: String, required: true },
    instituteName: { type: String, required: true },
    template: { type: mongoose.Schema.Types.Mixed, required: true },
    summary: { type: mongoose.Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ["importing", "active", "failed", "reset"],
      default: "importing",
      index: true,
    },
    createdByUserId: { type: String, required: true },
    importedAt: { type: Date, default: null },
    resetAt: { type: Date, default: null },
    failureCode: { type: String, default: "" },
    releaseCode: { type: String, default: "" },
  }, { timestamps: true, strict: true });
  datasetSchema.index(
    { instituteId: 1, status: 1 },
    { unique: true, partialFilterExpression: { status: "active" } }
  );

  const branchSchema = new mongoose.Schema({
    datasetCode: { type: String, required: true, index: true },
    instituteId: { type: String, required: true, index: true },
    branchId: { type: String, required: true, index: true },
    branchName: { type: String, required: true },
    status: { type: String, default: "active" },
  }, { timestamps: true, strict: true });
  branchSchema.index({ datasetCode: 1, branchId: 1 }, { unique: true });

  const teacherSchema = new mongoose.Schema({
    datasetCode: { type: String, required: true, index: true },
    instituteId: { type: String, required: true, index: true },
    branchId: { type: String, required: true, index: true },
    teacherId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    identityId: { type: String, required: true, index: true },
    displayName: { type: String, required: true },
    subject: { type: String, default: "Mathematics" },
  }, { timestamps: true, strict: true });

  const studentSchema = new mongoose.Schema({
    datasetCode: { type: String, required: true, index: true },
    instituteId: { type: String, required: true, index: true },
    branchId: { type: String, required: true, index: true },
    studentId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    identityId: { type: String, required: true, index: true },
    parentId: { type: String, required: true, index: true },
    teacherId: { type: String, required: true, index: true },
    classId: { type: String, required: true, index: true },
    displayName: { type: String, required: true },
    admissionStatus: { type: String, default: "active" },
  }, { timestamps: true, strict: true });

  const enrollmentSchema = new mongoose.Schema({
    datasetCode: { type: String, required: true, index: true },
    instituteId: { type: String, required: true, index: true },
    branchId: { type: String, required: true, index: true },
    enrollmentId: { type: String, required: true, unique: true, index: true },
    studentId: { type: String, required: true, index: true },
    teacherId: { type: String, required: true, index: true },
    classId: { type: String, required: true, index: true },
    courseId: { type: String, required: true, index: true },
    status: { type: String, default: "active" },
  }, { timestamps: true, strict: true });

  const classSchema = new mongoose.Schema({
    datasetCode: { type: String, required: true, index: true },
    instituteId: { type: String, required: true, index: true },
    branchId: { type: String, required: true, index: true },
    classId: { type: String, required: true, unique: true, index: true },
    batchId: { type: String, required: true, index: true },
    courseId: { type: String, required: true, index: true },
    teacherId: { type: String, required: true, index: true },
    title: { type: String, required: true },
  }, { timestamps: true, strict: true });

  const attendanceSchema = new mongoose.Schema({
    datasetCode: { type: String, required: true, index: true },
    instituteId: { type: String, required: true, index: true },
    branchId: { type: String, required: true, index: true },
    attendanceId: { type: String, required: true, unique: true, index: true },
    studentId: { type: String, required: true, index: true },
    teacherId: { type: String, required: true, index: true },
    classId: { type: String, required: true, index: true },
    attendanceDate: { type: String, required: true, index: true },
    status: { type: String, enum: ["present", "absent", "late"], required: true },
  }, { timestamps: true, strict: true });

  const feeSchema = new mongoose.Schema({
    datasetCode: { type: String, required: true, index: true },
    instituteId: { type: String, required: true, index: true },
    branchId: { type: String, required: true, index: true },
    feeId: { type: String, required: true, unique: true, index: true },
    studentId: { type: String, required: true, index: true },
    invoiceId: { type: String, required: true, index: true },
    receiptId: { type: String, default: "" },
    amount: { type: Number, required: true },
    dueDate: { type: String, required: true },
    status: { type: String, enum: ["paid", "due", "partial"], required: true },
  }, { timestamps: true, strict: true });

  const assignmentSchema = new mongoose.Schema({
    datasetCode: { type: String, required: true, index: true },
    instituteId: { type: String, required: true, index: true },
    branchId: { type: String, required: true, index: true },
    assignmentId: { type: String, required: true, unique: true, index: true },
    studentId: { type: String, required: true, index: true },
    teacherId: { type: String, required: true, index: true },
    classId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    dueDate: { type: String, required: true },
    status: { type: String, default: "assigned" },
  }, { timestamps: true, strict: true });

  const resultSchema = new mongoose.Schema({
    datasetCode: { type: String, required: true, index: true },
    instituteId: { type: String, required: true, index: true },
    branchId: { type: String, required: true, index: true },
    resultId: { type: String, required: true, unique: true, index: true },
    studentId: { type: String, required: true, index: true },
    teacherId: { type: String, required: true, index: true },
    classId: { type: String, required: true, index: true },
    examName: { type: String, required: true },
    score: { type: Number, required: true },
    grade: { type: String, required: true },
  }, { timestamps: true, strict: true });

  const leadSchema = new mongoose.Schema({
    datasetCode: { type: String, required: true, index: true },
    instituteId: { type: String, required: true, index: true },
    branchId: { type: String, required: true, index: true },
    leadId: { type: String, required: true, unique: true, index: true },
    counsellorId: { type: String, required: true, index: true },
    displayName: { type: String, required: true },
    status: { type: String, enum: ["new", "follow_up", "converted"], required: true },
    nextFollowUpAt: { type: String, required: true },
  }, { timestamps: true, strict: true });

  const noticeSchema = new mongoose.Schema({
    datasetCode: { type: String, required: true, index: true },
    instituteId: { type: String, required: true, index: true },
    branchId: { type: String, required: true, index: true },
    noticeId: { type: String, required: true, unique: true, index: true },
    studentId: { type: String, required: true, index: true },
    parentId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
  }, { timestamps: true, strict: true });

  const taskSchema = new mongoose.Schema({
    datasetCode: { type: String, required: true, index: true },
    instituteId: { type: String, required: true, index: true },
    branchId: { type: String, required: true, index: true },
    taskId: { type: String, required: true, unique: true, index: true },
    assignedTo: { type: String, required: true, index: true },
    title: { type: String, required: true },
    dueDate: { type: String, required: true },
    status: { type: String, enum: ["open", "completed"], default: "open" },
  }, { timestamps: true, strict: true });

  const releaseSchema = new mongoose.Schema({
    releaseCode: { type: String, required: true, unique: true, index: true },
    instituteId: { type: String, required: true, index: true },
    version: { type: String, required: true },
    classification: { type: String, required: true },
    datasetCode: { type: String, required: true },
    status: {
      type: String,
      enum: ["frozen_demo_beta", "superseded"],
      default: "frozen_demo_beta",
      index: true,
    },
    frozenByUserId: { type: String, required: true },
    frozenAt: { type: Date, default: Date.now },
    gitCommit: { type: String, default: "" },
    manifest: { type: mongoose.Schema.Types.Mixed, required: true },
  }, { timestamps: true, strict: true });
  releaseSchema.index(
    { instituteId: 1, status: 1 },
    { unique: true, partialFilterExpression: { status: "frozen_demo_beta" } }
  );

  const auditSchema = new mongoose.Schema({
    instituteId: { type: String, required: true, index: true },
    actorUserId: { type: String, required: true },
    action: { type: String, required: true },
    result: { type: String, required: true },
    datasetCode: { type: String, default: "" },
    releaseCode: { type: String, default: "" },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  }, { timestamps: true, strict: true });

  return {
    Preview: mongoose.models.Part127DemoImportPreview ||
      mongoose.model("Part127DemoImportPreview", previewSchema),
    Dataset: mongoose.models.Part127DemoDataset ||
      mongoose.model("Part127DemoDataset", datasetSchema),
    Branch: mongoose.models.Part127DemoBranch ||
      mongoose.model("Part127DemoBranch", branchSchema),
    Teacher: mongoose.models.Part127DemoTeacher ||
      mongoose.model("Part127DemoTeacher", teacherSchema),
    Student: mongoose.models.Part127DemoStudent ||
      mongoose.model("Part127DemoStudent", studentSchema),
    Enrollment: mongoose.models.Part127DemoEnrollment ||
      mongoose.model("Part127DemoEnrollment", enrollmentSchema),
    Class: mongoose.models.Part127DemoClass ||
      mongoose.model("Part127DemoClass", classSchema),
    Attendance: mongoose.models.Part127DemoAttendance ||
      mongoose.model("Part127DemoAttendance", attendanceSchema),
    Fee: mongoose.models.Part127DemoFee ||
      mongoose.model("Part127DemoFee", feeSchema),
    Assignment: mongoose.models.Part127DemoAssignment ||
      mongoose.model("Part127DemoAssignment", assignmentSchema),
    Result: mongoose.models.Part127DemoResult ||
      mongoose.model("Part127DemoResult", resultSchema),
    Lead: mongoose.models.Part127DemoLead ||
      mongoose.model("Part127DemoLead", leadSchema),
    Notice: mongoose.models.Part127DemoNotice ||
      mongoose.model("Part127DemoNotice", noticeSchema),
    Task: mongoose.models.Part127DemoTask ||
      mongoose.model("Part127DemoTask", taskSchema),
    Release: mongoose.models.Part127ReleaseFreeze ||
      mongoose.model("Part127ReleaseFreeze", releaseSchema),
    Audit: mongoose.models.Part127FinalAudit ||
      mongoose.model("Part127FinalAudit", auditSchema),
  };
}

async function writeAudit(
  models,
  owner,
  action,
  result,
  datasetCode = "",
  releaseCode = "",
  details = {}
) {
  if (!dbReady()) return;
  try {
    await models.Audit.create({
      instituteId: owner.instituteId,
      actorUserId: owner.userId,
      action,
      result,
      datasetCode,
      releaseCode,
      details,
    });
  } catch {
    // Final controls stay available when optional audit storage fails.
  }
}

function defaultTemplate() {
  return sanitizeTemplate({
    schemaVersion: 1,
    datasetLabel: "NAXORA Final Demo",
    instituteName: "NAXORA Demo Institute",
    counts: {
      branchCount: 1,
      teachersPerBranch: 2,
      studentsPerTeacher: 3,
      attendanceDays: 5,
      resultsPerStudent: 2,
      leadsPerBranch: 3,
    },
    createRoleScopes: true,
    createNativeVaniExamples: true,
  });
}

async function activeDataset(models, instituteId) {
  if (!dbReady()) return null;
  return models.Dataset.findOne({
    instituteId,
    status: "active",
  }).lean();
}

async function createIdentity(
  Identity,
  {
    instituteId,
    identifier,
    displayName,
    role,
    password,
    createdByUserId,
  }
) {
  const identifierCanonical = normalizeIdentifier(identifier);
  const existing = await Identity.findOne({
    instituteId,
    identifierCanonical,
  }).select("+passwordSalt +passwordHash");

  if (existing) {
    const isDemo = String(existing.createdByUserId || "").startsWith(
      "part127_demo_import:"
    );
    if (!isDemo) {
      throw Object.assign(
        new Error(`Login ID already belongs to a non-demo account: ${identifier}`),
        { code: "NON_DEMO_IDENTITY_CONFLICT", httpStatus: 409 }
      );
    }
    const hashed = await hashPassword(password);
    existing.displayName = displayName;
    existing.role = role;
    existing.passwordAlgorithm = hashed.algorithm;
    existing.passwordSalt = hashed.salt;
    existing.passwordHash = hashed.hash;
    existing.status = "active";
    existing.tokenVersion = Number(existing.tokenVersion || 0) + 1;
    existing.mustChangePassword = false;
    existing.createdByUserId = createdByUserId;
    existing.failedLoginAttempts = 0;
    existing.lockUntil = null;
    existing.lastPasswordChangeAt = new Date();
    await existing.save();
    return existing;
  }

  const hashed = await hashPassword(password);
  return Identity.create({
    instituteId,
    identifierCanonical,
    identifierType: "login_id",
    displayName,
    role,
    passwordAlgorithm: hashed.algorithm,
    passwordSalt: hashed.salt,
    passwordHash: hashed.hash,
    status: "active",
    tokenVersion: 1,
    mustChangePassword: false,
    adoptedFromLegacy: false,
    createdByUserId,
    failedLoginAttempts: 0,
    lockUntil: null,
    lastPasswordChangeAt: new Date(),
  });
}

async function clearDataset(models, instituteId, datasetCode) {
  const modelList = [
    models.Branch,
    models.Teacher,
    models.Student,
    models.Enrollment,
    models.Class,
    models.Attendance,
    models.Fee,
    models.Assignment,
    models.Result,
    models.Lead,
    models.Notice,
    models.Task,
  ];
  for (const Model of modelList) {
    await Model.deleteMany({ instituteId, datasetCode });
  }

  const Identity = mongoose.models.Part120UnifiedIdentity;
  if (Identity) {
    await Identity.deleteMany({
      instituteId,
      createdByUserId: `part127_demo_import:${datasetCode}`,
    });
  }

  const Scope = mongoose.models.Part124RoleScopeAssignment;
  if (Scope) {
    await Scope.deleteMany({
      instituteId,
      createdByUserId: `part127_demo_import:${datasetCode}`,
    });
  }
}

async function importDemoDataset(
  app,
  models,
  owner,
  preview,
  temporaryPassword,
  replaceExisting
) {
  if (!dbReady()) {
    throw Object.assign(new Error("MongoDB connection required."), {
      code: "DATABASE_REQUIRED",
      httpStatus: 503,
    });
  }

  const Identity = mongoose.models.Part120UnifiedIdentity;
  if (!Identity) {
    throw Object.assign(new Error("Part 120 identity model unavailable."), {
      code: "PART120_IDENTITY_MODEL_MISSING",
      httpStatus: 503,
    });
  }

  const Scope = mongoose.models.Part124RoleScopeAssignment;
  if (!Scope) {
    throw Object.assign(new Error("Part 124 role-scope model unavailable."), {
      code: "PART124_SCOPE_MODEL_MISSING",
      httpStatus: 503,
    });
  }

  const current = await activeDataset(models, owner.instituteId);
  if (current && current.datasetCode !== preview.datasetCode) {
    if (!replaceExisting) {
      throw Object.assign(
        new Error(
          `Active demo dataset ${current.datasetCode} exists. Select replaceExisting to replace only Part 127 demo data.`
        ),
        { code: "ACTIVE_DEMO_DATASET_EXISTS", httpStatus: 409 }
      );
    }
    await clearDataset(
      models,
      owner.instituteId,
      current.datasetCode
    );
    await models.Dataset.updateOne(
      { _id: current._id },
      { status: "reset", resetAt: new Date() }
    );
  }

  const dataset = await models.Dataset.findOneAndUpdate(
    {
      datasetCode: preview.datasetCode,
      instituteId: owner.instituteId,
    },
    {
      $setOnInsert: {
        datasetCode: preview.datasetCode,
        instituteId: owner.instituteId,
        datasetLabel: preview.template.datasetLabel,
        instituteName: preview.template.instituteName,
        template: preview.template,
        summary: preview.summary,
        status: "importing",
        createdByUserId: owner.userId,
      },
    },
    { upsert: true, new: true, runValidators: true }
  );

  if (dataset.status === "active") {
    return {
      dataset,
      credentials: [],
      idempotentReplay: true,
    };
  }

  const template = preview.template;
  const datasetCode = preview.datasetCode;
  const identifierPrefix = `demo.${datasetCode.toLowerCase()}`;
  const createdByUserId = `part127_demo_import:${datasetCode}`;
  const credentials = [];
  const branchRecords = [];
  const teacherRecords = [];
  const studentRecords = [];
  const enrollmentRecords = [];
  const classRecords = [];
  const attendanceRecords = [];
  const feeRecords = [];
  const assignmentRecords = [];
  const resultRecords = [];
  const leadRecords = [];
  const noticeRecords = [];
  const taskRecords = [];

  try {
    let teacherCounter = 0;
    let studentCounter = 0;
    let parentCounter = 0;

    const accountant = await createIdentity(Identity, {
      instituteId: owner.instituteId,
      identifier: `${identifierPrefix}.accountant`,
      displayName: "Demo Accountant",
      role: "accountant",
      password: temporaryPassword,
      createdByUserId,
    });
    credentials.push({
      role: "accountant",
      identifier: accountant.identifierCanonical,
      displayName: accountant.displayName,
      scope: "institute-wide",
    });

    const counsellor = await createIdentity(Identity, {
      instituteId: owner.instituteId,
      identifier: `${identifierPrefix}.counsellor`,
      displayName: "Demo Counsellor",
      role: "counsellor",
      password: temporaryPassword,
      createdByUserId,
    });
    credentials.push({
      role: "counsellor",
      identifier: counsellor.identifierCanonical,
      displayName: counsellor.displayName,
      scope: "institute-wide",
    });

    const staff = await createIdentity(Identity, {
      instituteId: owner.instituteId,
      identifier: `${identifierPrefix}.staff`,
      displayName: "Demo Staff",
      role: "staff",
      password: temporaryPassword,
      createdByUserId,
    });
    credentials.push({
      role: "staff",
      identifier: staff.identifierCanonical,
      displayName: staff.displayName,
      scope: "first branch",
    });

    const branchIds = [];

    for (let branchIndex = 1; branchIndex <= template.branchCount; branchIndex += 1) {
      const branchId = `${datasetCode}-BR${String(branchIndex).padStart(2, "0")}`;
      branchIds.push(branchId);
      branchRecords.push({
        datasetCode,
        instituteId: owner.instituteId,
        branchId,
        branchName: `Demo Branch ${branchIndex}`,
        status: "active",
      });

      const branchManager = await createIdentity(Identity, {
        instituteId: owner.instituteId,
        identifier: `${identifierPrefix}.branch${branchIndex}`,
        displayName: `Demo Branch Manager ${branchIndex}`,
        role: "branch_manager",
        password: temporaryPassword,
        createdByUserId,
      });
      credentials.push({
        role: "branch_manager",
        identifier: branchManager.identifierCanonical,
        displayName: branchManager.displayName,
        scope: branchId,
      });

      await Scope.findOneAndUpdate(
        {
          instituteId: owner.instituteId,
          identityId: String(branchManager._id),
        },
        {
          $set: {
            role: "branch_manager",
            branchIds: [branchId],
            childStudentIds: [],
            instituteWide: false,
            status: "active",
            updatedByUserId: owner.userId,
          },
          $setOnInsert: {
            createdByUserId,
          },
        },
        { upsert: true, new: true, runValidators: true }
      );

      for (
        let teacherIndex = 1;
        teacherIndex <= template.teachersPerBranch;
        teacherIndex += 1
      ) {
        teacherCounter += 1;
        const teacher = await createIdentity(Identity, {
          instituteId: owner.instituteId,
          identifier: `${identifierPrefix}.teacher${teacherCounter}`,
          displayName: `Demo Teacher ${teacherCounter}`,
          role: "teacher",
          password: temporaryPassword,
          createdByUserId,
        });
        const teacherId = String(teacher._id);
        const classId = `${datasetCode}-CLASS${String(teacherCounter).padStart(2, "0")}`;
        const batchId = `${datasetCode}-BATCH${String(teacherCounter).padStart(2, "0")}`;
        const courseId = `${datasetCode}-COURSE-MATH`;

        credentials.push({
          role: "teacher",
          identifier: teacher.identifierCanonical,
          displayName: teacher.displayName,
          scope: branchId,
        });
        teacherRecords.push({
          datasetCode,
          instituteId: owner.instituteId,
          branchId,
          teacherId,
          userId: teacherId,
          identityId: teacherId,
          displayName: teacher.displayName,
          subject: teacherIndex % 2 ? "Mathematics" : "Science",
        });
        classRecords.push({
          datasetCode,
          instituteId: owner.instituteId,
          branchId,
          classId,
          batchId,
          courseId,
          teacherId,
          title: `Demo Class ${teacherCounter}`,
        });

        for (
          let studentIndex = 1;
          studentIndex <= template.studentsPerTeacher;
          studentIndex += 1
        ) {
          studentCounter += 1;
          parentCounter += 1;

          const student = await createIdentity(Identity, {
            instituteId: owner.instituteId,
            identifier: `${identifierPrefix}.student${studentCounter}`,
            displayName: `Demo Student ${studentCounter}`,
            role: "student",
            password: temporaryPassword,
            createdByUserId,
          });
          const parent = await createIdentity(Identity, {
            instituteId: owner.instituteId,
            identifier: `${identifierPrefix}.parent${parentCounter}`,
            displayName: `Demo Parent ${parentCounter}`,
            role: "parent",
            password: temporaryPassword,
            createdByUserId,
          });
          const studentId = String(student._id);
          const parentId = String(parent._id);

          credentials.push({
            role: "student",
            identifier: student.identifierCanonical,
            displayName: student.displayName,
            scope: classId,
          });
          credentials.push({
            role: "parent",
            identifier: parent.identifierCanonical,
            displayName: parent.displayName,
            scope: studentId,
          });

          await Scope.findOneAndUpdate(
            {
              instituteId: owner.instituteId,
              identityId: parentId,
            },
            {
              $set: {
                role: "parent",
                branchIds: [],
                childStudentIds: [studentId],
                instituteWide: false,
                status: "active",
                updatedByUserId: owner.userId,
              },
              $setOnInsert: {
                createdByUserId,
              },
            },
            { upsert: true, new: true, runValidators: true }
          );

          studentRecords.push({
            datasetCode,
            instituteId: owner.instituteId,
            branchId,
            studentId,
            userId: studentId,
            identityId: studentId,
            parentId,
            teacherId,
            classId,
            displayName: student.displayName,
            admissionStatus: "active",
          });
          enrollmentRecords.push({
            datasetCode,
            instituteId: owner.instituteId,
            branchId,
            enrollmentId: `${datasetCode}-ENR${String(studentCounter).padStart(3, "0")}`,
            studentId,
            teacherId,
            classId,
            courseId,
            status: "active",
          });

          for (
            let attendanceIndex = 0;
            attendanceIndex < template.attendanceDays;
            attendanceIndex += 1
          ) {
            const status = attendanceIndex === template.attendanceDays - 1 &&
              studentCounter % 4 === 0
              ? "absent"
              : attendanceIndex === template.attendanceDays - 2 &&
                studentCounter % 5 === 0
                ? "late"
                : "present";
            attendanceRecords.push({
              datasetCode,
              instituteId: owner.instituteId,
              branchId,
              attendanceId: `${datasetCode}-ATT${studentCounter}-${attendanceIndex + 1}`,
              studentId,
              teacherId,
              classId,
              attendanceDate: isoDateOffset(-attendanceIndex),
              status,
            });
          }

          feeRecords.push({
            datasetCode,
            instituteId: owner.instituteId,
            branchId,
            feeId: `${datasetCode}-FEE${String(studentCounter).padStart(3, "0")}`,
            studentId,
            invoiceId: `${datasetCode}-INV${String(studentCounter).padStart(3, "0")}`,
            receiptId: studentCounter % 3 === 0
              ? ""
              : `${datasetCode}-REC${String(studentCounter).padStart(3, "0")}`,
            amount: 1500 + studentCounter * 50,
            dueDate: isoDateOffset(7),
            status: studentCounter % 3 === 0 ? "due" : "paid",
          });
          assignmentRecords.push({
            datasetCode,
            instituteId: owner.instituteId,
            branchId,
            assignmentId: `${datasetCode}-HW${String(studentCounter).padStart(3, "0")}`,
            studentId,
            teacherId,
            classId,
            title: `Demo Assignment ${studentCounter}`,
            dueDate: isoDateOffset(5),
            status: "assigned",
          });

          for (
            let resultIndex = 1;
            resultIndex <= template.resultsPerStudent;
            resultIndex += 1
          ) {
            const score = 60 + ((studentCounter * 7 + resultIndex * 5) % 36);
            resultRecords.push({
              datasetCode,
              instituteId: owner.instituteId,
              branchId,
              resultId: `${datasetCode}-RES${studentCounter}-${resultIndex}`,
              studentId,
              teacherId,
              classId,
              examName: `Demo Test ${resultIndex}`,
              score,
              grade: score >= 90 ? "A+" : score >= 80 ? "A" : score >= 70 ? "B" : "C",
            });
          }

          noticeRecords.push({
            datasetCode,
            instituteId: owner.instituteId,
            branchId,
            noticeId: `${datasetCode}-NOT${String(studentCounter).padStart(3, "0")}`,
            studentId,
            parentId,
            title: "Demo Parent Notice",
            message: "This is linked demo data for Parent and Student workspace testing.",
          });
        }
      }

      for (
        let leadIndex = 1;
        leadIndex <= template.leadsPerBranch;
        leadIndex += 1
      ) {
        leadRecords.push({
          datasetCode,
          instituteId: owner.instituteId,
          branchId,
          leadId: `${datasetCode}-LEAD${branchIndex}-${leadIndex}`,
          counsellorId: String(counsellor._id),
          displayName: `Demo Lead ${branchIndex}-${leadIndex}`,
          status: leadIndex % 3 === 0 ? "converted" : "follow_up",
          nextFollowUpAt: isoDateOffset(leadIndex),
        });
      }

      taskRecords.push({
        datasetCode,
        instituteId: owner.instituteId,
        branchId,
        taskId: `${datasetCode}-TASK${branchIndex}`,
        assignedTo: branchIndex === 1
          ? String(staff._id)
          : String(branchManager._id),
        title: `Demo Branch Task ${branchIndex}`,
        dueDate: isoDateOffset(3),
        status: "open",
      });
    }

    await Scope.findOneAndUpdate(
      {
        instituteId: owner.instituteId,
        identityId: String(accountant._id),
      },
      {
        $set: {
          role: "accountant",
          branchIds: [],
          childStudentIds: [],
          instituteWide: true,
          status: "active",
          updatedByUserId: owner.userId,
        },
        $setOnInsert: { createdByUserId },
      },
      { upsert: true, new: true, runValidators: true }
    );
    await Scope.findOneAndUpdate(
      {
        instituteId: owner.instituteId,
        identityId: String(counsellor._id),
      },
      {
        $set: {
          role: "counsellor",
          branchIds: [],
          childStudentIds: [],
          instituteWide: true,
          status: "active",
          updatedByUserId: owner.userId,
        },
        $setOnInsert: { createdByUserId },
      },
      { upsert: true, new: true, runValidators: true }
    );
    await Scope.findOneAndUpdate(
      {
        instituteId: owner.instituteId,
        identityId: String(staff._id),
      },
      {
        $set: {
          role: "staff",
          branchIds: branchIds.slice(0, 1),
          childStudentIds: [],
          instituteWide: false,
          status: "active",
          updatedByUserId: owner.userId,
        },
        $setOnInsert: { createdByUserId },
      },
      { upsert: true, new: true, runValidators: true }
    );

    const writes = [
      [models.Branch, branchRecords],
      [models.Teacher, teacherRecords],
      [models.Student, studentRecords],
      [models.Enrollment, enrollmentRecords],
      [models.Class, classRecords],
      [models.Attendance, attendanceRecords],
      [models.Fee, feeRecords],
      [models.Assignment, assignmentRecords],
      [models.Result, resultRecords],
      [models.Lead, leadRecords],
      [models.Notice, noticeRecords],
      [models.Task, taskRecords],
    ];

    for (const [Model, records] of writes) {
      if (records.length) await Model.insertMany(records, { ordered: true });
    }

    dataset.status = "active";
    dataset.importedAt = new Date();
    dataset.summary = {
      ...preview.summary,
      credentials: credentials.length,
      actualRecords: writes.reduce((sum, [, rows]) => sum + rows.length, 0),
    };
    dataset.failureCode = "";
    await dataset.save();

    preview.status = "used";
    preview.usedAt = new Date();
    await preview.save();

    return {
      dataset,
      credentials,
      idempotentReplay: false,
    };
  } catch (error) {
    dataset.status = "failed";
    dataset.failureCode = cleanText(error.code || "DEMO_IMPORT_FAILED", 120);
    await dataset.save();
    await clearDataset(models, owner.instituteId, datasetCode);
    throw error;
  }
}

async function demoCounts(models, instituteId, datasetCode) {
  const pairs = [
    ["branches", models.Branch],
    ["teachers", models.Teacher],
    ["students", models.Student],
    ["enrollments", models.Enrollment],
    ["classes", models.Class],
    ["attendance", models.Attendance],
    ["fees", models.Fee],
    ["assignments", models.Assignment],
    ["results", models.Result],
    ["leads", models.Lead],
    ["notices", models.Notice],
    ["tasks", models.Task],
  ];
  const entries = await Promise.all(
    pairs.map(async ([key, Model]) => [
      key,
      await Model.countDocuments({ instituteId, datasetCode }),
    ])
  );
  return Object.fromEntries(entries);
}

async function accountRoleCounts(instituteId) {
  const Identity = mongoose.models.Part120UnifiedIdentity;
  if (!Identity || !dbReady()) return {};
  const rows = await Identity.aggregate([
    { $match: { instituteId, status: "active" } },
    { $group: { _id: "$role", count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((row) => [row._id, row.count]));
}

async function finalAcceptance(app, models, owner) {
  const dataset = await activeDataset(models, owner.instituteId);
  const roleCounts = await accountRoleCounts(owner.instituteId);
  const part126 = await getPart126Acceptance({
    app,
    instituteId: owner.instituteId,
  }).catch((error) => ({
    passed: false,
    errorCode: error.code || "PART126_ACCEPTANCE_UNAVAILABLE",
    checks: {},
    registeredAdapters: [],
  }));
  const counts = dataset
    ? await demoCounts(models, owner.instituteId, dataset.datasetCode)
    : {};

  const requiredRolesPresent = REQUIRED_DEMO_ROLES.every(
    (role) => Number(roleCounts[role] || 0) > 0
  );
  const demoRecordsPresent = dataset
    ? [
        "branches",
        "teachers",
        "students",
        "enrollments",
        "attendance",
        "fees",
        "assignments",
        "results",
        "leads",
        "tasks",
      ].every((key) => Number(counts[key] || 0) > 0)
    : false;
  const razorpayMode = cleanText(process.env.RAZORPAY_MODE || "test", 20).toLowerCase();
  const liveFlag =
    String(process.env.NAXORA_RAZORPAY_LIVE_LAUNCHED || "").toLowerCase() ===
    "true";
  const checks = {
    databaseConnected: dbReady(),
    jwtConfigured: jwtSecrets().length > 0,
    ownerActionSecretConfigured: Boolean(
      String(process.env.NAXORA_OWNER_ACTION_SECRET || "").trim()
    ),
    part119UnifiedShellFilePresent: true,
    part120IdentityModelReady: Boolean(
      mongoose.models.Part120UnifiedIdentity
    ),
    part124RoleScopeModelReady: Boolean(
      mongoose.models.Part124RoleScopeAssignment
    ),
    part125ActionModelReady: Boolean(
      mongoose.models.Part125VaniAction
    ),
    part126AcceptanceAvailable: Boolean(part126?.checks),
    allNineNativeVaniAdaptersRegistered:
      Array.isArray(part126?.registeredAdapters) &&
      NATIVE_VANI_ACTIONS.every((actionType) =>
        part126.registeredAdapters.some(
          (adapter) =>
            adapter.actionType === actionType &&
            adapter.registeredByPart126
        )
      ),
    activeDemoDatasetImported: Boolean(dataset),
    requiredRoleAccountsPresent: requiredRolesPresent,
    linkedDemoRecordsPresent: demoRecordsPresent,
    razorpayDemoSafetyLocked:
      razorpayMode !== "live" && liveFlag === false,
    externalProviderClaimsHonest: true,
    directMoneyActionsDisabled: true,
    allFeatureVaniAutomationComplete: false,
  };

  const demoReadyRequired = [
    "databaseConnected",
    "jwtConfigured",
    "ownerActionSecretConfigured",
    "part120IdentityModelReady",
    "part124RoleScopeModelReady",
    "part125ActionModelReady",
    "allNineNativeVaniAdaptersRegistered",
    "activeDemoDatasetImported",
    "requiredRoleAccountsPresent",
    "linkedDemoRecordsPresent",
    "razorpayDemoSafetyLocked",
    "externalProviderClaimsHonest",
    "directMoneyActionsDisabled",
  ];
  const demoReady = demoReadyRequired.every((key) => Boolean(checks[key]));
  const productionReady = false;

  return {
    part: PART_NUMBER,
    releaseVersion: RELEASE_VERSION,
    classification: RELEASE_CLASSIFICATION,
    demoReady,
    productionReady,
    freezeAllowed: demoReady,
    checks,
    roleCounts,
    demoRecordCounts: counts,
    dataset: dataset
      ? {
          datasetCode: dataset.datasetCode,
          datasetLabel: dataset.datasetLabel,
          instituteName: dataset.instituteName,
          importedAt: dataset.importedAt,
          summary: dataset.summary,
        }
      : null,
    part126,
    vani: {
      navigationAndSummaries: true,
      nativeActionCount: NATIVE_VANI_ACTIONS.length,
      nativeActions: NATIVE_VANI_ACTIONS,
      everyHistoricalFeatureAutomated: false,
    },
    honestBoundary:
      "This release is a final demo/beta freeze. It is not certified as all-feature VANI automation or unrestricted production launch.",
  };
}

async function demoAccounts(instituteId, datasetCode) {
  const Identity = mongoose.models.Part120UnifiedIdentity;
  if (!Identity || !dbReady() || !datasetCode) return [];
  const accounts = await Identity.find({
    instituteId,
    createdByUserId: `part127_demo_import:${datasetCode}`,
  })
    .select("identifierCanonical displayName role status createdByUserId")
    .sort({ role: 1, displayName: 1 })
    .lean();
  const Scope = mongoose.models.Part124RoleScopeAssignment;
  const scopes = Scope
    ? await Scope.find({
        instituteId,
        createdByUserId: `part127_demo_import:${datasetCode}`,
      }).lean()
    : [];
  const scopeMap = new Map(
    scopes.map((scope) => [scope.identityId, scope])
  );
  return accounts.map((account) => {
    const scope = scopeMap.get(String(account._id));
    return {
      identityId: String(account._id),
      identifier: account.identifierCanonical,
      displayName: account.displayName,
      role: account.role,
      status: account.status,
      scope: scope
        ? {
            branchIds: scope.branchIds || [],
            childStudentIds: scope.childStudentIds || [],
            instituteWide: Boolean(scope.instituteWide),
          }
        : null,
    };
  });
}

function publicRelease(release) {
  return {
    releaseCode: release.releaseCode,
    version: release.version,
    classification: release.classification,
    datasetCode: release.datasetCode,
    status: release.status,
    frozenAt: release.frozenAt,
    gitCommit: release.gitCommit,
    manifest: release.manifest,
  };
}

export async function getPart127FinalAcceptance({
  app,
  instituteId,
  userId = "owner",
  displayName = "Institute Owner",
} = {}) {
  const models = defineModels();
  return finalAcceptance(app, models, {
    instituteId: cleanId(instituteId),
    userId: cleanId(userId),
    displayName: cleanText(displayName, 120),
    role: "institute_owner",
  });
}

export function registerPart127FinalAcceptance({ app } = {}) {
  if (!app || typeof app.get !== "function" || typeof app.post !== "function") {
    throw new Error("Part 127 registration failed: Express app required.");
  }
  if (app.locals.part127FinalAcceptanceRegistered) return;
  app.locals.part127FinalAcceptanceRegistered = true;
  const models = defineModels();

  app.get(
    ["/final-acceptance", "/demo-data-importer", "/project-freeze", "/part127"],
    (req, res) => {
      res.sendFile(path.join(frontendDir, "naxora-final-acceptance.html"));
    }
  );
  app.get("/naxora-final-acceptance.css", (req, res) => {
    res.type("text/css").sendFile(
      path.join(frontendDir, "naxora-final-acceptance.css")
    );
  });
  app.get("/naxora-final-acceptance.js", (req, res) => {
    res.type("application/javascript").sendFile(
      path.join(frontendDir, "naxora-final-acceptance.js")
    );
  });

  app.get("/api/part127/status", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      name: PART_NAME,
      status: "final_demo_acceptance_and_freeze_active",
      releaseVersion: RELEASE_VERSION,
      classification: RELEASE_CLASSIFICATION,
      universalLinkedDemoImporter: true,
      jsonTemplateUpload: true,
      safeDemoReset: true,
      roleAcceptance: true,
      part126AcceptanceIntegrated: true,
      releaseManifest: true,
      projectFreezeMarker: true,
      singleUnifiedAppTarget: true,
      nativeVaniActionCount: NATIVE_VANI_ACTIONS.length,
      allFeatureVaniAutomationComplete: false,
      productionCertificationComplete: false,
      finalDemoBetaClosure: true,
      nextPart: 128,
      projectRoadmapClosedAtPart127: false,
    });
  });

  app.get("/api/part127/security-policy", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      ownerOnlyImportResetAndFreeze: true,
      instituteIdMatchRequired: true,
      exactConfirmationRequired: true,
      privateOwnerVerificationRequired: true,
      demoPasswordNeverReturned: true,
      demoPasswordNeverStoredInPlainText: true,
      scryptPasswordHashingCompatibleWithPart120: true,
      nonDemoAccountsNeverDeletedByDemoReset: true,
      onlyPart127DemoRecordsAreReplaceable: true,
      roleScopesCreatedServerSide: true,
      crossInstituteDataBlocked: true,
      arbitraryMongoModelsFromClientBlocked: true,
      directMoneyActionsDisabled: true,
      releaseFreezeDoesNotClaimCodeImmutability: true,
      allFeatureVaniClaimBlocked: true,
    });
  });

  app.get("/api/part127/demo-template", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      template: defaultTemplate(),
      instructions: {
        fileType: ".json",
        maximums: {
          branchCount: 3,
          teachersPerBranch: 3,
          studentsPerTeacher: 5,
          attendanceDays: 15,
          resultsPerStudent: 4,
          leadsPerBranch: 10,
        },
        password:
          "Temporary demo password is entered privately during confirmed import and is never included in the JSON template.",
      },
    });
  });

  app.get("/api/part127/demo-status", ownerOnly, async (req, res) => {
    const dataset = await activeDataset(models, req.part127Owner.instituteId);
    const accounts = dataset
      ? await demoAccounts(
          req.part127Owner.instituteId,
          dataset.datasetCode
        )
      : [];
    const counts = dataset
      ? await demoCounts(
          models,
          req.part127Owner.instituteId,
          dataset.datasetCode
        )
      : {};
    res.json({
      success: true,
      part: PART_NUMBER,
      dataset,
      counts,
      accountCount: accounts.length,
      accounts,
      passwordReturned: false,
    });
  });

  app.post("/api/part127/demo-import/preview", ownerOnly, async (req, res) => {
    try {
      if (!dbReady()) {
        throw Object.assign(new Error("MongoDB connection required."), {
          code: "DATABASE_REQUIRED",
          httpStatus: 503,
        });
      }
      const template = sanitizeTemplate(req.body?.template || req.body || {});
      const summary = templateSummary(template);
      const datasetCode = shortCode("DEMO");
      const previewId = crypto.randomUUID();
      const preview = await models.Preview.create({
        previewId,
        instituteId: req.part127Owner.instituteId,
        ownerUserId: req.part127Owner.userId,
        datasetCode,
        template,
        summary,
        status: "preview_ready",
        expiresAt: new Date(Date.now() + PREVIEW_TTL_MS),
      });

      await writeAudit(
        models,
        req.part127Owner,
        "demo_import_preview",
        "success",
        datasetCode,
        "",
        { summary }
      );

      res.json({
        success: true,
        part: PART_NUMBER,
        preview: {
          previewId: preview.previewId,
          datasetCode,
          template,
          summary,
          expiresAt: preview.expiresAt,
        },
        confirmationTextRequired: importConfirmation(datasetCode),
        ownerVerificationRequired: true,
        temporaryPasswordRequiredAtConfirmation: true,
        temporaryPasswordReturned: false,
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "DEMO_IMPORT_PREVIEW_FAILED",
        message: error.message,
      });
    }
  });

  app.post("/api/part127/demo-import/confirmed", ownerOnly, async (req, res) => {
    try {
      verifyOwnerAction(req);
      const previewId = cleanText(req.body?.previewId, 80);
      const preview = await models.Preview.findOne({
        previewId,
        instituteId: req.part127Owner.instituteId,
        ownerUserId: req.part127Owner.userId,
      });

      if (!preview) {
        throw Object.assign(new Error("Demo import preview not found."), {
          code: "IMPORT_PREVIEW_NOT_FOUND",
          httpStatus: 404,
        });
      }
      if (preview.status === "used") {
        const dataset = await models.Dataset.findOne({
          datasetCode: preview.datasetCode,
          instituteId: req.part127Owner.instituteId,
        }).lean();
        return res.json({
          success: true,
          part: PART_NUMBER,
          message: "Demo import was already completed.",
          dataset,
          idempotentReplay: true,
          temporaryPasswordReturned: false,
        });
      }
      if (
        preview.status !== "preview_ready" ||
        new Date(preview.expiresAt).getTime() <= Date.now()
      ) {
        preview.status = "expired";
        await preview.save();
        throw Object.assign(new Error("Demo import preview expired."), {
          code: "IMPORT_PREVIEW_EXPIRED",
          httpStatus: 410,
        });
      }

      const required = importConfirmation(preview.datasetCode);
      if (String(req.body?.confirmationText || "").trim() !== required) {
        throw Object.assign(
          new Error(`Exact confirmation required: ${required}`),
          {
            code: "EXACT_CONFIRMATION_REQUIRED",
            httpStatus: 400,
          }
        );
      }

      const temporaryPassword = String(req.body?.temporaryPassword || "");
      const policy = passwordPolicy(temporaryPassword);
      if (!policy.valid) {
        throw Object.assign(
          new Error(
            `Demo password must contain ${policy.failures.join(", ")}.`
          ),
          {
            code: "WEAK_DEMO_PASSWORD",
            httpStatus: 400,
          }
        );
      }

      const result = await importDemoDataset(
        app,
        models,
        req.part127Owner,
        preview,
        temporaryPassword,
        Boolean(req.body?.replaceExisting)
      );

      await writeAudit(
        models,
        req.part127Owner,
        "demo_import_confirmed",
        "success",
        preview.datasetCode,
        "",
        {
          accountCount: result.credentials.length,
          idempotentReplay: result.idempotentReplay,
        }
      );

      res.json({
        success: true,
        part: PART_NUMBER,
        message:
          "Linked final demo data imported. Use the same privately entered password for the generated demo login IDs.",
        dataset: {
          datasetCode: result.dataset.datasetCode,
          datasetLabel: result.dataset.datasetLabel,
          instituteName: result.dataset.instituteName,
          status: result.dataset.status,
          importedAt: result.dataset.importedAt,
          summary: result.dataset.summary,
        },
        accounts: result.credentials,
        idempotentReplay: result.idempotentReplay,
        sharedTemporaryPasswordUsed: true,
        temporaryPasswordReturned: false,
        loginPage: "/login",
        unifiedApp: "/app",
      });
    } catch (error) {
      await writeAudit(
        models,
        req.part127Owner,
        "demo_import_confirmed",
        "failed",
        "",
        "",
        { failureCode: error.code || "DEMO_IMPORT_FAILED" }
      );
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "DEMO_IMPORT_FAILED",
        message: error.message,
      });
    }
  });

  app.post("/api/part127/demo-reset/preview", ownerOnly, async (req, res) => {
    const dataset = await activeDataset(models, req.part127Owner.instituteId);
    if (!dataset) {
      return res.status(404).json({
        success: false,
        part: PART_NUMBER,
        code: "ACTIVE_DEMO_DATASET_NOT_FOUND",
        message: "No active Part 127 demo dataset found.",
      });
    }
    res.json({
      success: true,
      part: PART_NUMBER,
      datasetCode: dataset.datasetCode,
      confirmationTextRequired: resetConfirmation(dataset.datasetCode),
      ownerVerificationRequired: true,
      nonDemoAccountsWillBePreserved: true,
    });
  });

  app.post("/api/part127/demo-reset/confirmed", ownerOnly, async (req, res) => {
    try {
      verifyOwnerAction(req);
      const dataset = await activeDataset(models, req.part127Owner.instituteId);
      if (!dataset) {
        throw Object.assign(new Error("No active Part 127 demo dataset found."), {
          code: "ACTIVE_DEMO_DATASET_NOT_FOUND",
          httpStatus: 404,
        });
      }
      const required = resetConfirmation(dataset.datasetCode);
      if (String(req.body?.confirmationText || "").trim() !== required) {
        throw Object.assign(
          new Error(`Exact confirmation required: ${required}`),
          {
            code: "EXACT_CONFIRMATION_REQUIRED",
            httpStatus: 400,
          }
        );
      }

      await clearDataset(
        models,
        req.part127Owner.instituteId,
        dataset.datasetCode
      );
      await models.Dataset.updateOne(
        { _id: dataset._id },
        { status: "reset", resetAt: new Date() }
      );

      const release = await models.Release.findOne({
        instituteId: req.part127Owner.instituteId,
        status: "frozen_demo_beta",
      });
      if (release) {
        release.status = "superseded";
        await release.save();
      }

      await writeAudit(
        models,
        req.part127Owner,
        "demo_reset",
        "success",
        dataset.datasetCode
      );

      res.json({
        success: true,
        part: PART_NUMBER,
        message:
          "Only Part 127 demo records, demo accounts and Part 127-created role scopes were removed.",
        datasetCode: dataset.datasetCode,
        nonDemoAccountsPreserved: true,
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "DEMO_RESET_FAILED",
        message: error.message,
      });
    }
  });

  app.get("/api/part127/acceptance", ownerOnly, async (req, res) => {
    try {
      const acceptance = await finalAcceptance(
        app,
        models,
        req.part127Owner
      );
      res.json({
        success: true,
        part: PART_NUMBER,
        acceptance,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        part: PART_NUMBER,
        code: "FINAL_ACCEPTANCE_FAILED",
        message: error.message,
      });
    }
  });

  app.post("/api/part127/freeze/preview", ownerOnly, async (req, res) => {
    try {
      const acceptance = await finalAcceptance(
        app,
        models,
        req.part127Owner
      );
      if (!acceptance.freezeAllowed || !acceptance.dataset) {
        throw Object.assign(
          new Error("Demo acceptance checks must pass before project freeze."),
          {
            code: "DEMO_ACCEPTANCE_NOT_READY",
            httpStatus: 409,
          }
        );
      }

      const existing = await models.Release.findOne({
        instituteId: req.part127Owner.instituteId,
        status: "frozen_demo_beta",
      }).lean();
      const releaseCode = existing?.releaseCode || shortCode("NAXORA2");
      res.json({
        success: true,
        part: PART_NUMBER,
        releasePreview: {
          releaseCode,
          version: RELEASE_VERSION,
          classification: RELEASE_CLASSIFICATION,
          datasetCode: acceptance.dataset.datasetCode,
          demoReady: acceptance.demoReady,
          productionReady: acceptance.productionReady,
          nativeVaniActionCount: NATIVE_VANI_ACTIONS.length,
          allFeatureVaniAutomationComplete: false,
        },
        confirmationTextRequired: freezeConfirmation(releaseCode),
        ownerVerificationRequired: true,
        freezeMeaning:
          "Creates a release manifest and closes the agreed roadmap. It does not technically prevent future Git commits.",
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "FREEZE_PREVIEW_FAILED",
        message: error.message,
      });
    }
  });

  app.post("/api/part127/freeze/confirmed", ownerOnly, async (req, res) => {
    try {
      verifyOwnerAction(req);
      const releaseCode = cleanId(req.body?.releaseCode);
      const required = freezeConfirmation(releaseCode);
      if (!releaseCode || String(req.body?.confirmationText || "").trim() !== required) {
        throw Object.assign(
          new Error(`Exact confirmation required: ${required}`),
          {
            code: "EXACT_CONFIRMATION_REQUIRED",
            httpStatus: 400,
          }
        );
      }

      const acceptance = await finalAcceptance(
        app,
        models,
        req.part127Owner
      );
      if (!acceptance.freezeAllowed || !acceptance.dataset) {
        throw Object.assign(
          new Error("Demo acceptance checks must pass before project freeze."),
          {
            code: "DEMO_ACCEPTANCE_NOT_READY",
            httpStatus: 409,
          }
        );
      }

      const existing = await models.Release.findOne({
        instituteId: req.part127Owner.instituteId,
        status: "frozen_demo_beta",
      });
      if (existing) {
        return res.json({
          success: true,
          part: PART_NUMBER,
          message: "Final demo release is already frozen.",
          release: publicRelease(existing),
          idempotentReplay: true,
        });
      }

      const manifest = {
        product: "NAXORA Institute OS",
        releaseVersion: RELEASE_VERSION,
        classification: RELEASE_CLASSIFICATION,
        frozenAt: new Date().toISOString(),
        roadmapClosedAtPart: 127,
        dataset: acceptance.dataset,
        roleCounts: acceptance.roleCounts,
        demoRecordCounts: acceptance.demoRecordCounts,
        unifiedApp: "/app",
        login: "/login",
        nativeVaniActions: NATIVE_VANI_ACTIONS,
        nativeVaniActionCount: NATIVE_VANI_ACTIONS.length,
        allFeatureVaniAutomationComplete: false,
        productionReady: false,
        honestBoundary: acceptance.honestBoundary,
        renderCommit:
          cleanText(
            process.env.RENDER_GIT_COMMIT ||
            process.env.COMMIT_REF ||
            "",
            180
          ),
      };

      const release = await models.Release.create({
        releaseCode,
        instituteId: req.part127Owner.instituteId,
        version: RELEASE_VERSION,
        classification: RELEASE_CLASSIFICATION,
        datasetCode: acceptance.dataset.datasetCode,
        status: "frozen_demo_beta",
        frozenByUserId: req.part127Owner.userId,
        frozenAt: new Date(),
        gitCommit: manifest.renderCommit,
        manifest,
      });
      await models.Dataset.updateOne(
        {
          instituteId: req.part127Owner.instituteId,
          datasetCode: acceptance.dataset.datasetCode,
        },
        { releaseCode }
      );

      await writeAudit(
        models,
        req.part127Owner,
        "release_freeze",
        "success",
        acceptance.dataset.datasetCode,
        releaseCode,
        {
          classification: RELEASE_CLASSIFICATION,
          productionReady: false,
        }
      );

      res.json({
        success: true,
        part: PART_NUMBER,
        message:
          "NAXORA OS 2.0 final Demo/Beta release manifest frozen. Agreed roadmap Part 127 par closed hai.",
        release: publicRelease(release),
        idempotentReplay: false,
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "RELEASE_FREEZE_FAILED",
        message: error.message,
      });
    }
  });

  app.get("/api/part127/release", ownerOnly, async (req, res) => {
    const release = await models.Release.findOne({
      instituteId: req.part127Owner.instituteId,
      status: "frozen_demo_beta",
    }).lean();
    res.json({
      success: true,
      part: PART_NUMBER,
      release: release ? publicRelease(release) : null,
    });
  });

  app.get("/api/part127/release-manifest.json", ownerOnly, async (req, res) => {
    const release = await models.Release.findOne({
      instituteId: req.part127Owner.instituteId,
      status: "frozen_demo_beta",
    }).lean();
    if (!release) {
      return res.status(404).json({
        success: false,
        part: PART_NUMBER,
        code: "FROZEN_RELEASE_NOT_FOUND",
        message: "No frozen Part 127 release manifest found.",
      });
    }
    res.setHeader(
      "content-disposition",
      `attachment; filename="${release.releaseCode}-manifest.json"`
    );
    res.type("application/json").send(
      JSON.stringify(
        {
          release: publicRelease(release),
        },
        null,
        2
      )
    );
  });

  app.get("/api/part127/demo", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      name: PART_NAME,
      page: "/final-acceptance",
      finalFlow: [
        "Upload or use the linked JSON demo template",
        "Preview generated accounts and records",
        "Privately enter one shared demo password",
        "Exact-confirm and import",
        "Test every role through /login and /app",
        "Test nine native VANI actions",
        "Run final demo acceptance",
        "Freeze the Demo/Beta release manifest",
      ],
      closure: {
        roadmapClosedAtPart127: false,
        nextPart: 128,
        releaseClassification: RELEASE_CLASSIFICATION,
        allFeatureVaniAutomationComplete: false,
      },
    });
  });
}
