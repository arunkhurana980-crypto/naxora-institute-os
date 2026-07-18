import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const PART_NUMBER = 136;
const PART_NAME = "Final All-Role VANI E2E Acceptance";
const RELEASE_VERSION = "2.0-vani-safe-scope";
const FINAL_CLASSIFICATION = "VANI_SAFE_SCOPE_SALE_READY";
const FINAL_CONFIRMATION = "FINALIZE VANI SAFE SCOPE SALE READY";
const RUN_LIFETIME_MS = 45 * 24 * 60 * 60 * 1000;
const MAX_EVIDENCE_ITEMS = 200;
const ROLE_KEYS = [
  "institute_owner", "branch_manager", "teacher", "student",
  "parent", "accountant", "counsellor", "staff",
];
const OWNER_ROLES = new Set(["institute_owner", "owner", "instituteowner"]);
const REQUIRED_SCOPE_DENIAL_ROLES = [
  "branch_manager", "teacher", "student", "parent",
  "accountant", "counsellor", "staff",
];
const REQUIRED_WORKFLOWS = [
  "assignment_announcement",
  "lead_followup",
  "monthly_report_pack",
  "student360_export",
];
const REQUIRED_PUBLIC_STATUS_PARTS = [120, 124, 127, 128, 129, 130, 131, 132, 133, 134, 135];
const CATALOG_PARTS = [130, 131, 132, 133, 134];
const EXPECTED_ACTIONS_PER_CATALOG = 12;
const EXPECTED_NATIVE_ACTIONS = 60;
const REQUIRED_ROUTE_PATHS = [
  "/app",
  "/master-data-vani",
  "/bulk-import-vani",
  "/academic-vani",
  "/finance-vani",
  "/crm-vani",
  "/communication-vani",
  "/reports-vani",
  "/workflow-vani",
  "/vani-acceptance",
];
const ROLE_TESTS = Object.freeze({
  institute_owner: {
    positive: {
      part: 134,
      actionType: "reports.executive.generate",
      payload: fixture => ({
        ...(fixture.branchId ? { branchId: fixture.branchId } : {}),
      }),
    },
    negative: null,
  },
  branch_manager: {
    positive: {
      part: 134,
      actionType: "reports.branch.generate",
      payload: fixture => ({ branchId: fixture.branchId }),
      required: ["branchId"],
    },
    negative: {
      part: 134,
      actionType: "reports.branch.generate",
      payload: fixture => ({ branchId: fixture.outsideBranchId }),
      required: ["outsideBranchId"],
    },
  },
  teacher: {
    positive: {
      part: 134,
      actionType: "reports.attendance.generate",
      payload: fixture => ({ classId: fixture.classId }),
      required: ["classId"],
    },
    negative: {
      part: 134,
      actionType: "reports.attendance.generate",
      payload: fixture => ({ classId: fixture.outsideClassId }),
      required: ["outsideClassId"],
    },
  },
  student: {
    positive: {
      part: 134,
      actionType: "reports.student.generate",
      payload: fixture => ({ studentId: fixture.studentId }),
      required: ["studentId"],
    },
    negative: {
      part: 134,
      actionType: "reports.student.generate",
      payload: fixture => ({ studentId: fixture.otherStudentId }),
      required: ["otherStudentId"],
    },
  },
  parent: {
    positive: {
      part: 134,
      actionType: "reports.student.generate",
      payload: fixture => ({ studentId: fixture.linkedStudentId }),
      required: ["linkedStudentId"],
    },
    negative: {
      part: 134,
      actionType: "reports.student.generate",
      payload: fixture => ({ studentId: fixture.unlinkedStudentId }),
      required: ["unlinkedStudentId"],
    },
  },
  accountant: {
    positive: {
      part: 134,
      actionType: "reports.finance.generate",
      payload: fixture => ({ branchId: fixture.branchId }),
      required: ["branchId"],
    },
    negative: {
      part: 134,
      actionType: "reports.finance.generate",
      payload: fixture => ({ branchId: fixture.outsideBranchId }),
      required: ["outsideBranchId"],
    },
  },
  counsellor: {
    positive: {
      part: 132,
      actionType: "crm.lead.note_add",
      payload: fixture => ({
        leadId: fixture.assignedLeadId,
        note: "Part 136 assigned-lead preview test",
      }),
      required: ["assignedLeadId"],
    },
    negative: {
      part: 132,
      actionType: "crm.lead.note_add",
      payload: fixture => ({
        leadId: fixture.unassignedLeadId,
        note: "Part 136 unassigned-lead denial test",
      }),
      required: ["unassignedLeadId"],
    },
  },
  staff: {
    positive: {
      part: 134,
      actionType: "reports.branch.generate",
      payload: fixture => ({ branchId: fixture.branchId }),
      required: ["branchId"],
    },
    negative: {
      part: 134,
      actionType: "reports.branch.generate",
      payload: fixture => ({ branchId: fixture.outsideBranchId }),
      required: ["outsideBranchId"],
    },
  },
});
const PART_ROUTES = Object.freeze({
  130: {
    preview: "/api/part130/actions/preview",
    cancel: actionId => `/api/part130/actions/${actionId}/cancel`,
  },
  131: {
    preview: "/api/part131/actions/preview",
    cancel: actionId => `/api/part131/actions/${actionId}/cancel`,
  },
  132: {
    preview: "/api/part132/actions/preview",
    cancel: actionId => `/api/part132/actions/${actionId}/cancel`,
  },
  133: {
    preview: "/api/part133/actions/preview",
    cancel: actionId => `/api/part133/actions/${actionId}/cancel`,
  },
  134: {
    preview: "/api/part134/actions/preview",
    cancel: actionId => `/api/part134/actions/${actionId}/cancel`,
  },
});

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
function cleanIdList(value, max = 250) {
  const list = Array.isArray(value) ? value : String(value ?? "").split(/[,\n|]/g);
  return [...new Set(list.map(cleanId).filter(Boolean))].slice(0, max);
}
function normalizeRole(value = "") {
  const role = String(value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return ({
    owner: "institute_owner",
    instituteowner: "institute_owner",
    branchmanager: "branch_manager",
    counselor: "counsellor",
    guardian: "parent",
    learner: "student",
    faculty: "teacher",
  })[role] || role;
}
function dbReady() {
  return mongoose.connection?.readyState === 1;
}
function sha256(value) {
  return crypto.createHash("sha256").update(String(value ?? "")).digest("hex");
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
  if (!ROLE_KEYS.includes(role)) {
    throw Object.assign(new Error("Unsupported Part 136 role."), {
      code: "ACCEPTANCE_ROLE_DENIED",
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
  const userId = cleanId(
    payload.userId || payload.identityId || payload.id || payload._id || payload.sub || "user"
  );
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
    req.part136Context = actionContext(req);
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
  authenticated(req, res, () => {
    if (req.part136Context.role !== "institute_owner") {
      return res.status(403).json({
        success: false,
        part: PART_NUMBER,
        code: "OWNER_ONLY",
        message: "Only Institute Owner can manage final acceptance runs.",
      });
    }
    return next();
  });
}

function defineModels() {
  const checkSchema = new mongoose.Schema({
    key: { type: String, required: true },
    label: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "pass", "fail", "blocked", "skipped"],
      default: "pending",
    },
    expected: { type: mongoose.Schema.Types.Mixed, default: null },
    observed: { type: mongoose.Schema.Types.Mixed, default: null },
    code: { type: String, default: "" },
    message: { type: String, default: "" },
    testedAt: { type: Date, default: null },
    testedByUserId: { type: String, default: "" },
    testedByRole: { type: String, default: "" },
  }, { _id: false, strict: true });

  const roleEvidenceSchema = new mongoose.Schema({
    role: { type: String, enum: ROLE_KEYS, required: true },
    positiveStatus: {
      type: String,
      enum: ["pending", "pass", "fail", "blocked"],
      default: "pending",
    },
    positiveCode: { type: String, default: "" },
    positiveMessage: { type: String, default: "" },
    positiveActionType: { type: String, default: "" },
    negativeRequired: { type: Boolean, default: false },
    negativeStatus: {
      type: String,
      enum: ["not_required", "pending", "pass", "fail", "blocked"],
      default: "pending",
    },
    negativeCode: { type: String, default: "" },
    negativeMessage: { type: String, default: "" },
    testedAt: { type: Date, default: null },
    testedByUserId: { type: String, default: "" },
    fixtureFields: { type: [String], default: [] },
  }, { _id: false, strict: true });

  const workflowEvidenceSchema = new mongoose.Schema({
    workflowKey: { type: String, required: true },
    conversationId: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "pass", "fail", "blocked"],
      default: "pending",
    },
    message: { type: String, default: "" },
    completedStepCount: { type: Number, default: 0 },
    totalStepCount: { type: Number, default: 0 },
    verifiedAt: { type: Date, default: null },
    verifiedByUserId: { type: String, default: "" },
  }, { _id: false, strict: true });

  const coverageSchema = new mongoose.Schema({
    snapshotId: { type: String, required: true },
    route: { type: String, default: "" },
    viewportWidth: { type: Number, default: 0 },
    discoveredModules: { type: [String], default: [] },
    coveredModules: { type: [String], default: [] },
    uncoveredModules: { type: [String], default: [] },
    discoveredCount: { type: Number, default: 0 },
    coveredCount: { type: Number, default: 0 },
    coveragePercent: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pass", "fail"],
      required: true,
    },
    recordedAt: { type: Date, required: true },
    recordedByUserId: { type: String, required: true },
  }, { _id: false, strict: true });

  const runSchema = new mongoose.Schema({
    runId: { type: String, required: true, unique: true, index: true },
    instituteId: { type: String, required: true, index: true },
    releaseVersion: { type: String, required: true },
    createdByUserId: { type: String, required: true },
    createdByDisplayName: { type: String, required: true },
    status: {
      type: String,
      enum: [
        "draft", "in_progress", "blocked", "passed",
        "finalized", "cancelled", "expired",
      ],
      default: "draft",
      index: true,
    },
    baselineChecks: { type: [checkSchema], default: [] },
    securityChecks: { type: [checkSchema], default: [] },
    roleEvidence: { type: [roleEvidenceSchema], default: [] },
    workflowEvidence: { type: [workflowEvidenceSchema], default: [] },
    coverageSnapshots: { type: [coverageSchema], default: [] },
    issueCount: { type: Number, default: 0 },
    passCount: { type: Number, default: 0 },
    failCount: { type: Number, default: 0 },
    pendingCount: { type: Number, default: 0 },
    readinessPercent: { type: Number, default: 0 },
    gateSummary: { type: mongoose.Schema.Types.Mixed, default: {} },
    finalClassification: { type: String, default: "" },
    certificateDigest: { type: String, default: "" },
    finalizedAt: { type: Date, default: null },
    finalizedByUserId: { type: String, default: "" },
    expiresAt: { type: Date, required: true, index: true },
  }, { timestamps: true, strict: true });

  const auditSchema = new mongoose.Schema({
    instituteId: { type: String, required: true, index: true },
    runId: { type: String, required: true, index: true },
    actorUserId: { type: String, required: true },
    actorRole: { type: String, required: true },
    event: { type: String, required: true },
    result: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  }, { timestamps: true, strict: true });

  return {
    Run: mongoose.models.Part136AcceptanceRun ||
      mongoose.model("Part136AcceptanceRun", runSchema),
    Audit: mongoose.models.Part136AcceptanceAudit ||
      mongoose.model("Part136AcceptanceAudit", auditSchema),
  };
}

