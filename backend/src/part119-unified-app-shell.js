import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { resolvePart116Access } from "./part116-subscription-access-control.js";

const PART_NUMBER = 119;
const PART_NAME = "Unified Single App Shell";
const KNOWN_ROLES = new Set([
  "institute_owner",
  "branch_manager",
  "teacher",
  "student",
  "parent",
  "accountant",
  "counsellor",
  "staff",
]);
const OWNER_ONLY_ROLES = ["institute_owner"];
const ALL_LOGGED_IN_ROLES = [...KNOWN_ROLES];
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, "../../frontend");

const MODULES = Object.freeze([
  {
    key: "home",
    label: "Home",
    description: "Unified NAXORA overview and quick actions.",
    category: "Core",
    route: "/app",
    icon: "home",
    roles: ALL_LOGGED_IN_ROLES,
    alwaysAvailable: true,
    order: 10,
  },
  {
    key: "owner-dashboard",
    label: "Owner Workspace",
    description: "Unified owner overview, account access, institute operations and business controls.",
    category: "Role Apps",
    route: "/owner-workspace",
    icon: "building",
    roles: OWNER_ONLY_ROLES,
    featureKey: "core.dashboard",
    order: 20,
  },
  {
    key: "account-access",
    label: "Account Access",
    description: "Create, disable and reset unified role accounts.",
    category: "Role Apps",
    route: "/account-access-manager",
    icon: "lock",
    roles: OWNER_ONLY_ROLES,
    order: 25,
  },
  {
    key: "teacher-app",
    label: "Teacher Workspace",
    description: "Unified classes, attendance, reports, live classroom, AI notes and teacher workflows.",
    category: "Role Apps",
    route: "/teacher-workspace",
    icon: "teacher",
    roles: ["institute_owner", "teacher"],
    featureKey: "core.dashboard",
    order: 30,
  },
  {
    key: "student-app",
    label: "Student Workspace",
    description: "Unified classes, assignments, attendance, learning progress, AI notes and Student VANI.",
    category: "Role Apps",
    route: "/student-workspace",
    icon: "student",
    roles: ["institute_owner", "student"],
    featureKey: "student.portal",
    order: 40,
  },
  {
    key: "parent-app",
    label: "Parent Workspace",
    description: "Unified child progress, attendance, fee context and Parent VANI.",
    category: "Role Apps",
    route: "/parent-workspace",
    icon: "parent",
    roles: ["institute_owner", "parent"],
    featureKey: "parent.portal",
    order: 50,
  },
  // PART 124 ROLE WORKSPACE MODULES START
  {
    key: "role-scope-manager",
    label: "Role Scope Manager",
    description: "Assign child, branch and explicit institute-wide role scopes.",
    category: "Role Apps",
    route: "/role-scope-manager",
    icon: "lock",
    roles: OWNER_ONLY_ROLES,
    order: 26,
  },
  {
    key: "branch-workspace",
    label: "Branch Workspace",
    description: "Unified branch operations, students, attendance and reports.",
    category: "Role Apps",
    route: "/branch-workspace",
    icon: "branches",
    roles: ["institute_owner", "branch_manager"],
    order: 55,
  },
  {
    key: "accountant-workspace",
    label: "Accountant Workspace",
    description: "Unified fees, receipts, invoices and finance reports.",
    category: "Role Apps",
    route: "/accountant-workspace",
    icon: "wallet",
    roles: ["institute_owner", "accountant"],
    order: 56,
  },
  {
    key: "counsellor-workspace",
    label: "Counsellor Workspace",
    description: "Unified leads, enquiries, admissions and follow-up.",
    category: "Role Apps",
    route: "/counsellor-workspace",
    icon: "support",
    roles: ["institute_owner", "counsellor"],
    order: 57,
  },
  {
    key: "staff-workspace",
    label: "Staff Workspace",
    description: "Unified assigned operations, attendance and staff tasks.",
    category: "Role Apps",
    route: "/staff-workspace",
    icon: "building",
    roles: ["institute_owner", "staff"],
    order: 58,
  },
  // PART 124 ROLE WORKSPACE MODULES END
  {
    key: "students",
    label: "Students",
    description: "Student records and institute student management.",
    category: "Institute",
    route: "/student",
    icon: "users",
    roles: ["institute_owner", "branch_manager", "counsellor", "staff"],
    featureKey: "students.manage",
    order: 100,
  },
  {
    key: "attendance",
    label: "Attendance",
    description: "Attendance management and classroom records.",
    category: "Institute",
    route: "/attendance",
    icon: "check",
    roles: ["institute_owner", "branch_manager", "teacher", "staff"],
    featureKey: "attendance.manage",
    order: 110,
  },
  {
    key: "fees",
    label: "Fees",
    description: "Fee records, receipts and finance controls.",
    category: "Institute",
    route: "/fees",
    icon: "wallet",
    roles: ["institute_owner", "branch_manager", "accountant"],
    featureKey: "fees.manage",
    order: 120,
  },
  {
    key: "reports",
    label: "Reports",
    description: "Role-safe reports and institute summaries.",
    category: "Institute",
    route: "/reports",
    icon: "chart",
    roles: ["institute_owner", "branch_manager", "teacher", "accountant"],
    featureKey: "reports.basic",
    order: 130,
  },
  {
    key: "live-classes",
    label: "Live Classes",
    description: "Native classroom, whiteboard, chat, polls and recordings.",
    category: "Teaching",
    route: "/live-classes",
    icon: "video",
    roles: ["institute_owner", "teacher", "student"],
    featureKey: "live.classes",
    order: 200,
  },
  {
    key: "ai-class-notes",
    label: "AI Class Notes",
    description: "AI class summary, notes and revision support.",
    category: "Teaching",
    route: "/ai-class-notes",
    icon: "notes",
    roles: ["institute_owner", "teacher", "student"],
    featureKey: "ai.class_notes",
    order: 210,
  },
  {
    key: "student-support",
    label: "Student Support AI",
    description: "Weak-topic, support-risk and intervention analytics.",
    category: "AI & VANI",
    route: "/advanced-student-support",
    icon: "support",
    roles: ["institute_owner", "branch_manager", "teacher"],
    featureKey: "ai.student_support",
    order: 300,
  },
  {
    key: "vani-v2",
    label: "VANI 2.0",
    description: "Role-aware safe institute assistant.",
    category: "AI & VANI",
    route: "/vani",
    icon: "voice",
    roles: ALL_LOGGED_IN_ROLES,
    featureKey: "vani.v2",
    order: 310,
  },
  {
    key: "branches",
    label: "Branch Command Centre",
    description: "Multi-branch comparison and operations.",
    category: "Business",
    route: "/multi-branch-command-centre",
    icon: "branches",
    roles: ["institute_owner", "branch_manager"],
    featureKey: "branches.command_centre",
    order: 400,
  },
  {
    key: "franchise",
    label: "Franchise Management",
    description: "Franchise operations, agreements and royalty oversight.",
    category: "Business",
    route: "/franchise-management",
    icon: "franchise",
    roles: OWNER_ONLY_ROLES,
    featureKey: "franchise.manage",
    order: 410,
  },
  {
    key: "marketing",
    label: "Automated Marketing",
    description: "Consent-aware campaigns and lead follow-up.",
    category: "Business",
    route: "/automated-marketing",
    icon: "megaphone",
    roles: ["institute_owner", "counsellor"],
    featureKey: "marketing.automation",
    order: 420,
  },
  {
    key: "marketplace",
    label: "Marketplace",
    description: "Institute marketplace, providers and CRM leads.",
    category: "Business",
    route: "/institute-marketplace",
    icon: "store",
    roles: OWNER_ONLY_ROLES,
    featureKey: "marketplace.manage",
    order: 430,
  },
  {
    key: "white-label",
    label: "White Label",
    description: "Brand, domain and publishing controls.",
    category: "Business",
    route: "/white-label-system",
    icon: "brand",
    roles: OWNER_ONLY_ROLES,
    featureKey: "white_label.manage",
    order: 440,
  },
  {
    key: "subscription-plans",
    label: "Subscription Plans",
    description: "Razorpay Test Plans and NAXORA plan setup.",
    category: "Billing",
    route: "/subscription-plans",
    icon: "plans",
    roles: OWNER_ONLY_ROLES,
    billingControl: true,
    order: 500,
  },
  {
    key: "subscription-checkout",
    label: "Subscription Checkout",
    description: "Customer Test checkout and Subscription authorisation.",
    category: "Billing",
    route: "/subscription-checkout",
    icon: "checkout",
    roles: OWNER_ONLY_ROLES,
    billingControl: true,
    order: 510,
  },
  {
    key: "webhook-monitor",
    label: "Webhook Monitor",
    description: "Verified Razorpay webhook events and status sync.",
    category: "Billing",
    route: "/webhook-monitor",
    icon: "webhook",
    roles: OWNER_ONLY_ROLES,
    billingControl: true,
    order: 520,
  },
  {
    key: "subscription-access",
    label: "Feature Access",
    description: "Plan, role and V3 feature access controls.",
    category: "Billing",
    route: "/subscription-access-control",
    icon: "lock",
    roles: OWNER_ONLY_ROLES,
    billingControl: true,
    order: 530,
  },
  {
    key: "subscription-manager",
    label: "VANI Subscription Manager",
    description: "Safe Test pause, resume, cancellation and plan changes.",
    category: "Billing",
    route: "/vani-subscription-manager",
    icon: "manage",
    roles: OWNER_ONLY_ROLES,
    billingControl: true,
    order: 540,
  },
  {
    key: "live-readiness",
    label: "Live Payment Readiness",
    description: "Adult merchant controlled Razorpay Live launch gate.",
    category: "Billing",
    route: "/razorpay-live-readiness",
    icon: "shield",
    roles: OWNER_ONLY_ROLES,
    billingControl: true,
    order: 550,
  },
  {
    key: "owner-ai",
    label: "AI Owner Command Centre",
    description: "NAXORA OS 3.0 owner strategy and institute reasoning.",
    category: "NAXORA OS 3.0",
    route: "/owner-ai-command-centre",
    icon: "brain",
    roles: OWNER_ONLY_ROLES,
    featureKey: "owner_ai.command_centre",
    v3: true,
    upcomingIntegration: true,
    order: 600,
  },
  {
    key: "vani-v3",
    label: "VANI 3.0",
    description: "Human-like multi-step owner assistant.",
    category: "NAXORA OS 3.0",
    route: "/vani-v3",
    icon: "spark",
    roles: OWNER_ONLY_ROLES,
    featureKey: "vani.v3",
    v3: true,
    upcomingIntegration: true,
    order: 610,
  },
  {
    key: "business-growth-ai",
    label: "Business Growth AI",
    description: "Admissions, retention, revenue and growth strategy.",
    category: "NAXORA OS 3.0",
    route: "/ai-business-growth",
    icon: "growth",
    roles: OWNER_ONLY_ROLES,
    featureKey: "ai.business_growth",
    v3: true,
    upcomingIntegration: true,
    order: 620,
  },
  // PART 125 GLOBAL VANI ACTION MODULE START
  {
    key: "vani-actions",
    label: "Global VANI Actions",
    description: "Preview, confirm and execute role-safe multi-step actions.",
    category: "AI & VANI",
    route: "/vani-actions",
    icon: "spark",
    roles: ALL_LOGGED_IN_ROLES,
    alwaysAvailable: true,
    order: 315,
  },
  // PART 125 GLOBAL VANI ACTION MODULE END
  // PART 126 INTEGRATION CENTRE MODULE START
  {
    key: "integration-centre",
    label: "Integration & Notifications",
    description: "Native adapters, action reconciliation, notifications and E2E health.",
    category: "AI & VANI",
    route: "/integration-centre",
    icon: "manage",
    roles: ALL_LOGGED_IN_ROLES,
    alwaysAvailable: true,
    order: 316,
  },
  // PART 126 INTEGRATION CENTRE MODULE END
]);

