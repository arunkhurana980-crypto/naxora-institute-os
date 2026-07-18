import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const PART_NUMBER = 131;
const PART_NAME = "VANI Fees and Finance Operations";
const PREVIEW_TTL_MS = 30 * 60 * 1000;
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;
const MAX_REPORT_ROWS = 500;
const MANUAL_RECEIPT_ACK = "I CONFIRM MANUAL OFFLINE RECORD";

const ALL_ROLES = new Set([
  "institute_owner", "branch_manager", "teacher", "student",
  "parent", "accountant", "counsellor", "staff",
]);
const OWNER_ROLES = new Set(["institute_owner", "owner", "instituteowner"]);
const FINANCE_ROLES = new Set(["institute_owner", "branch_manager", "accountant"]);
const BRANCH_SCOPED_ROLES = new Set(["branch_manager", "accountant"]);

const ACTION_DEFINITIONS = Object.freeze({
  "finance.fee_structure.create": {
    label: "Create Fee Structure",
    roles: ["institute_owner", "branch_manager", "accountant"],
    requiredFields: ["title", "billingCycle", "amount"],
    optionalFields: ["branchId", "courseId", "classId", "dueDay", "lateFeeAmount", "description", "status"],
    category: "Fee Structures",
  },
  "finance.fee_structure.update": {
    label: "Update Fee Structure",
    roles: ["institute_owner", "branch_manager", "accountant"],
    requiredFields: ["structureId"],
    optionalFields: ["title", "billingCycle", "amount", "dueDay", "lateFeeAmount", "description", "status"],
    category: "Fee Structures",
  },
  "finance.student_fee.assign": {
    label: "Assign Student Fee",
    roles: ["institute_owner", "branch_manager", "accountant"],
    requiredFields: ["studentId", "structureId", "startDate"],
    optionalFields: ["customAmount", "discountAmount", "endDate", "note", "status"],
    category: "Student Fees",
  },
  "finance.student_fee.update": {
    label: "Update Student Fee",
    roles: ["institute_owner", "branch_manager", "accountant"],
    requiredFields: ["studentFeeId"],
    optionalFields: ["customAmount", "discountAmount", "startDate", "endDate", "note", "status"],
    category: "Student Fees",
  },
  "finance.invoice.create": {
    label: "Create Student Invoice",
    roles: ["institute_owner", "branch_manager", "accountant"],
    requiredFields: ["studentId", "amount", "dueDate", "description"],
    optionalFields: ["studentFeeId", "invoiceNumber", "issueDate", "status"],
    category: "Invoices",
  },
  "finance.invoice.update": {
    label: "Update Student Invoice",
    roles: ["institute_owner", "branch_manager", "accountant"],
    requiredFields: ["invoiceId"],
    optionalFields: ["amount", "dueDate", "description", "status"],
    category: "Invoices",
  },
  "finance.receipt.record": {
    label: "Record Manual Offline Receipt",
    roles: ["institute_owner", "branch_manager", "accountant"],
    requiredFields: ["invoiceId", "amount", "paymentMethod", "reference"],
    optionalFields: ["receiptNumber", "recordedAt", "note"],
    category: "Receipts",
    manualReceiptAcknowledgementRequired: true,
  },
  "finance.receipt.correction_request": {
    label: "Request Receipt Correction",
    roles: ["institute_owner", "branch_manager", "accountant"],
    requiredFields: ["receiptId", "reason"],
    optionalFields: ["requestedAmount", "note"],
    category: "Receipts",
  },
  "finance.due_list.generate": {
    label: "Generate Due List",
    roles: ["institute_owner", "branch_manager", "accountant"],
    requiredFields: [],
    optionalFields: ["branchId", "asOfDate", "minimumDue"],
    category: "Reports",
  },
  "finance.reminder.create": {
    label: "Create In-App Fee Reminder",
    roles: ["institute_owner", "branch_manager", "accountant"],
    requiredFields: ["invoiceId", "message"],
    optionalFields: ["dueDate"],
    category: "Reminders",
  },
  "finance.student_statement.generate": {
    label: "Generate Student Fee Statement",
    roles: ["institute_owner", "branch_manager", "accountant", "student", "parent"],
    requiredFields: ["studentId"],
    optionalFields: ["fromDate", "toDate"],
    category: "Reports",
  },
  "finance.summary.generate": {
    label: "Generate Finance Summary",
    roles: ["institute_owner", "branch_manager", "accountant"],
    requiredFields: [],
    optionalFields: ["branchId", "fromDate", "toDate"],
    category: "Reports",
  },
});

const ACTION_PATTERNS = Object.freeze([
  ["finance.receipt.correction_request", /(receipt|rasid).*(correction|correct|request|galat)/i],
  ["finance.receipt.record", /(receipt|rasid).*(record|add|banao|save|manual)/i],
  ["finance.fee_structure.update", /(fee structure|fees structure).*(update|edit|badlo)/i],
  ["finance.fee_structure.create", /(fee structure|fees structure).*(create|banao|add)/i],
  ["finance.student_fee.update", /(student fee|fee assignment).*(update|edit|badlo)/i],
  ["finance.student_fee.assign", /(student fee|fee assignment).*(assign|create|lagao|set)/i],
  ["finance.invoice.update", /(invoice|bill).*(update|edit|badlo)/i],
  ["finance.invoice.create", /(invoice|bill).*(create|banao|generate|add)/i],
  ["finance.due_list.generate", /(due list|pending fees|fees due).*(generate|banao|dikhao|list)/i],
  ["finance.reminder.create", /(fee|invoice).*(reminder|yaad|notify|message).*(create|bhejo|send|banao)/i],
  ["finance.student_statement.generate", /(student|fee).*(statement|ledger).*(generate|banao|dikhao)/i],
  ["finance.summary.generate", /(finance|fees|collection).*(summary|report).*(generate|banao|dikhao)/i],
]);