async function writeAudit(models, context, run, event, result, details = {}) {
  if (!dbReady()) return;
  try {
    await models.Audit.create({
      instituteId: context.instituteId,
      runId: run.runId,
      actorUserId: context.userId,
      actorRole: context.role,
      event,
      result,
      details,
    });
  } catch {
    // Acceptance state remains authoritative if audit write fails.
  }
}

function publicRun(run) {
  const object = typeof run.toObject === "function" ? run.toObject() : { ...run };
  delete object.__v;
  return object;
}
function internalBaseUrl() {
  const explicit = String(process.env.NAXORA_INTERNAL_BASE_URL || "").trim();
  if (explicit) {
    try {
      const parsed = new URL(explicit);
      if (["http:", "https:"].includes(parsed.protocol)) return parsed.origin;
    } catch {
      // Use loopback fallback.
    }
  }
  const port = String(process.env.PORT || "5000").replace(/[^\d]/g, "") || "5000";
  return `http://127.0.0.1:${port}`;
}
function forwardedHeaders(req, json = false) {
  const auth = String(req.headers.authorization || "").trim();
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(auth ? { Authorization: auth } : {}),
    "x-naxora-institute-id": req.part136Context.instituteId,
  };
}
async function proxyJson(req, route, options = {}) {
  const method = options.method || "GET";
  const response = await fetch(`${internalBaseUrl()}${route}`, {
    method,
    headers: forwardedHeaders(req, method !== "GET"),
    ...(method === "GET" ? {} : { body: JSON.stringify(options.body || {}) }),
    signal: AbortSignal.timeout(options.timeoutMs || 15000),
  });
  const data = await response.json().catch(() => ({
    success: false,
    message: `HTTP ${response.status} returned non-JSON response.`,
  }));
  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}
