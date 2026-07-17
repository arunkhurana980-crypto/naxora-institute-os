import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const PART_NUMBER = 125;
const PART_NAME = "Global VANI Multi-Step Action Engine";
const PREVIEW_TTL_MS = 30 * 60 * 1000;
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;
const MAX_RECIPIENTS = 50;
const ALL_ROLES = new Set([
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

const ACTION_DEFINITIONS = Object.freeze({
  "attendance.mark": {
    label: "Mark Attendance",
    description: "Create a verified attendance command for a Student and date.",
    roles: ["institute_owner", "branch_manager", "teacher", "staff"],
    requiredFields: ["studentId", "date", "status"],
    optionalFields: ["classId", "branchId", "note"],
    category: "Attendance",
    canonicalTarget: "attendance_command",
    nativeAdapterTargetPart: 126,
  },
  "attendance.correction_request": {
    label: "Attendance Correction Request",
    description: "Student or Parent requests an attendance correction.",
    roles: ["student", "parent"],
    requiredFields: ["studentId", "date", "requestedStatus", "reason"],
    optionalFields: ["classId"],
    category: "Attendance",
    canonicalTarget: "attendance_request",
    nativeAdapterTargetPart: 126,
  },
  "fees.reminder": {
    label: "Send Fee Reminder",
    description: "Create a consent-aware fee reminder in the action outbox.",
    roles: ["institute_owner", "branch_manager", "accountant"],
    requiredFields: ["studentId", "message"],
    optionalFields: ["branchId", "dueDate", "channel", "recipientIds"],
    category: "Fees",
    canonicalTarget: "message_outbox",
    nativeAdapterTargetPart: 126,
  },
  "fees.assistance_request": {
    label: "Fee Assistance Request",
    description: "Student or Parent creates a fee-help request without changing payment data.",
    roles: ["student", "parent"],
    requiredFields: ["studentId", "message"],
    optionalFields: ["dueDate"],
    category: "Fees",
    canonicalTarget: "support_request",
    nativeAdapterTargetPart: 126,
  },
  "admission.follow_up": {
    label: "Admission Follow-up",
    description: "Create a lead/admission follow-up task and delivery outbox item.",
    roles: ["institute_owner", "branch_manager", "counsellor"],
    requiredFields: ["leadId", "message", "followUpAt"],
    optionalFields: ["branchId", "channel", "assigneeId"],
    category: "Admissions & CRM",
    canonicalTarget: "follow_up_outbox",
    nativeAdapterTargetPart: 126,
  },
  "assignment.create": {
    label: "Create Assignment",
    description: "Create a canonical classroom assignment command.",
    roles: ["institute_owner", "teacher"],
    requiredFields: ["classId", "title", "dueDate", "instructions"],
    optionalFields: ["studentIds", "branchId"],
    category: "Teaching",
    canonicalTarget: "assignment_command",
    nativeAdapterTargetPart: 126,
  },
  "assignment.submit": {
    label: "Submit Assignment",
    description: "Student creates a canonical assignment submission.",
    roles: ["student"],
    requiredFields: ["assignmentId", "submissionText"],
    optionalFields: ["attachmentReference"],
    category: "Learning",
    canonicalTarget: "assignment_submission",
    nativeAdapterTargetPart: 126,
  },
  "message.send": {
    label: "Send Role-Safe Message",
    description: "Create a role-safe in-app/external delivery outbox item.",
    roles: [...ALL_ROLES],
    requiredFields: ["recipientRole", "recipientIds", "message"],
    optionalFields: ["subject", "channel", "branchId", "studentId"],
    category: "Communication",
    canonicalTarget: "message_outbox",
    nativeAdapterTargetPart: 126,
  },
  "branch.task.create": {
    label: "Create Branch Task",
    description: "Create a branch-scoped operational task.",
    roles: ["institute_owner", "branch_manager"],
    requiredFields: ["branchId", "title", "dueDate", "details"],
    optionalFields: ["assigneeId"],
    category: "Branch Operations",
    canonicalTarget: "branch_task",
    nativeAdapterTargetPart: 126,
  },
});

const RECIPIENT_ROLE_RULES = Object.freeze({
  institute_owner: ["institute_owner", "branch_manager", "teacher", "student", "parent", "accountant", "counsellor", "staff"],
  branch_manager: ["institute_owner", "teacher", "student", "parent", "accountant", "counsellor", "staff"],
  teacher: ["institute_owner", "branch_manager", "student", "parent"],
  student: ["institute_owner", "branch_manager", "teacher"],
  parent: ["institute_owner", "branch_manager", "teacher", "accountant"],
  accountant: ["institute_owner", "branch_manager", "student", "parent"],
  counsellor: ["institute_owner", "branch_manager", "student", "parent"],
  staff: ["institute_owner", "branch_manager", "teacher"],
});

const ACTION_PATTERNS = Object.freeze([
  ["attendance.correction_request", /(attendance|hazri).*(correct|correction|galat|request)/i],
  ["attendance.mark", /(attendance|hazri).*(mark|lagao|laga do|present|absent|late)/i],
  ["fees.assistance_request", /(fee|fees).*(help|assistance|request|problem|madad)/i],
  ["fees.reminder", /(fee|fees).*(reminder|yaad|bhejo|send)/i],
  ["admission.follow_up", /(admission|lead|enquiry|inquiry).*(follow.?up|call|message|remind)/i],
  ["assignment.submit", /(assignment|homework).*(submit|jama)/i],
  ["assignment.create", /(assignment|homework).*(create|banao|do|set)/i],
  ["branch.task.create", /(branch).*(task|kaam).*(create|banao|assign)/i],
  ["message.send", /(message|notice|msg).*(send|bhejo|forward)/i],
]);

const SENSITIVE_PATTERN = /(password|passcode|otp|cvv|upi\s*pin|api\s*key|secret|aadhaar|aadhar|pan\s*(number|card)?|bank\s*(account|statement)|card\s*number)/i;
const BLOCKED_MONEY_PATTERN = /(charge\s*(card|account)?|debit|withdraw|transfer\s*money|refund\s*(payment|money)|collect\s*payment|pay\s*now|bank\s*transfer)/i;
const DESTRUCTIVE_PATTERN = /(delete|remove permanently|erase|drop database|bulk delete)/i;

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
function cleanLongText(value = "", max = 3000) {
  return String(value || "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, max);
}
function cleanId(value = "") {
  return String(value || "").trim().replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 180);
}
function cleanIdList(values, max = MAX_RECIPIENTS) {
  const list = Array.isArray(values) ? values : String(values || "").split(/[\n,]/g);
  return [...new Set(list.map(cleanId).filter(Boolean))].slice(0, max);
}
function cleanDate(value = "") {
  const text = String(value || "").trim();
  if (!text) return "";
  const dateOnly = text.match(/^\d{4}-\d{2}-\d{2}$/);
  if (dateOnly) {
    const parsed = new Date(`${text}T00:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) ? "" : text;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}
function normalizeRole(value = "") {
  const role = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  const aliases = {
    owner: "institute_owner",
    instituteowner: "institute_owner",
    branchmanager: "branch_manager",
    accounts: "accountant",
    counselor: "counsellor",
    guardian: "parent",
    faculty: "teacher",
    learner: "student",
  };
  return aliases[role] || role;
}
function getBearer(req) {
  const auth = String(req.headers.authorization || "").trim();
  return auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
}
function jwtSecrets() {
  return [
    process.env.JWT_SECRET,
    process.env.JWT_ACCESS_SECRET,
    process.env.ACCESS_TOKEN_SECRET,
    process.env.NAXORA_JWT_SECRET,
  ].map((value) => String(value || "").trim()).filter(Boolean);
}
function verifyJwt(token) {
  const secrets = jwtSecrets();
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
      // Try another configured JWT secret.
    }
  }
  const error = new Error("Login session invalid or expired.");
  error.code = "INVALID_SESSION";
  error.httpStatus = 401;
  throw error;
}
function actionContext(req) {
  const existing = req.part120Context || req.user || req.auth || null;
  const payload = existing || (getBearer(req) ? verifyJwt(getBearer(req)) : null);
  if (!payload) {
    const error = new Error("Common role login required.");
    error.code = "LOGIN_REQUIRED";
    error.httpStatus = 401;
    throw error;
  }

  const role = normalizeRole(
    payload.role || payload.userRole || payload.accountRole || payload.user?.role || ""
  );
  if (!ALL_ROLES.has(role)) {
    const error = new Error("This login role is not supported by Global VANI Actions.");
    error.code = "UNSUPPORTED_ROLE";
    error.httpStatus = 403;
    throw error;
  }

  const requestedInstituteId = cleanId(
    req.headers["x-naxora-institute-id"] ||
    req.body?.instituteId ||
    req.query?.instituteId ||
    ""
  );
  const tokenInstituteId = cleanId(
    payload.instituteId ||
    payload.institute_id ||
    payload.user?.instituteId ||
    payload.tenantId ||
    ""
  );
  if (tokenInstituteId && requestedInstituteId && tokenInstituteId !== requestedInstituteId) {
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

  const userId = cleanId(
    payload.userId || payload.identityId || payload.id || payload._id || payload.sub || "user"
  );
  const identityId = cleanId(payload.identityId || payload.sub || userId);
  const referenceIds = [
    userId,
    identityId,
    payload.studentId,
    payload.student_id,
    payload.profileId,
    payload.studentProfileId,
    payload.teacherId,
    payload.teacher_id,
  ].map(cleanId).filter(Boolean);

  return {
    role,
    instituteId,
    userId,
    identityId,
    displayName: cleanText(
      payload.displayName || payload.name || payload.fullName || payload.email || role,
      120
    ),
    referenceIds: [...new Set(referenceIds)],
  };
}
function authenticated(req, res, next) {
  try {
    req.part125Context = actionContext(req);
    next();
  } catch (error) {
    res.status(error.httpStatus || 401).json({
      success: false,
      part: PART_NUMBER,
      code: error.code || "AUTH_FAILED",
      message: error.message,
    });
  }
}
function dbReady() {
  return mongoose.connection?.readyState === 1;
}
function sha256(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}
function stableObject(value) {
  if (Array.isArray(value)) return value.map(stableObject);
  if (value && typeof value === "object") {
    return Object.keys(value).sort().reduce((acc, key) => {
      acc[key] = stableObject(value[key]);
      return acc;
    }, {});
  }
  return value;
}
function payloadDigest(payload) {
  return sha256(JSON.stringify(stableObject(payload)));
}
function actionFingerprint(context, actionType, payload) {
  return sha256(JSON.stringify(stableObject({
    instituteId: context.instituteId,
    actorUserId: context.userId,
    actionType,
    payload,
  })));
}
function confirmationText(action) {
  const code = String(action.actionType || "").toUpperCase().replace(/\./g, " ");
  return `CONFIRM ${code} ${String(action.actionId).slice(-8).toUpperCase()}`;
}
function defineModels() {
  const actionSchema = new mongoose.Schema({
    actionId: { type: String, required: true, unique: true, index: true },
    instituteId: { type: String, required: true, index: true },
    actorUserId: { type: String, required: true, index: true },
    actorIdentityId: { type: String, required: true },
    actorRole: { type: String, required: true, index: true },
    actorDisplayName: { type: String, required: true },
    actionType: { type: String, required: true, enum: Object.keys(ACTION_DEFINITIONS), index: true },
    actionLabel: { type: String, required: true },
    status: {
      type: String,
      enum: [
        "preview_ready",
        "confirmed",
        "executed_native",
        "executed_pending_adapter",
        "adapter_failed",
        "cancelled",
        "expired",
      ],
      default: "preview_ready",
      index: true,
    },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    payloadDigest: { type: String, required: true },
    fingerprint: { type: String, required: true, index: true },
    confirmationDigest: { type: String, required: true },
    previewExpiresAt: { type: Date, required: true, index: true },
    confirmedAt: { type: Date, default: null },
    executedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    canonicalRecordId: { type: String, default: "" },
    outboxRecordId: { type: String, default: "" },
    adapterName: { type: String, default: "" },
    adapterResult: { type: mongoose.Schema.Types.Mixed, default: {} },
    nativeModuleApplied: { type: Boolean, default: false },
    externalDeliveryPerformed: { type: Boolean, default: false },
    part126DeliveryPending: { type: Boolean, default: true },
    failureCode: { type: String, default: "" },
    failureMessage: { type: String, default: "" },
  }, { timestamps: true, strict: true });
  actionSchema.index({ instituteId: 1, actorUserId: 1, createdAt: -1 });
  actionSchema.index({ instituteId: 1, fingerprint: 1, createdAt: -1 });

  const canonicalSchema = new mongoose.Schema({
    actionId: { type: String, required: true, unique: true, index: true },
    instituteId: { type: String, required: true, index: true },
    actorUserId: { type: String, required: true },
    actorRole: { type: String, required: true },
    actionType: { type: String, required: true, index: true },
    targetType: { type: String, required: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    payloadDigest: { type: String, required: true },
    canonicalStatus: { type: String, default: "accepted" },
    nativeAdapterStatus: { type: String, default: "pending_part126" },
  }, { timestamps: true, strict: true });

  const outboxSchema = new mongoose.Schema({
    actionId: { type: String, required: true, unique: true, index: true },
    instituteId: { type: String, required: true, index: true },
    actionType: { type: String, required: true, index: true },
    actorUserId: { type: String, required: true },
    recipientRole: { type: String, default: "" },
    recipientIds: { type: [String], default: [] },
    channel: { type: String, enum: ["in_app", "email", "sms", "whatsapp"], default: "in_app" },
    subject: { type: String, default: "" },
    message: { type: String, required: true },
    deliveryStatus: { type: String, default: "pending_part126", index: true },
    deliveredAt: { type: Date, default: null },
    providerReference: { type: String, default: "" },
  }, { timestamps: true, strict: true });

  const auditSchema = new mongoose.Schema({
    instituteId: { type: String, required: true, index: true },
    actionId: { type: String, required: true, index: true },
    actorUserId: { type: String, required: true },
    actorRole: { type: String, required: true },
    event: { type: String, required: true },
    result: { type: String, required: true },
    actionType: { type: String, required: true },
    payloadDigest: { type: String, required: true },
    payloadFields: { type: [String], default: [] },
    recipientCount: { type: Number, default: 0 },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  }, { timestamps: true, strict: true });

  return {
    Action: mongoose.models.Part125VaniAction ||
      mongoose.model("Part125VaniAction", actionSchema),
    Canonical: mongoose.models.Part125CanonicalActionRecord ||
      mongoose.model("Part125CanonicalActionRecord", canonicalSchema),
    Outbox: mongoose.models.Part125ActionOutbox ||
      mongoose.model("Part125ActionOutbox", outboxSchema),
    Audit: mongoose.models.Part125ActionAudit ||
      mongoose.model("Part125ActionAudit", auditSchema),
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
      payloadDigest: action.payloadDigest,
      payloadFields: Object.keys(action.payload || {}).sort(),
      recipientCount: Array.isArray(action.payload?.recipientIds)
        ? action.payload.recipientIds.length
        : 0,
      details,
    });
  } catch {
    // Action result must not be changed by an audit-write failure.
  }
}
function safePayloadSummary(payload = {}) {
  const summary = {};
  const safeFields = [
    "studentId",
    "date",
    "status",
    "requestedStatus",
    "classId",
    "branchId",
    "leadId",
    "followUpAt",
    "assignmentId",
    "title",
    "dueDate",
    "recipientRole",
    "channel",
    "assigneeId",
  ];
  for (const field of safeFields) {
    if (payload[field] !== undefined && payload[field] !== "") summary[field] = payload[field];
  }
  if (Array.isArray(payload.recipientIds)) summary.recipientCount = payload.recipientIds.length;
  if (Array.isArray(payload.studentIds)) summary.studentCount = payload.studentIds.length;
  if (payload.message) summary.messageLength = String(payload.message).length;
  if (payload.instructions) summary.instructionsLength = String(payload.instructions).length;
  if (payload.submissionText) summary.submissionLength = String(payload.submissionText).length;
  if (payload.details) summary.detailsLength = String(payload.details).length;
  if (payload.reason) summary.reasonLength = String(payload.reason).length;
  return summary;
}
function publicAction(action, includePayload = true) {
  return {
    actionId: action.actionId,
    actionType: action.actionType,
    actionLabel: action.actionLabel,
    status: action.status,
    actorRole: action.actorRole,
    actorDisplayName: action.actorDisplayName,
    payload: includePayload ? action.payload : undefined,
    payloadSummary: safePayloadSummary(action.payload),
    confirmationTextRequired:
      ["preview_ready", "confirmed"].includes(action.status)
        ? confirmationText(action)
        : null,
    previewExpiresAt: action.previewExpiresAt,
    confirmedAt: action.confirmedAt,
    executedAt: action.executedAt,
    cancelledAt: action.cancelledAt,
    nativeModuleApplied: Boolean(action.nativeModuleApplied),
    externalDeliveryPerformed: Boolean(action.externalDeliveryPerformed),
    part126DeliveryPending: Boolean(action.part126DeliveryPending),
    adapterName: action.adapterName || "",
    adapterResult: action.adapterResult || {},
    failureCode: action.failureCode || "",
    failureMessage: action.failureMessage || "",
    canonicalRecordId: action.canonicalRecordId || "",
    outboxRecordId: action.outboxRecordId || "",
    createdAt: action.createdAt,
    updatedAt: action.updatedAt,
  };
}
function actionDefinition(actionType) {
  return ACTION_DEFINITIONS[actionType] || null;
}
function roleCanUse(role, actionType) {
  const definition = actionDefinition(actionType);
  return Boolean(definition && definition.roles.includes(role));
}
function normalizeChannel(value = "") {
  const channel = cleanText(value || "in_app", 30).toLowerCase().replace(/\s+/g, "_");
  return ["in_app", "email", "sms", "whatsapp"].includes(channel) ? channel : "in_app";
}
function normalizeStatus(value = "") {
  const status = cleanText(value, 30).toLowerCase();
  const aliases = {
    p: "present",
    a: "absent",
    l: "late",
    present: "present",
    absent: "absent",
    late: "late",
    excused: "excused",
  };
  return aliases[status] || "";
}
function normalizePayload(actionType, raw = {}, context) {
  const payload = {};
  const idFields = [
    "studentId",
    "classId",
    "branchId",
    "leadId",
    "assigneeId",
    "assignmentId",
    "attachmentReference",
  ];
  for (const field of idFields) {
    if (raw[field] !== undefined) payload[field] = cleanId(raw[field]);
  }
  payload.recipientIds = cleanIdList(raw.recipientIds);
  payload.studentIds = cleanIdList(raw.studentIds);

  if (raw.recipientRole !== undefined) payload.recipientRole = normalizeRole(raw.recipientRole);
  if (raw.channel !== undefined || ["fees.reminder", "admission.follow_up", "message.send"].includes(actionType)) {
    payload.channel = normalizeChannel(raw.channel);
  }

  for (const field of ["date", "dueDate", "followUpAt"]) {
    if (raw[field] !== undefined) payload[field] = cleanDate(raw[field]);
  }

  if (raw.status !== undefined) payload.status = normalizeStatus(raw.status);
  if (raw.requestedStatus !== undefined) payload.requestedStatus = normalizeStatus(raw.requestedStatus);

  const textFields = {
    note: 1000,
    reason: 1500,
    message: 3000,
    title: 200,
    instructions: 4000,
    submissionText: 8000,
    subject: 200,
    details: 4000,
  };
  for (const [field, max] of Object.entries(textFields)) {
    if (raw[field] !== undefined) payload[field] = cleanLongText(raw[field], max);
  }

  if (context.role === "student") {
    if (actionType === "attendance.correction_request" || actionType === "fees.assistance_request") {
      payload.studentId = payload.studentId || context.userId;
    }
  }

  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      return value !== "" && value !== undefined && value !== null;
    })
  );
}
function requiredFieldsMissing(actionType, payload) {
  const definition = actionDefinition(actionType);
  return definition.requiredFields.filter((field) => {
    const value = payload[field];
    return Array.isArray(value) ? value.length === 0 : !value;
  });
}
async function loadRoleScope(context) {
  if (OWNER_ROLES.has(context.role) || context.role === "institute_owner") {
    return {
      available: true,
      scopeMode: "institute",
      instituteWide: true,
      branchIds: [],
      childStudentIds: [],
    };
  }

  if (!["parent", "branch_manager", "accountant", "counsellor", "staff"].includes(context.role)) {
    return {
      available: true,
      scopeMode: context.role === "student" ? "self" : "adapter_validated",
      instituteWide: false,
      branchIds: [],
      childStudentIds: [],
    };
  }

  const Scope = mongoose.models.Part124RoleScopeAssignment;
  if (!dbReady() || !Scope) {
    return {
      available: false,
      scopeMode: "scope_pending",
      instituteWide: false,
      branchIds: [],
      childStudentIds: [],
    };
  }

  const assignment = await Scope.findOne({
    instituteId: context.instituteId,
    identityId: context.identityId,
    role: context.role,
    status: "active",
  }).lean();

  if (!assignment) {
    return {
      available: false,
      scopeMode: "scope_pending",
      instituteWide: false,
      branchIds: [],
      childStudentIds: [],
    };
  }

  const branchIds = cleanIdList(assignment.branchIds, 100);
  const childStudentIds = cleanIdList(assignment.childStudentIds, 100);
  const instituteWide = Boolean(assignment.instituteWide);
  return {
    available:
      context.role === "parent"
        ? childStudentIds.length > 0
        : instituteWide || branchIds.length > 0,
    scopeMode:
      context.role === "parent"
        ? "child"
        : instituteWide
          ? "institute"
          : "branch",
    instituteWide,
    branchIds,
    childStudentIds,
  };
}
function enforceStudentTarget(context, scope, payload) {
  if (!payload.studentId) return;
  if (context.role === "student") {
    if (!context.referenceIds.includes(payload.studentId)) {
      const error = new Error("Student action can target only the logged-in Student identity.");
      error.code = "CROSS_STUDENT_ACTION_BLOCKED";
      error.httpStatus = 403;
      throw error;
    }
  }
  if (context.role === "parent") {
    if (!scope.childStudentIds.includes(payload.studentId)) {
      const error = new Error("Parent action can target only an Owner-linked child Student.");
      error.code = "PARENT_CHILD_SCOPE_MISMATCH";
      error.httpStatus = 403;
      throw error;
    }
  }
}
function enforceBranchScope(context, scope, payload) {
  if (!["branch_manager", "accountant", "counsellor", "staff"].includes(context.role)) return;
  if (!scope.available) {
    const error = new Error("Owner-assigned Part 124 role scope required.");
    error.code = "ROLE_SCOPE_REQUIRED";
    error.httpStatus = 403;
    throw error;
  }
  if (scope.instituteWide) return;
  if (!payload.branchId) {
    const error = new Error("This branch-scoped role must include branchId.");
    error.code = "BRANCH_ID_REQUIRED";
    error.httpStatus = 400;
    throw error;
  }
  if (!scope.branchIds.includes(payload.branchId)) {
    const error = new Error("branchId is outside the Owner-assigned role scope.");
    error.code = "BRANCH_SCOPE_MISMATCH";
    error.httpStatus = 403;
    throw error;
  }
}
function enforceRecipientRules(context, payload) {
  if (!payload.recipientRole) return;
  const allowed = RECIPIENT_ROLE_RULES[context.role] || [];
  if (!allowed.includes(payload.recipientRole)) {
    const error = new Error(`${context.role} cannot message recipient role ${payload.recipientRole}.`);
    error.code = "RECIPIENT_ROLE_BLOCKED";
    error.httpStatus = 403;
    throw error;
  }
  if (payload.recipientIds?.length > MAX_RECIPIENTS) {
    const error = new Error(`Maximum ${MAX_RECIPIENTS} recipients per action.`);
    error.code = "RECIPIENT_LIMIT_EXCEEDED";
    error.httpStatus = 400;
    throw error;
  }
  if (context.role !== "institute_owner" && payload.recipientIds?.length > 10) {
    const error = new Error("Non-owner role can send to maximum 10 recipients per confirmed action.");
    error.code = "ROLE_RECIPIENT_LIMIT_EXCEEDED";
    error.httpStatus = 403;
    throw error;
  }
}
async function validateAction(context, actionType, rawPayload) {
  const definition = actionDefinition(actionType);
  if (!definition) {
    const error = new Error("Unknown VANI action type.");
    error.code = "UNKNOWN_ACTION_TYPE";
    error.httpStatus = 404;
    throw error;
  }
  if (!roleCanUse(context.role, actionType)) {
    const error = new Error(`${context.role} is not allowed to use ${actionType}.`);
    error.code = "ACTION_ROLE_DENIED";
    error.httpStatus = 403;
    throw error;
  }

  const payload = normalizePayload(actionType, rawPayload, context);
  const missingFields = requiredFieldsMissing(actionType, payload);
  if (missingFields.length) {
    const error = new Error(`Required fields missing: ${missingFields.join(", ")}`);
    error.code = "ACTION_FIELDS_REQUIRED";
    error.httpStatus = 400;
    error.missingFields = missingFields;
    error.normalizedPayload = payload;
    throw error;
  }

  if (payload.message && SENSITIVE_PATTERN.test(payload.message)) {
    const error = new Error("Sensitive credential-like data cannot be stored in a VANI action.");
    error.code = "SENSITIVE_DATA_BLOCKED";
    error.httpStatus = 400;
    throw error;
  }

  const scope = await loadRoleScope(context);
  enforceStudentTarget(context, scope, payload);
  enforceBranchScope(context, scope, payload);
  if (actionType === "message.send") enforceRecipientRules(context, payload);

  if (actionType === "attendance.mark" && !["present", "absent", "late", "excused"].includes(payload.status)) {
    const error = new Error("Attendance status must be present, absent, late or excused.");
    error.code = "INVALID_ATTENDANCE_STATUS";
    error.httpStatus = 400;
    throw error;
  }
  if (
    actionType === "attendance.correction_request" &&
    !["present", "absent", "late", "excused"].includes(payload.requestedStatus)
  ) {
    const error = new Error("Requested attendance status is invalid.");
    error.code = "INVALID_REQUESTED_STATUS";
    error.httpStatus = 400;
    throw error;
  }
  if (actionType === "assignment.submit" && context.role !== "student") {
    const error = new Error("Only Student can submit an assignment.");
    error.code = "STUDENT_ONLY_SUBMISSION";
    error.httpStatus = 403;
    throw error;
  }

  return { definition, payload, scope };
}
function createActionId() {
  return `vani_${Date.now().toString(36)}_${crypto.randomBytes(6).toString("hex")}`;
}
async function createPreview(models, context, actionType, rawPayload) {
  if (!dbReady()) {
    const error = new Error("MongoDB connection required for confirmed VANI actions.");
    error.code = "DATABASE_REQUIRED";
    error.httpStatus = 503;
    throw error;
  }

  const { definition, payload, scope } = await validateAction(context, actionType, rawPayload);
  const fingerprint = actionFingerprint(context, actionType, payload);
  const now = new Date();

  const reusable = await models.Action.findOne({
    instituteId: context.instituteId,
    actorUserId: context.userId,
    fingerprint,
    status: "preview_ready",
    previewExpiresAt: { $gt: now },
  }).sort({ createdAt: -1 });

  if (reusable) {
    return {
      action: reusable,
      reusedPreview: true,
      scope,
    };
  }

  const recentExecuted = await models.Action.findOne({
    instituteId: context.instituteId,
    actorUserId: context.userId,
    fingerprint,
    status: { $in: ["executed_native", "executed_pending_adapter"] },
    executedAt: { $gt: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
  }).sort({ executedAt: -1 });

  if (recentExecuted) {
    const error = new Error("Same action was already executed recently. Duplicate action blocked.");
    error.code = "DUPLICATE_ACTION_PROTECTED";
    error.httpStatus = 409;
    error.existingAction = publicAction(recentExecuted);
    throw error;
  }

  const actionId = createActionId();
  const previewExpiresAt = new Date(Date.now() + PREVIEW_TTL_MS);
  const temporary = {
    actionId,
    actionType,
  };
  const confirmation = confirmationText(temporary);

  const action = await models.Action.create({
    actionId,
    instituteId: context.instituteId,
    actorUserId: context.userId,
    actorIdentityId: context.identityId,
    actorRole: context.role,
    actorDisplayName: context.displayName,
    actionType,
    actionLabel: definition.label,
    status: "preview_ready",
    payload,
    payloadDigest: payloadDigest(payload),
    fingerprint,
    confirmationDigest: sha256(confirmation),
    previewExpiresAt,
    part126DeliveryPending: true,
  });

  await writeAudit(models, context, action, "preview_created", "success", {
    scopeMode: scope.scopeMode,
    canonicalTarget: definition.canonicalTarget,
  });

  return {
    action,
    reusedPreview: false,
    scope,
  };
}
function actorFilter(context, actionId) {
  return {
    actionId,
    instituteId: context.instituteId,
    actorUserId: context.userId,
  };
}
async function getOwnedAction(models, context, actionId) {
  const action = await models.Action.findOne(actorFilter(context, actionId));
  if (!action) {
    const error = new Error("VANI action not found for this logged-in user.");
    error.code = "ACTION_NOT_FOUND";
    error.httpStatus = 404;
    throw error;
  }
  return action;
}
async function confirmAction(models, context, actionId, exactConfirmation) {
  const action = await getOwnedAction(models, context, actionId);
  if (action.status === "confirmed") return action;
  if (action.status !== "preview_ready") {
    const error = new Error(`Action cannot be confirmed from status ${action.status}.`);
    error.code = "ACTION_STATE_CONFLICT";
    error.httpStatus = 409;
    throw error;
  }
  if (new Date(action.previewExpiresAt).getTime() <= Date.now()) {
    action.status = "expired";
    await action.save();
    const error = new Error("Action preview expired. Create a fresh preview.");
    error.code = "ACTION_PREVIEW_EXPIRED";
    error.httpStatus = 410;
    throw error;
  }
  if (sha256(String(exactConfirmation || "").trim()) !== action.confirmationDigest) {
    const error = new Error(`Exact confirmation required: ${confirmationText(action)}`);
    error.code = "EXACT_CONFIRMATION_REQUIRED";
    error.httpStatus = 400;
    throw error;
  }

  action.status = "confirmed";
  action.confirmedAt = new Date();
  await action.save();
  await writeAudit(models, context, action, "action_confirmed", "success");
  return action;
}
function actionNeedsOutbox(actionType) {
  return [
    "fees.reminder",
    "fees.assistance_request",
    "admission.follow_up",
    "message.send",
  ].includes(actionType);
}
function outboxPayload(action) {
  const payload = action.payload || {};
  let message = payload.message || "";
  let recipientRole = payload.recipientRole || "";
  let recipientIds = payload.recipientIds || [];

  if (action.actionType === "fees.reminder") {
    recipientRole = recipientRole || "parent";
    recipientIds = recipientIds.length ? recipientIds : [payload.studentId].filter(Boolean);
  }
  if (action.actionType === "fees.assistance_request") {
    recipientRole = "accountant";
    recipientIds = [];
  }
  if (action.actionType === "admission.follow_up") {
    recipientRole = "lead";
    recipientIds = [payload.leadId].filter(Boolean);
  }

  return {
    recipientRole,
    recipientIds,
    channel: payload.channel || "in_app",
    subject: payload.subject || action.actionLabel,
    message,
  };
}
async function executeAction(models, app, context, actionId) {
  const action = await getOwnedAction(models, context, actionId);
  if (["executed_native", "executed_pending_adapter"].includes(action.status)) {
    return { action, idempotentReplay: true };
  }
  if (action.status !== "confirmed") {
    const error = new Error("Action must be confirmed before execution.");
    error.code = "ACTION_NOT_CONFIRMED";
    error.httpStatus = 409;
    throw error;
  }

  const definition = actionDefinition(action.actionType);
  const canonical = await models.Canonical.findOneAndUpdate(
    { actionId: action.actionId },
    {
      $setOnInsert: {
        actionId: action.actionId,
        instituteId: action.instituteId,
        actorUserId: action.actorUserId,
        actorRole: action.actorRole,
        actionType: action.actionType,
        targetType: definition.canonicalTarget,
        payload: action.payload,
        payloadDigest: action.payloadDigest,
        canonicalStatus: "accepted",
        nativeAdapterStatus: "pending_part126",
      },
    },
    { upsert: true, new: true, runValidators: true }
  );

  let outbox = null;
  if (actionNeedsOutbox(action.actionType)) {
    const outboxData = outboxPayload(action);
    outbox = await models.Outbox.findOneAndUpdate(
      { actionId: action.actionId },
      {
        $setOnInsert: {
          actionId: action.actionId,
          instituteId: action.instituteId,
          actionType: action.actionType,
          actorUserId: action.actorUserId,
          recipientRole: outboxData.recipientRole,
          recipientIds: outboxData.recipientIds,
          channel: outboxData.channel,
          subject: outboxData.subject,
          message: outboxData.message,
          deliveryStatus: "pending_part126",
        },
      },
      { upsert: true, new: true, runValidators: true }
    );
  }

  action.canonicalRecordId = String(canonical._id);
  action.outboxRecordId = outbox ? String(outbox._id) : "";
  action.executedAt = new Date();

  const adapters = app.locals.part125ActionAdapters || new Map();
  const adapterEntry = adapters instanceof Map
    ? adapters.get(action.actionType)
    : adapters[action.actionType];

  if (!adapterEntry || typeof adapterEntry.handler !== "function") {
    action.status = "executed_pending_adapter";
    action.adapterName = "";
    action.nativeModuleApplied = false;
    action.externalDeliveryPerformed = false;
    action.part126DeliveryPending = true;
    await canonical.updateOne({ nativeAdapterStatus: "pending_part126" });
    await action.save();
    await writeAudit(models, context, action, "action_executed", "pending_adapter", {
      canonicalRecordId: action.canonicalRecordId,
      outboxRecordId: action.outboxRecordId,
      targetPart: 126,
    });
    return { action, idempotentReplay: false };
  }

  try {
    const adapterResult = await adapterEntry.handler({
      actionId: action.actionId,
      actionType: action.actionType,
      instituteId: action.instituteId,
      actor: {
        userId: action.actorUserId,
        role: action.actorRole,
        displayName: action.actorDisplayName,
      },
      payload: action.payload,
      canonicalRecordId: String(canonical._id),
      outboxRecordId: outbox ? String(outbox._id) : "",
    });

    action.status = "executed_native";
    action.adapterName = cleanText(adapterEntry.name || "part126_adapter", 120);
    action.adapterResult = adapterResult && typeof adapterResult === "object"
      ? adapterResult
      : { success: true };
    action.nativeModuleApplied = true;
    action.externalDeliveryPerformed = Boolean(adapterResult?.externalDeliveryPerformed);
    action.part126DeliveryPending = false;
    await canonical.updateOne({ nativeAdapterStatus: "applied" });
    if (outbox && adapterResult?.externalDeliveryPerformed) {
      await outbox.updateOne({
        deliveryStatus: "delivered",
        deliveredAt: new Date(),
        providerReference: cleanText(adapterResult.providerReference || "", 200),
      });
    }
    await action.save();
    await writeAudit(models, context, action, "action_executed", "native_success", {
      adapterName: action.adapterName,
    });
    return { action, idempotentReplay: false };
  } catch (error) {
    action.status = "adapter_failed";
    action.adapterName = cleanText(adapterEntry.name || "part126_adapter", 120);
    action.failureCode = cleanText(error.code || "ADAPTER_EXECUTION_FAILED", 120);
    action.failureMessage = cleanText(error.message || "Native adapter failed.", 500);
    action.nativeModuleApplied = false;
    action.part126DeliveryPending = true;
    await canonical.updateOne({ nativeAdapterStatus: "failed" });
    await action.save();
    await writeAudit(models, context, action, "action_executed", "adapter_failed", {
      adapterName: action.adapterName,
      failureCode: action.failureCode,
    });
    const wrapped = new Error("Canonical action saved, but native module adapter failed.");
    wrapped.code = "NATIVE_ADAPTER_FAILED";
    wrapped.httpStatus = 502;
    wrapped.action = action;
    throw wrapped;
  }
}
function extractKeyValues(command) {
  const result = {};
  const regex = /([a-zA-Z][a-zA-Z0-9_]*)\s*=\s*("[^"]*"|'[^']*'|[^\s]+)/g;
  let match;
  while ((match = regex.exec(command))) {
    let value = match[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[match[1]] = value;
  }
  return result;
}
function firstMatch(command, regex) {
  const match = String(command || "").match(regex);
  return match ? cleanText(match[1], 300) : "";
}
function inferActionType(command = "") {
  for (const [actionType, pattern] of ACTION_PATTERNS) {
    if (pattern.test(command)) return actionType;
  }
  return "";
}
function parseCommandPayload(command = "", actionType = "") {
  const text = cleanText(command, 3000);
  const payload = extractKeyValues(text);

  payload.studentId ||= firstMatch(text, /student(?:\s*id)?\s*[:#-]?\s*([a-zA-Z0-9:_-]+)/i);
  payload.branchId ||= firstMatch(text, /branch(?:\s*id)?\s*[:#-]?\s*([a-zA-Z0-9:_-]+)/i);
  payload.classId ||= firstMatch(text, /class(?:\s*id)?\s*[:#-]?\s*([a-zA-Z0-9:_-]+)/i);
  payload.leadId ||= firstMatch(text, /lead(?:\s*id)?\s*[:#-]?\s*([a-zA-Z0-9:_-]+)/i);
  payload.assignmentId ||= firstMatch(text, /assignment(?:\s*id)?\s*[:#-]?\s*([a-zA-Z0-9:_-]+)/i);
  payload.date ||= firstMatch(text, /\bdate\s*[:=-]?\s*(\d{4}-\d{2}-\d{2})/i);
  payload.dueDate ||= firstMatch(text, /\bdue(?:\s*date)?\s*[:=-]?\s*(\d{4}-\d{2}-\d{2})/i);
  payload.followUpAt ||= firstMatch(text, /follow.?up(?:\s*at|\s*date)?\s*[:=-]?\s*(\d{4}-\d{2}-\d{2}(?:T[0-9:.+-]+Z?)?)/i);
  payload.status ||= firstMatch(text, /\b(present|absent|late|excused)\b/i);
  payload.requestedStatus ||= firstMatch(text, /\b(?:to|status)\s+(present|absent|late|excused)\b/i);
  payload.recipientRole ||= firstMatch(text, /\b(?:to|recipient)\s+(owner|branch_manager|teacher|student|parent|accountant|counsellor|staff)\b/i);
  payload.channel ||= firstMatch(text, /\b(in_app|email|sms|whatsapp)\b/i);
  payload.title ||= firstMatch(text, /\btitle\s*[:=-]\s*([^,;]+)/i);
  payload.subject ||= firstMatch(text, /\bsubject\s*[:=-]\s*([^,;]+)/i);
  payload.message ||= firstMatch(text, /\bmessage\s*[:=-]\s*(.+)$/i);
  payload.instructions ||= firstMatch(text, /\binstructions?\s*[:=-]\s*(.+)$/i);
  payload.submissionText ||= firstMatch(text, /\bsubmission\s*[:=-]\s*(.+)$/i);
  payload.reason ||= firstMatch(text, /\breason\s*[:=-]\s*(.+)$/i);
  payload.details ||= firstMatch(text, /\bdetails?\s*[:=-]\s*(.+)$/i);

  if (payload.recipientIds) payload.recipientIds = cleanIdList(payload.recipientIds);
  if (payload.studentIds) payload.studentIds = cleanIdList(payload.studentIds);

  if (actionType === "fees.reminder" && !payload.message) {
    payload.message = "Fee reminder: Please review the pending fee details in your private NAXORA account.";
  }
  return payload;
}
function listRegisteredAdapters(app) {
  const adapters = app.locals.part125ActionAdapters || new Map();
  if (adapters instanceof Map) {
    return [...adapters.entries()].map(([actionType, entry]) => ({
      actionType,
      name: entry.name || "registered_adapter",
    }));
  }
  return Object.entries(adapters).map(([actionType, entry]) => ({
    actionType,
    name: entry?.name || "registered_adapter",
  }));
}

export function registerPart125ActionAdapter(app, actionType, handler, name = "") {
  if (!app?.locals) throw new Error("Express app with app.locals required.");
  if (!ACTION_DEFINITIONS[actionType]) throw new Error(`Unknown Part 125 action type: ${actionType}`);
  if (typeof handler !== "function") throw new Error("Part 125 adapter handler must be a function.");
  if (!(app.locals.part125ActionAdapters instanceof Map)) {
    app.locals.part125ActionAdapters = new Map();
  }
  app.locals.part125ActionAdapters.set(actionType, {
    handler,
    name: cleanText(name || `adapter_${actionType}`, 120),
  });
}

export function registerPart125GlobalVaniActions({ app } = {}) {
  if (!app || typeof app.get !== "function" || typeof app.post !== "function") {
    throw new Error("Part 125 registration failed: Express app required.");
  }
  if (app.locals.part125GlobalVaniActionsRegistered) return;
  app.locals.part125GlobalVaniActionsRegistered = true;
  if (!(app.locals.part125ActionAdapters instanceof Map)) {
    app.locals.part125ActionAdapters = new Map();
  }
  const models = defineModels();

  app.get(["/vani-actions", "/global-vani-actions", "/part125"], (req, res) => {
    res.sendFile(path.join(frontendDir, "naxora-vani-actions.html"));
  });
  app.get("/naxora-vani-actions.css", (req, res) => {
    res.type("text/css").sendFile(path.join(frontendDir, "naxora-vani-actions.css"));
  });
  app.get("/naxora-vani-actions.js", (req, res) => {
    res.type("application/javascript").sendFile(path.join(frontendDir, "naxora-vani-actions.js"));
  });
  app.get("/naxora-part125-global-vani-bridge.js", (req, res) => {
    res.type("application/javascript").sendFile(
      path.join(frontendDir, "naxora-part125-global-vani-bridge.js")
    );
  });

  app.get("/api/part125/status", (req, res) => {
    const adapters = listRegisteredAdapters(app);
    res.json({
      success: true,
      part: PART_NUMBER,
      name: PART_NAME,
      status: "global_vani_action_engine_active",
      page: "/vani-actions",
      commonLoginRequired: true,
      allPlannedRolesSupported: true,
      previewRequired: true,
      exactConfirmationRequired: true,
      duplicateProtectionEnabled: true,
      actionExpiryMinutes: PREVIEW_TTL_MS / 60000,
      canonicalExecutionEnabled: true,
      nativeAdapterInterfaceEnabled: true,
      registeredNativeAdapters: adapters,
      registeredNativeAdapterCount: adapters.length,
      externalDeliveryEnabledByPart125Alone: false,
      liveMoneyActionsEnabled: false,
      destructiveActionsEnabled: false,
      part126RequiredForFullNativeDelivery: true,
      nextPart: 126,
      nextPartName: "Cross-Module E2E Integration",
    });
  });

  app.get("/api/part125/security-policy", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      jwtRoleAndInstituteRequired: true,
      part124ScopeEnforcedForScopedRoles: true,
      studentSelfScopeEnforced: true,
      parentChildScopeEnforced: true,
      branchScopeEnforced: true,
      actionRoleMatrixEnforced: true,
      previewBeforeConfirmation: true,
      exactConfirmationRequired: true,
      previewExpires: true,
      idempotentExecution: true,
      duplicateActionWindowMinutes: DUPLICATE_WINDOW_MS / 60000,
      arbitraryActionTypesBlocked: true,
      credentialStorageBlocked: true,
      liveMoneyCommandsBlocked: true,
      destructiveCommandsBlocked: true,
      nativeWritesRequireRegisteredAdapter: true,
      externalDeliveryRequiresPart126Adapter: true,
      rawPasswordsSecretsOtpNeverRequested: true,
    });
  });

  app.get("/api/part125/catalog", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      actions: Object.entries(ACTION_DEFINITIONS).map(([actionType, definition]) => ({
        actionType,
        label: definition.label,
        description: definition.description,
        category: definition.category,
        roles: definition.roles,
        requiredFields: definition.requiredFields,
        optionalFields: definition.optionalFields,
        canonicalTarget: definition.canonicalTarget,
        nativeAdapterTargetPart: definition.nativeAdapterTargetPart,
      })),
    });
  });

  app.get("/api/part125/my-actions", authenticated, async (req, res) => {
    if (!dbReady()) {
      return res.status(503).json({
        success: false,
        part: PART_NUMBER,
        code: "DATABASE_REQUIRED",
        message: "MongoDB connection required.",
      });
    }
    const limit = Math.min(Math.max(Number(req.query.limit || 30), 1), 100);
    const filter = {
      instituteId: req.part125Context.instituteId,
      actorUserId: req.part125Context.userId,
    };
    const actions = await models.Action.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
    res.json({
      success: true,
      part: PART_NUMBER,
      count: actions.length,
      actions: actions.map((action) => publicAction(action, true)),
    });
  });

  app.get("/api/part125/actions/:actionId", authenticated, async (req, res) => {
    try {
      const action = await getOwnedAction(
        models,
        req.part125Context,
        cleanId(req.params.actionId)
      );
      res.json({
        success: true,
        part: PART_NUMBER,
        action: publicAction(action, true),
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "ACTION_READ_FAILED",
        message: error.message,
      });
    }
  });

  app.post("/api/part125/actions/preview", authenticated, async (req, res) => {
    try {
      const actionType = cleanText(req.body?.actionType || "", 100);
      const result = await createPreview(
        models,
        req.part125Context,
        actionType,
        req.body?.payload || {}
      );
      res.status(result.reusedPreview ? 200 : 201).json({
        success: true,
        part: PART_NUMBER,
        message: result.reusedPreview
          ? "Existing unexpired preview reused."
          : "Action preview ready. Review every field before exact confirmation.",
        reusedPreview: result.reusedPreview,
        scope: {
          available: result.scope.available,
          scopeMode: result.scope.scopeMode,
          branchCount: result.scope.branchIds?.length || 0,
          childCount: result.scope.childStudentIds?.length || 0,
          instituteWide: Boolean(result.scope.instituteWide),
        },
        action: publicAction(result.action, true),
        nativeExecutionNotice:
          "Part 125 saves a canonical action. Existing module/provider delivery occurs only when a Part 126 native adapter is registered.",
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "ACTION_PREVIEW_FAILED",
        message: error.message,
        missingFields: error.missingFields || [],
        normalizedPayload: error.normalizedPayload || {},
        existingAction: error.existingAction || null,
      });
    }
  });

  app.post("/api/part125/actions/:actionId/confirm", authenticated, async (req, res) => {
    try {
      const action = await confirmAction(
        models,
        req.part125Context,
        cleanId(req.params.actionId),
        req.body?.confirmationText
      );
      res.json({
        success: true,
        part: PART_NUMBER,
        message: "Action confirmed. Final execution is still a separate step.",
        action: publicAction(action, true),
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "ACTION_CONFIRM_FAILED",
        message: error.message,
      });
    }
  });

  app.post("/api/part125/actions/:actionId/execute", authenticated, async (req, res) => {
    try {
      const result = await executeAction(
        models,
        app,
        req.part125Context,
        cleanId(req.params.actionId)
      );
      res.json({
        success: true,
        part: PART_NUMBER,
        idempotentReplay: result.idempotentReplay,
        message: result.action.nativeModuleApplied
          ? "Action executed by a registered native adapter."
          : "Canonical action executed and saved. Native module/provider delivery is pending Part 126 adapter integration.",
        action: publicAction(result.action, true),
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "ACTION_EXECUTION_FAILED",
        message: error.message,
        action: error.action ? publicAction(error.action, true) : null,
      });
    }
  });

  app.post("/api/part125/actions/:actionId/cancel", authenticated, async (req, res) => {
    try {
      const action = await getOwnedAction(
        models,
        req.part125Context,
        cleanId(req.params.actionId)
      );
      if (!["preview_ready", "confirmed"].includes(action.status)) {
        const error = new Error(`Action cannot be cancelled from status ${action.status}.`);
        error.code = "ACTION_STATE_CONFLICT";
        error.httpStatus = 409;
        throw error;
      }
      action.status = "cancelled";
      action.cancelledAt = new Date();
      await action.save();
      await writeAudit(models, req.part125Context, action, "action_cancelled", "success");
      res.json({
        success: true,
        part: PART_NUMBER,
        message: "Action cancelled before native execution.",
        action: publicAction(action, true),
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "ACTION_CANCEL_FAILED",
        message: error.message,
      });
    }
  });

  app.post("/api/part125/vani/command", authenticated, async (req, res) => {
    const command = cleanLongText(req.body?.command || "", 3000);
    if (!command) {
      return res.status(400).json({
        success: false,
        part: PART_NUMBER,
        code: "VANI_COMMAND_REQUIRED",
        message: "VANI command required.",
      });
    }
    if (SENSITIVE_PATTERN.test(command)) {
      return res.json({
        success: true,
        part: PART_NUMBER,
        replyText: "Password, OTP, API secret, card/bank aur KYC details VANI ko mat boliye.",
        spokenSafeSummary: "Sensitive information private rakhi gayi hai.",
        actionExecuted: false,
        blocked: true,
        reasonCode: "SENSITIVE_DATA_BLOCKED",
      });
    }
    if (BLOCKED_MONEY_PATTERN.test(command)) {
      return res.json({
        success: true,
        part: PART_NUMBER,
        replyText: "Global VANI direct money transfer, charge, refund ya bank action execute nahi karti. Secured billing screen aur adult legal merchant controls use honge.",
        spokenSafeSummary: "Direct money action blocked hai.",
        actionExecuted: false,
        blocked: true,
        reasonCode: "LIVE_MONEY_ACTION_BLOCKED",
      });
    }
    if (DESTRUCTIVE_PATTERN.test(command)) {
      return res.json({
        success: true,
        part: PART_NUMBER,
        replyText: "Destructive delete action Global VANI se available nahi hai.",
        spokenSafeSummary: "Destructive action blocked hai.",
        actionExecuted: false,
        blocked: true,
        reasonCode: "DESTRUCTIVE_ACTION_BLOCKED",
      });
    }

    const actionType = cleanText(req.body?.actionType || inferActionType(command), 100);
    if (!actionType) {
      return res.json({
        success: true,
        part: PART_NUMBER,
        replyText: "Main attendance, fee reminder/help request, admission follow-up, assignment, role-safe message aur branch task ke multi-step actions chala sakti hoon. Action page khol rahi hoon.",
        spokenSafeSummary: "Global VANI action page khol rahi hoon.",
        openModuleKey: "vani-actions",
        actionExecuted: false,
        supportedActionTypes: Object.keys(ACTION_DEFINITIONS),
      });
    }

    if (!actionDefinition(actionType)) {
      return res.status(404).json({
        success: false,
        part: PART_NUMBER,
        code: "UNKNOWN_ACTION_TYPE",
        message: "VANI command se unknown action type mila.",
        openModuleKey: "vani-actions",
      });
    }

    const parsedPayload = {
      ...parseCommandPayload(command, actionType),
      ...(req.body?.payload && typeof req.body.payload === "object" ? req.body.payload : {}),
    };

    try {
      const result = await createPreview(
        models,
        req.part125Context,
        actionType,
        parsedPayload
      );
      return res.status(result.reusedPreview ? 200 : 201).json({
        success: true,
        part: PART_NUMBER,
        replyText: `${result.action.actionLabel} preview ready hai. Details review karke exact confirmation enter karein; VANI bina confirmation execute nahi karegi.`,
        spokenSafeSummary: `${result.action.actionLabel} preview ready hai.`,
        openModuleKey: "vani-actions",
        actionExecuted: false,
        previewCreated: true,
        action: publicAction(result.action, true),
        parsedPayload,
      });
    } catch (error) {
      if (error.code === "ACTION_FIELDS_REQUIRED") {
        return res.json({
          success: true,
          part: PART_NUMBER,
          replyText: `${ACTION_DEFINITIONS[actionType].label} ke liye ye details chahiye: ${error.missingFields.join(", ")}.`,
          spokenSafeSummary: "Action complete karne ke liye kuch details chahiye.",
          openModuleKey: "vani-actions",
          actionExecuted: false,
          previewCreated: false,
          actionType,
          parsedPayload: error.normalizedPayload || parsedPayload,
          neededFields: error.missingFields,
        });
      }
      return res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "VANI_ACTION_INTERPRET_FAILED",
        message: error.message,
        openModuleKey: "vani-actions",
        existingAction: error.existingAction || null,
      });
    }
  });

  app.get("/api/part125/demo", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      name: PART_NAME,
      page: "/vani-actions",
      lifecycle: [
        "Role login and institute verification",
        "Deterministic command interpretation or structured form",
        "Role and Part 124 scope validation",
        "Action preview stored in MongoDB",
        "Exact confirmation",
        "Separate execute step",
        "Canonical action/outbox record",
        "Registered native adapter execution, otherwise Part 126 pending",
        "Idempotent result and audit trail",
      ],
      examples: [
        "attendance mark student STU001 date 2026-07-18 present class BATCH10",
        "fee reminder student STU001 message=\"Please review fee details\"",
        "admission lead LEAD10 follow-up 2026-07-19 message=\"Call requested\"",
        "assignment create class BATCH10 title=\"Algebra practice\" due 2026-07-20 instructions=\"Solve questions 1 to 10\"",
        "message send to teacher recipientIds=T01 message=\"Please review my request\"",
      ],
      honestBoundary: {
        canonicalActionsAreReal: true,
        nativeModuleMutationWithoutAdapter: false,
        externalDeliveryWithoutAdapter: false,
        fullCrossModuleAdaptersTargetPart: 126,
      },
    });
  });
}