const SENSITIVE_PATTERN = /(password|passcode|otp|cvv|upi\s*pin|api\s*key|secret|jwt|bank\s*account|card\s*number|aadhaar|aadhar|pan\s*(card|number)?)/i;
const BLOCKED_MONEY_PATTERN = /(charge\s*(card|account)?|debit|withdraw|transfer\s*money|refund\s*(payment|money)|collect\s*payment|pay\s*now|bank\s*transfer|settle\s*money)/i;
const DESTRUCTIVE_PATTERN = /(delete permanently|drop database|purge|erase all|bulk delete)/i;

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
function cleanDate(value = "", dateOnly = false) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const parsed = new Date(text.length === 10 ? `${text}T00:00:00.000Z` : text);
  if (Number.isNaN(parsed.getTime())) return "";
  return dateOnly ? parsed.toISOString().slice(0, 10) : parsed.toISOString();
}
function cleanNumber(value, min = 0, max = 100000000) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : null;
}
function normalizeRole(value = "") {
  const role = String(value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return ({ owner: "institute_owner", instituteowner: "institute_owner", branchmanager: "branch_manager", accounts: "accountant", counselor: "counsellor", guardian: "parent", learner: "student" })[role] || role;
}
function normalizeStatus(value = "", allowed = ["active", "inactive"], fallback = allowed[0]) {
  const status = cleanText(value, 30).toLowerCase();
  return allowed.includes(status) ? status : fallback;
}
function normalizeBillingCycle(value = "") {
  const cycle = cleanText(value, 30).toLowerCase().replace(/[\s-]+/g, "_");
  return ({ month: "monthly", monthly: "monthly", quarter: "quarterly", quarterly: "quarterly", halfyearly: "half_yearly", half_yearly: "half_yearly", annual: "yearly", yearly: "yearly", onetime: "one_time", one_time: "one_time" })[cycle] || "";
}
function normalizePaymentMethod(value = "") {
  const method = cleanText(value, 40).toLowerCase().replace(/[\s-]+/g, "_");
  return ["cash", "bank_transfer", "cheque", "upi_offline", "other_offline"].includes(method) ? method : "";
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
function actionContext(req) {
  const auth = String(req.headers.authorization ?? "").trim();
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const payload = req.part120Context || req.user || req.auth || (token ? verifyJwt(token) : null);
  if (!payload) throw Object.assign(new Error("Common role login required."), { code: "LOGIN_REQUIRED", httpStatus: 401 });
  const rawRole = normalizeRole(payload.role || payload.userRole || payload.accountRole || payload.user?.role || "");
  const role = OWNER_ROLES.has(rawRole) ? "institute_owner" : rawRole;
  if (!ALL_ROLES.has(role)) throw Object.assign(new Error("This login role is not supported by Part 131."), { code: "UNSUPPORTED_ROLE", httpStatus: 403 });
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
    role,
    displayName: cleanText(payload.displayName || payload.name || payload.fullName || payload.email || role, 120),
    referenceIds: [...new Set([userId, identityId, payload.studentId, payload.student_id, payload.profileId, payload.studentProfileId].map(cleanId).filter(Boolean))],
  };
}
function authenticated(req, res, next) {
  try { req.part131Context = actionContext(req); next(); }
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
    manualReceiptAcknowledgementRequired: { type: Boolean, default: false },
  }, { timestamps: true, strict: true });
  actionSchema.index({ instituteId: 1, actorUserId: 1, fingerprint: 1, createdAt: -1 });

  const feeStructureSchema = new mongoose.Schema({
    structureId: { type: String, required: true, unique: true, index: true },
    instituteId: { type: String, required: true, index: true },
    branchId: { type: String, default: "", index: true },
    courseId: { type: String, default: "", index: true },
    classId: { type: String, default: "", index: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    billingCycle: { type: String, enum: ["monthly", "quarterly", "half_yearly", "yearly", "one_time"], required: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    dueDay: { type: Number, default: null },
    lateFeeAmount: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "inactive", "disabled"], default: "active", index: true },
    createdByActionId: { type: String, required: true },
    updatedByActionId: { type: String, required: true },
  }, { timestamps: true, strict: true });

  const studentFeeSchema = new mongoose.Schema({
    studentFeeId: { type: String, required: true, unique: true, index: true },
    instituteId: { type: String, required: true, index: true },
    studentId: { type: String, required: true, index: true },
    structureId: { type: String, required: true, index: true },
    branchId: { type: String, required: true, index: true },
    courseId: { type: String, default: "", index: true },
    classId: { type: String, default: "", index: true },
    baseAmount: { type: Number, required: true },
    customAmount: { type: Number, default: null },
    discountAmount: { type: Number, default: 0 },
    netAmount: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    note: { type: String, default: "" },
    status: { type: String, enum: ["active", "inactive", "completed"], default: "active", index: true },
    createdByActionId: { type: String, required: true },
    updatedByActionId: { type: String, required: true },
  }, { timestamps: true, strict: true });
  studentFeeSchema.index({ instituteId: 1, studentId: 1, structureId: 1, status: 1 });

  const invoiceSchema = new mongoose.Schema({
    invoiceId: { type: String, required: true, unique: true, index: true },
    instituteId: { type: String, required: true, index: true },
    invoiceNumber: { type: String, required: true },
    studentId: { type: String, required: true, index: true },
    studentFeeId: { type: String, default: "", index: true },
    branchId: { type: String, required: true, index: true },
    issueDate: { type: Date, required: true },
    dueDate: { type: Date, required: true, index: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    outstandingAmount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: { type: String, enum: ["draft", "issued", "partially_paid", "paid", "overdue", "cancelled"], default: "issued", index: true },
    createdByActionId: { type: String, required: true },
    updatedByActionId: { type: String, required: true },
  }, { timestamps: true, strict: true });
  invoiceSchema.index({ instituteId: 1, invoiceNumber: 1 }, { unique: true });

  const receiptSchema = new mongoose.Schema({
    receiptId: { type: String, required: true, unique: true, index: true },
    instituteId: { type: String, required: true, index: true },
    receiptNumber: { type: String, required: true },
    invoiceId: { type: String, required: true, index: true },
    studentId: { type: String, required: true, index: true },
    branchId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    paymentMethod: { type: String, enum: ["cash", "bank_transfer", "cheque", "upi_offline", "other_offline"], required: true },
    reference: { type: String, required: true },
    recordedAt: { type: Date, required: true },
    recordedByUserId: { type: String, required: true },
    sourceType: { type: String, default: "manual_offline" },
    verificationStatus: { type: String, default: "recorded_unverified", index: true },
    note: { type: String, default: "" },
    status: { type: String, enum: ["active", "correction_requested"], default: "active", index: true },
    actionId: { type: String, required: true },
  }, { timestamps: true, strict: true });
  receiptSchema.index({ instituteId: 1, receiptNumber: 1 }, { unique: true });

  const correctionSchema = new mongoose.Schema({
    correctionId: { type: String, required: true, unique: true, index: true },
    instituteId: { type: String, required: true, index: true },
    receiptId: { type: String, required: true, index: true },
    invoiceId: { type: String, required: true, index: true },
    studentId: { type: String, required: true, index: true },
    reason: { type: String, required: true },
    requestedAmount: { type: Number, default: null },
    note: { type: String, default: "" },
    status: { type: String, enum: ["pending_review", "reviewed", "rejected"], default: "pending_review", index: true },
    requestedByUserId: { type: String, required: true },
    actionId: { type: String, required: true },
  }, { timestamps: true, strict: true });

  const reminderSchema = new mongoose.Schema({
    reminderId: { type: String, required: true, unique: true, index: true },
    instituteId: { type: String, required: true, index: true },
    invoiceId: { type: String, required: true, index: true },
    studentId: { type: String, required: true, index: true },
    branchId: { type: String, required: true, index: true },
    recipientRole: { type: String, default: "student_parent" },
    message: { type: String, required: true },
    dueDate: { type: Date, default: null },
    channel: { type: String, default: "in_app" },
    deliveryStatus: { type: String, default: "queued_in_app", index: true },
    externalDeliveryPerformed: { type: Boolean, default: false },
    createdByUserId: { type: String, required: true },
    actionId: { type: String, required: true },
  }, { timestamps: true, strict: true });

  const reportSchema = new mongoose.Schema({
    reportId: { type: String, required: true, unique: true, index: true },
    instituteId: { type: String, required: true, index: true },
    reportType: { type: String, enum: ["due_list", "student_statement", "finance_summary"], required: true, index: true },
    branchId: { type: String, default: "", index: true },
    studentId: { type: String, default: "", index: true },
    filters: { type: mongoose.Schema.Types.Mixed, default: {} },
    summary: { type: mongoose.Schema.Types.Mixed, default: {} },
    rows: { type: [mongoose.Schema.Types.Mixed], default: [] },
    generatedByUserId: { type: String, required: true },
    generatedAt: { type: Date, required: true },
    actionId: { type: String, required: true },
  }, { timestamps: true, strict: true });

  const auditSchema = new mongoose.Schema({
    instituteId: { type: String, required: true, index: true },
    actionId: { type: String, required: true, index: true },
    actorUserId: { type: String, required: true },
    actorRole: { type: String, required: true },
    event: { type: String, required: true },
    result: { type: String, required: true },
    actionType: { type: String, required: true, index: true },
    payloadFields: { type: [String], default: [] },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  }, { timestamps: true, strict: true });

  return {
    Action: mongoose.models.Part131FinanceAction || mongoose.model("Part131FinanceAction", actionSchema),
    FeeStructure: mongoose.models.Part131FeeStructure || mongoose.model("Part131FeeStructure", feeStructureSchema),
    StudentFee: mongoose.models.Part131StudentFee || mongoose.model("Part131StudentFee", studentFeeSchema),
    Invoice: mongoose.models.Part131Invoice || mongoose.model("Part131Invoice", invoiceSchema),
    Receipt: mongoose.models.Part131ManualReceipt || mongoose.model("Part131ManualReceipt", receiptSchema),
    Correction: mongoose.models.Part131ReceiptCorrectionRequest || mongoose.model("Part131ReceiptCorrectionRequest", correctionSchema),
    Reminder: mongoose.models.Part131FinanceReminder || mongoose.model("Part131FinanceReminder", reminderSchema),
    Report: mongoose.models.Part131FinanceReport || mongoose.model("Part131FinanceReport", reportSchema),
    Audit: mongoose.models.Part131FinanceAudit || mongoose.model("Part131FinanceAudit", auditSchema),
  };
}

