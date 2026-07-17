import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { resolvePart116Access } from "./part116-subscription-access-control.js";

const PART_NUMBER = 124;
const PART_NAME = "Parent, Staff and Branch Role Consolidation";

const WORKSPACE_ROLES = new Set([
  "parent",
  "branch_manager",
  "accountant",
  "counsellor",
  "staff",
]);
const OWNER_ROLES = new Set(["institute_owner", "owner", "instituteowner"]);
const ALLOWED_ROLES = new Set([...WORKSPACE_ROLES, ...OWNER_ROLES]);

const INSTITUTE_FIELDS = Object.freeze([
  "instituteId",
  "institute_id",
  "tenantId",
  "tenant_id",
]);
const BRANCH_FIELDS = Object.freeze([
  "branchId",
  "branch_id",
  "campusId",
  "campus_id",
  "locationId",
  "location_id",
  "centreId",
  "centerId",
]);
const STUDENT_FIELDS = Object.freeze([
  "studentId",
  "student_id",
  "learnerId",
  "learner_id",
  "studentProfileId",
  "profileId",
  "admissionId",
  "admission_id",
  "enrollmentId",
  "enrolmentId",
]);
const PARENT_FIELDS = Object.freeze([
  "parentId",
  "parent_id",
  "guardianId",
  "guardian_id",
  "parentUserId",
  "guardianUserId",
  "parentIdentityId",
  "guardianIdentityId",
]);

const PROFILE_CONFIG = Object.freeze({
  parent: {
    title: "Parent Workspace",
    subtitle: "Child progress, attendance, fees and safe parent updates.",
    homeKey: "parent-app",
    route: "/parent-workspace",
    scopeMode: "child",
    modules: [
      {
        key: "parent-app",
        label: "Parent Workspace",
        description: "Unified child progress and parent-safe overview.",
        category: "Parent Core",
        route: "/parent-workspace",
        icon: "parent",
        alwaysAvailable: true,
      },
      {
        key: "vani-v2",
        label: "Parent VANI",
        description: "Role-safe parent assistant and navigation.",
        category: "AI & VANI",
        route: "/vani",
        icon: "voice",
        featureKey: "vani.v2",
      },
    ],
    metrics: [
      ["children", [/student/i, /learner/i, /admission/i, /enrol/i]],
      ["attendance", [/attendance/i]],
      ["fees", [/fee/i, /invoice/i, /receipt/i, /payment/i]],
      ["assignments", [/assignment/i, /homework/i, /task/i]],
      ["results", [/result/i, /exam/i, /test/i, /score/i, /grade/i]],
      ["notices", [/notice/i, /announcement/i, /message/i]],
    ],
  },
  branch_manager: {
    title: "Branch Workspace",
    subtitle: "Branch operations, students, attendance, reports and performance.",
    homeKey: "branch-workspace",
    route: "/branch-workspace",
    scopeMode: "branch",
    modules: [
      {
        key: "branch-workspace",
        label: "Branch Workspace",
        description: "Unified branch operations and role-safe overview.",
        category: "Branch Core",
        route: "/branch-workspace",
        icon: "branches",
        alwaysAvailable: true,
      },
      {
        key: "students",
        label: "Students",
        description: "Branch-safe Student records and operations.",
        category: "Branch Operations",
        route: "/student",
        icon: "users",
        featureKey: "students.manage",
      },
      {
        key: "attendance",
        label: "Attendance",
        description: "Branch classroom attendance and records.",
        category: "Branch Operations",
        route: "/attendance",
        icon: "check",
        featureKey: "attendance.manage",
      },
      {
        key: "reports",
        label: "Reports",
        description: "Branch-safe reports and summaries.",
        category: "Branch Operations",
        route: "/reports",
        icon: "chart",
        featureKey: "reports.basic",
      },
      {
        key: "branches",
        label: "Branch Command Centre",
        description: "Authorised branch comparison and operations.",
        category: "Branch Operations",
        route: "/multi-branch-command-centre",
        icon: "branches",
        featureKey: "branches.command_centre",
      },
      {
        key: "vani-v2",
        label: "Branch VANI",
        description: "Role-safe branch assistant and navigation.",
        category: "AI & VANI",
        route: "/vani",
        icon: "voice",
        featureKey: "vani.v2",
      },
    ],
    metrics: [
      ["students", [/student/i, /enrol/i, /admission/i]],
      ["teachers", [/teacher/i, /faculty/i, /instructor/i]],
      ["attendance", [/attendance/i]],
      ["fees", [/fee/i, /invoice/i, /receipt/i, /payment/i]],
      ["leads", [/lead/i, /enquir/i, /counsell/i]],
      ["batches", [/batch/i, /class/i, /course/i]],
    ],
  },
  accountant: {
    title: "Accountant Workspace",
    subtitle: "Fees, receipts, invoices and finance reports.",
    homeKey: "accountant-workspace",
    route: "/accountant-workspace",
    scopeMode: "assigned_or_institute",
    modules: [
      {
        key: "accountant-workspace",
        label: "Accountant Workspace",
        description: "Unified finance overview and account-safe operations.",
        category: "Accounts Core",
        route: "/accountant-workspace",
        icon: "wallet",
        alwaysAvailable: true,
      },
      {
        key: "fees",
        label: "Fees",
        description: "Fee records, receipts and collection controls.",
        category: "Accounts",
        route: "/fees",
        icon: "wallet",
        featureKey: "fees.manage",
      },
      {
        key: "reports",
        label: "Reports",
        description: "Finance-safe reports and summaries.",
        category: "Accounts",
        route: "/reports",
        icon: "chart",
        featureKey: "reports.basic",
      },
      {
        key: "vani-v2",
        label: "Accounts VANI",
        description: "Role-safe accounts assistant and navigation.",
        category: "AI & VANI",
        route: "/vani",
        icon: "voice",
        featureKey: "vani.v2",
      },
    ],
    metrics: [
      ["fees", [/fee/i]],
      ["invoices", [/invoice/i]],
      ["receipts", [/receipt/i]],
      ["payments", [/payment/i, /transaction/i]],
      ["refundRecords", [/refund/i]],
      ["students", [/student/i, /enrol/i]],
    ],
  },
  counsellor: {
    title: "Counsellor Workspace",
    subtitle: "Leads, enquiries, admissions and consent-aware follow-up.",
    homeKey: "counsellor-workspace",
    route: "/counsellor-workspace",
    scopeMode: "assigned_or_institute",
    modules: [
      {
        key: "counsellor-workspace",
        label: "Counsellor Workspace",
        description: "Unified leads, admissions and follow-up overview.",
        category: "Counselling Core",
        route: "/counsellor-workspace",
        icon: "support",
        alwaysAvailable: true,
      },
      {
        key: "students",
        label: "Students",
        description: "Student and admission-related records.",
        category: "Counselling",
        route: "/student",
        icon: "users",
        featureKey: "students.manage",
      },
      {
        key: "marketing",
        label: "Automated Marketing",
        description: "Consent-aware campaigns and lead follow-up.",
        category: "Counselling",
        route: "/automated-marketing",
        icon: "megaphone",
        featureKey: "marketing.automation",
      },
      {
        key: "vani-v2",
        label: "Counsellor VANI",
        description: "Role-safe counselling assistant and navigation.",
        category: "AI & VANI",
        route: "/vani",
        icon: "voice",
        featureKey: "vani.v2",
      },
    ],
    metrics: [
      ["leads", [/lead/i]],
      ["enquiries", [/enquir/i, /inquiry/i]],
      ["admissions", [/admission/i, /enrol/i]],
      ["followUps", [/follow.*up/i, /callback/i, /counsell/i]],
      ["students", [/student/i]],
      ["campaigns", [/campaign/i, /marketing/i]],
    ],
  },
  staff: {
    title: "Staff Workspace",
    subtitle: "Assigned branch operations, attendance, records and tasks.",
    homeKey: "staff-workspace",
    route: "/staff-workspace",
    scopeMode: "assigned_or_institute",
    modules: [
      {
        key: "staff-workspace",
        label: "Staff Workspace",
        description: "Unified staff operations and assigned work overview.",
        category: "Staff Core",
        route: "/staff-workspace",
        icon: "building",
        alwaysAvailable: true,
      },
      {
        key: "students",
        label: "Students",
        description: "Role-safe Student operations.",
        category: "Staff Operations",
        route: "/student",
        icon: "users",
        featureKey: "students.manage",
      },
      {
        key: "attendance",
        label: "Attendance",
        description: "Assigned attendance and classroom operations.",
        category: "Staff Operations",
        route: "/attendance",
        icon: "check",
        featureKey: "attendance.manage",
      },
      {
        key: "vani-v2",
        label: "Staff VANI",
        description: "Role-safe staff assistant and navigation.",
        category: "AI & VANI",
        route: "/vani",
        icon: "voice",
        featureKey: "vani.v2",
      },
    ],
    metrics: [
      ["students", [/student/i, /enrol/i]],
      ["attendance", [/attendance/i]],
      ["batches", [/batch/i, /class/i, /course/i]],
      ["notices", [/notice/i, /announcement/i]],
      ["tasks", [/task/i, /work/i]],
      ["leads", [/lead/i, /enquir/i]],
    ],
  },
});

