import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const PART_NUMBER = 132;
const PART_NAME = "VANI Admissions and CRM Operations";
const PREVIEW_TTL_MS = 30 * 60 * 1000;
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;
const MAX_RECORDS = 300;

const OWNER_ROLES = new Set(["institute_owner", "owner", "instituteowner"]);
const CRM_ROLES = new Set(["institute_owner", "branch_manager", "counsellor", "staff"]);
const FULL_CRM_ROLES = new Set(["institute_owner", "branch_manager", "counsellor"]);
const BRANCH_SCOPED_ROLES = new Set(["branch_manager", "counsellor", "staff"]);
const LEAD_STAGES = [
  "new",
  "contacted",
  "qualified",
  "demo_scheduled",
  "application_started",
  "admitted",
  "lost",
  "closed",
];
const PRIORITIES = ["low", "normal", "high", "urgent"];
const FOLLOWUP_STATUSES = ["scheduled", "completed", "cancelled"];
const ADMISSION_STATUSES = ["application_started", "documents_pending", "approved", "enrolled", "cancelled"];
const DOCUMENT_STATUSES = ["missing", "requested", "received", "verified", "rejected"];

const ACTION_DEFINITIONS = Object.freeze({
  "crm.lead.create": {
    label: "Create Enquiry / Lead",
    roles: ["institute_owner", "branch_manager", "counsellor", "staff"],
    requiredFields: ["branchId", "studentName", "source"],
    optionalFields: [
      "guardianName", "phone", "email", "interestedCourseId", "interestedClassId",
      "priority", "consentToContact", "doNotContact", "note",
    ],
  },
  "crm.lead.update": {
    label: "Update Lead",
    roles: ["institute_owner", "branch_manager", "counsellor"],
    requiredFields: ["leadId"],
    optionalFields: [
      "studentName", "guardianName", "phone", "email", "source",
      "interestedCourseId", "interestedClassId", "priority",
      "consentToContact", "doNotContact", "note",
    ],
  },
  "crm.lead.assign_counsellor": {
    label: "Assign Counsellor",
    roles: ["institute_owner", "branch_manager"],
    requiredFields: ["leadId", "counsellorIdentityId"],
    optionalFields: ["note"],
  },
  "crm.lead.stage_update": {
    label: "Update Lead Stage",
    roles: ["institute_owner", "branch_manager", "counsellor"],
    requiredFields: ["leadId", "stage"],
    optionalFields: ["reason", "nextFollowUpAt"],
  },
  "crm.lead.note_add": {
    label: "Add Lead Note",
    roles: ["institute_owner", "branch_manager", "counsellor"],
    requiredFields: ["leadId", "note"],
    optionalFields: ["visibility"],
  },
  "crm.followup.create": {
    label: "Create Follow-up",
    roles: ["institute_owner", "branch_manager", "counsellor"],
    requiredFields: ["leadId", "scheduledAt", "purpose"],
    optionalFields: ["assignedCounsellorId", "note"],
  },
  "crm.followup.reschedule": {
    label: "Reschedule Follow-up",
    roles: ["institute_owner", "branch_manager", "counsellor"],
    requiredFields: ["followUpId", "scheduledAt"],
    optionalFields: ["purpose", "note"],
  },
  "crm.followup.complete": {
    label: "Complete Follow-up",
    roles: ["institute_owner", "branch_manager", "counsellor"],
    requiredFields: ["followUpId", "outcome"],
    optionalFields: ["nextFollowUpAt", "note"],
  },
  "crm.admission.convert": {
    label: "Convert Lead to Admission",
    roles: ["institute_owner", "branch_manager", "counsellor"],
    requiredFields: ["leadId", "admissionNumber", "admissionDate", "courseId"],
    optionalFields: ["classId", "existingStudentId", "note", "status"],
  },
  "crm.admission.update": {
    label: "Update Admission",
    roles: ["institute_owner", "branch_manager", "counsellor"],
    requiredFields: ["admissionId"],
    optionalFields: ["courseId", "classId", "existingStudentId", "status", "note"],
  },
  "crm.document_checklist.update": {
    label: "Update Admission Document Checklist",
    roles: ["institute_owner", "branch_manager", "counsellor"],
    requiredFields: ["admissionId", "itemName", "itemStatus"],
    optionalFields: ["note"],
  },
  "crm.summary.generate": {
    label: "Generate CRM Pipeline Summary",
    roles: ["institute_owner", "branch_manager", "counsellor"],
    requiredFields: [],
    optionalFields: ["branchId", "fromDate", "toDate"],
  },
});

const ACTION_PATTERNS = Object.freeze([
  ["crm.lead.assign_counsellor", /(lead|enquiry|inquiry).*(assign|allocate).*(counsellor|counselor)/i],
  ["crm.lead.stage_update", /(lead|enquiry|inquiry).*(stage|status).*(update|badlo|set)/i],
  ["crm.lead.note_add", /(lead|enquiry|inquiry).*(note|remark).*(add|jodo|save)/i],
  ["crm.lead.update", /(lead|enquiry|inquiry).*(update|edit|badlo)/i],
  ["crm.lead.create", /(lead|enquiry|inquiry).*(create|banao|add|new)/i],
  ["crm.followup.reschedule", /(follow.?up).*(reschedule|update time|badlo)/i],
  ["crm.followup.complete", /(follow.?up).*(complete|done|close)/i],
  ["crm.followup.create", /(follow.?up).*(create|schedule|banao|add)/i],
  ["crm.admission.convert", /(lead|enquiry|inquiry).*(convert|admission|enrol|enroll)/i],
  ["crm.admission.update", /admission.*(update|edit|status|badlo)/i],
  ["crm.document_checklist.update", /(document|checklist).*(update|received|verified|missing|requested|rejected)/i],
  ["crm.summary.generate", /(crm|admission|lead|pipeline).*(summary|report).*(generate|banao|dikhao)/i],
]);

const SENSITIVE_PATTERN =
  /(password|passcode|otp|cvv|upi\s*pin|api\s*key|secret|jwt|bank\s*account|card\s*number|aadhaar|aadhar|pan\s*(card|number)?|passport\s*number)/i;
const EXTERNAL_SEND_PATTERN =
  /(send|bhejo|deliver).*(whatsapp|sms|email)|(?:whatsapp|sms|email).*(send|bhejo|deliver)/i;