async function writeAudit(models, context, action, event, result, details = {}) {
  if (!dbReady()) return;
  try {
    await models.Audit.create({ instituteId: context.instituteId, actionId: action.actionId, actorUserId: context.userId, actorRole: context.role, event, result, actionType: action.actionType, payloadFields: Object.keys(action.payload || {}).sort(), details });
  } catch {}
}
function actionDefinition(actionType) { return ACTION_DEFINITIONS[actionType] || null; }
function roleCanUse(role, actionType) { const definition = actionDefinition(actionType); return Boolean(definition && definition.roles.includes(role)); }
function confirmationText(action) { return `CONFIRM ${String(action.actionType || "").toUpperCase().replace(/\./g, " ")} ${String(action.actionId || "").slice(-8).toUpperCase()}`; }
function recordObject(record) { if (!record) return null; const object = typeof record.toObject === "function" ? record.toObject() : { ...record }; delete object.__v; return object; }
function publicAction(action) {
  return {
    actionId: action.actionId, actionType: action.actionType, actionLabel: action.actionLabel, actorRole: action.actorRole,
    status: action.status, payload: action.payload,
    confirmationTextRequired: action.status === "preview_ready" ? confirmationText(action) : null,
    manualReceiptAcknowledgementRequired: Boolean(action.manualReceiptAcknowledgementRequired),
    manualReceiptAcknowledgementText: action.manualReceiptAcknowledgementRequired ? MANUAL_RECEIPT_ACK : null,
    previewExpiresAt: action.previewExpiresAt, executedAt: action.executedAt, result: action.result || {},
    failureCode: action.failureCode || "", failureMessage: action.failureMessage || "", rollbackApplied: Boolean(action.rollbackApplied),
    createdAt: action.createdAt, updatedAt: action.updatedAt,
  };
}
function normalizePayload(actionType, raw = {}) {
  const payload = {};
  for (const field of ["structureId", "branchId", "courseId", "classId", "studentId", "studentFeeId", "invoiceId", "receiptId"]) if (raw[field] !== undefined) payload[field] = cleanId(raw[field]);
  const textFields = { title: 200, description: 3000, note: 3000, invoiceNumber: 100, reference: 180, receiptNumber: 100, reason: 3000, message: 3000 };
  for (const [field, max] of Object.entries(textFields)) if (raw[field] !== undefined) payload[field] = cleanLong(raw[field], max);
  if (raw.billingCycle !== undefined) payload.billingCycle = normalizeBillingCycle(raw.billingCycle);
  if (raw.paymentMethod !== undefined) payload.paymentMethod = normalizePaymentMethod(raw.paymentMethod);
  for (const field of ["amount", "customAmount", "discountAmount", "lateFeeAmount", "requestedAmount", "minimumDue"]) if (raw[field] !== undefined) payload[field] = cleanNumber(raw[field], 0, 100000000);
  if (raw.dueDay !== undefined) payload.dueDay = cleanNumber(raw.dueDay, 1, 31);
  for (const field of ["startDate", "endDate", "dueDate", "issueDate", "recordedAt", "fromDate", "toDate", "asOfDate"]) if (raw[field] !== undefined) payload[field] = cleanDate(raw[field], field === "asOfDate");
  if (raw.status !== undefined) {
    const allowed = actionType.includes("fee_structure") ? ["active", "inactive", "disabled"] : actionType.includes("student_fee") ? ["active", "inactive", "completed"] : actionType.includes("invoice") ? ["draft", "issued", "partially_paid", "paid", "overdue", "cancelled"] : ["active", "inactive"];
    payload.status = normalizeStatus(raw.status, allowed, allowed[0]);
  }
  return payload;
}
function validateBasic(actionType, payload) {
  const definition = actionDefinition(actionType);
  if (!definition) throw Object.assign(new Error("Unknown Part 131 finance action."), { code: "UNKNOWN_FINANCE_ACTION", httpStatus: 404 });
  const missing = definition.requiredFields.filter(field => payload[field] === undefined || payload[field] === null || payload[field] === "");
  if (missing.length) throw Object.assign(new Error(`Required fields missing: ${missing.join(", ")}`), { code: "FINANCE_FIELDS_REQUIRED", httpStatus: 400, missingFields: missing });
  if (payload.amount !== undefined && payload.amount !== null && payload.amount <= 0) throw Object.assign(new Error("Amount must be greater than zero."), { code: "INVALID_AMOUNT", httpStatus: 400 });
  if (payload.billingCycle !== undefined && !payload.billingCycle) throw Object.assign(new Error("Invalid billingCycle."), { code: "INVALID_BILLING_CYCLE", httpStatus: 400 });
  if (payload.paymentMethod !== undefined && !payload.paymentMethod) throw Object.assign(new Error("Invalid paymentMethod."), { code: "INVALID_PAYMENT_METHOD", httpStatus: 400 });
  if (payload.startDate && payload.endDate && new Date(payload.endDate) < new Date(payload.startDate)) throw Object.assign(new Error("endDate cannot be before startDate."), { code: "INVALID_DATE_RANGE", httpStatus: 400 });
  return definition;
}