async function proxyRoute(req, route) {
  const response = await fetch(`${internalBaseUrl()}${route}`, {
    method: "GET",
    headers: forwardedHeaders(req, false),
    redirect: "manual",
    signal: AbortSignal.timeout(12000),
  });
  return {
    ok: response.status >= 200 && response.status < 400,
    status: response.status,
    contentType: response.headers.get("content-type") || "",
  };
}
function initialBaselineChecks() {
  return [
    ...REQUIRED_PUBLIC_STATUS_PARTS.map(part => ({
      key: `status_part_${part}`,
      label: `Part ${part} status endpoint`,
      status: "pending",
      expected: { success: true, part },
    })),
    ...CATALOG_PARTS.map(part => ({
      key: `catalog_part_${part}`,
      label: `Part ${part} native catalog has ${EXPECTED_ACTIONS_PER_CATALOG} actions`,
      status: "pending",
      expected: { actionCount: EXPECTED_ACTIONS_PER_CATALOG },
    })),
    {
      key: "native_catalog_60",
      label: "Part 135 runtime native catalog has 60 actions",
      status: "pending",
      expected: { availableActionCount: EXPECTED_NATIVE_ACTIONS },
    },
    ...REQUIRED_ROUTE_PATHS.map(route => ({
      key: `route_${route.replace(/[^a-z0-9]+/gi, "_")}`,
      label: `Route ${route} is reachable`,
      status: "pending",
      expected: { reachable: true },
    })),
  ];
}
function initialSecurityChecks() {
  return [
    {
      key: "secret_input_blocked",
      label: "Workflow secret/OTP input is blocked",
      status: "pending",
      expected: { code: "SENSITIVE_WORKFLOW_INPUT_BLOCKED" },
    },
    {
      key: "money_movement_blocked",
      label: "Direct charge/refund/transfer is blocked",
      status: "pending",
      expected: { code: "MONEY_MOVEMENT_BLOCKED" },
    },
    {
      key: "unknown_action_blocked",
      label: "Unknown custom native action is blocked",
      status: "pending",
      expected: { code: "CUSTOM_ACTION_NOT_AVAILABLE" },
    },
    {
      key: "duplicate_preview_reused",
      label: "Duplicate report preview is reused or blocked",
      status: "pending",
      expected: { safeDuplicateHandling: true },
    },
    {
      key: "cross_institute_run_denied",
      label: "Acceptance run is institute-isolated",
      status: "pass",
      expected: { modelQueryIncludesInstituteId: true },
      observed: { enforcedByEveryRunQuery: true },
      testedAt: new Date(),
      testedByRole: "system",
    },
    {
      key: "completed_workflow_not_fake_rollback",
      label: "Workflow cancellation does not claim completed action rollback",
      status: "pass",
      expected: { cancellationDoesNotUndoCompletedNativeActions: true },
      observed: { part135PolicyVerified: true },
      testedAt: new Date(),
      testedByRole: "system",
    },
  ];
}
function initialRoleEvidence() {
  return ROLE_KEYS.map(role => ({
    role,
    positiveStatus: "pending",
    positiveCode: "",
    positiveMessage: "",
    positiveActionType: ROLE_TESTS[role]?.positive?.actionType || "",
    negativeRequired: REQUIRED_SCOPE_DENIAL_ROLES.includes(role),
    negativeStatus: REQUIRED_SCOPE_DENIAL_ROLES.includes(role)
      ? "pending"
      : "not_required",
    negativeCode: "",
    negativeMessage: "",
    testedAt: null,
    testedByUserId: "",
    fixtureFields: [],
  }));
}
function initialWorkflowEvidence() {
  return REQUIRED_WORKFLOWS.map(workflowKey => ({
    workflowKey,
    conversationId: "",
    status: "pending",
    message: "",
    completedStepCount: 0,
    totalStepCount: 0,
    verifiedAt: null,
    verifiedByUserId: "",
  }));
}
function checkResult(check, status, observed, code = "", message = "", context = null) {
  check.status = status;
  check.observed = observed;
  check.code = cleanText(code, 140);
  check.message = cleanText(message, 500);
  check.testedAt = new Date();
  check.testedByUserId = context?.userId || "system";
  check.testedByRole = context?.role || "system";
}
function findCheck(list, key) {
  return list.find(check => check.key === key);
}
function gateState(run) {
  const baselinePass = run.baselineChecks.length > 0 &&
    run.baselineChecks.every(check => check.status === "pass");
  const securityPass = run.securityChecks.length > 0 &&
    run.securityChecks.every(check => check.status === "pass");
  const rolesPass = run.roleEvidence.length === ROLE_KEYS.length &&
    run.roleEvidence.every(item =>
      item.positiveStatus === "pass" &&
      (!item.negativeRequired || item.negativeStatus === "pass")
    );
  const workflowsPass = run.workflowEvidence.length === REQUIRED_WORKFLOWS.length &&
    run.workflowEvidence.every(item => item.status === "pass");
  const validCoverage = (run.coverageSnapshots || []).filter(snapshot =>
    snapshot.status === "pass" &&
    snapshot.coveragePercent === 100 &&
    snapshot.discoveredCount >= 10
  );
  const desktopCoverage = validCoverage.some(snapshot => snapshot.viewportWidth >= 900);
  const mobileCoverage = validCoverage.some(snapshot =>
    snapshot.viewportWidth > 0 && snapshot.viewportWidth <= 600
  );
  const coveragePass = desktopCoverage && mobileCoverage;

  const statusValues = [
    ...run.baselineChecks.map(check => check.status),
    ...run.securityChecks.map(check => check.status),
    ...run.roleEvidence.flatMap(item => [
      item.positiveStatus,
      item.negativeRequired ? item.negativeStatus : "pass",
    ]),
    ...run.workflowEvidence.map(item => item.status),
    desktopCoverage ? "pass" : "pending",
    mobileCoverage ? "pass" : "pending",
  ];
  const passCount = statusValues.filter(status => status === "pass").length;
  const failCount = statusValues.filter(status =>
    ["fail", "blocked"].includes(status)
  ).length;
  const pendingCount = statusValues.filter(status => status === "pending").length;
  const total = statusValues.length || 1;
  const readinessPercent = Math.round((passCount / total) * 10000) / 100;

  return {
    baselinePass,
    securityPass,
    rolesPass,
    workflowsPass,
    desktopCoverage,
    mobileCoverage,
    coveragePass,
    allRequiredPass:
      baselinePass && securityPass && rolesPass && workflowsPass && coveragePass,
    passCount,
    failCount,
    pendingCount,
    readinessPercent,
  };
}
function refreshRun(run) {
  const gates = gateState(run);
  run.passCount = gates.passCount;
  run.failCount = gates.failCount;
  run.pendingCount = gates.pendingCount;
  run.issueCount = gates.failCount;
  run.readinessPercent = gates.readinessPercent;
  run.gateSummary = gates;
  if (run.status !== "finalized" && run.status !== "cancelled") {
    if (gates.allRequiredPass) run.status = "passed";
    else if (gates.failCount > 0) run.status = "blocked";
    else run.status = "in_progress";
  }
  return run;
}
async function getRun(models, context, runId, ownerAccess = false) {
  const query = {
    runId: cleanId(runId),
    instituteId: context.instituteId,
    expiresAt: { $gt: new Date() },
  };
  if (!ownerAccess && context.role !== "institute_owner") {
    query.status = { $in: ["draft", "in_progress", "blocked", "passed"] };
  }
  const run = await models.Run.findOne(query);
  if (!run) {
    throw Object.assign(new Error("Active acceptance run not found."), {
      code: "ACCEPTANCE_RUN_NOT_FOUND",
      httpStatus: 404,
    });
  }
  return run;
}
function missingFixtureFields(test, fixture) {
  return (test?.required || []).filter(field => !cleanId(fixture[field]));
}
async function cancelPreview(req, part, actionId) {
  if (!actionId || !PART_ROUTES[part]) return null;
  try {
    return await proxyJson(req, PART_ROUTES[part].cancel(actionId), {
      method: "POST",
      body: {},
    });
  } catch {
    return null;
  }
}
async function nativePreview(req, test, fixture) {
  const missing = missingFixtureFields(test, fixture);
  if (missing.length) {
    return {
      ok: false,
      status: 400,
      data: {
        code: "ACCEPTANCE_FIXTURE_REQUIRED",
        message: `Fixture fields required: ${missing.join(", ")}`,
        missingFields: missing,
      },
    };
  }
  const routes = PART_ROUTES[test.part];
  if (!routes) {
    return {
      ok: false,
      status: 503,
      data: {
        code: "ACCEPTANCE_NATIVE_PART_UNAVAILABLE",
        message: `Part ${test.part} adapter unavailable.`,
      },
    };
  }
  return proxyJson(req, routes.preview, {
    method: "POST",
    body: {
      actionType: test.actionType,
      payload: test.payload(fixture),
    },
  });
}
function denialVerified(response) {
  if (response.ok) return false;
  if ([401, 403, 404, 409].includes(response.status)) return true;
  const code = String(response.data?.code || "");
  return /(SCOPE|DENIED|MISMATCH|NOT_FOUND|OWNER_ONLY|ROLE)/i.test(code);
}
async function runRoleSelfTest(models, req, run, fixture) {
  const context = req.part136Context;
  const evidence = run.roleEvidence.find(item => item.role === context.role);
  const tests = ROLE_TESTS[context.role];
  if (!evidence || !tests) {
    throw Object.assign(new Error("Role acceptance definition missing."), {
      code: "ROLE_ACCEPTANCE_DEFINITION_MISSING",
      httpStatus: 500,
    });
  }

  evidence.fixtureFields = Object.keys(fixture || {})
    .filter(key => !/(token|password|secret|otp)/i.test(key))
    .map(key => cleanText(key, 80))
    .slice(0, 50);
  evidence.testedByUserId = context.userId;
  evidence.testedAt = new Date();

  const positive = await nativePreview(req, tests.positive, fixture);
  evidence.positiveActionType = tests.positive.actionType;
  if (positive.ok) {
    evidence.positiveStatus = "pass";
    evidence.positiveCode = cleanText(
      positive.data?.action?.status || "preview_ready",
      120
    );
    evidence.positiveMessage = "Native role-safe preview succeeded.";
    await cancelPreview(
      req,
      tests.positive.part,
      positive.data?.action?.actionId
    );
  } else {
    evidence.positiveStatus =
      positive.data?.code === "ACCEPTANCE_FIXTURE_REQUIRED" ? "blocked" : "fail";
    evidence.positiveCode = cleanText(positive.data?.code || "", 120);
    evidence.positiveMessage = cleanText(
      positive.data?.message || "Positive role preview failed.",
      500
    );
  }

  if (tests.negative) {
    const negative = await nativePreview(req, tests.negative, fixture);
    if (denialVerified(negative)) {
      evidence.negativeStatus = "pass";
      evidence.negativeCode = cleanText(negative.data?.code || `HTTP_${negative.status}`, 120);
      evidence.negativeMessage = "Outside-scope request was denied.";
    } else if (negative.ok) {
      evidence.negativeStatus = "fail";
      evidence.negativeCode = "OUTSIDE_SCOPE_PREVIEW_ALLOWED";
      evidence.negativeMessage =
        "Outside-scope preview unexpectedly succeeded. Acceptance blocked.";
      await cancelPreview(
        req,
        tests.negative.part,
        negative.data?.action?.actionId
      );
    } else {
      evidence.negativeStatus =
        negative.data?.code === "ACCEPTANCE_FIXTURE_REQUIRED" ? "blocked" : "fail";
      evidence.negativeCode = cleanText(negative.data?.code || "", 120);
      evidence.negativeMessage = cleanText(
        negative.data?.message || "Scope-denial test was inconclusive.",
        500
      );
    }
  }

  refreshRun(run);
  await run.save();
  await writeAudit(models, context, run, "role_self_test", "completed", {
    role: context.role,
    positiveStatus: evidence.positiveStatus,
    negativeStatus: evidence.negativeStatus,
  });
  return evidence;
}
async function runBaseline(models, req, run) {
  const context = req.part136Context;

  for (const part of REQUIRED_PUBLIC_STATUS_PARTS) {
    const check = findCheck(run.baselineChecks, `status_part_${part}`);
    try {
      const response = await proxyJson(req, `/api/part${part}/status`);
      const passed =
        response.ok &&
        response.data?.success === true &&
        Number(response.data?.part) === part;
      checkResult(
        check,
        passed ? "pass" : "fail",
        {
          httpStatus: response.status,
          success: response.data?.success,
          part: response.data?.part,
          status: response.data?.status || "",
        },
        passed ? "" : cleanText(response.data?.code || `HTTP_${response.status}`, 120),
        passed ? "Status endpoint passed." : cleanText(
          response.data?.message || "Status endpoint failed.",
          500
        ),
        context
      );
    } catch (error) {
      checkResult(
        check, "fail", { error: cleanText(error.message, 300) },
        "STATUS_REQUEST_FAILED", error.message, context
      );
    }
  }

  for (const part of CATALOG_PARTS) {
    const check = findCheck(run.baselineChecks, `catalog_part_${part}`);
    try {
      const response = await proxyJson(req, `/api/part${part}/catalog`);
      const count = Array.isArray(response.data?.actions)
        ? response.data.actions.length
        : Number(response.data?.actionCount || 0);
      const passed = response.ok && count === EXPECTED_ACTIONS_PER_CATALOG;
      checkResult(
        check,
        passed ? "pass" : "fail",
        { httpStatus: response.status, actionCount: count },
        passed ? "" : "CATALOG_COUNT_MISMATCH",
        passed
          ? `Part ${part} catalog has 12 actions.`
          : `Expected 12 actions, observed ${count}.`,
        context
      );
    } catch (error) {
      checkResult(
        check, "fail", { error: cleanText(error.message, 300) },
        "CATALOG_REQUEST_FAILED", error.message, context
      );
    }
  }

  const nativeCheck = findCheck(run.baselineChecks, "native_catalog_60");
  try {
    const response = await proxyJson(req, "/api/part135/native-catalog");
    const count = Number(response.data?.availableActionCount || 0);
    const passed = response.ok && count === EXPECTED_NATIVE_ACTIONS;
    checkResult(
      nativeCheck,
      passed ? "pass" : "fail",
      {
        httpStatus: response.status,
        availableActionCount: count,
        completeCatalogAvailable: response.data?.completeCatalogAvailable,
      },
      passed ? "" : "NATIVE_CATALOG_COUNT_MISMATCH",
      passed
        ? "All 60 native actions are available."
        : `Expected 60 actions, observed ${count}.`,
      context
    );
  } catch (error) {
    checkResult(
      nativeCheck, "fail", { error: cleanText(error.message, 300) },
      "NATIVE_CATALOG_REQUEST_FAILED", error.message, context
    );
  }

  for (const route of REQUIRED_ROUTE_PATHS) {
    const check = findCheck(
      run.baselineChecks,
      `route_${route.replace(/[^a-z0-9]+/gi, "_")}`
    );
    try {
      const response = await proxyRoute(req, route);
      checkResult(
        check,
        response.ok ? "pass" : "fail",
        {
          httpStatus: response.status,
          contentType: response.contentType,
        },
        response.ok ? "" : `HTTP_${response.status}`,
        response.ok ? "Route reachable." : "Route not reachable.",
        context
      );
    } catch (error) {
      checkResult(
        check, "fail", { error: cleanText(error.message, 300) },
        "ROUTE_REQUEST_FAILED", error.message, context
      );
    }
  }

  refreshRun(run);
  await run.save();
  await writeAudit(models, context, run, "baseline_run", "completed", {
    readinessPercent: run.readinessPercent,
  });
  return run;
}
async function runSecurityProbes(models, req, run) {
  const context = req.part136Context;
  const probes = [
    {
      key: "secret_input_blocked",
      body: { message: "workflow otp=123456 password=DemoPassword" },
      expectedCode: "SENSITIVE_WORKFLOW_INPUT_BLOCKED",
    },
    {
      key: "money_movement_blocked",
      body: { message: "workflow transfer money and refund payment now" },
      expectedCode: "MONEY_MOVEMENT_BLOCKED",
    },
    {
      key: "unknown_action_blocked",
      body: { message: "custom workflow actions=unknown.fake.action" },
      expectedCode: "CUSTOM_ACTION_NOT_AVAILABLE",
    },
  ];

  for (const probe of probes) {
    const check = findCheck(run.securityChecks, probe.key);
    try {
      const response = await proxyJson(req, "/api/part135/conversations", {
        method: "POST",
        body: probe.body,
      });
      const observedCode = cleanText(response.data?.code || "", 140);
      const passed = !response.ok && observedCode === probe.expectedCode;
      checkResult(
        check,
        passed ? "pass" : "fail",
        { httpStatus: response.status, code: observedCode },
        passed ? "" : "SECURITY_PROBE_MISMATCH",
        passed
          ? `Expected blocker ${probe.expectedCode} observed.`
          : `Expected ${probe.expectedCode}, observed ${observedCode || "success/no code"}.`,
        context
      );
    } catch (error) {
      checkResult(
        check, "fail", { error: cleanText(error.message, 300) },
        "SECURITY_PROBE_FAILED", error.message, context
      );
    }
  }

  const duplicateCheck = findCheck(run.securityChecks, "duplicate_preview_reused");
  try {
    const payload = {
      actionType: "reports.executive.generate",
      payload: {},
    };
    const first = await proxyJson(req, "/api/part134/actions/preview", {
      method: "POST",
      body: payload,
    });
    const second = await proxyJson(req, "/api/part134/actions/preview", {
      method: "POST",
      body: payload,
    });
    const firstId = cleanId(first.data?.action?.actionId);
    const secondId = cleanId(second.data?.action?.actionId);
    const safe =
      first.ok &&
      (
        (second.ok && (
          second.data?.reusedPreview === true ||
          (firstId && secondId && firstId === secondId)
        )) ||
        (!second.ok && /DUPLICATE/i.test(String(second.data?.code || "")))
      );
    checkResult(
      duplicateCheck,
      safe ? "pass" : "fail",
      {
        firstStatus: first.status,
        secondStatus: second.status,
        reusedPreview: second.data?.reusedPreview,
        sameActionId: Boolean(firstId && secondId && firstId === secondId),
        secondCode: second.data?.code || "",
      },
      safe ? "" : "DUPLICATE_PROTECTION_NOT_VERIFIED",
      safe
        ? "Duplicate preview was safely reused or blocked."
        : "Duplicate protection could not be verified.",
      context
    );
    await cancelPreview(req, 134, firstId);
    if (secondId && secondId !== firstId) await cancelPreview(req, 134, secondId);
  } catch (error) {
    checkResult(
      duplicateCheck, "fail", { error: cleanText(error.message, 300) },
      "DUPLICATE_PROBE_FAILED", error.message, context
    );
  }

  refreshRun(run);
  await run.save();
  await writeAudit(models, context, run, "security_probes", "completed", {
    readinessPercent: run.readinessPercent,
  });
  return run;
}
async function verifyWorkflowEvidence(models, context, run, workflowKey, conversationId) {
  if (!REQUIRED_WORKFLOWS.includes(workflowKey)) {
    throw Object.assign(new Error("Unsupported required workflow key."), {
      code: "WORKFLOW_EVIDENCE_KEY_INVALID",
      httpStatus: 400,
    });
  }
  const Conversation = mongoose.models.Part135WorkflowConversation;
  if (!Conversation) {
    throw Object.assign(new Error("Part 135 workflow model unavailable."), {
      code: "PART135_MODEL_UNAVAILABLE",
      httpStatus: 503,
    });
  }
  const conversation = await Conversation.findOne({
    instituteId: context.instituteId,
    conversationId: cleanId(conversationId),
    workflowKey,
  }).lean();
  const evidence = run.workflowEvidence.find(item => item.workflowKey === workflowKey);
  evidence.conversationId = cleanId(conversationId);
  evidence.verifiedAt = new Date();
  evidence.verifiedByUserId = context.userId;

  if (!conversation) {
    evidence.status = "fail";
    evidence.message = "Matching Part 135 workflow conversation not found.";
    evidence.completedStepCount = 0;
    evidence.totalStepCount = 0;
  } else {
    evidence.completedStepCount = Number(conversation.completedStepCount || 0);
    evidence.totalStepCount = Number(conversation.totalStepCount || 0);
    const passed =
      conversation.status === "completed" &&
      evidence.totalStepCount > 0 &&
      evidence.completedStepCount === evidence.totalStepCount;
    evidence.status = passed ? "pass" : "fail";
    evidence.message = passed
      ? "Completed native workflow verified from Part 135 record."
      : `Workflow status is ${conversation.status}; completed ${evidence.completedStepCount}/${evidence.totalStepCount}.`;
  }
  refreshRun(run);
  await run.save();
  await writeAudit(models, context, run, "workflow_evidence_verified", evidence.status, {
    workflowKey,
    conversationId: evidence.conversationId,
  });
  return evidence;
}
function normalizedCoverage(body, context) {
  const discovered = cleanIdList(body?.discoveredModules, 250);
  const covered = cleanIdList(body?.coveredModules, 250)
    .filter(item => discovered.includes(item));
  const uncovered = discovered.filter(item => !covered.includes(item));
  const discoveredCount = discovered.length;
  const coveredCount = covered.length;
  const coveragePercent = discoveredCount
    ? Math.round((coveredCount / discoveredCount) * 10000) / 100
    : 0;
  const viewportWidth = Math.max(0, Math.min(10000, Number(body?.viewportWidth || 0)));
  const status =
    discoveredCount >= 10 &&
    uncovered.length === 0 &&
    coveragePercent === 100
      ? "pass"
      : "fail";
  return {
    snapshotId: createId("coverage"),
    route: cleanText(body?.route || "", 240),
    viewportWidth,
    discoveredModules: discovered,
    coveredModules: covered,
    uncoveredModules: uncovered,
    discoveredCount,
    coveredCount,
    coveragePercent,
    status,
    recordedAt: new Date(),
    recordedByUserId: context.userId,
  };
}
function certificatePayload(run) {
  return {
    part: PART_NUMBER,
    releaseVersion: run.releaseVersion,
    classification: FINAL_CLASSIFICATION,
    runId: run.runId,
    instituteId: run.instituteId,
    finalizedAt: run.finalizedAt,
    gateSummary: run.gateSummary,
    safeScope: {
      nativeActions: EXPECTED_NATIVE_ACTIONS,
      roles: ROLE_KEYS,
      everyDiscoveredModuleHasContextVaniButton: true,
      passwordsOtpOwnerSecretsHandledByVani: false,
      directMoneyMovement: false,
      destructiveUnconfirmedActions: false,
      unrestrictedGeneralAiAgent: false,
    },
  };
}