const DESTRUCTIVE_PATTERN = /(delete permanently|purge|erase all|drop database|bulk delete)/i;

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
function cleanLong(value = "", max = 5000) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, max);
}
function cleanId(value = "") {
  return String(value ?? "").trim().replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 180);
}
function cleanDate(value = "", dateOnly = false) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const parsed = new Date(text.length === 10 ? `${text}T00:00:00.000Z` : text);
  if (Number.isNaN(parsed.getTime())) return "";
  return dateOnly ? parsed.toISOString().slice(0, 10) : parsed.toISOString();
}
function cleanBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  const text = String(value ?? "").trim().toLowerCase();
  if (["true", "yes", "1", "haan", "on"].includes(text)) return true;
  if (["false", "no", "0", "nahi", "off"].includes(text)) return false;
  return fallback;
}
function normalizeRole(value = "") {
  const role = String(value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return ({
    owner: "institute_owner",
    instituteowner: "institute_owner",
    branchmanager: "branch_manager",
    counselor: "counsellor",
  })[role] || role;
}
function normalizeChoice(value, allowed, fallback = "") {
  const normalized = cleanText(value, 50).toLowerCase().replace(/[\s-]+/g, "_");
  return allowed.includes(normalized) ? normalized : fallback;
}
function cleanPhone(value = "") {
  const text = String(value ?? "").trim().replace(/[()\s-]/g, "");
  return /^\+?\d{8,15}$/.test(text) ? text : "";
}
function cleanEmail(value = "") {
  const text = String(value ?? "").trim().toLowerCase().slice(0, 180);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? text : "";
}
function dbReady() {
  return mongoose.connection?.readyState === 1;
}
function sha256(value) {
  return crypto.createHash("sha256").update(String(value ?? "")).digest("hex");
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
function createId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(5).toString("hex")}`;
}
function jwtSecrets() {
  return [
    process.env.JWT_SECRET,
    process.env.JWT_ACCESS_SECRET,
    process.env.ACCESS_TOKEN_SECRET,
    process.env.NAXORA_JWT_SECRET,
  ].map(value => String(value ?? "").trim()).filter(Boolean);
}
function verifyJwt(token) {
  const secrets = jwtSecrets();
  if (!secrets.length) {
    throw Object.assign(new Error("JWT server configuration missing."), {
      code: "JWT_CONFIGURATION_MISSING",
      httpStatus: 503,
    });
  }
  for (const secret of secrets) {
    try {
      return jwt.verify(token, secret, { algorithms: ["HS256", "HS384", "HS512"] });
    } catch {
      // Try another configured secret.
    }
  }
  throw Object.assign(new Error("Login session invalid or expired."), {
    code: "INVALID_SESSION",
    httpStatus: 401,
  });
}
function actionContext(req) {
  const auth = String(req.headers.authorization ?? "").trim();
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const payload = req.part120Context || req.user || req.auth || (token ? verifyJwt(token) : null);
  if (!payload) {
    throw Object.assign(new Error("Common role login required."), {
      code: "LOGIN_REQUIRED",
      httpStatus: 401,
    });
  }
  const rawRole = normalizeRole(
    payload.role || payload.userRole || payload.accountRole || payload.user?.role || ""
  );
  const role = OWNER_ROLES.has(rawRole) ? "institute_owner" : rawRole;
  if (!CRM_ROLES.has(role)) {
    throw Object.assign(new Error("This role cannot use Part 132 CRM operations."), {
      code: "CRM_ROLE_DENIED",
      httpStatus: 403,
    });
  }
  const tokenInstituteId = cleanId(
    payload.instituteId || payload.institute_id || payload.user?.instituteId || payload.tenantId || ""
  );
  const requestedInstituteId = cleanId(
    req.headers["x-naxora-institute-id"] || req.body?.instituteId || req.query?.instituteId || ""
  );
  if (tokenInstituteId && requestedInstituteId && tokenInstituteId !== requestedInstituteId) {
    throw Object.assign(new Error("Institute context mismatch."), {
      code: "INSTITUTE_CONTEXT_MISMATCH",
      httpStatus: 403,
    });
  }
  const instituteId = tokenInstituteId || requestedInstituteId;
  if (!instituteId) {
    throw Object.assign(new Error("Valid instituteId required."), {
      code: "INSTITUTE_ID_REQUIRED",
      httpStatus: 400,
    });
  }
  const userId = cleanId(payload.userId || payload.identityId || payload.id || payload._id || payload.sub || "user");
  const identityId = cleanId(payload.identityId || payload.sub || userId);
  return {
    instituteId,
    userId,
    identityId,
    role,
    displayName: cleanText(payload.displayName || payload.name || payload.email || role, 120),
  };
}
function authenticated(req, res, next) {
  try {
    req.part132Context = actionContext(req);
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
    status: {
      type: String,
      enum: ["preview_ready", "executing", "executed_native", "failed", "cancelled", "expired"],
      default: "preview_ready",
      index: true,
    },
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

  const leadSchema = new mongoose.Schema({
    leadId: { type: String, required: true, unique: true, index: true },
    instituteId: { type: String, required: true, index: true },
    branchId: { type: String, required: true, index: true },
    studentName: { type: String, required: true },
    guardianName: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    source: { type: String, required: true, index: true },
    interestedCourseId: { type: String, default: "", index: true },
    interestedClassId: { type: String, default: "", index: true },
    stage: { type: String, enum: LEAD_STAGES, default: "new", index: true },
    priority: { type: String, enum: PRIORITIES, default: "normal", index: true },
    assignedCounsellorId: { type: String, default: "", index: true },
    consentToContact: { type: Boolean, default: false },
    doNotContact: { type: Boolean, default: false, index: true },
    latestNote: { type: String, default: "" },
    nextFollowUpAt: { type: Date, default: null, index: true },
    convertedAdmissionId: { type: String, default: "", index: true },
    status: { type: String, enum: ["active", "closed"], default: "active", index: true },
    createdByUserId: { type: String, required: true },
    updatedByUserId: { type: String, required: true },
    createdByActionId: { type: String, required: true },
    updatedByActionId: { type: String, required: true },
  }, { timestamps: true, strict: true });
  leadSchema.index(
    { instituteId: 1, branchId: 1, phone: 1 },
    { unique: true, partialFilterExpression: { phone: { $type: "string", $ne: "" }, status: "active" } }
  );
  leadSchema.index(
    { instituteId: 1, branchId: 1, email: 1 },
    { unique: true, partialFilterExpression: { email: { $type: "string", $ne: "" }, status: "active" } }
  );

  const noteSchema = new mongoose.Schema({
    noteId: { type: String, required: true, unique: true, index: true },
    instituteId: { type: String, required: true, index: true },
    leadId: { type: String, required: true, index: true },
    branchId: { type: String, required: true, index: true },
    note: { type: String, required: true },
    visibility: { type: String, enum: ["crm_team", "owner_only"], default: "crm_team" },
    createdByUserId: { type: String, required: true },
    actionId: { type: String, required: true },
  }, { timestamps: true, strict: true });

  const followUpSchema = new mongoose.Schema({
    followUpId: { type: String, required: true, unique: true, index: true },
    instituteId: { type: String, required: true, index: true },
    leadId: { type: String, required: true, index: true },
    branchId: { type: String, required: true, index: true },
    assignedCounsellorId: { type: String, required: true, index: true },
    scheduledAt: { type: Date, required: true, index: true },
    purpose: { type: String, required: true },
    note: { type: String, default: "" },
    outcome: { type: String, default: "" },
    completedAt: { type: Date, default: null },
    status: { type: String, enum: FOLLOWUP_STATUSES, default: "scheduled", index: true },
    externalMessageSent: { type: Boolean, default: false },
    createdByUserId: { type: String, required: true },
    updatedByUserId: { type: String, required: true },
    createdByActionId: { type: String, required: true },
    updatedByActionId: { type: String, required: true },
  }, { timestamps: true, strict: true });

  const admissionSchema = new mongoose.Schema({
    admissionId: { type: String, required: true, unique: true, index: true },
    instituteId: { type: String, required: true, index: true },
    admissionNumber: { type: String, required: true },
    leadId: { type: String, required: true, index: true },
    branchId: { type: String, required: true, index: true },
    courseId: { type: String, required: true, index: true },
    classId: { type: String, default: "", index: true },
    existingStudentId: { type: String, default: "", index: true },
    admissionDate: { type: Date, required: true },
    status: { type: String, enum: ADMISSION_STATUSES, default: "application_started", index: true },
    note: { type: String, default: "" },
    studentAccountCreated: { type: Boolean, default: false },
    paymentCollected: { type: Boolean, default: false },
    createdByUserId: { type: String, required: true },
    updatedByUserId: { type: String, required: true },
    createdByActionId: { type: String, required: true },
    updatedByActionId: { type: String, required: true },
  }, { timestamps: true, strict: true });
  admissionSchema.index({ instituteId: 1, admissionNumber: 1 }, { unique: true });
  admissionSchema.index({ instituteId: 1, leadId: 1 }, { unique: true });

  const documentSchema = new mongoose.Schema({
    checklistItemId: { type: String, required: true, unique: true, index: true },
    instituteId: { type: String, required: true, index: true },
    admissionId: { type: String, required: true, index: true },
    leadId: { type: String, required: true, index: true },
    branchId: { type: String, required: true, index: true },
    itemName: { type: String, required: true },
    itemStatus: { type: String, enum: DOCUMENT_STATUSES, required: true, index: true },
    note: { type: String, default: "" },
    fileStored: { type: Boolean, default: false },
    sensitiveNumberStored: { type: Boolean, default: false },
    updatedByUserId: { type: String, required: true },
    actionId: { type: String, required: true },
  }, { timestamps: true, strict: true });
  documentSchema.index({ instituteId: 1, admissionId: 1, itemName: 1 }, { unique: true });

  const reportSchema = new mongoose.Schema({
    reportId: { type: String, required: true, unique: true, index: true },
    instituteId: { type: String, required: true, index: true },
    branchId: { type: String, default: "", index: true },
    filters: { type: mongoose.Schema.Types.Mixed, default: {} },
    summary: { type: mongoose.Schema.Types.Mixed, default: {} },
    generatedByUserId: { type: String, required: true },
    generatedAt: { type: Date, required: true },
    actionId: { type: String, required: true },
  }, { timestamps: true, strict: true });

  const auditSchema = new mongoose.Schema({
    instituteId: { type: String, required: true, index: true },
    actionId: { type: String, required: true, index: true },
    actorUserId: { type: String, required: true },
    actorRole: { type: String, required: true },
    actionType: { type: String, required: true, index: true },
    event: { type: String, required: true },
    result: { type: String, required: true },
    payloadFields: { type: [String], default: [] },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  }, { timestamps: true, strict: true });

  return {
    Action: mongoose.models.Part132CrmAction ||
      mongoose.model("Part132CrmAction", actionSchema),
    Lead: mongoose.models.Part132CrmLead ||
      mongoose.model("Part132CrmLead", leadSchema),
    Note: mongoose.models.Part132CrmLeadNote ||
      mongoose.model("Part132CrmLeadNote", noteSchema),
    FollowUp: mongoose.models.Part132CrmFollowUp ||
      mongoose.model("Part132CrmFollowUp", followUpSchema),
    Admission: mongoose.models.Part132Admission ||
      mongoose.model("Part132Admission", admissionSchema),
    Document: mongoose.models.Part132AdmissionDocumentChecklist ||
      mongoose.model("Part132AdmissionDocumentChecklist", documentSchema),
    Report: mongoose.models.Part132CrmReport ||
      mongoose.model("Part132CrmReport", reportSchema),
    Audit: mongoose.models.Part132CrmAudit ||
      mongoose.model("Part132CrmAudit", auditSchema),
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
      actionType: action.actionType,
      event,
      result,
      payloadFields: Object.keys(action.payload || {}).sort(),
      details,
    });
  } catch {
    // CRM result should not change when audit write fails.
  }
}

function confirmationText(action) {
  const label = String(action.actionType || "").toUpperCase().replace(/\./g, " ");
  return `CONFIRM ${label} ${String(action.actionId || "").slice(-8).toUpperCase()}`;
}
function recordObject(record) {
  if (!record) return null;
  const object = typeof record.toObject === "function" ? record.toObject() : { ...record };
  delete object.__v;
  return object;
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
function actionDefinition(actionType) {
  return ACTION_DEFINITIONS[actionType] || null;
}
function normalizePayload(actionType, raw = {}) {
  const payload = {};
  for (const field of [
    "leadId", "branchId", "interestedCourseId", "interestedClassId",
    "counsellorIdentityId", "assignedCounsellorId", "followUpId",
    "admissionId", "courseId", "classId", "existingStudentId",
  ]) {
    if (raw[field] !== undefined) payload[field] = cleanId(raw[field]);
  }
  const textFields = {
    studentName: 180,
    guardianName: 180,
    source: 100,
    note: 4000,
    reason: 3000,
    visibility: 30,
    purpose: 1000,
    outcome: 3000,
    admissionNumber: 100,
    itemName: 180,
  };
  for (const [field, max] of Object.entries(textFields)) {
    if (raw[field] !== undefined) payload[field] = cleanLong(raw[field], max);
  }
  if (raw.phone !== undefined) payload.phone = cleanPhone(raw.phone);
  if (raw.email !== undefined) payload.email = cleanEmail(raw.email);
  if (raw.priority !== undefined) payload.priority = normalizeChoice(raw.priority, PRIORITIES);
  if (raw.stage !== undefined) payload.stage = normalizeChoice(raw.stage, LEAD_STAGES);
  if (raw.status !== undefined) payload.status = normalizeChoice(raw.status, ADMISSION_STATUSES);
  if (raw.itemStatus !== undefined) payload.itemStatus = normalizeChoice(raw.itemStatus, DOCUMENT_STATUSES);
  if (raw.consentToContact !== undefined) payload.consentToContact = cleanBoolean(raw.consentToContact);
  if (raw.doNotContact !== undefined) payload.doNotContact = cleanBoolean(raw.doNotContact);
  for (const field of ["scheduledAt", "nextFollowUpAt", "admissionDate", "fromDate", "toDate"]) {
    if (raw[field] !== undefined) payload[field] = cleanDate(raw[field]);
  }
  return payload;
}
function validateBasic(actionType, payload) {
  const definition = actionDefinition(actionType);
  if (!definition) {
    throw Object.assign(new Error("Unknown Part 132 CRM action."), {
      code: "UNKNOWN_CRM_ACTION",
      httpStatus: 404,
    });
  }
  const missing = definition.requiredFields.filter(field => {
    const value = payload[field];
    return value === undefined || value === null || value === "";
  });
  if (missing.length) {
    throw Object.assign(new Error(`Required fields missing: ${missing.join(", ")}`), {
      code: "CRM_FIELDS_REQUIRED",
      httpStatus: 400,
      missingFields: missing,
    });
  }
  if (actionType === "crm.lead.create" && !payload.phone && !payload.email) {
    throw Object.assign(new Error("Lead requires a valid phone or email contact."), {
      code: "LEAD_CONTACT_REQUIRED",
      httpStatus: 400,
    });
  }
  if (rawSensitive(payload)) {
    throw Object.assign(new Error("Aadhaar, PAN, password, banking or other secret data is blocked."), {
      code: "SENSITIVE_CRM_DATA_BLOCKED",
      httpStatus: 400,
    });
  }
  if (payload.priority !== undefined && !payload.priority) {
    throw Object.assign(new Error("priority must be low, normal, high or urgent."), {
      code: "INVALID_PRIORITY",
      httpStatus: 400,
    });
  }
  if (payload.stage !== undefined && !payload.stage) {
    throw Object.assign(new Error(`stage must be one of: ${LEAD_STAGES.join(", ")}`), {
      code: "INVALID_LEAD_STAGE",
      httpStatus: 400,
    });
  }
  if (payload.status !== undefined && !payload.status) {
    throw Object.assign(new Error(`admission status must be one of: ${ADMISSION_STATUSES.join(", ")}`), {
      code: "INVALID_ADMISSION_STATUS",
      httpStatus: 400,
    });
  }
  if (payload.itemStatus !== undefined && !payload.itemStatus) {
    throw Object.assign(new Error(`itemStatus must be one of: ${DOCUMENT_STATUSES.join(", ")}`), {
      code: "INVALID_DOCUMENT_STATUS",
      httpStatus: 400,
    });
  }
  return definition;
}
function rawSensitive(payload) {
  return Object.values(payload || {}).some(value => typeof value === "string" && SENSITIVE_PATTERN.test(value));
}

async function loadScope(context) {
  if (context.role === "institute_owner") {
    return { available: true, instituteWide: true, branchIds: [] };
  }
  const Scope = mongoose.models.Part124RoleScopeAssignment;
  if (!Scope || !dbReady()) {
    return { available: false, instituteWide: false, branchIds: [] };
  }
  const assignment = await Scope.findOne({
    instituteId: context.instituteId,
    identityId: context.identityId,
    role: context.role,
    status: "active",
  }).lean();
  return {
    available: Boolean(assignment),
    instituteWide: Boolean(assignment?.instituteWide),
    branchIds: Array.isArray(assignment?.branchIds)
      ? assignment.branchIds.map(cleanId).filter(Boolean)
      : [],
  };
}
function part128Models() {
  const models = {
    Branch: mongoose.models.Part128Branch,
    Course: mongoose.models.Part128Course,
    ClassBatch: mongoose.models.Part128ClassBatch,
    Student: mongoose.models.Part128StudentProfile,
  };
  if (!models.Branch || !models.Course || !models.ClassBatch || !models.Student) {
    throw Object.assign(new Error("Part 128 master-data models unavailable."), {
      code: "PART128_MODELS_MISSING",
      httpStatus: 503,
    });
  }
  return models;
}
async function requireBranch(context, branchId) {
  const { Branch } = part128Models();
  const branch = await Branch.findOne({
    instituteId: context.instituteId,
    branchId,
    status: { $ne: "disabled" },
  });
  if (!branch) {
    throw Object.assign(new Error("Branch not found inside this institute."), {
      code: "BRANCH_NOT_FOUND",
      httpStatus: 404,
    });
  }
  return branch;
}
async function requireCourse(context, courseId) {
  const { Course } = part128Models();
  const course = await Course.findOne({
    instituteId: context.instituteId,
    courseId,
    status: { $ne: "disabled" },
  });
  if (!course) {
    throw Object.assign(new Error("Course not found inside this institute."), {
      code: "COURSE_NOT_FOUND",
      httpStatus: 404,
    });
  }
  return course;
}
async function requireClass(context, classId) {
  const { ClassBatch } = part128Models();
  const row = await ClassBatch.findOne({
    instituteId: context.instituteId,
    classId,
    status: { $ne: "disabled" },
  });
  if (!row) {
    throw Object.assign(new Error("Class/Batch not found inside this institute."), {
      code: "CLASS_NOT_FOUND",
      httpStatus: 404,
    });
  }
  return row;
}
async function requireStudent(context, studentId) {
  const { Student } = part128Models();
  const student = await Student.findOne({
    instituteId: context.instituteId,
    studentId,
    status: { $ne: "disabled" },
  });
  if (!student) {
    throw Object.assign(new Error("Existing Student not found inside this institute."), {
      code: "STUDENT_NOT_FOUND",
      httpStatus: 404,
    });
  }
  return student;
}
async function requireCounsellor(context, counsellorIdentityId, branchId) {
  const Identity = mongoose.models.Part120UnifiedIdentity;
  if (!Identity || !mongoose.isValidObjectId(counsellorIdentityId)) {
    throw Object.assign(new Error("Valid Part 120 Counsellor identity required."), {
      code: "COUNSELLOR_IDENTITY_INVALID",
      httpStatus: 400,
    });
  }
  const identity = await Identity.findOne({
    _id: counsellorIdentityId,
    instituteId: context.instituteId,
    role: "counsellor",
    status: "active",
  });
  if (!identity) {
    throw Object.assign(new Error("Active Counsellor account not found."), {
      code: "COUNSELLOR_NOT_FOUND",
      httpStatus: 404,
    });
  }
  const Scope = mongoose.models.Part124RoleScopeAssignment;
  if (!Scope) {
    throw Object.assign(new Error("Part 124 role-scope model unavailable."), {
      code: "PART124_SCOPE_MODEL_MISSING",
      httpStatus: 503,
    });
  }
  const scope = await Scope.findOne({
    instituteId: context.instituteId,
    identityId: String(identity._id),
    role: "counsellor",
    status: "active",
  }).lean();
  const allowed = scope && (scope.instituteWide || (scope.branchIds || []).includes(branchId));
  if (!allowed) {
    throw Object.assign(new Error("Counsellor is not assigned to the Lead Branch."), {
      code: "COUNSELLOR_BRANCH_SCOPE_MISMATCH",
      httpStatus: 403,
    });
  }
  return identity;
}
function enforceBranchScope(context, scope, branchId) {
  if (context.role === "institute_owner") return;
  if (!scope.available) {
    throw Object.assign(new Error("Owner-assigned Part 124 CRM scope required."), {
      code: "ROLE_SCOPE_REQUIRED",
      httpStatus: 403,
    });
  }
  if (scope.instituteWide) return;
  if (!branchId || !scope.branchIds.includes(branchId)) {
    throw Object.assign(new Error("CRM action is outside assigned Branch scope."), {
      code: "BRANCH_SCOPE_MISMATCH",
      httpStatus: 403,
    });
  }
}
function enforceCounsellorLead(context, lead) {
  if (context.role !== "counsellor") return;
  if (!lead.assignedCounsellorId || ![context.identityId, context.userId].includes(lead.assignedCounsellorId)) {
    throw Object.assign(new Error("Counsellor can modify only Leads assigned to their account."), {
      code: "COUNSELLOR_LEAD_ASSIGNMENT_REQUIRED",
      httpStatus: 403,
    });
  }
}

async function validateReferences(models, context, actionType, payload) {
  const scope = await loadScope(context);
  let lead = null;
  let followUp = null;
  let admission = null;
  let branchId = payload.branchId || "";

  if (payload.leadId) {
    lead = await models.Lead.findOne({
      instituteId: context.instituteId,
      leadId: payload.leadId,
    });
    if (!lead) {
      throw Object.assign(new Error("CRM Lead not found."), {
        code: "LEAD_NOT_FOUND",
        httpStatus: 404,
      });
    }
    branchId = lead.branchId;
    enforceCounsellorLead(context, lead);
  }
  if (payload.followUpId) {
    followUp = await models.FollowUp.findOne({
      instituteId: context.instituteId,
      followUpId: payload.followUpId,
    });
    if (!followUp) {
      throw Object.assign(new Error("CRM Follow-up not found."), {
        code: "FOLLOWUP_NOT_FOUND",
        httpStatus: 404,
      });
    }
    branchId = followUp.branchId;
    if (
      context.role === "counsellor" &&
      ![context.identityId, context.userId].includes(followUp.assignedCounsellorId)
    ) {
      throw Object.assign(new Error("Counsellor can update only their own Follow-ups."), {
        code: "COUNSELLOR_FOLLOWUP_SCOPE_MISMATCH",
        httpStatus: 403,
      });
    }
  }
  if (payload.admissionId) {
    admission = await models.Admission.findOne({
      instituteId: context.instituteId,
      admissionId: payload.admissionId,
    });
    if (!admission) {
      throw Object.assign(new Error("Admission record not found."), {
        code: "ADMISSION_NOT_FOUND",
        httpStatus: 404,
      });
    }
    branchId = admission.branchId;
    if (context.role === "counsellor") {
      const admissionLead = await models.Lead.findOne({
        instituteId: context.instituteId,
        leadId: admission.leadId,
      });
      enforceCounsellorLead(context, admissionLead);
    }
  }

  if (actionType === "crm.lead.create") {
    await requireBranch(context, payload.branchId);
    if (payload.interestedCourseId) await requireCourse(context, payload.interestedCourseId);
    if (payload.interestedClassId) {
      const classBatch = await requireClass(context, payload.interestedClassId);
      if (classBatch.branchId !== payload.branchId) {
        throw Object.assign(new Error("Interested Class does not belong to selected Branch."), {
          code: "CLASS_BRANCH_MISMATCH",
          httpStatus: 400,
        });
      }
    }
  }
  if (["crm.lead.update"].includes(actionType)) {
    if (payload.interestedCourseId) await requireCourse(context, payload.interestedCourseId);
    if (payload.interestedClassId) {
      const classBatch = await requireClass(context, payload.interestedClassId);
      if (classBatch.branchId !== branchId) {
        throw Object.assign(new Error("Interested Class does not belong to Lead Branch."), {
          code: "CLASS_BRANCH_MISMATCH",
          httpStatus: 400,
        });
      }
    }
  }
  if (actionType === "crm.lead.assign_counsellor") {
    await requireCounsellor(context, payload.counsellorIdentityId, branchId);
  }
  if (actionType === "crm.followup.create") {
    const assigned = payload.assignedCounsellorId || lead.assignedCounsellorId ||
      (context.role === "counsellor" ? context.identityId : "");
    if (!assigned) {
      throw Object.assign(new Error("Assign a valid Counsellor before creating Follow-up."), {
        code: "FOLLOWUP_COUNSELLOR_REQUIRED",
        httpStatus: 400,
      });
    }
    await requireCounsellor(context, assigned, branchId);
  }
  if (["crm.admission.convert", "crm.admission.update"].includes(actionType)) {
    if (payload.courseId) await requireCourse(context, payload.courseId);
    if (payload.classId) {
      const classBatch = await requireClass(context, payload.classId);
      if (classBatch.branchId !== branchId) {
        throw Object.assign(new Error("Admission Class does not belong to Lead Branch."), {
          code: "ADMISSION_CLASS_BRANCH_MISMATCH",
          httpStatus: 400,
        });
      }
      if (payload.courseId && classBatch.courseId !== payload.courseId) {
        throw Object.assign(new Error("Admission Class does not belong to selected Course."), {
          code: "ADMISSION_CLASS_COURSE_MISMATCH",
          httpStatus: 400,
        });
      }
    }
    if (payload.existingStudentId) {
      const student = await requireStudent(context, payload.existingStudentId);
      if (student.branchId !== branchId) {
        throw Object.assign(new Error("Existing Student belongs to another Branch."), {
          code: "ADMISSION_STUDENT_BRANCH_MISMATCH",
          httpStatus: 400,
        });
      }
    }
  }

  enforceBranchScope(context, scope, branchId);
  return { scope, lead, followUp, admission, branchId };
}
async function validateAction(models, context, actionType, rawPayload) {
  const definition = actionDefinition(actionType);
  if (!definition) {
    throw Object.assign(new Error("Unknown Part 132 CRM action."), {
      code: "UNKNOWN_CRM_ACTION",
      httpStatus: 404,
    });
  }
  if (!definition.roles.includes(context.role)) {
    throw Object.assign(new Error(`${context.role} cannot use ${actionType}.`), {
      code: "CRM_ACTION_ROLE_DENIED",
      httpStatus: 403,
    });
  }
  if (context.role === "staff" && actionType !== "crm.lead.create") {
    throw Object.assign(new Error("Staff role is limited to new Enquiry/Lead intake."), {
      code: "STAFF_CRM_LIMIT",
      httpStatus: 403,
    });
  }
  const payload = normalizePayload(actionType, rawPayload);
  validateBasic(actionType, payload);
  const references = await validateReferences(models, context, actionType, payload);
  return { definition, payload, references };
}
function actionFingerprint(context, actionType, payload) {
  return sha256(JSON.stringify(stableObject({
    instituteId: context.instituteId,
    actorUserId: context.userId,
    actionType,
    payload,
  })));
}
async function createPreview(models, context, actionType, rawPayload) {
  if (!dbReady()) {
    throw Object.assign(new Error("MongoDB connection required."), {
      code: "DATABASE_REQUIRED",
      httpStatus: 503,
    });
  }
  const { definition, payload } = await validateAction(models, context, actionType, rawPayload);
  const fingerprint = actionFingerprint(context, actionType, payload);
  const now = new Date();
  const reusable = await models.Action.findOne({
    instituteId: context.instituteId,
    actorUserId: context.userId,
    fingerprint,
    status: "preview_ready",
    previewExpiresAt: { $gt: now },
  }).sort({ createdAt: -1 });
  if (reusable) return { action: reusable, reusedPreview: true };

  const recent = await models.Action.findOne({
    instituteId: context.instituteId,
    actorUserId: context.userId,
    fingerprint,
    status: "executed_native",
    executedAt: { $gt: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
  }).sort({ executedAt: -1 });
  if (recent) {
    throw Object.assign(new Error("Same CRM action was executed recently. Duplicate blocked."), {
      code: "DUPLICATE_CRM_ACTION",
      httpStatus: 409,
      existingAction: publicAction(recent),
    });
  }

  const actionId = createId("crm");
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
    fingerprint,
    confirmationDigest: sha256(confirmationText({ actionId, actionType })),
    previewExpiresAt: new Date(Date.now() + PREVIEW_TTL_MS),
  });
  await writeAudit(models, context, action, "preview_created", "success");
  return { action, reusedPreview: false };
}
function registerCreateUndo(undo, Model, record) {
  undo.push(async () => Model.deleteOne({ _id: record._id }));
}
function registerUpdateUndo(undo, record) {
  const before = record.toObject();
  undo.push(async () => {
    record.set(before);
    await record.save();
  });
}
async function pipelineSummary(models, context, branchId = "", fromDate = "", toDate = "") {
  const query = { instituteId: context.instituteId };
  if (branchId) query.branchId = branchId;
  if (fromDate || toDate) {
    query.createdAt = {};
    if (fromDate) query.createdAt.$gte = new Date(fromDate);
    if (toDate) query.createdAt.$lte = new Date(toDate);
  }
  if (context.role === "counsellor") {
    query.assignedCounsellorId = { $in: [context.identityId, context.userId] };
  }
  const [leads, admissions, followUps] = await Promise.all([
    models.Lead.find(query).limit(MAX_RECORDS).lean(),
    models.Admission.find({
      instituteId: context.instituteId,
      ...(branchId ? { branchId } : {}),
    }).limit(MAX_RECORDS).lean(),
    models.FollowUp.find({
      instituteId: context.instituteId,
      ...(branchId ? { branchId } : {}),
      ...(context.role === "counsellor"
        ? { assignedCounsellorId: { $in: [context.identityId, context.userId] } }
        : {}),
    }).limit(MAX_RECORDS).lean(),
  ]);
  const byStage = Object.fromEntries(LEAD_STAGES.map(stage => [
    stage,
    leads.filter(row => row.stage === stage).length,
  ]));
  return {
    totalLeads: leads.length,
    activeLeads: leads.filter(row => row.status === "active").length,
    assignedLeads: leads.filter(row => row.assignedCounsellorId).length,
    doNotContactCount: leads.filter(row => row.doNotContact).length,
    consentedContactCount: leads.filter(row => row.consentToContact && !row.doNotContact).length,
    pendingFollowUps: followUps.filter(row => row.status === "scheduled").length,
    completedFollowUps: followUps.filter(row => row.status === "completed").length,
    admissions: admissions.length,
    enrolledAdmissions: admissions.filter(row => row.status === "enrolled").length,
    conversionRatePercent: leads.length
      ? Number(((admissions.length / leads.length) * 100).toFixed(2))
      : 0,
    byStage,
    externalMessagesSent: 0,
  };
}
async function executeAction(models, context, action) {
  const payload = action.payload || {};
  const undo = [];
  let result = {};
  try {
    switch (action.actionType) {
      case "crm.lead.create": {
        const assignedCounsellorId = context.role === "counsellor" ? context.identityId : "";
        const row = await models.Lead.create({
          leadId: createId("lead"),
          instituteId: context.instituteId,
          branchId: payload.branchId,
          studentName: payload.studentName,
          guardianName: payload.guardianName || "",
          phone: payload.phone || "",
          email: payload.email || "",
          source: payload.source,
          interestedCourseId: payload.interestedCourseId || "",
          interestedClassId: payload.interestedClassId || "",
          stage: "new",
          priority: payload.priority || "normal",
          assignedCounsellorId,
          consentToContact: Boolean(payload.consentToContact),
          doNotContact: Boolean(payload.doNotContact),
          latestNote: payload.note || "",
          nextFollowUpAt: null,
          convertedAdmissionId: "",
          status: "active",
          createdByUserId: context.userId,
          updatedByUserId: context.userId,
          createdByActionId: action.actionId,
          updatedByActionId: action.actionId,
        });
        registerCreateUndo(undo, models.Lead, row);
        result = { entity: "lead", record: recordObject(row), externalMessageSent: false };
        break;
      }
      case "crm.lead.update": {
        const row = await models.Lead.findOne({
          instituteId: context.instituteId,
          leadId: payload.leadId,
        });
        registerUpdateUndo(undo, row);
        for (const field of [
          "studentName", "guardianName", "phone", "email", "source",
          "interestedCourseId", "interestedClassId", "priority",
          "consentToContact", "doNotContact",
        ]) {
          if (payload[field] !== undefined) row[field] = payload[field];
        }
        if (payload.note !== undefined) row.latestNote = payload.note;
        row.updatedByUserId = context.userId;
        row.updatedByActionId = action.actionId;
        await row.save();
        result = { entity: "lead", record: recordObject(row) };
        break;
      }
      case "crm.lead.assign_counsellor": {
        const row = await models.Lead.findOne({
          instituteId: context.instituteId,
          leadId: payload.leadId,
        });
        registerUpdateUndo(undo, row);
        row.assignedCounsellorId = payload.counsellorIdentityId;
        if (payload.note) row.latestNote = payload.note;
        row.updatedByUserId = context.userId;
        row.updatedByActionId = action.actionId;
        await row.save();
        result = { entity: "lead_assignment", record: recordObject(row) };
        break;
      }
      case "crm.lead.stage_update": {
        const row = await models.Lead.findOne({
          instituteId: context.instituteId,
          leadId: payload.leadId,
        });
        registerUpdateUndo(undo, row);
        row.stage = payload.stage;
        row.status = ["lost", "closed"].includes(payload.stage) ? "closed" : "active";
        if (payload.reason) row.latestNote = payload.reason;
        if (payload.nextFollowUpAt) row.nextFollowUpAt = payload.nextFollowUpAt;
        row.updatedByUserId = context.userId;
        row.updatedByActionId = action.actionId;
        await row.save();
        result = { entity: "lead_stage", record: recordObject(row) };
        break;
      }
      case "crm.lead.note_add": {
        const lead = await models.Lead.findOne({
          instituteId: context.instituteId,
          leadId: payload.leadId,
        });
        registerUpdateUndo(undo, lead);
        const row = await models.Note.create({
          noteId: createId("leadnote"),
          instituteId: context.instituteId,
          leadId: lead.leadId,
          branchId: lead.branchId,
          note: payload.note,
          visibility: payload.visibility === "owner_only" ? "owner_only" : "crm_team",
          createdByUserId: context.userId,
          actionId: action.actionId,
        });
        registerCreateUndo(undo, models.Note, row);
        lead.latestNote = payload.note;
        lead.updatedByUserId = context.userId;
        lead.updatedByActionId = action.actionId;
        await lead.save();
        result = { entity: "lead_note", record: recordObject(row) };
        break;
      }
      case "crm.followup.create": {
        const lead = await models.Lead.findOne({
          instituteId: context.instituteId,
          leadId: payload.leadId,
        });
        registerUpdateUndo(undo, lead);
        const assigned = payload.assignedCounsellorId || lead.assignedCounsellorId ||
          (context.role === "counsellor" ? context.identityId : "");
        const row = await models.FollowUp.create({
          followUpId: createId("followup"),
          instituteId: context.instituteId,
          leadId: lead.leadId,
          branchId: lead.branchId,
          assignedCounsellorId: assigned,
          scheduledAt: payload.scheduledAt,
          purpose: payload.purpose,
          note: payload.note || "",
          outcome: "",
          completedAt: null,
          status: "scheduled",
          externalMessageSent: false,
          createdByUserId: context.userId,
          updatedByUserId: context.userId,
          createdByActionId: action.actionId,
          updatedByActionId: action.actionId,
        });
        registerCreateUndo(undo, models.FollowUp, row);
        lead.nextFollowUpAt = payload.scheduledAt;
        lead.updatedByUserId = context.userId;
        lead.updatedByActionId = action.actionId;
        await lead.save();
        result = { entity: "follow_up", record: recordObject(row), externalMessageSent: false };
        break;
      }
      case "crm.followup.reschedule": {
        const row = await models.FollowUp.findOne({
          instituteId: context.instituteId,
          followUpId: payload.followUpId,
        });
        registerUpdateUndo(undo, row);
        row.scheduledAt = payload.scheduledAt;
        if (payload.purpose !== undefined) row.purpose = payload.purpose;
        if (payload.note !== undefined) row.note = payload.note;
        row.status = "scheduled";
        row.updatedByUserId = context.userId;
        row.updatedByActionId = action.actionId;
        await row.save();
        await models.Lead.updateOne(
          { instituteId: context.instituteId, leadId: row.leadId },
          {
            $set: {
              nextFollowUpAt: row.scheduledAt,
              updatedByUserId: context.userId,
              updatedByActionId: action.actionId,
            },
          }
        );
        result = { entity: "follow_up", record: recordObject(row) };
        break;
      }
      case "crm.followup.complete": {
        const row = await models.FollowUp.findOne({
          instituteId: context.instituteId,
          followUpId: payload.followUpId,
        });
        registerUpdateUndo(undo, row);
        row.outcome = payload.outcome;
        if (payload.note !== undefined) row.note = payload.note;
        row.status = "completed";
        row.completedAt = new Date();
        row.updatedByUserId = context.userId;
        row.updatedByActionId = action.actionId;
        await row.save();
        const lead = await models.Lead.findOne({
          instituteId: context.instituteId,
          leadId: row.leadId,
        });
        if (lead) {
          registerUpdateUndo(undo, lead);
          lead.latestNote = payload.note || payload.outcome;
          lead.nextFollowUpAt = payload.nextFollowUpAt || null;
          lead.updatedByUserId = context.userId;
          lead.updatedByActionId = action.actionId;
          await lead.save();
        }
        result = { entity: "follow_up_completion", record: recordObject(row) };
        break;
      }
      case "crm.admission.convert": {
        const lead = await models.Lead.findOne({
          instituteId: context.instituteId,
          leadId: payload.leadId,
        });
        if (["lost", "closed"].includes(lead.stage)) {
          throw Object.assign(new Error("Closed or lost Lead must be reopened before Admission conversion."), {
            code: "LEAD_NOT_CONVERTIBLE",
            httpStatus: 409,
          });
        }
        registerUpdateUndo(undo, lead);
        const row = await models.Admission.create({
          admissionId: createId("admission"),
          instituteId: context.instituteId,
          admissionNumber: payload.admissionNumber,
          leadId: lead.leadId,
          branchId: lead.branchId,
          courseId: payload.courseId,
          classId: payload.classId || "",
          existingStudentId: payload.existingStudentId || "",
          admissionDate: payload.admissionDate,
          status: payload.status || "application_started",
          note: payload.note || "",
          studentAccountCreated: Boolean(payload.existingStudentId),
          paymentCollected: false,
          createdByUserId: context.userId,
          updatedByUserId: context.userId,
          createdByActionId: action.actionId,
          updatedByActionId: action.actionId,
        });
        registerCreateUndo(undo, models.Admission, row);
        lead.stage = "admitted";
        lead.status = "closed";
        lead.convertedAdmissionId = row.admissionId;
        lead.updatedByUserId = context.userId;
        lead.updatedByActionId = action.actionId;
        await lead.save();
        result = {
          entity: "admission",
          record: recordObject(row),
          studentAccountCreated: Boolean(payload.existingStudentId),
          newStudentAccountCreated: false,
          paymentCollected: false,
        };
        break;
      }
      case "crm.admission.update": {
        const row = await models.Admission.findOne({
          instituteId: context.instituteId,
          admissionId: payload.admissionId,
        });
        registerUpdateUndo(undo, row);
        for (const field of ["courseId", "classId", "existingStudentId", "status", "note"]) {
          if (payload[field] !== undefined) row[field] = payload[field];
        }
        row.studentAccountCreated = Boolean(row.existingStudentId);
        row.updatedByUserId = context.userId;
        row.updatedByActionId = action.actionId;
        await row.save();
        result = {
          entity: "admission",
          record: recordObject(row),
          newStudentAccountCreated: false,
          paymentCollected: false,
        };
        break;
      }
      case "crm.document_checklist.update": {
        const admission = await models.Admission.findOne({
          instituteId: context.instituteId,
          admissionId: payload.admissionId,
        });
        const previous = await models.Document.findOne({
          instituteId: context.instituteId,
          admissionId: admission.admissionId,
          itemName: payload.itemName,
        }).lean();
        undo.push(async () => {
          if (previous) {
            await models.Document.replaceOne({ _id: previous._id }, previous, { upsert: true });
          } else {
            await models.Document.deleteOne({
              instituteId: context.instituteId,
              admissionId: admission.admissionId,
              itemName: payload.itemName,
            });
          }
        });
        const row = await models.Document.findOneAndUpdate(
          {
            instituteId: context.instituteId,
            admissionId: admission.admissionId,
            itemName: payload.itemName,
          },
          {
            $set: {
              leadId: admission.leadId,
              branchId: admission.branchId,
              itemStatus: payload.itemStatus,
              note: payload.note || "",
              fileStored: false,
              sensitiveNumberStored: false,
              updatedByUserId: context.userId,
              actionId: action.actionId,
            },
            $setOnInsert: {
              checklistItemId: createId("docitem"),
            },
          },
          { upsert: true, new: true, runValidators: true }
        );
        result = {
          entity: "document_checklist",
          record: recordObject(row),
          fileStored: false,
          sensitiveNumberStored: false,
        };
        break;
      }
      case "crm.summary.generate": {
        const summary = await pipelineSummary(
          models,
          context,
          payload.branchId || "",
          payload.fromDate || "",
          payload.toDate || ""
        );
        const row = await models.Report.create({
          reportId: createId("crmreport"),
          instituteId: context.instituteId,
          branchId: payload.branchId || "",
          filters: {
            fromDate: payload.fromDate || "",
            toDate: payload.toDate || "",
          },
          summary,
          generatedByUserId: context.userId,
          generatedAt: new Date(),
          actionId: action.actionId,
        });
        registerCreateUndo(undo, models.Report, row);
        result = { entity: "crm_summary", record: recordObject(row) };
        break;
      }
      default:
        throw Object.assign(new Error("No executor for this Part 132 action."), {
          code: "CRM_EXECUTOR_MISSING",
          httpStatus: 500,
        });
    }
    return result;
  } catch (error) {
    let rollbackApplied = false;
    for (const step of undo.reverse()) {
      try {
        await step();
        rollbackApplied = true;
      } catch {
        // Continue best-effort rollback.
      }
    }
    error.rollbackApplied = rollbackApplied;
    throw error;
  }
}
async function confirmAndExecute(models, context, actionId, exactConfirmation) {
  const action = await models.Action.findOne({
    actionId,
    instituteId: context.instituteId,
    actorUserId: context.userId,
  });
  if (!action) {
    throw Object.assign(new Error("CRM action not found for this user."), {
      code: "CRM_ACTION_NOT_FOUND",
      httpStatus: 404,
    });
  }
  if (action.status === "executed_native") return { action, idempotentReplay: true };
  if (action.status !== "preview_ready") {
    throw Object.assign(new Error(`Action cannot execute from status ${action.status}.`), {
      code: "CRM_ACTION_STATE_CONFLICT",
      httpStatus: 409,
    });
  }
  if (new Date(action.previewExpiresAt).getTime() <= Date.now()) {
    action.status = "expired";
    await action.save();
    throw Object.assign(new Error("CRM preview expired. Create a fresh preview."), {
      code: "CRM_PREVIEW_EXPIRED",
      httpStatus: 410,
    });
  }
  if (sha256(String(exactConfirmation ?? "").trim()) !== action.confirmationDigest) {
    throw Object.assign(new Error(`Exact confirmation required: ${confirmationText(action)}`), {
      code: "EXACT_CONFIRMATION_REQUIRED",
      httpStatus: 400,
    });
  }
  await validateAction(models, context, action.actionType, action.payload);
  const claimed = await models.Action.findOneAndUpdate(
    { _id: action._id, status: "preview_ready" },
    { status: "executing" },
    { new: true }
  );
  if (!claimed) {
    const current = await models.Action.findById(action._id);
    if (current?.status === "executed_native") return { action: current, idempotentReplay: true };
    throw Object.assign(new Error("Another request is executing this CRM action."), {
      code: "CRM_EXECUTION_IN_PROGRESS",
      httpStatus: 409,
    });
  }
  try {
    const result = await executeAction(models, context, claimed);
    claimed.status = "executed_native";
    claimed.executedAt = new Date();
    claimed.result = result;
    claimed.failureCode = "";
    claimed.failureMessage = "";
    claimed.rollbackApplied = false;
    await claimed.save();
    await writeAudit(models, context, claimed, "action_executed", "native_success", {
      entity: result.entity,
      externalMessageSent: false,
      paymentCollected: false,
    });
    return { action: claimed, idempotentReplay: false };
  } catch (error) {
    claimed.status = "failed";
    claimed.failureCode = cleanText(error.code || "CRM_EXECUTION_FAILED", 120);
    claimed.failureMessage = cleanText(error.message || "CRM action failed.", 500);
    claimed.rollbackApplied = Boolean(error.rollbackApplied);
    await claimed.save();
    await writeAudit(models, context, claimed, "action_executed", "failed", {
      failureCode: claimed.failureCode,
      rollbackApplied: claimed.rollbackApplied,
    });
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
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) value = value.slice(1, -1);
    result[match[1]] = value;
  }
  return result;
}
function inferActionType(command = "") {
  for (const [actionType, pattern] of ACTION_PATTERNS) {
    if (pattern.test(command)) return actionType;
  }
  return "";
}
function parseCommand(command = "") {
  const text = cleanLong(command, 3000);
  if (SENSITIVE_PATTERN.test(text)) {
    throw Object.assign(new Error("Aadhaar, PAN, password, OTP, bank ya secret data VANI command me mat likhiye."), {
      code: "SENSITIVE_COMMAND_BLOCKED",
      httpStatus: 400,
    });
  }
  if (EXTERNAL_SEND_PATTERN.test(text)) {
    throw Object.assign(new Error("Part 132 external WhatsApp/SMS/email delivery nahi karta. Part 133 required hai."), {
      code: "EXTERNAL_COMMUNICATION_NOT_READY",
      httpStatus: 400,
    });
  }
  if (DESTRUCTIVE_PATTERN.test(text)) {
    throw Object.assign(new Error("Part 132 destructive CRM commands support nahi karta."), {
      code: "DESTRUCTIVE_COMMAND_BLOCKED",
      httpStatus: 400,
    });
  }
  const actionType = inferActionType(text);
  if (!actionType) {
    throw Object.assign(new Error("CRM action samajh nahi aaya. Catalog example use karein."), {
      code: "CRM_COMMAND_NOT_RECOGNISED",
      httpStatus: 400,
    });
  }
  return { actionType, payload: extractKeyValues(text) };
}

async function scopedRecords(models, context) {
  const scope = await loadScope(context);
  if (context.role !== "institute_owner" && !scope.available) {
    throw Object.assign(new Error("Owner-assigned Part 124 CRM scope required."), {
      code: "ROLE_SCOPE_REQUIRED",
      httpStatus: 403,
    });
  }
  const leadFilter = { instituteId: context.instituteId };
  if (context.role !== "institute_owner" && !scope.instituteWide) {
    leadFilter.branchId = { $in: scope.branchIds };
  }
  if (context.role === "counsellor") {
    leadFilter.assignedCounsellorId = { $in: [context.identityId, context.userId] };
  }
  if (context.role === "staff") {
    leadFilter.createdByUserId = context.userId;
  }
  const leads = await models.Lead.find(leadFilter).sort({ updatedAt: -1 }).limit(MAX_RECORDS).lean();
  const leadIds = leads.map(row => row.leadId);
  const common = { instituteId: context.instituteId, leadId: { $in: leadIds } };
  const [notes, followUps, admissions, documents, reports] = await Promise.all([
    models.Note.find(common).sort({ createdAt: -1 }).limit(MAX_RECORDS).lean(),
    models.FollowUp.find(common).sort({ scheduledAt: -1 }).limit(MAX_RECORDS).lean(),
    models.Admission.find(common).sort({ createdAt: -1 }).limit(MAX_RECORDS).lean(),
    models.Document.find(common).sort({ updatedAt: -1 }).limit(MAX_RECORDS).lean(),
    context.role === "staff"
      ? []
      : models.Report.find({
          instituteId: context.instituteId,
          ...(context.role !== "institute_owner" && !scope.instituteWide
            ? { branchId: { $in: scope.branchIds } }
            : {}),
        }).sort({ createdAt: -1 }).limit(100).lean(),
  ]);
  return { leads, notes, followUps, admissions, documents, reports };
}

export function registerPart132VaniAdmissionsCrmOperations({ app } = {}) {
  if (!app || typeof app.get !== "function" || typeof app.post !== "function") {
    throw new Error("Part 132 registration failed: Express app required.");
  }
  if (app.locals.part132VaniCrmRegistered) return;
  app.locals.part132VaniCrmRegistered = true;
  const models = defineModels();

  app.get(["/crm-vani", "/admissions-vani", "/part132"], (req, res) => {
    res.sendFile(path.join(frontendDir, "naxora-crm-vani.html"));
  });
  app.get("/naxora-crm-vani.css", (req, res) => {
    res.type("text/css").sendFile(path.join(frontendDir, "naxora-crm-vani.css"));
  });
  app.get("/naxora-crm-vani.js", (req, res) => {
    res.type("application/javascript").sendFile(path.join(frontendDir, "naxora-crm-vani.js"));
  });
  app.get("/naxora-part132-global-vani-bridge.js", (req, res) => {
    res.type("application/javascript").sendFile(
      path.join(frontendDir, "naxora-part132-global-vani-bridge.js")
    );
  });

  app.get("/api/part132/status", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      name: PART_NAME,
      status: "vani_admissions_crm_operations_active",
      page: "/crm-vani",
      actionCount: Object.keys(ACTION_DEFINITIONS).length,
      leadIntake: true,
      leadUpdates: true,
      counsellorAssignment: true,
      stageManagement: true,
      internalNotes: true,
      followUps: true,
      admissionConversion: true,
      admissionUpdates: true,
      documentChecklist: true,
      pipelineSummary: true,
      roleAndBranchScope: true,
      assignedLeadIsolation: true,
      consentAndDoNotContactStored: true,
      externalCommunicationEnabled: false,
      studentAccountAutoCreationEnabled: false,
      paymentCollectionEnabled: false,
      documentFileUploadEnabled: false,
      sensitiveDocumentNumbersEnabled: false,
      allFeatureVaniComplete: false,
      targetFinalAcceptancePart: 136,
      nextPart: 133,
      nextPartName: "VANI Communication and Notifications",
    });
  });

  app.get("/api/part132/security-policy", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      instituteIsolation: true,
      part124BranchScopeEnforced: true,
      counsellorAssignedLeadIsolation: true,
      staffLeadIntakeOnly: true,
      part128BranchCourseClassValidation: true,
      part120CounsellorIdentityValidation: true,
      previewRequired: true,
      exactConfirmationRequired: true,
      duplicateProtectionMinutes: DUPLICATE_WINDOW_MS / 60000,
      partialFailureRollback: true,
      consentToContactTracked: true,
      doNotContactTracked: true,
      externalMessagesBlockedUntilPart133: true,
      aadhaarPanPassportNumbersBlocked: true,
      passwordsOtpBankingDataBlocked: true,
      destructiveCommandsBlocked: true,
      paymentCollectionBlocked: true,
    });
  });

  app.get("/api/part132/catalog", (req, res) => {
    const examples = {
      "crm.lead.create": 'lead create branchId=BRANCH_ID studentName="Riya Demo" guardianName="Demo Parent" phone=9876543210 source=walk_in consentToContact=true',
      "crm.lead.update": 'lead update leadId=LEAD_ID interestedCourseId=COURSE_ID priority=high',
      "crm.lead.assign_counsellor": 'lead assign counsellor leadId=LEAD_ID counsellorIdentityId=COUNSELLOR_ID',
      "crm.lead.stage_update": 'lead stage update leadId=LEAD_ID stage=qualified nextFollowUpAt=2026-08-05T10:00:00+05:30',
      "crm.lead.note_add": 'lead note add leadId=LEAD_ID note="Interested in weekday morning batch"',
      "crm.followup.create": 'followup create leadId=LEAD_ID scheduledAt=2026-08-05T10:00:00+05:30 purpose="Course counselling call"',
      "crm.followup.reschedule": 'followup reschedule followUpId=FOLLOWUP_ID scheduledAt=2026-08-06T11:00:00+05:30',
      "crm.followup.complete": 'followup complete followUpId=FOLLOWUP_ID outcome="Demo class booked"',
      "crm.admission.convert": 'lead convert admission leadId=LEAD_ID admissionNumber=ADM-2026-101 admissionDate=2026-08-10 courseId=COURSE_ID',
      "crm.admission.update": 'admission update admissionId=ADMISSION_ID status=documents_pending classId=CLASS_ID',
      "crm.document_checklist.update": 'document checklist update admissionId=ADMISSION_ID itemName="Previous marksheet" itemStatus=received',
      "crm.summary.generate": 'crm pipeline summary generate branchId=BRANCH_ID fromDate=2026-08-01 toDate=2026-08-31',
    };
    res.json({
      success: true,
      part: PART_NUMBER,
      actions: Object.entries(ACTION_DEFINITIONS).map(([actionType, definition]) => ({
        actionType,
        ...definition,
        example: examples[actionType],
      })),
    });
  });

  app.get("/api/part132/demo", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      flow: [
        "Authenticated CRM role gives a command",
        "Institute, role and Part 124 Branch scope are validated",
        "Part 128 Branch/Course/Class references are validated",
        "Counsellor assignment and assigned-Lead isolation are validated",
        "Preview and exact confirmation are generated",
        "Native Lead, Follow-up, Admission or checklist record is saved",
        "Audit and rollback state are stored",
      ],
      notSupported: [
        "WhatsApp/SMS/email delivery — Part 133",
        "Automatic Student account creation — use Part 128/129",
        "Payment collection or fee assignment — Part 131",
        "Document file upload or identity-number storage",
        "All-feature VANI completion — target Part 136 acceptance",
      ],
    });
  });

  app.post("/api/part132/actions/preview", authenticated, async (req, res) => {
    try {
      const result = await createPreview(
        models,
        req.part132Context,
        cleanText(req.body?.actionType, 120),
        req.body?.payload || {}
      );
      res.json({
        success: true,
        part: PART_NUMBER,
        action: publicAction(result.action),
        reusedPreview: result.reusedPreview,
        replyText: `${result.action.actionLabel} preview ready. Exact confirmation required hai.`,
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "CRM_PREVIEW_FAILED",
        message: error.message,
        missingFields: error.missingFields || [],
        existingAction: error.existingAction || null,
      });
    }
  });

  app.post("/api/part132/vani/command", authenticated, async (req, res) => {
    try {
      const command = cleanLong(req.body?.command, 3000);
      const parsed = parseCommand(command);
      const result = await createPreview(
        models,
        req.part132Context,
        parsed.actionType,
        parsed.payload
      );
      res.json({
        success: true,
        part: PART_NUMBER,
        command,
        interpretedActionType: parsed.actionType,
        interpretedPayload: result.action.payload,
        action: publicAction(result.action),
        reusedPreview: result.reusedPreview,
        replyText: `${result.action.actionLabel} ka preview ready hai. CRM VANI screen par review aur exact-confirm karein.`,
        openModuleKey: "crm-vani",
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "CRM_COMMAND_FAILED",
        message: error.message,
        missingFields: error.missingFields || [],
        openModuleKey: "crm-vani",
      });
    }
  });

  app.post("/api/part132/actions/:actionId/confirm", authenticated, async (req, res) => {
    try {
      const result = await confirmAndExecute(
        models,
        req.part132Context,
        cleanId(req.params.actionId),
        req.body?.confirmationText
      );
      res.json({
        success: true,
        part: PART_NUMBER,
        action: publicAction(result.action),
        idempotentReplay: result.idempotentReplay,
        externalMessageSent: false,
        paymentCollected: false,
        newStudentAccountCreated: false,
        replyText: result.idempotentReplay
          ? "Ye CRM action pehle hi safely execute ho chuka hai."
          : "CRM action MongoDB me successfully execute ho gaya. Koi external message ya payment execute nahi hua.",
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "CRM_EXECUTION_FAILED",
        message: error.message,
        action: error.action ? publicAction(error.action) : null,
        rollbackApplied: Boolean(error.rollbackApplied || error.action?.rollbackApplied),
      });
    }
  });

  app.post("/api/part132/actions/:actionId/cancel", authenticated, async (req, res) => {
    const action = await models.Action.findOne({
      actionId: cleanId(req.params.actionId),
      instituteId: req.part132Context.instituteId,
      actorUserId: req.part132Context.userId,
    });
    if (!action) {
      return res.status(404).json({
        success: false,
        part: PART_NUMBER,
        code: "CRM_ACTION_NOT_FOUND",
        message: "CRM action not found.",
      });
    }
    if (action.status === "preview_ready") {
      action.status = "cancelled";
      action.cancelledAt = new Date();
      await action.save();
      await writeAudit(models, req.part132Context, action, "action_cancelled", "success");
    }
    return res.json({ success: true, part: PART_NUMBER, action: publicAction(action) });
  });

  app.get("/api/part132/actions", authenticated, async (req, res) => {
    const actions = await models.Action.find({
      instituteId: req.part132Context.instituteId,
      ...(req.part132Context.role === "institute_owner"
        ? {}
        : { actorUserId: req.part132Context.userId }),
    }).sort({ createdAt: -1 }).limit(100);
    res.json({
      success: true,
      part: PART_NUMBER,
      actions: actions.map(publicAction),
    });
  });

  app.get("/api/part132/records", authenticated, async (req, res) => {
    try {
      const records = await scopedRecords(models, req.part132Context);
      res.json({ success: true, part: PART_NUMBER, records });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "CRM_RECORDS_FAILED",
        message: error.message,
      });
    }
  });

  app.get("/api/part132/pipeline-summary", authenticated, async (req, res) => {
    try {
      if (!FULL_CRM_ROLES.has(req.part132Context.role)) {
        throw Object.assign(new Error("Pipeline summary is unavailable for Staff intake role."), {
          code: "CRM_SUMMARY_ROLE_DENIED",
          httpStatus: 403,
        });
      }
      const branchId = cleanId(req.query?.branchId);
      const payload = {
        branchId,
        fromDate: cleanDate(req.query?.fromDate),
        toDate: cleanDate(req.query?.toDate),
      };
      await validateAction(models, req.part132Context, "crm.summary.generate", payload);
      const summary = await pipelineSummary(
        models,
        req.part132Context,
        branchId,
        payload.fromDate,
        payload.toDate
      );
      res.json({ success: true, part: PART_NUMBER, summary });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "CRM_SUMMARY_FAILED",
        message: error.message,
      });
    }
  });
}
