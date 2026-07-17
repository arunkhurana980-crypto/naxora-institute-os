import path from "node:path";
import { fileURLToPath } from "node:url";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { resolvePart116Access } from "./part116-subscription-access-control.js";

const PART_NUMBER = 123;
const PART_NAME = "Student Module Consolidation";
const ALLOWED_ROLES = new Set(["student", "institute_owner", "owner", "instituteowner"]);

const STUDENT_MODULES = Object.freeze([
  {
    key: "student-app",
    label: "Student Workspace",
    description: "Unified learning overview, classes, assignments and progress.",
    category: "Student Core",
    route: "/student-workspace",
    icon: "student",
    alwaysAvailable: true,
  },
  {
    key: "live-classes",
    label: "Live Classes",
    description: "Join allowed live classes, classroom chat and recordings.",
    category: "Learning",
    route: "/live-classes",
    icon: "video",
    featureKey: "live.classes",
  },
  {
    key: "ai-class-notes",
    label: "AI Class Notes",
    description: "Review class summaries, revision notes and learning support.",
    category: "Learning",
    route: "/ai-class-notes",
    icon: "notes",
    featureKey: "ai.class_notes",
  },
  {
    key: "vani-v2",
    label: "Student VANI",
    description: "Role-safe study assistant and module navigation.",
    category: "AI & VANI",
    route: "/vani",
    icon: "voice",
    featureKey: "vani.v2",
  },
]);

const COMMAND_ALIASES = Object.freeze({
  student: "student-app",
  workspace: "student-app",
  dashboard: "student-app",
  classes: "live-classes",
  class: "live-classes",
  classroom: "live-classes",
  "live class": "live-classes",
  notes: "ai-class-notes",
  "class notes": "ai-class-notes",
  revision: "ai-class-notes",
  vani: "vani-v2",
});

const METRIC_DEFINITIONS = Object.freeze([
  ["classes", [/class/i, /batch/i, /course/i, /enrol/i]],
  ["assignments", [/assignment/i, /homework/i, /task/i]],
  ["attendance", [/attendance/i]],
  ["fees", [/fee/i, /invoice/i, /receipt/i, /payment/i]],
  ["liveSessions", [/live.*class/i, /session/i, /meeting/i]],
  ["classNotes", [/class.*note/i, /lesson.*note/i, /summary/i]],
  ["results", [/result/i, /exam/i, /test/i, /score/i, /grade/i]],
]);

const INSTITUTE_FIELDS = Object.freeze([
  "instituteId",
  "institute_id",
  "tenantId",
  "tenant_id",
]);