const COMMAND_ALIASES = Object.freeze({
  parent: "parent-app",
  child: "parent-app",
  branch: "branch-workspace",
  students: "students",
  student: "students",
  attendance: "attendance",
  hazri: "attendance",
  reports: "reports",
  report: "reports",
  fees: "fees",
  fee: "fees",
  accounts: "accountant-workspace",
  accountant: "accountant-workspace",
  counsellor: "counsellor-workspace",
  counselor: "counsellor-workspace",
  marketing: "marketing",
  staff: "staff-workspace",
  vani: "vani-v2",
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
function cleanId(value = "") {
  return String(value || "").trim().replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 180);
}
function cleanIdList(values, max = 100) {
  const list = Array.isArray(values)
    ? values
    : String(values || "").split(/[\n,]/g);
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
function safeEqualText(left, right) {
  const a = crypto.createHash("sha256").update(String(left || "")).digest();
  const b = crypto.createHash("sha256").update(String(right || "")).digest();
  return crypto.timingSafeEqual(a, b);
}
function verifyOwnerAction(req) {
  const expected = String(process.env.NAXORA_OWNER_ACTION_SECRET || "").trim();
  if (!expected) {
    const error = new Error("NAXORA_OWNER_ACTION_SECRET Render Environment me configure karein.");
    error.code = "OWNER_ACTION_SECRET_MISSING";
    error.httpStatus = 503;
    throw error;
  }
  const supplied = String(req.headers["x-naxora-owner-action-secret"] || "").trim();
  if (!supplied || !safeEqualText(supplied, expected)) {
    const error = new Error("Private owner verification failed.");
    error.code = "OWNER_VERIFICATION_FAILED";
    error.httpStatus = 403;
    throw error;
  }
}
function requestedWorkspaceRole(req, actualRole) {
  const requested = normalizeRole(
    req.headers["x-naxora-workspace-role"] ||
    req.body?.workspaceRole ||
    req.query?.workspaceRole ||
    ""
  );
  if (OWNER_ROLES.has(actualRole)) {
    if (!requested || !WORKSPACE_ROLES.has(requested)) return requested || "parent";
    return requested;
  }
  if (requested && requested !== actualRole) {
    const error = new Error("Workspace role does not match login role.");
    error.code = "WORKSPACE_ROLE_MISMATCH";
    error.httpStatus = 403;
    throw error;
  }
  return actualRole;
}
function baseContext(req) {
  const existing = req.part120Context || req.user || req.auth || null;
  const payload = existing || (getBearer(req) ? verifyJwt(getBearer(req)) : null);

  if (!payload) {
    const error = new Error("Role login required.");
    error.code = "ROLE_LOGIN_REQUIRED";
    error.httpStatus = 401;
    throw error;
  }

  const actualRole = normalizeRole(
    payload.role || payload.userRole || payload.accountRole || payload.user?.role || ""
  );
  if (!ALLOWED_ROLES.has(actualRole)) {
    const error = new Error("This role is not supported by Part 124.");
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
    payload.userId ||
    payload.identityId ||
    payload.id ||
    payload._id ||
    payload.sub ||
    "user"
  );

  const workspaceRole = requestedWorkspaceRole(req, actualRole);

  return {
    actualRole: OWNER_ROLES.has(actualRole) ? "institute_owner" : actualRole,
    workspaceRole,
    instituteId,
    userId,
    identityId: cleanId(payload.identityId || payload.sub || userId),
    displayName: cleanText(
      payload.displayName ||
      payload.name ||
      payload.fullName ||
      payload.email ||
      workspaceRole,
      120
    ),
    supervisorMode: OWNER_ROLES.has(actualRole),
  };
}
function roleContext(req, res, next) {
  try {
    req.part124Role = baseContext(req);
    next();
  } catch (error) {
    res.status(error.httpStatus || 401).json({
      success: false,
      part: PART_NUMBER,
      code: error.code || "ROLE_AUTH_FAILED",
      message: error.message,
    });
  }
}
function ownerContext(req, res, next) {
  try {
    const context = baseContext(req);
    if (!context.supervisorMode) {
      const error = new Error("Only institute_owner can manage role scopes.");
      error.code = "OWNER_ONLY";
      error.httpStatus = 403;
      throw error;
    }
    req.part124Role = context;
    next();
  } catch (error) {
    res.status(error.httpStatus || 401).json({
      success: false,
      part: PART_NUMBER,
      code: error.code || "OWNER_AUTH_FAILED",
      message: error.message,
      privateScreenFirst: true,
    });
  }
}
function dbReady() {
  return mongoose.connection?.readyState === 1;
}
function defineModels() {
  const scopeSchema = new mongoose.Schema({
    instituteId: { type: String, required: true, index: true },
    identityId: { type: String, required: true },
    role: {
      type: String,
      enum: [...WORKSPACE_ROLES],
      required: true,
      index: true,
    },
    branchIds: { type: [String], default: [] },
    childStudentIds: { type: [String], default: [] },
    instituteWide: { type: Boolean, default: false },
    status: { type: String, enum: ["active", "disabled"], default: "active" },
    createdByUserId: { type: String, required: true },
    updatedByUserId: { type: String, required: true },
  }, { timestamps: true, strict: true });
  scopeSchema.index({ instituteId: 1, identityId: 1 }, { unique: true });

  const auditSchema = new mongoose.Schema({
    instituteId: { type: String, required: true, index: true },
    actorUserId: { type: String, required: true },
    actorRole: { type: String, required: true },
    workspaceRole: { type: String, required: true },
    action: { type: String, required: true },
    result: { type: String, required: true },
    moduleKey: { type: String, default: "" },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  }, { timestamps: true, strict: true });

  return {
    Scope: mongoose.models.Part124RoleScopeAssignment ||
      mongoose.model("Part124RoleScopeAssignment", scopeSchema),
    Audit: mongoose.models.Part124RoleWorkspaceAudit ||
      mongoose.model("Part124RoleWorkspaceAudit", auditSchema),
  };
}
async function writeAudit(models, req, action, result, moduleKey = "", details = {}) {
  if (!dbReady()) return;
  try {
    await models.Audit.create({
      instituteId: req.part124Role?.instituteId || "unknown",
      actorUserId: req.part124Role?.userId || "user",
      actorRole: req.part124Role?.actualRole || "unknown",
      workspaceRole: req.part124Role?.workspaceRole || "unknown",
      action,
      result,
      moduleKey,
      details,
    });
  } catch {
    // Workspace remains usable when audit persistence fails.
  }
}
function modelField(model, candidates) {
  const paths = model?.schema?.paths || {};
  return candidates.find((candidate) => Boolean(paths[candidate])) || "";
}
function idVariants(values) {
  const variants = [];
  for (const value of cleanIdList(values)) {
    variants.push(value);
    if (mongoose.isValidObjectId(value)) {
      try {
        variants.push(new mongoose.Types.ObjectId(value));
      } catch {
        // Keep string variant only.
      }
    }
  }
  return variants;
}
function valueFilter(values) {
  const variants = idVariants(values);
  if (!variants.length) return null;
  return variants.length === 1 ? variants[0] : { $in: variants };
}
function usableOperationalModel(name = "") {
  return !/(audit|snapshot|sync|history|event|token|session|setting|template|webhook|readiness|subscription.*action|launch)/i.test(name);
}
async function scopeAssignment(models, context) {
  if (context.supervisorMode) {
    return {
      available: true,
      supervisorMode: true,
      status: "owner_supervisor",
      branchIds: [],
      childStudentIds: [],
      instituteWide: true,
      scopeMode: "institute",
    };
  }
  if (!dbReady()) {
    return {
      available: false,
      supervisorMode: false,
      status: "database_disconnected",
      branchIds: [],
      childStudentIds: [],
      instituteWide: false,
      scopeMode: "none",
    };
  }
  const assignment = await models.Scope.findOne({
    instituteId: context.instituteId,
    identityId: context.identityId,
    role: context.workspaceRole,
    status: "active",
  }).lean();

  if (!assignment) {
    return {
      available: false,
      supervisorMode: false,
      status: "scope_pending",
      branchIds: [],
      childStudentIds: [],
      instituteWide: false,
      scopeMode: "none",
    };
  }

  const branchIds = cleanIdList(assignment.branchIds);
  const childStudentIds = cleanIdList(assignment.childStudentIds);
  let scopeMode = "none";

  if (context.workspaceRole === "parent") {
    scopeMode = childStudentIds.length ? "child" : "none";
  } else if (assignment.instituteWide) {
    scopeMode = "institute";
  } else if (branchIds.length) {
    scopeMode = "branch";
  }

  return {
    available: scopeMode !== "none",
    supervisorMode: false,
    status: assignment.status,
    branchIds,
    childStudentIds,
    instituteWide: Boolean(assignment.instituteWide),
    scopeMode,
  };
}
function scopedFilterFor(model, context, scope) {
  const instituteField = modelField(model, INSTITUTE_FIELDS);
  if (!instituteField) {
    return { safe: false, reasonCode: "INSTITUTE_SCOPE_MISSING" };
  }

  const baseFilter = { [instituteField]: context.instituteId };

  if (context.supervisorMode) {
    return {
      safe: true,
      filter: baseFilter,
      instituteField,
      scopeType: "owner_institute",
      scopeField: null,
    };
  }

  if (!scope.available) {
    return { safe: false, reasonCode: "ROLE_SCOPE_PENDING", instituteField };
  }

  if (context.workspaceRole === "parent") {
    const parentField = modelField(model, PARENT_FIELDS);
    const studentField = modelField(model, STUDENT_FIELDS);
    const choices = [];

    if (parentField) {
      const parentValue = valueFilter([context.identityId, context.userId]);
      if (parentValue) choices.push({ [parentField]: parentValue });
    }
    if (studentField && scope.childStudentIds.length) {
      const studentValue = valueFilter(scope.childStudentIds);
      if (studentValue) choices.push({ [studentField]: studentValue });
    }
    if (!choices.length) {
      return {
        safe: false,
        reasonCode: "PARENT_OR_CHILD_SCOPE_FIELD_MISSING",
        instituteField,
      };
    }

    return {
      safe: true,
      filter: choices.length === 1
        ? { ...baseFilter, ...choices[0] }
        : { ...baseFilter, $or: choices },
      instituteField,
      scopeType: "parent_child",
      scopeField: parentField || studentField,
    };
  }

  if (scope.instituteWide && ["accountant", "counsellor", "staff"].includes(context.workspaceRole)) {
    return {
      safe: true,
      filter: baseFilter,
      instituteField,
      scopeType: "explicit_institute",
      scopeField: null,
    };
  }

  const branchField = modelField(model, BRANCH_FIELDS);
  if (!branchField || !scope.branchIds.length) {
    return {
      safe: false,
      reasonCode: "BRANCH_SCOPE_FIELD_MISSING",
      instituteField,
    };
  }
  const branchValue = valueFilter(scope.branchIds);
  if (!branchValue) {
    return {
      safe: false,
      reasonCode: "BRANCH_SCOPE_VALUE_MISSING",
      instituteField,
      branchField,
    };
  }

  return {
    safe: true,
    filter: { ...baseFilter, [branchField]: branchValue },
    instituteField,
    scopeType: "branch",
    scopeField: branchField,
  };
}
async function countModels(context, scope, patterns) {
  if (!dbReady()) {
    return {
      count: null,
      sourceModels: [],
      available: false,
      reasonCode: "DATABASE_DISCONNECTED",
    };
  }

  const names = mongoose.modelNames().filter((name) =>
    patterns.some((pattern) => pattern.test(name)) &&
    usableOperationalModel(name)
  );

  let count = 0;
  const sourceModels = [];
  const rejectedModels = [];

  for (const name of names) {
    try {
      const model = mongoose.models[name];
      const scoped = scopedFilterFor(model, context, scope);
      if (!scoped.safe) {
        rejectedModels.push({ name, reasonCode: scoped.reasonCode });
        continue;
      }

      const modelCount = await model.countDocuments(scoped.filter);
      count += Number(modelCount || 0);
      sourceModels.push({
        name,
        count: Number(modelCount || 0),
        scopeType: scoped.scopeType,
        scopeField: scoped.scopeField,
      });
    } catch {
      rejectedModels.push({ name, reasonCode: "COUNT_FAILED" });
    }
  }

  return {
    count,
    sourceModels,
    rejectedModels,
    available: sourceModels.length > 0,
    reasonCode: sourceModels.length ? "COUNT_READY" : "SAFE_ROLE_LINK_NOT_FOUND",
  };
}
async function metricsFor(context, scope) {
  const profile = PROFILE_CONFIG[context.workspaceRole];
  const entries = await Promise.all(
    profile.metrics.map(async ([key, patterns]) => [
      key,
      await countModels(context, scope, patterns),
    ])
  );
  return Object.fromEntries(entries);
}
async function accessSummary(context) {
  try {
    const accessRole = context.supervisorMode ? "institute_owner" : context.workspaceRole;
    const access = await resolvePart116Access({
      instituteId: context.instituteId,
      role: accessRole,
      userId: context.userId,
      persist: true,
    });

    return {
      available: true,
      basePlanCode: access.basePlanCode || "FREE",
      v3Active: Boolean(access.v3Active),
      roleEntitlements: access.roleEntitlements || [],
      entitlementCount: Array.isArray(access.roleEntitlements)
        ? access.roleEntitlements.length
        : 0,
      warnings: access.warnings || [],
    };
  } catch (error) {
    return {
      available: false,
      basePlanCode: "UNKNOWN",
      v3Active: false,
      roleEntitlements: [],
      entitlementCount: 0,
      warnings: [error.code || "PART116_ACCESS_UNAVAILABLE"],
    };
  }
}
function moduleDecision(module, access) {
  if (module.alwaysAvailable) return { allowed: true, reasonCode: "ACCESS_GRANTED" };
  if (!module.featureKey) return { allowed: true, reasonCode: "ACCESS_GRANTED" };
  if (!access.available) {
    return { allowed: false, reasonCode: "PART116_ACCESS_UNAVAILABLE" };
  }
  if (!access.roleEntitlements.includes(module.featureKey)) {
    return { allowed: false, reasonCode: "PLAN_OR_ROLE_ENTITLEMENT_REQUIRED" };
  }
  return { allowed: true, reasonCode: "ACCESS_GRANTED" };
}
function publicModule(module, decision) {
  return {
    key: module.key,
    label: module.label,
    description: module.description,
    category: module.category,
    route: module.route,
    icon: module.icon,
    featureKey: module.featureKey || null,
    allowed: decision.allowed,
    reasonCode: decision.reasonCode,
  };
}
async function moduleCatalogue(context) {
  const profile = PROFILE_CONFIG[context.workspaceRole];
  const access = await accessSummary(context);
  return {
    access,
    modules: profile.modules.map((module) =>
      publicModule(module, moduleDecision(module, access))
    ),
  };
}
function safeScopeSummary(scope) {
  return {
    available: scope.available,
    status: scope.status,
    scopeMode: scope.scopeMode,
    branchCount: scope.branchIds.length,
    childCount: scope.childStudentIds.length,
    instituteWide: scope.instituteWide,
    supervisorMode: scope.supervisorMode,
  };
}
function healthSummary(context, scope, metrics) {
  const names = new Set(mongoose.modelNames());
  return {
    databaseConnected: dbReady(),
    part116Access: names.has("Part116AccessSnapshot"),
    part120Identity: names.has("Part120UnifiedIdentity"),
    roleScopeModel: names.has("Part124RoleScopeAssignment"),
    roleScopeReady: context.supervisorMode || scope.available,
    safeRecordLinkDetected:
      context.supervisorMode ||
      Object.values(metrics).some((metric) => metric.available),
    roleWorkspaceAudit: names.has("Part124RoleWorkspaceAudit"),
  };
}
async function workspaceOverview(models, context) {
  const profile = PROFILE_CONFIG[context.workspaceRole];
  const scope = await scopeAssignment(models, context);
  const [access, metrics] = await Promise.all([
    accessSummary(context),
    metricsFor(context, scope),
  ]);

  const alerts = [];

  if (!dbReady()) {
    alerts.push({
      level: "critical",
      code: "DATABASE_DISCONNECTED",
      message: "MongoDB disconnected hai.",
    });
  }
  if (!access.available) {
    alerts.push({
      level: "warning",
      code: "ACCESS_ENGINE_UNAVAILABLE",
      message: "Part 116 role entitlement summary unavailable hai.",
    });
  }
  if (!context.supervisorMode && !scope.available) {
    alerts.push({
      level: "warning",
      code: "ROLE_SCOPE_PENDING",
      message: context.workspaceRole === "parent"
        ? "Owner ko Parent account ke saath child Student IDs assign karni hain."
        : "Owner ko branch scope ya explicit institute-wide scope assign karna hai.",
    });
  }

  const missingMetrics = Object.values(metrics).filter((metric) => !metric.available).length;
  if (!context.supervisorMode && missingMetrics) {
    alerts.push({
      level: "info",
      code: "SAFE_RECORD_LINK_PENDING",
      message: `${missingMetrics} metric groups me safe role scope/model mapping nahi mili. Doosre user ka data use nahi kiya gaya.`,
    });
  }

  return {
    profile: {
      role: context.workspaceRole,
      title: profile.title,
      subtitle: profile.subtitle,
      homeKey: profile.homeKey,
      route: profile.route,
    },
    actor: {
      actualRole: context.actualRole,
      displayName: context.displayName,
      supervisorMode: context.supervisorMode,
    },
    generatedAt: new Date().toISOString(),
    access,
    scope: safeScopeSummary(scope),
    metrics,
    health: healthSummary(context, scope, metrics),
    alerts,
    metricPrecision: context.supervisorMode
      ? "Owner supervisor mode uses institute-scoped aggregates."
      : scope.scopeMode === "child"
        ? "Parent mode uses direct Parent identity fields and Owner-assigned child Student references."
        : scope.scopeMode === "branch"
          ? "Role mode uses Owner-assigned branch IDs and institute scope."
          : scope.scopeMode === "institute"
            ? "Institute-wide role access was explicitly granted by the Owner."
            : "No safe role scope is active.",
  };
}
async function recentActivity(models, context) {
  if (!dbReady()) return [];

  const rows = await models.Audit.find({
    instituteId: context.instituteId,
    workspaceRole: context.workspaceRole,
    ...(context.supervisorMode ? {} : { actorUserId: context.userId }),
  })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();

  return rows.map((row) => ({
    id: String(row._id),
    action: cleanText(row.action || "activity", 100),
    result: cleanText(row.result || "", 60),
    moduleKey: cleanText(row.moduleKey || "", 100),
    actorRole: cleanText(row.actorRole || "", 40),
    createdAt: row.createdAt || null,
  }));
}
function findModule(command = "", modules = []) {
  const text = cleanText(command, 500).toLowerCase();
  for (const [alias, key] of Object.entries(COMMAND_ALIASES)) {
    if (text.includes(alias) && modules.some((module) => module.key === key)) return key;
  }
  for (const module of modules) {
    if (text.includes(module.label.toLowerCase()) || text.includes(module.key.toLowerCase())) {
      return module.key;
    }
  }
  return "";
}
function isOpenCommand(command = "") {
  return /(open|kholo|dikhao|show|launch|le chalo|screen|module)/i.test(command);
}
function confirmationForScope(identityId, role) {
  return `SET ROLE SCOPE ${identityId} ${role.toUpperCase()}`;
}
function scopePayload(body, role) {
  const branchIds = cleanIdList(body?.branchIds, 100);
  const childStudentIds = cleanIdList(body?.childStudentIds, 100);
  const instituteWide = Boolean(body?.instituteWide);

  if (role === "parent") {
    if (!childStudentIds.length) {
      const error = new Error("Parent scope ke liye at least one child Student ID required.");
      error.code = "CHILD_SCOPE_REQUIRED";
      error.httpStatus = 400;
      throw error;
    }
    return {
      branchIds: [],
      childStudentIds,
      instituteWide: false,
    };
  }

  if (role === "branch_manager") {
    if (!branchIds.length) {
      const error = new Error("Branch Manager scope ke liye at least one Branch ID required.");
      error.code = "BRANCH_SCOPE_REQUIRED";
      error.httpStatus = 400;
      throw error;
    }
    return {
      branchIds,
      childStudentIds: [],
      instituteWide: false,
    };
  }

  if (!instituteWide && !branchIds.length) {
    const error = new Error("Branch IDs ya explicit institute-wide access select karein.");
    error.code = "ROLE_SCOPE_REQUIRED";
    error.httpStatus = 400;
    throw error;
  }

  return {
    branchIds: instituteWide ? [] : branchIds,
    childStudentIds: [],
    instituteWide,
  };
}

export async function getPart124RoleOverview({
  instituteId,
  userId = "user",
  identityId = "",
  displayName = "User",
  actualRole = "parent",
  workspaceRole = "",
} = {}) {
  const models = defineModels();
  const normalizedActualRole = normalizeRole(actualRole);
  const normalizedWorkspaceRole = normalizeRole(workspaceRole || actualRole);
  return workspaceOverview(models, {
    instituteId: cleanId(instituteId),
    userId: cleanId(userId),
    identityId: cleanId(identityId || userId),
    displayName: cleanText(displayName, 120),
    actualRole: OWNER_ROLES.has(normalizedActualRole)
      ? "institute_owner"
      : normalizedActualRole,
    workspaceRole: normalizedWorkspaceRole,
    supervisorMode: OWNER_ROLES.has(normalizedActualRole),
  });
}

export function registerPart124RoleConsolidation({ app } = {}) {
  if (!app || typeof app.get !== "function" || typeof app.post !== "function") {
    throw new Error("Part 124 registration failed: Express app required.");
  }
  if (app.locals.part124RoleConsolidationRegistered) return;
  app.locals.part124RoleConsolidationRegistered = true;
  const models = defineModels();

  app.get([
    "/parent-workspace",
    "/branch-workspace",
    "/accountant-workspace",
    "/counsellor-workspace",
    "/staff-workspace",
    "/part124",
  ], (req, res) => {
    res.sendFile(path.join(frontendDir, "naxora-role-workspace.html"));
  });
  app.get("/role-scope-manager", (req, res) => {
    res.sendFile(path.join(frontendDir, "naxora-role-scope-manager.html"));
  });
  app.get("/naxora-role-workspace.css", (req, res) => {
    res.type("text/css").sendFile(path.join(frontendDir, "naxora-role-workspace.css"));
  });
  app.get("/naxora-role-workspace.js", (req, res) => {
    res.type("application/javascript").sendFile(path.join(frontendDir, "naxora-role-workspace.js"));
  });
  app.get("/naxora-role-scope-manager.js", (req, res) => {
    res.type("application/javascript").sendFile(path.join(frontendDir, "naxora-role-scope-manager.js"));
  });

  app.get("/api/part124/status", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      name: PART_NAME,
      status: "parent_staff_branch_role_consolidation_active",
      workspaceUrls: {
        parent: "/parent-workspace",
        branch_manager: "/branch-workspace",
        accountant: "/accountant-workspace",
        counsellor: "/counsellor-workspace",
        staff: "/staff-workspace",
      },
      roleScopeManagerUrl: "/role-scope-manager",
      integratedWithPart119Shell: true,
      commonLoginRequired: true,
      strictParentChildScoping: true,
      strictBranchScoping: true,
      explicitInstituteWideGrantRequired: true,
      ownerSupervisorMode: true,
      part116EntitlementFiltering: true,
      globalVaniRoleNavigation: true,
      globalVaniMultiStepExecution: false,
      globalVaniMultiStepTargetPart: 125,
      nextPart: 125,
      nextPartName: "Global VANI Multi-Step Actions",
    });
  });

  app.get("/api/part124/security-policy", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      supportedRoles: [...WORKSPACE_ROLES],
      instituteIdMatchRequired: true,
      workspaceRoleMustMatchLoginRole: true,
      ownerCanUseSupervisorMode: true,
      parentChildScopeOwnerAssigned: true,
      branchScopeOwnerAssigned: true,
      instituteWideAccessRequiresExplicitOwnerGrant: true,
      scopeChangesRequireExactConfirmation: true,
      scopeChangesRequirePrivateOwnerVerification: true,
      unscopedModelsNotCounted: true,
      arbitraryModuleUrlsBlocked: true,
      moduleRoutesComeFromAllowlist: true,
      subscriptionFilteringUsesPart116: true,
      passwordsAndSecretsNeverReturned: true,
      vaniNavigationOnlyInPart124: true,
    });
  });

  app.get("/api/part124/catalog", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      workspaces: Object.entries(PROFILE_CONFIG).map(([role, profile]) => ({
        role,
        title: profile.title,
        subtitle: profile.subtitle,
        route: profile.route,
        homeKey: profile.homeKey,
        moduleCount: profile.modules.length,
      })),
    });
  });

  app.get("/api/part124/overview", roleContext, async (req, res) => {
    try {
      const overview = await workspaceOverview(models, req.part124Role);
      res.json({ success: true, part: PART_NUMBER, overview });
    } catch (error) {
      res.status(500).json({
        success: false,
        part: PART_NUMBER,
        code: "ROLE_OVERVIEW_FAILED",
        message: error.message,
      });
    }
  });

  app.get("/api/part124/modules", roleContext, async (req, res) => {
    const catalogue = await moduleCatalogue(req.part124Role);
    res.json({
      success: true,
      part: PART_NUMBER,
      workspaceRole: req.part124Role.workspaceRole,
      access: catalogue.access,
      modules: catalogue.modules,
    });
  });

  app.get("/api/part124/activity", roleContext, async (req, res) => {
    const activity = await recentActivity(models, req.part124Role);
    res.json({
      success: true,
      part: PART_NUMBER,
      count: activity.length,
      activity,
    });
  });

  app.get("/api/part124/health", roleContext, async (req, res) => {
    const overview = await workspaceOverview(models, req.part124Role);
    const catalogue = await moduleCatalogue(req.part124Role);
    res.json({
      success: true,
      part: PART_NUMBER,
      workspaceRole: req.part124Role.workspaceRole,
      health: overview.health,
      scope: overview.scope,
      availableModules: catalogue.modules.filter((module) => module.allowed).length,
      blockedModules: catalogue.modules.filter((module) => !module.allowed).length,
    });
  });

  app.post("/api/part124/module/open", roleContext, async (req, res) => {
    const moduleKey = cleanText(req.body?.moduleKey || "", 100);
    const catalogue = await moduleCatalogue(req.part124Role);
    const module = catalogue.modules.find((item) => item.key === moduleKey);

    if (!module) {
      await writeAudit(models, req, "open_module", "failed", moduleKey, {
        reasonCode: "UNKNOWN_MODULE",
      });
      return res.status(404).json({
        success: false,
        part: PART_NUMBER,
        code: "UNKNOWN_ROLE_MODULE",
        message: "Unknown role workspace module.",
      });
    }

    if (!module.allowed) {
      await writeAudit(models, req, "open_module", "denied", moduleKey, {
        reasonCode: module.reasonCode,
      });
      return res.status(402).json({
        success: false,
        part: PART_NUMBER,
        code: module.reasonCode,
        message: "Current role or NAXORA plan does not allow this module.",
        module,
      });
    }

    await writeAudit(models, req, "open_module", "success", moduleKey);
    res.json({
      success: true,
      part: PART_NUMBER,
      module,
      openInsideUnifiedShell: true,
      arbitraryUrlAccepted: false,
    });
  });

  app.post("/api/part124/vani/command", roleContext, async (req, res) => {
    const command = cleanText(req.body?.command || "", 500);

    if (!command) {
      return res.status(400).json({
        success: false,
        part: PART_NUMBER,
        code: "VANI_COMMAND_REQUIRED",
        message: "VANI command required.",
      });
    }

    if (/secret|api key|password|otp|cvv|upi pin|aadhaar|pan|bank statement/i.test(command)) {
      await writeAudit(models, req, "vani_command", "blocked", "", {
        reasonCode: "SENSITIVE_DATA_REQUEST",
      });
      return res.json({
        success: true,
        part: PART_NUMBER,
        replyText: "Password, OTP, payment secret aur private identity details VANI ko mat boliye.",
        spokenSafeSummary: "Sensitive role details private rahengi.",
        actionExecuted: false,
        privateScreenFirst: true,
      });
    }

    try {
      const catalogue = await moduleCatalogue(req.part124Role);
      const moduleKey = findModule(command, catalogue.modules);

      if (moduleKey && isOpenCommand(command)) {
        const module = catalogue.modules.find((item) => item.key === moduleKey);
        if (!module) {
          return res.json({
            success: true,
            part: PART_NUMBER,
            replyText: "Requested role module nahi mila.",
            spokenSafeSummary: "Module nahi mila.",
            actionExecuted: false,
          });
        }
        if (!module.allowed) {
          await writeAudit(models, req, "vani_open_module", "denied", moduleKey, {
            reasonCode: module.reasonCode,
          });
          return res.json({
            success: true,
            part: PART_NUMBER,
            replyText: `${module.label} current role ya subscription me available nahi hai.`,
            spokenSafeSummary: "Yeh module abhi available nahi hai.",
            actionExecuted: false,
            openModuleKey: null,
            reasonCode: module.reasonCode,
          });
        }

        await writeAudit(models, req, "vani_open_module", "success", moduleKey);
        return res.json({
          success: true,
          part: PART_NUMBER,
          replyText: `${module.label} unified app ke andar khol rahi hoon.`,
          spokenSafeSummary: `${module.label} khol rahi hoon.`,
          openModuleKey: module.key,
          actionExecuted: true,
          actionLevel: "safe_navigation",
        });
      }

      if (/overview|summary|status|progress|aaj kya|dashboard|pending|alerts/i.test(command)) {
        const overview = await workspaceOverview(models, req.part124Role);
        const linkedCount = Object.values(overview.metrics)
          .filter((metric) => metric.available).length;

        await writeAudit(models, req, "vani_role_summary", "success");

        return res.json({
          success: true,
          part: PART_NUMBER,
          replyText: `${overview.profile.title} me ${linkedCount} metric groups safely linked hain, ${overview.alerts.length} alerts hain aur scope mode ${overview.scope.scopeMode} hai.`,
          spokenSafeSummary: `${overview.alerts.length} role workspace alerts hain.`,
          privateScreenDetails: {
            workspaceRole: overview.profile.role,
            basePlanCode: overview.access.basePlanCode,
            scope: overview.scope,
            linkedMetrics: Object.fromEntries(
              Object.entries(overview.metrics).map(([key, metric]) => [
                key,
                metric.available ? metric.count : null,
              ])
            ),
            alerts: overview.alerts,
          },
          actionExecuted: false,
        });
      }

      return res.json({
        success: true,
        part: PART_NUMBER,
        replyText: `Main ${PROFILE_CONFIG[req.part124Role.workspaceRole].title} summary dikha sakti hoon aur allowed modules open kar sakti hoon. Multi-step role actions Part 125 me preview aur confirmation ke saath connect honge.`,
        spokenSafeSummary: "Role Workspace navigation ready hai.",
        allowedModuleCount: catalogue.modules.filter((module) => module.allowed).length,
        actionExecuted: false,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        part: PART_NUMBER,
        code: "ROLE_VANI_FAILED",
        message: error.message,
      });
    }
  });

  app.get("/api/part124/admin/scope-accounts", ownerContext, async (req, res) => {
    if (!dbReady()) {
      return res.status(503).json({
        success: false,
        part: PART_NUMBER,
        code: "DATABASE_REQUIRED",
        message: "MongoDB connection required.",
      });
    }

    const Identity = mongoose.models.Part120UnifiedIdentity;
    if (!Identity) {
      return res.status(503).json({
        success: false,
        part: PART_NUMBER,
        code: "PART120_IDENTITY_MODEL_MISSING",
        message: "Part 120 identity model unavailable.",
      });
    }

    const accounts = await Identity.find({
      instituteId: req.part124Role.instituteId,
      role: { $in: [...WORKSPACE_ROLES] },
    })
      .select("displayName identifierCanonical role status")
      .sort({ role: 1, displayName: 1 })
      .lean();

    const assignments = await models.Scope.find({
      instituteId: req.part124Role.instituteId,
    }).lean();

    const assignmentMap = new Map(
      assignments.map((assignment) => [assignment.identityId, assignment])
    );

    res.json({
      success: true,
      part: PART_NUMBER,
      count: accounts.length,
      accounts: accounts.map((account) => {
        const identityId = String(account._id);
        const assignment = assignmentMap.get(identityId);
        return {
          identityId,
          displayName: account.displayName,
          identifier: account.identifierCanonical,
          role: account.role,
          accountStatus: account.status,
          scope: assignment
            ? {
                status: assignment.status,
                branchIds: assignment.branchIds || [],
                childStudentIds: assignment.childStudentIds || [],
                instituteWide: Boolean(assignment.instituteWide),
                updatedAt: assignment.updatedAt,
              }
            : null,
          confirmationTextRequired: confirmationForScope(identityId, account.role),
        };
      }),
    });
  });

  app.post("/api/part124/admin/scope-preview", ownerContext, async (req, res) => {
    try {
      if (!dbReady()) {
        const error = new Error("MongoDB connection required.");
        error.code = "DATABASE_REQUIRED";
        error.httpStatus = 503;
        throw error;
      }

      const Identity = mongoose.models.Part120UnifiedIdentity;
      const identityId = cleanId(req.body?.identityId);
      if (!Identity || !mongoose.isValidObjectId(identityId)) {
        const error = new Error("Valid Part 120 identity required.");
        error.code = "INVALID_IDENTITY";
        error.httpStatus = 400;
        throw error;
      }

      const account = await Identity.findOne({
        _id: identityId,
        instituteId: req.part124Role.instituteId,
        role: { $in: [...WORKSPACE_ROLES] },
      }).lean();

      if (!account) {
        const error = new Error("Role account not found in this institute.");
        error.code = "ROLE_ACCOUNT_NOT_FOUND";
        error.httpStatus = 404;
        throw error;
      }

      const parsed = scopePayload(req.body, account.role);
      res.json({
        success: true,
        part: PART_NUMBER,
        preview: {
          identityId,
          displayName: account.displayName,
          role: account.role,
          branchIds: parsed.branchIds,
          childStudentIds: parsed.childStudentIds,
          instituteWide: parsed.instituteWide,
          status: req.body?.status === "disabled" ? "disabled" : "active",
        },
        confirmationTextRequired: confirmationForScope(identityId, account.role),
        ownerVerificationRequired: true,
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "SCOPE_PREVIEW_FAILED",
        message: error.message,
      });
    }
  });

  app.post("/api/part124/admin/scope-confirmed", ownerContext, async (req, res) => {
    try {
      verifyOwnerAction(req);

      if (!dbReady()) {
        const error = new Error("MongoDB connection required.");
        error.code = "DATABASE_REQUIRED";
        error.httpStatus = 503;
        throw error;
      }

      const Identity = mongoose.models.Part120UnifiedIdentity;
      const identityId = cleanId(req.body?.identityId);
      if (!Identity || !mongoose.isValidObjectId(identityId)) {
        const error = new Error("Valid Part 120 identity required.");
        error.code = "INVALID_IDENTITY";
        error.httpStatus = 400;
        throw error;
      }

      const account = await Identity.findOne({
        _id: identityId,
        instituteId: req.part124Role.instituteId,
        role: { $in: [...WORKSPACE_ROLES] },
      }).lean();

      if (!account) {
        const error = new Error("Role account not found in this institute.");
        error.code = "ROLE_ACCOUNT_NOT_FOUND";
        error.httpStatus = 404;
        throw error;
      }

      const requiredConfirmation = confirmationForScope(identityId, account.role);
      if (String(req.body?.confirmationText || "").trim() !== requiredConfirmation) {
        const error = new Error(`Exact confirmation required: ${requiredConfirmation}`);
        error.code = "EXACT_CONFIRMATION_REQUIRED";
        error.httpStatus = 400;
        throw error;
      }

      const parsed = scopePayload(req.body, account.role);
      const status = req.body?.status === "disabled" ? "disabled" : "active";

      const assignment = await models.Scope.findOneAndUpdate(
        {
          instituteId: req.part124Role.instituteId,
          identityId,
        },
        {
          $set: {
            role: account.role,
            branchIds: parsed.branchIds,
            childStudentIds: parsed.childStudentIds,
            instituteWide: parsed.instituteWide,
            status,
            updatedByUserId: req.part124Role.userId,
          },
          $setOnInsert: {
            createdByUserId: req.part124Role.userId,
          },
        },
        { upsert: true, new: true, runValidators: true }
      ).lean();

      await writeAudit(models, req, "set_role_scope", "success", "role-scope-manager", {
        targetIdentityId: identityId,
        targetRole: account.role,
        branchCount: parsed.branchIds.length,
        childCount: parsed.childStudentIds.length,
        instituteWide: parsed.instituteWide,
        status,
      });

      res.json({
        success: true,
        part: PART_NUMBER,
        message: "Role scope saved. User ko next request se updated scope milega.",
        assignment: {
          identityId: assignment.identityId,
          role: assignment.role,
          branchIds: assignment.branchIds,
          childStudentIds: assignment.childStudentIds,
          instituteWide: assignment.instituteWide,
          status: assignment.status,
          updatedAt: assignment.updatedAt,
        },
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "SCOPE_SAVE_FAILED",
        message: error.message,
      });
    }
  });

  app.get("/api/part124/demo", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      name: PART_NAME,
      roleScopeManager: "/role-scope-manager",
      workspaces: Object.fromEntries(
        Object.entries(PROFILE_CONFIG).map(([role, profile]) => [role, profile.route])
      ),
      flow: [
        "Part 120 verifies the logged-in role and institute",
        "Owner assigns child, branch or explicit institute-wide scope",
        "Part 124 applies role scope before reading metrics",
        "Part 116 filters role modules by plan entitlements",
        "Allowed modules open through the Part 119 shell",
        "Role VANI provides summary and safe navigation",
      ],
      pending: {
        globalVaniActions: 125,
        crossModuleE2E: 126,
        productionLaunch: 127,
      },
    });
  });
}
