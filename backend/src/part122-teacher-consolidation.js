import path from "node:path";
import { fileURLToPath } from "node:url";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { resolvePart116Access } from "./part116-subscription-access-control.js";

const PART_NUMBER = 122;
const PART_NAME = "Teacher Module Consolidation";
const ALLOWED_ROLES = new Set(["teacher", "institute_owner", "owner", "instituteowner"]);

const TEACHER_MODULES = Object.freeze([
  {
    key: "teacher-app",
    label: "Teacher Workspace",
    description: "Unified teaching overview, classroom tools and safe teacher actions.",
    category: "Teacher Core",
    route: "/teacher-workspace",
    icon: "teacher",
    alwaysAvailable: true,
  },
  {
    key: "attendance",
    label: "Attendance",
    description: "Mark and review classroom attendance.",
    category: "Classroom",
    route: "/attendance",
    icon: "check",
    featureKey: "attendance.manage",
  },
  {
    key: "reports",
    label: "Reports",
    description: "Teacher-safe classroom and student reports.",
    category: "Classroom",
    route: "/reports",
    icon: "chart",
    featureKey: "reports.basic",
  },
  {
    key: "live-classes",
    label: "Live Classes",
    description: "Classroom, whiteboard, chat, polls and recordings.",
    category: "Classroom",
    route: "/live-classes",
    icon: "video",
    featureKey: "live.classes",
  },
  {
    key: "ai-class-notes",
    label: "AI Class Notes",
    description: "Generate and review class summaries and revision notes.",
    category: "AI & VANI",
    route: "/ai-class-notes",
    icon: "notes",
    featureKey: "ai.class_notes",
  },
  {
    key: "student-support",
    label: "Student Support AI",
    description: "Weak-topic, support-risk and intervention insights.",
    category: "AI & VANI",
    route: "/advanced-student-support",
    icon: "support",
    featureKey: "ai.student_support",
  },
  {
    key: "vani-v2",
    label: "Teacher VANI",
    description: "Role-safe teaching assistant and module navigation.",
    category: "AI & VANI",
    route: "/vani",
    icon: "voice",
    featureKey: "vani.v2",
  },
]);

const COMMAND_ALIASES = Object.freeze({
  teacher: "teacher-app",
  workspace: "teacher-app",
  dashboard: "teacher-app",
  attendance: "attendance",
  hazri: "attendance",
  reports: "reports",
  report: "reports",
  classes: "live-classes",
  classroom: "live-classes",
  "live class": "live-classes",
  notes: "ai-class-notes",
  "class notes": "ai-class-notes",
  support: "student-support",
  "student support": "student-support",
  vani: "vani-v2",
});

const METRIC_DEFINITIONS = Object.freeze([
  ["classes", [/class/i, /batch/i, /course/i]],
  ["students", [/student/i, /enrol/i]],
  ["assignments", [/assignment/i, /homework/i, /task/i]],
  ["attendance", [/attendance/i]],
  ["liveSessions", [/live.*class/i, /session/i, /meeting/i]],
  ["classNotes", [/class.*note/i, /lesson.*note/i, /summary/i]],
]);

const INSTITUTE_FIELDS = Object.freeze([
  "instituteId",
  "institute_id",
  "tenantId",
  "tenant_id",
]);