async function loadScope(context) {
  if (context.role === "institute_owner" || context.role === "student") return { available: true, instituteWide: context.role === "institute_owner", branchIds: [], childStudentIds: [] };
  const Scope = mongoose.models.Part124RoleScopeAssignment;
  if (!Scope || !dbReady()) return { available: false, instituteWide: false, branchIds: [], childStudentIds: [] };
  const assignment = await Scope.findOne({ instituteId: context.instituteId, identityId: context.identityId, role: context.role, status: "active" }).lean();
  return { available: Boolean(assignment), instituteWide: Boolean(assignment?.instituteWide), branchIds: Array.isArray(assignment?.branchIds) ? assignment.branchIds.map(cleanId).filter(Boolean) : [], childStudentIds: Array.isArray(assignment?.childStudentIds) ? assignment.childStudentIds.map(cleanId).filter(Boolean) : [] };
}
function part128Models() {
  const models = { Branch: mongoose.models.Part128Branch, Course: mongoose.models.Part128Course, ClassBatch: mongoose.models.Part128ClassBatch, Student: mongoose.models.Part128StudentProfile };
  if (!models.Branch || !models.Course || !models.ClassBatch || !models.Student) throw Object.assign(new Error("Part 128 master-data models unavailable."), { code: "PART128_MODELS_MISSING", httpStatus: 503 });
  return models;
}
async function requireStudent(context, studentId) {
  const { Student } = part128Models();
  const student = await Student.findOne({ instituteId: context.instituteId, studentId, status: { $ne: "disabled" } });
  if (!student) throw Object.assign(new Error("Student not found inside this institute."), { code: "STUDENT_NOT_FOUND", httpStatus: 404 });
  return student;
}
async function validateOptionalMasterReferences(context, payload) {
  const models = part128Models();
  let branch = null, course = null, classBatch = null;
  if (payload.branchId) {
    branch = await models.Branch.findOne({ instituteId: context.instituteId, branchId: payload.branchId, status: { $ne: "disabled" } });
    if (!branch) throw Object.assign(new Error("Branch not found inside this institute."), { code: "BRANCH_NOT_FOUND", httpStatus: 404 });
  }
  if (payload.courseId) {
    course = await models.Course.findOne({ instituteId: context.instituteId, courseId: payload.courseId, status: { $ne: "disabled" } });
    if (!course) throw Object.assign(new Error("Course not found inside this institute."), { code: "COURSE_NOT_FOUND", httpStatus: 404 });
  }
  if (payload.classId) {
    classBatch = await models.ClassBatch.findOne({ instituteId: context.instituteId, classId: payload.classId, status: { $ne: "disabled" } });
    if (!classBatch) throw Object.assign(new Error("Class/Batch not found inside this institute."), { code: "CLASS_NOT_FOUND", httpStatus: 404 });
    if (branch && classBatch.branchId !== branch.branchId) throw Object.assign(new Error("Class does not belong to selected Branch."), { code: "CLASS_BRANCH_MISMATCH", httpStatus: 400 });
    if (course && classBatch.courseId !== course.courseId) throw Object.assign(new Error("Class does not belong to selected Course."), { code: "CLASS_COURSE_MISMATCH", httpStatus: 400 });
  }
  return { branch, course, classBatch };
}
function enforceStudentReadScope(context, scope, studentId) {
  if (context.role === "student" && !context.referenceIds.includes(studentId)) throw Object.assign(new Error("Student can view only their own fee statement."), { code: "STUDENT_SELF_SCOPE_MISMATCH", httpStatus: 403 });
  if (context.role === "parent" && (!scope.available || !scope.childStudentIds.includes(studentId))) throw Object.assign(new Error("Parent can view only an Owner-linked child statement."), { code: "PARENT_CHILD_SCOPE_MISMATCH", httpStatus: 403 });
}
function enforceBranchScope(context, scope, branchId) {
  if (!BRANCH_SCOPED_ROLES.has(context.role)) return;
  if (!scope.available) throw Object.assign(new Error("Owner-assigned Part 124 finance scope required."), { code: "ROLE_SCOPE_REQUIRED", httpStatus: 403 });
  if (scope.instituteWide) return;
  if (!branchId) throw Object.assign(new Error("branchId required for this branch-scoped finance role."), { code: "BRANCH_ID_REQUIRED", httpStatus: 400 });
  if (!scope.branchIds.includes(branchId)) throw Object.assign(new Error("Finance action is outside assigned Branch scope."), { code: "BRANCH_SCOPE_MISMATCH", httpStatus: 403 });
}
async function validateReferences(models, context, actionType, payload) {
  const scope = await loadScope(context);
  let student = null, structure = null, studentFee = null, invoice = null, receipt = null;
  let branchId = payload.branchId || "";
  if (payload.studentId) { student = await requireStudent(context, payload.studentId); branchId = student.branchId; }
  if (payload.structureId) {
    structure = await models.FeeStructure.findOne({ instituteId: context.instituteId, structureId: payload.structureId });
    if (!structure) throw Object.assign(new Error("Fee Structure not found."), { code: "FEE_STRUCTURE_NOT_FOUND", httpStatus: 404 });
    branchId = branchId || structure.branchId;
  }
  if (payload.studentFeeId) {
    studentFee = await models.StudentFee.findOne({ instituteId: context.instituteId, studentFeeId: payload.studentFeeId });
    if (!studentFee) throw Object.assign(new Error("Student Fee assignment not found."), { code: "STUDENT_FEE_NOT_FOUND", httpStatus: 404 });
    branchId = studentFee.branchId;
  }
  if (payload.invoiceId) {
    invoice = await models.Invoice.findOne({ instituteId: context.instituteId, invoiceId: payload.invoiceId });
    if (!invoice) throw Object.assign(new Error("Invoice not found."), { code: "INVOICE_NOT_FOUND", httpStatus: 404 });
    branchId = invoice.branchId;
  }
  if (payload.receiptId) {
    receipt = await models.Receipt.findOne({ instituteId: context.instituteId, receiptId: payload.receiptId });
    if (!receipt) throw Object.assign(new Error("Receipt not found."), { code: "RECEIPT_NOT_FOUND", httpStatus: 404 });
    branchId = receipt.branchId;
  }
  if (actionType === "finance.fee_structure.create") {
    const refs = await validateOptionalMasterReferences(context, payload);
    branchId = refs.branch?.branchId || refs.classBatch?.branchId || branchId;
  }
  if (actionType === "finance.student_fee.assign" && structure && student && structure.branchId && structure.branchId !== student.branchId) throw Object.assign(new Error("Fee Structure and Student belong to different Branches."), { code: "FEE_STRUCTURE_STUDENT_BRANCH_MISMATCH", httpStatus: 400 });
  if (actionType === "finance.student_statement.generate") enforceStudentReadScope(context, scope, payload.studentId);
  else if (!FINANCE_ROLES.has(context.role)) throw Object.assign(new Error("This finance action is not allowed for the logged-in role."), { code: "FINANCE_ROLE_DENIED", httpStatus: 403 });
  enforceBranchScope(context, scope, branchId || payload.branchId);
  return { scope, student, structure, studentFee, invoice, receipt, branchId };
}
async function validateAction(models, context, actionType, rawPayload) {
  const definition = actionDefinition(actionType);
  if (!definition) throw Object.assign(new Error("Unknown Part 131 finance action."), { code: "UNKNOWN_FINANCE_ACTION", httpStatus: 404 });
  if (!roleCanUse(context.role, actionType)) throw Object.assign(new Error(`${context.role} cannot use ${actionType}.`), { code: "FINANCE_ACTION_ROLE_DENIED", httpStatus: 403 });
  const payload = normalizePayload(actionType, rawPayload);
  validateBasic(actionType, payload);
  const references = await validateReferences(models, context, actionType, payload);
  return { definition, payload, references };
}
function actionFingerprint(context, actionType, payload) { return sha256(JSON.stringify(stableObject({ instituteId: context.instituteId, actorUserId: context.userId, actionType, payload }))); }
async function createPreview(models, context, actionType, rawPayload) {
  if (!dbReady()) throw Object.assign(new Error("MongoDB connection required."), { code: "DATABASE_REQUIRED", httpStatus: 503 });
  const { definition, payload } = await validateAction(models, context, actionType, rawPayload);
  const fingerprint = actionFingerprint(context, actionType, payload);
  const now = new Date();
  const reusable = await models.Action.findOne({ instituteId: context.instituteId, actorUserId: context.userId, fingerprint, status: "preview_ready", previewExpiresAt: { $gt: now } }).sort({ createdAt: -1 });
  if (reusable) return { action: reusable, reusedPreview: true };
  const recent = await models.Action.findOne({ instituteId: context.instituteId, actorUserId: context.userId, fingerprint, status: "executed_native", executedAt: { $gt: new Date(Date.now() - DUPLICATE_WINDOW_MS) } }).sort({ executedAt: -1 });
  if (recent) throw Object.assign(new Error("Same finance action was executed recently. Duplicate blocked."), { code: "DUPLICATE_FINANCE_ACTION", httpStatus: 409, existingAction: publicAction(recent) });
  const actionId = createId("finance");
  const action = await models.Action.create({
    actionId, instituteId: context.instituteId, actorUserId: context.userId, actorIdentityId: context.identityId, actorRole: context.role, actorDisplayName: context.displayName,
    actionType, actionLabel: definition.label, status: "preview_ready", payload, fingerprint,
    confirmationDigest: sha256(confirmationText({ actionId, actionType })), previewExpiresAt: new Date(Date.now() + PREVIEW_TTL_MS),
    manualReceiptAcknowledgementRequired: Boolean(definition.manualReceiptAcknowledgementRequired),
  });
  await writeAudit(models, context, action, "preview_created", "success");
  return { action, reusedPreview: false };
}
function registerCreateUndo(undo, Model, record) { undo.push(async () => { await Model.deleteOne({ _id: record._id }); }); }
function registerUpdateUndo(undo, record) { const before = record.toObject(); undo.push(async () => { record.set(before); await record.save(); }); }
function invoiceNumber() { return `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`; }
function receiptNumber() { return `RCT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`; }
function invoiceStatus(amount, paidAmount, dueDate, requestedStatus = "") {
  if (["cancelled", "draft"].includes(requestedStatus)) return requestedStatus;
  if (paidAmount >= amount) return "paid";
  if (paidAmount > 0) return "partially_paid";
  if (new Date(dueDate).getTime() < Date.now()) return "overdue";
  return requestedStatus || "issued";
}
async function studentStatement(models, context, studentId, filters = {}) {
  const query = { instituteId: context.instituteId, studentId };
  if (filters.fromDate || filters.toDate) {
    query.issueDate = {};
    if (filters.fromDate) query.issueDate.$gte = new Date(filters.fromDate);
    if (filters.toDate) query.issueDate.$lte = new Date(filters.toDate);
  }
  const [invoices, receipts] = await Promise.all([
    models.Invoice.find(query).sort({ issueDate: -1 }).limit(MAX_REPORT_ROWS).lean(),
    models.Receipt.find({ instituteId: context.instituteId, studentId, status: { $in: ["active", "correction_requested"] } }).sort({ recordedAt: -1 }).limit(MAX_REPORT_ROWS).lean(),
  ]);
  return {
    studentId,
    summary: {
      totalInvoiced: invoices.reduce((sum, row) => sum + Number(row.amount || 0), 0),
      totalRecordedManualOffline: receipts.reduce((sum, row) => sum + Number(row.amount || 0), 0),
      totalOutstanding: invoices.reduce((sum, row) => sum + Number(row.outstandingAmount || 0), 0),
      invoiceCount: invoices.length,
      receiptCount: receipts.length,
      livePaymentVerified: false,
    },
    invoices,
    receipts,
  };
}
async function dueList(models, context, branchId = "", asOfDate = "", minimumDue = 0) {
  const point = asOfDate ? new Date(`${asOfDate}T23:59:59.999Z`) : new Date();
  const query = { instituteId: context.instituteId, dueDate: { $lte: point }, outstandingAmount: { $gt: minimumDue || 0 }, status: { $nin: ["paid", "cancelled", "draft"] } };
  if (branchId) query.branchId = branchId;
  const rows = await models.Invoice.find(query).sort({ dueDate: 1 }).limit(MAX_REPORT_ROWS).lean();
  return { summary: { invoiceCount: rows.length, totalDue: rows.reduce((sum, row) => sum + Number(row.outstandingAmount || 0), 0), asOfDate: point.toISOString(), branchId }, rows };
}
async function financeSummary(models, context, branchId = "", fromDate = "", toDate = "") {
  const invoiceQuery = { instituteId: context.instituteId };
  const receiptQuery = { instituteId: context.instituteId, status: { $in: ["active", "correction_requested"] } };
  if (branchId) { invoiceQuery.branchId = branchId; receiptQuery.branchId = branchId; }
  if (fromDate || toDate) {
    invoiceQuery.issueDate = {}; receiptQuery.recordedAt = {};
    if (fromDate) { invoiceQuery.issueDate.$gte = new Date(fromDate); receiptQuery.recordedAt.$gte = new Date(fromDate); }
    if (toDate) { invoiceQuery.issueDate.$lte = new Date(toDate); receiptQuery.recordedAt.$lte = new Date(toDate); }
  }
  const [invoices, receipts] = await Promise.all([models.Invoice.find(invoiceQuery).limit(MAX_REPORT_ROWS).lean(), models.Receipt.find(receiptQuery).limit(MAX_REPORT_ROWS).lean()]);
  return { summary: {
    branchId, invoiceCount: invoices.length, receiptCount: receipts.length,
    invoiceTotal: invoices.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    recordedManualOfflineTotal: receipts.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    outstandingTotal: invoices.reduce((sum, row) => sum + Number(row.outstandingAmount || 0), 0),
    paidInvoiceCount: invoices.filter(row => row.status === "paid").length,
    overdueInvoiceCount: invoices.filter(row => row.status === "overdue").length,
    liveSettlementVerified: false,
  }, rows: [] };
}