const COMMAND_ALIASES = Object.freeze({
  home: "home",
  dashboard: "home",
  owner: "owner-dashboard",
  accounts: "account-access",
  "account manager": "account-access",
  teacher: "teacher-app",
  "teacher workspace": "teacher-app",
  student: "student-app",
  "student workspace": "student-app",
  parent: "parent-app",
  "parent workspace": "parent-app",
  // PART 124 ROLE WORKSPACE ALIASES START
  "role scope": "role-scope-manager",
  "scope manager": "role-scope-manager",
  "branch workspace": "branch-workspace",
  accountant: "accountant-workspace",
  accounts: "accountant-workspace",
  counsellor: "counsellor-workspace",
  counselor: "counsellor-workspace",
  "staff workspace": "staff-workspace",
  // PART 124 ROLE WORKSPACE ALIASES END
  attendance: "attendance",
  fees: "fees",
  fee: "fees",
  reports: "reports",
  report: "reports",
  "live class": "live-classes",
  classroom: "live-classes",
  notes: "ai-class-notes",
  "student support": "student-support",
  "vani 2": "vani-v2",
  branches: "branches",
  branch: "branches",
  franchise: "franchise",
  marketing: "marketing",
  marketplace: "marketplace",
  "white label": "white-label",
  plans: "subscription-plans",
  checkout: "subscription-checkout",
  webhook: "webhook-monitor",
  subscription: "subscription-access",
  "subscription manager": "subscription-manager",
  "live readiness": "live-readiness",
  "owner ai": "owner-ai",
  "vani 3": "vani-v3",
  "business growth": "business-growth-ai",
  // PART 125 GLOBAL VANI ACTION ALIASES START
  "vani actions": "vani-actions",
  "global vani": "vani-actions",
  "attendance mark": "vani-actions",
  "fee reminder": "vani-actions",
  "admission follow up": "vani-actions",
  "assignment create": "vani-actions",
  "assignment submit": "vani-actions",
  "message send": "vani-actions",
  "branch task": "vani-actions",
  // PART 125 GLOBAL VANI ACTION ALIASES END
  // PART 126 INTEGRATION CENTRE ALIASES START
  "integration centre": "integration-centre",
  integrations: "integration-centre",
  notifications: "integration-centre",
  "native adapters": "integration-centre",
  "e2e health": "integration-centre",
  // PART 126 INTEGRATION CENTRE ALIASES END
});

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
    branchmanager: "branch_manager",
    accounts: "accountant",
  };
  return aliases[role] || role;
}
function getBearerToken(req) {
  const auth = String(req.headers.authorization || "").trim();
  return auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
}
function getJwtSecrets() {
  return [
    process.env.JWT_SECRET,
    process.env.JWT_ACCESS_SECRET,
    process.env.ACCESS_TOKEN_SECRET,
    process.env.NAXORA_JWT_SECRET,
  ].map((value) => String(value || "").trim()).filter(Boolean);
}
function verifyJwtToken(token) {
  const secrets = getJwtSecrets();
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
      // Try the next configured secret.
    }
  }
  const error = new Error("Login session invalid or expired.");
  error.code = "INVALID_SESSION";
  error.httpStatus = 401;
  throw error;
}
function buildContext(req) {
  let payload = req.user || req.auth || null;
  const token = getBearerToken(req);
  if (!payload && token) payload = verifyJwtToken(token);
  if (!payload) {
    const error = new Error("Login required. Part 120 will add the common login screen.");
    error.code = "LOGIN_REQUIRED";
    error.httpStatus = 401;
    throw error;
  }

  const role = normalizeRole(payload.role || payload.userRole || payload.accountRole || payload.user?.role || "");
  if (!KNOWN_ROLES.has(role)) {
    const error = new Error("Supported NAXORA role required.");
    error.code = "UNSUPPORTED_ROLE";
    error.httpStatus = 403;
    throw error;
  }

  const requestInstituteId = cleanId(
    req.headers["x-naxora-institute-id"] || req.body?.instituteId || req.query?.instituteId || ""
  );
  const tokenInstituteId = cleanId(
    payload.instituteId || payload.institute_id || payload.user?.instituteId || payload.tenantId || ""
  );
  if (tokenInstituteId && requestInstituteId && tokenInstituteId !== requestInstituteId) {
    const error = new Error("Institute context does not match login session.");
    error.code = "INSTITUTE_CONTEXT_MISMATCH";
    error.httpStatus = 403;
    throw error;
  }
  const instituteId = tokenInstituteId || requestInstituteId;
  if (!instituteId) {
    const error = new Error("Valid instituteId required.");
    error.code = "INSTITUTE_ID_REQUIRED";
    error.httpStatus = 400;
    throw error;
  }

  return {
    role,
    instituteId,
    userId: cleanId(payload.userId || payload.id || payload._id || payload.sub || payload.user?.id || "user"),
    displayName: cleanText(
      payload.name || payload.fullName || payload.user?.name || payload.email || payload.user?.email || role,
      120
    ),
  };
}
function authenticated(req, res, next) {
  try {
    req.part119Context = buildContext(req);
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
function modulePublic(module, allowed = true, reasonCode = "ACCESS_GRANTED") {
  return {
    key: module.key,
    label: module.label,
    description: module.description,
    category: module.category,
    route: module.route,
    icon: module.icon,
    featureKey: module.featureKey || null,
    billingControl: Boolean(module.billingControl),
    v3: Boolean(module.v3),
    upcomingIntegration: Boolean(module.upcomingIntegration),
    allowed,
    reasonCode,
    order: module.order,
  };
}
async function accessState(context) {
  try {
    const access = await resolvePart116Access({
      instituteId: context.instituteId,
      role: context.role,
      userId: context.userId,
      persist: true,
    });
    return {
      available: true,
      basePlanCode: access.basePlanCode,
      v3Active: access.v3Active,
      entitlements: new Set(access.roleEntitlements || []),
      warnings: access.warnings || [],
    };
  } catch (error) {
    return {
      available: false,
      basePlanCode: "UNKNOWN",
      v3Active: false,
      entitlements: new Set(),
      warnings: [error.code || "PART116_ACCESS_UNAVAILABLE"],
    };
  }
}
function roleCanSee(module, role) {
  return module.roles.includes(role);
}
function moduleDecision(module, context, access) {
  if (!roleCanSee(module, context.role)) {
    return { allowed: false, reasonCode: "ROLE_NOT_ALLOWED" };
  }
  if (module.alwaysAvailable || module.billingControl) {
    return { allowed: true, reasonCode: "ACCESS_GRANTED" };
  }
  if (!module.featureKey) {
    return { allowed: true, reasonCode: "ACCESS_GRANTED" };
  }
  if (!access.available) {
    return {
      allowed: module.featureKey === "core.dashboard",
      reasonCode: module.featureKey === "core.dashboard" ? "ACCESS_GRANTED_FALLBACK" : "PART116_ACCESS_UNAVAILABLE",
    };
  }
  if (!access.entitlements.has(module.featureKey)) {
    return {
      allowed: false,
      reasonCode: module.v3 ? "ACTIVE_V3_SUBSCRIPTION_REQUIRED" : "PLAN_OR_ROLE_ENTITLEMENT_REQUIRED",
    };
  }
  return { allowed: true, reasonCode: "ACCESS_GRANTED" };
}
async function navigationFor(context) {
  const access = await accessState(context);
  const decisions = MODULES
    .map((module) => {
      const decision = moduleDecision(module, context, access);
      return modulePublic(module, decision.allowed, decision.reasonCode);
    })
    .filter((module) => module.allowed)
    .sort((a, b) => a.order - b.order);

  return {
    role: context.role,
    instituteId: context.instituteId,
    displayName: context.displayName,
    subscription: {
      accessEngineAvailable: access.available,
      basePlanCode: access.basePlanCode,
      v3Active: access.v3Active,
      warnings: access.warnings,
    },
    modules: decisions,
  };
}
function findModule(command = "") {
  const text = cleanText(command, 500).toLowerCase();
  for (const [alias, key] of Object.entries(COMMAND_ALIASES)) {
    if (text.includes(alias)) return key;
  }
  for (const module of MODULES) {
    if (text.includes(module.label.toLowerCase()) || text.includes(module.key.toLowerCase())) return module.key;
  }
  return "";
}
function isNavigationCommand(text = "") {
  return /(open|kholo|dikhao|show|go to|le chalo|launch|screen|module)/i.test(text);
}
function hash(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

export function registerPart119UnifiedAppShell({ app } = {}) {
  if (!app || typeof app.get !== "function" || typeof app.post !== "function") {
    throw new Error("Part 119 registration failed: Express app required.");
  }
  if (app.locals.part119UnifiedAppShellRegistered) return;
  app.locals.part119UnifiedAppShellRegistered = true;

  app.get(["/app", "/naxora-app", "/unified-app", "/part119"], (req, res) => {
    res.sendFile(path.join(frontendDir, "naxora-unified-app.html"));
  });
  app.get("/naxora-unified-app.css", (req, res) => {
    res.type("text/css").sendFile(path.join(frontendDir, "naxora-unified-app.css"));
  });
  app.get("/naxora-unified-app.js", (req, res) => {
    res.type("application/javascript").sendFile(path.join(frontendDir, "naxora-unified-app.js"));
  });
  app.get("/naxora-shell-bridge.js", (req, res) => {
    res.type("application/javascript").sendFile(path.join(frontendDir, "naxora-shell-bridge.js"));
  });

  app.get("/api/part119/status", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      name: PART_NAME,
      status: "unified_shell_active",
      mainAppUrl: "/app",
      commonLoginIntegrated: true,
      commonLoginTargetPart: null,
      serverApprovedModuleCatalog: true,
      roleAwareNavigation: true,
      part116EntitlementFiltering: true,
      globalVaniNavigation: true,
      globalVaniActionExecution: false,
      globalVaniActionTargetPart: 125,
      legacyModulesEmbeddedInsideShell: true,
      arbitraryExternalUrlsAllowed: false,
      unifiedProductionLaunchTargetPart: 127,
    });
  });

  app.get("/api/part119/catalog", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      count: MODULES.length,
      categories: [...new Set(MODULES.map((module) => module.category))],
      modules: MODULES.map((module) => ({
        key: module.key,
        label: module.label,
        description: module.description,
        category: module.category,
        icon: module.icon,
        roles: module.roles,
        featureKey: module.featureKey || null,
        billingControl: Boolean(module.billingControl),
        v3: Boolean(module.v3),
        upcomingIntegration: Boolean(module.upcomingIntegration),
      })),
      routesHiddenUntilAuthorized: true,
    });
  });

  app.get("/api/part119/security-policy", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      privateNavigationRequiresJwt: true,
      instituteIdMatchRequired: true,
      roleFilteringServerSide: true,
      subscriptionFilteringUsesPart116: true,
      arbitraryRouteFromUserBlocked: true,
      iframeRoutesComeFromServerAllowlist: true,
      externalUrlNavigationBlocked: true,
      vaniPart119NavigationOnly: true,
      riskyActionsRequireExistingModuleSecurity: true,
      ownerV3ControlsRemainOwnerOnly: true,
      commonLoginPendingPart120: false,
      fullVaniOrchestrationPendingPart125: true,
    });
  });

  app.get("/api/part119/session", authenticated, (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      session: req.part119Context,
      tokenReturned: false,
    });
  });

  app.get("/api/part119/navigation", authenticated, async (req, res) => {
    const navigation = await navigationFor(req.part119Context);
    res.json({
      success: true,
      part: PART_NUMBER,
      ...navigation,
      moduleRoutesFromServerAllowlist: true,
    });
  });

  app.post("/api/part119/module/open", authenticated, async (req, res) => {
    const key = cleanText(req.body?.moduleKey || "", 100);
    const module = MODULES.find((item) => item.key === key);
    if (!module) {
      return res.status(404).json({
        success: false,
        part: PART_NUMBER,
        code: "UNKNOWN_MODULE",
        message: "Unknown unified-app module.",
      });
    }
    const access = await accessState(req.part119Context);
    const decision = moduleDecision(module, req.part119Context, access);
    if (!decision.allowed) {
      return res.status(decision.reasonCode === "ROLE_NOT_ALLOWED" ? 403 : 402).json({
        success: false,
        part: PART_NUMBER,
        code: decision.reasonCode,
        message: "This module is not available for the current role/subscription.",
        moduleKey: key,
      });
    }
    res.json({
      success: true,
      part: PART_NUMBER,
      module: modulePublic(module, true, "ACCESS_GRANTED"),
      launchToken: hash(`${req.part119Context.userId}:${req.part119Context.instituteId}:${module.key}`).slice(0, 20),
      externalUrl: false,
    });
  });

  app.post("/api/part119/vani/command", authenticated, async (req, res) => {
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
      return res.json({
        success: true,
        part: PART_NUMBER,
        replyText: "Sensitive credentials VANI ko mat boliye. Private module screen use karein.",
        spokenSafeSummary: "Sensitive details private rahengi.",
        actionExecuted: false,
        privateScreenFirst: true,
      });
    }

    const moduleKey = findModule(command);
    const navigation = await navigationFor(req.part119Context);
    if (moduleKey && isNavigationCommand(command)) {
      const allowed = navigation.modules.find((module) => module.key === moduleKey);
      if (!allowed) {
        const known = MODULES.find((module) => module.key === moduleKey);
        return res.json({
          success: true,
          part: PART_NUMBER,
          replyText: known
            ? `${known.label} aapke current role ya subscription me available nahi hai.`
            : "Requested module nahi mila.",
          spokenSafeSummary: "Yeh module abhi available nahi hai.",
          actionExecuted: false,
          openModuleKey: null,
        });
      }
      return res.json({
        success: true,
        part: PART_NUMBER,
        replyText: `${allowed.label} unified app ke andar khol rahi hoon.`,
        spokenSafeSummary: `${allowed.label} khol rahi hoon.`,
        openModuleKey: allowed.key,
        actionExecuted: true,
        actionLevel: "safe_navigation",
      });
    }

    if (/(kya kar sakti|help|madad|modules|features|menu)/i.test(command)) {
      return res.json({
        success: true,
        part: PART_NUMBER,
        replyText: `Aapke role ke liye ${navigation.modules.length} unified modules available hain. Main abhi modules open aur search kar sakti hoon. Multi-step work Part 125 me connect hoga.`,
        spokenSafeSummary: `${navigation.modules.length} modules available hain.`,
        privateScreenDetails: navigation.modules,
        actionExecuted: false,
      });
    }

    return res.json({
      success: true,
      part: PART_NUMBER,
      replyText: "Part 119 VANI navigation mode me hai. Module ka naam bolkar 'kholo' kahiye. Form filling aur multi-step actions Part 125 me connect honge.",
      spokenSafeSummary: "Module ka naam bolkar kholo kahiye.",
      availableModuleCount: navigation.modules.length,
      actionExecuted: false,
    });
  });

  app.get("/api/part119/health", (req, res) => {
    const part116ModelReady = Boolean(mongoose.models.Part116AccessSnapshot);
    res.json({
      success: true,
      part: PART_NUMBER,
      shellFilesReady: true,
      moduleCount: MODULES.length,
      part116ModelReady,
      databaseConnected: mongoose.connection?.readyState === 1,
      commonLoginReady: true,
      unifiedShellReady: true,
    });
  });

  app.get("/api/part119/demo", (req, res) => {
    res.json({
      success: true,
      part: PART_NUMBER,
      name: PART_NAME,
      page: "/app",
      flow: [
        "Detect existing JWT from the previous role login",
        "Verify JWT and instituteId on the server",
        "Filter modules by role",
        "Filter paid/V3 modules through Part 116",
        "Open approved legacy routes inside the central content pane",
        "Keep one main app URL with hash-based module state",
        "Use global VANI for safe module navigation",
      ],
      pending: {
        commonLogin: 120,
        fullRoleModuleWiring: "121-124",
        multiStepGlobalVani: 125,
        paymentNotificationE2E: 126,
        finalUnifiedProductionLaunch: 127,
      },
    });
  });
}