const TEACHER_FIELDS = Object.freeze([
  "teacherId",
  "teacher_id",
  "assignedTeacherId",
  "assigned_teacher_id",
  "facultyId",
  "faculty_id",
  "instructorId",
  "instructor_id",
  "mentorId",
  "mentor_id",
  "createdByTeacherId",
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
    faculty: "teacher",
    instructor: "teacher",
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
function teacherContext(req) {
  const existing = req.part120Context || req.user || req.auth || null;
  const payload = existing || (getBearer(req) ? verifyJwt(getBearer(req)) : null);
  if (!payload) {
    const error = new Error("Teacher login required.");
    error.code = "TEACHER_LOGIN_REQUIRED";
    error.httpStatus = 401;
    throw error;
  }

  const role = normalizeRole(
    payload.role || payload.userRole || payload.accountRole || payload.user?.role || ""
  );
  if (!ALLOWED_ROLES.has(role)) {
    const error = new Error("Only teacher or institute_owner can open Teacher Workspace.");
    error.code = "TEACHER_OR_OWNER_ONLY";
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
    payload.userId || payload.identityId || payload.id || payload._id || payload.sub || "teacher"
  );

  return {
    role: role === "teacher" ? "teacher" : "institute_owner",
    instituteId,
    userId,
    displayName: cleanText(
      payload.displayName || payload.name || payload.fullName || payload.email ||
        (role === "teacher" ? "Teacher" : "Institute Owner"),
      120
    ),
    supervisorMode: role !== "teacher",
  };
}
function teacherOrOwner(req, res, next) {
  try {
    req.part122Teacher = teacherContext(req);
    next();
  } catch (error) {
    res.status(error.httpStatus || 401).json({
      success: false,
      part: PART_NUMBER,
      code: error.code || "TEACHER_AUTH_FAILED",
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
    Audit: mongoose.models.Part122TeacherWorkspaceAudit ||
      mongoose.model("Part122TeacherWorkspaceAudit", auditSchema),
  };
}
async function writeAudit(models, req, action, result, moduleKey = "", details = {}) {
  if (!dbReady()) return;
  try {
    await models.Audit.create({
      instituteId: req.part122Teacher?.instituteId || "unknown",
      actorUserId: req.part122Teacher?.userId || "teacher",
      actorRole: req.part122Teacher?.role || "teacher",
      action,
      result,
      moduleKey,
      details,
    });
  } catch {
    // The workspace remains usable if audit persistence fails.
  }
}
function modelField(model, candidates) {
  const paths = model?.schema?.paths || {};
  return candidates.find((candidate) => Boolean(paths[candidate])) || "";
}
function usableTeachingModel(name = "") {
  return !/(audit|snapshot|sync|history|event|token|session|setting|template|webhook|readiness|subscription|payment)/i.test(name);
}
function teacherFilterFor(model, context) {
  const instituteField = modelField(model, INSTITUTE_FIELDS);
  if (!instituteField) return { safe: false, reasonCode: "INSTITUTE_SCOPE_MISSING" };

  const filter = { [instituteField]: context.instituteId };
  if (context.supervisorMode) {
    return {
      safe: true,
      filter,
      instituteField,
      teacherField: "",
      supervisorAggregate: true,
    };
  }

  const teacherField = modelField(model, TEACHER_FIELDS);
  if (!teacherField) {
    return {
      safe: false,
      reasonCode: "TEACHER_SCOPE_MISSING",
      instituteField,
    };
  }

  filter[teacherField] = context.userId;
  return {
    safe: true,
    filter,
    instituteField,
    teacherField,
    supervisorAggregate: false,
  };
}
async function countTeachingModels(context, patterns) {
  if (!dbReady()) {
    return {
      count: null,
      sourceModels: [],
      available: false,
      reasonCode: "DATABASE_DISCONNECTED",
    };
  }

  const names = mongoose.modelNames().filter((name) =>
    patterns.some((pattern) => pattern.test(name)) && usableTeachingModel(name)
  );
  let count = 0;
  const sourceModels = [];
  const rejectedModels = [];

  for (const name of names) {
    try {
      const model = mongoose.models[name];
      const scope = teacherFilterFor(model, context);
      if (!scope.safe) {
        rejectedModels.push({ name, reasonCode: scope.reasonCode });
        continue;
      }
      const modelCount = await model.countDocuments(scope.filter);
      count += Number(modelCount || 0);
      sourceModels.push({
        name,
        count: Number(modelCount || 0),
        teacherScoped: !scope.supervisorAggregate,
        teacherField: scope.teacherField || null,
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
    reasonCode: sourceModels.length ? "COUNT_READY" : "SAFE_TEACHER_LINK_NOT_FOUND",
  };
}
async function teachingMetrics(context) {
  const entries = await Promise.all(
    METRIC_DEFINITIONS.map(async ([key, patterns]) => [
      key,
      await countTeachingModels(context, patterns),
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
    modules: TEACHER_MODULES.map((module) =>
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
    teacherRecordLinkDetected: context.supervisorMode ? true : linkedMetricCount > 0,
    teacherWorkspaceAudit: names.has("Part122TeacherWorkspaceAudit"),
  };
}
async function recentActivity(context) {
  if (!dbReady()) return [];
  const Audit = mongoose.models.Part122TeacherWorkspaceAudit;
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
async function teacherOverview(context) {
  const [access, metrics] = await Promise.all([
    accessSummary(context),
    teachingMetrics(context),
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
      message: "Part 116 teacher entitlement summary unavailable hai.",
    });
  }

  const missingLinks = Object.entries(metrics)
    .filter(([, metric]) => !metric.available)
    .map(([key]) => key);

  if (!context.supervisorMode && missingLinks.length) {
    alerts.push({
      level: "info",
      code: "TEACHER_RECORD_LINK_PENDING",
      message: `${missingLinks.length} teaching metric groups me safe teacherId mapping nahi mili. Data guess nahi kiya gaya.`,
    });
  }

  return {
    teacher: context,
    generatedAt: new Date().toISOString(),
    access,
    metrics,
    health: dependencyHealth(context, metrics),
    alerts,
    metricPrecision: context.supervisorMode
      ? "Owner supervisor mode uses institute-scoped aggregates."
      : "Teacher mode counts only records with both institute scope and a recognised teacher-assignment field matching the logged-in user.",
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
    supervisorMode: overview.teacher.supervisorMode,
    linkedMetrics: Object.fromEntries(
      Object.entries(overview.metrics).map(([key, metric]) => [
        key,
        metric.available ? metric.count : null,
      ])
    ),
    alertCount: overview.alerts.length,
  };
}

export async function getPart122TeacherOverview({
  instituteId,
  userId = "teacher",
  displayName = "Teacher",
  role = "teacher",
} = {}) {
  return teacherOverview({
    instituteId: cleanId(instituteId),
    userId: cleanId(userId),
    displayName: cleanText(displayName, 120),
    role: normalizeRole(role) === "institute_owner" ? "institute_owner" : "teacher",
    supervisorMode: normalizeRole(role) === "institute_owner",
  });
}

export function registerPart122TeacherConsolidation({ app } = {}) {
  if (!app || typeof app.get !== "function" || typeof app.post !== "function") {
    throw new Error("Part 122 registration failed: Express app required.");
  }
  if (app.locals.part122TeacherConsolidationRegistered) return;
  app.locals.part122TeacherConsolidationRegistered = true;
  const models = defineModels();

  app.get(["/teacher-workspace", "/teacher-command-centre", "/part122"], (req, res) => {
    res.sendFile(path.join(frontendDir, "naxora-teacher-workspace.html"));
  });
  app.get("/naxora-teacher-workspace.css", (req, res) => {
    res.type("text/css").sendFile(path.join(frontendDir, "naxora-teacher-workspace.css"));
  });
  app.get("/naxora-teacher-workspace.js", (req, res) => {
    res.type("application/javascript").sendFile(path.join(frontendDir, "naxora-teacher-workspace.js"));
  });

  app.get("/api/part122/status", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      name: PART_NAME,
      status: "teacher_workspace_consolidation_active",
      teacherWorkspaceUrl: "/teacher-workspace",
      integratedWithPart119Shell: true,
      commonLoginRequired: true,
      allowedRoles: ["teacher", "institute_owner"],
      ownerSupervisorMode: true,
      strictTeacherRecordScoping: true,
      part116EntitlementFiltering: true,
      globalVaniTeacherNavigation: true,
      globalVaniMultiStepExecution: false,
      globalVaniMultiStepTargetPart: 125,
      oldTeacherRouteDeleted: false,
      nextPart: 123,
      nextPartName: "Student Module Consolidation",
    });
  });

  app.get("/api/part122/security-policy", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      teacherOrOwnerOnly: true,
      instituteIdMatchRequired: true,
      teacherModeRequiresTeacherLinkedRecords: true,
      ownerSupervisorUsesInstituteAggregates: true,
      unscopedModelsNotCounted: true,
      arbitraryModuleUrlsBlocked: true,
      moduleRoutesComeFromAllowlist: true,
      subscriptionFilteringUsesPart116: true,
      passwordsAndSecretsNeverReturned: true,
      vaniNavigationOnlyInPart122: true,
      sensitiveChangesRemainInSecuredModules: true,
    });
  });

  app.get("/api/part122/catalog", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      count: TEACHER_MODULES.length,
      categories: [...new Set(TEACHER_MODULES.map((module) => module.category))],
      modules: TEACHER_MODULES.map((module) => ({
        key: module.key,
        label: module.label,
        description: module.description,
        category: module.category,
        icon: module.icon,
        featureKey: module.featureKey || null,
      })),
    });
  });

  app.get("/api/part122/overview", teacherOrOwner, async (req, res) => {
    try {
      const overview = await teacherOverview(req.part122Teacher);
      res.json({ success: true, part: PART_NUMBER, overview });
    } catch (error) {
      res.status(500).json({
        success: false,
        part: PART_NUMBER,
        code: "TEACHER_OVERVIEW_FAILED",
        message: error.message,
      });
    }
  });

  app.get("/api/part122/modules", teacherOrOwner, async (req, res) => {
    const catalogue = await moduleCatalogue(req.part122Teacher);
    res.json({
      success: true,
      part: PART_NUMBER,
      access: catalogue.access,
      modules: catalogue.modules,
    });
  });

  app.get("/api/part122/activity", teacherOrOwner, async (req, res) => {
    const activity = await recentActivity(req.part122Teacher);
    res.json({
      success: true,
      part: PART_NUMBER,
      count: activity.length,
      activity,
    });
  });

  app.get("/api/part122/health", teacherOrOwner, async (req, res) => {
    const overview = await teacherOverview(req.part122Teacher);
    const catalogue = await moduleCatalogue(req.part122Teacher);
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

  app.post("/api/part122/module/open", teacherOrOwner, async (req, res) => {
    const moduleKey = cleanText(req.body?.moduleKey || "", 100);
    const catalogue = await moduleCatalogue(req.part122Teacher);
    const module = catalogue.modules.find((item) => item.key === moduleKey);

    if (!module) {
      await writeAudit(models, req, "open_module", "failed", moduleKey, {
        reasonCode: "UNKNOWN_MODULE",
      });
      return res.status(404).json({
        success: false,
        part: PART_NUMBER,
        code: "UNKNOWN_TEACHER_MODULE",
        message: "Unknown Teacher Workspace module.",
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

  app.post("/api/part122/vani/command", teacherOrOwner, async (req, res) => {
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
        replyText: "Password, OTP, payment secret aur private student credentials VANI ko mat boliye.",
        spokenSafeSummary: "Sensitive teaching details private rahengi.",
        actionExecuted: false,
        privateScreenFirst: true,
      });
    }

    try {
      const moduleKey = findModule(command);
      const catalogue = await moduleCatalogue(req.part122Teacher);

      if (moduleKey && isOpenCommand(command)) {
        const module = catalogue.modules.find((item) => item.key === moduleKey);
        if (!module) {
          return res.json({
            success: true,
            part: PART_NUMBER,
            replyText: "Requested Teacher module nahi mila.",
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

      if (/overview|summary|status|aaj kya|teaching kaisa|dashboard/i.test(command)) {
        const overview = await teacherOverview(req.part122Teacher);
        await writeAudit(models, req, "vani_teacher_summary", "success");
        const linkedCount = Object.values(overview.metrics).filter((metric) => metric.available).length;
        return res.json({
          success: true,
          part: PART_NUMBER,
          replyText: `${overview.access.basePlanCode} plan view me ${linkedCount} teaching metric groups safely linked hain aur ${overview.alerts.length} alerts hain. Details private screen par hain.`,
          spokenSafeSummary: `${overview.alerts.length} teaching alerts hain.`,
          privateScreenDetails: safeOverviewSummary(overview),
          alerts: overview.alerts,
          actionExecuted: false,
        });
      }

      if (/pending|alerts|attention|problem|issue/i.test(command)) {
        const overview = await teacherOverview(req.part122Teacher);
        return res.json({
          success: true,
          part: PART_NUMBER,
          replyText: overview.alerts.length
            ? `${overview.alerts.length} Teacher Workspace items attention maang rahi hain.`
            : "Koi consolidated teacher alert nahi mila.",
          spokenSafeSummary: overview.alerts.length
            ? `${overview.alerts.length} items attention maang rahi hain.`
            : "Koi teacher alert nahi mila.",
          privateScreenDetails: overview.alerts,
          actionExecuted: false,
        });
      }

      return res.json({
        success: true,
        part: PART_NUMBER,
        replyText: "Main teaching summary dikha sakti hoon aur allowed Teacher modules open kar sakti hoon. Attendance mark, assignment create aur student message jaise multi-step actions Part 125 me connect honge.",
        spokenSafeSummary: "Teacher Workspace navigation ready hai.",
        allowedModuleCount: catalogue.modules.filter((module) => module.allowed).length,
        actionExecuted: false,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        part: PART_NUMBER,
        code: "TEACHER_VANI_FAILED",
        message: error.message,
      });
    }
  });

  app.get("/api/part122/demo", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      name: PART_NAME,
      page: "/teacher-workspace",
      flow: [
        "Part 120 verifies Teacher or Owner session",
        "Teacher Workspace reads Part 116 role entitlements",
        "Teacher mode counts only institute + teacher-linked records",
        "Owner supervisor mode uses institute-scoped aggregates",
        "Allowed classroom modules open through Part 119 shell",
        "Teacher VANI provides summary and safe navigation",
      ],
      pending: {
        studentWorkspace: 123,
        parentStaffBranchWorkspaces: 124,
        multiStepVaniActions: 125,
        crossModuleE2E: 126,
        productionLaunch: 127,
      },
    });
  });
}