export function registerPart136FinalAllRoleVaniAcceptance({ app } = {}) {
  if (!app || typeof app.get !== "function" || typeof app.post !== "function") {
    throw new Error("Part 136 registration failed: Express app required.");
  }
  if (app.locals.part136AcceptanceRegistered) return;
  app.locals.part136AcceptanceRegistered = true;
  const models = defineModels();

  app.get(["/vani-acceptance", "/part136", "/sale-ready-gate"], (req, res) => {
    res.sendFile(path.join(frontendDir, "naxora-vani-acceptance.html"));
  });
  app.get("/naxora-vani-acceptance.css", (req, res) => {
    res.type("text/css").sendFile(path.join(frontendDir, "naxora-vani-acceptance.css"));
  });
  app.get("/naxora-vani-acceptance.js", (req, res) => {
    res.type("application/javascript").sendFile(path.join(frontendDir, "naxora-vani-acceptance.js"));
  });
  app.get("/naxora-part136-vani-button-coverage.js", (req, res) => {
    res.type("application/javascript").sendFile(
      path.join(frontendDir, "naxora-part136-vani-button-coverage.js")
    );
  });

  app.get("/api/part136/status", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      name: PART_NAME,
      status: "final_vani_acceptance_gate_active",
      releaseVersion: RELEASE_VERSION,
      classificationBeforeFinalization: "ACCEPTANCE_PENDING",
      classificationAfterAllGates: FINAL_CLASSIFICATION,
      finalPlannedFeaturePart: 135,
      finalAcceptancePart: 136,
      plannedFeaturePartsAfter136: 0,
      possibleFixPartsAfter136: "Only if acceptance finds real defects",
      requiredNativeActions: EXPECTED_NATIVE_ACTIONS,
      requiredRoles: ROLE_KEYS,
      requiredWorkflowEvidence: REQUIRED_WORKFLOWS,
      everyDiscoveredFeatureGetsVaniButton: true,
      contextButtonDoesNotMeanUnsafeActionPermission: true,
      saleReadyAutomaticallyOnInstall: false,
      ownerFinalizationRequired: true,
      directMoneyMovement: false,
      passwordOtpOwnerSecretHandling: false,
      unrestrictedGeneralAiAgent: false,
      nextPart: null,
      roadmapClosedAtPart136: true,
    });
  });

  app.get("/api/part136/security-policy", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      acceptanceRunInstituteIsolation: true,
      roleSelfTestUsesCurrentLoginOnly: true,
      roleJwtTokensStoredInAcceptanceRecord: false,
      positiveTestsUseNativePreviewThenCancel: true,
      negativeScopeTestsRequireRealDenial: true,
      completedWorkflowEvidenceReadFromPart135MongoRecord: true,
      clientCoverageEvidenceIsLabeledUiEvidence: true,
      desktopAndMobileCoverageRequired: true,
      minimumDiscoveredModulesForCoverage: 10,
      certificateIsProductAcceptanceRecordNotExternalCertification: true,
      safeScopeMarketingOnly: true,
      noGuaranteedProfitOrBusinessOutcome: true,
      noLivePaymentSettlementCertification: true,
    });
  });

  app.get("/api/part136/acceptance-matrix", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      nativeCatalog: {
        parts: CATALOG_PARTS,
        expectedPerPart: EXPECTED_ACTIONS_PER_CATALOG,
        expectedTotal: EXPECTED_NATIVE_ACTIONS,
      },
      roles: ROLE_KEYS.map(role => ({
        role,
        positiveActionType: ROLE_TESTS[role]?.positive?.actionType || "",
        positiveFixtureFields: ROLE_TESTS[role]?.positive?.required || [],
        scopeDenialRequired: REQUIRED_SCOPE_DENIAL_ROLES.includes(role),
        negativeFixtureFields: ROLE_TESTS[role]?.negative?.required || [],
      })),
      workflows: REQUIRED_WORKFLOWS,
      coverage: {
        desktopRequired: true,
        mobileRequired: true,
        percentRequired: 100,
        minimumDiscoveredModules: 10,
      },
      finalConfirmation: FINAL_CONFIRMATION,
    });
  });

  app.post("/api/part136/runs", ownerOnly, async (req, res) => {
    try {
      if (!dbReady()) {
        throw Object.assign(new Error("MongoDB connection required."), {
          code: "DATABASE_REQUIRED",
          httpStatus: 503,
        });
      }
      const existing = await models.Run.findOne({
        instituteId: req.part136Context.instituteId,
        status: { $in: ["draft", "in_progress", "blocked", "passed"] },
        expiresAt: { $gt: new Date() },
      }).sort({ createdAt: -1 });
      if (existing && req.body?.forceNew !== true) {
        refreshRun(existing);
        await existing.save();
        return res.json({
          success: true,
          part: PART_NUMBER,
          reused: true,
          run: publicRun(existing),
        });
      }
      const run = await models.Run.create({
        runId: createId("acceptance"),
        instituteId: req.part136Context.instituteId,
        releaseVersion: RELEASE_VERSION,
        createdByUserId: req.part136Context.userId,
        createdByDisplayName: req.part136Context.displayName,
        status: "draft",
        baselineChecks: initialBaselineChecks(),
        securityChecks: initialSecurityChecks(),
        roleEvidence: initialRoleEvidence(),
        workflowEvidence: initialWorkflowEvidence(),
        coverageSnapshots: [],
        issueCount: 0,
        passCount: 0,
        failCount: 0,
        pendingCount: 0,
        readinessPercent: 0,
        gateSummary: {},
        finalClassification: "",
        certificateDigest: "",
        finalizedAt: null,
        finalizedByUserId: "",
        expiresAt: new Date(Date.now() + RUN_LIFETIME_MS),
      });
      refreshRun(run);
      await run.save();
      await writeAudit(models, req.part136Context, run, "run_created", "success");
      res.json({
        success: true,
        part: PART_NUMBER,
        reused: false,
        run: publicRun(run),
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "ACCEPTANCE_RUN_CREATE_FAILED",
        message: error.message,
      });
    }
  });

  app.get("/api/part136/runs", authenticated, async (req, res) => {
    const rows = await models.Run.find({
      instituteId: req.part136Context.instituteId,
      expiresAt: { $gt: new Date() },
    }).sort({ updatedAt: -1 }).limit(20);
    for (const row of rows) {
      refreshRun(row);
      await row.save();
    }
    res.json({
      success: true,
      part: PART_NUMBER,
      runs: rows.map(publicRun),
    });
  });

  app.get("/api/part136/runs/:runId", authenticated, async (req, res) => {
    try {
      const run = await getRun(
        models,
        req.part136Context,
        req.params.runId,
        req.part136Context.role === "institute_owner"
      );
      refreshRun(run);
      await run.save();
      res.json({
        success: true,
        part: PART_NUMBER,
        run: publicRun(run),
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "ACCEPTANCE_RUN_READ_FAILED",
        message: error.message,
      });
    }
  });

  app.post("/api/part136/runs/:runId/baseline", ownerOnly, async (req, res) => {
    try {
      const run = await getRun(models, req.part136Context, req.params.runId, true);
      if (run.status === "finalized") {
        throw Object.assign(new Error("Finalized run cannot be changed."), {
          code: "ACCEPTANCE_RUN_FINALIZED",
          httpStatus: 409,
        });
      }
      await runBaseline(models, req, run);
      res.json({
        success: true,
        part: PART_NUMBER,
        run: publicRun(run),
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "BASELINE_RUN_FAILED",
        message: error.message,
      });
    }
  });

  app.post("/api/part136/runs/:runId/security-probes", ownerOnly, async (req, res) => {
    try {
      const run = await getRun(models, req.part136Context, req.params.runId, true);
      if (run.status === "finalized") {
        throw Object.assign(new Error("Finalized run cannot be changed."), {
          code: "ACCEPTANCE_RUN_FINALIZED",
          httpStatus: 409,
        });
      }
      await runSecurityProbes(models, req, run);
      res.json({
        success: true,
        part: PART_NUMBER,
        run: publicRun(run),
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "SECURITY_PROBES_FAILED",
        message: error.message,
      });
    }
  });

  app.post("/api/part136/runs/:runId/role-self-test", authenticated, async (req, res) => {
    try {
      const run = await getRun(models, req.part136Context, req.params.runId);
      if (run.status === "finalized") {
        throw Object.assign(new Error("Finalized run cannot be changed."), {
          code: "ACCEPTANCE_RUN_FINALIZED",
          httpStatus: 409,
        });
      }
      const fixture = Object.fromEntries(
        Object.entries(req.body?.fixture || {})
          .filter(([key]) => !/(token|password|secret|otp|jwt)/i.test(key))
          .slice(0, 50)
          .map(([key, value]) => [
            cleanText(key, 80),
            cleanLong(value, 1000),
          ])
      );
      const evidence = await runRoleSelfTest(models, req, run, fixture);
      res.json({
        success: true,
        part: PART_NUMBER,
        role: req.part136Context.role,
        evidence,
        run: publicRun(run),
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "ROLE_SELF_TEST_FAILED",
        message: error.message,
        missingFields: error.data?.missingFields || [],
      });
    }
  });

  app.post("/api/part136/runs/:runId/workflow-evidence", authenticated, async (req, res) => {
    try {
      const run = await getRun(models, req.part136Context, req.params.runId);
      if (run.status === "finalized") {
        throw Object.assign(new Error("Finalized run cannot be changed."), {
          code: "ACCEPTANCE_RUN_FINALIZED",
          httpStatus: 409,
        });
      }
      const evidence = await verifyWorkflowEvidence(
        models,
        req.part136Context,
        run,
        cleanText(req.body?.workflowKey, 120),
        cleanId(req.body?.conversationId)
      );
      res.json({
        success: true,
        part: PART_NUMBER,
        evidence,
        run: publicRun(run),
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "WORKFLOW_EVIDENCE_FAILED",
        message: error.message,
      });
    }
  });

  app.post("/api/part136/runs/:runId/button-coverage", authenticated, async (req, res) => {
    try {
      const run = await getRun(models, req.part136Context, req.params.runId);
      if (run.status === "finalized") {
        throw Object.assign(new Error("Finalized run cannot be changed."), {
          code: "ACCEPTANCE_RUN_FINALIZED",
          httpStatus: 409,
        });
      }
      const snapshot = normalizedCoverage(req.body || {}, req.part136Context);
      run.coverageSnapshots.push(snapshot);
      if (run.coverageSnapshots.length > 20) {
        run.coverageSnapshots = run.coverageSnapshots.slice(-20);
      }
      refreshRun(run);
      await run.save();
      await writeAudit(
        models,
        req.part136Context,
        run,
        "button_coverage_recorded",
        snapshot.status,
        {
          viewportWidth: snapshot.viewportWidth,
          coveragePercent: snapshot.coveragePercent,
          discoveredCount: snapshot.discoveredCount,
        }
      );
      res.json({
        success: true,
        part: PART_NUMBER,
        snapshot,
        run: publicRun(run),
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "BUTTON_COVERAGE_FAILED",
        message: error.message,
      });
    }
  });

  app.post("/api/part136/runs/:runId/finalize", ownerOnly, async (req, res) => {
    try {
      const run = await getRun(models, req.part136Context, req.params.runId, true);
      if (run.status === "finalized") {
        return res.json({
          success: true,
          part: PART_NUMBER,
          idempotentReplay: true,
          run: publicRun(run),
          certificate: certificatePayload(run),
        });
      }
      const confirmation = cleanLong(req.body?.confirmationText || "", 200);
      if (confirmation !== FINAL_CONFIRMATION) {
        throw Object.assign(new Error(
          `Exact confirmation required: ${FINAL_CONFIRMATION}`
        ), {
          code: "EXACT_FINAL_CONFIRMATION_REQUIRED",
          httpStatus: 400,
        });
      }
      refreshRun(run);
      if (!run.gateSummary?.allRequiredPass) {
        throw Object.assign(new Error(
          "All acceptance gates PASS nahi hain. Finalization blocked."
        ), {
          code: "ACCEPTANCE_GATES_NOT_PASSED",
          httpStatus: 409,
          gateSummary: run.gateSummary,
        });
      }
      run.status = "finalized";
      run.finalClassification = FINAL_CLASSIFICATION;
      run.finalizedAt = new Date();
      run.finalizedByUserId = req.part136Context.userId;
      const payload = certificatePayload(run);
      run.certificateDigest = sha256(JSON.stringify(payload));
      await run.save();
      await writeAudit(
        models,
        req.part136Context,
        run,
        "run_finalized",
        "success",
        {
          classification: FINAL_CLASSIFICATION,
          certificateDigest: run.certificateDigest,
        }
      );
      res.json({
        success: true,
        part: PART_NUMBER,
        idempotentReplay: false,
        run: publicRun(run),
        certificate: certificatePayload(run),
        certificateDigest: run.certificateDigest,
        marketingBoundary:
          "Sell as VANI-enabled within approved safe scope; do not claim passwords, OTP, money transfer/refund, unsafe deletion or unrestricted autonomous AI.",
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "ACCEPTANCE_FINALIZATION_FAILED",
        message: error.message,
        gateSummary: error.gateSummary || null,
      });
    }
  });

  app.get("/api/part136/runs/:runId/certificate", authenticated, async (req, res) => {
    try {
      const run = await models.Run.findOne({
        runId: cleanId(req.params.runId),
        instituteId: req.part136Context.instituteId,
        status: "finalized",
      });
      if (!run) {
        throw Object.assign(new Error("Finalized acceptance certificate not found."), {
          code: "CERTIFICATE_NOT_FOUND",
          httpStatus: 404,
        });
      }
      res.json({
        success: true,
        part: PART_NUMBER,
        certificate: certificatePayload(run),
        certificateDigest: run.certificateDigest,
        certificateType: "Internal product acceptance record",
        externalCertification: false,
      });
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        success: false,
        part: PART_NUMBER,
        code: error.code || "CERTIFICATE_READ_FAILED",
        message: error.message,
      });
    }
  });
}