async function executeAction(models, context, action) {
  const p = action.payload || {};
  const undo = [];
  let result = {};
  try {
    switch (action.actionType) {
      case "finance.fee_structure.create": {
        const refs = await validateOptionalMasterReferences(context, p);
        const row = await models.FeeStructure.create({ structureId: createId("fees"), instituteId: context.instituteId, branchId: refs.branch?.branchId || refs.classBatch?.branchId || "", courseId: refs.course?.courseId || refs.classBatch?.courseId || "", classId: refs.classBatch?.classId || "", title: p.title, description: p.description || "", billingCycle: p.billingCycle, amount: p.amount, currency: "INR", dueDay: p.dueDay ?? null, lateFeeAmount: p.lateFeeAmount ?? 0, status: p.status || "active", createdByActionId: action.actionId, updatedByActionId: action.actionId });
        registerCreateUndo(undo, models.FeeStructure, row);
        result = { entity: "fee_structure", record: recordObject(row) };
        break;
      }
      case "finance.fee_structure.update": {
        const row = await models.FeeStructure.findOne({ instituteId: context.instituteId, structureId: p.structureId });
        registerUpdateUndo(undo, row);
        for (const field of ["title", "description", "billingCycle", "amount", "dueDay", "lateFeeAmount", "status"]) if (p[field] !== undefined) row[field] = p[field];
        row.updatedByActionId = action.actionId; await row.save();
        result = { entity: "fee_structure", record: recordObject(row) };
        break;
      }
      case "finance.student_fee.assign": {
        const student = await requireStudent(context, p.studentId);
        const structure = await models.FeeStructure.findOne({ instituteId: context.instituteId, structureId: p.structureId, status: { $ne: "disabled" } });
        const chosenAmount = p.customAmount ?? structure.amount;
        const discountAmount = p.discountAmount ?? 0;
        if (discountAmount > chosenAmount) throw Object.assign(new Error("discountAmount cannot exceed fee amount."), { code: "DISCOUNT_EXCEEDS_AMOUNT", httpStatus: 400 });
        const row = await models.StudentFee.create({ studentFeeId: createId("studentfee"), instituteId: context.instituteId, studentId: student.studentId, structureId: structure.structureId, branchId: student.branchId, courseId: student.courseId || structure.courseId || "", classId: student.classId || structure.classId || "", baseAmount: structure.amount, customAmount: p.customAmount ?? null, discountAmount, netAmount: chosenAmount - discountAmount, startDate: p.startDate, endDate: p.endDate || null, note: p.note || "", status: p.status || "active", createdByActionId: action.actionId, updatedByActionId: action.actionId });
        registerCreateUndo(undo, models.StudentFee, row);
        result = { entity: "student_fee", record: recordObject(row) };
        break;
      }
      case "finance.student_fee.update": {
        const row = await models.StudentFee.findOne({ instituteId: context.instituteId, studentFeeId: p.studentFeeId });
        registerUpdateUndo(undo, row);
        const chosenAmount = p.customAmount ?? row.customAmount ?? row.baseAmount;
        const discountAmount = p.discountAmount ?? row.discountAmount;
        if (discountAmount > chosenAmount) throw Object.assign(new Error("discountAmount cannot exceed fee amount."), { code: "DISCOUNT_EXCEEDS_AMOUNT", httpStatus: 400 });
        if (p.customAmount !== undefined) row.customAmount = p.customAmount;
        if (p.discountAmount !== undefined) row.discountAmount = p.discountAmount;
        for (const field of ["startDate", "endDate", "note", "status"]) if (p[field] !== undefined) row[field] = p[field] || (field === "endDate" ? null : p[field]);
        row.netAmount = chosenAmount - discountAmount; row.updatedByActionId = action.actionId; await row.save();
        result = { entity: "student_fee", record: recordObject(row) };
        break;
      }
      case "finance.invoice.create": {
        const student = await requireStudent(context, p.studentId);
        if (p.studentFeeId) {
          const assignment = await models.StudentFee.findOne({ instituteId: context.instituteId, studentFeeId: p.studentFeeId, studentId: student.studentId });
          if (!assignment) throw Object.assign(new Error("Student Fee assignment does not match Student."), { code: "STUDENT_FEE_STUDENT_MISMATCH", httpStatus: 400 });
        }
        const row = await models.Invoice.create({ invoiceId: createId("invoice"), instituteId: context.instituteId, invoiceNumber: p.invoiceNumber || invoiceNumber(), studentId: student.studentId, studentFeeId: p.studentFeeId || "", branchId: student.branchId, issueDate: p.issueDate || new Date(), dueDate: p.dueDate, description: p.description, amount: p.amount, paidAmount: 0, outstandingAmount: p.amount, currency: "INR", status: invoiceStatus(p.amount, 0, p.dueDate, p.status || "issued"), createdByActionId: action.actionId, updatedByActionId: action.actionId });
        registerCreateUndo(undo, models.Invoice, row);
        result = { entity: "invoice", record: recordObject(row) };
        break;
      }
      case "finance.invoice.update": {
        const row = await models.Invoice.findOne({ instituteId: context.instituteId, invoiceId: p.invoiceId });
        registerUpdateUndo(undo, row);
        const nextAmount = p.amount ?? row.amount;
        if (nextAmount < row.paidAmount) throw Object.assign(new Error("Invoice amount cannot be lower than already recorded receipts."), { code: "INVOICE_AMOUNT_BELOW_RECORDED", httpStatus: 409 });
        if (p.amount !== undefined) row.amount = p.amount;
        if (p.dueDate !== undefined) row.dueDate = p.dueDate;
        if (p.description !== undefined) row.description = p.description;
        row.outstandingAmount = Math.max(0, row.amount - row.paidAmount);
        row.status = invoiceStatus(row.amount, row.paidAmount, row.dueDate, p.status || row.status);
        row.updatedByActionId = action.actionId; await row.save();
        result = { entity: "invoice", record: recordObject(row) };
        break;
      }
      case "finance.receipt.record": {
        const invoice = await models.Invoice.findOne({ instituteId: context.instituteId, invoiceId: p.invoiceId });
        if (["cancelled", "draft"].includes(invoice.status)) throw Object.assign(new Error("Receipt cannot be recorded for draft or cancelled invoice."), { code: "INVOICE_NOT_RECEIVABLE", httpStatus: 409 });
        if (p.amount > invoice.outstandingAmount) throw Object.assign(new Error("Manual receipt amount exceeds current outstanding amount."), { code: "RECEIPT_EXCEEDS_OUTSTANDING", httpStatus: 409 });
        registerUpdateUndo(undo, invoice);
        const row = await models.Receipt.create({ receiptId: createId("receipt"), instituteId: context.instituteId, receiptNumber: p.receiptNumber || receiptNumber(), invoiceId: invoice.invoiceId, studentId: invoice.studentId, branchId: invoice.branchId, amount: p.amount, currency: "INR", paymentMethod: p.paymentMethod, reference: p.reference, recordedAt: p.recordedAt || new Date(), recordedByUserId: context.userId, sourceType: "manual_offline", verificationStatus: "recorded_unverified", note: p.note || "", status: "active", actionId: action.actionId });
        registerCreateUndo(undo, models.Receipt, row);
        invoice.paidAmount = Number((invoice.paidAmount + p.amount).toFixed(2));
        invoice.outstandingAmount = Math.max(0, Number((invoice.amount - invoice.paidAmount).toFixed(2)));
        invoice.status = invoiceStatus(invoice.amount, invoice.paidAmount, invoice.dueDate, invoice.status);
        invoice.updatedByActionId = action.actionId; await invoice.save();
        result = { entity: "manual_receipt", record: recordObject(row), invoice: recordObject(invoice), livePaymentPerformed: false, settlementVerified: false };
        break;
      }
      case "finance.receipt.correction_request": {
        const receipt = await models.Receipt.findOne({ instituteId: context.instituteId, receiptId: p.receiptId });
        const existing = await models.Correction.findOne({ instituteId: context.instituteId, receiptId: receipt.receiptId, status: "pending_review" });
        if (existing) result = { entity: "receipt_correction_request", idempotentExisting: true, record: recordObject(existing) };
        else {
          registerUpdateUndo(undo, receipt);
          const row = await models.Correction.create({ correctionId: createId("receiptcorrection"), instituteId: context.instituteId, receiptId: receipt.receiptId, invoiceId: receipt.invoiceId, studentId: receipt.studentId, reason: p.reason, requestedAmount: p.requestedAmount ?? null, note: p.note || "", status: "pending_review", requestedByUserId: context.userId, actionId: action.actionId });
          registerCreateUndo(undo, models.Correction, row);
          receipt.status = "correction_requested"; await receipt.save();
          result = { entity: "receipt_correction_request", record: recordObject(row) };
        }
        break;
      }
      case "finance.due_list.generate": {
        const generated = await dueList(models, context, p.branchId || "", p.asOfDate || "", p.minimumDue ?? 0);
        const row = await models.Report.create({ reportId: createId("finreport"), instituteId: context.instituteId, reportType: "due_list", branchId: p.branchId || "", filters: { asOfDate: p.asOfDate || "", minimumDue: p.minimumDue ?? 0 }, summary: generated.summary, rows: generated.rows, generatedByUserId: context.userId, generatedAt: new Date(), actionId: action.actionId });
        registerCreateUndo(undo, models.Report, row);
        result = { entity: "due_list", record: recordObject(row) };
        break;
      }
      case "finance.reminder.create": {
        const invoice = await models.Invoice.findOne({ instituteId: context.instituteId, invoiceId: p.invoiceId });
        if (invoice.outstandingAmount <= 0) throw Object.assign(new Error("Paid invoice does not need a fee reminder."), { code: "INVOICE_ALREADY_PAID", httpStatus: 409 });
        const row = await models.Reminder.create({ reminderId: createId("feereminder"), instituteId: context.instituteId, invoiceId: invoice.invoiceId, studentId: invoice.studentId, branchId: invoice.branchId, recipientRole: "student_parent", message: p.message, dueDate: p.dueDate || invoice.dueDate, channel: "in_app", deliveryStatus: "queued_in_app", externalDeliveryPerformed: false, createdByUserId: context.userId, actionId: action.actionId });
        registerCreateUndo(undo, models.Reminder, row);
        result = { entity: "fee_reminder", record: recordObject(row), externalDeliveryPerformed: false };
        break;
      }
      case "finance.student_statement.generate": {
        const generated = await studentStatement(models, context, p.studentId, p);
        const row = await models.Report.create({ reportId: createId("finreport"), instituteId: context.instituteId, reportType: "student_statement", studentId: p.studentId, filters: { fromDate: p.fromDate || "", toDate: p.toDate || "" }, summary: generated.summary, rows: [...generated.invoices.map(item => ({ recordType: "invoice", ...item })), ...generated.receipts.map(item => ({ recordType: "manual_receipt", ...item }))].slice(0, MAX_REPORT_ROWS), generatedByUserId: context.userId, generatedAt: new Date(), actionId: action.actionId });
        registerCreateUndo(undo, models.Report, row);
        result = { entity: "student_statement", record: recordObject(row) };
        break;
      }
      case "finance.summary.generate": {
        const generated = await financeSummary(models, context, p.branchId || "", p.fromDate || "", p.toDate || "");
        const row = await models.Report.create({ reportId: createId("finreport"), instituteId: context.instituteId, reportType: "finance_summary", branchId: p.branchId || "", filters: { fromDate: p.fromDate || "", toDate: p.toDate || "" }, summary: generated.summary, rows: [], generatedByUserId: context.userId, generatedAt: new Date(), actionId: action.actionId });
        registerCreateUndo(undo, models.Report, row);
        result = { entity: "finance_summary", record: recordObject(row) };
        break;
      }
      default: throw Object.assign(new Error("No executor for this Part 131 action."), { code: "FINANCE_EXECUTOR_MISSING", httpStatus: 500 });
    }
    return result;
  } catch (error) {
    let rollbackApplied = false;
    for (const step of undo.reverse()) { try { await step(); rollbackApplied = true; } catch {} }
    error.rollbackApplied = rollbackApplied;
    throw error;
  }
}
async function confirmAndExecute(models, context, actionId, exactConfirmation, manualReceiptAcknowledgement) {
  const action = await models.Action.findOne({ actionId, instituteId: context.instituteId, actorUserId: context.userId });
  if (!action) throw Object.assign(new Error("Finance action not found for this user."), { code: "FINANCE_ACTION_NOT_FOUND", httpStatus: 404 });
  if (action.status === "executed_native") return { action, idempotentReplay: true };
  if (action.status !== "preview_ready") throw Object.assign(new Error(`Action cannot execute from status ${action.status}.`), { code: "FINANCE_ACTION_STATE_CONFLICT", httpStatus: 409 });
  if (new Date(action.previewExpiresAt).getTime() <= Date.now()) { action.status = "expired"; await action.save(); throw Object.assign(new Error("Finance preview expired. Create a fresh preview."), { code: "FINANCE_PREVIEW_EXPIRED", httpStatus: 410 }); }
  if (sha256(String(exactConfirmation ?? "").trim()) !== action.confirmationDigest) throw Object.assign(new Error(`Exact confirmation required: ${confirmationText(action)}`), { code: "EXACT_CONFIRMATION_REQUIRED", httpStatus: 400 });
  if (action.manualReceiptAcknowledgementRequired && String(manualReceiptAcknowledgement ?? "").trim() !== MANUAL_RECEIPT_ACK) throw Object.assign(new Error(`Manual receipt acknowledgement required: ${MANUAL_RECEIPT_ACK}`), { code: "MANUAL_RECEIPT_ACKNOWLEDGEMENT_REQUIRED", httpStatus: 400 });
  await validateAction(models, context, action.actionType, action.payload);
  const claimed = await models.Action.findOneAndUpdate({ _id: action._id, status: "preview_ready" }, { status: "executing" }, { new: true });
  if (!claimed) throw Object.assign(new Error("Another request is executing this finance action."), { code: "FINANCE_EXECUTION_IN_PROGRESS", httpStatus: 409 });
  try {
    const result = await executeAction(models, context, claimed);
    claimed.status = "executed_native"; claimed.executedAt = new Date(); claimed.result = result; claimed.failureCode = ""; claimed.failureMessage = ""; claimed.rollbackApplied = false;
    await claimed.save();
    await writeAudit(models, context, claimed, "action_executed", "native_success", { entity: result.entity, livePaymentPerformed: false });
    return { action: claimed, idempotentReplay: false };
  } catch (error) {
    claimed.status = "failed"; claimed.failureCode = cleanText(error.code || "FINANCE_EXECUTION_FAILED", 120); claimed.failureMessage = cleanText(error.message || "Finance action failed.", 500); claimed.rollbackApplied = Boolean(error.rollbackApplied);
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
function inferActionType(command = "") { for (const [actionType, pattern] of ACTION_PATTERNS) if (pattern.test(command)) return actionType; return ""; }
function parseCommand(command = "") {
  const text = cleanLong(command, 3000);
  if (SENSITIVE_PATTERN.test(text)) throw Object.assign(new Error("Password, OTP, banking or secret data VANI command me mat likhiye."), { code: "SENSITIVE_COMMAND_BLOCKED", httpStatus: 400 });
  if (BLOCKED_MONEY_PATTERN.test(text)) throw Object.assign(new Error("Part 131 card charge, refund, money transfer or settlement execute nahi karta."), { code: "LIVE_MONEY_COMMAND_BLOCKED", httpStatus: 400 });
  if (DESTRUCTIVE_PATTERN.test(text)) throw Object.assign(new Error("Part 131 destructive finance commands support nahi karta."), { code: "DESTRUCTIVE_COMMAND_BLOCKED", httpStatus: 400 });
  const actionType = inferActionType(text);
  if (!actionType) throw Object.assign(new Error("Finance action samajh nahi aaya. Catalog example use karein."), { code: "FINANCE_COMMAND_NOT_RECOGNISED", httpStatus: 400 });
  return { actionType, payload: extractKeyValues(text) };
}
function roleRecordFilter(context, scope) {
  const filter = { instituteId: context.instituteId };
  if (context.role === "institute_owner" || scope.instituteWide) return filter;
  if (BRANCH_SCOPED_ROLES.has(context.role)) filter.branchId = { $in: scope.branchIds };
  return filter;
}
async function scopedRecords(models, context) {
  const scope = await loadScope(context);
  if (["student", "parent"].includes(context.role)) return { feeStructures: [], studentFees: [], invoices: [], receipts: [], corrections: [], reminders: [], reports: [] };
  if (!FINANCE_ROLES.has(context.role)) throw Object.assign(new Error("Finance records are unavailable for this role."), { code: "FINANCE_RECORDS_ROLE_DENIED", httpStatus: 403 });
  if (BRANCH_SCOPED_ROLES.has(context.role) && !scope.available) throw Object.assign(new Error("Owner-assigned finance scope required."), { code: "ROLE_SCOPE_REQUIRED", httpStatus: 403 });
  const filter = roleRecordFilter(context, scope);
  const [feeStructures, studentFees, invoices, receipts, corrections, reminders, reports] = await Promise.all([
    models.FeeStructure.find(filter).sort({ createdAt: -1 }).limit(100).lean(),
    models.StudentFee.find(filter).sort({ createdAt: -1 }).limit(100).lean(),
    models.Invoice.find(filter).sort({ createdAt: -1 }).limit(100).lean(),
    models.Receipt.find(filter).sort({ createdAt: -1 }).limit(100).lean(),
    models.Correction.find({ instituteId: context.instituteId }).sort({ createdAt: -1 }).limit(100).lean(),
    models.Reminder.find(filter).sort({ createdAt: -1 }).limit(100).lean(),
    models.Report.find(filter).sort({ createdAt: -1 }).limit(100).lean(),
  ]);
  return { feeStructures, studentFees, invoices, receipts, corrections, reminders, reports };
}
async function recordMetrics(models, context) {
  const scope = await loadScope(context);
  if (["student", "parent"].includes(context.role)) return {};
  const filter = roleRecordFilter(context, scope);
  const [invoices, receipts] = await Promise.all([
    models.Invoice.find(filter).limit(MAX_REPORT_ROWS).lean(),
    models.Receipt.find({ ...filter, status: { $in: ["active", "correction_requested"] } }).limit(MAX_REPORT_ROWS).lean(),
  ]);
  return {
    invoiceCount: invoices.length,
    invoiceTotal: invoices.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    recordedManualOfflineTotal: receipts.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    outstandingTotal: invoices.reduce((sum, row) => sum + Number(row.outstandingAmount || 0), 0),
    overdueInvoiceCount: invoices.filter(row => row.status === "overdue").length,
    unverifiedReceiptCount: receipts.filter(row => row.verificationStatus === "recorded_unverified").length,
    liveSettlementVerified: false,
  };
}

export function registerPart131VaniFeesFinanceOperations({ app } = {}) {
  if (!app || typeof app.get !== "function" || typeof app.post !== "function") throw new Error("Part 131 registration failed: Express app required.");
  if (app.locals.part131VaniFinanceRegistered) return;
  app.locals.part131VaniFinanceRegistered = true;
  const models = defineModels();

  app.get(["/finance-vani", "/fees-finance-vani", "/part131"], (req, res) => res.sendFile(path.join(frontendDir, "naxora-finance-vani.html")));
  app.get("/naxora-finance-vani.css", (req, res) => res.type("text/css").sendFile(path.join(frontendDir, "naxora-finance-vani.css")));
  app.get("/naxora-finance-vani.js", (req, res) => res.type("application/javascript").sendFile(path.join(frontendDir, "naxora-finance-vani.js")));
  app.get("/naxora-part131-global-vani-bridge.js", (req, res) => res.type("application/javascript").sendFile(path.join(frontendDir, "naxora-part131-global-vani-bridge.js")));

  app.get("/api/part131/status", (req, res) => res.json({ success: true, part: PART_NUMBER, name: PART_NAME, status: "vani_fees_finance_operations_active", page: "/finance-vani", actionCount: Object.keys(ACTION_DEFINITIONS).length, feeStructures: true, studentFeeAssignments: true, invoices: true, manualOfflineReceipts: true, receiptCorrectionRequests: true, dueLists: true, inAppFeeReminders: true, studentStatements: true, financeSummaries: true, roleAndBranchScope: true, previewRequired: true, exactConfirmationRequired: true, manualReceiptAcknowledgementRequired: true, livePaymentCollectionEnabled: false, directRefundEnabled: false, bankSettlementEnabled: false, externalReminderDeliveryEnabled: false, allFeatureVaniComplete: false, targetFinalAcceptancePart: 136, nextPart: 132, nextPartName: "VANI Admissions and CRM Operations" }));
  app.get("/api/part131/security-policy", (req, res) => res.json({ success: true, part: PART_NUMBER, instituteIsolation: true, roleMatrixEnforced: true, part124BranchScopeEnforced: true, studentSelfStatementScope: true, parentLinkedChildStatementScope: true, part128ReferencesValidated: true, exactConfirmationRequired: true, duplicateProtectionMinutes: DUPLICATE_WINDOW_MS / 60000, partialFailureRollback: true, manualReceiptStatus: "recorded_unverified", manualReceiptAcknowledgementText: MANUAL_RECEIPT_ACK, liveCardChargeBlocked: true, liveUpiCollectionBlocked: true, refundBlocked: true, bankTransferExecutionBlocked: true, subscriptionBillingDataNotModified: true, passwordsOtpSecretsBlocked: true, destructiveCommandsBlocked: true }));
  app.get("/api/part131/catalog", (req, res) => {
    const examples = {
      "finance.fee_structure.create": 'fee structure create title="JEE Monthly Fee" billingCycle=monthly amount=3500 branchId=BRANCH_ID dueDay=10',
      "finance.fee_structure.update": 'fee structure update structureId=STRUCTURE_ID amount=3800 lateFeeAmount=100',
      "finance.student_fee.assign": 'student fee assign studentId=STUDENT_ID structureId=STRUCTURE_ID startDate=2026-08-01 discountAmount=500',
      "finance.student_fee.update": 'student fee update studentFeeId=STUDENT_FEE_ID discountAmount=750',
      "finance.invoice.create": 'invoice create studentId=STUDENT_ID amount=3000 dueDate=2026-08-10 description="August tuition fee"',
      "finance.invoice.update": 'invoice update invoiceId=INVOICE_ID dueDate=2026-08-15',
      "finance.receipt.record": 'receipt record invoiceId=INVOICE_ID amount=1500 paymentMethod=cash reference=OFFLINE-RCT-101 note="Counter receipt"',
      "finance.receipt.correction_request": 'receipt correction request receiptId=RECEIPT_ID reason="Wrong reference entered"',
      "finance.due_list.generate": 'due list generate branchId=BRANCH_ID asOfDate=2026-08-15 minimumDue=1',
      "finance.reminder.create": 'fee reminder create invoiceId=INVOICE_ID message="Please review the pending fee in your private NAXORA account."',
      "finance.student_statement.generate": 'student fee statement generate studentId=STUDENT_ID',
      "finance.summary.generate": 'finance summary generate branchId=BRANCH_ID fromDate=2026-08-01 toDate=2026-08-31',
    };
    res.json({ success: true, part: PART_NUMBER, actions: Object.entries(ACTION_DEFINITIONS).map(([actionType, definition]) => ({ actionType, ...definition, example: examples[actionType] })) });
  });
  app.get("/api/part131/demo", (req, res) => res.json({ success: true, part: PART_NUMBER, flow: ["Authenticated role gives a finance command", "Role, institute and branch scope are validated", "Part 128 references are validated", "Preview and exact confirmation are generated", "MongoDB finance record is written", "Manual receipt remains recorded_unverified and does not move money", "Audit and result are stored"], notSupported: ["Card or UPI payment collection", "Refund or bank settlement", "Razorpay subscription mutation", "External SMS/WhatsApp/email delivery — Part 133", "All-feature VANI completion — target Part 136 acceptance"] }));

  app.post("/api/part131/actions/preview", authenticated, async (req, res) => {
    try {
      const result = await createPreview(models, req.part131Context, cleanText(req.body?.actionType, 120), req.body?.payload || {});
      res.json({ success: true, part: PART_NUMBER, action: publicAction(result.action), reusedPreview: result.reusedPreview, replyText: `${result.action.actionLabel} preview ready. Exact confirmation required hai.` });
    } catch (error) {
      res.status(error.httpStatus || 500).json({ success: false, part: PART_NUMBER, code: error.code || "FINANCE_PREVIEW_FAILED", message: error.message, missingFields: error.missingFields || [], existingAction: error.existingAction || null });
    }
  });
  app.post("/api/part131/vani/command", authenticated, async (req, res) => {
    try {
      const command = cleanLong(req.body?.command, 3000);
      const parsed = parseCommand(command);
      const result = await createPreview(models, req.part131Context, parsed.actionType, parsed.payload);
      res.json({ success: true, part: PART_NUMBER, command, interpretedActionType: parsed.actionType, interpretedPayload: result.action.payload, action: publicAction(result.action), reusedPreview: result.reusedPreview, replyText: `${result.action.actionLabel} ka preview ready hai. Finance VANI screen par review aur exact-confirm karein.`, openModuleKey: "finance-vani" });
    } catch (error) {
      res.status(error.httpStatus || 500).json({ success: false, part: PART_NUMBER, code: error.code || "FINANCE_COMMAND_FAILED", message: error.message, missingFields: error.missingFields || [], openModuleKey: "finance-vani" });
    }
  });
  app.post("/api/part131/actions/:actionId/confirm", authenticated, async (req, res) => {
    try {
      const result = await confirmAndExecute(models, req.part131Context, cleanId(req.params.actionId), req.body?.confirmationText, req.body?.manualReceiptAcknowledgement);
      res.json({ success: true, part: PART_NUMBER, action: publicAction(result.action), idempotentReplay: result.idempotentReplay, livePaymentPerformed: false, refundPerformed: false, replyText: result.idempotentReplay ? "Ye finance action pehle hi safely execute ho chuka hai." : "Finance action MongoDB me successfully execute ho gaya. Koi live money movement nahi hua." });
    } catch (error) {
      res.status(error.httpStatus || 500).json({ success: false, part: PART_NUMBER, code: error.code || "FINANCE_EXECUTION_FAILED", message: error.message, action: error.action ? publicAction(error.action) : null, rollbackApplied: Boolean(error.rollbackApplied || error.action?.rollbackApplied) });
    }
  });
  app.post("/api/part131/actions/:actionId/cancel", authenticated, async (req, res) => {
    const action = await models.Action.findOne({ actionId: cleanId(req.params.actionId), instituteId: req.part131Context.instituteId, actorUserId: req.part131Context.userId });
    if (!action) return res.status(404).json({ success: false, part: PART_NUMBER, code: "FINANCE_ACTION_NOT_FOUND", message: "Finance action not found." });
    if (action.status === "preview_ready") { action.status = "cancelled"; action.cancelledAt = new Date(); await action.save(); await writeAudit(models, req.part131Context, action, "action_cancelled", "success"); }
    return res.json({ success: true, part: PART_NUMBER, action: publicAction(action) });
  });
  app.get("/api/part131/actions", authenticated, async (req, res) => {
    const actions = await models.Action.find({ instituteId: req.part131Context.instituteId, ...(req.part131Context.role === "institute_owner" ? {} : { actorUserId: req.part131Context.userId }) }).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, part: PART_NUMBER, actions: actions.map(publicAction) });
  });
  app.get("/api/part131/records", authenticated, async (req, res) => {
    try {
      const [metrics, records] = await Promise.all([recordMetrics(models, req.part131Context), scopedRecords(models, req.part131Context)]);
      res.json({ success: true, part: PART_NUMBER, metrics, records });
    } catch (error) {
      res.status(error.httpStatus || 500).json({ success: false, part: PART_NUMBER, code: error.code || "FINANCE_RECORDS_FAILED", message: error.message });
    }
  });
  app.get("/api/part131/student-statement", authenticated, async (req, res) => {
    try {
      const studentId = cleanId(req.query?.studentId);
      if (!studentId) throw Object.assign(new Error("studentId required."), { code: "STUDENT_ID_REQUIRED", httpStatus: 400 });
      const payload = { studentId, fromDate: cleanDate(req.query?.fromDate), toDate: cleanDate(req.query?.toDate) };
      await validateAction(models, req.part131Context, "finance.student_statement.generate", payload);
      const statement = await studentStatement(models, req.part131Context, studentId, payload);
      res.json({ success: true, part: PART_NUMBER, statement });
    } catch (error) {
      res.status(error.httpStatus || 500).json({ success: false, part: PART_NUMBER, code: error.code || "STUDENT_STATEMENT_FAILED", message: error.message });
    }
  });
}