const STUDENT_FIELDS = Object.freeze([
  "studentId",
  "student_id",
  "learnerId",
  "learner_id",
  "admissionId",
  "admission_id",
  "enrollmentId",
  "enrolmentId",
  "profileId",
  "studentProfileId",
  "userId",
  "user_id",
  "identityId",
  "accountId",
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
function cleanId(value = "") {
  return String(value || "").trim().replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 180);
}
function normalizeRole(value = "") {
  const role = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  const aliases = {
    owner: "institute_owner",
    instituteowner: "institute_owner",
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
      // Try another configured secret.
    }
  }
  const error = new Error("Login session invalid or expired.");
  error.code = "INVALID_SESSION";
  error.httpStatus = 401;
  throw error;
}
function studentContext(req) {
  const existing = req.part120Context || req.user || req.auth || null;
  const payload = existing || (getBearer(req) ? verifyJwt(getBearer(req)) : null);

  if (!payload) {
    const error = new Error("Student login required.");
    error.code = "STUDENT_LOGIN_REQUIRED";
    error.httpStatus = 401;
    throw error;
  }

  const role = normalizeRole(
    payload.role || payload.userRole || payload.accountRole || payload.user?.role || ""
  );
  if (!ALLOWED_ROLES.has(role)) {
    const error = new Error("Only student or institute_owner can open Student Workspace.");
    error.code = "STUDENT_OR_OWNER_ONLY";
    error.httpStatus = 403;
    throw error;
  }

  const requestedInstituteId = cleanId(
    req.headers["x-naxora-institute-id"] || req.body?.instituteId || req.query?.instituteId || ""
  );
  const tokenInstituteId = cleanId(
    payload.instituteId || payload.institute_id || payload.user?.instituteId || payload.tenantId || ""
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
    payload.userId || payload.identityId || payload.id || payload._id || payload.sub || "student"
  );

  const referenceIds = [
    userId,
    payload.studentId,
    payload.student_id,
    payload.learnerId,
    payload.learner_id,
    payload.profileId,
    payload.studentProfileId,
    payload.admissionId,
    payload.enrollmentId,
    payload.enrolmentId,
  ].map(cleanId).filter(Boolean);

  return {
    role: role === "student" ? "student" : "institute_owner",
    instituteId,
    userId,
    displayName: cleanText(
      payload.displayName || payload.name || payload.fullName || payload.email ||
        (role === "student" ? "Student" : "Institute Owner"),
      120
    ),
    supervisorMode: role !== "student",
    referenceIds: [...new Set(referenceIds)],
  };
}
function studentOrOwner(req, res, next) {
  try {
    req.part123Student = studentContext(req);
    next();
  } catch (error) {
    res.status(error.httpStatus || 401).json({
      success: false,
      part: PART_NUMBER,
      code: error.code || "STUDENT_AUTH_FAILED",
      message: error.message,
    });
  }
}
function dbReady() {
  return mongoose.connection?.readyState === 1;
}
function defineModels() {
  const auditSchema = new mongoose.Schema({
    instituteId: { type: String, required: true, index: true },
    actorUserId: { type: String, required: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true },
    result: { type: String, required: true },
    moduleKey: { type: String, default: "" },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  }, { timestamps: true, strict: true });

  return {
    Audit: mongoose.models.Part123StudentWorkspaceAudit ||
      mongoose.model("Part123StudentWorkspaceAudit", auditSchema),
  };
}
async function writeAudit(models, req, action, result, moduleKey = "", details = {}) {
  if (!dbReady()) return;
  try {
    await models.Audit.create({
      instituteId: req.part123Student?.instituteId || "unknown",
      actorUserId: req.part123Student?.userId || "student",
      actorRole: req.part123Student?.role || "student",
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
function usableStudentModel(name = "") {
  return !/(audit|snapshot|sync|history|event|token|session|setting|template|webhook|readiness|subscription.*action|launch)/i.test(name);
}
function studentFilterFor(model, context) {
  const instituteField = modelField(model, INSTITUTE_FIELDS);
  if (!instituteField) {
    return { safe: false, reasonCode: "INSTITUTE_SCOPE_MISSING" };
  }

  const filter = { [instituteField]: context.instituteId };

  if (context.supervisorMode) {
    return {
      safe: true,
      filter,
      instituteField,
      studentField: "",
      supervisorAggregate: true,
    };
  }

  const studentField = modelField(model, STUDENT_FIELDS);
  if (!studentField) {
    return {
      safe: false,
      reasonCode: "STUDENT_SCOPE_MISSING",
      instituteField,
    };
  }

  if (!context.referenceIds.length) {
    return {
      safe: false,
      reasonCode: "STUDENT_REFERENCE_MISSING",
      instituteField,
      studentField,
    };
  }

  filter[studentField] = context.referenceIds.length === 1
    ? context.referenceIds[0]
    : { $in: context.referenceIds };

  return {
    safe: true,
    filter,
    instituteField,
    studentField,
    supervisorAggregate: false,
  };
}
async function countStudentModels(context, patterns) {
  if (!dbReady()) {
    return {
      count: null,
      sourceModels: [],
      available: false,
      reasonCode: "DATABASE_DISCONNECTED",
    };
  }

  const names = mongoose.modelNames().filter((name) =>
    patterns.some((pattern) => pattern.test(name)) && usableStudentModel(name)
  );

  let count = 0;
  const sourceModels = [];
  const rejectedModels = [];

  for (const name of names) {
    try {
      const model = mongoose.models[name];
      const scope = studentFilterFor(model, context);

      if (!scope.safe) {
        rejectedModels.push({
          name,
          reasonCode: scope.reasonCode,
        });
        continue;
      }

      const modelCount = await model.countDocuments(scope.filter);
      count += Number(modelCount || 0);
      sourceModels.push({
        name,
        count: Number(modelCount || 0),
        studentScoped: !scope.supervisorAggregate,
        studentField: scope.studentField || null,
      });
    } catch {
      rejectedModels.push({
        name,
        reasonCode: "COUNT_FAILED",
      });
    }
  }

  return {
    count,
    sourceModels,
    rejectedModels,
    available: sourceModels.length > 0,
    reasonCode: sourceModels.length ? "COUNT_READY" : "SAFE_STUDENT_LINK_NOT_FOUND",
  };
}
async function studentMetrics(context) {
  const entries = await Promise.all(
    METRIC_DEFINITIONS.map(async ([key, patterns]) => [
      key,
      await countStudentModels(context, patterns),
    ])
  );
  return Object.fromEntries(entries);
}
async function accessSummary(context) {
  try {
    const access = await resolvePart116Access({
      instituteId: context.instituteId,
      role: context.role,
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
  if (module.alwaysAvailable) {
    return { allowed: true, reasonCode: "ACCESS_GRANTED" };
  }
  if (!module.featureKey) {
    return { allowed: true, reasonCode: "ACCESS_GRANTED" };
  }
  if (!access.available) {
    return {
      allowed: false,
      reasonCode: "PART116_ACCESS_UNAVAILABLE",
    };
  }
  if (!access.roleEntitlements.includes(module.featureKey)) {
    return {
      allowed: false,
      reasonCode: "PLAN_OR_ROLE_ENTITLEMENT_REQUIRED",
    };
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
  const access = await accessSummary(context);
  return {
    access,
    modules: STUDENT_MODULES.map((module) =>
      publicModule(module, moduleDecision(module, access))
    ),
  };
}
function dependencyHealth(context, metrics) {
  const names = new Set(mongoose.modelNames());
  const linkedMetricCount = Object.values(metrics).filter((metric) => metric.available).length;

  return {
    databaseConnected: dbReady(),
    part116Access: names.has("Part116AccessSnapshot"),
    part120Identity: names.has("Part120UnifiedIdentity"),
    commonSessionRoleReady: Boolean(context.role),
    studentReferenceAvailable: context.supervisorMode || context.referenceIds.length > 0,
    studentRecordLinkDetected: context.supervisorMode ? true : linkedMetricCount > 0,
    studentWorkspaceAudit: names.has("Part123StudentWorkspaceAudit"),
  };
}
async function recentActivity(context) {
  if (!dbReady()) return [];
  const Audit = mongoose.models.Part123StudentWorkspaceAudit;
  if (!Audit) return [];

  const rows = await Audit.find({
    instituteId: context.instituteId,
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
async function studentOverview(context) {
  const [access, metrics] = await Promise.all([
    accessSummary(context),
    studentMetrics(context),
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
      message: "Part 116 Student entitlement summary unavailable hai.",
    });
  }

  const missingLinks = Object.entries(metrics)
    .filter(([, metric]) => !metric.available)
    .map(([key]) => key);

  if (!context.supervisorMode && missingLinks.length) {
    alerts.push({
      level: "info",
      code: "STUDENT_RECORD_LINK_PENDING",
      message: `${missingLinks.length} Student metric groups me safe studentId/userId mapping nahi mili. Kisi aur Student ka data use nahi kiya gaya.`,
    });
  }

  return {
    student: {
      ...context,
      referenceIds: context.supervisorMode ? [] : context.referenceIds,
    },
    generatedAt: new Date().toISOString(),
    access,
    metrics,
    health: dependencyHealth(context, metrics),
    alerts,
    metricPrecision: context.supervisorMode
      ? "Owner supervisor mode uses institute-scoped Student aggregates."
      : "Student mode counts only records with institute scope and a recognised Student field matching a secure reference from the logged-in session.",
  };
}
function findModule(command = "") {
  const text = cleanText(command, 500).toLowerCase();
  for (const [alias, key] of Object.entries(COMMAND_ALIASES)) {
    if (text.includes(alias)) return key;
  }
  return "";
}
function isOpenCommand(command = "") {
  return /(open|kholo|dikhao|show|launch|le chalo|screen|module)/i.test(command);
}
function safeOverviewSummary(overview) {
  return {
    basePlanCode: overview.access.basePlanCode,
    entitlementCount: overview.access.entitlementCount,
    supervisorMode: overview.student.supervisorMode,
    linkedMetrics: Object.fromEntries(
      Object.entries(overview.metrics).map(([key, metric]) => [
        key,
        metric.available ? metric.count : null,
      ])
    ),
    alertCount: overview.alerts.length,
  };
}

export async function getPart123StudentOverview({
  instituteId,
  userId = "student",
  displayName = "Student",
  role = "student",
  referenceIds = [],
} = {}) {
  const normalizedRole = normalizeRole(role);
  return studentOverview({
    instituteId: cleanId(instituteId),
    userId: cleanId(userId),
    displayName: cleanText(displayName, 120),
    role: normalizedRole === "institute_owner" ? "institute_owner" : "student",
    supervisorMode: normalizedRole === "institute_owner",
    referenceIds: [...new Set([userId, ...referenceIds].map(cleanId).filter(Boolean))],
  });
}

export function registerPart123StudentConsolidation({ app } = {}) {
  if (!app || typeof app.get !== "function" || typeof app.post !== "function") {
    throw new Error("Part 123 registration failed: Express app required.");
  }
  if (app.locals.part123StudentConsolidationRegistered) return;
  app.locals.part123StudentConsolidationRegistered = true;
  const models = defineModels();

  app.get(["/student-workspace", "/student-learning-centre", "/part123"], (req, res) => {
    res.sendFile(path.join(frontendDir, "naxora-student-workspace.html"));
  });
  app.get("/naxora-student-workspace.css", (req, res) => {
    res.type("text/css").sendFile(path.join(frontendDir, "naxora-student-workspace.css"));
  });
  app.get("/naxora-student-workspace.js", (req, res) => {
    res.type("application/javascript").sendFile(path.join(frontendDir, "naxora-student-workspace.js"));
  });

  app.get("/api/part123/status", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      name: PART_NAME,
      status: "student_workspace_consolidation_active",
      studentWorkspaceUrl: "/student-workspace",
      integratedWithPart119Shell: true,
      commonLoginRequired: true,
      allowedRoles: ["student", "institute_owner"],
      ownerSupervisorMode: true,
      strictStudentRecordScoping: true,
      part116EntitlementFiltering: true,
      globalVaniStudentNavigation: true,
      globalVaniMultiStepExecution: false,
      globalVaniMultiStepTargetPart: 125,
      oldStudentRouteDeleted: false,
      nextPart: 124,
      nextPartName: "Parent, Staff and Branch Role Consolidation",
    });
  });

  app.get("/api/part123/security-policy", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      studentOrOwnerOnly: true,
      instituteIdMatchRequired: true,
      studentModeRequiresStudentLinkedRecords: true,
      ownerSupervisorUsesInstituteAggregates: true,
      unscopedModelsNotCounted: true,
      crossStudentDataBlocked: true,
      arbitraryModuleUrlsBlocked: true,
      moduleRoutesComeFromAllowlist: true,
      subscriptionFilteringUsesPart116: true,
      passwordsAndSecretsNeverReturned: true,
      vaniNavigationOnlyInPart123: true,
      sensitiveChangesRemainInSecuredModules: true,
    });
  });

  app.get("/api/part123/catalog", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      count: STUDENT_MODULES.length,
      categories: [...new Set(STUDENT_MODULES.map((module) => module.category))],
      modules: STUDENT_MODULES.map((module) => ({
        key: module.key,
        label: module.label,
        description: module.description,
        category: module.category,
        icon: module.icon,
        featureKey: module.featureKey || null,
      })),
    });
  });

  app.get("/api/part123/overview", studentOrOwner, async (req, res) => {
    try {
      const overview = await studentOverview(req.part123Student);
      res.json({ success: true, part: PART_NUMBER, overview });
    } catch (error) {
      res.status(500).json({
        success: false,
        part: PART_NUMBER,
        code: "STUDENT_OVERVIEW_FAILED",
        message: error.message,
      });
    }
  });

  app.get("/api/part123/modules", studentOrOwner, async (req, res) => {
    const catalogue = await moduleCatalogue(req.part123Student);
    res.json({
      success: true,
      part: PART_NUMBER,
      access: catalogue.access,
      modules: catalogue.modules,
    });
  });

  app.get("/api/part123/activity", studentOrOwner, async (req, res) => {
    const activity = await recentActivity(req.part123Student);
    res.json({
      success: true,
      part: PART_NUMBER,
      count: activity.length,
      activity,
    });
  });

  app.get("/api/part123/health", studentOrOwner, async (req, res) => {
    const overview = await studentOverview(req.part123Student);
    const catalogue = await moduleCatalogue(req.part123Student);
    res.json({
      success: true,
      part: PART_NUMBER,
      health: overview.health,
      availableModules: catalogue.modules.filter((module) => module.allowed).length,
      blockedModules: catalogue.modules.filter((module) => !module.allowed).length,
      blocked: catalogue.modules
        .filter((module) => !module.allowed)
        .map((module) => ({
          key: module.key,
          label: module.label,
          reasonCode: module.reasonCode,
        })),
    });
  });

  app.post("/api/part123/module/open", studentOrOwner, async (req, res) => {
    const moduleKey = cleanText(req.body?.moduleKey || "", 100);
    const catalogue = await moduleCatalogue(req.part123Student);
    const module = catalogue.modules.find((item) => item.key === moduleKey);

    if (!module) {
      await writeAudit(models, req, "open_module", "failed", moduleKey, {
        reasonCode: "UNKNOWN_MODULE",
      });
      return res.status(404).json({
        success: false,
        part: PART_NUMBER,
        code: "UNKNOWN_STUDENT_MODULE",
        message: "Unknown Student Workspace module.",
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

  app.post("/api/part123/vani/command", studentOrOwner, async (req, res) => {
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
        replyText: "Password, OTP, payment secret aur private account details VANI ko mat boliye.",
        spokenSafeSummary: "Sensitive Student details private rahengi.",
        actionExecuted: false,
        privateScreenFirst: true,
      });
    }

    try {
      const moduleKey = findModule(command);
      const catalogue = await moduleCatalogue(req.part123Student);

      if (moduleKey && isOpenCommand(command)) {
        const module = catalogue.modules.find((item) => item.key === moduleKey);

        if (!module) {
          return res.json({
            success: true,
            part: PART_NUMBER,
            replyText: "Requested Student module nahi mila.",
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

      if (/overview|summary|status|progress|aaj kya|padhai|dashboard/i.test(command)) {
        const overview = await studentOverview(req.part123Student);
        const linkedCount = Object.values(overview.metrics)
          .filter((metric) => metric.available).length;

        await writeAudit(models, req, "vani_student_summary", "success");

        return res.json({
          success: true,
          part: PART_NUMBER,
          replyText: `${overview.access.basePlanCode} plan view me ${linkedCount} learning metric groups safely linked hain aur ${overview.alerts.length} alerts hain. Details private screen par hain.`,
          spokenSafeSummary: `${overview.alerts.length} learning alerts hain.`,
          privateScreenDetails: safeOverviewSummary(overview),
          alerts: overview.alerts,
          actionExecuted: false,
        });
      }

      if (/pending|alerts|attention|problem|issue|homework/i.test(command)) {
        const overview = await studentOverview(req.part123Student);
        return res.json({
          success: true,
          part: PART_NUMBER,
          replyText: overview.alerts.length
            ? `${overview.alerts.length} Student Workspace items attention maang rahi hain.`
            : "Koi consolidated Student alert nahi mila.",
          spokenSafeSummary: overview.alerts.length
            ? `${overview.alerts.length} items attention maang rahi hain.`
            : "Koi Student alert nahi mila.",
          privateScreenDetails: overview.alerts,
          actionExecuted: false,
        });
      }

      return res.json({
        success: true,
        part: PART_NUMBER,
        replyText: "Main learning summary dikha sakti hoon aur allowed Student modules open kar sakti hoon. Assignment submit, attendance correction, fee action aur teacher messaging Part 125 me safe preview ke saath connect honge.",
        spokenSafeSummary: "Student Workspace navigation ready hai.",
        allowedModuleCount: catalogue.modules.filter((module) => module.allowed).length,
        actionExecuted: false,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        part: PART_NUMBER,
        code: "STUDENT_VANI_FAILED",
        message: error.message,
      });
    }
  });

  app.get("/api/part123/demo", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      name: PART_NAME,
      page: "/student-workspace",
      flow: [
        "Part 120 verifies Student or Owner session",
        "Student Workspace reads Part 116 role entitlements",
        "Student mode counts only institute + Student-linked records",
        "Owner supervisor mode uses institute-scoped aggregates",
        "Allowed learning modules open through Part 119 shell",
        "Student VANI provides summary and safe navigation",
      ],
      pending: {
        parentStaffBranchWorkspaces: 124,
        multiStepVaniActions: 125,
        crossModuleE2E: 126,
        productionLaunch: 127,
      },
    });
  });
}
