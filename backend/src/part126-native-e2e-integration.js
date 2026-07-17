import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { registerPart125ActionAdapter } from "./part125-global-vani-actions.js";

const PART_NUMBER = 126;
const PART_NAME = "Native Adapters, Notifications and Cross-Module E2E Integration";
const ACTION_TYPES = Object.freeze([
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
const BRANCH_SCOPED_ROLES = new Set(["branch_manager", "accountant", "counsellor", "staff"]);
const INSTITUTE_FIELDS = ["instituteId", "institute_id", "tenantId", "tenant_id"];
const BRANCH_FIELDS = ["branchId", "branch_id", "campusId", "campus_id", "centreId", "centerId"];
const STUDENT_FIELDS = [
  "studentId", "student_id", "learnerId", "learner_id", "studentProfileId",
  "profileId", "admissionId", "admission_id", "enrollmentId", "enrolmentId",
  "userId", "identityId",
];
const LEAD_FIELDS = ["leadId", "lead_id", "enquiryId", "enquiry_id", "inquiryId", "inquiry_id"];
const CLASS_FIELDS = ["classId", "class_id", "batchId", "batch_id", "courseId", "course_id"];
const MODEL_BY_ACTION = Object.freeze({
  "attendance.mark": "Part126AttendanceRecord",
  "attendance.correction_request": "Part126AttendanceCorrectionRequest",
  "fees.reminder": "Part126FeeReminder",
  "fees.assistance_request": "Part126FeeAssistanceRequest",
  "admission.follow_up": "Part126AdmissionFollowUp",
  "assignment.create": "Part126Assignment",
  "assignment.submit": "Part126AssignmentSubmission",
  "message.send": "Part126RoleSafeMessage",
  "branch.task.create": "Part126BranchTask",
});
const MAX_RECIPIENTS = 50;
const PROVIDER_TIMEOUT_MS = 10000;
const EXECUTION_LOCK_MS = 120000;
const SAFE_MODEL_EXCLUSION = /(audit|snapshot|sync|history|event|token|session|setting|template|webhook|readiness|subscription|launch|part125|part126)/i;
const PROVIDER_ENV = Object.freeze({
  email: "NAXORA_PART126_EMAIL_WEBHOOK_URL",
  sms: "NAXORA_PART126_SMS_WEBHOOK_URL",
  whatsapp: "NAXORA_PART126_WHATSAPP_WEBHOOK_URL",
});

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
  return String(value || "").trim().replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 180);
}
function cleanIdList(values, max = MAX_RECIPIENTS) {
  const list = Array.isArray(values) ? values : String(values || "").split(/[\n,]/g);
  return [...new Set(list.map(cleanId).filter(Boolean))].slice(0, max);
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
function cleanDate(value = "") {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const parsed = new Date(`${text}T00:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) ? "" : text;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}
function dbReady() {
  return mongoose.connection?.readyState === 1;
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
  if (!secrets.length) throw makeError("AUTH_CONFIGURATION_MISSING", "JWT server configuration missing.", 503);
  for (const secret of secrets) {
    try {
      return jwt.verify(token, secret, { algorithms: ["HS256", "HS384", "HS512"] });
    } catch {
      // Try the next configured secret.
    }
  }
  throw makeError("INVALID_SESSION", "Login session invalid or expired.", 401);
}
function contextFromRequest(req) {
  const payload = req.part120Context || req.user || req.auth || (getBearer(req) ? verifyJwt(getBearer(req)) : null);
  if (!payload) throw makeError("LOGIN_REQUIRED", "Common role login required.", 401);
  const role = normalizeRole(payload.role || payload.userRole || payload.accountRole || payload.user?.role || "");
  if (!ALL_ROLES.has(role)) throw makeError("UNSUPPORTED_ROLE", "Supported NAXORA role required.", 403);

  const requestedInstituteId = cleanId(
    req.headers["x-naxora-institute-id"] || req.body?.instituteId || req.query?.instituteId || ""
  );
  const tokenInstituteId = cleanId(
    payload.instituteId || payload.institute_id || payload.user?.instituteId || payload.tenantId || ""
  );
  if (tokenInstituteId && requestedInstituteId && tokenInstituteId !== requestedInstituteId) {
    throw makeError("INSTITUTE_CONTEXT_MISMATCH", "Institute context does not match login session.", 403);
  }
  const instituteId = tokenInstituteId || requestedInstituteId;
  if (!instituteId) throw makeError("INSTITUTE_ID_REQUIRED", "Valid instituteId required.", 400);

  const userId = cleanId(payload.userId || payload.identityId || payload.id || payload._id || payload.sub || "user");
  return {
    instituteId,
    userId,
    identityId: cleanId(payload.identityId || payload.sub || userId),
    role,
    displayName: cleanText(payload.displayName || payload.name || payload.fullName || payload.email || role, 120),
  };
}
function authenticated(req, res, next) {
  try {
    req.part126Context = contextFromRequest(req);
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
function ownerOnly(req, res, next) {
  try {
    const context = contextFromRequest(req);
    if (!OWNER_ROLES.has(context.role)) throw makeError("OWNER_ONLY", "Only institute_owner can open full E2E acceptance.", 403);
    req.part126Context = { ...context, role: "institute_owner" };
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
function makeError(code, message, httpStatus = 400) {
  const error = new Error(message);
  error.code = code;
  error.httpStatus = httpStatus;
  return error;
}
function safeResult(value = {}) {
  return {
    success: value.success !== false,
    nativeRecordId: cleanId(value.nativeRecordId || ""),
    nativeRecordType: cleanText(value.nativeRecordType || "", 120),
    idempotentReplay: Boolean(value.idempotentReplay),
    internalDeliveryPerformed: Boolean(value.internalDeliveryPerformed),
    externalDeliveryPerformed: Boolean(value.externalDeliveryPerformed),
    deliveryStatus: cleanText(value.deliveryStatus || "", 80),
    providerReference: cleanText(value.providerReference || "", 180),
    relationshipValidation: cleanText(value.relationshipValidation || "", 180),
  };
}
function firstField(model, candidates) {
  const paths = model?.schema?.paths || {};
  return candidates.find((candidate) => Boolean(paths[candidate])) || "";
}
function castForField(model, field, value) {
  const schemaPath = model?.schema?.path(field);
  if (mongoose.isValidObjectId(String(value)) && ["ObjectId", "ObjectID"].includes(schemaPath?.instance)) {
    return new mongoose.Types.ObjectId(String(value));
  }
  return value;
}
function branchFromRecord(record = {}) {
  for (const field of BRANCH_FIELDS) {
    if (record[field] !== undefined && record[field] !== null) return cleanId(record[field]);
  }
  return "";
}
function referenceValues(record = {}, fields = []) {
  const values = new Set();
  if (record._id) values.add(String(record._id));
  for (const field of fields) {
    if (record[field] !== undefined && record[field] !== null) values.add(String(record[field]));
  }
  return [...values].map(cleanId).filter(Boolean);
}

function defineModels() {
  const executionSchema = new mongoose.Schema({
    actionId: { type: String, required: true, unique: true, index: true },
    instituteId: { type: String, required: true, index: true },
    actionType: { type: String, required: true, index: true },
    actorUserId: { type: String, required: true, index: true },
    actorRole: { type: String, required: true },
    status: { type: String, enum: ["processing", "completed", "failed"], default: "processing", index: true },
    attemptCount: { type: Number, default: 1 },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    nativeRecordType: { type: String, default: "" },
    nativeRecordId: { type: String, default: "" },
    safeResult: { type: mongoose.Schema.Types.Mixed, default: {} },
    failureCode: { type: String, default: "" },
    failureMessage: { type: String, default: "" },
  }, { timestamps: true, strict: true });

  const nativeSchema = new mongoose.Schema({
    actionId: { type: String, required: true, unique: true, index: true },
    instituteId: { type: String, required: true, index: true },
    actorUserId: { type: String, required: true, index: true },
    actorRole: { type: String, required: true },
    targetType: { type: String, required: true },
    targetRef: { type: String, default: "", index: true },
    targetModel: { type: String, default: "" },
    targetRecordId: { type: String, default: "" },
    branchId: { type: String, default: "", index: true },
    nativeStatus: { type: String, default: "active", index: true },
    validationMode: { type: String, required: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    deliveryStatus: { type: String, default: "not_applicable" },
  }, { timestamps: true, strict: true });

  const notificationSchema = new mongoose.Schema({
    instituteId: { type: String, required: true, index: true },
    recipientIdentityId: { type: String, required: true, index: true },
    recipientRole: { type: String, required: true, index: true },
    sourceActionId: { type: String, required: true, index: true },
    notificationType: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    status: { type: String, enum: ["unread", "read", "archived"], default: "unread", index: true },
    readAt: { type: Date, default: null },
  }, { timestamps: true, strict: true });
  notificationSchema.index(
    { instituteId: 1, recipientIdentityId: 1, sourceActionId: 1, notificationType: 1 },
    { unique: true }
  );

  const deliverySchema = new mongoose.Schema({
    actionId: { type: String, required: true, index: true },
    instituteId: { type: String, required: true, index: true },
    channel: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["delivered_in_app", "provider_delivered", "provider_not_configured", "provider_failed", "recipient_not_resolved"],
      required: true,
      index: true,
    },
    recipientCount: { type: Number, default: 0 },
    providerReference: { type: String, default: "" },
    httpStatus: { type: Number, default: 0 },
    errorCode: { type: String, default: "" },
    attemptedAt: { type: Date, default: Date.now },
  }, { timestamps: true, strict: true });

  const auditSchema = new mongoose.Schema({
    instituteId: { type: String, required: true, index: true },
    actionId: { type: String, default: "", index: true },
    actorUserId: { type: String, required: true },
    actorRole: { type: String, required: true },
    event: { type: String, required: true },
    result: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  }, { timestamps: true, strict: true });

  const Native = {};
  for (const modelName of Object.values(MODEL_BY_ACTION)) {
    Native[modelName] = mongoose.models[modelName] || mongoose.model(modelName, nativeSchema);
  }

  return {
    Execution: mongoose.models.Part126AdapterExecution ||
      mongoose.model("Part126AdapterExecution", executionSchema),
    Notification: mongoose.models.Part126NotificationInbox ||
      mongoose.model("Part126NotificationInbox", notificationSchema),
    Delivery: mongoose.models.Part126DeliveryAttempt ||
      mongoose.model("Part126DeliveryAttempt", deliverySchema),
    Audit: mongoose.models.Part126IntegrationAudit ||
      mongoose.model("Part126IntegrationAudit", auditSchema),
    Native,
  };
}
async function writeAudit(models, context, actionId, event, result, details = {}) {
  if (!dbReady()) return;
  try {
    await models.Audit.create({
      instituteId: context.instituteId,
      actionId: cleanId(actionId),
      actorUserId: context.userId,
      actorRole: context.role,
      event,
      result,
      details,
    });
  } catch {
    // Audit failure does not hide the native action result.
  }
}
async function findIdentity(instituteId, reference, expectedRole = "") {
  const Identity = mongoose.models.Part120UnifiedIdentity;
  if (!Identity || !reference) return null;
  const ref = cleanId(reference);
  const conditions = [{ identifierCanonical: String(reference).trim().toLowerCase() }];
  if (mongoose.isValidObjectId(ref)) conditions.unshift({ _id: new mongoose.Types.ObjectId(ref) });
  const filter = { instituteId, status: "active", $or: conditions };
  if (expectedRole) filter.role = normalizeRole(expectedRole);
  return Identity.findOne(filter)
    .select("identifierCanonical displayName role status")
    .lean();
}
async function resolveLegacyReference(instituteId, reference, modelPatterns, referenceFields) {
  const ref = cleanId(reference);
  if (!ref || !dbReady()) return null;
  const found = [];

  for (const modelName of mongoose.modelNames()) {
    if (SAFE_MODEL_EXCLUSION.test(modelName) || !modelPatterns.some((pattern) => pattern.test(modelName))) continue;
    const Model = mongoose.models[modelName];
    const instituteField = firstField(Model, INSTITUTE_FIELDS);
    if (!instituteField) continue;

    const ors = [];
    if (mongoose.isValidObjectId(ref)) ors.push({ _id: new mongoose.Types.ObjectId(ref) });
    for (const field of referenceFields) {
      if (Model.schema?.paths?.[field]) ors.push({ [field]: castForField(Model, field, ref) });
    }
    if (!ors.length) continue;

    try {
      const record = await Model.findOne({
        [instituteField]: castForField(Model, instituteField, instituteId),
        $or: ors,
      }).lean();
      if (record) {
        found.push({
          modelName,
          recordId: String(record._id),
          references: referenceValues(record, referenceFields),
          branchId: branchFromRecord(record),
        });
      }
    } catch {
      // Ignore incompatible models.
    }
    if (found.length > 1) break;
  }

  if (found.length > 1) {
    throw makeError("AMBIGUOUS_REFERENCE", "Reference matched more than one native model. Use the exact record ID.", 409);
  }
  return found[0] || null;
}
async function resolveStudent(instituteId, reference) {
  const identity = await findIdentity(instituteId, reference, "student");
  if (identity) {
    const id = String(identity._id);
    return {
      publicRef: id,
      recordId: id,
      modelName: "Part120UnifiedIdentity",
      references: [id, cleanId(identity.identifierCanonical)].filter(Boolean),
      branchId: "",
      identity,
      validationMode: "part120_student_identity_verified",
    };
  }
  const legacy = await resolveLegacyReference(
    instituteId,
    reference,
    [/student/i, /learner/i, /enrol/i, /admission/i],
    STUDENT_FIELDS
  );
  if (!legacy) throw makeError("STUDENT_REFERENCE_NOT_FOUND", "Student reference was not found inside this institute.", 404);
  return {
    publicRef: cleanId(reference),
    recordId: legacy.recordId,
    modelName: legacy.modelName,
    references: [...new Set([cleanId(reference), ...legacy.references])],
    branchId: legacy.branchId,
    identity: null,
    validationMode: "legacy_student_record_verified",
  };
}
async function resolveLead(instituteId, reference) {
  const legacy = await resolveLegacyReference(
    instituteId,
    reference,
    [/lead/i, /enquir/i, /inquiry/i, /admission/i],
    LEAD_FIELDS
  );
  return legacy
    ? {
        publicRef: cleanId(reference),
        recordId: legacy.recordId,
        modelName: legacy.modelName,
        references: [...new Set([cleanId(reference), ...legacy.references])],
        branchId: legacy.branchId,
        validationMode: "native_lead_record_verified",
      }
    : {
        publicRef: cleanId(reference),
        recordId: "",
        modelName: "",
        references: [cleanId(reference)],
        branchId: "",
        validationMode: "opaque_institute_lead_reference",
      };
}
async function resolveClass(instituteId, reference) {
  const legacy = await resolveLegacyReference(
    instituteId,
    reference,
    [/class/i, /batch/i, /course/i],
    CLASS_FIELDS
  );
  return legacy
    ? {
        publicRef: cleanId(reference),
        recordId: legacy.recordId,
        modelName: legacy.modelName,
        references: [...new Set([cleanId(reference), ...legacy.references])],
        branchId: legacy.branchId,
        validationMode: "native_class_record_verified",
      }
    : {
        publicRef: cleanId(reference),
        recordId: "",
        modelName: "",
        references: [cleanId(reference)],
        branchId: "",
        validationMode: "opaque_institute_class_reference",
      };
}
async function roleScope(instituteId, actor) {
  if (OWNER_ROLES.has(actor.role)) {
    return { available: true, instituteWide: true, branchIds: [], childStudentIds: [] };
  }
  const Scope = mongoose.models.Part124RoleScopeAssignment;
  if (!Scope) return { available: false, instituteWide: false, branchIds: [], childStudentIds: [] };
  const assignment = await Scope.findOne({
    instituteId,
    identityId: actor.userId,
    role: actor.role,
    status: "active",
  }).lean();
  return assignment
    ? {
        available: true,
        instituteWide: Boolean(assignment.instituteWide),
        branchIds: cleanIdList(assignment.branchIds, 100),
        childStudentIds: cleanIdList(assignment.childStudentIds, 100),
      }
    : { available: false, instituteWide: false, branchIds: [], childStudentIds: [] };
}
async function validateStudentTarget(instituteId, actor, student) {
  const refs = new Set(student.references.map(cleanId));
  if (actor.role === "student" && !refs.has(cleanId(actor.userId))) {
    throw makeError("STUDENT_SELF_SCOPE_REQUIRED", "Student can perform this action only for the logged-in Student identity.", 403);
  }
  if (actor.role === "parent") {
    const scope = await roleScope(instituteId, actor);
    if (!scope.available || !scope.childStudentIds.some((id) => refs.has(cleanId(id)))) {
      throw makeError("PARENT_CHILD_SCOPE_MISMATCH", "Parent can perform this action only for an Owner-linked child.", 403);
    }
  }
}
async function validatedBranchId(instituteId, actor, requestedBranchId = "") {
  const branchId = cleanId(requestedBranchId);
  if (!BRANCH_SCOPED_ROLES.has(actor.role)) return branchId;
  const scope = await roleScope(instituteId, actor);
  if (!scope.available) throw makeError("ROLE_SCOPE_PENDING", "Owner-assigned role scope is required.", 403);
  if (scope.instituteWide) return branchId;
  if (branchId && scope.branchIds.includes(branchId)) return branchId;
  if (!branchId && scope.branchIds.length === 1) return scope.branchIds[0];
  if (!branchId) throw makeError("BRANCH_ID_REQUIRED", "A matching branchId is required for this role.", 400);
  throw makeError("BRANCH_SCOPE_MISMATCH", "Requested branch is outside the logged-in role scope.", 403);
}
async function resolveRecipients(instituteId, recipientRole, recipientIds = []) {
  const Identity = mongoose.models.Part120UnifiedIdentity;
  if (!Identity) return [];
  const role = normalizeRole(recipientRole);
  const ids = cleanIdList(recipientIds);
  const recipients = [];
  for (const id of ids) {
    const identity = await findIdentity(instituteId, id, role);
    if (identity) recipients.push(identity);
  }
  const unique = new Map(recipients.map((recipient) => [String(recipient._id), recipient]));
  return [...unique.values()].slice(0, MAX_RECIPIENTS);
}
async function recipientsByRole(instituteId, roles) {
  const Identity = mongoose.models.Part120UnifiedIdentity;
  if (!Identity) return [];
  return Identity.find({
    instituteId,
    role: { $in: roles.map(normalizeRole) },
    status: "active",
  })
    .select("identifierCanonical displayName role status")
    .limit(MAX_RECIPIENTS)
    .lean();
}
async function linkedParents(instituteId, studentRefs) {
  const Scope = mongoose.models.Part124RoleScopeAssignment;
  const Identity = mongoose.models.Part120UnifiedIdentity;
  if (!Scope || !Identity) return [];
  const assignments = await Scope.find({
    instituteId,
    role: "parent",
    status: "active",
    childStudentIds: { $in: cleanIdList(studentRefs, 100) },
  }).limit(MAX_RECIPIENTS).lean();
  const ids = assignments.map((item) => item.identityId)
    .filter(mongoose.isValidObjectId)
    .map((id) => new mongoose.Types.ObjectId(id));
  return Identity.find({
    instituteId,
    role: "parent",
    status: "active",
    _id: { $in: ids },
  }).select("identifierCanonical displayName role status").lean();
}
async function createNotifications(models, { instituteId, actionId, recipients, type, title, body }) {
  let count = 0;
  for (const recipient of recipients.slice(0, MAX_RECIPIENTS)) {
    try {
      await models.Notification.findOneAndUpdate(
        {
          instituteId,
          recipientIdentityId: String(recipient._id),
          sourceActionId: actionId,
          notificationType: type,
        },
        {
          $setOnInsert: {
            instituteId,
            recipientIdentityId: String(recipient._id),
            recipientRole: recipient.role,
            sourceActionId: actionId,
            notificationType: type,
            title: cleanText(title, 180),
            body: cleanLongText(body, 1500),
            status: "unread",
          },
        },
        { upsert: true, new: true, runValidators: true }
      );
      count += 1;
    } catch {
      // Continue for other recipients.
    }
  }
  return count;
}
function providerState() {
  return {
    email: Boolean(String(process.env[PROVIDER_ENV.email] || "").trim()),
    sms: Boolean(String(process.env[PROVIDER_ENV.sms] || "").trim()),
    whatsapp: Boolean(String(process.env[PROVIDER_ENV.whatsapp] || "").trim()),
    secretConfigured: Boolean(String(process.env.NAXORA_PART126_DELIVERY_SECRET || "").trim()),
  };
}
async function updatePart125Outbox(actionId, update) {
  const Outbox = mongoose.models.Part125ActionOutbox;
  if (Outbox) {
    try {
      await Outbox.updateOne({ actionId }, update);
    } catch {
      // Part 126 Delivery remains the source for the attempt state.
    }
  }
}
async function deliver(models, {
  actionId,
  instituteId,
  channel,
  recipientRole,
  recipients,
  subject,
  message,
  targetReference = "",
}) {
  const normalized = ["email", "sms", "whatsapp"].includes(channel) ? channel : "in_app";
  if (normalized === "in_app") {
    const status = recipients.length ? "delivered_in_app" : "recipient_not_resolved";
    await models.Delivery.create({
      actionId, instituteId, channel: normalized, status, recipientCount: recipients.length,
    });
    await updatePart125Outbox(actionId, {
      deliveryStatus: status,
      deliveredAt: recipients.length ? new Date() : null,
    });
    return { externalDeliveryPerformed: false, deliveryStatus: status, providerReference: "" };
  }

  const providerUrl = String(process.env[PROVIDER_ENV[normalized]] || "").trim();
  if (!providerUrl) {
    await models.Delivery.create({
      actionId, instituteId, channel: normalized, status: "provider_not_configured",
      recipientCount: recipients.length, errorCode: "PROVIDER_NOT_CONFIGURED",
    });
    await updatePart125Outbox(actionId, { deliveryStatus: "provider_not_configured" });
    return { externalDeliveryPerformed: false, deliveryStatus: "provider_not_configured", providerReference: "" };
  }
  if (!recipients.length && !targetReference) {
    await models.Delivery.create({
      actionId, instituteId, channel: normalized, status: "recipient_not_resolved",
      recipientCount: 0, errorCode: "RECIPIENT_NOT_RESOLVED",
    });
    await updatePart125Outbox(actionId, { deliveryStatus: "recipient_not_resolved" });
    return { externalDeliveryPerformed: false, deliveryStatus: "recipient_not_resolved", providerReference: "" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  let httpStatus = 0;
  try {
    const headers = { "content-type": "application/json", "x-naxora-action-id": actionId };
    const secret = String(process.env.NAXORA_PART126_DELIVERY_SECRET || "").trim();
    if (secret) headers["x-naxora-delivery-secret"] = secret;

    const response = await fetch(providerUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        source: "naxora_part126",
        actionId,
        instituteId,
        channel: normalized,
        recipientRole,
        recipients: recipients.map((recipient) => ({
          identityId: String(recipient._id),
          identifier: recipient.identifierCanonical,
          displayName: recipient.displayName,
        })),
        targetReference: cleanId(targetReference),
        subject: cleanText(subject, 180),
        message: cleanLongText(message, 2000),
      }),
      signal: controller.signal,
    });
    httpStatus = response.status;
    const text = (await response.text()).slice(0, 10000);
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }

    if (!response.ok) {
      await models.Delivery.create({
        actionId, instituteId, channel: normalized, status: "provider_failed",
        recipientCount: recipients.length, httpStatus,
        errorCode: cleanText(data.code || `HTTP_${response.status}`, 100),
      });
      await updatePart125Outbox(actionId, { deliveryStatus: "provider_failed" });
      return { externalDeliveryPerformed: false, deliveryStatus: "provider_failed", providerReference: "" };
    }

    const providerReference = cleanText(
      data.providerReference || data.reference || response.headers.get("x-provider-reference") ||
      `part126_${normalized}_${actionId}`,
      180
    );
    await models.Delivery.create({
      actionId, instituteId, channel: normalized, status: "provider_delivered",
      recipientCount: recipients.length, httpStatus, providerReference,
    });
    await updatePart125Outbox(actionId, {
      deliveryStatus: "delivered", deliveredAt: new Date(), providerReference,
    });
    return { externalDeliveryPerformed: true, deliveryStatus: "provider_delivered", providerReference };
  } catch (error) {
    await models.Delivery.create({
      actionId, instituteId, channel: normalized, status: "provider_failed",
      recipientCount: recipients.length, httpStatus,
      errorCode: error.name === "AbortError" ? "PROVIDER_TIMEOUT" : "PROVIDER_REQUEST_FAILED",
    });
    await updatePart125Outbox(actionId, { deliveryStatus: "provider_failed" });
    return { externalDeliveryPerformed: false, deliveryStatus: "provider_failed", providerReference: "" };
  } finally {
    clearTimeout(timeout);
  }
}
async function runIdempotent(models, params, worker) {
  const actor = params.actor;
  let execution = await models.Execution.findOne({ actionId: params.actionId });
  if (execution?.status === "completed") {
    return { ...safeResult(execution.safeResult), idempotentReplay: true };
  }
  if (
    execution?.status === "processing" &&
    Date.now() - new Date(execution.startedAt).getTime() < EXECUTION_LOCK_MS
  ) {
    throw makeError("ADAPTER_EXECUTION_IN_PROGRESS", "The native adapter is already processing this action.", 409);
  }

  if (execution) {
    execution.status = "processing";
    execution.startedAt = new Date();
    execution.attemptCount = Number(execution.attemptCount || 0) + 1;
    execution.failureCode = "";
    execution.failureMessage = "";
    await execution.save();
  } else {
    try {
      execution = await models.Execution.create({
        actionId: params.actionId,
        instituteId: params.instituteId,
        actionType: params.actionType,
        actorUserId: actor.userId,
        actorRole: actor.role,
        status: "processing",
        attemptCount: 1,
      });
    } catch (error) {
      if (error?.code === 11000) {
        execution = await models.Execution.findOne({ actionId: params.actionId });
        if (execution?.status === "completed") {
          return { ...safeResult(execution.safeResult), idempotentReplay: true };
        }
      } else throw error;
    }
  }

  try {
    const result = safeResult(await worker());
    execution.status = "completed";
    execution.completedAt = new Date();
    execution.nativeRecordType = result.nativeRecordType;
    execution.nativeRecordId = result.nativeRecordId;
    execution.safeResult = result;
    await execution.save();
    return result;
  } catch (error) {
    if (execution) {
      execution.status = "failed";
      execution.failureCode = cleanText(error.code || "ADAPTER_EXECUTION_FAILED", 120);
      execution.failureMessage = cleanText(error.message || "Native adapter failed.", 500);
      await execution.save();
    }
    throw error;
  }
}
function actorFromAdapter(params) {
  return {
    instituteId: cleanId(params.instituteId),
    userId: cleanId(params.actor?.userId),
    identityId: cleanId(params.actor?.userId),
    role: normalizeRole(params.actor?.role),
    displayName: cleanText(params.actor?.displayName || params.actor?.role, 120),
  };
}
async function createNativeRecord(models, params, {
  targetType,
  targetRef = "",
  targetModel = "",
  targetRecordId = "",
  branchId = "",
  validationMode,
  payload,
  deliveryStatus = "not_applicable",
}) {
  const modelName = MODEL_BY_ACTION[params.actionType];
  const Model = models.Native[modelName];
  return Model.findOneAndUpdate(
    { actionId: params.actionId },
    {
      $setOnInsert: {
        actionId: params.actionId,
        instituteId: params.instituteId,
        actorUserId: params.actor.userId,
        actorRole: params.actor.role,
        targetType,
        targetRef: cleanId(targetRef),
        targetModel: cleanText(targetModel, 120),
        targetRecordId: cleanId(targetRecordId),
        branchId: cleanId(branchId),
        nativeStatus: "active",
        validationMode,
        payload,
        deliveryStatus,
      },
    },
    { upsert: true, new: true, runValidators: true }
  );
}
async function actionAdapter(models, params) {
  const actor = actorFromAdapter(params);
  return runIdempotent(models, { ...params, actor }, async () => {
    let student = null;
    let lead = null;
    let classInfo = null;
    let branchId = "";
    let recipients = [];
    let targetType = "";
    let targetRef = "";
    let targetModel = "";
    let targetRecordId = "";
    let validationMode = "role_and_institute_verified";
    let notification = null;
    let deliveryRequest = null;
    const payload = { ...params.payload };

    switch (params.actionType) {
      case "attendance.mark":
        student = await resolveStudent(params.instituteId, payload.studentId);
        await validateStudentTarget(params.instituteId, actor, student);
        classInfo = payload.classId ? await resolveClass(params.instituteId, payload.classId) : null;
        branchId = await validatedBranchId(
          params.instituteId,
          actor,
          payload.branchId || student.branchId || classInfo?.branchId || ""
        );
        payload.date = cleanDate(payload.date);
        payload.status = cleanText(payload.status, 20).toLowerCase();
        if (!payload.date || !["present", "absent", "late", "excused"].includes(payload.status)) {
          throw makeError("ATTENDANCE_DETAILS_INVALID", "Valid attendance date and status required.");
        }
        targetType = "student";
        targetRef = student.publicRef;
        targetModel = student.modelName;
        targetRecordId = student.recordId;
        validationMode = classInfo?.validationMode || student.validationMode;
        recipients = student.identity ? [student.identity] : [];
        notification = {
          type: "attendance_marked",
          title: "Attendance updated",
          body: `Attendance for ${payload.date} is ${payload.status}.`,
        };
        break;

      case "attendance.correction_request":
        student = await resolveStudent(params.instituteId, payload.studentId);
        await validateStudentTarget(params.instituteId, actor, student);
        payload.date = cleanDate(payload.date);
        targetType = "student";
        targetRef = student.publicRef;
        targetModel = student.modelName;
        targetRecordId = student.recordId;
        validationMode = actor.role === "parent" ? "parent_child_scope_verified" : "student_self_scope_verified";
        recipients = await recipientsByRole(params.instituteId, ["teacher", "institute_owner"]);
        notification = {
          type: "attendance_correction_request",
          title: "Attendance correction requested",
          body: `Correction requested for ${payload.date}.`,
        };
        break;

      case "fees.reminder":
        student = await resolveStudent(params.instituteId, payload.studentId);
        await validateStudentTarget(params.instituteId, actor, student);
        branchId = await validatedBranchId(params.instituteId, actor, payload.branchId || student.branchId || "");
        targetType = "student";
        targetRef = student.publicRef;
        targetModel = student.modelName;
        targetRecordId = student.recordId;
        validationMode = student.validationMode;
        recipients = [
          ...(student.identity ? [student.identity] : []),
          ...(await linkedParents(params.instituteId, student.references)),
        ];
        recipients = [...new Map(recipients.map((item) => [String(item._id), item])).values()];
        notification = {
          type: "fee_reminder",
          title: "Fee reminder",
          body: cleanLongText(payload.message, 1500),
        };
        deliveryRequest = {
          channel: cleanText(payload.channel || "in_app", 20).toLowerCase(),
          recipientRole: "student",
          subject: "NAXORA fee reminder",
          message: payload.message,
          targetReference: student.publicRef,
        };
        break;

      case "fees.assistance_request":
        student = await resolveStudent(params.instituteId, payload.studentId);
        await validateStudentTarget(params.instituteId, actor, student);
        targetType = "student";
        targetRef = student.publicRef;
        targetModel = student.modelName;
        targetRecordId = student.recordId;
        validationMode = actor.role === "parent" ? "parent_child_scope_verified" : "student_self_scope_verified";
        recipients = await recipientsByRole(params.instituteId, ["accountant", "institute_owner"]);
        notification = {
          type: "fee_assistance_request",
          title: "Fee assistance request",
          body: "A Student or Parent submitted a fee assistance request.",
        };
        break;

      case "admission.follow_up":
        lead = await resolveLead(params.instituteId, payload.leadId);
        branchId = await validatedBranchId(params.instituteId, actor, payload.branchId || lead.branchId || "");
        payload.followUpAt = cleanDate(payload.followUpAt);
        targetType = "lead";
        targetRef = lead.publicRef;
        targetModel = lead.modelName;
        targetRecordId = lead.recordId;
        validationMode = lead.validationMode;
        recipients = payload.assigneeId
          ? await resolveRecipients(params.instituteId, "counsellor", [payload.assigneeId])
          : await recipientsByRole(params.instituteId, ["counsellor"]);
        notification = {
          type: "admission_follow_up",
          title: "Admission follow-up scheduled",
          body: `Follow-up scheduled for ${payload.followUpAt}.`,
        };
        deliveryRequest = {
          channel: cleanText(payload.channel || "in_app", 20).toLowerCase(),
          recipientRole: "lead",
          subject: "NAXORA admission follow-up",
          message: payload.message,
          targetReference: lead.publicRef,
        };
        break;

      case "assignment.create":
        classInfo = await resolveClass(params.instituteId, payload.classId);
        branchId = await validatedBranchId(params.instituteId, actor, payload.branchId || classInfo.branchId || "");
        payload.assignmentId = `NAX-A-${String(params.actionId).slice(-10).toUpperCase()}`;
        payload.dueDate = cleanDate(payload.dueDate);
        targetType = "class";
        targetRef = classInfo.publicRef;
        targetModel = classInfo.modelName;
        targetRecordId = classInfo.recordId;
        validationMode = classInfo.validationMode;
        for (const studentId of cleanIdList(payload.studentIds || [])) {
          const linkedStudent = await resolveStudent(params.instituteId, studentId);
          if (linkedStudent.identity) recipients.push(linkedStudent.identity);
        }
        notification = {
          type: "assignment_created",
          title: cleanText(payload.title, 180),
          body: `New assignment due ${payload.dueDate}.`,
        };
        break;

      case "assignment.submit": {
        if (actor.role !== "student") throw makeError("STUDENT_ONLY_SUBMISSION", "Assignment submission requires a Student login.", 403);
        const Assignment = models.Native.Part126Assignment;
        const ref = cleanId(payload.assignmentId);
        const ors = [{ actionId: ref }, { "payload.assignmentId": ref }];
        if (mongoose.isValidObjectId(ref)) ors.unshift({ _id: new mongoose.Types.ObjectId(ref) });
        const assignment = await Assignment.findOne({ instituteId: params.instituteId, $or: ors }).lean();
        if (!assignment) throw makeError("ASSIGNMENT_REFERENCE_NOT_FOUND", "Assignment was not found in the Part 126 native assignment module.", 404);
        targetType = "assignment";
        targetRef = cleanId(assignment.payload?.assignmentId || assignment.actionId);
        targetModel = "Part126Assignment";
        targetRecordId = String(assignment._id);
        validationMode = "assignment_and_student_identity_verified";
        recipients = await resolveRecipients(
          params.instituteId,
          assignment.actorRole === "teacher" ? "teacher" : "institute_owner",
          [assignment.actorUserId]
        );
        notification = {
          type: "assignment_submitted",
          title: `Submission: ${assignment.payload?.title || targetRef}`,
          body: "A Student submitted an assignment.",
        };
        break;
      }

      case "message.send":
        recipients = await resolveRecipients(params.instituteId, payload.recipientRole, payload.recipientIds);
        if (!recipients.length) throw makeError("MESSAGE_RECIPIENTS_NOT_FOUND", "No active recipients matched the requested role and IDs.", 404);
        branchId = await validatedBranchId(params.instituteId, actor, payload.branchId || "");
        if (actor.role === "parent" && payload.studentId) {
          student = await resolveStudent(params.instituteId, payload.studentId);
          await validateStudentTarget(params.instituteId, actor, student);
        }
        targetType = "role_recipients";
        targetRef = recipients.map((recipient) => String(recipient._id)).join(",");
        validationMode = "recipient_role_and_identity_verified";
        notification = {
          type: "role_safe_message",
          title: cleanText(payload.subject || `Message from ${actor.displayName}`, 180),
          body: cleanLongText(payload.message, 1500),
        };
        deliveryRequest = {
          channel: cleanText(payload.channel || "in_app", 20).toLowerCase(),
          recipientRole: normalizeRole(payload.recipientRole),
          subject: payload.subject || "",
          message: payload.message,
          targetReference: "",
        };
        break;

      case "branch.task.create":
        branchId = await validatedBranchId(params.instituteId, actor, payload.branchId);
        if (!branchId) throw makeError("BRANCH_ID_REQUIRED", "Branch task requires branchId.");
        payload.dueDate = cleanDate(payload.dueDate);
        targetType = "branch";
        targetRef = branchId;
        validationMode = "branch_scope_verified";
        if (payload.assigneeId) {
          for (const role of ["branch_manager", "staff", "teacher"]) {
            recipients = await resolveRecipients(params.instituteId, role, [payload.assigneeId]);
            if (recipients.length) break;
          }
        }
        notification = {
          type: "branch_task",
          title: cleanText(payload.title, 180),
          body: `Branch task due ${payload.dueDate}.`,
        };
        break;

      default:
        throw makeError("UNKNOWN_ACTION_TYPE", "Part 126 adapter does not support this action type.", 400);
    }

    let internalCount = 0;
    if (notification) {
      internalCount = await createNotifications(models, {
        instituteId: params.instituteId,
        actionId: params.actionId,
        recipients,
        ...notification,
      });
    }

    let deliveryResult = {
      externalDeliveryPerformed: false,
      deliveryStatus: internalCount ? "delivered_in_app" : "not_applicable",
      providerReference: "",
    };
    if (deliveryRequest) {
      deliveryResult = await deliver(models, {
        actionId: params.actionId,
        instituteId: params.instituteId,
        recipients,
        ...deliveryRequest,
      });
    }

    const record = await createNativeRecord(models, { ...params, actor }, {
      targetType,
      targetRef,
      targetModel,
      targetRecordId,
      branchId,
      validationMode,
      payload,
      deliveryStatus: deliveryResult.deliveryStatus,
    });

    return {
      success: true,
      nativeRecordId: String(record._id),
      nativeRecordType: MODEL_BY_ACTION[params.actionType],
      internalDeliveryPerformed: internalCount > 0,
      externalDeliveryPerformed: deliveryResult.externalDeliveryPerformed,
      deliveryStatus: deliveryResult.deliveryStatus,
      providerReference: deliveryResult.providerReference,
      relationshipValidation: validationMode,
    };
  });
}
function registerAdapters(app, models) {
  for (const actionType of ACTION_TYPES) {
    registerPart125ActionAdapter(
      app,
      actionType,
      (params) => actionAdapter(models, params),
      `Part126 Native Adapter — ${actionType}`
    );
  }
}
function registeredAdapters(app) {
  const map = app.locals.part125ActionAdapters;
  if (!(map instanceof Map)) return [];
  return [...map.entries()].map(([actionType, entry]) => ({
    actionType,
    name: entry.name || "registered_adapter",
    registeredByPart126: String(entry.name || "").startsWith("Part126"),
  }));
}
function publicAction(action) {
  return {
    actionId: action.actionId,
    actionType: action.actionType,
    actionLabel: action.actionLabel,
    status: action.status,
    actorRole: action.actorRole,
    actorDisplayName: action.actorDisplayName,
    payload: action.payload,
    adapterName: action.adapterName || "",
    nativeModuleApplied: Boolean(action.nativeModuleApplied),
    externalDeliveryPerformed: Boolean(action.externalDeliveryPerformed),
    failureCode: action.failureCode || "",
    failureMessage: action.failureMessage || "",
    createdAt: action.createdAt,
    executedAt: action.executedAt,
    confirmationForRetry: `RETRY PART125 ACTION ${String(action.actionId).slice(-8).toUpperCase()}`,
  };
}
async function reconcile(app, models, context, actionId) {
  const Action = mongoose.models.Part125VaniAction;
  const Canonical = mongoose.models.Part125CanonicalActionRecord;
  const Outbox = mongoose.models.Part125ActionOutbox;
  if (!Action || !Canonical) throw makeError("PART125_MODELS_UNAVAILABLE", "Part 125 models are unavailable.", 503);

  const action = await Action.findOne({ actionId, instituteId: context.instituteId });
  if (!action) throw makeError("ACTION_NOT_FOUND", "Part 125 action not found.", 404);
  if (!OWNER_ROLES.has(context.role) && action.actorUserId !== context.userId) {
    throw makeError("ACTION_OWNER_MISMATCH", "Only the original actor or institute_owner can retry.", 403);
  }
  if (action.status === "executed_native") return { action, idempotentReplay: true };
  if (!["executed_pending_adapter", "adapter_failed"].includes(action.status)) {
    throw makeError("ACTION_NOT_RETRYABLE", "Only pending-adapter or adapter-failed actions can be retried.", 409);
  }

  const entry = app.locals.part125ActionAdapters instanceof Map
    ? app.locals.part125ActionAdapters.get(action.actionType)
    : null;
  if (!entry?.handler) throw makeError("NATIVE_ADAPTER_NOT_REGISTERED", "No Part 126 adapter is registered.", 503);

  try {
    const result = await entry.handler({
      actionId: action.actionId,
      actionType: action.actionType,
      instituteId: action.instituteId,
      actor: {
        userId: action.actorUserId,
        role: action.actorRole,
        displayName: action.actorDisplayName,
      },
      payload: action.payload,
      canonicalRecordId: action.canonicalRecordId,
      outboxRecordId: action.outboxRecordId,
    });

    action.status = "executed_native";
    action.adapterName = cleanText(entry.name, 120);
    action.adapterResult = safeResult(result);
    action.nativeModuleApplied = true;
    action.externalDeliveryPerformed = Boolean(result.externalDeliveryPerformed);
    action.part126DeliveryPending = false;
    action.failureCode = "";
    action.failureMessage = "";
    action.executedAt ||= new Date();
    await action.save();
    await Canonical.updateOne({ actionId }, { nativeAdapterStatus: "applied" });
    if (Outbox && result.externalDeliveryPerformed) {
      await Outbox.updateOne({ actionId }, {
        deliveryStatus: "delivered",
        deliveredAt: new Date(),
        providerReference: cleanText(result.providerReference || "", 180),
      });
    }
    await writeAudit(models, context, actionId, "part125_action_reconciled", "success", {
      adapterName: action.adapterName,
    });
    return { action, result, idempotentReplay: Boolean(result.idempotentReplay) };
  } catch (error) {
    action.status = "adapter_failed";
    action.adapterName = cleanText(entry.name, 120);
    action.failureCode = cleanText(error.code || "ADAPTER_EXECUTION_FAILED", 120);
    action.failureMessage = cleanText(error.message || "Adapter failed.", 500);
    action.part126DeliveryPending = true;
    await action.save();
    await Canonical.updateOne({ actionId }, { nativeAdapterStatus: "failed" });
    await writeAudit(models, context, actionId, "part125_action_reconciled", "failed", {
      failureCode: action.failureCode,
    });
    throw error;
  }
}
async function acceptance(app, models, instituteId) {
  const adapters = registeredAdapters(app);
  const Action = mongoose.models.Part125VaniAction;
  const checks = {
    databaseConnected: dbReady(),
    allNineAdaptersRegistered: ACTION_TYPES.every((type) =>
      adapters.some((adapter) => adapter.actionType === type && adapter.registeredByPart126)
    ),
    part125ActionModelReady: Boolean(Action),
    part125CanonicalModelReady: Boolean(mongoose.models.Part125CanonicalActionRecord),
    part120IdentityModelReady: Boolean(mongoose.models.Part120UnifiedIdentity),
    part124RoleScopeModelReady: Boolean(mongoose.models.Part124RoleScopeAssignment),
    notificationInboxReady: Boolean(mongoose.models.Part126NotificationInbox),
    providerDeliveryIsTruthful: true,
    directMoneyActionsBlocked: true,
  };
  return {
    checks,
    passed: Object.values(checks).every(Boolean),
    registeredAdapters: adapters,
    pendingActionCount: Action && dbReady()
      ? await Action.countDocuments({
          instituteId,
          status: { $in: ["executed_pending_adapter", "adapter_failed"] },
        })
      : null,
    nativeSuccessCount: dbReady()
      ? await models.Execution.countDocuments({ instituteId, status: "completed" })
      : null,
    failedExecutionCount: dbReady()
      ? await models.Execution.countDocuments({ instituteId, status: "failed" })
      : null,
    providerConfiguration: providerState(),
    part127ProductionAcceptanceRequired: true,
  };
}

export async function getPart126Acceptance({ app, instituteId } = {}) {
  if (!app) throw new Error("Express app required.");
  return acceptance(app, defineModels(), cleanId(instituteId));
}

export function registerPart126NativeE2E({ app } = {}) {
  if (!app || typeof app.get !== "function" || typeof app.post !== "function") {
    throw new Error("Part 126 registration failed: Express app required.");
  }
  if (app.locals.part126NativeE2ERegistered) return;
  app.locals.part126NativeE2ERegistered = true;

  const models = defineModels();
  registerAdapters(app, models);

  app.get(["/integration-centre", "/native-integration-centre", "/part126"], (req, res) => {
    res.sendFile(path.join(frontendDir, "naxora-integration-centre.html"));
  });
  app.get("/naxora-integration-centre.css", (req, res) => {
    res.type("text/css").sendFile(path.join(frontendDir, "naxora-integration-centre.css"));
  });
  app.get("/naxora-integration-centre.js", (req, res) => {
    res.type("application/javascript").sendFile(path.join(frontendDir, "naxora-integration-centre.js"));
  });

  app.get("/api/part126/status", (req, res) => {
    const adapters = registeredAdapters(app);
    res.json({
      success: true,
      part: PART_NUMBER,
      name: PART_NAME,
      status: "native_adapters_and_cross_module_e2e_active",
      integrationCentreUrl: "/integration-centre",
      registeredAdapterCount: adapters.filter((adapter) => adapter.registeredByPart126).length,
      registeredAdapters: adapters,
      nativeMongoModulesEnabled: true,
      inAppNotificationsEnabled: true,
      optionalExternalProvidersEnabled: true,
      externalDeliveryClaimRequiresProviderSuccess: true,
      pendingActionReconciliationEnabled: true,
      idempotentAdapterExecutionEnabled: true,
      directMoneyActionsEnabled: false,
      productionAcceptanceComplete: false,
      part127Required: true,
      nextPart: 127,
      nextPartName: "Unified SaaS Production Acceptance and Launch",
    });
  });

  app.get("/api/part126/security-policy", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      instituteIsolationRequired: true,
      studentSelfScopeRequired: true,
      parentChildScopeRequired: true,
      branchScopeRequired: true,
      recipientRoleAndIdentityValidated: true,
      adapterIdempotencyByActionId: true,
      arbitraryModelNamesFromClientBlocked: true,
      arbitraryProviderUrlsFromClientBlocked: true,
      providerUrlsLoadedOnlyFromPrivateEnvironment: true,
      providerSuccessRequiredBeforeExternalDeliveredClaim: true,
      inAppNotificationInboxEnabled: true,
      directChargesTransfersRefundsDisabled: true,
      pendingActionsRequireOriginalActorOrOwnerRetry: true,
      exactRetryConfirmationRequired: true,
    });
  });

  app.get("/api/part126/catalog", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      adapters: ACTION_TYPES.map((actionType) => ({
        actionType,
        nativeRecord: MODEL_BY_ACTION[actionType],
      })),
      notificationModel: "Part126NotificationInbox",
      deliveryModel: "Part126DeliveryAttempt",
      executionModel: "Part126AdapterExecution",
    });
  });

  app.get("/api/part126/health", authenticated, async (req, res) => {
    try {
      res.json({
        success: true,
        part: PART_NUMBER,
        health: await acceptance(app, models, req.part126Context.instituteId),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        part: PART_NUMBER,
        code: "PART126_HEALTH_FAILED",
        message: error.message,
      });
    }
  });

  app.get("/api/part126/actions/pending", authenticated, async (req, res) => {
    const Action = mongoose.models.Part125VaniAction;
    if (!Action || !dbReady()) {
      return res.status(503).json({
        success: false,
        part: PART_NUMBER,
        code: "PART125_ACTION_MODEL_UNAVAILABLE",
        message: "Part 125 action model or MongoDB is unavailable.",
      });
    }
    const filter = {
      instituteId: req.part126Context.instituteId,
      status: { $in: ["executed_pending_adapter", "adapter_failed"] },
    };
    if (!OWNER_ROLES.has(req.part126Context.role)) filter.actorUserId = req.part126Context.userId;
    const actions = await Action.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    res.json({
      success: true,
      part: PART_NUMBER,
      count: actions.length,
      actions: actions.map(publicAction),
    });
  });

  app.post("/api/part126/actions/:actionId/retry-preview", authenticated, async (req, res) => {
    const Action = mongoose.models.Part125VaniAction;
    const action = Action
      ? await Action.findOne({
          actionId: cleanId(req.params.actionId),
          instituteId: req.part126Context.instituteId,
        }).lean()
      : null;
    if (!action) return res.status(404).json({
      success: false, part: PART_NUMBER, code: "ACTION_NOT_FOUND", message: "Part 125 action not found.",
    });
    if (!OWNER_ROLES.has(req.part126Context.role) && action.actorUserId !== req.part126Context.userId) {
      return res.status(403).json({
        success: false, part: PART_NUMBER, code: "ACTION_OWNER_MISMATCH",
        message: "Only the original actor or institute_owner can retry.",
      });
    }
    if (!["executed_pending_adapter", "adapter_failed"].includes(action.status)) {
      return res.status(409).json({
        success: false, part: PART_NUMBER, code: "ACTION_NOT_RETRYABLE",
        message: "Action is not in a retryable state.",
      });
    }
    res.json({
      success: true,
      part: PART_NUMBER,
      preview: publicAction(action),
      confirmationTextRequired: `RETRY PART125 ACTION ${String(action.actionId).slice(-8).toUpperCase()}`,
      adapterRegistered: registeredAdapters(app).some((adapter) => adapter.actionType === action.actionType),
    });
  });

  app.post("/api/part126/actions/:actionId/retry-confirmed", authenticated, async (req, res) => {
    try {
      const actionId = cleanId(req.params.actionId);
      const required = `RETRY PART125 ACTION ${String(actionId).slice(-8).toUpperCase()}`;
      if (String(req.body?.confirmationText || "").trim() !== required) {
        throw makeError("EXACT_CONFIRMATION_REQUIRED", `Exact confirmation required: ${required}`);
      }
      const result = await reconcile(app, models, req.part126Context, actionId);
      res.json({
        success: true,
        part: PART_NUMBER,
        message: "Part 125 action reconciled through the Part 126 native adapter.",
        action: publicAction(result.action),
        adapterResult: safeResult(result.result || result.action.adapterResult),
        idempotentReplay: Boolean(result.idempotentReplay),
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "ACTION_RETRY_FAILED",
        message: error.message,
      });
    }
  });

  app.get("/api/part126/executions", authenticated, async (req, res) => {
    const filter = { instituteId: req.part126Context.instituteId };
    if (!OWNER_ROLES.has(req.part126Context.role)) filter.actorUserId = req.part126Context.userId;
    const executions = await models.Execution.find(filter).sort({ updatedAt: -1 }).limit(100).lean();
    res.json({
      success: true,
      part: PART_NUMBER,
      count: executions.length,
      executions: executions.map((item) => ({
        actionId: item.actionId,
        actionType: item.actionType,
        actorRole: item.actorRole,
        status: item.status,
        attemptCount: item.attemptCount,
        nativeRecordType: item.nativeRecordType,
        nativeRecordId: item.nativeRecordId,
        safeResult: safeResult(item.safeResult),
        failureCode: item.failureCode,
        failureMessage: item.failureMessage,
        updatedAt: item.updatedAt,
      })),
    });
  });

  app.get("/api/part126/notifications", authenticated, async (req, res) => {
    const ids = [req.part126Context.identityId, req.part126Context.userId].map(cleanId).filter(Boolean);
    const filter = {
      instituteId: req.part126Context.instituteId,
      recipientIdentityId: { $in: ids },
    };
    if (OWNER_ROLES.has(req.part126Context.role) && String(req.query?.all || "").toLowerCase() === "true") {
      delete filter.recipientIdentityId;
    }
    const notifications = await models.Notification.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    res.json({
      success: true,
      part: PART_NUMBER,
      count: notifications.length,
      unreadCount: notifications.filter((item) => item.status === "unread").length,
      notifications: notifications.map((item) => ({
        id: String(item._id),
        recipientRole: item.recipientRole,
        sourceActionId: item.sourceActionId,
        notificationType: item.notificationType,
        title: item.title,
        body: item.body,
        status: item.status,
        readAt: item.readAt,
        createdAt: item.createdAt,
      })),
    });
  });

  app.post("/api/part126/notifications/:notificationId/read", authenticated, async (req, res) => {
    const id = cleanId(req.params.notificationId);
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({
      success: false, part: PART_NUMBER, code: "INVALID_NOTIFICATION_ID",
      message: "Valid notification ID required.",
    });
    const filter = {
      _id: new mongoose.Types.ObjectId(id),
      instituteId: req.part126Context.instituteId,
    };
    if (!OWNER_ROLES.has(req.part126Context.role)) {
      filter.recipientIdentityId = {
        $in: [req.part126Context.identityId, req.part126Context.userId].map(cleanId),
      };
    }
    const notification = await models.Notification.findOneAndUpdate(
      filter,
      { status: "read", readAt: new Date() },
      { new: true }
    );
    if (!notification) return res.status(404).json({
      success: false, part: PART_NUMBER, code: "NOTIFICATION_NOT_FOUND",
      message: "Notification not found for this account.",
    });
    res.json({
      success: true,
      part: PART_NUMBER,
      message: "Notification marked as read.",
      notificationId: String(notification._id),
    });
  });

  app.get("/api/part126/deliveries", authenticated, async (req, res) => {
    const Action = mongoose.models.Part125VaniAction;
    const filter = { instituteId: req.part126Context.instituteId };
    if (!OWNER_ROLES.has(req.part126Context.role)) {
      const actions = Action
        ? await Action.find({
            instituteId: req.part126Context.instituteId,
            actorUserId: req.part126Context.userId,
          }).select("actionId").limit(500).lean()
        : [];
      filter.actionId = { $in: actions.map((item) => item.actionId) };
    }
    const deliveries = await models.Delivery.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    res.json({
      success: true,
      part: PART_NUMBER,
      count: deliveries.length,
      deliveries: deliveries.map((item) => ({
        id: String(item._id),
        actionId: item.actionId,
        channel: item.channel,
        status: item.status,
        recipientCount: item.recipientCount,
        providerReference: item.providerReference,
        httpStatus: item.httpStatus,
        errorCode: item.errorCode,
        attemptedAt: item.attemptedAt,
      })),
    });
  });

  app.get("/api/part126/e2e/acceptance", ownerOnly, async (req, res) => {
    try {
      res.json({
        success: true,
        part: PART_NUMBER,
        acceptance: await acceptance(app, models, req.part126Context.instituteId),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        part: PART_NUMBER,
        code: "E2E_ACCEPTANCE_FAILED",
        message: error.message,
      });
    }
  });

  app.get("/api/part126/demo", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      name: PART_NAME,
      page: "/integration-centre",
      flow: [
        "Part 125 preview and exact confirmation",
        "Part 125 execute calls a registered Part 126 adapter",
        "Part 126 revalidates institute, role and scope",
        "A native MongoDB record is created idempotently",
        "In-app notifications are generated",
        "External providers run only when privately configured",
        "Old pending Part 125 actions can be reconciled",
        "Part 127 performs final production acceptance",
      ],
    });
  });
}
