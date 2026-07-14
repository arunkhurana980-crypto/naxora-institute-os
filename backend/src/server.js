import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import teacherRoutes from "./routes/teacherRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import batchRoutes from "./routes/batchRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import feeRoutes from "./routes/feeRoutes.js";
import doubtRoutes from "./routes/doubtRoutes.js";
import assignmentRoutes from "./routes/assignmentRoutes.js";
import testRoutes from "./routes/testRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import announcementRoutes from "./routes/announcementRoutes.js";
import certificateRoutes from "./routes/certificateRoutes.js";
import libraryRoutes from "./routes/libraryRoutes.js";
import financeRoutes from "./routes/financeRoutes.js";
import staffRoutes from "./routes/staffRoutes.js";
import parentRoutes from "./routes/parentRoutes.js";
import progressRoutes from "./routes/progressRoutes.js";
import questionPaperRoutes from "./routes/questionPaperRoutes.js";
import questionBankRoutes from "./routes/questionBankRoutes.js";
import timetableRoutes from "./routes/timetableRoutes.js";
import branchRoutes from "./routes/branchRoutes.js";
import enquiryRoutes from "./routes/enquiryRoutes.js";
import followupRoutes from "./routes/followupRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import superAdminRoutes from "./routes/superAdminRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import securityRoutes from "./routes/securityRoutes.js";
import aiNoteRoutes from "./routes/aiNoteRoutes.js";
import aiMockTestRoutes from "./routes/aiMockTestRoutes.js";
import aiRoadmapRoutes from "./routes/aiRoadmapRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import emailNotificationRoutes from "./routes/emailNotificationRoutes.js";
import discoveryRoutes from "./routes/discoveryRoutes.js";
import liveClassRoutes from "./routes/liveClassRoutes.js";
import onlineBatchRoutes from "./routes/onlineBatchRoutes.js";
import landingRoutes from "./routes/landingRoutes.js";
import animationRoutes from "./routes/animationRoutes.js";
import adminAnalyticsRoutes from "./routes/adminAnalyticsRoutes.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";
import { basicRateLimit, sanitizeBody, securityHeaders } from "./middleware/securityMiddleware.js";

const app = express();
app.disable("x-powered-by");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.resolve(__dirname, "../../frontend");

// ================= PART 51: SECURE PUBLIC / PRIVATE ROUTE CLEANUP =================
// Final live product me public users ko internal debug/demo/launch pages nahi dikhne chahiye.
const isProduction = (process.env.NODE_ENV || "development") === "production";
const internalToolsEnabled = String(process.env.INTERNAL_TOOLS_ENABLED || (!isProduction ? "true" : "false")).toLowerCase() === "true";
const demoModeEnabled = String(process.env.DEMO_MODE_ENABLED || (!isProduction ? "true" : "false")).toLowerCase() === "true";
const internalAdminKey = process.env.INTERNAL_ADMIN_KEY || "";

const publicRoutes = [
  "/",
  "/landing",
  "/login",
  "/signup",
  "/dashboard",
  "/student",
  "/parent",
  "/admin",
  "/branding",
  "/brand",
  "/role-permissions",
  "/permissions",
  "/smart-enrolment",
  "/enrolment",
  "/admission",
  "/admissions",
  "/student-parent-portal",
  "/student-portal",
  "/parent-portal",
  "/portal",
  "/enquiry-followup-crm",
  "/enquiry-crm",
  "/followup-crm",
  "/admission-crm",
  "/public-institute-profile",
  "/institute-profile-public",
  "/public-profile",
  "/institute-showcase",
  "/request-callback",
  "/send-enquiry",
  "/callback",
  "/institute-enquiry",
  "/nearby-institutes",
  "/nearby",
  "/institutes-near-me",
  "/local-institutes",
  "/compare-institutes",
  "/compare",
  "/institute-comparison",
  "/compare-coaching",
  "/discovery-leads-integration",
  "/discovery-journey",
  "/admission-journey",
  "/lead-integration",
  "/ai-hub",
  "/ai-features",
  "/ai-tools",
  "/vani-ai",
  "/vani-assistant",
  "/ai-credits-usage",
  "/ai-credits",
  "/ai-usage",
  "/credits",
  "/vani-ai-v1",
  "/vani",
  "/voice-search",
  "/vani-search"
];

const internalPageFiles = new Set([
  "launch-package.html",
  "final-testing.html",
  "system-debug.html",
  "client-pitch.html",
  "demo-mode.html",
  "deployment.html",
  "razorpay-final.html"
]);

const internalApiPrefixes = [
  "/api/route-check",
  "/api/system",
  "/api/features",
  "/api/demo-data",
  "/api/final-testing",
  "/api/launch-package",
  "/api/client-pitch",
  "/api/demo-mode",
  "/api/deployment",
  "/api/part44",
  "/api/part45",
  "/api/part46",
  "/api/part47",
  "/api/part48",
  "/api/part49"
];

function wantsInternalAccess(req) {
  if (internalToolsEnabled) return true;
  if (!internalAdminKey) return false;
  const keyFromHeader = req.get("x-internal-admin-key");
  const keyFromQuery = req.query?.internalKey;
  return keyFromHeader === internalAdminKey || keyFromQuery === internalAdminKey;
}

function isInternalApiPath(pathname) {
  return internalApiPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));
}

function sendPrivateRouteBlocked(req, res) {
  return res.status(404).json({
    success: false,
    message: "This is a private NAXORA internal route and is disabled for public users.",
    publicRoutes,
    fixForFounder: "Local testing ke liye NODE_ENV=development rakho. Production me INTERNAL_TOOLS_ENABLED=false hi rakho."
  });
}

function sendFileSafe(res, fileName) {
  return res.sendFile(path.join(frontendPath, fileName));
}

// Serve only safe static assets at clean public paths, so /login and /dashboard
// can load style.css, dashboard.css, app.js, images, etc. without exposing
// internal HTML pages like launch-package.html or system-debug.html.
function serveSafeFrontendAsset(req, res, next) {
  const safeAssetPattern = /\.(css|js|png|jpg|jpeg|webp|svg|ico|gif|json|map)$/i;
  if (!safeAssetPattern.test(req.path)) return next();
  return express.static(frontendPath, {
    index: false,
    fallthrough: true,
    maxAge: isProduction ? "1h" : 0
  })(req, res, next);
}
// ================= END PART 51 CONFIG =================


const extraOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [
  process.env.FRONTEND_URL,
  ...extraOrigins,
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "http://127.0.0.1:5501",
  "http://localhost:5501",
  "http://127.0.0.1:5502",
  "http://localhost:5502",
  "http://127.0.0.1:5503",
  "http://localhost:5503",
].filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Razorpay-Signature"],
}));

app.use(securityHeaders);
app.use(basicRateLimit);

app.use(express.json({
  limit: "1mb",
  verify: (req, res, buf) => {
    req.rawBody = buf;
  },
}));
app.use(sanitizeBody);

// Part 51 UI asset fix: clean URLs like /login should still load CSS/JS.
app.use(serveSafeFrontendAsset);

// Clean URL redirect fix: agar browser me purana /index.html ya direct html route type ho,
// user ko final secure clean route par bhej do. Production me raw HTML URLs expose nahi honge.
app.get("/index.html", (req, res) => res.redirect(302, "/login"));
app.get("/dashboard.html", (req, res) => res.redirect(302, "/dashboard"));
app.get("/students.html", (req, res) => res.redirect(302, "/student"));
app.get("/parents.html", (req, res) => res.redirect(302, "/parent"));
app.get("/super-admin.html", (req, res) => res.redirect(302, "/admin"));

app.get("/", (req, res) => sendFileSafe(res, "landing.html"));
app.get("/landing", (req, res) => sendFileSafe(res, "landing.html"));
app.get("/login", (req, res) => sendFileSafe(res, "index.html"));
app.get("/signup", (req, res) => sendFileSafe(res, "index.html"));
app.get("/dashboard", (req, res) => sendFileSafe(res, "dashboard.html"));
app.get("/student", (req, res) => sendFileSafe(res, "students.html"));
app.get("/parent", (req, res) => sendFileSafe(res, "parents.html"));
app.get("/admin", (req, res) => sendFileSafe(res, "super-admin.html"));
app.get("/branding", (req, res) => sendFileSafe(res, "branding.html"));
app.get("/brand", (req, res) => sendFileSafe(res, "branding.html"));
app.get("/role-permissions", (req, res) => sendFileSafe(res, "role-permissions.html"));
app.get("/permissions", (req, res) => sendFileSafe(res, "role-permissions.html"));

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    app: "NAXORA Institute OS",
    status: "running",
    dbMode: globalThis.NAXORA_DB_MODE || "starting",
    note: globalThis.NAXORA_DB_MODE === "mock" ? "MongoDB connect nahi hai, par backend crash-free mock mode me chal raha hai." : "MongoDB connected mode.",
    part: "Part 68 - AI Credits and Usage",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});




// ================= PART 51: PUBLIC ROUTE POLICY =================
app.use((req, res, next) => {
  if (isProduction && isInternalApiPath(req.path) && !wantsInternalAccess(req)) {
    return sendPrivateRouteBlocked(req, res);
  }
  return next();
});

app.get("/api/public-route-policy/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 51 - Secure Public / Private Route Cleanup + UI Asset Fix",
    status: "active",
    environment: process.env.NODE_ENV || "development",
    internalToolsEnabled,
    demoModeEnabled,
    publicRoutes,
    publicPages: {
      landing: "/",
      login: "/login",
      signup: "/signup",
      dashboardAfterLogin: "/dashboard",
      studentPortal: "/student",
      parentPortal: "/parent",
      adminPortal: "/admin"
    },
    privatePages: Array.from(internalPageFiles).map((file) => `/app/${file}`),
    productionRule: "Production me internal pages/API public users ko 404 denge jab INTERNAL_TOOLS_ENABLED=false hoga.",
    note: "Local development me testing easy rakhne ke liye internal tools default ON hain. Live deploy se pehle NODE_ENV=production set karo."
  });
});

app.get("/api/part51/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 51 - Final Secure Route Cleanup + UI Asset Fix",
    basedOn: "Part 50 Final Launch Package",
    status: "final-secure-build-active",
    publicEntry: "/",
    login: "/login",
    dashboard: "/dashboard",
    admin: "/admin",
    internalToolsPublic: internalToolsEnabled,
    finalAdvice: "Live users ko only landing/login/dashboard role pages dikhne chahiye. Debug/demo/launch pages production me hidden rakho."
  });
});
// ================= END PART 51 PUBLIC ROUTE POLICY =================

// ================= PART 45: FINAL SALES DEMO MODE =================
const salesDemoPersonas = [
  {
    id: "owner",
    role: "admin",
    icon: "🏫",
    title: "Institute Owner Demo",
    name: "NAXORA Demo Owner",
    email: "owner.demo@naxora.local",
    passwordHint: "One-click demo login",
    description: "Owner ke liye full institute control: students, fees, attendance, batches, leads, reports, payments aur staff.",
    bestFor: "Coaching owner ko 5-minute pitch dikhane ke liye",
    primaryPages: ["Dashboard", "Students", "Fees", "Attendance", "Enquiries", "Payments", "Reports"],
    pitchLine: "Aapka institute ek dashboard se manage hoga — fees, attendance, leads, reports aur payments sab connected."
  },
  {
    id: "student",
    role: "student",
    icon: "🎓",
    title: "Student Demo",
    name: "Aman Student",
    email: "student.demo@naxora.local",
    passwordHint: "One-click demo login",
    description: "Student ke liye batches, live classes, notes, mock tests, progress aur certificates ka clean view.",
    bestFor: "Institute ko student-side experience dikhane ke liye",
    primaryPages: ["Online Batch Access", "Live Classes", "AI Notes", "AI Mock Tests", "Progress", "Certificates"],
    pitchLine: "Student ko ek jagah class, notes, tests, progress aur recordings milengi."
  },
  {
    id: "parent",
    role: "parent",
    icon: "👪",
    title: "Parent Demo",
    name: "Parent Demo User",
    email: "parent.demo@naxora.local",
    passwordHint: "One-click demo login",
    description: "Parent ko child attendance, fees, progress, results aur institute updates ka simple portal.",
    bestFor: "Parent communication value samjhane ke liye",
    primaryPages: ["Parents", "Attendance", "Fees", "Progress", "Announcements", "Email"],
    pitchLine: "Parents ko baar-baar call nahi karna padega — progress aur fees status portal par dikhega."
  },
  {
    id: "super-admin",
    role: "admin",
    icon: "🛡️",
    title: "Super Admin Demo",
    name: "NAXORA Super Admin",
    email: "superadmin.demo@naxora.local",
    passwordHint: "One-click demo login",
    description: "SaaS founder ke liye institutes, subscriptions, revenue, plans, discovery leads aur analytics control room.",
    bestFor: "NAXORA SaaS business ko investor/client style dikhane ke liye",
    primaryPages: ["Super Admin", "Subscriptions", "Admin Analytics", "Discovery Leads", "Settings", "Security"],
    pitchLine: "NAXORA ek SaaS business ban sakta hai jahan har institute subscription par chalega."
  }
];

const salesDemoWalkthrough = [
  {
    step: 1,
    title: "Owner Problem Show",
    duration: "40 sec",
    script: "Sir, coaching me sabse bada issue hota hai fees, attendance, enquiries aur staff ka scattered data. NAXORA OS in sabko ek system me laata hai.",
    openPage: "/app/dashboard.html"
  },
  {
    step: 2,
    title: "Core Management Demo",
    duration: "90 sec",
    script: "Yahan students, teachers, batches, fees aur attendance modules ek saath connected hain. Owner ko daily institute ka real snapshot milta hai.",
    openPage: "/app/students.html"
  },
  {
    step: 3,
    title: "Revenue + Fees Demo",
    duration: "60 sec",
    script: "Fees records, pending dues, payment history aur receipt system owner ko collection improve karne me help karta hai.",
    openPage: "/app/fees.html"
  },
  {
    step: 4,
    title: "Leads + Discovery Demo",
    duration: "60 sec",
    script: "Student apne area me institute search karega. Sirf NAXORA partner institutes show honge aur enquiry direct institute dashboard me aayegi.",
    openPage: "/app/discovery.html"
  },
  {
    step: 5,
    title: "Live Classes + Batch Access",
    duration: "60 sec",
    script: "Live classes paid batch access se gated hain. Student tabhi join karega jab batch enrollment active aur fees paid hogi.",
    openPage: "/app/live-classes.html"
  },
  {
    step: 6,
    title: "Final Pricing Pitch",
    duration: "50 sec",
    script: "Aap Starter, Pro, Premium aur add-ons choose kar sakte ho. Software staff replace nahi karta — repetitive work simple karta hai.",
    openPage: "/app/subscriptions.html"
  }
];

const salesDemoMetrics = {
  headline: "Client Pitch Ready Demo",
  mrrPotential: "₹50,000+/month",
  demoDuration: "5–7 min",
  conversionGoal: "First 3 beta institutes",
  modulesReady: 45,
  pitchCards: [
    { label: "Student CRM", value: "120 demo students", icon: "🎓" },
    { label: "Monthly Collection", value: "₹1.85L demo", icon: "💳" },
    { label: "Discovery Leads", value: "42 demo leads", icon: "📍" },
    { label: "Live Classes", value: "18 sessions", icon: "🎥" },
    { label: "SaaS Plans", value: "5 plans", icon: "💎" },
    { label: "AI Modules", value: "4 AI tools", icon: "🤖" }
  ]
};

function getSalesDemoDashboard(personaId = "owner") {
  const persona = salesDemoPersonas.find((item) => item.id === personaId) || salesDemoPersonas[0];
  const role = persona.role;
  const baseActions = persona.id === "student"
    ? ["Join live class", "View AI notes", "Attempt mock test", "Check progress", "Download certificate"]
    : persona.id === "parent"
      ? ["View child attendance", "Check pending fees", "Read progress report", "View announcements", "Contact institute"]
      : persona.id === "super-admin"
        ? ["View all institutes", "Check subscriptions", "Open admin analytics", "Review discovery leads", "Check system debug"]
        : ["Add new student", "View fee collection", "Mark attendance", "Check enquiries", "Open reports"];

  return {
    greeting: `${persona.icon} ${persona.title}`,
    institute: "NAXORA Sales Demo Mode",
    role,
    cards: salesDemoMetrics.pitchCards.map((card) => ({
      title: card.label,
      value: card.value,
      label: "Demo data for client pitch",
      icon: card.icon
    })),
    roadmapModules: persona.primaryPages.map((page, index) => ({
      icon: ["🚀", "📊", "💡", "🔐", "💳", "📈"][index % 6],
      name: page,
      status: "Demo Ready"
    })),
    quickActions: baseActions,
    demoMode: true,
    persona,
    walkthrough: salesDemoWalkthrough
  };
}

app.get("/api/demo-mode/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 45 - Final Sales Demo Mode",
    basedOn: "Part 44 Integrated Master Bug Fix Build",
    status: "active",
    demoUrl: "/app/demo-mode.html",
    routes: [
      "GET /api/demo-mode/status",
      "GET /api/demo-mode/personas",
      "GET /api/demo-mode/walkthrough",
      "GET /api/demo-mode/dashboard/:persona",
      "POST /api/demo-mode/login"
    ],
    purpose: "Client ko 5-7 minute me NAXORA Institute OS ka complete demo dikhana."
  });
});

app.get("/api/demo-mode/personas", (req, res) => {
  res.json({ success: true, personas: salesDemoPersonas, metrics: salesDemoMetrics });
});

app.get("/api/demo-mode/walkthrough", (req, res) => {
  res.json({ success: true, walkthrough: salesDemoWalkthrough, metrics: salesDemoMetrics });
});

app.get("/api/demo-mode/dashboard/:persona", (req, res) => {
  res.json({ success: true, dashboard: getSalesDemoDashboard(req.params.persona) });
});

app.post("/api/demo-mode/login", (req, res) => {
  const requestedPersona = req.body?.persona || "owner";
  const persona = salesDemoPersonas.find((item) => item.id === requestedPersona) || salesDemoPersonas[0];
  res.json({
    success: true,
    message: `${persona.title} activated. Ye real password login nahi hai; sales demo ke liye safe demo session hai.`,
    token: `naxora_demo_${persona.id}`,
    user: {
      id: `demo-${persona.id}`,
      name: persona.name,
      email: persona.email,
      role: persona.role,
      demoPersona: persona.id,
      isDemo: true
    },
    redirect: "/app/dashboard.html",
    dashboard: getSalesDemoDashboard(persona.id)
  });
});

// Demo token dashboard intercept: normal auth dashboard se pehle demo token ko safe demo response deta hai.
function demoDashboardIntercept(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token.startsWith("naxora_demo_")) return next();
  const personaId = token.replace("naxora_demo_", "");
  return res.json(getSalesDemoDashboard(personaId));
}

// ================= END PART 45 =================

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", demoDashboardIntercept, dashboardRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/batches", batchRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/fees", feeRoutes);
app.use("/api/doubts", doubtRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/tests", testRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/library", libraryRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/parents", parentRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/test-builder", questionPaperRoutes);
app.use("/api/question-bank", questionBankRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/enquiries", enquiryRoutes);
app.use("/api/followups", followupRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/security", securityRoutes);
app.use("/api/ai-notes", aiNoteRoutes);
app.use("/api/ai-mock-tests", aiMockTestRoutes);
app.use("/api/ai-roadmaps", aiRoadmapRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/email-notifications", emailNotificationRoutes);
app.use("/api/discovery", discoveryRoutes);
app.use("/api/live-classes", liveClassRoutes);
app.use("/api/online-batches", onlineBatchRoutes);
app.use("/api/landing", landingRoutes);
app.use("/api/animations", animationRoutes);
app.use("/api/admin-analytics", adminAnalyticsRoutes);


// Part 36 Mobile Responsive Polish status route.
app.get("/api/mobile-polish/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 36 - Mobile Responsive Polish",
    features: [
      "mobile sidebar drawer",
      "bottom navigation",
      "responsive forms",
      "responsive cards and grids",
      "table overflow fix",
      "safe area padding for phones"
    ],
    frontendFiles: ["frontend/mobile-polish.css", "frontend/mobile-polish.js"],
  });
});


// Part 40 Online Batch Access Management status route.
app.get("/api/theme/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 44 Integrated - Part 1 to 43 + Master Bug Fix",
    features: [
      "dark mode",
      "light mode",
      "system theme auto-detect",
      "floating theme switcher",
      "theme saved in localStorage",
      "settings page theme sync",
      "premium color polish"
    ],
    frontendFiles: ["frontend/theme-system.css", "frontend/theme-system.js", "frontend/theme.html"],
  });
});



// Part 40 Online Batch Access Management status route.
app.get("/api/discovery/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 44 Integrated - Part 1 to 43 + Master Bug Fix",
    concept: "Students search nearby NAXORA partner institutes and submit enquiries. Institutes receive qualified leads.",
    publicRoutes: ["GET /api/discovery/search", "POST /api/discovery/leads"],
    protectedRoutes: ["GET/POST /api/discovery/my-listings", "GET /api/discovery/my-leads"],
    rule: "Public listing me sirf NAXORA service lene wale active/trial/premium institutes show honge.",
    frontendFiles: ["frontend/discovery.html", "frontend/discovery.css", "frontend/discovery.js"],
  });
});


// Part 40 Online Batch Access Management status route.
app.get("/api/live-classes-check", (req, res) => {
  res.json({
    success: true,
    part: "Part 44 Integrated - Part 1 to 43 + Master Bug Fix",
    concept: "Institute apni live classes schedule kare, students comments/chat karen, recordings/resources attach hon, aur Live Classes ka subscription base OS se alag rahe.",
    protectedRoutes: ["GET/POST /api/live-classes", "GET/POST /api/live-classes/:id/comments", "GET/POST /api/live-classes/subscriptions"],
    frontendFiles: ["frontend/live-classes.html", "frontend/live-classes.css", "frontend/live-classes.js"],
  });
});



// Part 40 Online Batch Access Management status route.
// FIXED: app.get() ko multiple string paths galat tarah pass ho rahe the,
// isliye Express crash ho raha tha. Ab sirf /api/online-batches-check yahan handle hoga.
// /api/landing/* aur /api/animations/* apne routers se already registered hain.
app.get("/api/online-batches-check", (req, res) => {
  res.json({
    success: true,
    part: "Part 44 Integrated - Part 1 to 43 + Master Bug Fix",
    concept: "Live class access batch enrollment aur fees status se linked hai. Student sirf paid/active batch access hone par live class join karega.",
    protectedRoutes: ["GET/POST /api/online-batches", "GET/POST /api/online-batches/:id/enrollments", "POST /api/online-batches/:id/check-access"],
    publicRoutes: ["GET /api/online-batches/status", "GET /api/online-batches/public"],
    relatedRoutes: ["/api/landing/status", "/api/landing/plans", "/api/animations/status", "/api/animations/sections", "/api/integrated-status"],
    frontendFiles: ["frontend/online-batches.html", "frontend/online-batches.css", "frontend/online-batches.js"],
    nextRoadmap: "Premium SaaS Landing Page Part 41 se start ho chuka hai."
  });
});


// Part 41 Premium SaaS Landing Page status route is registered at /api/landing/status.
// Part 42 Premium Animation Polish routes are registered at /api/animations/status and /api/animations/sections.
app.get("/api/integrated-status", (req, res) => {
  res.json({
    success: true,
    part: "Part 44 Integrated Full Build",
    includes: [
      "Part 1 to Part 40 full Institute OS modules",
      "Part 41 Premium SaaS Landing Page",
      "Part 42 Premium Animation Polish + Advanced UI Sections",
      "Part 43 Admin Analytics Charts + Growth Dashboard",
      "Part 44 Master Bug Fix + Demo Data Seeder",
      "Part 45 Final Sales Demo Mode",
      "Part 46 Full Client Pitch Dashboard",
      "Part 47 Production Deployment Final Fix",
      "Part 48 Razorpay Live Payment Final Setup"
    ],
    open: {
      app: "/app",
      landing: "/landing/landing.html",
      animatedLanding: "/landing/landing-animated.html",
      dashboardPolish: "/app/dashboard-polish.html"
    },
    routes: ["/api/landing/status", "/api/landing/plans", "/api/animations/status", "/api/animations/sections", "/api/admin-analytics/status", "/api/admin-analytics", "/api/demo-mode/status", "/api/demo-mode/personas", "/api/client-pitch/status", "/api/client-pitch", "/api/deployment/status", "/api/deployment/env-check", "/api/deployment/checklist", "/api/razorpay-final/status", "/api/razorpay-final/pricing", "/api/part48/status",
      "/api/final-testing/status",
      "/api/launch-package/status",
      "/api/part50/status"]
  });
});

// Route debug helper: browser me quickly check karne ke liye kaunsa backend active hai.
app.get("/api/route-check", (req, res) => {
  res.json({
    success: true,
    part: "Part 44 Integrated - Part 1 to 43 + Master Bug Fix",
    activeRoutes: [
      "/api/ai-mock-tests",
      "/api/ai-roadmaps",
      "/api/notifications",
      "/api/notifications/config",
      "/api/email-notifications",
      "/api/email-notifications/config",
      "/api/mobile-polish/status",
      "/api/theme/status",
      "/api/discovery/search",
      "/api/discovery/my-listings",
      "/api/discovery/my-leads",
      "/api/live-classes",
      "/api/live-classes/status",
      "/api/live-classes/subscriptions",
      "/api/online-batches",
      "/api/online-batches/status",
      "/api/online-batches-check",
      "/api/landing/status",
      "/api/landing/plans",
      "/api/landing/demo-request",
      "/api/animations/status",
      "/api/animations/sections",
      "/api/integrated-status",
      "/api/admin-analytics/status",
      "/api/admin-analytics",
      "/api/security/status",
      "/api/payments/config",
      "/api/system/debug",
      "/api/features",
      "/api/demo-data/status",
      "/api/part44/status",
      "/api/demo-mode/status",
      "/api/demo-mode/personas",
      "/api/demo-mode/walkthrough",
      "/api/client-pitch/status",
      "/api/client-pitch",
      "/api/deployment/status",
      "/api/deployment/env-check",
      "/api/deployment/checklist",
      "/api/part47/status",
      "/api/razorpay-final/status",
      "/api/razorpay-final/pricing",
      "/api/razorpay-final/checklist",
      "/api/part48/status"
    ],
    fix: "Agar route not found aaye to old backend band karke Part 44 integrated backend se npm run dev chalao."
  });
});



// ================= PART 44: MASTER BUG FIX + DEMO DATA SEEDER =================
const part44Features = [
  "Master route checker",
  "Failed to fetch debug helper",
  "MongoDB/env health checker",
  "Safe mock mode fallback",
  "Demo data seeder",
  "Frontend API auto-detect guide",
  "All major module route registry",
  "Old backend confusion detector"
];

const majorModuleRoutes = [
  "/api/auth", "/api/dashboard", "/api/students", "/api/teachers", "/api/courses", "/api/batches",
  "/api/online-batches", "/api/attendance", "/api/fees", "/api/finance", "/api/doubts", "/api/ai-notes",
  "/api/ai-mock-tests", "/api/ai-roadmaps", "/api/live-classes", "/api/notifications", "/api/email-notifications",
  "/api/assignments", "/api/tests", "/api/test-builder", "/api/question-bank", "/api/timetable", "/api/branches",
  "/api/enquiries", "/api/followups", "/api/discovery", "/api/subscriptions", "/api/payments", "/api/security",
  "/api/super-admin", "/api/admin-analytics", "/api/razorpay-final", "/api/settings", "/api/reports", "/api/announcements",
  "/api/certificates", "/api/library", "/api/landing", "/api/animations", "/api/demo-data", "/api/system/debug", "/api/client-pitch", "/api/deployment"
];

const demoData = {
  institutes: [
    { name: "NAXORA Demo Institute", city: "Ambala Cantt", plan: "Premium", status: "active", students: 120, monthlyRevenue: 185000 },
    { name: "Bhaijaan Tech Academy", city: "Shahabad Markanda", plan: "Pro", status: "trial", students: 48, monthlyRevenue: 62000 }
  ],
  students: [
    { name: "Aman Sharma", email: "aman.demo@naxora.local", phone: "9000000001", course: "AI + Web Development", batch: "Full Stack AI Batch", status: "active", feesStatus: "paid" },
    { name: "Priya Verma", email: "priya.demo@naxora.local", phone: "9000000002", course: "Cyber Security", batch: "Cyber Sentinel", status: "active", feesStatus: "partial" },
    { name: "Rohit Kumar", email: "rohit.demo@naxora.local", phone: "9000000003", course: "App Development", batch: "Flutter Pro", status: "active", feesStatus: "pending" }
  ],
  teachers: [
    { name: "Rahul Sir", subject: "Web Development", phone: "9000000101", salary: 35000, status: "active" },
    { name: "Neha Mam", subject: "AI Tools", phone: "9000000102", salary: 32000, status: "active" }
  ],
  batches: [
    { name: "Full Stack AI Batch", course: "AI + Web Development", fees: 2999, mode: "hybrid", status: "active" },
    { name: "Cyber Sentinel", course: "Cyber Security", fees: 1999, mode: "online", status: "active" }
  ],
  enquiries: [
    { studentName: "Karan", phone: "9000000201", interestedCourse: "AI Tools", source: "YouTube", leadType: "hot", status: "demo booked" },
    { studentName: "Simran", phone: "9000000202", interestedCourse: "Web Development", source: "Instagram", leadType: "warm", status: "new" }
  ],
  payments: [
    { payerName: "Aman Sharma", amount: 2999, purpose: "Batch Fees", provider: "Razorpay", status: "paid" },
    { payerName: "NAXORA Demo Institute", amount: 2999, purpose: "Live Classes Add-on", provider: "UPI", status: "paid" }
  ],
  liveClasses: [
    { title: "AI Website Builder Live Class", batch: "Full Stack AI Batch", status: "scheduled", commentsEnabled: true, accessRule: "paid-active-batch-only" }
  ],
  discoveryLeads: [
    { studentName: "Yash", city: "Ambala", course: "Coding", matchedInstitute: "NAXORA Demo Institute", status: "new" }
  ]
};

function getEnvSafetyReport(req) {
  const origin = req.headers.origin || "direct-browser/server";
  const mongoUri = process.env.MONGODB_URI || "";
  return {
    part: "Part 44 - Master Bug Fix + Demo Data Seeder",
    dbMode: globalThis.NAXORA_DB_MODE || "starting",
    currentOrigin: origin,
    allowedOrigins,
    frontendUrl: process.env.FRONTEND_URL || "not set",
    port: Number(process.env.PORT) || 5000,
    mongoUriPresent: Boolean(mongoUri && mongoUri.length > 20),
    mongoUriLooksPlaceholder: !mongoUri || mongoUri.includes("YOUR_") || mongoUri.includes("USERNAME") || mongoUri.includes("PASSWORD"),
    razorpayKeyPresent: Boolean(process.env.RAZORPAY_KEY_ID),
    nodeVersion: process.version,
    tips: [
      "Route not found aaye to /api/route-check kholo aur correct backend part confirm karo.",
      "Failed to fetch aaye to pehle /api/health browser me open karo.",
      "MongoDB error aaye to Atlas Network Access me current IP allow karo.",
      "Old backend confusion ho to taskkill /F /IM node.exe chalao, phir correct backend se npm run dev chalao."
    ]
  };
}

app.get("/api/system/debug", (req, res) => {
  res.json({
    success: true,
    message: "NAXORA system debug active. Ye page route/fetch/MongoDB confusion ko diagnose karega.",
    report: getEnvSafetyReport(req),
    quickTests: {
      health: "/api/health",
      routeCheck: "/api/route-check",
      features: "/api/features",
      demoDataStatus: "/api/demo-data/status",
      seedDemoData: "POST /api/demo-data/seed"
    }
  });
});

app.get("/api/features", (req, res) => {
  res.json({
    success: true,
    part: "Part 44 Integrated Full Build",
    totalFeatureGroups: 48,
    highlights: [
      "Institute OS core modules",
      "Razorpay-ready payments",
      "Discovery Leads Marketplace",
      "Live Classes + Comments + separate subscription",
      "Online Batch Access Management",
      "Premium Landing Page + Animations",
      "Admin Analytics Growth Dashboard",
      "Master Bug Fix + Demo Seeder",
      "Final Sales Demo Mode + One-click Walkthrough",
      "Full Client Pitch Dashboard + ROI calculator",
      "Razorpay Live Payment Final Setup"
    ],
    activeRoutePrefixes: majorModuleRoutes,
    part44Features
  });
});

app.get("/api/demo-data/status", async (req, res) => {
  let counts = null;
  if (globalThis.NAXORA_DB_MODE === "mongodb" && mongoose.connection?.readyState === 1) {
    const names = ["students", "teachers", "batches", "enquiries", "payments"];
    counts = {};
    for (const name of names) {
      try { counts[name] = await mongoose.connection.collection(name).countDocuments({ demoSeed: true }); }
      catch { counts[name] = "unavailable"; }
    }
  }

  res.json({
    success: true,
    mode: globalThis.NAXORA_DB_MODE || "starting",
    message: globalThis.NAXORA_DB_MODE === "mongodb" ? "MongoDB available hai. POST /api/demo-data/seed se demo records add ho sakte hain." : "Mock mode active hai. Demo data preview available hai, database me insert nahi hoga.",
    counts,
    preview: demoData
  });
});

app.post("/api/demo-data/seed", async (req, res) => {
  const force = req.body?.force === true;
  if (globalThis.NAXORA_DB_MODE !== "mongodb" || mongoose.connection?.readyState !== 1) {
    return res.json({
      success: true,
      mode: "mock",
      message: "MongoDB connected nahi hai, isliye app crash nahi karega. Demo data preview return kar diya.",
      inserted: false,
      demoData
    });
  }

  const collections = {
    students: demoData.students,
    teachers: demoData.teachers,
    batches: demoData.batches,
    enquiries: demoData.enquiries,
    payments: demoData.payments,
    liveclasses: demoData.liveClasses,
    discoveryleads: demoData.discoveryLeads,
    institutes: demoData.institutes
  };
  const result = {};
  for (const [collectionName, rows] of Object.entries(collections)) {
    const col = mongoose.connection.collection(collectionName);
    if (force) await col.deleteMany({ demoSeed: true });
    const existing = await col.countDocuments({ demoSeed: true });
    if (existing > 0 && !force) {
      result[collectionName] = { skipped: true, reason: "Demo records already exist. Send { force: true } to refresh.", existing };
      continue;
    }
    const docs = rows.map((row) => ({ ...row, demoSeed: true, createdAt: new Date(), updatedAt: new Date() }));
    const insert = await col.insertMany(docs, { ordered: false });
    result[collectionName] = { inserted: Object.keys(insert.insertedIds || {}).length };
  }

  res.json({
    success: true,
    mode: "mongodb",
    message: "Demo data seeded successfully. Dashboard aur modules demo ke liye zyada real lagenge.",
    result
  });
});

app.get("/api/part44/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 44 - Master Bug Fix + Demo Data Seeder",
    basedOn: "Part 43 Integrated Admin Analytics Build",
    status: "active",
    routes: ["/api/system/debug", "/api/features", "/api/demo-data/status", "POST /api/demo-data/seed", "/api/part44/status"],
    frontend: ["/app/system-debug.html", "/app"]
  });
});

app.get("/api/part45/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 45 - Final Sales Demo Mode",
    basedOn: "Part 44 Integrated Master Bug Fix + Demo Data Seeder",
    status: "active",
    routes: ["/api/demo-mode/status", "/api/demo-mode/personas", "/api/demo-mode/walkthrough",
      "/api/client-pitch/status",
      "/api/client-pitch", "POST /api/demo-mode/login"],
    frontend: ["/app/demo-mode.html", "/app/dashboard.html", "/app/client-pitch.html"]
  });
});

// ================= END PART 44 =================



// ================= PART 46: FULL CLIENT PITCH DASHBOARD =================
const clientPitchPricing = [
  {
    plan: "Starter",
    monthly: 499,
    bestFor: "Small coaching / trial institute",
    pitch: "Basic student, fees, attendance aur enquiry management ke liye best entry plan.",
    features: ["Student CRM", "Fees records", "Attendance", "Basic reports", "Email/WhatsApp mock mode"],
    cta: "Start low-risk demo"
  },
  {
    plan: "Pro",
    monthly: 999,
    bestFor: "Growing institute with batches",
    pitch: "Batches, staff, parents, tests aur follow-ups ke saath institute operations control.",
    features: ["All Starter", "Batch management", "Parent portal", "Tests & progress", "Lead follow-ups"],
    cta: "Most practical plan"
  },
  {
    plan: "Premium",
    monthly: 1999,
    bestFor: "Serious coaching center",
    pitch: "AI tools, payments, reports, discovery leads aur premium dashboard ke saath full OS.",
    features: ["All Pro", "AI Notes", "AI Mock Tests", "Discovery Leads", "Payments + receipts", "Admin analytics"],
    cta: "Best for sales pitch"
  },
  {
    plan: "Growth Bundle",
    monthly: 2999,
    bestFor: "Online + offline institute",
    pitch: "Premium OS + Live Classes + Online Batch Access + Leads module ek bundle me.",
    features: ["Premium OS", "Live Classes", "Batch access gate", "Recordings/resources", "Lead marketplace", "VANI AI add-on ready"],
    cta: "Recommended bundle"
  }
];

const clientPitchComparison = [
  { feature: "Student records", manual: "Registers/Excel me scattered", naxora: "Central CRM with search/filter", impact: "Time save + clean data" },
  { feature: "Fees follow-up", manual: "Manual calls and forgotten dues", naxora: "Pending fees, receipts, alerts", impact: "Collection improve" },
  { feature: "Attendance", manual: "Paper sheets and confusion", naxora: "Date/batch-wise digital attendance", impact: "Parent trust" },
  { feature: "Leads", manual: "WhatsApp chats me lost", naxora: "CRM + follow-up + Discovery Marketplace", impact: "Admissions growth" },
  { feature: "Live classes", manual: "Uncontrolled links", naxora: "Batch fee/access gated live class", impact: "Paid access protection" },
  { feature: "Reports", manual: "Owner ko late update", naxora: "Dashboard + analytics + progress reports", impact: "Fast decisions" }
];

const objectionAnswers = [
  {
    objection: "Mere staff ko replace karega kya?",
    answer: "Nahi. NAXORA staff replace nahi karta; repetitive kaam simple karta hai. Staff ka time bachta hai aur owner ko control milta hai."
  },
  {
    objection: "Hum Excel se kaam chala rahe hain.",
    answer: "Excel data store karta hai, NAXORA action leta hai: fees reminder, lead follow-up, parent view, reports, payments aur online batch access."
  },
  {
    objection: "Institute chhota hai, zaroorat nahi.",
    answer: "Small institute ke liye Starter plan hai. Jaise students badhenge, system ready rahega."
  },
  {
    objection: "Online class ka link share ho gaya to?",
    answer: "Part 40 me Online Batch Access gate hai. Student paid/active batch me hoga tabhi live class, recording, notes access milega."
  }
];

const pitchDashboard = {
  title: "NAXORA Institute OS - Client Pitch Dashboard",
  subtitle: "Institute owner ko 7 minute me value dikhane ke liye ready sales room.",
  target: "Coaching owners, computer institutes, skill academies, tuition centers",
  recommendedPrice: "₹1,999/month Premium + ₹999 Live Classes add-on",
  bundleOffer: "Founding Institute Offer: ₹999/month for first 3 institutes",
  roiAssumption: {
    savedHoursPerMonth: 35,
    staffHourValue: 80,
    extraAdmissions: 3,
    averageFeePerAdmission: 2500,
    missedDuesRecovered: 6000
  },
  pitchFlow: [
    { step: 1, title: "Owner pain", minutes: "1 min", show: "Dashboard + scattered work problem" },
    { step: 2, title: "Core OS", minutes: "2 min", show: "Students, fees, attendance, batches" },
    { step: 3, title: "Growth modules", minutes: "2 min", show: "Enquiries, follow-ups, discovery leads, live classes" },
    { step: 4, title: "Money proof", minutes: "1 min", show: "ROI calculator + pricing comparison" },
    { step: 5, title: "Close", minutes: "1 min", show: "Founding offer + 7-day setup promise" }
  ],
  demoLinks: [
    { label: "Sales Demo Mode", url: "/app/demo-mode.html" },
    { label: "Admin Analytics", url: "/app/admin-analytics.html" },
    { label: "Discovery Leads", url: "/app/discovery.html" },
    { label: "Live Classes", url: "/app/live-classes.html" },
    { label: "Online Batch Access", url: "/app/online-batches.html" },
    { label: "Payments", url: "/app/payments.html" }
  ]
};

function calculatePitchRoi(input = {}) {
  const savedHours = Number(input.savedHoursPerMonth ?? pitchDashboard.roiAssumption.savedHoursPerMonth);
  const staffHourValue = Number(input.staffHourValue ?? pitchDashboard.roiAssumption.staffHourValue);
  const extraAdmissions = Number(input.extraAdmissions ?? pitchDashboard.roiAssumption.extraAdmissions);
  const averageFee = Number(input.averageFeePerAdmission ?? pitchDashboard.roiAssumption.averageFeePerAdmission);
  const missedDuesRecovered = Number(input.missedDuesRecovered ?? pitchDashboard.roiAssumption.missedDuesRecovered);
  const softwareCost = Number(input.softwareCost ?? 1999);
  const timeSavingValue = savedHours * staffHourValue;
  const admissionValue = extraAdmissions * averageFee;
  const monthlyBenefit = timeSavingValue + admissionValue + missedDuesRecovered;
  const netGain = monthlyBenefit - softwareCost;
  const roiMultiple = softwareCost > 0 ? (monthlyBenefit / softwareCost).toFixed(1) : "0";
  return {
    savedHours,
    staffHourValue,
    extraAdmissions,
    averageFeePerAdmission: averageFee,
    missedDuesRecovered,
    softwareCost,
    timeSavingValue,
    admissionValue,
    monthlyBenefit,
    netGain,
    roiMultiple,
    pitchLine: `Estimated monthly benefit ₹${monthlyBenefit.toLocaleString("en-IN")} vs software cost ₹${softwareCost.toLocaleString("en-IN")}. Net gain approx ₹${netGain.toLocaleString("en-IN")}.`
  };
}

app.get("/api/client-pitch/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 46 - Full Client Pitch Dashboard",
    basedOn: "Part 45 Integrated Final Sales Demo Mode",
    status: "active",
    frontend: "/app/client-pitch.html",
    routes: [
      "GET /api/client-pitch/status",
      "GET /api/client-pitch",
      "POST /api/client-pitch/roi",
      "GET /api/part46/status"
    ],
    purpose: "Institute owner ko pricing, ROI, comparison, demo links aur objections ek pitch dashboard me dikhana."
  });
});

app.get("/api/client-pitch", (req, res) => {
  res.json({
    success: true,
    dashboard: pitchDashboard,
    pricing: clientPitchPricing,
    comparison: clientPitchComparison,
    objections: objectionAnswers,
    roi: calculatePitchRoi({})
  });
});

app.post("/api/client-pitch/roi", (req, res) => {
  res.json({ success: true, roi: calculatePitchRoi(req.body || {}) });
});

app.get("/api/part46/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 46 - Full Client Pitch Dashboard",
    basedOn: "Part 45 Final Sales Demo Mode",
    status: "active",
    frontend: ["/app/client-pitch.html", "/app/demo-mode.html", "/app/admin-analytics.html"],
    features: [
      "ROI calculator",
      "Plan comparison",
      "Manual vs NAXORA comparison",
      "Objection handling answers",
      "Client demo links",
      "Pricing pitch cards",
      "Founding institute offer block"
    ]
  });
});

// ================= END PART 46 =================


// ================= PART 47: PRODUCTION DEPLOYMENT FINAL FIX =================
const deploymentChecklist = [
  "backend/.env me strong JWT_SECRET aur real MONGODB_URI set karo.",
  "MongoDB Atlas Network Access me Render/Railway/VPS IP ya testing ke liye 0.0.0.0/0 allow karo.",
  "Render/Railway par rootDir backend, build command npm install, start command npm start rakho.",
  "Live domain milne ke baad FRONTEND_URL aur CORS_ORIGINS update karo.",
  "Razorpay live keys only production dashboard me set karo; key secret code me commit mat karo.",
  "Deploy ke baad /api/health, /api/route-check, /api/deployment/status aur /app open karke verify karo.",
  "Chrome me hard refresh karke old Live Server cache clear karo.",
  "Production se pehle exposed MongoDB password rotate karo."
];

const deploymentCommands = [
  "taskkill /F /IM node.exe",
  "cd backend",
  "npm install",
  "npm run check:env",
  "npm run check:deploy",
  "npm start"
];

function deploymentEnvReport(req) {
  const mongoUri = process.env.MONGODB_URI || "";
  const frontendUrl = process.env.FRONTEND_URL || "";
  const corsOrigins = process.env.CORS_ORIGINS || "";
  const warnings = [];
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) warnings.push("JWT_SECRET short/missing hai. 32+ characters ka random secret rakho.");
  if (!mongoUri || mongoUri.includes("YOUR_") || mongoUri.includes("PASSWORD")) warnings.push("MONGODB_URI missing/placeholder lag raha hai. Real Atlas URI lagao.");
  if (!frontendUrl && process.env.NODE_ENV === "production") warnings.push("Production me FRONTEND_URL set karna recommended hai.");
  if (!corsOrigins && process.env.NODE_ENV === "production") warnings.push("Production me CORS_ORIGINS me live frontend/backend domain add karo.");
  if (!process.env.RAZORPAY_KEY_ID) warnings.push("Razorpay keys missing hain. Payment mock/test mode me rahega.");
  if (globalThis.NAXORA_DB_MODE !== "mongodb") warnings.push("MongoDB connected nahi hai. App safe mock mode me chal raha hai; real login/data ke liye DB fix karo.");
  return {
    currentHost: req.headers.host,
    origin: req.headers.origin || "direct/server",
    nodeEnv: process.env.NODE_ENV || "development",
    port: Number(process.env.PORT) || 5000,
    dbMode: globalThis.NAXORA_DB_MODE || "starting",
    envPreview: {
      PORT: process.env.PORT || "5000 default",
      NODE_ENV: process.env.NODE_ENV || "development",
      FRONTEND_URL: frontendUrl || "not set",
      CORS_ORIGINS: corsOrigins || "not set",
      MONGODB_URI: mongoUri ? "present" : "missing",
      JWT_SECRET: process.env.JWT_SECRET ? `present (${process.env.JWT_SECRET.length} chars)` : "missing",
      RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID ? "present" : "missing/mock"
    },
    warnings
  };
}

app.get("/api/deployment/status", (req, res) => {
  const report = deploymentEnvReport(req);
  res.json({
    success: true,
    part: "Part 47 - Production Deployment Final Fix",
    basedOn: "Part 46 Full Client Pitch Dashboard",
    status: "active",
    dbMode: report.dbMode,
    frontend: "/app/deployment.html",
    liveFrontend: "/app",
    routes: ["GET /api/deployment/status", "GET /api/deployment/env-check", "GET /api/deployment/checklist", "GET /api/part47/status"],
    commands: deploymentCommands,
    checklist: deploymentChecklist,
    safetyFixes: [
      "MongoDB fail ho to backend crash nahi karega",
      "users.findOne buffering timeout ke liye mock auth fallback",
      "Mongoose bufferCommands disabled",
      "Same-server frontend hosting /app",
      "Production CORS origins checker",
      "Render/Railway deploy files included"
    ]
  });
});

app.get("/api/deployment/env-check", (req, res) => {
  const report = deploymentEnvReport(req);
  res.json({ success: true, ...report });
});

app.get("/api/deployment/checklist", (req, res) => {
  res.json({ success: true, checklist: deploymentChecklist, commands: deploymentCommands });
});

app.get("/api/part47/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 47 - Production Deployment Final Fix",
    status: "active",
    frontend: ["/app/deployment.html", "/app", "/app/client-pitch.html"],
    routes: ["/api/deployment/status", "/api/deployment/env-check", "/api/deployment/checklist", "/api/part47/status",
      "/api/razorpay-final/status",
      "/api/razorpay-final/pricing",
      "/api/razorpay-final/checklist",
      "/api/part48/status"],
    nextPart: "Part 48 - Razorpay Live Payment Final Setup"
  });
});
// ================= END PART 47 =================


// ================= PART 48: RAZORPAY LIVE PAYMENT FINAL SETUP =================
const razorpayFinalPlans = [
  {
    code: "os_starter",
    name: "NAXORA OS Starter",
    purpose: "subscription",
    amount: 499,
    billing: "monthly",
    includes: ["Student CRM", "Fees", "Attendance", "Basic reports"],
    bestFor: "Small institute trial"
  },
  {
    code: "os_premium",
    name: "NAXORA OS Premium",
    purpose: "subscription",
    amount: 1999,
    billing: "monthly",
    includes: ["All OS modules", "AI tools", "Discovery Leads", "Reports", "Payments"],
    bestFor: "Serious coaching institute"
  },
  {
    code: "live_classes_addon",
    name: "Live Classes Add-on",
    purpose: "subscription",
    amount: 999,
    billing: "monthly",
    includes: ["Live classes", "Comments", "Recordings", "Resources"],
    bestFor: "Online classes"
  },
  {
    code: "online_batch_payment",
    name: "Online Batch Access",
    purpose: "student_fees",
    amount: 1499,
    billing: "batch/month",
    includes: ["Paid batch access", "Live class gate", "Notes/recording access"],
    bestFor: "Student batch fees"
  },
  {
    code: "vani_ai_addon",
    name: "NAXORA VANI AI Add-on",
    purpose: "subscription",
    amount: 1499,
    billing: "monthly",
    includes: ["Voice search", "Voice reports", "Voice actions cap"],
    bestFor: "Premium AI voice add-on"
  }
];

const razorpayFinalChecklist = [
  "Razorpay Dashboard me Test Mode API keys generate karo: RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET.",
  "backend/.env me keys paste karo. Key secret code ya screenshot me share mat karo.",
  "Local test: /api/payments/config open karke providerMode check karo.",
  "Payments page par payment record create karo, phir Create Order / Pay Razorpay click karo.",
  "Test payment verify hone ke baad receipt preview aur payment history check karo.",
  "Live Mode me jane se pehle Razorpay KYC/account activation complete karo.",
  "Live keys alag hoti hain; test key ko production me use mat karo.",
  "Webhook secret set karke /api/payments/webhook endpoint configure karo.",
  "Production deployment ke baad FRONTEND_URL/CORS_ORIGINS live domain ke hisaab se update karo."
];

function razorpayFinalStatus() {
  const hasKeyId = Boolean(process.env.RAZORPAY_KEY_ID);
  const hasSecret = Boolean(process.env.RAZORPAY_KEY_SECRET);
  const keyId = process.env.RAZORPAY_KEY_ID || "";
  const isLiveKey = keyId.startsWith("rzp_live_");
  const isTestKey = keyId.startsWith("rzp_test_");
  return {
    hasKeyId,
    hasSecret,
    hasWebhookSecret: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET),
    keyMode: isLiveKey ? "live" : isTestKey ? "test" : hasKeyId ? "unknown-key-format" : "mock",
    providerMode: hasKeyId && hasSecret ? (isLiveKey ? "razorpay-live-ready" : "razorpay-test-ready") : "mock-mode",
    companyName: process.env.RAZORPAY_COMPANY_NAME || "NAXORA Institute OS",
    safeKeyPreview: keyId ? `${keyId.slice(0, 8)}...${keyId.slice(-4)}` : "missing",
    secretPreview: hasSecret ? "present-hidden" : "missing",
  };
}

app.get("/api/razorpay-final/status", (req, res) => {
  const status = razorpayFinalStatus();
  res.json({
    success: true,
    part: "Part 48 - Razorpay Live Payment Final Setup",
    basedOn: "Part 47 Production Deployment Final Fix",
    status: "active",
    frontend: "/app/razorpay-final.html",
    paymentPage: "/app/payments.html",
    dbMode: globalThis.NAXORA_DB_MODE || "starting",
    razorpay: status,
    paymentRoutes: [
      "GET /api/payments/config",
      "POST /api/payments",
      "POST /api/payments/:id/order",
      "POST /api/payments/:id/verify",
      "GET /api/payments/:id/receipt",
      "POST /api/payments/webhook"
    ],
    finalRoutes: [
      "GET /api/razorpay-final/status",
      "GET /api/razorpay-final/pricing",
      "GET /api/razorpay-final/checklist",
      "POST /api/razorpay-final/quick-payment",
      "GET /api/part48/status"
    ],
    message: status.providerMode === "mock-mode"
      ? "Keys missing hain. App mock mode me safe chalega; real checkout ke liye .env me Razorpay keys add karo."
      : "Razorpay keys detected. Payment records se real/test order create ho sakta hai."
  });
});

app.get("/api/razorpay-final/pricing", (req, res) => {
  res.json({
    success: true,
    plans: razorpayFinalPlans,
    paymentBuckets: [
      { bucket: "Institute SaaS subscription", route: "/app/subscriptions.html", paymentFor: "subscription" },
      { bucket: "Live Classes add-on", route: "/app/live-classes.html", paymentFor: "subscription" },
      { bucket: "Online Batch fee", route: "/app/online-batches.html", paymentFor: "student_fees" },
      { bucket: "Student fees", route: "/app/fees.html", paymentFor: "student_fees" },
      { bucket: "VANI AI add-on", route: "/app/subscriptions.html", paymentFor: "subscription" }
    ]
  });
});

app.get("/api/razorpay-final/checklist", (req, res) => {
  res.json({
    success: true,
    checklist: razorpayFinalChecklist,
    envTemplate: {
      RAZORPAY_KEY_ID: "rzp_test_xxxxxxxxxx",
      RAZORPAY_KEY_SECRET: "your_secret_here_do_not_share",
      RAZORPAY_WEBHOOK_SECRET: "optional_webhook_secret",
      RAZORPAY_COMPANY_NAME: "NAXORA Institute OS"
    },
    warning: "Key secret private hota hai. Screenshot, YouTube video ya chat me expose mat karna."
  });
});

app.post("/api/razorpay-final/quick-payment", (req, res) => {
  const planCode = String(req.body?.planCode || "os_premium").trim();
  const plan = razorpayFinalPlans.find((item) => item.code === planCode) || razorpayFinalPlans[1];
  const payerName = String(req.body?.payerName || "Demo Institute").trim();
  const payerPhone = String(req.body?.payerPhone || "9000000000").trim();
  const payerEmail = String(req.body?.payerEmail || "demo@naxora.local").trim();
  res.json({
    success: true,
    message: "Quick payment payload ready. Is payload ko /app/payments.html me payment record ke form me save karke Razorpay order create karo.",
    paymentPayload: {
      paymentFor: plan.purpose,
      title: plan.name,
      payerName,
      payerPhone,
      payerEmail,
      studentName: plan.purpose === "student_fees" ? payerName : "",
      instituteName: "NAXORA Partner Institute",
      amount: plan.amount,
      provider: "razorpay",
      paymentMode: "online",
      status: "created",
      receiptNote: `${plan.name} payment via Razorpay.`,
      metadata: {
        planCode: plan.code,
        billing: plan.billing,
        part: "48"
      }
    },
    openPaymentPage: "/app/payments.html",
    razorpay: razorpayFinalStatus()
  });
});

app.get("/api/part48/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 48 - Razorpay Live Payment Final Setup",
    status: "active",
    basedOn: "Part 47 Integrated Production Deployment Final Fix",
    frontend: ["/app/razorpay-final.html", "/app/payments.html", "/app/subscriptions.html", "/app/online-batches.html", "/app/live-classes.html"],
    features: [
      "Razorpay readiness dashboard",
      "Test/live key mode checker",
      "SaaS plan payment mapping",
      "Live Classes add-on payment mapping",
      "Online Batch fee payment mapping",
      "Receipt and payment history flow",
      "Webhook final checklist",
      "Mock mode fallback if keys are missing"
    ],
    nextPart: "Part 49 - Final Testing + Bug Fix Build"
  });
});
// ================= END PART 48 =================



// ================= PART 49: FINAL TESTING + BUG FIX BUILD =================
const finalTestingPages = [
  { group: "Core", page: "/app/index.html", label: "Login / Signup", critical: true },
  { group: "Core", page: "/app/dashboard.html", label: "Dashboard", critical: true },
  { group: "Core", page: "/app/students.html", label: "Students", critical: true },
  { group: "Core", page: "/app/teachers.html", label: "Teachers", critical: true },
  { group: "Core", page: "/app/batches.html", label: "Batches", critical: true },
  { group: "Money", page: "/app/fees.html", label: "Fees", critical: true },
  { group: "Money", page: "/app/payments.html", label: "Payments", critical: true },
  { group: "Money", page: "/app/razorpay-final.html", label: "Razorpay Final", critical: true },
  { group: "SaaS", page: "/app/subscriptions.html", label: "Subscriptions", critical: true },
  { group: "SaaS", page: "/app/super-admin.html", label: "Super Admin", critical: true },
  { group: "Leads", page: "/app/discovery.html", label: "Discovery Leads", critical: true },
  { group: "Leads", page: "/app/enquiries.html", label: "Enquiries", critical: true },
  { group: "Leads", page: "/app/followups.html", label: "Follow-ups", critical: true },
  { group: "Online", page: "/app/live-classes.html", label: "Live Classes", critical: true },
  { group: "Online", page: "/app/online-batches.html", label: "Online Batch Access", critical: true },
  { group: "AI", page: "/app/ai-notes.html", label: "AI Notes", critical: false },
  { group: "AI", page: "/app/ai-mock-tests.html", label: "AI Mock Tests", critical: false },
  { group: "AI", page: "/app/ai-roadmaps.html", label: "AI Roadmaps", critical: false },
  { group: "Admin", page: "/app/admin-analytics.html", label: "Admin Analytics", critical: false },
  { group: "Admin", page: "/app/client-pitch.html", label: "Client Pitch", critical: true },
  { group: "Admin", page: "/app/demo-mode.html", label: "Sales Demo Mode", critical: true },
  { group: "Admin", page: "/app/deployment.html", label: "Deployment", critical: true },
  { group: "Admin", page: "/app/system-debug.html", label: "System Debug", critical: true },
  { group: "Admin", page: "/app/final-testing.html", label: "Final Testing", critical: true },
  { group: "Launch", page: "/app/launch-package.html", label: "Launch Package", critical: true }
];

const finalTestingRoutes = [
  { route: "/api/health", method: "GET", module: "Core health", expected: "200 OK" },
  { route: "/api/route-check", method: "GET", module: "Route checker", expected: "200 OK" },
  { route: "/api/system/debug", method: "GET", module: "System debug", expected: "200 OK" },
  { route: "/api/features", method: "GET", module: "Feature registry", expected: "200 OK" },
  { route: "/api/deployment/status", method: "GET", module: "Deployment", expected: "200 OK" },
  { route: "/api/razorpay-final/status", method: "GET", module: "Razorpay final", expected: "200 OK" },
  { route: "/api/client-pitch/status", method: "GET", module: "Client pitch", expected: "200 OK" },
  { route: "/api/demo-mode/status", method: "GET", module: "Sales demo", expected: "200 OK" },
  { route: "/api/admin-analytics/status", method: "GET", module: "Admin analytics", expected: "200 OK" },
  { route: "/api/discovery/status", method: "GET", module: "Discovery leads", expected: "200 OK" },
  { route: "/api/live-classes/status", method: "GET", module: "Live classes", expected: "200 OK" },
  { route: "/api/online-batches/status", method: "GET", module: "Online batch access", expected: "200 OK" },
  { route: "/api/final-testing/status", method: "GET", module: "Part 49", expected: "200 OK" },
  { route: "/api/launch-package/status", method: "GET", module: "Part 50", expected: "200 OK" },
  { route: "/api/part50/status", method: "GET", module: "Part 50", expected: "200 OK" }
];

const finalTestingChecklist = [
  "Old backend band karo: taskkill /F /IM node.exe",
  "Part 49 ke backend folder se npm install aur npm run dev chalao.",
  "Browser me /api/health open karke part Part 49 confirm karo.",
  "Frontend ko preferably /app se open karo, Live Server confusion avoid hoga.",
  "Login test karo. MongoDB fail ho to demo/mock mode use karo.",
  "Students, Fees, Payments, Subscriptions, Discovery, Live Classes, Online Batch Access pages open karo.",
  "Razorpay status page par test/live key mode check karo. Key secret kabhi expose mat karo.",
  "Mobile view me sidebar, forms aur cards check karo.",
  "Console me Failed to fetch aaye to /api/final-testing/status aur /api/route-check open karo.",
  "Final demo se pehle /api/final-testing/run run karke summary check karo."
];

function buildFinalTestingStatus(req) {
  const host = `${req.protocol}://${req.get("host")}`;
  const dbMode = globalThis.NAXORA_DB_MODE || "starting";
  const hasMongo = Boolean(process.env.MONGODB_URI && !process.env.MONGODB_URI.includes("YOUR_"));
  const hasJwt = Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 20);
  const hasFrontendUrl = Boolean(process.env.FRONTEND_URL);
  const hasRazorpayKey = Boolean(process.env.RAZORPAY_KEY_ID);
  const hasRazorpaySecret = Boolean(process.env.RAZORPAY_KEY_SECRET);
  const keyMode = process.env.RAZORPAY_KEY_ID?.startsWith("rzp_live_") ? "live" : process.env.RAZORPAY_KEY_ID?.startsWith("rzp_test_") ? "test" : "mock";

  const checks = [
    { id: "backend", label: "Backend running", status: "pass", message: "Server response active hai." },
    { id: "db", label: "MongoDB connection", status: dbMode === "mongodb" ? "pass" : "warn", message: dbMode === "mongodb" ? "MongoDB connected mode." : "Mock mode active. Free/demo testing ke liye app crash nahi karega." },
    { id: "env-mongo", label: "MONGODB_URI present", status: hasMongo ? "pass" : "warn", message: hasMongo ? "URI present hai." : "URI missing/placeholder hai. Real login/data ke liye Atlas URI lagao." },
    { id: "env-jwt", label: "JWT secret", status: hasJwt ? "pass" : "warn", message: hasJwt ? "JWT_SECRET acceptable hai." : "JWT_SECRET strong rakho." },
    { id: "frontend", label: "Frontend hosting", status: "pass", message: `${host}/app available hai.` },
    { id: "cors", label: "CORS local ports", status: "pass", message: "5500, 5501, 5502, 5503 allowed hain." },
    { id: "razorpay", label: "Razorpay keys", status: hasRazorpayKey && hasRazorpaySecret ? "pass" : "warn", message: hasRazorpayKey && hasRazorpaySecret ? `Razorpay ${keyMode} mode ready.` : "Keys missing hain. Mock mode safe hai; real payment ke liye keys add karo." },
    { id: "free-first", label: "Free-first deployment", status: "pass", message: "MongoDB free + free frontend/backend demo plan compatible." }
  ];

  const pass = checks.filter((c) => c.status === "pass").length;
  const warn = checks.filter((c) => c.status === "warn").length;
  const fail = checks.filter((c) => c.status === "fail").length;

  return {
    success: true,
    part: "Part 49 - Final Testing + Bug Fix Build",
    basedOn: "Part 48 Razorpay Live Payment Final Setup",
    status: "active",
    dbMode,
    freeFirst: true,
    hostedFrontend: `${host}/app`,
    finalTestingPage: `${host}/app/final-testing.html`,
    summary: { total: checks.length, pass, warn, fail },
    checks,
    commonErrorFixes: [
      { error: "Route not found", fix: "Old backend band karo, Part 49 backend se npm run dev chalao, /api/health me Part 49 confirm karo." },
      { error: "Failed to fetch", fix: "Backend running hai ya nahi /api/health se check karo. Live Server port 5500/5501 allowed hai." },
      { error: "users.findOne buffering timed out", fix: "MongoDB fail hai. Part 49 mock mode me crash nahi karega; real data ke liye Atlas IP allowlist + password check karo." },
      { error: "Feature missing", fix: "Part 49 integrated folder ka /app use karo, purane part ka frontend mat kholo." },
      { error: "Razorpay config route not found", fix: "Part 49 backend run karo; /api/razorpay-final/status se payment setup check karo." }
    ]
  };
}

app.get("/api/final-testing/status", (req, res) => {
  res.json(buildFinalTestingStatus(req));
});

app.get("/api/final-testing/checklist", (req, res) => {
  res.json({ success: true, checklist: finalTestingChecklist });
});

app.get("/api/final-testing/pages", (req, res) => {
  res.json({ success: true, pages: finalTestingPages });
});

app.get("/api/final-testing/run", (req, res) => {
  const status = buildFinalTestingStatus(req);
  const routeResults = finalTestingRoutes.map((route) => ({
    ...route,
    status: "ready",
    note: "Route registered in Part 49 integrated build. Browser se manually open karke final verify karo."
  }));
  const pageResults = finalTestingPages.map((page) => ({
    ...page,
    status: "ready",
    note: page.critical ? "Critical demo page" : "Optional/premium page"
  }));
  res.json({
    success: true,
    part: "Part 49 - Final Testing + Bug Fix Build",
    generatedAt: new Date().toISOString(),
    summary: status.summary,
    envChecks: status.checks,
    routeResults,
    pageResults,
    finalAdvice: "Demo se pehle /app/final-testing.html open karo, run report dekho, phir Client Pitch/Demo Mode se institute ko presentation do."
  });
});

app.get("/api/part49/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 49 - Final Testing + Bug Fix Build",
    status: "active",
    basedOn: "Part 48 Integrated Razorpay Live Payment Final Setup",
    frontend: ["/app/final-testing.html", "/app/system-debug.html", "/app/client-pitch.html", "/app/demo-mode.html"],
    routes: [
      "GET /api/final-testing/status",
      "GET /api/final-testing/checklist",
      "GET /api/final-testing/pages",
      "GET /api/final-testing/run",
      "GET /api/part49/status"
    ],
    features: [
      "All pages testing dashboard",
      "All important route readiness report",
      "Failed-to-fetch helper",
      "Old backend confusion helper",
      "MongoDB mock mode status",
      "Razorpay final status checker",
      "Mobile testing checklist",
      "Free-first deployment checklist"
    ],
    nextPart: "Part 50 - Final Launch Package"
  });
});
// ================= END PART 49 =================



// ================= PART 50: FINAL LAUNCH PACKAGE =================
const launchHighlights = [
  "Final master integrated build",
  "Free-first deployment plan",
  "WhatsApp sales pitch",
  "5-minute demo video script",
  "Client onboarding checklist",
  "Final demo links",
  "Razorpay test/live readiness",
  "Demo + client pitch flow"
];

const launchChecklist = [
  "Part 50 backend ko run karo aur /api/health me Part 50 confirm karo.",
  "Frontend ke liye /app/launch-package.html open karo, Live Server confusion avoid karo.",
  "Final Testing page par all route/page readiness check karo.",
  "Sales Demo Mode se owner/student/parent/super admin persona demo test karo.",
  "Client Pitch Dashboard se ROI calculator aur pricing cards test karo.",
  "Razorpay Final page par keys mode check karo. Abhi test/mock mode acceptable hai.",
  "Demo Data Seeder se demo data add/preview karo, taki dashboard empty na lage.",
  "Free-first deployment plan follow karo: free DB, free frontend, free/available backend, no paid domain initially.",
  "WhatsApp pitch copy karke 5 institutes ko bhejo.",
  "First 3 beta institutes ke liye founding offer rakho."
];

const freeDeploymentPlan = [
  { title: "Database", text: "MongoDB Atlas free tier use karo. IP allowlist aur password safe rakho." },
  { title: "Backend", text: "Free/available backend option use karo; Render/Railway/free option jo available ho. Local demo bhi valid hai." },
  { title: "Frontend", text: "Same backend /app use karo ya Vercel/Netlify free hosting." },
  { title: "Domain", text: "Abhi paid domain mat lo. Free URL se demo start karo." },
  { title: "Payments", text: "Razorpay test mode pehle. Live mode tab jab real client ready ho." },
  { title: "Security", text: "MongoDB password aur Razorpay keys jo expose ho chuki hain unhe real launch se pehle rotate karo." }
];

const whatsappPitch = `Namaste Sir/Mam,
Main Arun from NAXORA Institute OS.

Humne coaching/institute owners ke liye ek all-in-one software banaya hai jisme students, fees, attendance, batches, tests, reports, parent updates, enquiries, follow-ups, live classes, online batch access, payments aur AI tools ek dashboard me manage hote hain.

Ye staff replace nahi karta, bas repetitive work simple karta hai aur owner ko real control deta hai.

Main aapko sirf 5 minute ka demo dikhana chahta hoon.
Agar useful lage tabhi aage baat karenge.

Founding institute offer bhi available hai.
Demo ke liye kaunsa time comfortable rahega?`;

const demoVideoScript = [
  { time: "0:00-0:30", title: "Hook", script: "Agar aap coaching/institute chalate hain aur students, fees, attendance, enquiries aur online classes manage karna difficult lagta hai, to NAXORA Institute OS aapke liye bana hai.", open: "/app/landing-animated.html" },
  { time: "0:30-1:20", title: "Dashboard", script: "Yahan owner ko total students, fees, attendance, pending dues, leads aur reports ka clear snapshot milta hai.", open: "/app/dashboard.html" },
  { time: "1:20-2:10", title: "Core Management", script: "Students, teachers, batches, fees aur attendance ek jagah manage hote hain.", open: "/app/students.html" },
  { time: "2:10-3:00", title: "Growth Modules", script: "Admissions enquiries, follow-ups aur Discovery Leads Marketplace se institute ko potential students mil sakte hain.", open: "/app/discovery.html" },
  { time: "3:00-3:45", title: "Live Classes", script: "Live Classes separate add-on hai. Student class tabhi join karega jab uske batch ka paid/active access hoga.", open: "/app/live-classes.html" },
  { time: "3:45-4:25", title: "Payments", script: "Razorpay-ready payments, receipts aur subscription plans ka structure ready hai.", open: "/app/razorpay-final.html" },
  { time: "4:25-5:00", title: "Close", script: "NAXORA Institute OS institute ko manage, teach aur grow karne me help karta hai. Aap 5-minute personal demo book kar sakte hain.", open: "/app/client-pitch.html" }
];

const clientOnboardingChecklist = [
  "Institute name, owner name, phone, email collect karo.",
  "Branch/city/address details lo.",
  "Current students, courses, batches aur fees structure samjho.",
  "Admin login create karo.",
  "10-20 demo students import/add karo.",
  "2-3 batches create karo.",
  "Fees, attendance aur enquiries module demo karo.",
  "Live Classes add-on chahiye ya nahi confirm karo.",
  "Online Batch Access pricing set karo.",
  "Payment/Razorpay setup test mode me verify karo.",
  "Owner ko 30-minute training do.",
  "First 7 days feedback lo."
];

const finalLinks = [
  { label: "Launch Package", url: "/app/launch-package.html" },
  { label: "Final Testing", url: "/app/final-testing.html" },
  { label: "Sales Demo Mode", url: "/app/demo-mode.html" },
  { label: "Client Pitch", url: "/app/client-pitch.html" },
  { label: "Deployment", url: "/app/deployment.html" },
  { label: "Razorpay Final", url: "/app/razorpay-final.html" },
  { label: "System Debug", url: "/app/system-debug.html" },
  { label: "App Home", url: "/app" }
];

function buildLaunchPackage() {
  return {
    success: true,
    part: "Part 50 - Final Launch Package",
    basedOn: "Part 49 Final Testing + Bug Fix Build",
    status: "launch-ready",
    freeFirst: true,
    dbMode: globalThis.NAXORA_DB_MODE || "starting",
    highlights: launchHighlights,
    launchChecklist,
    freeDeploymentPlan,
    whatsappPitch,
    demoVideoScript,
    clientOnboardingChecklist,
    finalLinks,
    pricingSuggestion: {
      starter: "₹499/month",
      pro: "₹999/month",
      premium: "₹1,999/month",
      growthBundle: "₹2,999/month",
      foundingOffer: "First 3 institutes ke liye custom founding offer"
    },
    nextAction: "Free deploy/local demo ready karo, demo video banao, phir first 5 institutes ko pitch bhejo."
  };
}

app.get("/api/launch-package/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 50 - Final Launch Package",
    status: "active",
    frontend: "/app/launch-package.html",
    routes: [
      "GET /api/launch-package/status",
      "GET /api/launch-package",
      "GET /api/launch-package/whatsapp-pitch",
      "GET /api/launch-package/demo-video-script",
      "GET /api/launch-package/onboarding-checklist",
      "GET /api/part50/status"
    ],
    freeFirst: true
  });
});

app.get("/api/launch-package", (req, res) => {
  res.json(buildLaunchPackage());
});

app.get("/api/launch-package/whatsapp-pitch", (req, res) => {
  res.json({ success: true, whatsappPitch });
});

app.get("/api/launch-package/demo-video-script", (req, res) => {
  res.json({ success: true, demoVideoScript });
});

app.get("/api/launch-package/onboarding-checklist", (req, res) => {
  res.json({ success: true, clientOnboardingChecklist });
});

app.get("/api/part50/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 50 - Final Launch Package",
    status: "active",
    basedOn: "Part 49 Integrated Final Testing Build",
    frontend: ["/app/launch-package.html", "/app/final-testing.html", "/app/client-pitch.html", "/app/demo-mode.html"],
    features: launchHighlights,
    finalAdvice: "Ab naye features add karne se pehle isko demo, deploy aur first beta institutes ke liye use karo."
  });
});
// ================= END PART 50 =================



// ================= PART 53: COMPLETE SYSTEM AUDIT =================
// Goal: Part 52 live foundation ke baad har page/button/API/database flow ko client demo se pehle audit karna.
// Ye module secrets expose nahi karta. Sirf readiness, file presence, DB mode aur manual test checklist dikhata hai.
const part53PageRegistry = [
  { group: "Public", label: "Landing Page", cleanRoute: "/", htmlRoute: "/landing.html", file: "landing.html", critical: true },
  { group: "Auth", label: "Login", cleanRoute: "/login", htmlRoute: "/index.html", file: "index.html", critical: true },
  { group: "Auth", label: "Signup", cleanRoute: "/signup", htmlRoute: "/index.html", file: "index.html", critical: true },
  { group: "Dashboard", label: "Institute Dashboard", cleanRoute: "/dashboard", htmlRoute: "/dashboard.html", file: "dashboard.html", critical: true },
  { group: "People", label: "Students", cleanRoute: "/student", htmlRoute: "/students.html", file: "students.html", critical: true },
  { group: "People", label: "Parents", cleanRoute: "/parent", htmlRoute: "/parents.html", file: "parents.html", critical: true },
  { group: "People", label: "Teachers", cleanRoute: "/teachers", htmlRoute: "/teachers.html", file: "teachers.html", critical: true },
  { group: "People", label: "Staff", cleanRoute: "/staff", htmlRoute: "/staff.html", file: "staff.html", critical: true },
  { group: "Academic", label: "Batches", cleanRoute: "/batches", htmlRoute: "/batches.html", file: "batches.html", critical: true },
  { group: "Academic", label: "Attendance", cleanRoute: "/attendance", htmlRoute: "/attendance.html", file: "attendance.html", critical: true },
  { group: "Academic", label: "Assignments", cleanRoute: "/assignments", htmlRoute: "/assignments.html", file: "assignments.html", critical: false },
  { group: "Academic", label: "Tests", cleanRoute: "/tests", htmlRoute: "/tests.html", file: "tests.html", critical: true },
  { group: "Academic", label: "Test Builder", cleanRoute: "/test-builder", htmlRoute: "/test-builder.html", file: "test-builder.html", critical: false },
  { group: "Academic", label: "Question Bank", cleanRoute: "/question-bank", htmlRoute: "/question-bank.html", file: "question-bank.html", critical: false },
  { group: "Academic", label: "Timetable", cleanRoute: "/timetable", htmlRoute: "/timetable.html", file: "timetable.html", critical: true },
  { group: "Academic", label: "Progress", cleanRoute: "/progress", htmlRoute: "/progress.html", file: "progress.html", critical: true },
  { group: "Money", label: "Fees", cleanRoute: "/fees", htmlRoute: "/fees.html", file: "fees.html", critical: true },
  { group: "Money", label: "Finance", cleanRoute: "/finance", htmlRoute: "/finance.html", file: "finance.html", critical: true },
  { group: "Money", label: "Payments", cleanRoute: "/payments", htmlRoute: "/payments.html", file: "payments.html", critical: true },
  { group: "SaaS", label: "Subscriptions", cleanRoute: "/subscriptions", htmlRoute: "/subscriptions.html", file: "subscriptions.html", critical: true },
  { group: "Leads", label: "Enquiries", cleanRoute: "/enquiries", htmlRoute: "/enquiries.html", file: "enquiries.html", critical: true },
  { group: "Leads", label: "Follow-Ups", cleanRoute: "/followups", htmlRoute: "/followups.html", file: "followups.html", critical: true },
  { group: "Leads", label: "Discovery", cleanRoute: "/discovery", htmlRoute: "/discovery.html", file: "discovery.html", critical: true },
  { group: "Online", label: "Live Classes", cleanRoute: "/live-classes", htmlRoute: "/live-classes.html", file: "live-classes.html", critical: true },
  { group: "Online", label: "Online Batches", cleanRoute: "/online-batches", htmlRoute: "/online-batches.html", file: "online-batches.html", critical: true },
  { group: "Communication", label: "Notifications", cleanRoute: "/notifications", htmlRoute: "/notifications.html", file: "notifications.html", critical: false },
  { group: "Communication", label: "Email Notifications", cleanRoute: "/email-notifications", htmlRoute: "/email-notifications.html", file: "email-notifications.html", critical: false },
  { group: "AI", label: "AI Doubts", cleanRoute: "/doubts", htmlRoute: "/doubts.html", file: "doubts.html", critical: false },
  { group: "AI", label: "AI Notes", cleanRoute: "/ai-notes", htmlRoute: "/ai-notes.html", file: "ai-notes.html", critical: false },
  { group: "AI", label: "AI Mock Tests", cleanRoute: "/ai-mock-tests", htmlRoute: "/ai-mock-tests.html", file: "ai-mock-tests.html", critical: false },
  { group: "AI", label: "AI Roadmaps", cleanRoute: "/ai-roadmaps", htmlRoute: "/ai-roadmaps.html", file: "ai-roadmaps.html", critical: false },
  { group: "Admin", label: "Reports", cleanRoute: "/reports", htmlRoute: "/reports.html", file: "reports.html", critical: true },
  { group: "Admin", label: "Security", cleanRoute: "/security", htmlRoute: "/security.html", file: "security.html", critical: true },
  { group: "Admin", label: "Settings", cleanRoute: "/settings", htmlRoute: "/settings.html", file: "settings.html", critical: true },
  { group: "Admin", label: "Super Admin", cleanRoute: "/admin", htmlRoute: "/super-admin.html", file: "super-admin.html", critical: true },
  { group: "Admin", label: "Admin Analytics", cleanRoute: "/admin-analytics", htmlRoute: "/admin-analytics.html", file: "admin-analytics.html", critical: false },
  { group: "Other", label: "Announcements", cleanRoute: "/announcements", htmlRoute: "/announcements.html", file: "announcements.html", critical: false },
  { group: "Other", label: "Certificates", cleanRoute: "/certificates", htmlRoute: "/certificates.html", file: "certificates.html", critical: false },
  { group: "Other", label: "Library", cleanRoute: "/library", htmlRoute: "/library.html", file: "library.html", critical: false },
  { group: "Audit", label: "Part 53 System Audit", cleanRoute: "/system-audit", htmlRoute: "/system-audit.html", file: "system-audit.html", critical: true },
  { group: "Brand", label: "Part 54 Official Branding", cleanRoute: "/branding", htmlRoute: "/branding.html", file: "branding.html", critical: true },
  { group: "Security", label: "Part 55 Role Permissions", cleanRoute: "/role-permissions", htmlRoute: "/role-permissions.html", file: "role-permissions.html", critical: true },
  { group: "Leads", label: "Part 58 Enquiry CRM", cleanRoute: "/enquiry-followup-crm", htmlRoute: "/enquiry-followup-crm.html", file: "enquiry-followup-crm.html", critical: true },
  { group: "Discovery", label: "Part 59 Public Institute Profile", cleanRoute: "/public-institute-profile", htmlRoute: "/public-institute-profile.html", file: "public-institute-profile.html", critical: true },
  { group: "Leads", label: "Part 60 Request Callback / Send Enquiry", cleanRoute: "/request-callback", htmlRoute: "/request-callback.html", file: "request-callback.html", critical: true },
  { group: "Discovery", label: "Part 61 Nearby Institutes", cleanRoute: "/nearby-institutes", htmlRoute: "/nearby-institutes.html", file: "nearby-institutes.html", critical: true },
  { group: "Discovery", label: "Part 62 Compare Institutes", cleanRoute: "/compare-institutes", htmlRoute: "/compare-institutes.html", file: "compare-institutes.html", critical: true },
  { group: "Discovery", label: "Part 63 Discovery Leads Integration", cleanRoute: "/discovery-leads-integration", htmlRoute: "/discovery-leads-integration.html", file: "discovery-leads-integration.html", critical: true }
];

const part53ApiRegistry = [
  { group: "Core", label: "Health", prefix: "/api/health", method: "GET", critical: true },
  { group: "Auth", label: "Auth", prefix: "/api/auth", method: "POST/GET", critical: true },
  { group: "Dashboard", label: "Dashboard", prefix: "/api/dashboard", method: "GET", critical: true },
  { group: "People", label: "Students", prefix: "/api/students", method: "GET/POST/PUT/DELETE", critical: true, collection: "students" },
  { group: "People", label: "Teachers", prefix: "/api/teachers", method: "GET/POST/PUT/DELETE", critical: true, collection: "teachers" },
  { group: "People", label: "Parents", prefix: "/api/parents", method: "GET/POST/PUT/DELETE", critical: true, collection: "parents" },
  { group: "People", label: "Staff", prefix: "/api/staff", method: "GET/POST/PUT/DELETE", critical: true, collection: "staff" },
  { group: "Academic", label: "Courses", prefix: "/api/courses", method: "GET/POST", critical: false, collection: "courses" },
  { group: "Academic", label: "Batches", prefix: "/api/batches", method: "GET/POST/PUT/DELETE", critical: true, collection: "batches" },
  { group: "Academic", label: "Attendance", prefix: "/api/attendance", method: "GET/POST", critical: true, collection: "attendances" },
  { group: "Academic", label: "Assignments", prefix: "/api/assignments", method: "GET/POST", critical: false, collection: "assignments" },
  { group: "Academic", label: "Tests", prefix: "/api/tests", method: "GET/POST", critical: true, collection: "testresults" },
  { group: "Academic", label: "Test Builder", prefix: "/api/test-builder", method: "GET/POST", critical: false, collection: "questionpapers" },
  { group: "Academic", label: "Question Bank", prefix: "/api/question-bank", method: "GET/POST", critical: false, collection: "questionbankitems" },
  { group: "Academic", label: "Timetable", prefix: "/api/timetable", method: "GET/POST", critical: true, collection: "timetableslots" },
  { group: "Academic", label: "Progress", prefix: "/api/progress", method: "GET/POST", critical: true, collection: "progresses" },
  { group: "Money", label: "Fees", prefix: "/api/fees", method: "GET/POST/PUT/DELETE", critical: true, collection: "fees" },
  { group: "Money", label: "Finance", prefix: "/api/finance", method: "GET/POST", critical: true, collection: "financerecords" },
  { group: "Money", label: "Payments", prefix: "/api/payments", method: "GET/POST", critical: true, collection: "paymentrecords" },
  { group: "SaaS", label: "Subscriptions", prefix: "/api/subscriptions", method: "GET/POST", critical: true, collection: "subscriptions" },
  { group: "Leads", label: "Enquiries", prefix: "/api/enquiries", method: "GET/POST", critical: true, collection: "admissionenquiries" },
  { group: "Leads", label: "Follow-Ups", prefix: "/api/followups", method: "GET/POST", critical: true },
  { group: "Leads", label: "Discovery", prefix: "/api/discovery", method: "GET/POST", critical: true, collection: "discoveryleads" },
  { group: "Online", label: "Live Classes", prefix: "/api/live-classes", method: "GET/POST", critical: true, collection: "liveclasses" },
  { group: "Online", label: "Online Batches", prefix: "/api/online-batches", method: "GET/POST", critical: true, collection: "onlinebatchaccesses" },
  { group: "Communication", label: "Notifications", prefix: "/api/notifications", method: "GET/POST", critical: false, collection: "notificationcampaigns" },
  { group: "Communication", label: "Email Notifications", prefix: "/api/email-notifications", method: "GET/POST", critical: false, collection: "emailcampaigns" },
  { group: "AI", label: "AI Doubts", prefix: "/api/doubts", method: "GET/POST", critical: false, collection: "doubts" },
  { group: "AI", label: "AI Notes", prefix: "/api/ai-notes", method: "GET/POST", critical: false, collection: "ainotes" },
  { group: "AI", label: "AI Mock Tests", prefix: "/api/ai-mock-tests", method: "GET/POST", critical: false, collection: "aimocktests" },
  { group: "AI", label: "AI Roadmaps", prefix: "/api/ai-roadmaps", method: "GET/POST", critical: false, collection: "airoadmaps" },
  { group: "Admin", label: "Reports", prefix: "/api/reports", method: "GET", critical: true },
  { group: "Admin", label: "Security", prefix: "/api/security", method: "GET/POST", critical: true },
  { group: "Admin", label: "Settings", prefix: "/api/settings", method: "GET/POST", critical: true, collection: "institutesettings" },
  { group: "Admin", label: "Super Admin", prefix: "/api/super-admin", method: "GET/POST", critical: true, collection: "superadminactions" },
  { group: "Admin", label: "Admin Analytics", prefix: "/api/admin-analytics", method: "GET", critical: false },
  { group: "Part 53", label: "System Audit", prefix: "/api/part53", method: "GET", critical: true },
  { group: "Part 54", label: "Official Branding", prefix: "/api/part54", method: "GET", critical: true },
  { group: "Part 55", label: "Security and Role Permissions", prefix: "/api/part55", method: "GET", critical: true },
  { group: "Part 56", label: "Smart Student Enrolment", prefix: "/api/part56", method: "GET/POST", critical: true, collection: "part56enrolments" },
  { group: "Part 57", label: "Student Parent Portal", prefix: "/api/part57", method: "GET", critical: true },
  { group: "Part 58", label: "Enquiry Follow-Up CRM", prefix: "/api/part58", method: "GET/POST/PATCH", critical: true, collection: "part58leads" },
  { group: "Part 59", label: "Public Institute Profile", prefix: "/api/part59", method: "GET/POST/PATCH", critical: true, collection: "part59publicprofiles" },
  { group: "Part 60", label: "Request Callback / Send Enquiry", prefix: "/api/part60", method: "GET/POST/PATCH", critical: true, collection: "part60callbackenquiries" },
  { group: "Part 61", label: "Nearby Institutes", prefix: "/api/part61", method: "GET", critical: true, collection: "part59publicprofiles" },
  { group: "Part 62", label: "Compare Institutes", prefix: "/api/part62", method: "GET/POST", critical: true, collection: "part59publicprofiles" },
  { group: "Part 63", label: "Discovery Leads Integration", prefix: "/api/part63", method: "GET/POST", critical: true, collection: "part59publicprofiles + part60callbackenquiries + part58enquiryfollowups" }
];

const part53CriticalFlows = [
  { id: "auth-flow", title: "Signup/Login Flow", steps: ["/signup open", "new account create", "login", "token save", "/dashboard open"], expected: "Dashboard login ke baad open ho." },
  { id: "student-crud", title: "Student CRUD", steps: ["student add", "list me show", "page refresh", "edit", "delete"], expected: "Data MongoDB me save rahe aur refresh ke baad visible rahe." },
  { id: "fees-crud", title: "Fees CRUD", steps: ["fee record add", "paid/pending check", "receipt/history", "refresh"], expected: "Pending fees aur paid amount accurate dikhe." },
  { id: "attendance-flow", title: "Attendance Flow", steps: ["batch select", "present/absent mark", "save", "report/progress me reflect"], expected: "Attendance history database se load ho." },
  { id: "lead-crm", title: "Enquiry + Follow-Up", steps: ["new enquiry", "follow-up date", "status update", "conversion check"], expected: "Lead lost na ho aur next action clear rahe." },
  { id: "live-class-flow", title: "Live Class Access", steps: ["class schedule", "batch link", "join/access rule", "recording/resources check"], expected: "Paid/active batch access logic verify ho." },
  { id: "payment-flow", title: "Razorpay/Test Payment", steps: ["config check", "payment record", "order create", "test checkout", "receipt"], expected: "Test mode me safe order/verify flow chale; secret expose na ho." },
  { id: "role-flow", title: "Role Permission", steps: ["owner", "teacher", "staff", "student", "parent"], expected: "Har role ko sirf required data dikhna chahiye." }
];

const part53ManualChecklist = [
  "Har sidebar button ko click karke check karo: 404 nahi aana chahiye.",
  "Har important form me sample data save karke MongoDB persistence verify karo.",
  "Page refresh ke baad saved data visible hai ya nahi check karo.",
  "Edit/delete/search buttons working hain ya nahi verify karo.",
  "Protected API direct open karne par login token missing aana normal hai.",
  "Render live URL par /api/health me dbMode mongodb confirm karo.",
  "Razorpay sirf test keys se test karo; secret screenshot/chat me share mat karo.",
  "Console me Failed to fetch, 404, 500, CORS error mile to screenshot + exact page note karo."
];

function getPart53EnvStatus(req) {
  const keyId = process.env.RAZORPAY_KEY_ID || "";
  return {
    host: req.get("host"),
    environment: process.env.NODE_ENV || "development",
    dbMode: globalThis.NAXORA_DB_MODE || "starting",
    mongoReadyState: mongoose.connection?.readyState ?? 0,
    frontendUrl: process.env.FRONTEND_URL || "not set",
    jwtSecret: process.env.JWT_SECRET ? `present (${process.env.JWT_SECRET.length} chars)` : "missing",
    razorpay: keyId ? (keyId.startsWith("rzp_live_") ? "live-key-present" : keyId.startsWith("rzp_test_") ? "test-key-present" : "unknown-key-format") : "mock/missing",
    internalToolsEnabled,
    timestamp: new Date().toISOString()
  };
}

function part53FileStatus(item) {
  const filePath = path.join(frontendPath, item.file);
  const exists = fs.existsSync(filePath);
  return {
    ...item,
    fileExists: exists,
    status: exists ? "pass" : item.critical ? "fail" : "warn",
    action: exists ? "Open clean route and test buttons/forms." : "Frontend file missing. File restore/fix required."
  };
}

async function getPart53DbCollectionStatus() {
  const uniqueCollections = [...new Set(part53ApiRegistry.map((item) => item.collection).filter(Boolean))];
  const dbConnected = globalThis.NAXORA_DB_MODE === "mongodb" && mongoose.connection?.readyState === 1;
  if (!dbConnected) {
    return uniqueCollections.map((collection) => ({ collection, status: "warn", count: null, note: "MongoDB connected nahi hai; live DB audit skipped." }));
  }
  const results = [];
  for (const collection of uniqueCollections) {
    try {
      const count = await mongoose.connection.collection(collection).estimatedDocumentCount();
      results.push({ collection, status: "pass", count, note: count > 0 ? "Collection has data." : "Collection empty hai; demo/client testing me sample data add karo." });
    } catch (error) {
      results.push({ collection, status: "warn", count: null, note: error.message });
    }
  }
  return results;
}

async function buildPart53AuditReport(req) {
  const env = getPart53EnvStatus(req);
  const pages = part53PageRegistry.map(part53FileStatus);
  const apiPrefixes = new Set(["/api/health", "/api/part53", "/api/part54", "/api/part55", "/api/parents", "/api/staff", "/api/progress", ...majorModuleRoutes]);
  const apis = part53ApiRegistry.map((item) => {
    const mounted = item.prefix === "/api/health" || item.prefix === "/api/part53" || item.prefix === "/api/part54" || item.prefix === "/api/part55" || apiPrefixes.has(item.prefix);
    return {
      ...item,
      registered: mounted,
      status: mounted ? "pass" : item.critical ? "fail" : "warn",
      action: mounted ? "Manual GET/POST test required according to module form." : "Route registry me prefix missing hai. server.js route mount check karo."
    };
  });
  const dbCollections = await getPart53DbCollectionStatus();
  const allChecks = [...pages, ...apis, ...dbCollections];
  const summary = {
    total: allChecks.length,
    pass: allChecks.filter((item) => item.status === "pass").length,
    warn: allChecks.filter((item) => item.status === "warn").length,
    fail: allChecks.filter((item) => item.status === "fail").length,
    criticalFailures: [...pages, ...apis].filter((item) => item.critical && item.status === "fail").map((item) => item.label || item.prefix || item.file)
  };
  const launchGate = summary.fail === 0 && env.dbMode === "mongodb" ? "audit-ready-for-manual-crud" : "fix-required-before-client-demo";
  return {
    success: true,
    part: "Part 53 - Complete System Audit",
    basedOn: "Part 52 Live Clean Route Fix",
    status: "active",
    launchGate,
    env,
    summary,
    pages,
    apis,
    dbCollections,
    criticalFlows: part53CriticalFlows,
    manualChecklist: part53ManualChecklist,
    nextStep: summary.fail > 0
      ? "Pehle fail items fix karo, phir /api/part53/run dobara check karo."
      : "Ab browser me manual CRUD audit start karo: signup/login, students, fees, attendance, enquiries, payments.",
    founderNote: "Button dikhna aur feature fully working hona alag hai. Part 53 ka kaam wahi real audit complete karna hai."
  };
}

app.get("/api/part53/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 53 - Complete System Audit",
    status: "active",
    basedOn: "Part 52 Live Clean Route Fix",
    frontend: ["/system-audit", "/audit"],
    routes: ["/api/part53/status", "/api/part53/audit-plan", "/api/part53/pages", "/api/part53/run", "/api/part53/export"],
    purpose: "Har existing button, route, API aur database flow ko Part 78 v1.0 launch se pehle verify karna.",
    currentVersionPlan: "Part 53-78 = NAXORA OS 1.0 completion. Part 79-110 = NAXORA OS 2.0 development."
  });
});

app.get("/api/part53/audit-plan", (req, res) => {
  res.json({
    success: true,
    part: "Part 53 - Complete System Audit",
    pages: part53PageRegistry,
    apis: part53ApiRegistry,
    criticalFlows: part53CriticalFlows,
    manualChecklist: part53ManualChecklist
  });
});

app.get("/api/part53/pages", (req, res) => {
  res.json({ success: true, pages: part53PageRegistry.map(part53FileStatus) });
});

app.get("/api/part53/run", async (req, res, next) => {
  try {
    res.json(await buildPart53AuditReport(req));
  } catch (error) {
    next(error);
  }
});

app.get("/api/part53/export", async (req, res, next) => {
  try {
    const report = await buildPart53AuditReport(req);
    res.setHeader("Content-Disposition", "attachment; filename=naxora-part53-audit-report.json");
    res.json(report);
  } catch (error) {
    next(error);
  }
});

app.get("/api/system-audit/status", (req, res) => {
  res.redirect(302, "/api/part53/status");
});
// ================= END PART 53 =================


// ================= PART 54: OFFICIAL NAXORA BRANDING =================
// Roadmap: colored NAXORA logo, sidebar/logo branding, auth/dashboard polish,
// black + gold + white + electric-blue theme, and consistent buttons/cards/fonts.
const part54BrandKit = {
  product: "NAXORA Institute OS",
  part: "Part 54 - Official NAXORA Branding",
  status: "active",
  versionTrack: "NAXORA OS 1.0",
  purpose: "NAXORA ko ek professional, consistent aur sellable SaaS brand identity dena.",
  palette: {
    black: "#030509",
    gold: "#D4AF37",
    white: "#FFFFFF",
    electricBlue: "#00D4FF"
  },
  assets: {
    logo: "/assets/naxora-logo.svg",
    brandCss: "/brand-system.css",
    brandJs: "/brand-system.js",
    brandPage: "/branding"
  },
  appliedTo: [
    "Login / Signup screen",
    "Dashboard sidebar and topbar",
    "All module pages through shared brand CSS/JS",
    "Buttons, cards, inputs, badges and hover states",
    "Official brand guide page"
  ],
  nextPart: "Part 55 - Security and Role Permissions"
};

const part54Checklist = [
  { item: "Colored NAXORA SVG logo added", status: "done" },
  { item: "Official black/gold/white/electric-blue palette added", status: "done" },
  { item: "Global brand-system.css added", status: "done" },
  { item: "Global brand-system.js added", status: "done" },
  { item: "Login/signup branding polish added", status: "done" },
  { item: "Dashboard branding badge/sidebar polish added", status: "done" },
  { item: "Brand guide frontend page added", status: "done" },
  { item: "Part 54 status APIs added", status: "done" },
  { item: "No .env or secret required", status: "safe" }
];

function part54AssetStatus() {
  const files = [
    { label: "Logo SVG", file: "assets/naxora-logo.svg" },
    { label: "Brand CSS", file: "brand-system.css" },
    { label: "Brand JS", file: "brand-system.js" },
    { label: "Branding Page", file: "branding.html" },
    { label: "Branding Page CSS", file: "branding.css" },
    { label: "Branding Page JS", file: "branding.js" }
  ];

  return files.map((asset) => {
    const absolutePath = path.join(frontendPath, asset.file);
    return {
      ...asset,
      exists: fs.existsSync(absolutePath),
      route: asset.file.startsWith("assets/") ? `/${asset.file}` : `/${asset.file}`
    };
  });
}

app.get("/api/part54/status", (req, res) => {
  const assets = part54AssetStatus();
  res.json({
    success: true,
    ...part54BrandKit,
    routes: ["/branding", "/brand", "/api/part54/status", "/api/part54/brand-kit", "/api/part54/checklist", "/api/part54/assets"],
    assetSummary: {
      total: assets.length,
      ready: assets.filter((asset) => asset.exists).length,
      missing: assets.filter((asset) => !asset.exists).length
    },
    currentVersionPlan: "Part 53-78 = NAXORA OS 1.0 completion. Part 79-110 = NAXORA OS 2.0 development."
  });
});

app.get("/api/part54/brand-kit", (req, res) => {
  res.json({ success: true, brandKit: part54BrandKit });
});

app.get("/api/part54/checklist", (req, res) => {
  res.json({ success: true, part: part54BrandKit.part, checklist: part54Checklist });
});

app.get("/api/part54/assets", (req, res) => {
  res.json({ success: true, part: part54BrandKit.part, assets: part54AssetStatus() });
});
// ================= END PART 54 =================

// ================= PART 55: SECURITY AND ROLE PERMISSIONS =================
// Roadmap: NAXORA Super Admin, Institute Owner, Sub-Admin, Teacher, Staff,
// Student and Parent ko role-wise permissions dena. Is part me safe RBAC
// foundation + live permission matrix add hai. Existing client flows ko todne
// se bachane ke liye hard-enforcement ko staged rollout me rakha gaya hai.
const part55RoleDefinitions = [
  {
    key: "naxora_super_admin",
    label: "NAXORA Super Admin",
    level: 100,
    scope: "platform",
    description: "Pure NAXORA platform, institutes, subscriptions, analytics aur support actions ka central control.",
    defaultLanding: "/admin",
    badge: "Platform Control"
  },
  {
    key: "institute_owner",
    label: "Institute Owner",
    level: 90,
    scope: "institute",
    description: "Apne institute ka full business, academic, people, finance aur settings control.",
    defaultLanding: "/dashboard",
    badge: "Institute Admin"
  },
  {
    key: "sub_admin",
    label: "Sub-Admin",
    level: 70,
    scope: "institute",
    description: "Owner ke behalf par daily operations manage karega, lekin billing/security final control limited rahega.",
    defaultLanding: "/dashboard",
    badge: "Operations"
  },
  {
    key: "teacher",
    label: "Teacher",
    level: 50,
    scope: "assigned_batches",
    description: "Assigned batches, attendance, assignments, tests aur student progress dekh/sambhal sakta hai.",
    defaultLanding: "/teachers",
    badge: "Academic"
  },
  {
    key: "staff",
    label: "Staff",
    level: 40,
    scope: "assigned_desk",
    description: "Reception/account/counselling work ke hisaab se enquiry, follow-up, attendance aur fee entry support.",
    defaultLanding: "/staff",
    badge: "Desk Team"
  },
  {
    key: "student",
    label: "Student",
    level: 20,
    scope: "self",
    description: "Apni classes, notes, tests, assignments, attendance aur fees summary dekh sakta hai.",
    defaultLanding: "/student",
    badge: "Learner"
  },
  {
    key: "parent",
    label: "Parent",
    level: 20,
    scope: "linked_children",
    description: "Linked child ki attendance, fee, reports, notices aur progress dekh sakta hai.",
    defaultLanding: "/parent",
    badge: "Guardian"
  }
];

const part55PermissionCatalog = [
  { key: "platform.manage", group: "Platform", title: "NAXORA platform manage" },
  { key: "institutes.manage", group: "Platform", title: "Institutes approve/manage" },
  { key: "subscriptions.manage", group: "SaaS", title: "Plans/subscriptions manage" },
  { key: "analytics.view", group: "Admin", title: "Admin analytics view" },
  { key: "settings.manage", group: "Admin", title: "Institute settings manage" },
  { key: "security.manage", group: "Admin", title: "Security settings manage" },
  { key: "users.manage", group: "People", title: "Users and roles manage" },
  { key: "students.read", group: "People", title: "Students read" },
  { key: "students.write", group: "People", title: "Students add/update" },
  { key: "parents.read", group: "People", title: "Parents read" },
  { key: "parents.write", group: "People", title: "Parents add/update" },
  { key: "teachers.read", group: "People", title: "Teachers read" },
  { key: "teachers.write", group: "People", title: "Teachers add/update" },
  { key: "staff.read", group: "People", title: "Staff read" },
  { key: "staff.write", group: "People", title: "Staff add/update" },
  { key: "batches.read", group: "Academic", title: "Batches read" },
  { key: "batches.write", group: "Academic", title: "Batches create/update" },
  { key: "attendance.read", group: "Academic", title: "Attendance read" },
  { key: "attendance.write", group: "Academic", title: "Attendance mark/update" },
  { key: "assignments.read", group: "Academic", title: "Assignments read" },
  { key: "assignments.write", group: "Academic", title: "Assignments create/update" },
  { key: "tests.read", group: "Academic", title: "Tests/results read" },
  { key: "tests.write", group: "Academic", title: "Tests/results create/update" },
  { key: "reports.view", group: "Academic", title: "Reports view" },
  { key: "fees.read", group: "Money", title: "Fees read" },
  { key: "fees.write", group: "Money", title: "Fees entry/update" },
  { key: "finance.view", group: "Money", title: "Finance summary view" },
  { key: "payments.manage", group: "Money", title: "Payments manage" },
  { key: "enquiries.read", group: "Leads", title: "Enquiries read" },
  { key: "enquiries.write", group: "Leads", title: "Enquiries add/update" },
  { key: "followups.manage", group: "Leads", title: "Follow-ups manage" },
  { key: "live_classes.manage", group: "Online", title: "Live classes manage" },
  { key: "notices.manage", group: "Communication", title: "Announcements/notifications manage" },
  { key: "ai.use", group: "AI", title: "AI tools use" },
  { key: "self.profile", group: "Self", title: "Own profile view/update" },
  { key: "child.progress", group: "Parent", title: "Linked child progress view" }
];

const part55RolePermissions = {
  naxora_super_admin: ["*"],
  institute_owner: [
    "settings.manage", "security.manage", "users.manage", "analytics.view", "subscriptions.manage",
    "students.read", "students.write", "parents.read", "parents.write", "teachers.read", "teachers.write",
    "staff.read", "staff.write", "batches.read", "batches.write", "attendance.read", "attendance.write",
    "assignments.read", "assignments.write", "tests.read", "tests.write", "reports.view", "fees.read", "fees.write",
    "finance.view", "payments.manage", "enquiries.read", "enquiries.write", "followups.manage", "live_classes.manage",
    "notices.manage", "ai.use", "self.profile"
  ],
  sub_admin: [
    "students.read", "students.write", "parents.read", "parents.write", "teachers.read", "staff.read",
    "batches.read", "batches.write", "attendance.read", "attendance.write", "assignments.read", "assignments.write",
    "tests.read", "tests.write", "reports.view", "fees.read", "fees.write", "enquiries.read", "enquiries.write",
    "followups.manage", "live_classes.manage", "notices.manage", "ai.use", "self.profile"
  ],
  teacher: [
    "students.read", "parents.read", "batches.read", "attendance.read", "attendance.write", "assignments.read",
    "assignments.write", "tests.read", "tests.write", "reports.view", "live_classes.manage", "ai.use", "self.profile"
  ],
  staff: [
    "students.read", "students.write", "parents.read", "parents.write", "attendance.read", "attendance.write",
    "fees.read", "fees.write", "enquiries.read", "enquiries.write", "followups.manage", "notices.manage", "self.profile"
  ],
  student: ["self.profile", "batches.read", "attendance.read", "assignments.read", "tests.read", "fees.read", "live_classes.manage", "ai.use"],
  parent: ["self.profile", "child.progress", "students.read", "attendance.read", "assignments.read", "tests.read", "fees.read", "notices.manage"]
};

const part55ProtectedAreas = [
  { area: "Super Admin", route: "/admin", api: "/api/super-admin", allowedRoles: ["naxora_super_admin"] },
  { area: "Institute Dashboard", route: "/dashboard", api: "/api/dashboard", allowedRoles: ["naxora_super_admin", "institute_owner", "sub_admin"] },
  { area: "Students", route: "/student", api: "/api/students", allowedRoles: ["naxora_super_admin", "institute_owner", "sub_admin", "teacher", "staff"] },
  { area: "Parent Portal", route: "/parent", api: "/api/parents", allowedRoles: ["naxora_super_admin", "institute_owner", "sub_admin", "parent"] },
  { area: "Teacher Work", route: "/teachers", api: "/api/teachers", allowedRoles: ["naxora_super_admin", "institute_owner", "sub_admin", "teacher"] },
  { area: "Fees", route: "/fees", api: "/api/fees", allowedRoles: ["naxora_super_admin", "institute_owner", "sub_admin", "staff", "student", "parent"] },
  { area: "Finance", route: "/finance", api: "/api/finance", allowedRoles: ["naxora_super_admin", "institute_owner"] },
  { area: "Security", route: "/security", api: "/api/security", allowedRoles: ["naxora_super_admin", "institute_owner"] },
  { area: "Role Permissions", route: "/role-permissions", api: "/api/part55", allowedRoles: ["naxora_super_admin", "institute_owner"] }
];

const part55Checklist = [
  { item: "7 official roles defined", status: "done" },
  { item: "Permission catalog created", status: "done" },
  { item: "Role-to-permission matrix created", status: "done" },
  { item: "Protected areas mapping added", status: "done" },
  { item: "Permission checker API added", status: "done" },
  { item: "Role Permissions frontend page added", status: "done" },
  { item: "No .env or secret required", status: "safe" },
  { item: "Hard enforcement on existing APIs", status: "staged-rollout", note: "Part 55 foundation active hai; existing routes ko todne se bachane ke liye full enforcement ko audit ke baad apply karna hai." }
];

function normalizePart55Role(role) {
  return String(role || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function part55RoleExists(role) {
  const normalized = normalizePart55Role(role);
  return part55RoleDefinitions.some((item) => item.key === normalized);
}

function part55HasPermission(role, permission) {
  const normalizedRole = normalizePart55Role(role);
  const requestedPermission = String(permission || "").trim();
  const permissions = part55RolePermissions[normalizedRole] || [];
  if (permissions.includes("*")) return true;
  if (permissions.includes(requestedPermission)) return true;
  const [group] = requestedPermission.split(".");
  return permissions.includes(`${group}.*`);
}

function buildPart55Matrix() {
  return part55RoleDefinitions.map((role) => {
    const permissions = part55RolePermissions[role.key] || [];
    return {
      ...role,
      permissions,
      permissionCount: permissions.includes("*") ? part55PermissionCatalog.length : permissions.length,
      hasFullAccess: permissions.includes("*")
    };
  });
}

function part55RequirePermission(permission) {
  return (req, res, next) => {
    const roleFromHeader = req.get("x-naxora-role") || req.user?.role || req.query?.role;
    if (part55HasPermission(roleFromHeader, permission)) return next();
    return res.status(403).json({
      success: false,
      code: "ROLE_PERMISSION_DENIED",
      message: "Is role ko ye action allowed nahi hai.",
      requiredPermission: permission,
      receivedRole: normalizePart55Role(roleFromHeader),
      hint: "Login token ke role ko Part 55 matrix ke saath map karo."
    });
  };
}

globalThis.NAXORA_PART55 = {
  roles: part55RoleDefinitions,
  permissions: part55PermissionCatalog,
  rolePermissions: part55RolePermissions,
  protectedAreas: part55ProtectedAreas,
  hasPermission: part55HasPermission,
  requirePermission: part55RequirePermission
};

app.get("/role-permissions", (req, res) => sendFileSafe(res, "role-permissions.html"));
app.get("/permissions", (req, res) => sendFileSafe(res, "role-permissions.html"));

app.get("/api/part55/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 55 - Security and Role Permissions",
    status: "active",
    basedOn: "Part 54 - Official NAXORA Branding",
    purpose: "Har user ko sirf required data/actions dikhane ke liye role-based permission foundation.",
    roles: part55RoleDefinitions.map((role) => role.key),
    totalRoles: part55RoleDefinitions.length,
    totalPermissions: part55PermissionCatalog.length,
    frontend: ["/role-permissions", "/permissions"],
    routes: ["/api/part55/status", "/api/part55/roles", "/api/part55/permission-catalog", "/api/part55/matrix", "/api/part55/protected-areas", "/api/part55/check-access", "/api/part55/checklist"],
    enforcementMode: "safe-foundation-staged-rollout",
    currentVersionPlan: "Part 53-78 = NAXORA OS 1.0 completion. Part 79-110 = NAXORA OS 2.0 development."
  });
});

app.get("/api/part55/roles", (req, res) => {
  res.json({ success: true, part: "Part 55 - Security and Role Permissions", roles: part55RoleDefinitions });
});

app.get("/api/part55/permission-catalog", (req, res) => {
  res.json({ success: true, permissions: part55PermissionCatalog });
});

app.get("/api/part55/matrix", (req, res) => {
  res.json({ success: true, matrix: buildPart55Matrix(), permissions: part55PermissionCatalog });
});

app.get("/api/part55/protected-areas", (req, res) => {
  res.json({ success: true, protectedAreas: part55ProtectedAreas });
});

app.get("/api/part55/check-access", (req, res) => {
  const role = normalizePart55Role(req.query.role || req.get("x-naxora-role") || "");
  const permission = String(req.query.permission || "").trim();
  if (!role || !permission) {
    return res.status(400).json({
      success: false,
      message: "role aur permission query required hain. Example: /api/part55/check-access?role=teacher&permission=attendance.write"
    });
  }
  const exists = part55RoleExists(role);
  res.json({
    success: true,
    role,
    roleExists: exists,
    permission,
    allowed: exists ? part55HasPermission(role, permission) : false,
    reason: exists ? "Part 55 matrix checked." : "Unknown role."
  });
});

app.get("/api/part55/checklist", (req, res) => {
  res.json({ success: true, part: "Part 55 - Security and Role Permissions", checklist: part55Checklist });
});
// ================= END PART 55 =================


// ================= PART 56: SMART STUDENT ENROLMENT =================
// Goal: Digital admission flow with student details, parent/guardian, document checklist,
// unique student ID, course/batch assignment, optional verification and consent.
// Safe approach: actual file uploads are not stored in this part; only document/photo status
// metadata is saved. Secure file storage can be added later after beta audit.
const part56EnrolmentStages = [
  { id: "draft", label: "Draft", description: "Form started, not reviewed yet." },
  { id: "submitted", label: "Submitted", description: "Admission form submitted for institute review." },
  { id: "verified", label: "Verified", description: "Documents and guardian details checked." },
  { id: "admitted", label: "Admitted", description: "Student is ready to convert into active student record." },
  { id: "rejected", label: "Rejected", description: "Application closed or not accepted." }
];

const part56Courses = [
  { id: "web-dev", name: "Web Development", defaultFee: 2999, mode: "offline/online", duration: "3 months" },
  { id: "ai-tools", name: "AI Tools + Productivity", defaultFee: 1999, mode: "hybrid", duration: "6 weeks" },
  { id: "school-tuition", name: "School Tuition", defaultFee: 1500, mode: "offline", duration: "monthly" },
  { id: "spoken-english", name: "Spoken English", defaultFee: 1200, mode: "offline", duration: "monthly" },
  { id: "exam-prep", name: "Exam Preparation", defaultFee: 2500, mode: "hybrid", duration: "custom" }
];

const part56Batches = [
  { id: "morning-a", name: "Morning Batch A", timing: "07:00 AM - 08:30 AM", seats: 25, available: 12 },
  { id: "evening-b", name: "Evening Batch B", timing: "05:00 PM - 06:30 PM", seats: 30, available: 9 },
  { id: "weekend-pro", name: "Weekend Pro Batch", timing: "Sat-Sun 10:00 AM - 12:00 PM", seats: 20, available: 6 },
  { id: "online-live", name: "Online Live Batch", timing: "08:00 PM - 09:00 PM", seats: 50, available: 31 }
];

const part56DocumentChecklist = [
  { key: "studentPhoto", label: "Student Photo", required: true, type: "image-status" },
  { key: "parentGuardianId", label: "Parent/Guardian ID Proof", required: true, type: "document-status" },
  { key: "previousMarksheet", label: "Previous Marksheet / Academic Proof", required: false, type: "document-status" },
  { key: "addressProof", label: "Address Proof", required: false, type: "document-status" },
  { key: "consentSigned", label: "Consent Confirmation", required: true, type: "checkbox" }
];

const part56ConsentItems = [
  "Parent/guardian ne admission details verify ki hain.",
  "Institute student ko attendance, fees, result aur class updates bhej sakta hai.",
  "Student data ka use sirf institute management aur learning support ke liye hoga.",
  "Document upload/storage future secure version me cloud storage ke saath enable hoga."
];

const part56ValidationRules = {
  requiredFields: ["studentName", "studentPhone", "parentName", "parentPhone", "courseId", "batchId"],
  phoneLength: "10 digits recommended",
  consentRequired: true,
  guardianRequiredForMinor: true,
  duplicateCheck: "phone + course + batch"
};

const part56Checklist = [
  "Admission form opens on /smart-enrolment.",
  "Student basic details are captured.",
  "Parent/guardian details are captured.",
  "Course and batch assignment works.",
  "Unique student ID is generated.",
  "Required document checklist status is tracked.",
  "Consent checkbox is mandatory.",
  "MongoDB connected mode saves enrolment in smartenrolments collection.",
  "Mock mode keeps server crash-free for testing.",
  "Status can move from submitted to verified/admitted/rejected."
];

globalThis.NAXORA_PART56_ENROLMENTS = globalThis.NAXORA_PART56_ENROLMENTS || [];

function part56CleanText(value, max = 120) {
  return String(value || "").trim().slice(0, max);
}

function part56CleanPhone(value) {
  return String(value || "").replace(/[^0-9+]/g, "").slice(0, 16);
}

function part56Slug(value) {
  return String(value || "NAXORA").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "NAXORA";
}

function part56GenerateStudentId(payload = {}) {
  const course = part56Courses.find((item) => item.id === payload.courseId);
  const courseCode = part56Slug(course?.name || payload.courseId || "STD");
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `NX-${year}-${courseCode}-${random}`;
}

function part56ValidatePayload(payload = {}) {
  const errors = [];
  for (const field of part56ValidationRules.requiredFields) {
    if (!part56CleanText(payload[field], 160)) errors.push(`${field} required hai`);
  }
  const studentPhone = part56CleanPhone(payload.studentPhone);
  const parentPhone = part56CleanPhone(payload.parentPhone);
  if (studentPhone && studentPhone.replace(/\D/g, "").length < 10) errors.push("studentPhone 10 digit ke aas-paas hona chahiye");
  if (parentPhone && parentPhone.replace(/\D/g, "").length < 10) errors.push("parentPhone 10 digit ke aas-paas hona chahiye");
  if (!part56Courses.some((item) => item.id === payload.courseId)) errors.push("Valid courseId select karo");
  if (!part56Batches.some((item) => item.id === payload.batchId)) errors.push("Valid batchId select karo");
  if (payload.consentAccepted !== true) errors.push("Consent required hai");
  return errors;
}

function part56BuildEnrolment(payload = {}, existing = {}) {
  const course = part56Courses.find((item) => item.id === payload.courseId) || null;
  const batch = part56Batches.find((item) => item.id === payload.batchId) || null;
  const now = new Date();
  const documents = payload.documents && typeof payload.documents === "object" ? payload.documents : {};
  const requiredDocsReady = part56DocumentChecklist
    .filter((item) => item.required)
    .every((item) => item.key === "consentSigned" ? payload.consentAccepted === true : documents[item.key] === true || documents[item.key] === "ready");

  return {
    ...existing,
    studentId: existing.studentId || payload.studentId || part56GenerateStudentId(payload),
    studentName: part56CleanText(payload.studentName, 100),
    studentPhone: part56CleanPhone(payload.studentPhone),
    studentEmail: part56CleanText(payload.studentEmail, 120),
    studentClass: part56CleanText(payload.studentClass, 60),
    dateOfBirth: part56CleanText(payload.dateOfBirth, 40),
    parentName: part56CleanText(payload.parentName, 100),
    parentPhone: part56CleanPhone(payload.parentPhone),
    parentEmail: part56CleanText(payload.parentEmail, 120),
    guardianRelation: part56CleanText(payload.guardianRelation || "Parent", 60),
    address: part56CleanText(payload.address, 240),
    courseId: course?.id || payload.courseId,
    courseName: course?.name || part56CleanText(payload.courseName, 100),
    batchId: batch?.id || payload.batchId,
    batchName: batch?.name || part56CleanText(payload.batchName, 100),
    feePlan: {
      expectedFee: Number(payload.expectedFee || course?.defaultFee || 0),
      discount: Number(payload.discount || 0),
      installmentAllowed: payload.installmentAllowed === true
    },
    documents: {
      studentPhoto: documents.studentPhoto === true || documents.studentPhoto === "ready",
      parentGuardianId: documents.parentGuardianId === true || documents.parentGuardianId === "ready",
      previousMarksheet: documents.previousMarksheet === true || documents.previousMarksheet === "ready",
      addressProof: documents.addressProof === true || documents.addressProof === "ready",
      note: part56CleanText(documents.note, 180)
    },
    verification: {
      identityVerified: payload.identityVerified === true,
      guardianVerified: payload.guardianVerified === true,
      requiredDocsReady,
      verifiedBy: part56CleanText(payload.verifiedBy, 80),
      verifiedAt: payload.identityVerified || payload.guardianVerified ? now : null
    },
    consentAccepted: payload.consentAccepted === true,
    consentAcceptedAt: payload.consentAccepted === true ? (existing.consentAcceptedAt || now) : null,
    status: existing.status || "submitted",
    source: part56CleanText(payload.source || "smart-enrolment", 60),
    notes: part56CleanText(payload.notes, 240),
    part: "Part 68 - AI Credits and Usage",
    createdAt: existing.createdAt || now,
    updatedAt: now
  };
}

function part56PublicEnrolmentView(row = {}) {
  return {
    id: row._id || row.id || row.studentId,
    studentId: row.studentId,
    studentName: row.studentName,
    studentPhone: row.studentPhone,
    parentName: row.parentName,
    parentPhone: row.parentPhone,
    courseName: row.courseName,
    batchName: row.batchName,
    status: row.status,
    documents: row.documents,
    verification: row.verification,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

async function part56GetCollection() {
  if (globalThis.NAXORA_DB_MODE === "mongodb" && mongoose.connection?.readyState === 1) {
    return mongoose.connection.collection("smartenrolments");
  }
  return null;
}

app.get("/smart-enrolment", (req, res) => sendFileSafe(res, "smart-enrolment.html"));
app.get("/enrolment", (req, res) => sendFileSafe(res, "smart-enrolment.html"));
app.get("/admission", (req, res) => sendFileSafe(res, "smart-enrolment.html"));
app.get("/admissions", (req, res) => sendFileSafe(res, "smart-enrolment.html"));

app.get("/api/part56/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 68 - AI Credits and Usage",
    status: "active",
    currentVersionPlan: "Part 53–78 = NAXORA OS 1.0 completion. Part 79–110 = NAXORA OS 2.0 development.",
    goal: "Complete digital admission form with parent/guardian details, document checklist, unique student ID, course and batch assignment, optional verification and consent.",
    dbMode: globalThis.NAXORA_DB_MODE || "starting",
    frontend: ["/smart-enrolment", "/enrolment", "/admission"],
    routes: [
      "GET /api/part56/status",
      "GET /api/part56/form-config",
      "POST /api/part56/preview-student-id",
      "GET /api/part56/enrolments",
      "POST /api/part56/enrolments",
      "GET /api/part56/enrolments/:id",
      "PATCH /api/part56/enrolments/:id/status",
      "GET /api/part56/checklist",
      "GET /api/part56/export"
    ],
    safety: "Part 56 actual ID/photo files store nahi karta; only checklist status save hota hai. Secure upload storage beta ke baad add karenge."
  });
});

app.get("/api/part56/form-config", (req, res) => {
  res.json({
    success: true,
    courses: part56Courses,
    batches: part56Batches,
    documents: part56DocumentChecklist,
    consentItems: part56ConsentItems,
    stages: part56EnrolmentStages,
    validationRules: part56ValidationRules
  });
});

app.post("/api/part56/preview-student-id", (req, res) => {
  res.json({ success: true, studentId: part56GenerateStudentId(req.body || {}), note: "Final ID submit ke time generate/save hoga." });
});

app.get("/api/part56/enrolments", async (req, res) => {
  const collection = await part56GetCollection();
  if (!collection) {
    return res.json({
      success: true,
      mode: "mock",
      count: globalThis.NAXORA_PART56_ENROLMENTS.length,
      enrolments: globalThis.NAXORA_PART56_ENROLMENTS.map(part56PublicEnrolmentView)
    });
  }
  const rows = await collection.find({}).sort({ createdAt: -1 }).limit(100).toArray();
  res.json({ success: true, mode: "mongodb", count: rows.length, enrolments: rows.map(part56PublicEnrolmentView) });
});

app.post("/api/part56/enrolments", async (req, res) => {
  const errors = part56ValidatePayload(req.body || {});
  if (errors.length) {
    return res.status(400).json({ success: false, message: "Admission form incomplete hai", errors });
  }

  const enrolment = part56BuildEnrolment(req.body || {});
  const collection = await part56GetCollection();
  if (!collection) {
    const id = `mock-${Date.now()}`;
    const mockRow = { ...enrolment, id };
    globalThis.NAXORA_PART56_ENROLMENTS.unshift(mockRow);
    return res.status(201).json({
      success: true,
      mode: "mock",
      message: "Smart enrolment mock mode me save hua. MongoDB connected hone par collection me save hoga.",
      enrolment: part56PublicEnrolmentView(mockRow)
    });
  }

  const duplicate = await collection.findOne({
    studentPhone: enrolment.studentPhone,
    courseId: enrolment.courseId,
    batchId: enrolment.batchId,
    status: { $ne: "rejected" }
  });
  if (duplicate) {
    return res.status(409).json({
      success: false,
      message: "Same phone/course/batch ke saath existing active enrolment mila.",
      existing: part56PublicEnrolmentView(duplicate)
    });
  }

  const result = await collection.insertOne(enrolment);
  const saved = await collection.findOne({ _id: result.insertedId });
  res.status(201).json({
    success: true,
    mode: "mongodb",
    message: "Smart student enrolment MongoDB me save ho gaya.",
    enrolment: part56PublicEnrolmentView(saved)
  });
});

app.get("/api/part56/enrolments/:id", async (req, res) => {
  const id = part56CleanText(req.params.id, 80);
  const collection = await part56GetCollection();
  if (!collection) {
    const row = globalThis.NAXORA_PART56_ENROLMENTS.find((item) => item.id === id || item.studentId === id);
    if (!row) return res.status(404).json({ success: false, message: "Enrolment not found" });
    return res.json({ success: true, mode: "mock", enrolment: part56PublicEnrolmentView(row) });
  }
  const query = id.startsWith("NX-") ? { studentId: id } : { studentId: id };
  const row = await collection.findOne(query);
  if (!row) return res.status(404).json({ success: false, message: "Enrolment not found" });
  res.json({ success: true, mode: "mongodb", enrolment: part56PublicEnrolmentView(row) });
});

app.patch("/api/part56/enrolments/:id/status", async (req, res) => {
  const id = part56CleanText(req.params.id, 80);
  const nextStatus = part56CleanText(req.body?.status, 40);
  const valid = part56EnrolmentStages.some((item) => item.id === nextStatus);
  if (!valid) return res.status(400).json({ success: false, message: "Valid status do", allowed: part56EnrolmentStages.map((item) => item.id) });
  const update = { status: nextStatus, updatedAt: new Date(), statusNote: part56CleanText(req.body?.statusNote, 180) };
  const collection = await part56GetCollection();
  if (!collection) {
    const index = globalThis.NAXORA_PART56_ENROLMENTS.findIndex((item) => item.id === id || item.studentId === id);
    if (index === -1) return res.status(404).json({ success: false, message: "Enrolment not found" });
    globalThis.NAXORA_PART56_ENROLMENTS[index] = { ...globalThis.NAXORA_PART56_ENROLMENTS[index], ...update };
    return res.json({ success: true, mode: "mock", enrolment: part56PublicEnrolmentView(globalThis.NAXORA_PART56_ENROLMENTS[index]) });
  }
  const result = await collection.findOneAndUpdate({ studentId: id }, { $set: update }, { returnDocument: "after" });
  const row = result?.value || await collection.findOne({ studentId: id });
  if (!row) return res.status(404).json({ success: false, message: "Enrolment not found" });
  res.json({ success: true, mode: "mongodb", enrolment: part56PublicEnrolmentView(row) });
});

app.get("/api/part56/checklist", (req, res) => {
  res.json({ success: true, part: "Part 68 - AI Credits and Usage", checklist: part56Checklist });
});

app.get("/api/part56/export", async (req, res) => {
  const collection = await part56GetCollection();
  const rows = collection ? await collection.find({}).sort({ createdAt: -1 }).limit(500).toArray() : globalThis.NAXORA_PART56_ENROLMENTS;
  res.json({
    success: true,
    part: "Part 68 - AI Credits and Usage",
    exportedAt: new Date().toISOString(),
    count: rows.length,
    records: rows.map(part56PublicEnrolmentView)
  });
});
// ================= END PART 56 =================




// ================= PART 57: STUDENT AND PARENT PORTAL COMPLETION =================
// Roadmap scope: Attendance, Fees, Tests, Reports, Assignments, Notes, Notices, Live Classes.
// Safe rule: portal data is read-first. Write/actions are only acknowledgement-style placeholders so live app flows do not break.
const part57PortalModules = [
  {
    id: "attendance",
    title: "Attendance",
    studentView: "Apni daily/monthly attendance, present percentage aur absent days dekhna.",
    parentView: "Child attendance, frequent absence alerts aur class regularity dekhna.",
    permissions: ["student:own-attendance.read", "parent:child-attendance.read"]
  },
  {
    id: "fees",
    title: "Fees",
    studentView: "Own fee status, paid amount, pending amount aur due date dekhna.",
    parentView: "Child fee dues, paid history, reminders aur online payment direction dekhna.",
    permissions: ["student:own-fees.read", "parent:child-fees.read"]
  },
  {
    id: "tests",
    title: "Tests",
    studentView: "Upcoming tests, marks, rank aur weak topics dekhna.",
    parentView: "Child marks, test performance aur improvement area dekhna.",
    permissions: ["student:own-tests.read", "parent:child-tests.read"]
  },
  {
    id: "reports",
    title: "Reports",
    studentView: "Progress card, monthly report aur learning summary dekhna.",
    parentView: "Child progress report, attendance-fee-test combined summary dekhna.",
    permissions: ["student:own-reports.read", "parent:child-reports.read"]
  },
  {
    id: "assignments",
    title: "Assignments",
    studentView: "Assigned homework, due date, status aur teacher remarks dekhna.",
    parentView: "Child pending/completed assignments aur discipline status dekhna.",
    permissions: ["student:own-assignments.read", "parent:child-assignments.read"]
  },
  {
    id: "notes",
    title: "Notes",
    studentView: "Class notes, PDF/resources aur revision material access karna.",
    parentView: "Child ko kaunse notes/resources diye gaye hain, ye dekhna.",
    permissions: ["student:own-notes.read", "parent:child-notes.read"]
  },
  {
    id: "notices",
    title: "Notices",
    studentView: "Announcements, holidays, exam notices aur class updates dekhna.",
    parentView: "Institute notices, fee reminders, absence alerts aur parent updates dekhna.",
    permissions: ["student:own-notices.read", "parent:child-notices.read"]
  },
  {
    id: "liveClasses",
    title: "Live Classes",
    studentView: "Upcoming live classes, join link, recording link aur class notes dekhna.",
    parentView: "Child ke live class schedule, attendance aur recording access status dekhna.",
    permissions: ["student:own-live-classes.read", "parent:child-live-classes.read"]
  }
];

const part57Checklist = [
  "Student portal opens on /student-portal and /student-parent-portal.",
  "Parent portal opens on /parent-portal and uses same safe portal engine.",
  "Attendance, fees, tests, reports, assignments, notes, notices and live classes sections render.",
  "Portal API returns demo data when MongoDB collections are empty.",
  "Portal API attempts MongoDB read when production DB is connected.",
  "Student view does not show admin-only controls.",
  "Parent view is child-focused and does not show other students data.",
  "No payment charge, file upload or destructive action is added in Part 57.",
  "UI is mobile-friendly and uses NAXORA Part 54 branding.",
  "Future hard permission enforcement will connect with Part 55 role matrix route-by-route."
];

function part57CleanText(value, max = 120) {
  return String(value ?? "").trim().replace(/[<>]/g, "").slice(0, max);
}

function part57Money(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? Math.max(0, Math.round(num)) : 0;
}

function part57BuildDemoPortal(studentId = "NX-DEMO-STD-0001", role = "student") {
  const now = new Date();
  const nextClass = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dueDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  const student = {
    studentId,
    name: "Aarav Sharma",
    className: "Class 10 Foundation",
    batchName: "Morning Batch A",
    courseName: "Maths + Science Foundation",
    parentName: "Rajesh Sharma",
    parentPhone: "98XXXXXX10",
    portalRole: role
  };
  return {
    success: true,
    part: "Part 57 - Student and Parent Portal Completion",
    mode: "demo",
    role,
    student,
    summary: {
      attendancePercent: 92,
      pendingFees: 2500,
      paidFees: 9500,
      upcomingTests: 2,
      pendingAssignments: 1,
      unreadNotices: 3,
      upcomingLiveClasses: 2
    },
    attendance: [
      { date: now.toISOString().slice(0, 10), status: "present", batch: "Morning Batch A", note: "Maths class attended" },
      { date: new Date(now.getTime() - 86400000).toISOString().slice(0, 10), status: "present", batch: "Morning Batch A", note: "Science class attended" },
      { date: new Date(now.getTime() - 2 * 86400000).toISOString().slice(0, 10), status: "absent", batch: "Morning Batch A", note: "Parent informed" }
    ],
    fees: [
      { title: "July Monthly Fee", total: 12000, paid: 9500, pending: 2500, dueDate: dueDate.toISOString().slice(0, 10), status: "partial" },
      { title: "Admission Kit", total: 1500, paid: 1500, pending: 0, dueDate: now.toISOString().slice(0, 10), status: "paid" }
    ],
    tests: [
      { title: "Algebra Weekly Test", date: dueDate.toISOString().slice(0, 10), maxMarks: 50, obtainedMarks: 41, status: "completed", remark: "Good accuracy, speed improve karo" },
      { title: "Physics Motion Test", date: new Date(now.getTime() + 3 * 86400000).toISOString().slice(0, 10), maxMarks: 40, obtainedMarks: null, status: "upcoming", remark: "Revision required" }
    ],
    reports: [
      { title: "Monthly Progress Summary", period: "Current Month", result: "Stable", highlights: ["Attendance strong", "Maths score improving", "One assignment pending"] }
    ],
    assignments: [
      { title: "Algebra Worksheet 4", subject: "Maths", dueDate: dueDate.toISOString().slice(0, 10), status: "pending", teacher: "Mr. Verma" },
      { title: "Physics Numericals", subject: "Science", dueDate: now.toISOString().slice(0, 10), status: "submitted", teacher: "Ms. Mehta" }
    ],
    notes: [
      { title: "Algebra Formula Sheet", subject: "Maths", type: "PDF/Notes", access: "available" },
      { title: "Motion Chapter Revision", subject: "Science", type: "Class Notes", access: "available" }
    ],
    notices: [
      { title: "Parent Meeting Reminder", audience: role === "parent" ? "Parent" : "Student", date: now.toISOString().slice(0, 10), priority: "high" },
      { title: "Sunday Test Schedule", audience: "All", date: now.toISOString().slice(0, 10), priority: "medium" }
    ],
    liveClasses: [
      { title: "Maths Live Doubt Class", dateTime: nextClass.toISOString(), teacher: "Mr. Verma", joinStatus: "available-before-class", recordingStatus: "after-class" },
      { title: "Science Revision Live", dateTime: new Date(now.getTime() + 2 * 86400000).toISOString(), teacher: "Ms. Mehta", joinStatus: "scheduled", recordingStatus: "after-class" }
    ],
    safety: "Part 57 read-first portal hai. Admin-only edit/delete actions is part me expose nahi kiye gaye."
  };
}

async function part57GetCollection(name) {
  if (globalThis.NAXORA_DB_MODE === "mongodb" && mongoose.connection?.readyState === 1) {
    return mongoose.connection.collection(name);
  }
  return null;
}

async function part57FindRows(collectionName, query, limit = 20) {
  try {
    const collection = await part57GetCollection(collectionName);
    if (!collection) return [];
    return await collection.find(query || {}).sort({ createdAt: -1 }).limit(limit).toArray();
  } catch (error) {
    return [];
  }
}

function part57PickStudentFromEnrolment(row = {}, fallbackId = "NX-DEMO-STD-0001", role = "student") {
  return {
    studentId: row.studentId || fallbackId,
    name: row.studentName || row.name || "Student",
    className: row.studentClass || row.className || "Class / Level not set",
    batchName: row.batchName || row.batchId || "Batch not assigned",
    courseName: row.courseName || row.courseId || "Course not assigned",
    parentName: row.parentName || "Parent/Guardian",
    parentPhone: row.parentPhone ? String(row.parentPhone).replace(/\d(?=\d{2})/g, "X") : "Not set",
    portalRole: role
  };
}

async function part57BuildMongoPortal(studentId = "", role = "student") {
  const cleanId = part57CleanText(studentId, 80);
  if (!cleanId) return part57BuildDemoPortal("NX-DEMO-STD-0001", role);

  const enrolmentRows = await part57FindRows("smartenrolments", { studentId: cleanId }, 1);
  const studentRows = await part57FindRows("students", { $or: [{ studentId: cleanId }, { rollNo: cleanId }, { admissionNo: cleanId }] }, 1);
  const baseRow = enrolmentRows[0] || studentRows[0];
  if (!baseRow) return part57BuildDemoPortal(cleanId, role);

  const student = part57PickStudentFromEnrolment(baseRow, cleanId, role);
  const lookupOr = [
    { studentId: student.studentId },
    { studentName: student.name },
    { name: student.name },
    { student: student.name }
  ];
  const query = { $or: lookupOr };

  const attendanceRows = await part57FindRows("attendances", query, 15);
  const feeRows = await part57FindRows("fees", query, 15);
  const testRows = await part57FindRows("tests", query, 15);
  const reportRows = await part57FindRows("reports", query, 10);
  const assignmentRows = await part57FindRows("assignments", query, 15);
  const notesRows = await part57FindRows("libraries", {}, 10);
  const noticeRows = await part57FindRows("announcements", {}, 10);
  const liveRows = await part57FindRows("liveclasses", {}, 10);

  const demo = part57BuildDemoPortal(student.studentId, role);
  const attendance = attendanceRows.length ? attendanceRows.map((row) => ({
    date: row.date || row.attendanceDate || row.createdAt,
    status: row.status || row.attendanceStatus || "recorded",
    batch: row.batchName || row.batch || student.batchName,
    note: row.note || row.remarks || "Attendance record"
  })) : demo.attendance;

  const fees = feeRows.length ? feeRows.map((row) => {
    const total = part57Money(row.total || row.amount || row.totalAmount || row.feeAmount);
    const paid = part57Money(row.paid || row.paidAmount || row.amountPaid);
    return {
      title: row.title || row.feeTitle || row.month || "Fee Record",
      total,
      paid,
      pending: part57Money(row.pending || row.pendingAmount || Math.max(total - paid, 0)),
      dueDate: row.dueDate || row.date || row.createdAt,
      status: row.status || (total > paid ? "pending" : "paid")
    };
  }) : demo.fees;

  const tests = testRows.length ? testRows.map((row) => ({
    title: row.title || row.testName || row.name || "Test",
    date: row.date || row.testDate || row.createdAt,
    maxMarks: row.maxMarks || row.totalMarks || null,
    obtainedMarks: row.obtainedMarks || row.marks || null,
    status: row.status || "recorded",
    remark: row.remark || row.remarks || ""
  })) : demo.tests;

  const reports = reportRows.length ? reportRows.map((row) => ({
    title: row.title || row.reportTitle || "Report",
    period: row.period || row.month || "Latest",
    result: row.result || row.status || "available",
    highlights: Array.isArray(row.highlights) ? row.highlights : [row.summary || row.note || "Report available"]
  })) : demo.reports;

  const assignments = assignmentRows.length ? assignmentRows.map((row) => ({
    title: row.title || row.assignmentTitle || "Assignment",
    subject: row.subject || "General",
    dueDate: row.dueDate || row.createdAt,
    status: row.status || "assigned",
    teacher: row.teacherName || row.teacher || "Teacher"
  })) : demo.assignments;

  const notes = notesRows.length ? notesRows.map((row) => ({
    title: row.title || row.resourceTitle || row.name || "Study Material",
    subject: row.subject || row.category || "General",
    type: row.type || row.fileType || "Notes",
    access: "available"
  })) : demo.notes;

  const notices = noticeRows.length ? noticeRows.map((row) => ({
    title: row.title || row.subject || "Notice",
    audience: row.audience || "All",
    date: row.date || row.createdAt,
    priority: row.priority || "normal"
  })) : demo.notices;

  const liveClasses = liveRows.length ? liveRows.map((row) => ({
    title: row.title || row.classTitle || "Live Class",
    dateTime: row.dateTime || row.startTime || row.scheduledAt || row.createdAt,
    teacher: row.teacherName || row.teacher || "Teacher",
    joinStatus: row.meetingLink ? "available" : "scheduled",
    recordingStatus: row.recordingLink ? "available" : "after-class"
  })) : demo.liveClasses;

  const totalAttendance = attendance.length || 1;
  const presentCount = attendance.filter((item) => String(item.status).toLowerCase().includes("present")).length;
  const pendingFees = fees.reduce((sum, item) => sum + part57Money(item.pending), 0);
  const paidFees = fees.reduce((sum, item) => sum + part57Money(item.paid), 0);

  return {
    success: true,
    part: "Part 57 - Student and Parent Portal Completion",
    mode: "mongodb",
    role,
    student,
    summary: {
      attendancePercent: Math.round((presentCount / totalAttendance) * 100),
      pendingFees,
      paidFees,
      upcomingTests: tests.filter((item) => String(item.status).toLowerCase().includes("upcoming")).length,
      pendingAssignments: assignments.filter((item) => String(item.status).toLowerCase().includes("pending")).length,
      unreadNotices: notices.length,
      upcomingLiveClasses: liveClasses.length
    },
    attendance,
    fees,
    tests,
    reports,
    assignments,
    notes,
    notices,
    liveClasses,
    safety: "Part 57 read-first portal hai. Admin-only edit/delete actions is part me expose nahi kiye gaye."
  };
}

app.get("/student-parent-portal", (req, res) => sendFileSafe(res, "student-parent-portal.html"));
app.get("/student-portal", (req, res) => sendFileSafe(res, "student-parent-portal.html"));
app.get("/parent-portal", (req, res) => sendFileSafe(res, "student-parent-portal.html"));
app.get("/portal", (req, res) => sendFileSafe(res, "student-parent-portal.html"));

app.get("/api/part57/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 57 - Student and Parent Portal Completion",
    status: "active",
    currentVersionPlan: "Part 53–78 = NAXORA OS 1.0 completion. Part 79–110 = NAXORA OS 2.0 development.",
    goal: "Student aur parent ko attendance, fees, tests, reports, assignments, notes, notices aur live classes ka direct read-first access dena.",
    dbMode: globalThis.NAXORA_DB_MODE || "starting",
    frontend: ["/student-parent-portal", "/student-portal", "/parent-portal", "/portal"],
    routes: [
      "GET /api/part57/status",
      "GET /api/part57/portal-config",
      "GET /api/part57/portal-data?studentId=NX-DEMO-STD-0001&role=student",
      "GET /api/part57/student/:studentId",
      "GET /api/part57/parent/:studentId",
      "GET /api/part57/timeline/:studentId",
      "GET /api/part57/checklist",
      "GET /api/part57/demo"
    ],
    safeMode: "Read-first portal. No destructive actions and no secrets/env changes."
  });
});

app.get("/api/part57/portal-config", (req, res) => {
  res.json({ success: true, part: "Part 57 - Student and Parent Portal Completion", modules: part57PortalModules, roles: ["student", "parent"], checklist: part57Checklist });
});

app.get("/api/part57/portal-data", async (req, res) => {
  const studentId = part57CleanText(req.query.studentId || "NX-DEMO-STD-0001", 80);
  const requestedRole = part57CleanText(req.query.role || "student", 20).toLowerCase();
  const role = requestedRole === "parent" ? "parent" : "student";
  const data = await part57BuildMongoPortal(studentId, role);
  res.json(data);
});

app.get("/api/part57/student/:studentId", async (req, res) => {
  const data = await part57BuildMongoPortal(part57CleanText(req.params.studentId, 80), "student");
  res.json(data);
});

app.get("/api/part57/parent/:studentId", async (req, res) => {
  const data = await part57BuildMongoPortal(part57CleanText(req.params.studentId, 80), "parent");
  res.json(data);
});

app.get("/api/part57/timeline/:studentId", async (req, res) => {
  const data = await part57BuildMongoPortal(part57CleanText(req.params.studentId, 80), part57CleanText(req.query.role || "student", 20));
  const timeline = [
    ...data.attendance.map((item) => ({ type: "attendance", title: `Attendance: ${item.status}`, date: item.date, detail: item.note })),
    ...data.fees.map((item) => ({ type: "fees", title: item.title, date: item.dueDate, detail: `Pending ₹${item.pending}` })),
    ...data.tests.map((item) => ({ type: "test", title: item.title, date: item.date, detail: item.status })),
    ...data.assignments.map((item) => ({ type: "assignment", title: item.title, date: item.dueDate, detail: item.status })),
    ...data.notices.map((item) => ({ type: "notice", title: item.title, date: item.date, detail: item.priority })),
    ...data.liveClasses.map((item) => ({ type: "liveClass", title: item.title, date: item.dateTime, detail: item.joinStatus }))
  ].filter((item) => item.date).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 30);
  res.json({ success: true, part: "Part 57 - Student and Parent Portal Completion", student: data.student, role: data.role, count: timeline.length, timeline });
});

app.get("/api/part57/checklist", (req, res) => {
  res.json({ success: true, part: "Part 57 - Student and Parent Portal Completion", checklist: part57Checklist });
});

app.get("/api/part57/demo", (req, res) => {
  res.json(part57BuildDemoPortal("NX-DEMO-STD-0001", part57CleanText(req.query.role || "student", 20) === "parent" ? "parent" : "student"));
});
// ================= END PART 57 =================



// ================= PART 58: ENQUIRY AND FOLLOW-UP CRM =================
// Roadmap scope: New lead, call notes, follow-up date, lead status, reminder and admission conversion.
// Safe rule: Part 58 stores enquiry/follow-up records and conversion intent. It does not send real SMS/WhatsApp automatically.
const part58LeadStatuses = [
  { id: "new", label: "New Lead", tone: "blue", meaning: "Lead abhi fresh hai; first call pending." },
  { id: "contacted", label: "Contacted", tone: "cyan", meaning: "First contact ho chuka hai." },
  { id: "interested", label: "Interested", tone: "green", meaning: "Student/parent interested hai." },
  { id: "demo_scheduled", label: "Demo Scheduled", tone: "gold", meaning: "Demo/trial class scheduled hai." },
  { id: "followup_pending", label: "Follow-up Pending", tone: "orange", meaning: "Next follow-up date set hai." },
  { id: "converted", label: "Converted", tone: "success", meaning: "Lead admission/enrolment me convert ho gaya." },
  { id: "not_interested", label: "Not Interested", tone: "muted", meaning: "Lead currently interested nahi hai." },
  { id: "lost", label: "Lost", tone: "red", meaning: "Lead close/lost ho gaya." }
];

const part58LeadSources = [
  "Walk-in", "Phone Call", "WhatsApp", "Website", "Referral", "Social Media", "Discovery", "Demo Class", "Other"
];

const part58Courses = [
  "Class 9 Foundation", "Class 10 Board", "Class 11 Science", "Class 12 Science", "JEE Foundation", "NEET Foundation", "English Speaking", "Computer Course", "Other"
];

const part58FollowUpOutcomes = [
  "Not picked", "Asked for details", "Fees discussed", "Demo requested", "Parent will decide", "Visit scheduled", "Converted", "Not interested"
];

const part58Checklist = [
  "CRM page opens on /enquiry-followup-crm, /enquiry-crm and /followup-crm.",
  "New lead form creates a lead with name, phone, course interest and source.",
  "Call notes can be added without deleting previous history.",
  "Follow-up date and reminder settings can be updated.",
  "Lead status can move from new/contacted/interested/demo/followup/converted/lost.",
  "Admission conversion stores studentId, batch and fee summary when lead converts.",
  "MongoDB connected mode saves leads in part58enquiryfollowups collection.",
  "Mock mode fallback works if MongoDB is temporarily unavailable.",
  "No real WhatsApp/SMS/email is sent automatically in Part 58; message sending comes in Part 65.",
  "Part 71 AI Admission Copilot now uses this CRM data foundation for reply drafts, follow-up suggestions and lead priority."
];

if (!globalThis.NAXORA_PART58_LEADS) {
  globalThis.NAXORA_PART58_LEADS = [
    {
      id: "mock-lead-1",
      leadId: "NX-LEAD-DEMO-001",
      studentName: "Aarav Sharma",
      parentName: "Mr. Sharma",
      phone: "9876543210",
      alternatePhone: "",
      email: "",
      classLevel: "Class 10",
      courseInterest: "Class 10 Board",
      source: "Website",
      city: "Delhi",
      priority: "hot",
      status: "followup_pending",
      assignedTo: "Counsellor",
      followUpDate: new Date(Date.now() + 86400000).toISOString(),
      reminder: { enabled: true, channel: "call", note: "Parent ko evening me call karna." },
      callNotes: [
        { id: "note-1", type: "call", outcome: "Asked for details", note: "Fees aur batch timing puchha. Demo class me interest hai.", createdAt: new Date().toISOString(), createdBy: "System Demo" }
      ],
      conversion: { converted: false },
      part: "Part 58 - Enquiry and Follow-Up CRM",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
}

function part58CleanText(value, max = 120) {
  return String(value ?? "").trim().replace(/[<>]/g, "").slice(0, max);
}

function part58CleanPhone(value) {
  return String(value ?? "").replace(/[^0-9+]/g, "").slice(0, 16);
}

function part58AllowedStatus(value) {
  const clean = part58CleanText(value || "new", 40);
  return part58LeadStatuses.some((item) => item.id === clean) ? clean : "new";
}

function part58GenerateLeadId(payload = {}) {
  const date = new Date();
  const y = String(date.getFullYear()).slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const phoneTail = part58CleanPhone(payload.phone).slice(-4) || "0000";
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `NX-LEAD-${y}${m}${d}-${phoneTail}-${rand}`;
}

function part58ValidateLead(payload = {}) {
  const errors = [];
  if (!part58CleanText(payload.studentName, 80)) errors.push("Student name required hai.");
  if (!part58CleanPhone(payload.phone)) errors.push("Phone number required hai.");
  if (!part58CleanText(payload.courseInterest, 80)) errors.push("Course interest required hai.");
  return errors;
}

function part58BuildLead(payload = {}, existing = {}) {
  const now = new Date().toISOString();
  const followUpDate = payload.followUpDate ? new Date(payload.followUpDate).toISOString() : existing.followUpDate || null;
  return {
    ...existing,
    leadId: existing.leadId || payload.leadId || part58GenerateLeadId(payload),
    studentName: part58CleanText(payload.studentName, 100),
    parentName: part58CleanText(payload.parentName, 100),
    phone: part58CleanPhone(payload.phone),
    alternatePhone: part58CleanPhone(payload.alternatePhone),
    email: part58CleanText(payload.email, 120),
    classLevel: part58CleanText(payload.classLevel, 60),
    courseInterest: part58CleanText(payload.courseInterest, 100),
    source: part58CleanText(payload.source || "Other", 60),
    city: part58CleanText(payload.city, 80),
    priority: ["hot", "warm", "cold"].includes(part58CleanText(payload.priority, 20)) ? part58CleanText(payload.priority, 20) : "warm",
    status: part58AllowedStatus(payload.status || existing.status || "new"),
    assignedTo: part58CleanText(payload.assignedTo || existing.assignedTo || "Counsellor", 80),
    followUpDate,
    reminder: {
      enabled: payload.reminderEnabled === true || payload.reminder?.enabled === true || Boolean(followUpDate),
      channel: part58CleanText(payload.reminderChannel || payload.reminder?.channel || "call", 40),
      note: part58CleanText(payload.reminderNote || payload.reminder?.note, 180)
    },
    callNotes: Array.isArray(existing.callNotes) ? existing.callNotes : [],
    conversion: existing.conversion || { converted: false },
    tags: Array.isArray(payload.tags) ? payload.tags.map((tag) => part58CleanText(tag, 40)).filter(Boolean).slice(0, 8) : existing.tags || [],
    lastContactedAt: existing.lastContactedAt || null,
    part: "Part 58 - Enquiry and Follow-Up CRM",
    createdAt: existing.createdAt || now,
    updatedAt: now
  };
}

function part58PublicLeadView(row = {}) {
  return {
    id: row._id || row.id || row.leadId,
    leadId: row.leadId,
    studentName: row.studentName,
    parentName: row.parentName,
    phone: row.phone,
    alternatePhone: row.alternatePhone,
    email: row.email,
    classLevel: row.classLevel,
    courseInterest: row.courseInterest,
    source: row.source,
    city: row.city,
    priority: row.priority,
    status: row.status,
    assignedTo: row.assignedTo,
    followUpDate: row.followUpDate,
    reminder: row.reminder,
    callNotes: row.callNotes || [],
    conversion: row.conversion || { converted: false },
    tags: row.tags || [],
    lastContactedAt: row.lastContactedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

async function part58GetCollection() {
  if (globalThis.NAXORA_DB_MODE === "mongodb" && mongoose.connection?.readyState === 1) {
    return mongoose.connection.collection("part58enquiryfollowups");
  }
  return null;
}

async function part58FindLeadById(id) {
  const cleanId = part58CleanText(id, 100);
  const collection = await part58GetCollection();
  if (!collection) {
    return { collection: null, row: globalThis.NAXORA_PART58_LEADS.find((item) => item.id === cleanId || item.leadId === cleanId) };
  }
  const row = await collection.findOne({ leadId: cleanId });
  return { collection, row };
}

function part58BuildAnalytics(rows = []) {
  const total = rows.length;
  const byStatus = Object.fromEntries(part58LeadStatuses.map((status) => [status.id, 0]));
  const byPriority = { hot: 0, warm: 0, cold: 0 };
  let converted = 0;
  let overdue = 0;
  const now = Date.now();
  rows.forEach((row) => {
    if (byStatus[row.status] !== undefined) byStatus[row.status] += 1;
    if (byPriority[row.priority] !== undefined) byPriority[row.priority] += 1;
    if (row.status === "converted" || row.conversion?.converted) converted += 1;
    if (row.followUpDate && !["converted", "lost", "not_interested"].includes(row.status) && new Date(row.followUpDate).getTime() < now) overdue += 1;
  });
  return {
    total,
    converted,
    open: total - converted,
    overdue,
    conversionRate: total ? Math.round((converted / total) * 100) : 0,
    byStatus,
    byPriority
  };
}

app.get("/enquiry-followup-crm", (req, res) => sendFileSafe(res, "enquiry-followup-crm.html"));
app.get("/enquiry-crm", (req, res) => sendFileSafe(res, "enquiry-followup-crm.html"));
app.get("/followup-crm", (req, res) => sendFileSafe(res, "enquiry-followup-crm.html"));
app.get("/admission-crm", (req, res) => sendFileSafe(res, "enquiry-followup-crm.html"));

app.get("/api/part58/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 58 - Enquiry and Follow-Up CRM",
    status: "active",
    currentVersionPlan: "Part 53–78 = NAXORA OS 1.0 completion. Part 79–110 = NAXORA OS 2.0 development.",
    goal: "New lead, call notes, follow-up date, lead status, reminder and admission conversion CRM.",
    dbMode: globalThis.NAXORA_DB_MODE || "starting",
    frontend: ["/enquiry-followup-crm", "/enquiry-crm", "/followup-crm", "/admission-crm"],
    routes: [
      "GET /api/part58/status",
      "GET /api/part58/config",
      "GET /api/part58/leads",
      "POST /api/part58/leads",
      "GET /api/part58/leads/:leadId",
      "PATCH /api/part58/leads/:leadId/status",
      "POST /api/part58/leads/:leadId/call-notes",
      "PATCH /api/part58/leads/:leadId/follow-up",
      "POST /api/part58/leads/:leadId/convert",
      "GET /api/part58/reminders",
      "GET /api/part58/analytics",
      "GET /api/part58/checklist",
      "GET /api/part58/export"
    ],
    safety: "Part 58 real WhatsApp/SMS/email auto-send nahi karta. Communication provider integration Part 65 me hoga."
  });
});

app.get("/api/part58/config", (req, res) => {
  res.json({
    success: true,
    statuses: part58LeadStatuses,
    sources: part58LeadSources,
    courses: part58Courses,
    followUpOutcomes: part58FollowUpOutcomes,
    priorities: ["hot", "warm", "cold"],
    reminderChannels: ["call", "whatsapp_manual", "sms_manual", "email_manual", "visit"]
  });
});

app.get("/api/part58/leads", async (req, res) => {
  const collection = await part58GetCollection();
  const status = part58CleanText(req.query.status, 40);
  const priority = part58CleanText(req.query.priority, 20);
  const search = part58CleanText(req.query.search, 80).toLowerCase();
  const query = {};
  if (status && part58LeadStatuses.some((item) => item.id === status)) query.status = status;
  if (priority && ["hot", "warm", "cold"].includes(priority)) query.priority = priority;

  if (!collection) {
    let rows = [...globalThis.NAXORA_PART58_LEADS];
    if (query.status) rows = rows.filter((row) => row.status === query.status);
    if (query.priority) rows = rows.filter((row) => row.priority === query.priority);
    if (search) rows = rows.filter((row) => [row.studentName, row.parentName, row.phone, row.courseInterest, row.leadId].join(" ").toLowerCase().includes(search));
    return res.json({ success: true, mode: "mock", count: rows.length, leads: rows.map(part58PublicLeadView), analytics: part58BuildAnalytics(rows) });
  }

  if (search) {
    query.$or = [
      { studentName: { $regex: search, $options: "i" } },
      { parentName: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { courseInterest: { $regex: search, $options: "i" } },
      { leadId: { $regex: search, $options: "i" } }
    ];
  }
  const rows = await collection.find(query).sort({ updatedAt: -1 }).limit(200).toArray();
  res.json({ success: true, mode: "mongodb", count: rows.length, leads: rows.map(part58PublicLeadView), analytics: part58BuildAnalytics(rows) });
});

app.post("/api/part58/leads", async (req, res) => {
  const errors = part58ValidateLead(req.body || {});
  if (errors.length) return res.status(400).json({ success: false, message: "Lead form incomplete hai", errors });
  const lead = part58BuildLead(req.body || {});
  const firstNote = part58CleanText(req.body?.firstNote, 400);
  if (firstNote) {
    lead.callNotes.push({ id: `note-${Date.now()}`, type: "first-note", outcome: part58CleanText(req.body?.firstOutcome || "New enquiry", 80), note: firstNote, createdAt: new Date().toISOString(), createdBy: part58CleanText(req.body?.createdBy || "CRM", 80) });
    lead.lastContactedAt = new Date().toISOString();
  }
  const collection = await part58GetCollection();
  if (!collection) {
    const mockRow = { ...lead, id: `mock-${Date.now()}` };
    globalThis.NAXORA_PART58_LEADS.unshift(mockRow);
    return res.status(201).json({ success: true, mode: "mock", message: "Lead mock mode me save hua.", lead: part58PublicLeadView(mockRow) });
  }
  const duplicate = await collection.findOne({ phone: lead.phone, courseInterest: lead.courseInterest, status: { $nin: ["converted", "lost", "not_interested"] } });
  if (duplicate) return res.status(409).json({ success: false, message: "Same phone/course ke saath active lead already exists.", existing: part58PublicLeadView(duplicate) });
  const result = await collection.insertOne(lead);
  const saved = await collection.findOne({ _id: result.insertedId });
  res.status(201).json({ success: true, mode: "mongodb", message: "Lead CRM me save ho gaya.", lead: part58PublicLeadView(saved) });
});

app.get("/api/part58/leads/:leadId", async (req, res) => {
  const { row } = await part58FindLeadById(req.params.leadId);
  if (!row) return res.status(404).json({ success: false, message: "Lead not found" });
  res.json({ success: true, lead: part58PublicLeadView(row) });
});

app.patch("/api/part58/leads/:leadId/status", async (req, res) => {
  const leadId = part58CleanText(req.params.leadId, 100);
  const status = part58AllowedStatus(req.body?.status);
  const statusNote = part58CleanText(req.body?.statusNote, 240);
  const update = { status, statusNote, updatedAt: new Date().toISOString() };
  const { collection, row } = await part58FindLeadById(leadId);
  if (!row) return res.status(404).json({ success: false, message: "Lead not found" });
  if (!collection) {
    const index = globalThis.NAXORA_PART58_LEADS.findIndex((item) => item.leadId === leadId || item.id === leadId);
    globalThis.NAXORA_PART58_LEADS[index] = { ...globalThis.NAXORA_PART58_LEADS[index], ...update };
    return res.json({ success: true, mode: "mock", lead: part58PublicLeadView(globalThis.NAXORA_PART58_LEADS[index]) });
  }
  await collection.updateOne({ leadId }, { $set: update });
  const saved = await collection.findOne({ leadId });
  res.json({ success: true, mode: "mongodb", lead: part58PublicLeadView(saved) });
});

app.post("/api/part58/leads/:leadId/call-notes", async (req, res) => {
  const leadId = part58CleanText(req.params.leadId, 100);
  const noteText = part58CleanText(req.body?.note, 600);
  if (!noteText) return res.status(400).json({ success: false, message: "Call note required hai" });
  const note = {
    id: `note-${Date.now()}`,
    type: part58CleanText(req.body?.type || "call", 40),
    outcome: part58CleanText(req.body?.outcome || "Call note", 80),
    note: noteText,
    createdAt: new Date().toISOString(),
    createdBy: part58CleanText(req.body?.createdBy || "Counsellor", 80)
  };
  const { collection, row } = await part58FindLeadById(leadId);
  if (!row) return res.status(404).json({ success: false, message: "Lead not found" });
  const update = { lastContactedAt: note.createdAt, updatedAt: note.createdAt };
  if (!collection) {
    const index = globalThis.NAXORA_PART58_LEADS.findIndex((item) => item.leadId === leadId || item.id === leadId);
    globalThis.NAXORA_PART58_LEADS[index].callNotes = [...(globalThis.NAXORA_PART58_LEADS[index].callNotes || []), note];
    Object.assign(globalThis.NAXORA_PART58_LEADS[index], update);
    return res.status(201).json({ success: true, mode: "mock", note, lead: part58PublicLeadView(globalThis.NAXORA_PART58_LEADS[index]) });
  }
  await collection.updateOne({ leadId }, { $push: { callNotes: note }, $set: update });
  const saved = await collection.findOne({ leadId });
  res.status(201).json({ success: true, mode: "mongodb", note, lead: part58PublicLeadView(saved) });
});

app.patch("/api/part58/leads/:leadId/follow-up", async (req, res) => {
  const leadId = part58CleanText(req.params.leadId, 100);
  const followUpDate = req.body?.followUpDate ? new Date(req.body.followUpDate).toISOString() : null;
  if (!followUpDate) return res.status(400).json({ success: false, message: "Valid follow-up date required hai" });
  const update = {
    followUpDate,
    status: part58AllowedStatus(req.body?.status || "followup_pending"),
    reminder: {
      enabled: req.body?.reminderEnabled !== false,
      channel: part58CleanText(req.body?.reminderChannel || "call", 40),
      note: part58CleanText(req.body?.reminderNote || "Follow-up reminder", 180)
    },
    updatedAt: new Date().toISOString()
  };
  const { collection, row } = await part58FindLeadById(leadId);
  if (!row) return res.status(404).json({ success: false, message: "Lead not found" });
  if (!collection) {
    const index = globalThis.NAXORA_PART58_LEADS.findIndex((item) => item.leadId === leadId || item.id === leadId);
    globalThis.NAXORA_PART58_LEADS[index] = { ...globalThis.NAXORA_PART58_LEADS[index], ...update };
    return res.json({ success: true, mode: "mock", lead: part58PublicLeadView(globalThis.NAXORA_PART58_LEADS[index]) });
  }
  await collection.updateOne({ leadId }, { $set: update });
  const saved = await collection.findOne({ leadId });
  res.json({ success: true, mode: "mongodb", lead: part58PublicLeadView(saved) });
});

app.post("/api/part58/leads/:leadId/convert", async (req, res) => {
  const leadId = part58CleanText(req.params.leadId, 100);
  const now = new Date().toISOString();
  const conversion = {
    converted: true,
    convertedAt: now,
    studentId: part58CleanText(req.body?.studentId || `NX-STU-${Date.now()}`, 80),
    batchName: part58CleanText(req.body?.batchName, 100),
    admissionAmount: Number(req.body?.admissionAmount || 0),
    expectedFee: Number(req.body?.expectedFee || 0),
    note: part58CleanText(req.body?.note || "Lead converted to admission", 240)
  };
  const update = { status: "converted", conversion, updatedAt: now };
  const { collection, row } = await part58FindLeadById(leadId);
  if (!row) return res.status(404).json({ success: false, message: "Lead not found" });
  if (!collection) {
    const index = globalThis.NAXORA_PART58_LEADS.findIndex((item) => item.leadId === leadId || item.id === leadId);
    globalThis.NAXORA_PART58_LEADS[index] = { ...globalThis.NAXORA_PART58_LEADS[index], ...update };
    return res.json({ success: true, mode: "mock", message: "Lead converted in mock mode.", lead: part58PublicLeadView(globalThis.NAXORA_PART58_LEADS[index]) });
  }
  await collection.updateOne({ leadId }, { $set: update });
  const saved = await collection.findOne({ leadId });
  res.json({ success: true, mode: "mongodb", message: "Lead admission conversion saved.", lead: part58PublicLeadView(saved) });
});

app.get("/api/part58/reminders", async (req, res) => {
  const collection = await part58GetCollection();
  const now = new Date();
  const next7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const closed = ["converted", "lost", "not_interested"];
  let rows = [];
  if (!collection) {
    rows = globalThis.NAXORA_PART58_LEADS.filter((row) => row.followUpDate && !closed.includes(row.status));
  } else {
    rows = await collection.find({ followUpDate: { $ne: null }, status: { $nin: closed } }).sort({ followUpDate: 1 }).limit(100).toArray();
  }
  const reminders = rows.map(part58PublicLeadView).map((lead) => ({
    ...lead,
    overdue: new Date(lead.followUpDate) < now,
    upcoming: new Date(lead.followUpDate) >= now && new Date(lead.followUpDate) <= next7
  }));
  res.json({ success: true, count: reminders.length, reminders });
});

app.get("/api/part58/analytics", async (req, res) => {
  const collection = await part58GetCollection();
  const rows = collection ? await collection.find({}).sort({ updatedAt: -1 }).limit(1000).toArray() : globalThis.NAXORA_PART58_LEADS;
  res.json({ success: true, part: "Part 58 - Enquiry and Follow-Up CRM", analytics: part58BuildAnalytics(rows), generatedAt: new Date().toISOString() });
});

app.get("/api/part58/checklist", (req, res) => {
  res.json({ success: true, part: "Part 58 - Enquiry and Follow-Up CRM", checklist: part58Checklist });
});

app.get("/api/part58/export", async (req, res) => {
  const collection = await part58GetCollection();
  const rows = collection ? await collection.find({}).sort({ updatedAt: -1 }).limit(1000).toArray() : globalThis.NAXORA_PART58_LEADS;
  res.json({ success: true, part: "Part 58 - Enquiry and Follow-Up CRM", exportedAt: new Date().toISOString(), count: rows.length, records: rows.map(part58PublicLeadView) });
});

app.get("/api/part58/demo", (req, res) => {
  const rows = globalThis.NAXORA_PART58_LEADS.map(part58PublicLeadView);
  res.json({ success: true, part: "Part 58 - Enquiry and Follow-Up CRM", count: rows.length, leads: rows, analytics: part58BuildAnalytics(rows) });
});
// ================= END PART 58 =================



// ================= PART 59: PUBLIC INSTITUTE PROFILE =================
// Roadmap scope: Institute logo/banner, courses, fees range, teachers, results, facilities, timings, photos/videos and address.
// Safe rule: Part 59 stores public profile details and publish status. Real callback/enquiry action comes in Part 60.
const part59ProfileSections = [
  { id: "identity", label: "Institute Identity", fields: ["name", "tagline", "logoUrl", "bannerUrl"] },
  { id: "courses", label: "Courses", fields: ["courseName", "classLevel", "duration", "mode", "fees"] },
  { id: "fees", label: "Fees Range", fields: ["minimumFee", "maximumFee", "currency", "note"] },
  { id: "teachers", label: "Teachers", fields: ["name", "subject", "experience", "bio"] },
  { id: "results", label: "Results", fields: ["exam", "year", "achievement", "studentName"] },
  { id: "facilities", label: "Facilities", fields: ["classrooms", "library", "liveClass", "doubtSupport"] },
  { id: "timings", label: "Timings", fields: ["weekday", "weekend", "office"] },
  { id: "media", label: "Photos/Videos", fields: ["photoUrls", "videoUrls"] },
  { id: "address", label: "Address", fields: ["line1", "city", "state", "pincode", "mapUrl"] }
];

const part59Checklist = [
  "Public profile page opens on /public-institute-profile.",
  "Institute name, tagline, logo and banner URLs can be saved.",
  "Courses with class, duration, mode and fees range are visible.",
  "Teachers and result highlights are visible on the public profile.",
  "Facilities, timings, media links and address are visible.",
  "Profile can stay draft until owner is ready to publish.",
  "Published profiles are searchable through /api/part59/search.",
  "MongoDB connected mode stores profiles in part59publicprofiles collection.",
  "Mock mode fallback works if MongoDB is temporarily unavailable.",
  "Request callback/enquiry button is shown as Part 60 handoff, not final lead submit yet."
];

if (!globalThis.NAXORA_PART59_PROFILES) {
  globalThis.NAXORA_PART59_PROFILES = [
    {
      id: "mock-profile-1",
      profileId: "NX-PROFILE-DEMO-001",
      slug: "naxora-demo-institute",
      status: "published",
      name: "NAXORA Demo Institute",
      tagline: "Smart coaching management, AI learning and parent transparency in one system.",
      description: "A demo public profile showing how a coaching institute can present courses, teachers, results, facilities, timings and address using NAXORA Institute OS.",
      logoUrl: "/assets/naxora-logo.svg",
      bannerUrl: "",
      contact: { phone: "9876543210", email: "demo@naxora.in", website: "" },
      courses: [
        { id: "course-1", name: "Class 10 Board Excellence", classLevel: "Class 10", duration: "10 months", mode: "Offline + Online", feeMin: 12000, feeMax: 25000, highlight: "Board exam focused batch with test reports." },
        { id: "course-2", name: "JEE Foundation", classLevel: "Class 11", duration: "12 months", mode: "Hybrid", feeMin: 30000, feeMax: 60000, highlight: "Foundation concepts, mock tests and doubt support." }
      ],
      feeRange: { currency: "INR", minimum: 12000, maximum: 60000, note: "Final fees depend on course, batch mode and duration." },
      teachers: [
        { id: "teacher-1", name: "Anita Sharma", subject: "Mathematics", experience: "8 years", bio: "Board and foundation math specialist." },
        { id: "teacher-2", name: "Rohit Verma", subject: "Science", experience: "6 years", bio: "Concept-based teaching with weekly assessments." }
      ],
      results: [
        { id: "result-1", exam: "Class 10 Board", year: "2026", achievement: "Demo: 25 students above 90%", studentName: "Demo Batch" }
      ],
      facilities: ["Smart classrooms", "Online live classes", "Weekly tests", "Parent reports", "Doubt support", "Study material"],
      timings: { weekdays: "Mon–Sat, 8:00 AM – 8:00 PM", weekend: "Sun, 10:00 AM – 2:00 PM", office: "Mon–Sat, 9:00 AM – 7:00 PM" },
      media: { photoUrls: [], videoUrls: [] },
      address: { line1: "Demo Market Road", area: "Education Hub", city: "Delhi", state: "Delhi", pincode: "110001", mapUrl: "" },
      visibility: { showFees: true, showTeachers: true, showResults: true, showContact: true },
      verification: { verified: false, label: "Demo profile" },
      part: "Part 59 - Public Institute Profile",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: new Date().toISOString()
    }
  ];
}

function part59CleanText(value, max = 160) {
  return String(value ?? "").trim().replace(/[<>]/g, "").slice(0, max);
}

function part59CleanUrl(value, max = 320) {
  const clean = part59CleanText(value, max);
  if (!clean) return "";
  if (clean.startsWith("/") || /^https?:\/\//i.test(clean)) return clean;
  return "";
}

function part59Number(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : fallback;
}

function part59Slugify(value = "") {
  const slug = part59CleanText(value, 100).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || `institute-${Math.random().toString(36).slice(2, 8)}`;
}

function part59SplitLines(value, maxItems = 12) {
  if (Array.isArray(value)) return value.map((item) => part59CleanText(item, 120)).filter(Boolean).slice(0, maxItems);
  return String(value ?? "").split(/\n|,/).map((item) => part59CleanText(item, 120)).filter(Boolean).slice(0, maxItems);
}

function part59ParseJsonArray(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function part59BuildCourses(payload = {}, existing = {}) {
  const raw = part59ParseJsonArray(payload.courses, existing.courses || []);
  return raw.map((course, index) => ({
    id: part59CleanText(course.id || `course-${index + 1}`, 40),
    name: part59CleanText(course.name || course.courseName, 100),
    classLevel: part59CleanText(course.classLevel || course.className, 60),
    duration: part59CleanText(course.duration, 60),
    mode: part59CleanText(course.mode || "Offline", 50),
    feeMin: part59Number(course.feeMin ?? course.minimumFee, 0),
    feeMax: part59Number(course.feeMax ?? course.maximumFee, 0),
    highlight: part59CleanText(course.highlight || course.description, 180)
  })).filter((course) => course.name).slice(0, 20);
}

function part59BuildTeachers(payload = {}, existing = {}) {
  const raw = part59ParseJsonArray(payload.teachers, existing.teachers || []);
  return raw.map((teacher, index) => ({
    id: part59CleanText(teacher.id || `teacher-${index + 1}`, 40),
    name: part59CleanText(teacher.name, 100),
    subject: part59CleanText(teacher.subject, 80),
    experience: part59CleanText(teacher.experience, 80),
    bio: part59CleanText(teacher.bio, 180)
  })).filter((teacher) => teacher.name).slice(0, 30);
}

function part59BuildResults(payload = {}, existing = {}) {
  const raw = part59ParseJsonArray(payload.results, existing.results || []);
  return raw.map((result, index) => ({
    id: part59CleanText(result.id || `result-${index + 1}`, 40),
    exam: part59CleanText(result.exam, 100),
    year: part59CleanText(result.year, 20),
    achievement: part59CleanText(result.achievement, 180),
    studentName: part59CleanText(result.studentName, 100)
  })).filter((result) => result.exam || result.achievement).slice(0, 20);
}

function part59GenerateProfileId(payload = {}) {
  const prefix = part59Slugify(payload.name || "profile").slice(0, 12).toUpperCase().replace(/-/g, "");
  const stamp = Date.now().toString(36).toUpperCase();
  return `NX-PROFILE-${prefix || "INST"}-${stamp}`;
}

function part59ValidateProfile(payload = {}) {
  const errors = [];
  if (!part59CleanText(payload.name, 120)) errors.push("Institute name required hai.");
  if (!part59CleanText(payload.description, 500)) errors.push("Institute description required hai.");
  const address = payload.address || {};
  if (!part59CleanText(address.city || payload.city, 80)) errors.push("City required hai.");
  return errors;
}

function part59BuildProfile(payload = {}, existing = {}) {
  const now = new Date().toISOString();
  const name = part59CleanText(payload.name ?? existing.name, 140);
  const slug = part59Slugify(payload.slug || existing.slug || name);
  const address = payload.address || {};
  const contact = payload.contact || {};
  const timings = payload.timings || {};
  const media = payload.media || {};
  const visibility = payload.visibility || {};
  const courses = part59BuildCourses(payload, existing);
  const teachers = part59BuildTeachers(payload, existing);
  const results = part59BuildResults(payload, existing);
  const feeMin = part59Number(payload.feeRange?.minimum ?? payload.minimumFee ?? existing.feeRange?.minimum, courses.reduce((min, c) => c.feeMin ? Math.min(min, c.feeMin) : min, 0));
  const feeMax = part59Number(payload.feeRange?.maximum ?? payload.maximumFee ?? existing.feeRange?.maximum, courses.reduce((max, c) => Math.max(max, c.feeMax || 0), 0));
  return {
    ...existing,
    profileId: existing.profileId || payload.profileId || part59GenerateProfileId({ name }),
    slug,
    status: ["draft", "published", "hidden"].includes(part59CleanText(payload.status || existing.status, 40)) ? part59CleanText(payload.status || existing.status, 40) : "draft",
    name,
    tagline: part59CleanText(payload.tagline ?? existing.tagline, 180),
    description: part59CleanText(payload.description ?? existing.description, 900),
    logoUrl: part59CleanUrl(payload.logoUrl ?? existing.logoUrl),
    bannerUrl: part59CleanUrl(payload.bannerUrl ?? existing.bannerUrl),
    contact: {
      phone: part59CleanText(contact.phone ?? payload.phone ?? existing.contact?.phone, 30).replace(/[^0-9+]/g, ""),
      email: part59CleanText(contact.email ?? payload.email ?? existing.contact?.email, 120),
      website: part59CleanUrl(contact.website ?? payload.website ?? existing.contact?.website)
    },
    courses,
    feeRange: {
      currency: part59CleanText(payload.feeRange?.currency ?? payload.currency ?? existing.feeRange?.currency ?? "INR", 10),
      minimum: feeMin,
      maximum: feeMax,
      note: part59CleanText(payload.feeRange?.note ?? payload.feeNote ?? existing.feeRange?.note, 180)
    },
    teachers,
    results,
    facilities: part59SplitLines(payload.facilities ?? existing.facilities, 20),
    timings: {
      weekdays: part59CleanText(timings.weekdays ?? payload.weekdaysTiming ?? existing.timings?.weekdays, 100),
      weekend: part59CleanText(timings.weekend ?? payload.weekendTiming ?? existing.timings?.weekend, 100),
      office: part59CleanText(timings.office ?? payload.officeTiming ?? existing.timings?.office, 100)
    },
    media: {
      photoUrls: part59SplitLines(media.photoUrls ?? payload.photoUrls ?? existing.media?.photoUrls, 20).map((url) => part59CleanUrl(url)).filter(Boolean),
      videoUrls: part59SplitLines(media.videoUrls ?? payload.videoUrls ?? existing.media?.videoUrls, 10).map((url) => part59CleanUrl(url)).filter(Boolean)
    },
    address: {
      line1: part59CleanText(address.line1 ?? payload.addressLine1 ?? existing.address?.line1, 180),
      area: part59CleanText(address.area ?? payload.area ?? existing.address?.area, 120),
      city: part59CleanText(address.city ?? payload.city ?? existing.address?.city, 80),
      state: part59CleanText(address.state ?? payload.state ?? existing.address?.state, 80),
      pincode: part59CleanText(address.pincode ?? payload.pincode ?? existing.address?.pincode, 20),
      mapUrl: part59CleanUrl(address.mapUrl ?? payload.mapUrl ?? existing.address?.mapUrl)
    },
    visibility: {
      showFees: visibility.showFees !== false,
      showTeachers: visibility.showTeachers !== false,
      showResults: visibility.showResults !== false,
      showContact: visibility.showContact !== false
    },
    verification: existing.verification || { verified: false, label: "Not verified yet" },
    part: "Part 59 - Public Institute Profile",
    createdAt: existing.createdAt || now,
    updatedAt: now,
    publishedAt: existing.publishedAt || (payload.status === "published" ? now : null)
  };
}

function part59PublicProfileView(row = {}) {
  return {
    id: row._id || row.id || row.profileId,
    profileId: row.profileId,
    slug: row.slug,
    status: row.status,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    logoUrl: row.logoUrl,
    bannerUrl: row.bannerUrl,
    contact: row.visibility?.showContact === false ? { phone: "", email: "", website: "" } : row.contact,
    courses: row.courses || [],
    feeRange: row.visibility?.showFees === false ? null : row.feeRange,
    teachers: row.visibility?.showTeachers === false ? [] : row.teachers || [],
    results: row.visibility?.showResults === false ? [] : row.results || [],
    facilities: row.facilities || [],
    timings: row.timings || {},
    media: row.media || { photoUrls: [], videoUrls: [] },
    address: row.address || {},
    visibility: row.visibility || {},
    verification: row.verification || { verified: false },
    part: row.part || "Part 59 - Public Institute Profile",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    publishedAt: row.publishedAt
  };
}

async function part59GetCollection() {
  if (globalThis.NAXORA_DB_MODE === "mongodb" && mongoose.connection?.readyState === 1) {
    return mongoose.connection.collection("part59publicprofiles");
  }
  return null;
}

async function part59FindProfileById(id) {
  const cleanId = part59CleanText(id, 140);
  const collection = await part59GetCollection();
  if (!collection) {
    return { collection: null, row: globalThis.NAXORA_PART59_PROFILES.find((item) => item.profileId === cleanId || item.slug === cleanId || item.id === cleanId) };
  }
  const row = await collection.findOne({ $or: [{ profileId: cleanId }, { slug: cleanId }] });
  return { collection, row };
}

app.get("/public-institute-profile", (req, res) => sendFileSafe(res, "public-institute-profile.html"));
app.get("/institute-profile-public", (req, res) => sendFileSafe(res, "public-institute-profile.html"));
app.get("/public-profile", (req, res) => sendFileSafe(res, "public-institute-profile.html"));
app.get("/institute-showcase", (req, res) => sendFileSafe(res, "public-institute-profile.html"));

app.get("/api/part59/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 59 - Public Institute Profile",
    status: "active",
    roadmap: "Part 59 = Public Institute Profile. Part 60 will connect request callback/send enquiry.",
    dbMode: globalThis.NAXORA_DB_MODE || "mock",
    sections: part59ProfileSections.map((section) => section.id),
    routes: ["/public-institute-profile", "/institute-profile-public", "/api/part59/profile", "/api/part59/search"],
    safe: { noEnvIncluded: true, noRealCallbackSubmit: true, publishControl: true }
  });
});

app.get("/api/part59/config", (req, res) => {
  res.json({
    success: true,
    part: "Part 59 - Public Institute Profile",
    sections: part59ProfileSections,
    statusOptions: ["draft", "published", "hidden"],
    mediaRule: "Part 59 me direct file upload nahi; safe URL fields hain. Secure upload/storage later add karenge.",
    nextPart: "Part 60 - Request Callback/Send Enquiry"
  });
});

app.get("/api/part59/profile", async (req, res) => {
  const collection = await part59GetCollection();
  const slug = part59CleanText(req.query.slug || req.query.profileId, 140);
  let row;
  if (!collection) {
    row = slug ? globalThis.NAXORA_PART59_PROFILES.find((item) => item.slug === slug || item.profileId === slug) : globalThis.NAXORA_PART59_PROFILES[0];
  } else if (slug) {
    row = await collection.findOne({ $or: [{ slug }, { profileId: slug }] });
  } else {
    row = await collection.findOne({}, { sort: { updatedAt: -1 } });
  }
  if (!row) return res.status(404).json({ success: false, message: "Public institute profile nahi mila." });
  res.json({ success: true, mode: collection ? "mongodb" : "mock", profile: part59PublicProfileView(row) });
});

app.post("/api/part59/profile", async (req, res) => {
  const errors = part59ValidateProfile(req.body || {});
  if (errors.length) return res.status(400).json({ success: false, message: "Profile validation failed.", errors });
  const profile = part59BuildProfile(req.body || {}, {});
  const collection = await part59GetCollection();
  if (!collection) {
    globalThis.NAXORA_PART59_PROFILES.unshift({ id: profile.profileId, ...profile });
    return res.status(201).json({ success: true, mode: "mock", message: "Public institute profile saved in mock mode.", profile: part59PublicProfileView(profile) });
  }
  await collection.updateOne({ profileId: profile.profileId }, { $set: profile }, { upsert: true });
  const saved = await collection.findOne({ profileId: profile.profileId });
  res.status(201).json({ success: true, mode: "mongodb", message: "Public institute profile saved.", profile: part59PublicProfileView(saved) });
});

app.get("/api/part59/profile/:profileId", async (req, res) => {
  const { collection, row } = await part59FindProfileById(req.params.profileId);
  if (!row) return res.status(404).json({ success: false, message: "Public institute profile nahi mila." });
  res.json({ success: true, mode: collection ? "mongodb" : "mock", profile: part59PublicProfileView(row) });
});

app.put("/api/part59/profile/:profileId", async (req, res) => {
  const found = await part59FindProfileById(req.params.profileId);
  if (!found.row) return res.status(404).json({ success: false, message: "Public institute profile nahi mila." });
  const errors = part59ValidateProfile({ ...found.row, ...(req.body || {}) });
  if (errors.length) return res.status(400).json({ success: false, message: "Profile validation failed.", errors });
  const updated = part59BuildProfile({ ...found.row, ...(req.body || {}) }, found.row);
  if (!found.collection) {
    const index = globalThis.NAXORA_PART59_PROFILES.findIndex((item) => item.profileId === found.row.profileId || item.slug === found.row.slug);
    if (index >= 0) globalThis.NAXORA_PART59_PROFILES[index] = { ...globalThis.NAXORA_PART59_PROFILES[index], ...updated };
    return res.json({ success: true, mode: "mock", message: "Public institute profile updated in mock mode.", profile: part59PublicProfileView(updated) });
  }
  await found.collection.updateOne({ profileId: found.row.profileId }, { $set: updated });
  const saved = await found.collection.findOne({ profileId: found.row.profileId });
  res.json({ success: true, mode: "mongodb", message: "Public institute profile updated.", profile: part59PublicProfileView(saved) });
});

app.patch("/api/part59/profile/:profileId/publish", async (req, res) => {
  const found = await part59FindProfileById(req.params.profileId);
  if (!found.row) return res.status(404).json({ success: false, message: "Public institute profile nahi mila." });
  const status = ["draft", "published", "hidden"].includes(part59CleanText(req.body?.status, 40)) ? part59CleanText(req.body.status, 40) : "published";
  const update = { status, updatedAt: new Date().toISOString(), publishedAt: status === "published" ? new Date().toISOString() : found.row.publishedAt || null };
  if (!found.collection) {
    Object.assign(found.row, update);
    return res.json({ success: true, mode: "mock", message: `Profile status ${status} ho gaya.`, profile: part59PublicProfileView(found.row) });
  }
  await found.collection.updateOne({ profileId: found.row.profileId }, { $set: update });
  const saved = await found.collection.findOne({ profileId: found.row.profileId });
  res.json({ success: true, mode: "mongodb", message: `Profile status ${status} ho gaya.`, profile: part59PublicProfileView(saved) });
});

app.post("/api/part59/profile/:profileId/courses", async (req, res) => {
  const found = await part59FindProfileById(req.params.profileId);
  if (!found.row) return res.status(404).json({ success: false, message: "Public institute profile nahi mila." });
  const course = {
    id: `course-${Date.now().toString(36)}`,
    name: part59CleanText(req.body?.name || req.body?.courseName, 100),
    classLevel: part59CleanText(req.body?.classLevel, 60),
    duration: part59CleanText(req.body?.duration, 60),
    mode: part59CleanText(req.body?.mode || "Offline", 50),
    feeMin: part59Number(req.body?.feeMin || req.body?.minimumFee, 0),
    feeMax: part59Number(req.body?.feeMax || req.body?.maximumFee, 0),
    highlight: part59CleanText(req.body?.highlight || req.body?.description, 180)
  };
  if (!course.name) return res.status(400).json({ success: false, message: "Course name required hai." });
  const courses = [...(found.row.courses || []), course].slice(0, 20);
  const update = { courses, updatedAt: new Date().toISOString() };
  if (!found.collection) {
    Object.assign(found.row, update);
    return res.status(201).json({ success: true, mode: "mock", course, profile: part59PublicProfileView(found.row) });
  }
  await found.collection.updateOne({ profileId: found.row.profileId }, { $set: update });
  const saved = await found.collection.findOne({ profileId: found.row.profileId });
  res.status(201).json({ success: true, mode: "mongodb", course, profile: part59PublicProfileView(saved) });
});

app.post("/api/part59/profile/:profileId/media", async (req, res) => {
  const found = await part59FindProfileById(req.params.profileId);
  if (!found.row) return res.status(404).json({ success: false, message: "Public institute profile nahi mila." });
  const type = part59CleanText(req.body?.type || "photo", 20);
  const url = part59CleanUrl(req.body?.url, 320);
  if (!url) return res.status(400).json({ success: false, message: "Valid photo/video URL required hai." });
  const media = found.row.media || { photoUrls: [], videoUrls: [] };
  if (type === "video") media.videoUrls = [...(media.videoUrls || []), url].slice(0, 10);
  else media.photoUrls = [...(media.photoUrls || []), url].slice(0, 20);
  const update = { media, updatedAt: new Date().toISOString() };
  if (!found.collection) {
    Object.assign(found.row, update);
    return res.status(201).json({ success: true, mode: "mock", media, profile: part59PublicProfileView(found.row) });
  }
  await found.collection.updateOne({ profileId: found.row.profileId }, { $set: update });
  const saved = await found.collection.findOne({ profileId: found.row.profileId });
  res.status(201).json({ success: true, mode: "mongodb", media, profile: part59PublicProfileView(saved) });
});

app.get("/api/part59/search", async (req, res) => {
  const query = part59CleanText(req.query.q || req.query.city || "", 100).toLowerCase();
  const onlyPublished = req.query.status !== "all";
  const collection = await part59GetCollection();
  let rows = [];
  if (!collection) {
    rows = globalThis.NAXORA_PART59_PROFILES;
  } else {
    rows = await collection.find(onlyPublished ? { status: "published" } : {}).sort({ updatedAt: -1 }).limit(100).toArray();
  }
  const filtered = rows.filter((row) => {
    if (onlyPublished && row.status !== "published") return false;
    if (!query) return true;
    const haystack = [row.name, row.tagline, row.description, row.address?.city, row.address?.state, ...(row.courses || []).map((c) => c.name), ...(row.facilities || [])].join(" ").toLowerCase();
    return haystack.includes(query);
  });
  res.json({ success: true, mode: collection ? "mongodb" : "mock", count: filtered.length, profiles: filtered.map(part59PublicProfileView) });
});

app.get("/api/part59/checklist", (req, res) => {
  res.json({ success: true, part: "Part 59 - Public Institute Profile", checklist: part59Checklist });
});

app.get("/api/part59/export", async (req, res) => {
  const collection = await part59GetCollection();
  const rows = collection ? await collection.find({}).sort({ updatedAt: -1 }).limit(1000).toArray() : globalThis.NAXORA_PART59_PROFILES;
  res.json({ success: true, part: "Part 59 - Public Institute Profile", exportedAt: new Date().toISOString(), count: rows.length, profiles: rows.map(part59PublicProfileView) });
});

app.get("/api/part59/demo", (req, res) => {
  const profiles = globalThis.NAXORA_PART59_PROFILES.map(part59PublicProfileView);
  res.json({ success: true, part: "Part 59 - Public Institute Profile", count: profiles.length, profiles, checklist: part59Checklist });
});
// ================= END PART 59 =================



// ================= PART 60: REQUEST CALLBACK / SEND ENQUIRY =================
// Roadmap scope: Student enquiry form, course selection, parent contact, preferred timing, consent and institute notification foundation.
// Safe rule: Part 60 stores consent-based callback/enquiry requests. Real WhatsApp/SMS/email auto-send will be completed in Part 65.
const part60LeadStatuses = ["new", "callback_requested", "contacted", "demo_scheduled", "converted", "not_interested", "closed"];
const part60LeadSources = ["public_profile", "nearby_search", "comparison", "landing_page", "manual", "demo"];

const part60Checklist = [
  "Request callback page opens on /request-callback.",
  "Send enquiry alternate route opens on /send-enquiry.",
  "Student/parent name, phone, course interest and preferred timing are captured.",
  "Consent is required before saving a public enquiry.",
  "Enquiry is linked with profileId/slug when available from Part 59 public profile.",
  "MongoDB connected mode stores requests in part60callbackenquiries collection.",
  "Mock mode fallback works if MongoDB is temporarily unavailable.",
  "Status can be updated by counsellor/admin after contact.",
  "Analytics shows total, open, contacted, converted and conversion rate.",
  "No real WhatsApp/SMS/email auto-send in this part; Part 65 will handle communication integrations."
];

const part60Config = {
  fields: [
    "studentName",
    "parentName",
    "phone",
    "email",
    "classLevel",
    "courseInterest",
    "preferredTiming",
    "city",
    "profileId",
    "message",
    "consentAccepted"
  ],
  required: ["studentName", "phone", "courseInterest", "consentAccepted"],
  statuses: part60LeadStatuses,
  sources: part60LeadSources,
  safety: {
    consentRequired: true,
    realMessageSending: false,
    note: "Part 60 me request save hoti hai. WhatsApp/SMS/Email auto-send Part 65 me add hoga."
  }
};

if (!globalThis.NAXORA_PART60_ENQUIRIES) {
  globalThis.NAXORA_PART60_ENQUIRIES = [
    {
      id: "mock-callback-1",
      requestId: "NX-CB-DEMO-001",
      profileId: "NX-PROFILE-DEMO-001",
      profileSlug: "naxora-demo-institute",
      profileName: "NAXORA Demo Institute",
      source: "public_profile",
      studentName: "Aarav Demo",
      parentName: "Mr. Demo Parent",
      phone: "9876543210",
      email: "parent@example.com",
      classLevel: "Class 10",
      courseInterest: "Class 10 Board Excellence",
      preferredTiming: "Evening 5 PM - 7 PM",
      city: "Delhi",
      message: "Please call me for batch details and fee structure.",
      consentAccepted: true,
      status: "callback_requested",
      priority: "hot",
      assignedTo: "Counsellor",
      notes: [
        { id: "note-demo-1", note: "Demo request created for Part 60 testing.", createdAt: new Date().toISOString() }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nextFollowUpAt: null
    }
  ];
}

function part60CleanText(value, max = 160) {
  return String(value || "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}

function part60CleanPhone(value) {
  return String(value || "").replace(/[^0-9+\-\s]/g, "").replace(/\s+/g, " ").trim().slice(0, 25);
}

function part60NormalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function part60AllowedStatus(value) {
  const cleaned = part60CleanText(value, 60).toLowerCase();
  return part60LeadStatuses.includes(cleaned) ? cleaned : "new";
}

function part60AllowedSource(value) {
  const cleaned = part60CleanText(value, 60).toLowerCase();
  return part60LeadSources.includes(cleaned) ? cleaned : "public_profile";
}

function part60PriorityFromBody(body) {
  const raw = part60CleanText(body?.priority, 30).toLowerCase();
  if (["hot", "warm", "cold"].includes(raw)) return raw;
  const msg = [body?.courseInterest, body?.preferredTiming, body?.message].join(" ").toLowerCase();
  if (msg.includes("today") || msg.includes("urgent") || msg.includes("admission")) return "hot";
  if (msg.includes("demo") || msg.includes("fees") || msg.includes("batch")) return "warm";
  return "warm";
}

function part60ValidateRequest(body = {}) {
  const errors = [];
  if (!part60CleanText(body.studentName, 100)) errors.push("Student name required hai.");
  const phoneDigits = part60NormalizePhone(body.phone);
  if (phoneDigits.length < 7 || phoneDigits.length > 15) errors.push("Valid parent/student phone required hai.");
  if (!part60CleanText(body.courseInterest, 120)) errors.push("Course interest required hai.");
  if (body.consentAccepted !== true && body.consentAccepted !== "true" && body.consentAccepted !== "on") {
    errors.push("Consent required hai before sending enquiry.");
  }
  return errors;
}

function part60BuildRequest(body = {}, existing = {}) {
  const now = new Date().toISOString();
  const requestId = existing.requestId || body.requestId || `NX-CB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  return {
    ...existing,
    requestId,
    profileId: part60CleanText(body.profileId || existing.profileId || "NX-PROFILE-DEMO-001", 100),
    profileSlug: part60CleanText(body.profileSlug || body.slug || existing.profileSlug || "", 120),
    profileName: part60CleanText(body.profileName || existing.profileName || "", 140),
    source: part60AllowedSource(body.source || existing.source),
    studentName: part60CleanText(body.studentName || existing.studentName, 100),
    parentName: part60CleanText(body.parentName || existing.parentName, 100),
    phone: part60CleanPhone(body.phone || existing.phone),
    email: part60CleanText(body.email || existing.email, 120),
    classLevel: part60CleanText(body.classLevel || existing.classLevel, 60),
    courseInterest: part60CleanText(body.courseInterest || body.course || existing.courseInterest, 120),
    preferredTiming: part60CleanText(body.preferredTiming || body.preferredTime || existing.preferredTiming, 120),
    city: part60CleanText(body.city || existing.city, 80),
    message: part60CleanText(body.message || existing.message, 400),
    consentAccepted: body.consentAccepted === true || body.consentAccepted === "true" || body.consentAccepted === "on" || existing.consentAccepted === true,
    status: part60AllowedStatus(body.status || existing.status || "callback_requested"),
    priority: part60PriorityFromBody(body || existing),
    assignedTo: part60CleanText(body.assignedTo || existing.assignedTo || "Counsellor", 80),
    nextFollowUpAt: body.nextFollowUpAt || existing.nextFollowUpAt || null,
    notes: existing.notes || [],
    createdAt: existing.createdAt || now,
    updatedAt: now
  };
}

function part60PublicRequestView(row = {}) {
  return {
    requestId: row.requestId,
    profileId: row.profileId,
    profileSlug: row.profileSlug,
    profileName: row.profileName,
    source: row.source,
    studentName: row.studentName,
    parentName: row.parentName,
    phone: row.phone,
    email: row.email,
    classLevel: row.classLevel,
    courseInterest: row.courseInterest,
    preferredTiming: row.preferredTiming,
    city: row.city,
    message: row.message,
    consentAccepted: row.consentAccepted === true,
    status: row.status,
    priority: row.priority,
    assignedTo: row.assignedTo,
    nextFollowUpAt: row.nextFollowUpAt || null,
    notes: Array.isArray(row.notes) ? row.notes.slice(-10) : [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

async function part60GetCollection() {
  if (mongoose.connection.readyState !== 1) return null;
  return mongoose.connection.db.collection("part60callbackenquiries");
}

async function part60FindRequestById(requestId) {
  const cleanId = part60CleanText(requestId, 100);
  const collection = await part60GetCollection();
  if (!collection) {
    return { collection: null, row: globalThis.NAXORA_PART60_ENQUIRIES.find((item) => item.requestId === cleanId || item.id === cleanId) };
  }
  const row = await collection.findOne({ requestId: cleanId });
  return { collection, row };
}

function part60BuildAnalytics(rows = []) {
  const total = rows.length;
  const statusCounts = rows.reduce((acc, row) => {
    acc[row.status || "new"] = (acc[row.status || "new"] || 0) + 1;
    return acc;
  }, {});
  const openStatuses = ["new", "callback_requested", "contacted", "demo_scheduled"];
  const open = rows.filter((row) => openStatuses.includes(row.status)).length;
  const converted = rows.filter((row) => row.status === "converted").length;
  const contacted = rows.filter((row) => ["contacted", "demo_scheduled", "converted"].includes(row.status)).length;
  const hot = rows.filter((row) => row.priority === "hot").length;
  return {
    total,
    open,
    contacted,
    converted,
    hot,
    statusCounts,
    conversionRate: total ? Number(((converted / total) * 100).toFixed(2)) : 0
  };
}

async function part60SaveRequest(req, res) {
  const body = req.body || {};
  const errors = part60ValidateRequest(body);
  if (errors.length) return res.status(400).json({ success: false, message: "Enquiry validation failed.", errors });

  let profileName = part60CleanText(body.profileName, 140);
  if (!profileName && body.profileId && typeof part59FindProfileById === "function") {
    try {
      const found = await part59FindProfileById(body.profileId);
      if (found?.row?.name) profileName = found.row.name;
    } catch (error) {
      profileName = "";
    }
  }

  const payload = part60BuildRequest({ ...body, profileName }, {});
  const collection = await part60GetCollection();
  if (!collection) {
    globalThis.NAXORA_PART60_ENQUIRIES.unshift({ id: payload.requestId, ...payload });
    return res.status(201).json({
      success: true,
      mode: "mock",
      message: "Callback/enquiry request mock mode me save ho gayi.",
      request: part60PublicRequestView(payload),
      nextStep: "Counsellor Part 58 CRM ya Part 60 list me follow-up karega."
    });
  }
  await collection.insertOne(payload);
  const saved = await collection.findOne({ requestId: payload.requestId });
  res.status(201).json({
    success: true,
    mode: "mongodb",
    message: "Callback/enquiry request MongoDB me save ho gayi.",
    request: part60PublicRequestView(saved),
    nextStep: "Counsellor Part 58 CRM ya Part 60 list me follow-up karega."
  });
}

app.get("/request-callback", (req, res) => sendFileSafe(res, "request-callback.html"));
app.get("/send-enquiry", (req, res) => sendFileSafe(res, "request-callback.html"));
app.get("/callback", (req, res) => sendFileSafe(res, "request-callback.html"));
app.get("/institute-enquiry", (req, res) => sendFileSafe(res, "request-callback.html"));

app.get("/api/part60/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 60 - Request Callback / Send Enquiry",
    status: "active",
    dbMode: mongoose.connection.readyState === 1 ? "mongodb" : "mock",
    purpose: "Student enquiry form, course selection, parent contact, preferred timing, consent and institute notification foundation.",
    currentVersionPlan: "Part 53–78 = NAXORA OS 1.0 completion. Part 79–110 = NAXORA OS 2.0 development.",
    nextPart: "Part 61 - Nearby Institutes"
  });
});

app.get("/api/part60/config", (req, res) => {
  res.json({ success: true, part: "Part 60 - Request Callback / Send Enquiry", config: part60Config });
});

app.post("/api/part60/callback", part60SaveRequest);
app.post("/api/part60/enquiry", part60SaveRequest);
app.post("/api/part60/request-callback", part60SaveRequest);

app.get("/api/part60/enquiries", async (req, res) => {
  const collection = await part60GetCollection();
  const status = part60CleanText(req.query.status, 60).toLowerCase();
  let rows = [];
  if (!collection) {
    rows = globalThis.NAXORA_PART60_ENQUIRIES;
  } else {
    const filter = part60LeadStatuses.includes(status) ? { status } : {};
    rows = await collection.find(filter).sort({ updatedAt: -1 }).limit(100).toArray();
  }
  if (!collection && part60LeadStatuses.includes(status)) rows = rows.filter((row) => row.status === status);
  res.json({ success: true, mode: collection ? "mongodb" : "mock", count: rows.length, enquiries: rows.map(part60PublicRequestView), analytics: part60BuildAnalytics(rows) });
});

app.get("/api/part60/enquiries/:requestId", async (req, res) => {
  const { collection, row } = await part60FindRequestById(req.params.requestId);
  if (!row) return res.status(404).json({ success: false, message: "Callback/enquiry request nahi mili." });
  res.json({ success: true, mode: collection ? "mongodb" : "mock", request: part60PublicRequestView(row) });
});

app.patch("/api/part60/enquiries/:requestId/status", async (req, res) => {
  const status = part60AllowedStatus(req.body?.status || "contacted");
  const noteText = part60CleanText(req.body?.note || `Status changed to ${status}`, 240);
  const nextFollowUpAt = req.body?.nextFollowUpAt || null;
  const { collection, row } = await part60FindRequestById(req.params.requestId);
  if (!row) return res.status(404).json({ success: false, message: "Callback/enquiry request nahi mili." });
  const note = { id: `note-${Date.now().toString(36)}`, note: noteText, createdAt: new Date().toISOString() };
  const update = { status, nextFollowUpAt, updatedAt: new Date().toISOString() };
  if (!collection) {
    const index = globalThis.NAXORA_PART60_ENQUIRIES.findIndex((item) => item.requestId === row.requestId);
    globalThis.NAXORA_PART60_ENQUIRIES[index] = { ...globalThis.NAXORA_PART60_ENQUIRIES[index], ...update, notes: [...(row.notes || []), note] };
    return res.json({ success: true, mode: "mock", request: part60PublicRequestView(globalThis.NAXORA_PART60_ENQUIRIES[index]) });
  }
  await collection.updateOne({ requestId: row.requestId }, { $set: update, $push: { notes: note } });
  const saved = await collection.findOne({ requestId: row.requestId });
  res.json({ success: true, mode: "mongodb", request: part60PublicRequestView(saved) });
});

app.get("/api/part60/reminders", async (req, res) => {
  const collection = await part60GetCollection();
  const closedStatuses = ["converted", "not_interested", "closed"];
  let rows = [];
  if (!collection) {
    rows = globalThis.NAXORA_PART60_ENQUIRIES.filter((row) => !closedStatuses.includes(row.status));
  } else {
    rows = await collection.find({ status: { $nin: closedStatuses } }).sort({ updatedAt: -1 }).limit(100).toArray();
  }
  res.json({ success: true, count: rows.length, reminders: rows.map(part60PublicRequestView) });
});

app.get("/api/part60/analytics", async (req, res) => {
  const collection = await part60GetCollection();
  const rows = collection ? await collection.find({}).sort({ updatedAt: -1 }).limit(1000).toArray() : globalThis.NAXORA_PART60_ENQUIRIES;
  res.json({ success: true, part: "Part 60 - Request Callback / Send Enquiry", analytics: part60BuildAnalytics(rows), generatedAt: new Date().toISOString() });
});

app.get("/api/part60/checklist", (req, res) => {
  res.json({ success: true, part: "Part 60 - Request Callback / Send Enquiry", checklist: part60Checklist });
});

app.get("/api/part60/export", async (req, res) => {
  const collection = await part60GetCollection();
  const rows = collection ? await collection.find({}).sort({ updatedAt: -1 }).limit(1000).toArray() : globalThis.NAXORA_PART60_ENQUIRIES;
  res.json({ success: true, part: "Part 60 - Request Callback / Send Enquiry", exportedAt: new Date().toISOString(), count: rows.length, enquiries: rows.map(part60PublicRequestView) });
});

app.get("/api/part60/demo", (req, res) => {
  const rows = globalThis.NAXORA_PART60_ENQUIRIES.map(part60PublicRequestView);
  res.json({ success: true, part: "Part 60 - Request Callback / Send Enquiry", count: rows.length, enquiries: rows, analytics: part60BuildAnalytics(rows), checklist: part60Checklist });
});
// ================= END PART 60 =================


// ================= PART 61: NEARBY INSTITUTES =================
// Roadmap scope: Location search, city filters, distance filters, course filters and verified listings.
// Safe rule: Part 61 uses public institute profiles from Part 59. No external map/geocoding API, no automatic user tracking.
const part61DefaultCityCoordinates = {
  delhi: { lat: 28.6139, lng: 77.2090, label: "Delhi" },
  mumbai: { lat: 19.0760, lng: 72.8777, label: "Mumbai" },
  bengaluru: { lat: 12.9716, lng: 77.5946, label: "Bengaluru" },
  bangalore: { lat: 12.9716, lng: 77.5946, label: "Bengaluru" },
  jaipur: { lat: 26.9124, lng: 75.7873, label: "Jaipur" },
  gurugram: { lat: 28.4595, lng: 77.0266, label: "Gurugram" },
  gurgaon: { lat: 28.4595, lng: 77.0266, label: "Gurugram" },
  noida: { lat: 28.5355, lng: 77.3910, label: "Noida" },
  pune: { lat: 18.5204, lng: 73.8567, label: "Pune" },
  lucknow: { lat: 26.8467, lng: 80.9462, label: "Lucknow" },
  chandigarh: { lat: 30.7333, lng: 76.7794, label: "Chandigarh" }
};

const part61Checklist = [
  "Nearby Institutes page opens on /nearby-institutes.",
  "City filter works using institute public profile address city.",
  "Course filter checks profile courses, class level and description.",
  "Distance filter works when latitude/longitude or known city coordinates are available.",
  "Verified-only filter hides unverified/demo listings.",
  "Search results include request callback link from Part 60.",
  "Search results include public profile link from Part 59.",
  "MongoDB connected mode reads published Part 59 profiles from part59publicprofiles collection.",
  "Mock mode fallback shows demo nearby listings without breaking live site.",
  "No external map/geocoding API and no automatic user tracking in this part."
];

const part61Config = {
  filters: ["city", "course", "radiusKm", "verifiedOnly", "lat", "lng", "mode"],
  defaultRadiusKm: 25,
  maxRadiusKm: 250,
  resultLimit: 100,
  safety: {
    externalMaps: false,
    automaticLocationTracking: false,
    userConsentRequiredForBrowserLocation: true,
    note: "Part 61 user ke click/permission ke bina exact location track nahi karta. City/search filters safe hain."
  },
  handoff: {
    part59: "Public profile details source",
    part60: "Request callback/send enquiry action",
    part62: "Compare institutes next"
  }
};

if (!globalThis.NAXORA_PART61_EXTRA_LISTINGS) {
  globalThis.NAXORA_PART61_EXTRA_LISTINGS = [
    {
      profileId: "NX-PROFILE-DEMO-002",
      slug: "bright-path-academy-demo",
      status: "published",
      name: "Bright Path Academy Demo",
      tagline: "Board exams, foundation and weekly parent reports.",
      description: "Demo nearby listing for Part 61 city, course and distance filters.",
      logoUrl: "/assets/naxora-logo.svg",
      contact: { phone: "9999999999", email: "hello@brightpath.demo", website: "" },
      courses: [
        { id: "course-demo-1", name: "Class 9 and 10 Science", classLevel: "Class 10", duration: "9 months", mode: "Offline", feeMin: 10000, feeMax: 22000, highlight: "Weekly tests and parent dashboard." },
        { id: "course-demo-2", name: "NEET Foundation", classLevel: "Class 11", duration: "12 months", mode: "Hybrid", feeMin: 35000, feeMax: 70000, highlight: "Biology and chemistry foundation." }
      ],
      feeRange: { currency: "INR", minimum: 10000, maximum: 70000, note: "Demo fee range." },
      teachers: [],
      results: [],
      facilities: ["Weekly tests", "Doubt support", "Parent reports", "Hybrid classes"],
      timings: { weekdays: "Mon–Sat, 7 AM – 8 PM", weekend: "Sun demo classes" },
      address: { line1: "Sector Demo Road", area: "Education Market", city: "Noida", state: "Uttar Pradesh", pincode: "201301", mapUrl: "" },
      location: { lat: 28.5355, lng: 77.3910 },
      verification: { verified: true, label: "Verified demo listing" },
      visibility: { showFees: true, showTeachers: true, showResults: true, showContact: true },
      part: "Part 61 - Nearby Institutes",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: new Date().toISOString()
    },
    {
      profileId: "NX-PROFILE-DEMO-003",
      slug: "goal-achiever-classes-demo",
      status: "published",
      name: "Goal Achiever Classes Demo",
      tagline: "JEE foundation, live classes and smart attendance.",
      description: "Demo listing for course filter, verified listing and callback handoff.",
      logoUrl: "/assets/naxora-logo.svg",
      contact: { phone: "8888888888", email: "admissions@goalachiever.demo", website: "" },
      courses: [
        { id: "course-demo-3", name: "JEE Foundation", classLevel: "Class 11", duration: "12 months", mode: "Offline + Online", feeMin: 30000, feeMax: 65000, highlight: "JEE concepts with test analysis." },
        { id: "course-demo-4", name: "Class 12 Physics", classLevel: "Class 12", duration: "8 months", mode: "Online", feeMin: 18000, feeMax: 35000, highlight: "Live classes and revision notes." }
      ],
      feeRange: { currency: "INR", minimum: 18000, maximum: 65000, note: "Demo fee range." },
      teachers: [],
      results: [],
      facilities: ["Live classes", "AI notes", "Mock tests", "Progress reports"],
      timings: { weekdays: "Mon–Sat, 9 AM – 9 PM", weekend: "Sun, 10 AM – 3 PM" },
      address: { line1: "Main Coaching Street", area: "Sector 14", city: "Gurugram", state: "Haryana", pincode: "122001", mapUrl: "" },
      location: { lat: 28.4595, lng: 77.0266 },
      verification: { verified: false, label: "Demo listing" },
      visibility: { showFees: true, showTeachers: true, showResults: true, showContact: true },
      part: "Part 61 - Nearby Institutes",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: new Date().toISOString()
    }
  ];
}

function part61CleanText(value, max = 160) {
  return String(value ?? "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}

function part61Number(value, fallback = null) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function part61CityKey(city) {
  return part61CleanText(city, 80).toLowerCase();
}

function part61CoordinatesFromCity(city) {
  return part61DefaultCityCoordinates[part61CityKey(city)] || null;
}

function part61ExtractCoordinates(row = {}) {
  const directLat = part61Number(row?.location?.lat ?? row?.geo?.lat ?? row?.latitude, null);
  const directLng = part61Number(row?.location?.lng ?? row?.geo?.lng ?? row?.longitude, null);
  if (directLat !== null && directLng !== null) return { lat: directLat, lng: directLng, source: "profile" };
  const cityCoords = part61CoordinatesFromCity(row?.address?.city);
  if (cityCoords) return { lat: cityCoords.lat, lng: cityCoords.lng, source: "city" };
  return null;
}

function part61DistanceKm(a, b) {
  if (!a || !b) return null;
  const toRad = (value) => (value * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Number((earthKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))).toFixed(2));
}

function part61ProfileText(row = {}) {
  return [
    row.name,
    row.tagline,
    row.description,
    row.address?.city,
    row.address?.state,
    row.address?.area,
    ...(row.courses || []).flatMap((course) => [course.name, course.classLevel, course.mode, course.highlight]),
    ...(row.facilities || [])
  ].join(" ").toLowerCase();
}

function part61NearbyView(row = {}, origin = null) {
  const profile = typeof part59PublicProfileView === "function" ? part59PublicProfileView(row) : row;
  const coordinates = part61ExtractCoordinates(row);
  const distanceKm = origin && coordinates ? part61DistanceKm(origin, coordinates) : null;
  const firstCourse = (profile.courses || [])[0] || {};
  const city = profile.address?.city || "";
  return {
    profileId: profile.profileId,
    slug: profile.slug,
    name: profile.name,
    tagline: profile.tagline,
    description: profile.description,
    city,
    state: profile.address?.state || "",
    area: profile.address?.area || "",
    address: profile.address || {},
    logoUrl: profile.logoUrl || "/assets/naxora-logo.svg",
    courses: profile.courses || [],
    courseSummary: (profile.courses || []).map((course) => course.name).slice(0, 4),
    feeRange: profile.feeRange || null,
    facilities: profile.facilities || [],
    timings: profile.timings || {},
    contact: profile.contact || {},
    verified: profile.verification?.verified === true,
    verificationLabel: profile.verification?.label || (profile.verification?.verified ? "Verified" : "Unverified"),
    coordinates,
    distanceKm,
    distanceLabel: distanceKm === null ? "Distance unavailable" : `${distanceKm} km`,
    primaryCourse: firstCourse.name || "Courses available",
    profileUrl: `/public-institute-profile?profileId=${encodeURIComponent(profile.profileId || profile.slug || "")}`,
    callbackUrl: `/request-callback?profileId=${encodeURIComponent(profile.profileId || "")}&course=${encodeURIComponent(firstCourse.name || "")}&source=nearby_search`,
    compareReady: true,
    updatedAt: profile.updatedAt
  };
}

async function part61LoadProfiles() {
  let rows = [];
  let mode = "mock";
  try {
    const collection = typeof part59GetCollection === "function" ? await part59GetCollection() : null;
    if (collection) {
      rows = await collection.find({ status: "published" }).sort({ updatedAt: -1 }).limit(500).toArray();
      mode = "mongodb";
    }
  } catch (error) {
    rows = [];
  }
  if (!rows.length) rows = [...(globalThis.NAXORA_PART59_PROFILES || []), ...(globalThis.NAXORA_PART61_EXTRA_LISTINGS || [])];
  else rows = [...rows, ...(globalThis.NAXORA_PART61_EXTRA_LISTINGS || [])];
  const unique = new Map();
  for (const row of rows) {
    if (!row || row.status === "hidden") continue;
    const key = row.profileId || row.slug || row.id || row.name;
    if (!key || unique.has(key)) continue;
    unique.set(key, row);
  }
  return { mode, rows: [...unique.values()] };
}

function part61BuildOrigin(query = {}) {
  const lat = part61Number(query.lat, null);
  const lng = part61Number(query.lng, null);
  if (lat !== null && lng !== null) return { lat, lng, label: "Your selected location", source: "coordinates" };
  const city = part61CleanText(query.city, 80);
  const coords = part61CoordinatesFromCity(city);
  if (coords) return { ...coords, source: "city" };
  return null;
}

function part61FilterRows(rows = [], query = {}) {
  const city = part61CleanText(query.city, 80).toLowerCase();
  const course = part61CleanText(query.course || query.q, 120).toLowerCase();
  const mode = part61CleanText(query.mode, 50).toLowerCase();
  const verifiedOnly = String(query.verifiedOnly || query.verified || "false").toLowerCase() === "true";
  const radiusKm = Math.min(Math.max(part61Number(query.radiusKm, part61Config.defaultRadiusKm), 1), part61Config.maxRadiusKm);
  const origin = part61BuildOrigin(query);

  let results = rows
    .filter((row) => row.status !== "draft" && row.status !== "hidden")
    .filter((row) => {
      const haystack = part61ProfileText(row);
      if (city && !(row.address?.city || "").toLowerCase().includes(city)) return false;
      if (course && !haystack.includes(course)) return false;
      if (mode && !haystack.includes(mode)) return false;
      if (verifiedOnly && row.verification?.verified !== true) return false;
      return true;
    })
    .map((row) => part61NearbyView(row, origin));

  if (origin) {
    results = results.filter((row) => row.distanceKm === null || row.distanceKm <= radiusKm);
    results.sort((a, b) => (a.distanceKm ?? 999999) - (b.distanceKm ?? 999999));
  } else {
    results.sort((a, b) => Number(b.verified) - Number(a.verified) || String(a.name).localeCompare(String(b.name)));
  }

  return { results: results.slice(0, part61Config.resultLimit), origin, radiusKm };
}

app.get("/nearby-institutes", (req, res) => sendFileSafe(res, "nearby-institutes.html"));
app.get("/nearby", (req, res) => sendFileSafe(res, "nearby-institutes.html"));
app.get("/institutes-near-me", (req, res) => sendFileSafe(res, "nearby-institutes.html"));
app.get("/local-institutes", (req, res) => sendFileSafe(res, "nearby-institutes.html"));

app.get("/api/part61/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 61 - Nearby Institutes",
    status: "active",
    dbMode: mongoose.connection.readyState === 1 ? "mongodb" : "mock",
    purpose: "Location search, city filters, distance filters, course filters and verified institute listings.",
    currentVersionPlan: "Part 53–78 = NAXORA OS 1.0 completion. Part 79–110 = NAXORA OS 2.0 development.",
    nextPart: "Part 62 - Compare Institutes"
  });
});

app.get("/api/part61/config", (req, res) => {
  res.json({ success: true, part: "Part 61 - Nearby Institutes", config: part61Config });
});

app.get("/api/part61/nearby", async (req, res) => {
  const { mode, rows } = await part61LoadProfiles();
  const { results, origin, radiusKm } = part61FilterRows(rows, req.query || {});
  res.json({
    success: true,
    part: "Part 61 - Nearby Institutes",
    mode,
    count: results.length,
    origin,
    radiusKm,
    filters: {
      city: part61CleanText(req.query.city, 80),
      course: part61CleanText(req.query.course || req.query.q, 120),
      mode: part61CleanText(req.query.mode, 50),
      verifiedOnly: String(req.query.verifiedOnly || req.query.verified || "false").toLowerCase() === "true"
    },
    institutes: results
  });
});

app.get("/api/part61/cities", async (req, res) => {
  const { rows } = await part61LoadProfiles();
  const citySet = new Set(rows.map((row) => part61CleanText(row.address?.city, 80)).filter(Boolean));
  Object.values(part61DefaultCityCoordinates).forEach((city) => citySet.add(city.label));
  res.json({ success: true, count: citySet.size, cities: [...citySet].sort() });
});

app.get("/api/part61/courses", async (req, res) => {
  const { rows } = await part61LoadProfiles();
  const courseSet = new Set();
  rows.forEach((row) => (row.courses || []).forEach((course) => {
    if (course?.name) courseSet.add(part61CleanText(course.name, 120));
    if (course?.classLevel) courseSet.add(part61CleanText(course.classLevel, 80));
  }));
  res.json({ success: true, count: courseSet.size, courses: [...courseSet].filter(Boolean).sort() });
});

app.get("/api/part61/map-pins", async (req, res) => {
  const { rows, mode } = await part61LoadProfiles();
  const pins = rows.map((row) => part61NearbyView(row)).filter((row) => row.coordinates).map((row) => ({
    profileId: row.profileId,
    name: row.name,
    city: row.city,
    verified: row.verified,
    lat: row.coordinates.lat,
    lng: row.coordinates.lng,
    profileUrl: row.profileUrl,
    callbackUrl: row.callbackUrl
  }));
  res.json({ success: true, mode, count: pins.length, pins });
});

app.get("/api/part61/profile/:profileId", async (req, res) => {
  const { rows, mode } = await part61LoadProfiles();
  const id = part61CleanText(req.params.profileId, 140);
  const row = rows.find((item) => item.profileId === id || item.slug === id || item.id === id);
  if (!row) return res.status(404).json({ success: false, message: "Nearby institute profile nahi mila." });
  res.json({ success: true, mode, institute: part61NearbyView(row) });
});

app.get("/api/part61/checklist", (req, res) => {
  res.json({ success: true, part: "Part 61 - Nearby Institutes", checklist: part61Checklist });
});

app.get("/api/part61/export", async (req, res) => {
  const { mode, rows } = await part61LoadProfiles();
  const { results, origin, radiusKm } = part61FilterRows(rows, req.query || {});
  res.json({ success: true, mode, part: "Part 61 - Nearby Institutes", exportedAt: new Date().toISOString(), count: results.length, origin, radiusKm, institutes: results });
});

app.get("/api/part61/demo", async (req, res) => {
  const rows = [...(globalThis.NAXORA_PART59_PROFILES || []), ...(globalThis.NAXORA_PART61_EXTRA_LISTINGS || [])];
  const { results } = part61FilterRows(rows, { city: "Delhi", radiusKm: 80 });
  res.json({ success: true, part: "Part 61 - Nearby Institutes", count: results.length, institutes: results, config: part61Config, checklist: part61Checklist });
});
// ================= END PART 61 =================

// ================= PART 62: COMPARE INSTITUTES =================
// Roadmap goal: fees, distance, courses, results, facilities, ratings and demo availability compare karna.
// Safe rule: Part 62 reads public institute profiles and demo listings. It does not expose private institute data.
const part62Checklist = [
  "Compare Institutes page opens on /compare-institutes.",
  "Student can search institutes by city/course before comparison.",
  "Student can compare 2 to 4 institutes side-by-side.",
  "Comparison includes fees, distance, courses, results, facilities, ratings and demo availability.",
  "Request Callback link connects comparison to Part 60 enquiry flow.",
  "API works in MongoDB connected mode and mock fallback mode.",
  "No private student, fee ledger or admin data is exposed.",
  "No external paid API key is required for Part 62."
];

const part62CompareFields = [
  { key: "fees", label: "Fees Range", weight: 18, type: "lower_range", note: "Lower public fee range gets a better affordability score." },
  { key: "distance", label: "Distance", weight: 15, type: "lower", note: "Nearby institute gets a better location score when distance is available." },
  { key: "courses", label: "Courses", weight: 14, type: "coverage", note: "More relevant courses/class levels improve the match." },
  { key: "results", label: "Results", weight: 14, type: "count_quality", note: "Published achievements/results improve trust score." },
  { key: "facilities", label: "Facilities", weight: 12, type: "count", note: "Smart classroom, tests, doubts, online support etc. improve score." },
  { key: "rating", label: "Rating", weight: 12, type: "higher", note: "Public rating/review score if available." },
  { key: "demo", label: "Demo Availability", weight: 10, type: "boolean", note: "Demo class/callback availability improves conversion." },
  { key: "verified", label: "Verified Listing", weight: 5, type: "boolean", note: "Verified profile improves trust score." }
];

const part62Config = {
  minCompare: 2,
  maxCompare: 4,
  defaultCity: "Delhi",
  defaultRadiusKm: 80,
  compareFields: part62CompareFields,
  safeDataRule: "Part 62 sirf public institute profile/listing data compare karta hai. Private institute/students ka data expose nahi hota.",
  nextPart: "Part 63 - Discovery and Leads Integration"
};

function part62CleanText(value, max = 180) {
  return String(value ?? "").trim().slice(0, max);
}

function part62Number(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function part62Array(value) {
  return Array.isArray(value) ? value : [];
}

function part62CourseNames(row = {}) {
  return part62Array(row.courses).map((course) => part62CleanText(course?.name || course?.title || course?.classLevel, 90)).filter(Boolean);
}

function part62FeeRange(row = {}) {
  const courseFees = part62Array(row.courses).flatMap((course) => [course?.minFee, course?.maxFee, course?.fee, course?.price]).map((v) => part62Number(v, 0)).filter((v) => v > 0);
  const directFees = [row?.feesRange?.min, row?.feesRange?.max, row?.feeMin, row?.feeMax, row?.minFee, row?.maxFee].map((v) => part62Number(v, 0)).filter((v) => v > 0);
  const all = [...courseFees, ...directFees];
  if (!all.length) return { min: null, max: null, label: "Ask institute" };
  const min = Math.min(...all);
  const max = Math.max(...all);
  return { min, max, label: min === max ? `₹${min.toLocaleString("en-IN")}` : `₹${min.toLocaleString("en-IN")} - ₹${max.toLocaleString("en-IN")}` };
}

function part62Rating(row = {}) {
  const rating = part62Number(row.rating || row.averageRating || row.reviews?.rating, 0);
  if (rating > 0) return Math.min(Math.max(rating, 0), 5);
  const resultsCount = part62Array(row.results).length;
  const verifiedBoost = row.verified ? 0.3 : 0;
  return Math.min(5, 3.8 + Math.min(resultsCount, 4) * 0.2 + verifiedBoost);
}

function part62DemoAvailable(row = {}) {
  if (typeof row.demoAvailable === "boolean") return row.demoAvailable;
  const text = [row.demoAvailability, row.description, row.tagline, ...part62CourseNames(row)].join(" ").toLowerCase();
  return text.includes("demo") || text.includes("trial") || text.includes("callback") || true;
}

function part62ResultLabels(row = {}) {
  return part62Array(row.results).map((item) => part62CleanText(item?.achievement || item?.title || item?.exam || item, 120)).filter(Boolean).slice(0, 4);
}

function part62FacilityLabels(row = {}) {
  return part62Array(row.facilities).map((item) => part62CleanText(item?.name || item?.title || item, 90)).filter(Boolean).slice(0, 8);
}

function part62NormalizeInstitute(row = {}, origin = null) {
  const base = typeof part61NearbyView === "function" ? part61NearbyView(row, origin) : row;
  const fees = part62FeeRange(row);
  const courses = part62CourseNames(row);
  const facilities = part62FacilityLabels(row);
  const results = part62ResultLabels(row);
  const rating = part62Rating(row);
  const demoAvailable = part62DemoAvailable(row);
  const profileId = base.profileId || row.profileId || row.slug || row.id || `profile-${Date.now()}`;
  return {
    profileId,
    name: base.name || row.name || row.instituteName || "Institute",
    tagline: base.tagline || row.tagline || row.description || "Public institute profile available.",
    city: base.city || row.address?.city || row.city || "",
    area: base.area || row.address?.area || row.area || "",
    state: base.state || row.address?.state || row.state || "",
    distanceKm: base.distanceKm ?? null,
    distanceLabel: base.distanceLabel || (base.distanceKm ? `${base.distanceKm} km` : "City based"),
    verified: Boolean(base.verified ?? row.verified),
    verificationLabel: base.verificationLabel || (row.verified ? "Verified" : "Unverified"),
    courses,
    fees,
    facilities,
    results,
    rating: Number(rating.toFixed(1)),
    ratingLabel: `${Number(rating.toFixed(1))}/5`,
    demoAvailable,
    demoLabel: demoAvailable ? "Available" : "Ask institute",
    timings: row.timings || row.officeHours || "Ask institute",
    addressText: [base.area || row.address?.area, base.city || row.address?.city, base.state || row.address?.state].filter(Boolean).join(", "),
    profileUrl: `/public-institute-profile?profileId=${encodeURIComponent(profileId)}`,
    callbackUrl: `/request-callback?profileId=${encodeURIComponent(profileId)}&source=compare_institutes`,
    raw: row
  };
}

function part62ScoreInstitute(item = {}, query = {}) {
  let score = 0;
  const reasons = [];
  if (item.verified) { score += 5; reasons.push("Verified profile"); }
  if (item.demoAvailable) { score += 10; reasons.push("Demo/callback available"); }
  if (item.rating) score += Math.min(item.rating / 5, 1) * 12;
  if (item.facilities?.length) score += Math.min(item.facilities.length, 6) / 6 * 12;
  if (item.results?.length) { score += Math.min(item.results.length, 4) / 4 * 14; reasons.push("Results/achievements published"); }
  if (item.courses?.length) score += Math.min(item.courses.length, 5) / 5 * 14;
  if (item.fees?.min) score += Math.max(0, 18 - Math.min(item.fees.min / 10000, 18));
  if (item.distanceKm !== null && item.distanceKm !== undefined) score += Math.max(0, 15 - Math.min(item.distanceKm, 50) / 50 * 15);
  const requestedCourse = part62CleanText(query.course || query.q, 120).toLowerCase();
  if (requestedCourse && item.courses.join(" ").toLowerCase().includes(requestedCourse)) { score += 8; reasons.push("Course match"); }
  return { score: Math.round(Math.min(score, 100)), reasons: reasons.slice(0, 4) };
}

function part62BuildComparison(items = [], query = {}) {
  const normalized = items.map((item) => {
    const scoring = part62ScoreInstitute(item, query);
    return { ...item, score: scoring.score, scoreReasons: scoring.reasons };
  }).sort((a, b) => b.score - a.score);
  const winner = normalized[0] || null;
  const matrix = part62CompareFields.map((field) => ({
    key: field.key,
    label: field.label,
    weight: field.weight,
    note: field.note,
    values: normalized.map((item) => {
      const map = {
        fees: item.fees?.label || "Ask institute",
        distance: item.distanceLabel || "City based",
        courses: item.courses?.length ? item.courses.join(", ") : "Ask institute",
        results: item.results?.length ? item.results.join(", ") : "Not published yet",
        facilities: item.facilities?.length ? item.facilities.join(", ") : "Ask institute",
        rating: item.ratingLabel || "Not rated",
        demo: item.demoLabel || "Ask institute",
        verified: item.verified ? "Verified" : "Unverified"
      };
      return { profileId: item.profileId, value: map[field.key] || "-" };
    })
  }));
  return {
    institutes: normalized,
    winner: winner ? { profileId: winner.profileId, name: winner.name, score: winner.score, reasons: winner.scoreReasons } : null,
    matrix,
    summary: normalized.length ? `${normalized.length} institute(s) compared. Top match: ${winner.name} (${winner.score}/100).` : "No institutes selected for comparison."
  };
}

async function part62LoadRows() {
  if (typeof part61LoadProfiles === "function") return part61LoadProfiles();
  const rows = [...(globalThis.NAXORA_PART59_PROFILES || []), ...(globalThis.NAXORA_PART61_EXTRA_LISTINGS || [])];
  return { mode: "mock", rows };
}

async function part62CandidateRows(query = {}) {
  const { mode, rows } = await part62LoadRows();
  const city = part62CleanText(query.city, 80).toLowerCase();
  const course = part62CleanText(query.course || query.q, 120).toLowerCase();
  const verifiedOnly = String(query.verifiedOnly || "").toLowerCase() === "true" || query.verifiedOnly === "on";
  const radiusKm = Math.min(Math.max(part62Number(query.radiusKm, part62Config.defaultRadiusKm), 1), 150);
  const origin = typeof part61BuildOrigin === "function" ? part61BuildOrigin(query) : null;
  const filtered = rows.filter((row) => {
    const profile = typeof part59PublicProfileView === "function" ? part59PublicProfileView(row) : row;
    const haystack = typeof part61ProfileText === "function" ? part61ProfileText(row) : JSON.stringify(row).toLowerCase();
    if (city && !haystack.includes(city)) return false;
    if (course && !haystack.includes(course)) return false;
    const verified = profile.verification?.verified === true || row.verified === true;
    if (verifiedOnly && !verified) return false;
    if (origin && typeof part61ExtractCoordinates === "function" && typeof part61DistanceKm === "function") {
      const coords = part61ExtractCoordinates(row);
      if (coords) {
        const distance = part61DistanceKm(origin, coords);
        if (distance > radiusKm) return false;
      }
    }
    return true;
  });
  const normalized = filtered.map((row) => part62NormalizeInstitute(row, origin));
  return { mode, origin, rows: normalized };
}

function part62SelectedIds(req) {
  const fromQuery = part62CleanText(req.query.ids || req.query.profileIds || "", 800);
  const fromBody = Array.isArray(req.body?.profileIds) ? req.body.profileIds.join(",") : part62CleanText(req.body?.ids || req.body?.profileIds || "", 800);
  return (fromBody || fromQuery).split(",").map((id) => part62CleanText(id, 140)).filter(Boolean).slice(0, part62Config.maxCompare);
}

app.get("/compare-institutes", (req, res) => sendFileSafe(res, "compare-institutes.html"));
app.get("/compare", (req, res) => sendFileSafe(res, "compare-institutes.html"));
app.get("/institute-comparison", (req, res) => sendFileSafe(res, "compare-institutes.html"));
app.get("/compare-coaching", (req, res) => sendFileSafe(res, "compare-institutes.html"));

app.get("/api/part62/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 62 - Compare Institutes",
    status: "active",
    dbMode: mongoose.connection.readyState === 1 ? "mongodb" : "mock",
    purpose: "Students fees, distance, courses, results, facilities, ratings aur demo availability compare kar sakte hain.",
    roadmap: "Part 62 milestone: first beta institute ke liye discovery flow usable ban raha hai.",
    nextPart: part62Config.nextPart,
    routes: ["/compare-institutes", "/compare", "/api/part62/status", "/api/part62/compare"]
  });
});

app.get("/api/part62/config", (req, res) => {
  res.json({ success: true, part: "Part 62 - Compare Institutes", config: part62Config });
});

app.get("/api/part62/candidates", async (req, res) => {
  const { mode, rows, origin } = await part62CandidateRows(req.query || {});
  const candidates = rows.map((row) => ({ ...row, compareUrl: `/compare-institutes?ids=${encodeURIComponent(row.profileId)}` }));
  res.json({ success: true, mode, part: "Part 62 - Compare Institutes", count: candidates.length, origin, candidates });
});

async function part62CompareHandler(req, res) {
  const ids = part62SelectedIds(req);
  const { mode, rows, origin } = await part62CandidateRows({ ...(req.query || {}), ...(req.body || {}) });
  let selected = ids.length ? rows.filter((row) => ids.includes(row.profileId) || ids.includes(row.slug) || ids.includes(row.id)) : rows.slice(0, part62Config.maxCompare);
  if (selected.length < part62Config.minCompare && rows.length >= part62Config.minCompare) {
    const missing = rows.filter((row) => !selected.some((item) => item.profileId === row.profileId)).slice(0, part62Config.minCompare - selected.length);
    selected = [...selected, ...missing];
  }
  selected = selected.slice(0, part62Config.maxCompare).map((row) => row.raw ? row : part62NormalizeInstitute(row, origin));
  const comparison = part62BuildComparison(selected, { ...(req.query || {}), ...(req.body || {}) });
  res.json({
    success: true,
    mode,
    part: "Part 62 - Compare Institutes",
    selectedCount: selected.length,
    minCompare: part62Config.minCompare,
    maxCompare: part62Config.maxCompare,
    comparison,
    note: selected.length < part62Config.minCompare ? "Compare ke liye kam se kam 2 institutes chahiye." : "Comparison ready."
  });
}

app.get("/api/part62/compare", part62CompareHandler);
app.post("/api/part62/compare", part62CompareHandler);

app.get("/api/part62/matrix", async (req, res) => {
  const { mode, rows, origin } = await part62CandidateRows(req.query || {});
  const selected = rows.slice(0, part62Config.maxCompare).map((row) => row.raw ? row : part62NormalizeInstitute(row, origin));
  const comparison = part62BuildComparison(selected, req.query || {});
  res.json({ success: true, mode, part: "Part 62 - Compare Institutes", matrix: comparison.matrix, institutes: comparison.institutes, winner: comparison.winner });
});

app.get("/api/part62/recommendations", async (req, res) => {
  const { mode, rows, origin } = await part62CandidateRows(req.query || {});
  const scored = rows.map((row) => {
    const item = row.raw ? row : part62NormalizeInstitute(row, origin);
    const scoring = part62ScoreInstitute(item, req.query || {});
    return { ...item, score: scoring.score, scoreReasons: scoring.reasons };
  }).sort((a, b) => b.score - a.score).slice(0, 6);
  res.json({ success: true, mode, part: "Part 62 - Compare Institutes", count: scored.length, recommendations: scored });
});

app.get("/api/part62/checklist", (req, res) => {
  res.json({ success: true, part: "Part 62 - Compare Institutes", checklist: part62Checklist });
});

app.get("/api/part62/export", async (req, res) => {
  const { mode, rows, origin } = await part62CandidateRows(req.query || {});
  const selected = rows.slice(0, part62Config.maxCompare).map((row) => row.raw ? row : part62NormalizeInstitute(row, origin));
  const comparison = part62BuildComparison(selected, req.query || {});
  res.json({ success: true, mode, part: "Part 62 - Compare Institutes", exportedAt: new Date().toISOString(), comparison, config: part62Config });
});

app.get("/api/part62/demo", async (req, res) => {
  const { rows, origin } = await part62CandidateRows({ city: "Delhi", radiusKm: 80 });
  const comparison = part62BuildComparison(rows.slice(0, part62Config.maxCompare), { city: "Delhi" });
  res.json({ success: true, part: "Part 62 - Compare Institutes", comparison, config: part62Config, checklist: part62Checklist });
});
// ================= END PART 62 =================



// ================= PART 63: DISCOVERY AND LEADS INTEGRATION =================
// Roadmap goal: Public profiles, nearby search, comparison, enquiries aur follow-ups ko ek complete student-to-admission journey me connect karna.
// Safe rule: Part 63 integrates public discovery + consented enquiry + CRM follow-up data. It does not expose private student/admin data.
const part63Checklist = [
  "Discovery Leads Integration page opens on /discovery-leads-integration.",
  "Public profiles from Part 59 are connected to search/discovery journey.",
  "Nearby search from Part 61 is connected to discovery journey.",
  "Compare Institutes from Part 62 is connected to decision journey.",
  "Request Callback / Send Enquiry from Part 60 is connected to lead capture.",
  "Enquiry Follow-Up CRM from Part 58 is connected to follow-up and conversion status.",
  "Consent-based lead sharing rule is visible and enforced at journey level.",
  "No private student fee/attendance/admin data is exposed in public discovery APIs.",
  "Mock mode fallback works even if MongoDB data is empty."
];

const part63Stages = [
  { id: "profile", label: "Public Profile", route: "/public-institute-profile", api: "/api/part59/profile", owner: "Part 59", purpose: "Student/parent institute ka public information dekhta hai." },
  { id: "nearby", label: "Nearby Search", route: "/nearby-institutes", api: "/api/part61/nearby", owner: "Part 61", purpose: "Student city, course aur distance filter se institutes find karta hai." },
  { id: "compare", label: "Compare", route: "/compare-institutes", api: "/api/part62/compare", owner: "Part 62", purpose: "Student fees, distance, courses, facilities aur results compare karta hai." },
  { id: "enquiry", label: "Request Callback", route: "/request-callback", api: "/api/part60/enquiry", owner: "Part 60", purpose: "Student/parent consent ke saath enquiry bhejta hai." },
  { id: "followup", label: "CRM Follow-Up", route: "/enquiry-followup-crm", api: "/api/part58/leads", owner: "Part 58", purpose: "Counsellor call notes, reminders aur lead status manage karta hai." },
  { id: "conversion", label: "Admission Conversion", route: "/smart-enrolment", api: "/api/part56/enrolments", owner: "Part 56", purpose: "Interested lead ko student enrolment/admission me convert kiya jata hai." }
];

const part63Config = {
  journeyName: "Discovery to Admission Journey",
  publicSafeFields: ["profileId", "name", "city", "area", "courses", "fees", "verified", "rating", "demoAvailable", "profileUrl", "callbackUrl", "compareUrl", "crmUrl"],
  consentRule: "Lead sharing sirf tab valid hai jab enquiry/callback form me consent accepted ho. Public discovery APIs private student/admin data expose nahi karti.",
  connectedParts: ["Part 59 Public Profile", "Part 61 Nearby Search", "Part 62 Compare", "Part 60 Enquiry", "Part 58 Follow-Up CRM"],
  nextPart: "Part 64 - Live Classes Completion"
};

globalThis.NAXORA_PART63_EVENTS = globalThis.NAXORA_PART63_EVENTS || [];

function part63CleanText(value, max = 180) {
  return String(value ?? "").trim().slice(0, max);
}

function part63Array(value) {
  return Array.isArray(value) ? value : [];
}

function part63PhoneKey(value) {
  return String(value ?? "").replace(/\D/g, "").slice(-10);
}

function part63ProfileId(row = {}) {
  return part63CleanText(row.profileId || row.slug || row.id || row.instituteId || row.instituteProfileId || "", 140);
}

async function part63Profiles(query = {}) {
  if (typeof part62CandidateRows === "function") {
    const { mode, rows, origin } = await part62CandidateRows(query || {});
    return { mode, origin, rows: rows.map((row) => row.raw ? part62NormalizeInstitute(row.raw, origin) : row) };
  }
  let rows = [];
  let mode = "mock";
  if (typeof part59GetCollection === "function") {
    const collection = await part59GetCollection();
    if (collection) {
      rows = await collection.find({}).sort({ updatedAt: -1 }).limit(300).toArray();
      mode = "mongodb";
    }
  }
  if (!rows.length) rows = globalThis.NAXORA_PART59_PROFILES || [];
  return { mode, origin: null, rows: rows.map((row) => typeof part62NormalizeInstitute === "function" ? part62NormalizeInstitute(row) : row) };
}

async function part63Enquiries() {
  let rows = [];
  let mode = "mock";
  if (typeof part60GetCollection === "function") {
    const collection = await part60GetCollection();
    if (collection) {
      rows = await collection.find({}).sort({ createdAt: -1 }).limit(500).toArray();
      mode = "mongodb";
    }
  }
  if (!rows.length) rows = globalThis.NAXORA_PART60_ENQUIRIES || [];
  return { mode, rows: rows.map((row) => typeof part60PublicRequestView === "function" ? part60PublicRequestView(row) : row) };
}

async function part63Leads() {
  let rows = [];
  let mode = "mock";
  if (typeof part58GetCollection === "function") {
    const collection = await part58GetCollection();
    if (collection) {
      rows = await collection.find({}).sort({ updatedAt: -1 }).limit(500).toArray();
      mode = "mongodb";
    }
  }
  if (!rows.length) rows = globalThis.NAXORA_PART58_LEADS || [];
  return { mode, rows: rows.map((row) => typeof part58PublicLeadView === "function" ? part58PublicLeadView(row) : row) };
}

function part63PublicInstitute(row = {}, query = {}) {
  const profileId = part63ProfileId(row) || `profile-${Date.now()}`;
  const courseText = part63Array(row.courses).map((course) => part63CleanText(course?.name || course?.title || course, 80)).filter(Boolean);
  const city = part63CleanText(row.city || row.address?.city || "", 80);
  return {
    profileId,
    name: part63CleanText(row.name || row.instituteName || "Institute", 120),
    tagline: part63CleanText(row.tagline || row.description || "Public institute profile available.", 220),
    city,
    area: part63CleanText(row.area || row.address?.area || "", 80),
    distanceLabel: row.distanceLabel || (row.distanceKm !== null && row.distanceKm !== undefined ? `${row.distanceKm} km` : "City based"),
    verified: Boolean(row.verified || row.verification?.verified),
    courses: courseText,
    fees: row.fees || row.feesRange || { label: "Ask institute" },
    ratingLabel: row.ratingLabel || (row.rating ? `${row.rating}/5` : "Not rated"),
    demoLabel: row.demoLabel || (row.demoAvailable ? "Available" : "Ask institute"),
    profileUrl: `/public-institute-profile?profileId=${encodeURIComponent(profileId)}`,
    nearbyUrl: `/nearby-institutes?city=${encodeURIComponent(city || query.city || "")}&course=${encodeURIComponent(query.course || query.q || "")}`,
    compareUrl: `/compare-institutes?ids=${encodeURIComponent(profileId)}&city=${encodeURIComponent(city || query.city || "")}`,
    callbackUrl: `/request-callback?profileId=${encodeURIComponent(profileId)}&course=${encodeURIComponent((courseText[0] || query.course || ""))}&source=discovery_integration`,
    crmUrl: `/enquiry-followup-crm?profileId=${encodeURIComponent(profileId)}`
  };
}

function part63MatchEnquiryToProfile(enquiry = {}, profileId = "") {
  const id = part63CleanText(profileId, 140);
  return [enquiry.profileId, enquiry.instituteProfileId, enquiry.instituteId, enquiry.slug].some((value) => part63CleanText(value, 140) === id);
}

function part63BuildJourneyForProfile(profile = {}, enquiries = [], leads = [], query = {}) {
  const publicProfile = part63PublicInstitute(profile, query);
  const relatedEnquiries = enquiries.filter((item) => part63MatchEnquiryToProfile(item, publicProfile.profileId));
  const relatedPhones = new Set(relatedEnquiries.map((item) => part63PhoneKey(item.phone || item.parentPhone || item.mobile)).filter(Boolean));
  const relatedLeads = leads.filter((lead) => {
    const leadProfileId = part63CleanText(lead.profileId || lead.instituteProfileId || lead.instituteId || "", 140);
    if (leadProfileId && leadProfileId === publicProfile.profileId) return true;
    const leadPhone = part63PhoneKey(lead.phone || lead.parentPhone || lead.mobile);
    return leadPhone && relatedPhones.has(leadPhone);
  });
  const converted = relatedLeads.filter((lead) => lead.status === "converted" || lead.conversion?.converted).length;
  const openFollowups = relatedLeads.filter((lead) => !["converted", "lost", "not_interested"].includes(lead.status)).length;
  const consented = relatedEnquiries.filter((item) => item.consentAccepted || item.consent?.accepted || item.consent === true).length;
  const score = Math.min(100, (publicProfile.verified ? 15 : 0) + Math.min(relatedEnquiries.length * 18, 36) + Math.min(relatedLeads.length * 16, 32) + converted * 17);
  return {
    ...publicProfile,
    journeyScore: score,
    journeyHealth: score >= 70 ? "strong" : score >= 35 ? "active" : "needs_leads",
    enquiryCount: relatedEnquiries.length,
    consentedEnquiries: consented,
    crmLeadCount: relatedLeads.length,
    openFollowups,
    convertedCount: converted,
    nextAction: converted ? "Track converted admissions" : relatedEnquiries.length ? "Follow up in CRM" : "Promote profile and collect enquiry",
    connected: {
      publicProfile: true,
      nearbySearch: true,
      comparison: true,
      enquiryCapture: relatedEnquiries.length > 0,
      crmFollowup: relatedLeads.length > 0,
      admissionConversion: converted > 0
    }
  };
}

async function part63BuildJourney(query = {}) {
  const profilesData = await part63Profiles(query);
  const enquiriesData = await part63Enquiries();
  const leadsData = await part63Leads();
  const institutes = profilesData.rows.map((row) => part63BuildJourneyForProfile(row, enquiriesData.rows, leadsData.rows, query));
  const city = part63CleanText(query.city, 80).toLowerCase();
  const course = part63CleanText(query.course || query.q, 120).toLowerCase();
  const filtered = institutes.filter((item) => {
    const text = [item.name, item.city, item.area, item.tagline, ...(item.courses || [])].join(" ").toLowerCase();
    if (city && !text.includes(city)) return false;
    if (course && !text.includes(course)) return false;
    return true;
  }).sort((a, b) => b.journeyScore - a.journeyScore).slice(0, 24);
  return { mode: profilesData.mode, institutes: filtered, allInstitutes: institutes, enquiries: enquiriesData.rows, leads: leadsData.rows };
}

function part63Funnel(institutes = [], enquiries = [], leads = []) {
  const converted = leads.filter((lead) => lead.status === "converted" || lead.conversion?.converted).length;
  const followups = leads.filter((lead) => !["converted", "lost", "not_interested"].includes(lead.status)).length;
  const consented = enquiries.filter((item) => item.consentAccepted || item.consent?.accepted || item.consent === true).length;
  return {
    publicProfiles: institutes.length,
    searchableProfiles: institutes.filter((item) => item.verified || item.city || item.courses?.length).length,
    comparisonReady: institutes.filter((item) => item.compareUrl).length,
    enquiries: enquiries.length,
    consentedEnquiries: consented,
    crmLeads: leads.length,
    openFollowups: followups,
    convertedAdmissions: converted,
    enquiryToLeadRate: enquiries.length ? Math.round((leads.length / enquiries.length) * 100) : 0,
    leadToConversionRate: leads.length ? Math.round((converted / leads.length) * 100) : 0
  };
}

app.get("/discovery-leads-integration", (req, res) => sendFileSafe(res, "discovery-leads-integration.html"));
app.get("/discovery-journey", (req, res) => sendFileSafe(res, "discovery-leads-integration.html"));
app.get("/admission-journey", (req, res) => sendFileSafe(res, "discovery-leads-integration.html"));
app.get("/lead-integration", (req, res) => sendFileSafe(res, "discovery-leads-integration.html"));

app.get("/api/part63/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 63 - Discovery and Leads Integration",
    status: "active",
    dbMode: mongoose.connection.readyState === 1 ? "mongodb" : "mock",
    purpose: "Public profiles, nearby search, comparison, enquiries aur follow-ups ko ek complete student-to-admission journey me connect karna.",
    connectedParts: part63Config.connectedParts,
    nextPart: part63Config.nextPart,
    routes: ["/discovery-leads-integration", "/api/part63/journey", "/api/part63/funnel", "/api/part63/lead-map"]
  });
});

app.get("/api/part63/config", (req, res) => {
  res.json({ success: true, part: "Part 63 - Discovery and Leads Integration", config: part63Config, stages: part63Stages });
});

app.get("/api/part63/journey", async (req, res) => {
  const journey = await part63BuildJourney(req.query || {});
  res.json({
    success: true,
    part: "Part 63 - Discovery and Leads Integration",
    mode: journey.mode,
    count: journey.institutes.length,
    stages: part63Stages,
    funnel: part63Funnel(journey.allInstitutes, journey.enquiries, journey.leads),
    institutes: journey.institutes
  });
});

app.get("/api/part63/funnel", async (req, res) => {
  const journey = await part63BuildJourney(req.query || {});
  res.json({ success: true, part: "Part 63 - Discovery and Leads Integration", mode: journey.mode, funnel: part63Funnel(journey.allInstitutes, journey.enquiries, journey.leads) });
});

app.get("/api/part63/lead-map", async (req, res) => {
  const journey = await part63BuildJourney(req.query || {});
  const leadMap = journey.institutes.map((item) => ({
    profileId: item.profileId,
    name: item.name,
    journeyHealth: item.journeyHealth,
    enquiryCount: item.enquiryCount,
    crmLeadCount: item.crmLeadCount,
    openFollowups: item.openFollowups,
    convertedCount: item.convertedCount,
    nextAction: item.nextAction,
    profileUrl: item.profileUrl,
    compareUrl: item.compareUrl,
    callbackUrl: item.callbackUrl,
    crmUrl: item.crmUrl
  }));
  res.json({ success: true, part: "Part 63 - Discovery and Leads Integration", count: leadMap.length, leadMap });
});

app.get("/api/part63/profile/:profileId/journey", async (req, res) => {
  const id = part63CleanText(req.params.profileId, 140);
  const journey = await part63BuildJourney(req.query || {});
  const found = journey.allInstitutes.find((item) => item.profileId === id || item.slug === id || item.id === id);
  if (!found) return res.status(404).json({ success: false, message: "Profile journey nahi mila." });
  const row = part63BuildJourneyForProfile(found.raw || found, journey.enquiries, journey.leads, req.query || {});
  res.json({ success: true, part: "Part 63 - Discovery and Leads Integration", journey: row, stages: part63Stages });
});

app.get("/api/part63/recommend-next-actions", async (req, res) => {
  const journey = await part63BuildJourney(req.query || {});
  const actions = [];
  const funnel = part63Funnel(journey.allInstitutes, journey.enquiries, journey.leads);
  if (funnel.publicProfiles === 0) actions.push("Part 59 me public institute profile create/publish karo.");
  if (funnel.enquiries === 0) actions.push("Part 60 request callback form ko public profile/nearby pages se test karo.");
  if (funnel.crmLeads === 0) actions.push("Part 58 CRM me incoming enquiries ko lead pipeline se connect/test karo.");
  if (funnel.openFollowups > 0) actions.push("Open follow-ups ko counsellor ke daily task list me handle karo.");
  if (!actions.length) actions.push("Discovery journey healthy hai. Ab conversion reports aur next Part 64 live classes flow continue karo.");
  res.json({ success: true, part: "Part 63 - Discovery and Leads Integration", funnel, actions });
});

app.post("/api/part63/connect", (req, res) => {
  const event = {
    id: `P63-EVT-${Date.now()}`,
    type: part63CleanText(req.body?.type || "manual_check", 80),
    profileId: part63CleanText(req.body?.profileId || "", 140),
    requestId: part63CleanText(req.body?.requestId || "", 140),
    leadId: part63CleanText(req.body?.leadId || "", 140),
    note: part63CleanText(req.body?.note || "Manual Part 63 journey connection event.", 240),
    createdAt: new Date().toISOString()
  };
  globalThis.NAXORA_PART63_EVENTS.unshift(event);
  res.status(201).json({ success: true, mode: "mock", part: "Part 63 - Discovery and Leads Integration", message: "Journey connection event saved in safe mock memory. No external message sent.", event });
});

app.get("/api/part63/checklist", (req, res) => {
  res.json({ success: true, part: "Part 63 - Discovery and Leads Integration", checklist: part63Checklist });
});

app.get("/api/part63/export", async (req, res) => {
  const journey = await part63BuildJourney(req.query || {});
  res.json({
    success: true,
    part: "Part 63 - Discovery and Leads Integration",
    exportedAt: new Date().toISOString(),
    config: part63Config,
    stages: part63Stages,
    funnel: part63Funnel(journey.allInstitutes, journey.enquiries, journey.leads),
    institutes: journey.institutes,
    events: globalThis.NAXORA_PART63_EVENTS.slice(0, 100)
  });
});

app.get("/api/part63/demo", async (req, res) => {
  const journey = await part63BuildJourney({ city: "Delhi", radiusKm: 80 });
  res.json({ success: true, part: "Part 63 - Discovery and Leads Integration", stages: part63Stages, funnel: part63Funnel(journey.allInstitutes, journey.enquiries, journey.leads), institutes: journey.institutes.slice(0, 5), checklist: part63Checklist });
});
// ================= END PART 63 =================


// ================= PART 64: LIVE CLASSES COMPLETION =================
// Roadmap scope: batch-wise class schedule, meeting link, join button, reminder,
// online attendance, recording, notes/assignment foundation.
const part64Checklist = [
  "Batch-wise live class schedule open hota hai",
  "Meeting link safe URL field ke through save/read hota hai",
  "Join button active sirf valid meeting link par dikhta hai",
  "Reminder foundation ready hai, real WhatsApp/SMS Part 65 me aayega",
  "Online attendance join/leave status record hota hai",
  "Recording link class ke baad attach ho sakta hai",
  "Notes/assignment link aur due date class ke saath attach ho sakti hai",
  "MongoDB connected mode me collection use hoti hai, warna mock fallback safe hai"
];

const part64Config = {
  part: "Part 64 - Live Classes Completion",
  status: "active",
  purpose: "Institute ko online classes chalane ke liye batch-wise schedule, join link, reminder foundation, attendance, recording aur notes/assignment flow dena.",
  routes: [
    "/live-classes-completion",
    "/live-classes",
    "/api/part64/status",
    "/api/part64/classes",
    "/api/part64/today",
    "/api/part64/analytics"
  ],
  importantNote: "Real video hosting ya native live classroom yahan nahi dala. External meeting link safe foundation hai; native classroom v2.0 Part 94 onwards me aayega.",
  nextPart: "Part 65 - WhatsApp, SMS and Email Integration"
};

function part64CleanText(value, max = 220) {
  return String(value ?? "").trim().replace(/[<>]/g, "").slice(0, max);
}

function part64SafeUrl(value) {
  const raw = part64CleanText(value, 500);
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (!["https:", "http:"].includes(parsed.protocol)) return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function part64DateValue(value, fallback = null) {
  const raw = part64CleanText(value, 80);
  const date = raw ? new Date(raw) : null;
  if (date && !Number.isNaN(date.getTime())) return date.toISOString();
  return fallback;
}

function part64NowPlus(hours = 0) {
  const date = new Date(Date.now() + Number(hours || 0) * 60 * 60 * 1000);
  return date.toISOString();
}

if (!globalThis.NAXORA_PART64_CLASSES) {
  globalThis.NAXORA_PART64_CLASSES = [
    {
      classId: "P64-LIVE-001",
      title: "Class 10 Science - Motion Revision",
      batchName: "Class 10 Foundation A",
      subject: "Science",
      teacherName: "Demo Teacher",
      classMode: "online",
      startTime: part64NowPlus(2),
      endTime: part64NowPlus(3),
      meetingLink: "https://meet.google.com/demo-naxora-class",
      status: "scheduled",
      reminderStatus: "pending",
      recordingUrl: "",
      notesUrl: "",
      assignmentTitle: "Motion numericals practice set",
      assignmentDueDate: part64NowPlus(48),
      attendance: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      demoSeed: true
    },
    {
      classId: "P64-LIVE-002",
      title: "JEE Foundation Maths - Algebra Basics",
      batchName: "JEE Foundation Weekend",
      subject: "Mathematics",
      teacherName: "NAXORA Faculty",
      classMode: "hybrid",
      startTime: part64NowPlus(24),
      endTime: part64NowPlus(25),
      meetingLink: "https://zoom.us/j/1234567890",
      status: "scheduled",
      reminderStatus: "pending",
      recordingUrl: "",
      notesUrl: "",
      assignmentTitle: "Algebra worksheet 1",
      assignmentDueDate: part64NowPlus(72),
      attendance: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      demoSeed: true
    }
  ];
}

globalThis.NAXORA_PART64_REMINDERS = globalThis.NAXORA_PART64_REMINDERS || [];

async function part64GetCollection() {
  if (globalThis.NAXORA_DB_MODE === "mongodb" && mongoose.connection?.readyState === 1) {
    return mongoose.connection.collection("part64liveclasses");
  }
  return null;
}

function part64NormalizeClass(input = {}) {
  const startFallback = part64NowPlus(1);
  const endFallback = part64NowPlus(2);
  const classId = part64CleanText(input.classId || input.id || `P64-LIVE-${Date.now()}`, 80);
  const startTime = part64DateValue(input.startTime || input.dateTime || input.scheduleAt, startFallback);
  const endTime = part64DateValue(input.endTime, endFallback);
  const meetingLink = part64SafeUrl(input.meetingLink || input.joinUrl || input.link);
  return {
    classId,
    title: part64CleanText(input.title || input.classTitle || "Live Class", 160),
    batchName: part64CleanText(input.batchName || input.batch || "General Batch", 120),
    batchId: part64CleanText(input.batchId || "", 80),
    subject: part64CleanText(input.subject || "General", 80),
    teacherName: part64CleanText(input.teacherName || input.teacher || "Teacher", 120),
    teacherId: part64CleanText(input.teacherId || "", 80),
    classMode: ["online", "offline", "hybrid"].includes(part64CleanText(input.classMode || input.mode, 30)) ? part64CleanText(input.classMode || input.mode, 30) : "online",
    startTime,
    endTime,
    meetingLink,
    joinEnabled: Boolean(meetingLink),
    status: ["draft", "scheduled", "live", "completed", "cancelled"].includes(part64CleanText(input.status, 40)) ? part64CleanText(input.status, 40) : "scheduled",
    reminderStatus: ["pending", "queued", "sent", "disabled"].includes(part64CleanText(input.reminderStatus, 40)) ? part64CleanText(input.reminderStatus, 40) : "pending",
    recordingUrl: part64SafeUrl(input.recordingUrl || input.recordingLink),
    notesUrl: part64SafeUrl(input.notesUrl || input.notesLink),
    assignmentTitle: part64CleanText(input.assignmentTitle || input.assignment || "", 160),
    assignmentDueDate: part64DateValue(input.assignmentDueDate || input.dueDate, ""),
    description: part64CleanText(input.description || input.note || "", 400),
    attendance: Array.isArray(input.attendance) ? input.attendance.slice(0, 500) : [],
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function part64PublicClass(row = {}) {
  const normalized = part64NormalizeClass(row);
  const now = Date.now();
  const startMs = new Date(normalized.startTime).getTime();
  const endMs = new Date(normalized.endTime).getTime();
  const liveWindow = now >= startMs - 15 * 60 * 1000 && now <= endMs + 15 * 60 * 1000;
  return {
    ...normalized,
    isJoinAvailable: Boolean(normalized.meetingLink && normalized.status !== "cancelled" && liveWindow),
    minutesToStart: Number.isFinite(startMs) ? Math.round((startMs - now) / 60000) : null,
    attendanceCount: Array.isArray(row.attendance) ? row.attendance.length : 0,
    hasRecording: Boolean(normalized.recordingUrl),
    hasNotes: Boolean(normalized.notesUrl || normalized.assignmentTitle)
  };
}

async function part64FindClass(classId) {
  const cleanId = part64CleanText(classId, 80);
  const collection = await part64GetCollection();
  if (collection) {
    const row = await collection.findOne({ classId: cleanId });
    return { collection, row };
  }
  return { collection: null, row: globalThis.NAXORA_PART64_CLASSES.find((item) => item.classId === cleanId || item.id === cleanId) };
}

function part64FilterRows(rows = [], query = {}) {
  const batch = part64CleanText(query.batch || query.batchName, 120).toLowerCase();
  const status = part64CleanText(query.status, 40).toLowerCase();
  const subject = part64CleanText(query.subject, 80).toLowerCase();
  const todayOnly = part64CleanText(query.today, 10) === "true";
  const today = new Date().toISOString().slice(0, 10);
  return rows.map(part64PublicClass).filter((item) => {
    if (batch && !String(item.batchName || "").toLowerCase().includes(batch)) return false;
    if (status && String(item.status || "").toLowerCase() !== status) return false;
    if (subject && !String(item.subject || "").toLowerCase().includes(subject)) return false;
    if (todayOnly && !String(item.startTime || "").startsWith(today)) return false;
    return true;
  }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}

function part64Analytics(rows = []) {
  const classes = rows.map(part64PublicClass);
  const byStatus = classes.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});
  return {
    totalClasses: classes.length,
    scheduled: byStatus.scheduled || 0,
    live: byStatus.live || 0,
    completed: byStatus.completed || 0,
    cancelled: byStatus.cancelled || 0,
    joinLinksReady: classes.filter((item) => item.meetingLink).length,
    remindersPending: classes.filter((item) => item.reminderStatus === "pending").length,
    recordingsAttached: classes.filter((item) => item.hasRecording).length,
    notesAssignmentsAttached: classes.filter((item) => item.hasNotes).length,
    attendanceMarked: classes.reduce((sum, item) => sum + Number(item.attendanceCount || 0), 0)
  };
}

app.get("/api/part64/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 64 - Live Classes Completion",
    status: "active",
    dbMode: mongoose.connection.readyState === 1 ? "mongodb" : "mock",
    routes: part64Config.routes,
    features: ["Batch-wise schedule", "Meeting link", "Join button", "Reminder foundation", "Online attendance", "Recording", "Notes/assignment"],
    nextPart: part64Config.nextPart
  });
});

app.get("/api/part64/config", (req, res) => {
  res.json({ success: true, part: "Part 64 - Live Classes Completion", config: part64Config, checklist: part64Checklist });
});

app.get("/api/part64/classes", async (req, res) => {
  const collection = await part64GetCollection();
  const rows = collection ? await collection.find({}).sort({ startTime: 1 }).limit(1000).toArray() : globalThis.NAXORA_PART64_CLASSES;
  const classes = part64FilterRows(rows, req.query || {});
  res.json({ success: true, part: "Part 64 - Live Classes Completion", mode: collection ? "mongodb" : "mock", count: classes.length, classes });
});

app.post("/api/part64/classes", async (req, res) => {
  const payload = part64NormalizeClass(req.body || {});
  const collection = await part64GetCollection();
  if (collection) {
    await collection.updateOne({ classId: payload.classId }, { $set: payload }, { upsert: true });
    return res.status(201).json({ success: true, mode: "mongodb", message: "Live class saved.", class: part64PublicClass(payload) });
  }
  globalThis.NAXORA_PART64_CLASSES.unshift(payload);
  return res.status(201).json({ success: true, mode: "mock", message: "Live class saved in safe mock memory.", class: part64PublicClass(payload) });
});

app.get("/api/part64/classes/:classId", async (req, res) => {
  const found = await part64FindClass(req.params.classId);
  if (!found.row) return res.status(404).json({ success: false, message: "Live class nahi mili." });
  res.json({ success: true, part: "Part 64 - Live Classes Completion", mode: found.collection ? "mongodb" : "mock", class: part64PublicClass(found.row) });
});

app.patch("/api/part64/classes/:classId", async (req, res) => {
  const classId = part64CleanText(req.params.classId, 80);
  const found = await part64FindClass(classId);
  if (!found.row) return res.status(404).json({ success: false, message: "Live class nahi mili." });
  const updated = part64NormalizeClass({ ...found.row, ...(req.body || {}), classId });
  if (found.collection) {
    await found.collection.updateOne({ classId }, { $set: updated });
    return res.json({ success: true, mode: "mongodb", class: part64PublicClass(updated) });
  }
  const index = globalThis.NAXORA_PART64_CLASSES.findIndex((item) => item.classId === classId);
  globalThis.NAXORA_PART64_CLASSES[index] = updated;
  res.json({ success: true, mode: "mock", class: part64PublicClass(updated) });
});

app.post("/api/part64/classes/:classId/reminder", async (req, res) => {
  const classId = part64CleanText(req.params.classId, 80);
  const found = await part64FindClass(classId);
  if (!found.row) return res.status(404).json({ success: false, message: "Live class nahi mili." });
  const reminder = {
    id: `P64-REM-${Date.now()}`,
    classId,
    channel: part64CleanText(req.body?.channel || "in_app", 40),
    message: part64CleanText(req.body?.message || `Reminder: ${found.row.title || "Live class"} scheduled hai.`, 300),
    status: "queued_mock",
    createdAt: new Date().toISOString()
  };
  globalThis.NAXORA_PART64_REMINDERS.unshift(reminder);
  const update = { reminderStatus: "queued", updatedAt: new Date().toISOString() };
  if (found.collection) await found.collection.updateOne({ classId }, { $set: update });
  else {
    const index = globalThis.NAXORA_PART64_CLASSES.findIndex((item) => item.classId === classId);
    if (index >= 0) Object.assign(globalThis.NAXORA_PART64_CLASSES[index], update);
  }
  res.status(201).json({ success: true, part: "Part 64 - Live Classes Completion", message: "Reminder queued as foundation only. Real WhatsApp/SMS/Email Part 65 me aayega.", reminder });
});

app.post("/api/part64/classes/:classId/attendance", async (req, res) => {
  const classId = part64CleanText(req.params.classId, 80);
  const found = await part64FindClass(classId);
  if (!found.row) return res.status(404).json({ success: false, message: "Live class nahi mili." });
  const entry = {
    studentId: part64CleanText(req.body?.studentId || `STD-${Date.now()}`, 80),
    studentName: part64CleanText(req.body?.studentName || "Student", 120),
    status: ["joined", "left", "present", "absent"].includes(part64CleanText(req.body?.status, 20)) ? part64CleanText(req.body?.status, 20) : "joined",
    joinedAt: part64DateValue(req.body?.joinedAt, new Date().toISOString()),
    leftAt: part64DateValue(req.body?.leftAt, ""),
    durationMinutes: Number(req.body?.durationMinutes || 0),
    markedBy: part64CleanText(req.body?.markedBy || "system", 80)
  };
  if (found.collection) {
    await found.collection.updateOne({ classId }, { $push: { attendance: entry }, $set: { updatedAt: new Date().toISOString() } });
  } else {
    const index = globalThis.NAXORA_PART64_CLASSES.findIndex((item) => item.classId === classId);
    if (index >= 0) {
      globalThis.NAXORA_PART64_CLASSES[index].attendance = [...(globalThis.NAXORA_PART64_CLASSES[index].attendance || []), entry];
      globalThis.NAXORA_PART64_CLASSES[index].updatedAt = new Date().toISOString();
    }
  }
  res.status(201).json({ success: true, part: "Part 64 - Live Classes Completion", message: "Online attendance entry saved.", attendance: entry });
});

app.post("/api/part64/classes/:classId/recording", async (req, res) => {
  const classId = part64CleanText(req.params.classId, 80);
  const found = await part64FindClass(classId);
  if (!found.row) return res.status(404).json({ success: false, message: "Live class nahi mili." });
  const recordingUrl = part64SafeUrl(req.body?.recordingUrl || req.body?.url);
  if (!recordingUrl) return res.status(400).json({ success: false, message: "Valid recording URL required hai." });
  const update = { recordingUrl, status: part64CleanText(req.body?.status || found.row.status || "completed", 40), updatedAt: new Date().toISOString() };
  if (found.collection) await found.collection.updateOne({ classId }, { $set: update });
  else {
    const index = globalThis.NAXORA_PART64_CLASSES.findIndex((item) => item.classId === classId);
    if (index >= 0) Object.assign(globalThis.NAXORA_PART64_CLASSES[index], update);
  }
  res.json({ success: true, part: "Part 64 - Live Classes Completion", message: "Recording attached.", recordingUrl });
});

app.post("/api/part64/classes/:classId/notes-assignment", async (req, res) => {
  const classId = part64CleanText(req.params.classId, 80);
  const found = await part64FindClass(classId);
  if (!found.row) return res.status(404).json({ success: false, message: "Live class nahi mili." });
  const update = {
    notesUrl: part64SafeUrl(req.body?.notesUrl || req.body?.notesLink),
    assignmentTitle: part64CleanText(req.body?.assignmentTitle || req.body?.assignment || found.row.assignmentTitle || "", 160),
    assignmentDueDate: part64DateValue(req.body?.assignmentDueDate || req.body?.dueDate, found.row.assignmentDueDate || ""),
    updatedAt: new Date().toISOString()
  };
  if (found.collection) await found.collection.updateOne({ classId }, { $set: update });
  else {
    const index = globalThis.NAXORA_PART64_CLASSES.findIndex((item) => item.classId === classId);
    if (index >= 0) Object.assign(globalThis.NAXORA_PART64_CLASSES[index], update);
  }
  res.json({ success: true, part: "Part 64 - Live Classes Completion", message: "Notes/assignment attached.", update });
});

app.get("/api/part64/today", async (req, res) => {
  const collection = await part64GetCollection();
  const rows = collection ? await collection.find({}).sort({ startTime: 1 }).limit(1000).toArray() : globalThis.NAXORA_PART64_CLASSES;
  const today = part64FilterRows(rows, { ...(req.query || {}), today: "true" });
  res.json({ success: true, part: "Part 64 - Live Classes Completion", count: today.length, classes: today });
});

app.get("/api/part64/analytics", async (req, res) => {
  const collection = await part64GetCollection();
  const rows = collection ? await collection.find({}).sort({ startTime: 1 }).limit(1000).toArray() : globalThis.NAXORA_PART64_CLASSES;
  res.json({ success: true, part: "Part 64 - Live Classes Completion", mode: collection ? "mongodb" : "mock", analytics: part64Analytics(rows) });
});

app.get("/api/part64/checklist", (req, res) => {
  res.json({ success: true, part: "Part 64 - Live Classes Completion", checklist: part64Checklist });
});

app.get("/api/part64/export", async (req, res) => {
  const collection = await part64GetCollection();
  const rows = collection ? await collection.find({}).sort({ startTime: 1 }).limit(1000).toArray() : globalThis.NAXORA_PART64_CLASSES;
  res.json({ success: true, part: "Part 64 - Live Classes Completion", exportedAt: new Date().toISOString(), config: part64Config, analytics: part64Analytics(rows), classes: rows.map(part64PublicClass), reminders: globalThis.NAXORA_PART64_REMINDERS.slice(0, 100) });
});

app.get("/api/part64/demo", async (req, res) => {
  const classes = part64FilterRows(globalThis.NAXORA_PART64_CLASSES || [], {});
  res.json({ success: true, part: "Part 64 - Live Classes Completion", config: part64Config, analytics: part64Analytics(classes), classes, checklist: part64Checklist });
});
// ================= END PART 64 =================


// ================= PART 65: WHATSAPP, SMS AND EMAIL INTEGRATION =================
// Roadmap scope: fee reminders, absence alerts, test results, class reminders,
// announcements and delivery logs. This is a safe provider-ready communication hub.
// Real external sending is intentionally disabled until provider API keys/accounts are added.
const part65Checklist = [
  "WhatsApp/SMS/Email templates load hote hain",
  "Fee reminder draft/queue ban sakta hai",
  "Absence alert draft/queue ban sakta hai",
  "Test result message draft/queue ban sakta hai",
  "Live class reminder draft/queue ban sakta hai",
  "Announcement multi-channel queue ban sakta hai",
  "Delivery logs maintain hote hain",
  "Consent aur recipient validation ka foundation ready hai",
  "Real provider keys ke bina message externally send nahi hota"
];

const part65Channels = [
  { key: "whatsapp", label: "WhatsApp", realProviderStatus: "provider_ready_foundation", note: "Real WhatsApp Business/API provider Part 65 provider setup ke baad enable hoga." },
  { key: "sms", label: "SMS", realProviderStatus: "provider_ready_foundation", note: "Real SMS gateway keys ke bina external SMS send nahi hoga." },
  { key: "email", label: "Email", realProviderStatus: "provider_ready_foundation", note: "SMTP/provider env ke bina external email send nahi hoga." },
  { key: "in_app", label: "In-App", realProviderStatus: "safe_mock_active", note: "In-app notification queue safe local/MongoDB mode me ready hai." }
];

const part65Config = {
  part: "Part 65 - WhatsApp, SMS and Email Integration",
  status: "active",
  purpose: "Fee reminders, absence alerts, test results, class reminders aur announcements ko WhatsApp/SMS/Email/In-app communication hub me organize karna.",
  routes: [
    "/communication-hub",
    "/whatsapp-sms-email",
    "/api/part65/status",
    "/api/part65/templates",
    "/api/part65/send",
    "/api/part65/queue",
    "/api/part65/logs",
    "/api/part65/analytics"
  ],
  safetyMode: "No real external WhatsApp/SMS/Email is sent without verified provider keys and consent.",
  nextPart: "Part 66 - Payments and Subscription Completion"
};

const part65Templates = [
  {
    templateId: "P65-TPL-FEE-REMINDER",
    type: "fee_reminder",
    label: "Fee Reminder",
    defaultChannels: ["whatsapp", "sms", "in_app"],
    subject: "Fee reminder - {{studentName}}",
    body: "Namaste {{parentName}}, {{studentName}} ki pending fee ₹{{pendingAmount}} hai. Due date: {{dueDate}}. Kripya institute se contact karein. - {{instituteName}}"
  },
  {
    templateId: "P65-TPL-ABSENCE-ALERT",
    type: "absence_alert",
    label: "Absence Alert",
    defaultChannels: ["whatsapp", "sms", "in_app"],
    subject: "Attendance alert - {{studentName}}",
    body: "Namaste {{parentName}}, {{studentName}} aaj {{className}} me absent mark hua hai. Detail ke liye institute se contact karein. - {{instituteName}}"
  },
  {
    templateId: "P65-TPL-TEST-RESULT",
    type: "test_result",
    label: "Test Result",
    defaultChannels: ["whatsapp", "email", "in_app"],
    subject: "Test result - {{studentName}}",
    body: "{{studentName}} ne {{testName}} me {{marks}}/{{totalMarks}} score kiya. Remarks: {{remarks}} - {{instituteName}}"
  },
  {
    templateId: "P65-TPL-CLASS-REMINDER",
    type: "class_reminder",
    label: "Class Reminder",
    defaultChannels: ["whatsapp", "sms", "email", "in_app"],
    subject: "Live class reminder - {{classTitle}}",
    body: "Reminder: {{classTitle}} {{startTime}} par scheduled hai. Join link: {{joinLink}} - {{instituteName}}"
  },
  {
    templateId: "P65-TPL-ANNOUNCEMENT",
    type: "announcement",
    label: "Announcement",
    defaultChannels: ["whatsapp", "email", "in_app"],
    subject: "Important announcement - {{instituteName}}",
    body: "{{announcementText}} - {{instituteName}}"
  }
];

function part65CleanText(value, max = 500) {
  return String(value ?? "").trim().replace(/[<>]/g, "").slice(0, max);
}

function part65CleanPhone(value) {
  return part65CleanText(value, 30).replace(/[^0-9+]/g, "").slice(0, 20);
}

function part65CleanEmail(value) {
  const email = part65CleanText(value, 160).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function part65AllowedChannels(input) {
  const raw = Array.isArray(input) ? input : String(input || "").split(",");
  const allowed = new Set(["whatsapp", "sms", "email", "in_app"]);
  const clean = raw.map((item) => part65CleanText(item, 30).toLowerCase()).filter((item) => allowed.has(item));
  return [...new Set(clean.length ? clean : ["in_app"])];
}

function part65ApplyTemplate(templateBody = "", variables = {}) {
  return String(templateBody || "").replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => part65CleanText(variables[key] ?? "", 180));
}

function part65FindTemplate(typeOrId) {
  const key = part65CleanText(typeOrId, 100).toLowerCase();
  return part65Templates.find((tpl) => tpl.templateId.toLowerCase() === key || tpl.type.toLowerCase() === key) || part65Templates[4];
}

function part65ProviderMode(channel) {
  // No external API is called here. This keeps Part 65 safe until real provider setup.
  if (channel === "in_app") return "queued_in_app";
  return "queued_provider_pending";
}

function part65NormalizeMessage(input = {}) {
  const template = part65FindTemplate(input.templateId || input.type || input.messageType || "announcement");
  const variables = typeof input.variables === "object" && input.variables ? input.variables : {};
  const channels = part65AllowedChannels(input.channels || template.defaultChannels || ["in_app"]);
  const recipient = {
    name: part65CleanText(input.recipientName || input.name || variables.parentName || variables.studentName || "Recipient", 120),
    role: part65CleanText(input.recipientRole || input.role || "parent_student", 80),
    phone: part65CleanPhone(input.phone || input.mobile || variables.phone),
    email: part65CleanEmail(input.email || variables.email),
    studentId: part65CleanText(input.studentId || variables.studentId || "", 80),
    parentId: part65CleanText(input.parentId || variables.parentId || "", 80)
  };
  const subject = part65CleanText(input.subject || part65ApplyTemplate(template.subject, variables), 180);
  const body = part65CleanText(input.body || input.message || part65ApplyTemplate(template.body, variables), 1000);
  const consentAccepted = input.consentAccepted === true || input.consent === true || input.hasConsent === true || part65CleanText(input.consentAccepted, 10) === "true";
  return {
    messageId: part65CleanText(input.messageId || `P65-MSG-${Date.now()}-${Math.floor(Math.random() * 9999)}`, 120),
    templateId: template.templateId,
    type: template.type,
    channels,
    recipient,
    subject,
    body,
    consentAccepted,
    status: consentAccepted ? "queued" : "blocked_consent_required",
    source: part65CleanText(input.source || "part65_manual", 120),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    note: consentAccepted ? "Message queued safely. Real external send disabled until provider setup." : "Consent required before WhatsApp/SMS/Email queue."
  };
}

function part65DeliveryLogsForMessage(message) {
  return (message.channels || ["in_app"]).map((channel) => ({
    logId: `P65-LOG-${Date.now()}-${channel}-${Math.floor(Math.random() * 9999)}`,
    messageId: message.messageId,
    channel,
    status: message.consentAccepted ? part65ProviderMode(channel) : "blocked_consent_required",
    recipientName: message.recipient?.name || "Recipient",
    recipientPhone: message.recipient?.phone || "",
    recipientEmail: message.recipient?.email || "",
    createdAt: new Date().toISOString(),
    providerMessageId: "",
    providerResponse: channel === "in_app" ? "Stored in app queue." : "Provider integration pending. No external message sent."
  }));
}

if (!globalThis.NAXORA_PART65_MESSAGES) {
  globalThis.NAXORA_PART65_MESSAGES = [
    part65NormalizeMessage({
      type: "fee_reminder",
      channels: ["whatsapp", "sms", "in_app"],
      recipientName: "Demo Parent",
      phone: "+919999999999",
      consentAccepted: true,
      variables: {
        parentName: "Demo Parent",
        studentName: "Aarav Demo",
        pendingAmount: "2500",
        dueDate: "2026-07-20",
        instituteName: "NAXORA Demo Institute"
      },
      source: "demo_seed"
    })
  ];
}

globalThis.NAXORA_PART65_LOGS = globalThis.NAXORA_PART65_LOGS || globalThis.NAXORA_PART65_MESSAGES.flatMap(part65DeliveryLogsForMessage);

async function part65GetMessagesCollection() {
  if (globalThis.NAXORA_DB_MODE === "mongodb" && mongoose.connection?.readyState === 1) {
    return mongoose.connection.collection("part65messages");
  }
  return null;
}

async function part65GetLogsCollection() {
  if (globalThis.NAXORA_DB_MODE === "mongodb" && mongoose.connection?.readyState === 1) {
    return mongoose.connection.collection("part65deliverylogs");
  }
  return null;
}

async function part65ListMessages(query = {}) {
  const collection = await part65GetMessagesCollection();
  if (collection) return { mode: "mongodb", rows: await collection.find({}).sort({ createdAt: -1 }).limit(300).toArray() };
  return { mode: "mock", rows: globalThis.NAXORA_PART65_MESSAGES || [] };
}

function part65FilterMessages(rows = [], query = {}) {
  const type = part65CleanText(query.type, 80).toLowerCase();
  const channel = part65CleanText(query.channel, 40).toLowerCase();
  const status = part65CleanText(query.status, 80).toLowerCase();
  return rows.filter((item) => {
    if (type && part65CleanText(item.type, 80).toLowerCase() !== type) return false;
    if (status && part65CleanText(item.status, 80).toLowerCase() !== status) return false;
    if (channel && !(item.channels || []).map((c) => String(c).toLowerCase()).includes(channel)) return false;
    return true;
  });
}

function part65Analytics(messages = [], logs = []) {
  const byType = {};
  const byChannel = {};
  const byStatus = {};
  messages.forEach((msg) => {
    byType[msg.type || "unknown"] = (byType[msg.type || "unknown"] || 0) + 1;
    byStatus[msg.status || "unknown"] = (byStatus[msg.status || "unknown"] || 0) + 1;
    (msg.channels || ["in_app"]).forEach((channel) => {
      byChannel[channel] = (byChannel[channel] || 0) + 1;
    });
  });
  return {
    totalMessages: messages.length,
    totalDeliveryLogs: logs.length,
    queuedMessages: messages.filter((m) => m.status === "queued").length,
    blockedConsentRequired: messages.filter((m) => m.status === "blocked_consent_required").length,
    byType,
    byChannel,
    byStatus,
    providerMode: "safe_queue_only"
  };
}

app.get("/communication-hub", (req, res) => sendFileSafe(res, "communication-hub.html"));
app.get("/whatsapp-sms-email", (req, res) => sendFileSafe(res, "communication-hub.html"));
app.get("/message-center", (req, res) => sendFileSafe(res, "communication-hub.html"));
app.get("/delivery-logs", (req, res) => sendFileSafe(res, "communication-hub.html"));

app.get("/api/part65/status", (req, res) => {
  res.json({
    success: true,
    part: part65Config.part,
    status: "active",
    purpose: part65Config.purpose,
    safetyMode: part65Config.safetyMode,
    channels: part65Channels,
    routes: part65Config.routes,
    nextPart: part65Config.nextPart
  });
});

app.get("/api/part65/config", (req, res) => {
  res.json({ success: true, part: part65Config.part, config: part65Config, channels: part65Channels, templates: part65Templates });
});

app.get("/api/part65/templates", (req, res) => {
  res.json({ success: true, part: part65Config.part, count: part65Templates.length, templates: part65Templates });
});

app.post("/api/part65/compose", (req, res) => {
  const message = part65NormalizeMessage(req.body || {});
  res.json({ success: true, part: part65Config.part, mode: "preview_only", message, logsPreview: part65DeliveryLogsForMessage(message) });
});

app.post("/api/part65/send", async (req, res) => {
  const message = part65NormalizeMessage(req.body || {});
  const logs = part65DeliveryLogsForMessage(message);
  const messagesCollection = await part65GetMessagesCollection();
  const logsCollection = await part65GetLogsCollection();
  if (messagesCollection) {
    await messagesCollection.updateOne({ messageId: message.messageId }, { $set: message }, { upsert: true });
    if (logsCollection && logs.length) await logsCollection.insertMany(logs);
    return res.status(201).json({ success: true, mode: "mongodb", part: part65Config.part, message: "Communication queued safely. No external provider call made.", queuedMessage: message, deliveryLogs: logs });
  }
  globalThis.NAXORA_PART65_MESSAGES.unshift(message);
  globalThis.NAXORA_PART65_LOGS.unshift(...logs);
  res.status(201).json({ success: true, mode: "mock", part: part65Config.part, message: "Communication queued safely in mock memory. No external provider call made.", queuedMessage: message, deliveryLogs: logs });
});

app.get("/api/part65/queue", async (req, res) => {
  const result = await part65ListMessages(req.query || {});
  const rows = part65FilterMessages(result.rows, req.query || {});
  res.json({ success: true, part: part65Config.part, mode: result.mode, count: rows.length, messages: rows });
});

app.get("/api/part65/logs", async (req, res) => {
  const collection = await part65GetLogsCollection();
  const logs = collection ? await collection.find({}).sort({ createdAt: -1 }).limit(500).toArray() : (globalThis.NAXORA_PART65_LOGS || []);
  res.json({ success: true, part: part65Config.part, mode: collection ? "mongodb" : "mock", count: logs.length, logs });
});

app.post("/api/part65/reminders/fees", async (req, res) => {
  const payload = {
    ...req.body,
    type: "fee_reminder",
    source: "part65_fee_reminder",
    variables: {
      instituteName: req.body?.instituteName || "NAXORA Institute",
      parentName: req.body?.parentName || req.body?.recipientName || "Parent",
      studentName: req.body?.studentName || "Student",
      pendingAmount: req.body?.pendingAmount || req.body?.amount || "0",
      dueDate: req.body?.dueDate || "Soon",
      phone: req.body?.phone || "",
      email: req.body?.email || ""
    }
  };
  req.body = payload;
  const message = part65NormalizeMessage(payload);
  const logs = part65DeliveryLogsForMessage(message);
  const messagesCollection = await part65GetMessagesCollection();
  const logsCollection = await part65GetLogsCollection();
  if (messagesCollection) {
    await messagesCollection.updateOne({ messageId: message.messageId }, { $set: message }, { upsert: true });
    if (logsCollection && logs.length) await logsCollection.insertMany(logs);
  } else {
    globalThis.NAXORA_PART65_MESSAGES.unshift(message);
    globalThis.NAXORA_PART65_LOGS.unshift(...logs);
  }
  res.status(201).json({ success: true, part: part65Config.part, message: "Fee reminder queued safely.", queuedMessage: message, deliveryLogs: logs });
});

app.post("/api/part65/reminders/absence", async (req, res) => {
  const payload = {
    ...req.body,
    type: "absence_alert",
    source: "part65_absence_alert",
    variables: {
      instituteName: req.body?.instituteName || "NAXORA Institute",
      parentName: req.body?.parentName || req.body?.recipientName || "Parent",
      studentName: req.body?.studentName || "Student",
      className: req.body?.className || req.body?.batchName || "class",
      phone: req.body?.phone || "",
      email: req.body?.email || ""
    }
  };
  const message = part65NormalizeMessage(payload);
  const logs = part65DeliveryLogsForMessage(message);
  const messagesCollection = await part65GetMessagesCollection();
  const logsCollection = await part65GetLogsCollection();
  if (messagesCollection) {
    await messagesCollection.updateOne({ messageId: message.messageId }, { $set: message }, { upsert: true });
    if (logsCollection && logs.length) await logsCollection.insertMany(logs);
  } else {
    globalThis.NAXORA_PART65_MESSAGES.unshift(message);
    globalThis.NAXORA_PART65_LOGS.unshift(...logs);
  }
  res.status(201).json({ success: true, part: part65Config.part, message: "Absence alert queued safely.", queuedMessage: message, deliveryLogs: logs });
});

app.post("/api/part65/test-results", async (req, res) => {
  const payload = {
    ...req.body,
    type: "test_result",
    source: "part65_test_result",
    variables: {
      instituteName: req.body?.instituteName || "NAXORA Institute",
      studentName: req.body?.studentName || "Student",
      testName: req.body?.testName || "Test",
      marks: req.body?.marks || "0",
      totalMarks: req.body?.totalMarks || "0",
      remarks: req.body?.remarks || "Keep improving",
      email: req.body?.email || "",
      phone: req.body?.phone || ""
    }
  };
  const message = part65NormalizeMessage(payload);
  const logs = part65DeliveryLogsForMessage(message);
  const messagesCollection = await part65GetMessagesCollection();
  const logsCollection = await part65GetLogsCollection();
  if (messagesCollection) {
    await messagesCollection.updateOne({ messageId: message.messageId }, { $set: message }, { upsert: true });
    if (logsCollection && logs.length) await logsCollection.insertMany(logs);
  } else {
    globalThis.NAXORA_PART65_MESSAGES.unshift(message);
    globalThis.NAXORA_PART65_LOGS.unshift(...logs);
  }
  res.status(201).json({ success: true, part: part65Config.part, message: "Test result communication queued safely.", queuedMessage: message, deliveryLogs: logs });
});

app.post("/api/part65/announcements", async (req, res) => {
  const recipients = Array.isArray(req.body?.recipients) && req.body.recipients.length ? req.body.recipients.slice(0, 50) : [{ recipientName: "All Students/Parents", consentAccepted: true }];
  const queued = [];
  const logsAll = [];
  for (const recipient of recipients) {
    const payload = {
      ...(recipient || {}),
      type: "announcement",
      source: "part65_announcement",
      channels: req.body?.channels || ["in_app"],
      subject: req.body?.subject || "Important announcement",
      consentAccepted: recipient?.consentAccepted === true || req.body?.consentAccepted === true,
      variables: {
        instituteName: req.body?.instituteName || "NAXORA Institute",
        announcementText: req.body?.announcementText || req.body?.message || "Important update from institute.",
        phone: recipient?.phone || "",
        email: recipient?.email || ""
      }
    };
    const message = part65NormalizeMessage(payload);
    const logs = part65DeliveryLogsForMessage(message);
    queued.push(message);
    logsAll.push(...logs);
  }
  const messagesCollection = await part65GetMessagesCollection();
  const logsCollection = await part65GetLogsCollection();
  if (messagesCollection && queued.length) {
    await messagesCollection.insertMany(queued);
    if (logsCollection && logsAll.length) await logsCollection.insertMany(logsAll);
  } else {
    globalThis.NAXORA_PART65_MESSAGES.unshift(...queued);
    globalThis.NAXORA_PART65_LOGS.unshift(...logsAll);
  }
  res.status(201).json({ success: true, part: part65Config.part, message: "Announcement queued safely.", count: queued.length, queuedMessages: queued, deliveryLogs: logsAll });
});

app.get("/api/part65/analytics", async (req, res) => {
  const result = await part65ListMessages(req.query || {});
  const logsCollection = await part65GetLogsCollection();
  const logs = logsCollection ? await logsCollection.find({}).sort({ createdAt: -1 }).limit(1000).toArray() : (globalThis.NAXORA_PART65_LOGS || []);
  res.json({ success: true, part: part65Config.part, mode: result.mode, analytics: part65Analytics(result.rows, logs) });
});

app.get("/api/part65/checklist", (req, res) => {
  res.json({ success: true, part: part65Config.part, checklist: part65Checklist });
});

app.get("/api/part65/export", async (req, res) => {
  const result = await part65ListMessages(req.query || {});
  const logsCollection = await part65GetLogsCollection();
  const logs = logsCollection ? await logsCollection.find({}).sort({ createdAt: -1 }).limit(1000).toArray() : (globalThis.NAXORA_PART65_LOGS || []);
  res.json({ success: true, part: part65Config.part, exportedAt: new Date().toISOString(), config: part65Config, templates: part65Templates, analytics: part65Analytics(result.rows, logs), messages: result.rows, logs });
});

app.get("/api/part65/demo", async (req, res) => {
  const result = await part65ListMessages({});
  res.json({ success: true, part: part65Config.part, config: part65Config, channels: part65Channels, templates: part65Templates, messages: result.rows.slice(0, 10), checklist: part65Checklist });
});
// ================= END PART 65 =================

// ================= PART 66: PAYMENTS AND SUBSCRIPTION COMPLETION =================
// Roadmap scope: Razorpay, monthly/yearly plans, payment history, invoice,
// renewal reminder and failed payment handling. This part is provider-ready but safe:
// no secret is committed and real payment creation is only attempted when Razorpay
// keys are present in Render environment variables.
const part66Checklist = [
  "Monthly/yearly NAXORA subscription plans visible hain",
  "Institute subscription create/update ho sakti hai",
  "Razorpay order safe test/live ready mode me create ho sakta hai",
  "Payment history record maintain hota hai",
  "Invoice generate/export foundation ready hai",
  "Renewal reminders calculate hote hain",
  "Failed payment handling and retry status ready hai",
  "No .env, no secret, no key committed in code"
];

const part66Plans = [
  {
    planCode: "starter_monthly",
    name: "Starter Monthly",
    billingCycle: "monthly",
    priceInr: 999,
    yearlyEquivalentInr: 11988,
    maxStudents: 100,
    maxBranches: 1,
    aiCredits: 500,
    features: ["Students", "Fees", "Attendance", "Parents", "Basic reports", "Communication queue"]
  },
  {
    planCode: "growth_monthly",
    name: "Growth Monthly",
    billingCycle: "monthly",
    priceInr: 1999,
    yearlyEquivalentInr: 23988,
    maxStudents: 500,
    maxBranches: 3,
    aiCredits: 2500,
    features: ["All Starter features", "CRM", "Discovery leads", "Live classes", "Role permissions", "Priority support"]
  },
  {
    planCode: "pro_yearly",
    name: "Pro Yearly",
    billingCycle: "yearly",
    priceInr: 19999,
    yearlyEquivalentInr: 19999,
    maxStudents: 2000,
    maxBranches: 10,
    aiCredits: 25000,
    features: ["All Growth features", "Advanced analytics", "Public profile", "Nearby discovery", "Compare listing", "Renewal automation"]
  },
  {
    planCode: "enterprise_yearly",
    name: "Enterprise Yearly",
    billingCycle: "yearly",
    priceInr: 49999,
    yearlyEquivalentInr: 49999,
    maxStudents: 10000,
    maxBranches: 50,
    aiCredits: 100000,
    features: ["All Pro features", "Multi-branch controls", "Dedicated onboarding", "Custom limits", "Future white-label ready"]
  }
];

const part66Config = {
  part: "Part 66 - Payments and Subscription Completion",
  status: "active",
  purpose: "Razorpay, monthly/yearly plans, payment history, invoice, renewal reminder aur failed payment handling ko ek billing hub me complete karna.",
  frontend: ["/payments-subscriptions", "/subscription-payments", "/billing", "/invoices"],
  apiRoutes: [
    "/api/part66/status",
    "/api/part66/plans",
    "/api/part66/subscriptions",
    "/api/part66/orders/create",
    "/api/part66/payments",
    "/api/part66/invoices",
    "/api/part66/renewals",
    "/api/part66/analytics"
  ],
  safetyMode: "No Razorpay secret is included. Real/test Razorpay order creation only works when Render env has RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
  nextPart: "Part 67 - AI Hub"
};

function part66CleanText(value, max = 300) {
  return String(value ?? "").trim().replace(/[<>]/g, "").slice(0, max);
}

function part66CleanEmail(value) {
  const email = part66CleanText(value, 160).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function part66Number(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function part66AmountPaise(amountInr) {
  return Math.round(part66Number(amountInr, 0) * 100);
}

function part66DateAdd(baseDate, cycle = "monthly") {
  const date = baseDate ? new Date(baseDate) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  if (cycle === "yearly") date.setFullYear(date.getFullYear() + 1);
  else date.setMonth(date.getMonth() + 1);
  return date.toISOString();
}

function part66FindPlan(planCode) {
  const clean = part66CleanText(planCode, 80).toLowerCase();
  return part66Plans.find((plan) => plan.planCode.toLowerCase() === clean) || part66Plans[1];
}

function part66RazorpayStatus() {
  const keyId = part66CleanText(process.env.RAZORPAY_KEY_ID, 120);
  const hasSecret = Boolean(process.env.RAZORPAY_KEY_SECRET);
  const keyMode = keyId.startsWith("rzp_live_") ? "live" : keyId.startsWith("rzp_test_") ? "test" : "missing_or_unknown";
  return {
    keyIdPresent: Boolean(keyId),
    keySecretPresent: hasSecret,
    keyMode,
    providerMode: keyId && hasSecret ? `razorpay_${keyMode}_ready` : "mock_safe_mode",
    publicKeyId: keyId ? `${keyId.slice(0, 10)}...` : "not_set"
  };
}

function part66NormalizeSubscription(input = {}) {
  const plan = part66FindPlan(input.planCode || input.plan || "growth_monthly");
  const startDate = input.startDate ? new Date(input.startDate) : new Date();
  const safeStart = Number.isNaN(startDate.getTime()) ? new Date() : startDate;
  const subscriptionId = part66CleanText(input.subscriptionId || `P66-SUB-${Date.now()}-${Math.floor(Math.random() * 9999)}`, 120);
  return {
    subscriptionId,
    instituteId: part66CleanText(input.instituteId || input.instituteSlug || "demo-institute", 120),
    instituteName: part66CleanText(input.instituteName || "Demo Institute", 160),
    ownerName: part66CleanText(input.ownerName || "Institute Owner", 160),
    ownerEmail: part66CleanEmail(input.ownerEmail || input.email) || "",
    planCode: plan.planCode,
    planName: plan.name,
    billingCycle: plan.billingCycle,
    amountInr: plan.priceInr,
    currency: "INR",
    status: part66CleanText(input.status || "active", 40).toLowerCase(),
    startDate: safeStart.toISOString(),
    nextRenewalDate: part66DateAdd(safeStart.toISOString(), plan.billingCycle),
    autoRenew: input.autoRenew === false ? false : true,
    featureLimits: { maxStudents: plan.maxStudents, maxBranches: plan.maxBranches, aiCredits: plan.aiCredits },
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function part66NormalizePayment(input = {}) {
  const plan = part66FindPlan(input.planCode || input.plan || "growth_monthly");
  const amountInr = part66Number(input.amountInr || input.amount || plan.priceInr, plan.priceInr);
  const status = part66CleanText(input.status || "created", 40).toLowerCase();
  return {
    paymentId: part66CleanText(input.paymentId || `P66-PAY-${Date.now()}-${Math.floor(Math.random() * 9999)}`, 120),
    orderId: part66CleanText(input.orderId || input.razorpayOrderId || "", 160),
    razorpayPaymentId: part66CleanText(input.razorpayPaymentId || "", 160),
    subscriptionId: part66CleanText(input.subscriptionId || "", 120),
    instituteId: part66CleanText(input.instituteId || "demo-institute", 120),
    instituteName: part66CleanText(input.instituteName || "Demo Institute", 160),
    planCode: plan.planCode,
    planName: plan.name,
    amountInr,
    amountPaise: part66AmountPaise(amountInr),
    currency: "INR",
    provider: "razorpay",
    status,
    failureReason: part66CleanText(input.failureReason || input.reason || "", 300),
    receipt: part66CleanText(input.receipt || `NAXORA-P66-${Date.now()}`, 120),
    paidAt: status === "paid" ? (input.paidAt || new Date().toISOString()) : "",
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function part66GenerateInvoice(payment = {}, subscription = {}) {
  const paymentId = payment.paymentId || `P66-PAY-${Date.now()}`;
  const amount = part66Number(payment.amountInr || subscription.amountInr, 0);
  const gstRate = 18;
  const taxableAmount = Math.round((amount / 1.18) * 100) / 100;
  const gstAmount = Math.round((amount - taxableAmount) * 100) / 100;
  return {
    invoiceId: `P66-INV-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
    invoiceNumber: `NAXORA/${new Date().getFullYear()}/${String(Math.floor(Math.random() * 99999)).padStart(5, "0")}`,
    paymentId,
    subscriptionId: payment.subscriptionId || subscription.subscriptionId || "",
    instituteId: payment.instituteId || subscription.instituteId || "demo-institute",
    instituteName: payment.instituteName || subscription.instituteName || "Demo Institute",
    planCode: payment.planCode || subscription.planCode || "growth_monthly",
    planName: payment.planName || subscription.planName || "Growth Monthly",
    taxableAmount,
    gstRate,
    gstAmount,
    totalAmountInr: amount,
    currency: "INR",
    status: payment.status === "paid" ? "paid" : "draft",
    issuedAt: new Date().toISOString(),
    note: "Demo/legal invoice foundation. Final tax fields can be adjusted before real billing launch."
  };
}

const part66DemoSubscription = part66NormalizeSubscription({
  subscriptionId: "P66-SUB-DEMO-001",
  instituteId: "naxora-demo-institute",
  instituteName: "NAXORA Demo Institute",
  ownerName: "Demo Owner",
  ownerEmail: "owner@example.com",
  planCode: "growth_monthly",
  status: "active",
  startDate: new Date().toISOString()
});

const part66DemoPayment = part66NormalizePayment({
  paymentId: "P66-PAY-DEMO-001",
  subscriptionId: part66DemoSubscription.subscriptionId,
  instituteId: part66DemoSubscription.instituteId,
  instituteName: part66DemoSubscription.instituteName,
  planCode: part66DemoSubscription.planCode,
  amountInr: part66DemoSubscription.amountInr,
  status: "paid",
  orderId: "order_demo_part66",
  razorpayPaymentId: "pay_demo_part66"
});

globalThis.NAXORA_PART66_SUBSCRIPTIONS = globalThis.NAXORA_PART66_SUBSCRIPTIONS || [part66DemoSubscription];
globalThis.NAXORA_PART66_PAYMENTS = globalThis.NAXORA_PART66_PAYMENTS || [part66DemoPayment];
globalThis.NAXORA_PART66_INVOICES = globalThis.NAXORA_PART66_INVOICES || [part66GenerateInvoice(part66DemoPayment, part66DemoSubscription)];

async function part66Collection(name) {
  try {
    if (mongoose.connection.readyState === 1) return mongoose.connection.collection(name);
  } catch {}
  return null;
}

async function part66List(collectionName, fallbackRows, query = {}) {
  const collection = await part66Collection(collectionName);
  if (collection) return { mode: "mongodb", rows: await collection.find({}).sort({ createdAt: -1 }).limit(1000).toArray() };
  return { mode: "mock", rows: [...fallbackRows] };
}

function part66FilterByInstitute(rows = [], instituteId = "") {
  const clean = part66CleanText(instituteId, 120).toLowerCase();
  return clean ? rows.filter((row) => part66CleanText(row.instituteId, 120).toLowerCase() === clean) : rows;
}

function part66RenewalRows(subscriptions = []) {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  return subscriptions.map((sub) => {
    const renewalTime = new Date(sub.nextRenewalDate).getTime();
    const daysLeft = Number.isFinite(renewalTime) ? Math.ceil((renewalTime - now) / dayMs) : null;
    let renewalStatus = "unknown";
    if (daysLeft !== null) renewalStatus = daysLeft < 0 ? "overdue" : daysLeft <= 7 ? "urgent" : daysLeft <= 30 ? "upcoming" : "healthy";
    return {
      subscriptionId: sub.subscriptionId,
      instituteId: sub.instituteId,
      instituteName: sub.instituteName,
      planName: sub.planName,
      amountInr: sub.amountInr,
      nextRenewalDate: sub.nextRenewalDate,
      daysLeft,
      renewalStatus,
      reminderMessage: `${sub.instituteName} ka ${sub.planName} renewal ${daysLeft} din me due hai.`
    };
  });
}

function part66Analytics(subscriptions = [], payments = [], invoices = []) {
  const paidPayments = payments.filter((p) => p.status === "paid");
  const failedPayments = payments.filter((p) => p.status === "failed");
  const totalRevenue = paidPayments.reduce((sum, p) => sum + part66Number(p.amountInr, 0), 0);
  const activeSubscriptions = subscriptions.filter((s) => s.status === "active").length;
  return {
    totalSubscriptions: subscriptions.length,
    activeSubscriptions,
    totalPayments: payments.length,
    paidPayments: paidPayments.length,
    failedPayments: failedPayments.length,
    totalInvoices: invoices.length,
    totalRevenueInr: totalRevenue,
    monthlyRecurringEstimateInr: subscriptions.filter((s) => s.status === "active").reduce((sum, s) => sum + (s.billingCycle === "yearly" ? Math.round(part66Number(s.amountInr, 0) / 12) : part66Number(s.amountInr, 0)), 0),
    renewalReminders: part66RenewalRows(subscriptions).filter((r) => ["urgent", "upcoming", "overdue"].includes(r.renewalStatus)).length,
    razorpay: part66RazorpayStatus()
  };
}

async function part66TryCreateRazorpayOrder(orderPayload) {
  const status = part66RazorpayStatus();
  if (!status.keyIdPresent || !status.keySecretPresent) {
    return { mode: "mock", order: { id: `order_mock_${Date.now()}`, status: "created", ...orderPayload }, note: "Razorpay keys missing. Mock order created safely." };
  }
  try {
    const { default: Razorpay } = await import("razorpay");
    const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
    const order = await razorpay.orders.create(orderPayload);
    return { mode: status.keyMode === "live" ? "razorpay_live" : "razorpay_test", order, note: "Razorpay order created using environment keys." };
  } catch (error) {
    return { mode: "mock_after_provider_error", order: { id: `order_mock_${Date.now()}`, status: "created", ...orderPayload }, note: `Razorpay provider error aaya, safe mock order returned: ${error.message}` };
  }
}

app.get("/payments-subscriptions", (req, res) => sendFileSafe(res, "payments-subscriptions.html"));
app.get("/subscription-payments", (req, res) => sendFileSafe(res, "payments-subscriptions.html"));
app.get("/billing", (req, res) => sendFileSafe(res, "payments-subscriptions.html"));
app.get("/invoices", (req, res) => sendFileSafe(res, "payments-subscriptions.html"));
app.get("/renewals", (req, res) => sendFileSafe(res, "payments-subscriptions.html"));

app.get("/api/part66/status", (req, res) => {
  res.json({
    success: true,
    part: part66Config.part,
    status: "active",
    purpose: part66Config.purpose,
    frontend: part66Config.frontend,
    apiRoutes: part66Config.apiRoutes,
    razorpay: part66RazorpayStatus(),
    safetyMode: part66Config.safetyMode,
    nextPart: part66Config.nextPart
  });
});

app.get("/api/part66/config", (req, res) => {
  res.json({ success: true, part: part66Config.part, config: part66Config, razorpay: part66RazorpayStatus() });
});

app.get("/api/part66/plans", (req, res) => {
  res.json({ success: true, part: part66Config.part, count: part66Plans.length, plans: part66Plans });
});

app.get("/api/part66/subscriptions", async (req, res) => {
  const result = await part66List("part66subscriptions", globalThis.NAXORA_PART66_SUBSCRIPTIONS, req.query || {});
  const rows = part66FilterByInstitute(result.rows, req.query?.instituteId);
  res.json({ success: true, part: part66Config.part, mode: result.mode, count: rows.length, subscriptions: rows });
});

app.post("/api/part66/subscriptions", async (req, res) => {
  const subscription = part66NormalizeSubscription(req.body || {});
  const collection = await part66Collection("part66subscriptions");
  if (collection) await collection.updateOne({ subscriptionId: subscription.subscriptionId }, { $set: subscription }, { upsert: true });
  else globalThis.NAXORA_PART66_SUBSCRIPTIONS.unshift(subscription);
  res.status(201).json({ success: true, part: part66Config.part, message: "Subscription created/updated.", subscription });
});

app.get("/api/part66/subscriptions/:subscriptionId", async (req, res) => {
  const subscriptionId = part66CleanText(req.params.subscriptionId, 120);
  const collection = await part66Collection("part66subscriptions");
  const row = collection ? await collection.findOne({ subscriptionId }) : globalThis.NAXORA_PART66_SUBSCRIPTIONS.find((s) => s.subscriptionId === subscriptionId);
  if (!row) return res.status(404).json({ success: false, message: "Subscription nahi mili." });
  res.json({ success: true, part: part66Config.part, subscription: row });
});

app.patch("/api/part66/subscriptions/:subscriptionId/status", async (req, res) => {
  const subscriptionId = part66CleanText(req.params.subscriptionId, 120);
  const status = part66CleanText(req.body?.status || "active", 40).toLowerCase();
  const update = { status, updatedAt: new Date().toISOString() };
  const collection = await part66Collection("part66subscriptions");
  if (collection) await collection.updateOne({ subscriptionId }, { $set: update });
  else {
    const index = globalThis.NAXORA_PART66_SUBSCRIPTIONS.findIndex((s) => s.subscriptionId === subscriptionId);
    if (index >= 0) Object.assign(globalThis.NAXORA_PART66_SUBSCRIPTIONS[index], update);
  }
  res.json({ success: true, part: part66Config.part, message: "Subscription status updated.", subscriptionId, update });
});

app.post("/api/part66/orders/create", async (req, res) => {
  const plan = part66FindPlan(req.body?.planCode || req.body?.plan);
  const amountInr = part66Number(req.body?.amountInr || req.body?.amount || plan.priceInr, plan.priceInr);
  const receipt = part66CleanText(req.body?.receipt || `NAXORA-P66-${Date.now()}`, 120);
  const orderPayload = { amount: part66AmountPaise(amountInr), currency: "INR", receipt, notes: { planCode: plan.planCode, instituteId: part66CleanText(req.body?.instituteId || "demo-institute", 120), source: "part66" } };
  const created = await part66TryCreateRazorpayOrder(orderPayload);
  const payment = part66NormalizePayment({ ...(req.body || {}), planCode: plan.planCode, amountInr, status: "created", orderId: created.order?.id || "" });
  const collection = await part66Collection("part66payments");
  if (collection) await collection.updateOne({ paymentId: payment.paymentId }, { $set: payment }, { upsert: true });
  else globalThis.NAXORA_PART66_PAYMENTS.unshift(payment);
  res.status(201).json({ success: true, part: part66Config.part, message: "Order created safely.", providerResult: created, paymentRecord: payment, razorpay: part66RazorpayStatus() });
});

app.get("/api/part66/payments", async (req, res) => {
  const result = await part66List("part66payments", globalThis.NAXORA_PART66_PAYMENTS, req.query || {});
  const rows = part66FilterByInstitute(result.rows, req.query?.instituteId).filter((row) => req.query?.status ? row.status === part66CleanText(req.query.status, 40).toLowerCase() : true);
  res.json({ success: true, part: part66Config.part, mode: result.mode, count: rows.length, payments: rows });
});

app.post("/api/part66/payments/record", async (req, res) => {
  const payment = part66NormalizePayment({ ...(req.body || {}), status: req.body?.status || "paid" });
  const collection = await part66Collection("part66payments");
  if (collection) await collection.updateOne({ paymentId: payment.paymentId }, { $set: payment }, { upsert: true });
  else globalThis.NAXORA_PART66_PAYMENTS.unshift(payment);
  res.status(201).json({ success: true, part: part66Config.part, message: "Payment record saved.", payment });
});

app.post("/api/part66/payments/:paymentId/failed", async (req, res) => {
  const paymentId = part66CleanText(req.params.paymentId, 120);
  const failureReason = part66CleanText(req.body?.failureReason || req.body?.reason || "Payment failed or cancelled", 300);
  const update = { status: "failed", failureReason, updatedAt: new Date().toISOString() };
  const collection = await part66Collection("part66payments");
  if (collection) await collection.updateOne({ paymentId }, { $set: update });
  else {
    const index = globalThis.NAXORA_PART66_PAYMENTS.findIndex((p) => p.paymentId === paymentId);
    if (index >= 0) Object.assign(globalThis.NAXORA_PART66_PAYMENTS[index], update);
    else globalThis.NAXORA_PART66_PAYMENTS.unshift(part66NormalizePayment({ paymentId, status: "failed", failureReason }));
  }
  res.json({ success: true, part: part66Config.part, message: "Failed payment marked and retry/reminder foundation ready.", paymentId, update });
});

app.get("/api/part66/invoices", async (req, res) => {
  const result = await part66List("part66invoices", globalThis.NAXORA_PART66_INVOICES, req.query || {});
  const rows = part66FilterByInstitute(result.rows, req.query?.instituteId);
  res.json({ success: true, part: part66Config.part, mode: result.mode, count: rows.length, invoices: rows });
});

app.post("/api/part66/invoices/generate", async (req, res) => {
  const payment = part66NormalizePayment(req.body?.payment || req.body || {});
  const subscription = part66NormalizeSubscription(req.body?.subscription || req.body || {});
  const invoice = part66GenerateInvoice(payment, subscription);
  const collection = await part66Collection("part66invoices");
  if (collection) await collection.updateOne({ invoiceId: invoice.invoiceId }, { $set: invoice }, { upsert: true });
  else globalThis.NAXORA_PART66_INVOICES.unshift(invoice);
  res.status(201).json({ success: true, part: part66Config.part, message: "Invoice generated.", invoice });
});

app.get("/api/part66/renewals", async (req, res) => {
  const result = await part66List("part66subscriptions", globalThis.NAXORA_PART66_SUBSCRIPTIONS, req.query || {});
  const rows = part66RenewalRows(part66FilterByInstitute(result.rows, req.query?.instituteId));
  res.json({ success: true, part: part66Config.part, mode: result.mode, count: rows.length, renewals: rows });
});

app.get("/api/part66/analytics", async (req, res) => {
  const subscriptions = await part66List("part66subscriptions", globalThis.NAXORA_PART66_SUBSCRIPTIONS, {});
  const payments = await part66List("part66payments", globalThis.NAXORA_PART66_PAYMENTS, {});
  const invoices = await part66List("part66invoices", globalThis.NAXORA_PART66_INVOICES, {});
  res.json({ success: true, part: part66Config.part, mode: subscriptions.mode, analytics: part66Analytics(subscriptions.rows, payments.rows, invoices.rows) });
});

app.get("/api/part66/checklist", (req, res) => {
  res.json({ success: true, part: part66Config.part, checklist: part66Checklist });
});

app.get("/api/part66/export", async (req, res) => {
  const subscriptions = await part66List("part66subscriptions", globalThis.NAXORA_PART66_SUBSCRIPTIONS, {});
  const payments = await part66List("part66payments", globalThis.NAXORA_PART66_PAYMENTS, {});
  const invoices = await part66List("part66invoices", globalThis.NAXORA_PART66_INVOICES, {});
  res.json({ success: true, part: part66Config.part, exportedAt: new Date().toISOString(), config: part66Config, plans: part66Plans, subscriptions: subscriptions.rows, payments: payments.rows, invoices: invoices.rows, analytics: part66Analytics(subscriptions.rows, payments.rows, invoices.rows) });
});

app.get("/api/part66/demo", async (req, res) => {
  res.json({ success: true, part: part66Config.part, config: part66Config, plans: part66Plans, subscriptions: globalThis.NAXORA_PART66_SUBSCRIPTIONS, payments: globalThis.NAXORA_PART66_PAYMENTS, invoices: globalThis.NAXORA_PART66_INVOICES, renewals: part66RenewalRows(globalThis.NAXORA_PART66_SUBSCRIPTIONS), checklist: part66Checklist });
});
// ================= END PART 66 =================



// ================= PART 67: AI HUB + VANI AI CARD FOUNDATION =================
// Part 67 ka goal: AI Doubts, AI Notes, AI Mock Tests, AI Roadmaps, Institute AI tools
// aur VANI AI Assistant ko ek safe central AI Hub me organize karna.
// VANI ka full working voice engine Part 69/70 me aayega; Part 67 me visible AI Hub card + roadmap lock hai.
const part67Config = {
  part: "Part 67 - AI Hub",
  status: "active",
  purpose: "Existing aur upcoming AI tools ko ek central NAXORA AI Hub me organize karna.",
  aiHubRoute: "/ai-hub",
  alternateRoutes: ["/ai-features", "/ai-tools", "/vani-ai", "/vani-assistant"],
  apiRoutes: [
    "/api/part67/status",
    "/api/part67/config",
    "/api/part67/tools",
    "/api/part67/vani-roadmap",
    "/api/part67/usage-summary",
    "/api/part67/launch",
    "/api/part67/checklist",
    "/api/part67/export",
    "/api/part67/demo"
  ],
  lockedDecision: "VANI ko AI Features / AI Hub ke andar proper card/section ke saath add karna hai.",
  safetyMode: "Part 67 me AI tools ka hub/registry/visibility hai; external paid AI API call ya real voice action nahi chalaya gaya.",
  currentVersionPlan: "Part 53-78 = NAXORA OS 1.0 completion. Part 79-110 = NAXORA OS 2.0 development.",
  nextPart: "Part 68 - AI Credits and Usage"
};

const part67Tools = [
  {
    id: "ai-doubts",
    title: "AI Doubts",
    tagline: "Student doubts ko simple Hindi/Hinglish explanation me solve karne ka assistant.",
    category: "Student Learning",
    route: "/ai-doubts",
    apiRoute: "/api/doubts",
    status: "ready-foundation",
    phase: "existing-ai-tool",
    userBenefit: "Student ko 24x7 basic study help milti hai aur teacher workload kam hota hai.",
    safeMode: "External paid AI model call is build me auto-trigger nahi hota. Existing route ke according safe foundation."
  },
  {
    id: "ai-notes",
    title: "AI Notes Generator",
    tagline: "Topic ya class content se quick revision notes banane ka tool.",
    category: "Content Generation",
    route: "/ai-notes",
    apiRoute: "/api/ai-notes",
    status: "ready-foundation",
    phase: "existing-ai-tool",
    userBenefit: "Teacher aur student ka note-making time reduce hota hai.",
    safeMode: "Notes generator UI/API registry AI Hub me visible hai."
  },
  {
    id: "ai-mock-tests",
    title: "AI Mock Test Generator",
    tagline: "Topic-wise practice tests aur quiz foundation.",
    category: "Assessment",
    route: "/ai-mock-tests",
    apiRoute: "/api/ai-mock-tests",
    status: "ready-foundation",
    phase: "existing-ai-tool",
    userBenefit: "Students regular practice kar sakte hain aur weak areas identify kar sakte hain.",
    safeMode: "Generated/mock test flow ko hub se central access milega."
  },
  {
    id: "ai-roadmaps",
    title: "AI Roadmap Generator",
    tagline: "Student goal ke according study plan/roadmap banane ka tool.",
    category: "Planning",
    route: "/ai-roadmaps",
    apiRoute: "/api/ai-roadmaps",
    status: "ready-foundation",
    phase: "existing-ai-tool",
    userBenefit: "Student ko kya aur kis order me padhna hai ye clear hota hai.",
    safeMode: "Roadmap tool ko hub ke andar organized access diya gaya."
  },
  {
    id: "vani-ai-assistant",
    title: "VANI AI Assistant",
    tagline: "NAXORA ka Hindi/Hinglish voice-first assistant. Part 69 me read-only search working start hoga.",
    category: "Voice AI",
    route: "/vani-ai",
    apiRoute: "/api/part67/vani-roadmap",
    status: "visible-coming-part69",
    phase: "locked-roadmap",
    userBenefit: "Owner voice se students, fees, attendance, batches aur reports quickly search kar paayega.",
    safeMode: "Part 67 me VANI visible card hai. Microphone/voice action/save/delete abhi enabled nahi hai."
  },
  {
    id: "institute-ai-tools",
    title: "Institute AI Tools",
    tagline: "Owner/counsellor ke liye admission, fee, attendance aur parent communication AI tools ka foundation.",
    category: "Institute Operations",
    route: "/ai-hub#institute-ai-tools",
    apiRoute: "/api/part67/tools?category=institute",
    status: "foundation",
    phase: "part67-hub",
    userBenefit: "Institute repetitive admin work ko AI support ke saath faster kar paayega.",
    safeMode: "Part 71 Admission Copilot active hai; Part 72-74 me fee/attendance, batch analyzer aur parent summary expand honge."
  },
  {
    id: "ai-admission-copilot",
    title: "AI Admission Copilot",
    tagline: "Enquiry reply drafts, follow-up suggestions, course recommendation, lead priority aur conversation support.",
    category: "Institute Operations",
    route: "/ai-admission-copilot",
    apiRoute: "/api/part71/status",
    status: "active-part71",
    phase: "part71-active",
    userBenefit: "Counsellor faster response de sakta hai aur owner ko hot leads pehle milte hain.",
    safeMode: "Draft-only, permission-aware, confirmation-first. Real send/discount/delete/export direct nahi hota."
  }
];

const part67VaniRoadmap = [
  {
    part: 67,
    title: "AI Hub me VANI Card",
    status: "active-now",
    scope: "VANI ko AI Features / AI Hub ke andar visible card aur roadmap ke saath add karna.",
    output: "VANI AI Assistant card, roadmap API, hub placement."
  },
  {
    part: 69,
    title: "VANI AI V1",
    status: "upcoming",
    scope: "Read-only voice/text search: students, fees, attendance, batches, reports.",
    output: "Safe search-only VANI. Save/delete/change action nahi."
  },
  {
    part: 70,
    title: "VANI AI V2",
    status: "upcoming",
    scope: "Hindi/Hinglish voice form filling with confirmation before save.",
    output: "Voice activity history + confirm-before-save."
  },
  {
    part: 75,
    title: "Student VANI Revision Assistant",
    status: "upcoming",
    scope: "Student AI Tools ke andar VANI revision support.",
    output: "Study planner/revision voice assistant foundation."
  },
  {
    part: "84-88",
    title: "Advanced VANI 2.0",
    status: "version-2-roadmap",
    scope: "Action engine, admission assistant, fee/attendance actions, voice reports, natural Hinglish conversation.",
    output: "Enterprise-grade VANI automation after v1.0."
  }
];

const part67Checklist = [
  "AI Hub page /ai-hub open ho raha hai.",
  "AI Doubts, AI Notes, AI Mock Tests, AI Roadmaps cards visible hain.",
  "VANI AI Assistant card AI Hub me visible hai.",
  "VANI ka status Part 69 me active read-only search hai.",
  "Institute AI Tools foundation visible hai.",
  "External paid AI API key ya secret ZIP me include nahi hai.",
  "Voice action/save/delete Part 67 me accidentally enabled nahi hai.",
  "Part 68 AI credits/usage ke liye usage-summary foundation ready hai."
];

function part67CleanText(value, max = 160) {
  return String(value ?? "").replace(/[<>]/g, "").trim().slice(0, max);
}

function part67ByCategory(tool, category) {
  if (!category) return true;
  const needle = part67CleanText(category, 60).toLowerCase();
  return tool.category.toLowerCase().includes(needle) || tool.id.toLowerCase().includes(needle) || tool.phase.toLowerCase().includes(needle);
}

async function part67UsageSummary() {
  const summary = {
    mode: mongoose.connection.readyState === 1 ? "mongodb" : "mock",
    aiCreditsFoundation: true,
    note: "Detailed AI credit enforcement Part 68 me aayega. Part 67 sirf safe usage summary foundation deta hai.",
    toolsVisible: part67Tools.length,
    readyFoundationTools: part67Tools.filter((t) => t.status.includes("ready") || t.status === "foundation").length,
    vaniVisible: part67Tools.some((t) => t.id === "vani-ai-assistant"),
    estimatedMonthlyCredits: {
      starter: 500,
      growth: 2500,
      pro: 10000,
      enterprise: "custom"
    },
    counts: {}
  };

  if (mongoose.connection.readyState === 1) {
    const collections = [
      ["aiNotes", "ainotes"],
      ["aiMockTests", "aimocktests"],
      ["aiRoadmaps", "airoadmaps"],
      ["doubts", "doubts"]
    ];
    for (const [label, collectionName] of collections) {
      try {
        summary.counts[label] = await mongoose.connection.db.collection(collectionName).countDocuments({});
      } catch (error) {
        summary.counts[label] = 0;
      }
    }
  } else {
    summary.counts = { aiNotes: 0, aiMockTests: 0, aiRoadmaps: 0, doubts: 0 };
  }

  return summary;
}

app.get("/api/part67/status", (req, res) => {
  res.json({
    success: true,
    part: part67Config.part,
    status: part67Config.status,
    purpose: part67Config.purpose,
    lockedDecision: part67Config.lockedDecision,
    frontend: [part67Config.aiHubRoute, ...part67Config.alternateRoutes],
    apiRoutes: part67Config.apiRoutes,
    tools: part67Tools.map((tool) => ({ id: tool.id, title: tool.title, status: tool.status, route: tool.route })),
    nextPart: part67Config.nextPart
  });
});

app.get("/api/part67/config", (req, res) => {
  res.json({ success: true, part: part67Config.part, config: part67Config });
});

app.get("/api/part67/tools", (req, res) => {
  const category = req.query?.category;
  const rows = part67Tools.filter((tool) => part67ByCategory(tool, category));
  res.json({ success: true, part: part67Config.part, count: rows.length, tools: rows });
});

app.get("/api/part67/vani-roadmap", (req, res) => {
  res.json({
    success: true,
    part: part67Config.part,
    locked: true,
    message: "VANI AI Assistant AI Hub ke andar active hai. Part 69 me read-only voice/text search working start ho chuki hai.",
    roadmap: part67VaniRoadmap
  });
});

app.get("/api/part67/usage-summary", async (req, res) => {
  res.json({ success: true, part: part67Config.part, usage: await part67UsageSummary() });
});

app.post("/api/part67/launch", (req, res) => {
  const toolId = part67CleanText(req.body?.toolId || req.query?.toolId || "ai-hub", 80);
  const tool = part67Tools.find((item) => item.id === toolId) || part67Tools.find((item) => item.route.includes(toolId));
  if (!tool) {
    return res.status(404).json({ success: false, part: part67Config.part, message: "AI tool nahi mila.", availableTools: part67Tools.map((item) => item.id) });
  }
  return res.json({
    success: true,
    part: part67Config.part,
    message: `${tool.title} launch route ready hai.`,
    tool,
    launchUrl: tool.route,
    actionMode: tool.id === "vani-ai-assistant" ? "visible-only-until-part69" : "safe-launch-link"
  });
});

app.get("/api/part67/checklist", (req, res) => {
  res.json({ success: true, part: part67Config.part, checklist: part67Checklist });
});

app.get("/api/part67/export", async (req, res) => {
  res.json({
    success: true,
    part: part67Config.part,
    exportedAt: new Date().toISOString(),
    config: part67Config,
    tools: part67Tools,
    vaniRoadmap: part67VaniRoadmap,
    usage: await part67UsageSummary(),
    checklist: part67Checklist
  });
});

app.get("/api/part67/demo", async (req, res) => {
  res.json({
    success: true,
    part: part67Config.part,
    demoTitle: "NAXORA AI Hub Demo",
    tools: part67Tools,
    vaniRoadmap: part67VaniRoadmap,
    usage: await part67UsageSummary(),
    checklist: part67Checklist
  });
});
// ================= END PART 67 =================


// ================= PART 68: AI CREDITS AND USAGE =================
// Part 68 ka goal: AI features ke liye credits, limits, usage logs aur reports ka safe foundation.
// Ye actual paid AI API call nahi chalata; ye cost-control / fair-usage layer prepare karta hai.
const part68Config = {
  part: "Part 68 - AI Credits and Usage",
  status: "active",
  purpose: "AI API cost control, plan-wise limits, usage tracking aur profitable pricing foundation.",
  aiCreditsRoute: "/ai-credits-usage",
  alternateRoutes: ["/ai-credits", "/ai-usage", "/credits"],
  apiRoutes: [
    "/api/part68/status",
    "/api/part68/config",
    "/api/part68/credit-plans",
    "/api/part68/usage-summary",
    "/api/part68/usage-logs",
    "/api/part68/consume",
    "/api/part68/allocate",
    "/api/part68/reset-cycle",
    "/api/part68/extra-credit-packages",
    "/api/part68/purchase-request",
    "/api/part68/reports",
    "/api/part68/checklist",
    "/api/part68/export",
    "/api/part68/demo"
  ],
  safetyMode: "External AI model, real payment, WhatsApp/SMS/email send aur auto-deduction nahi chalaya gaya. Ye controlled credit ledger foundation hai.",
  currentVersionPlan: "Part 53-78 = NAXORA OS 1.0 completion. Part 79-110 = NAXORA OS 2.0 development.",
  previousPart: "Part 67 - AI Hub with VANI card",
  nextPart: "Part 69 - VANI AI V1"
};

const part68CreditPlans = [
  {
    id: "starter",
    name: "Starter AI",
    monthlyCredits: 500,
    includedTools: ["AI Doubts", "AI Notes", "AI Mock Tests"],
    maxSingleUseCredits: 25,
    bestFor: "Small coaching / demo institute",
    guardrail: "High-cost tools limited. Extra credits optional."
  },
  {
    id: "growth",
    name: "Growth AI",
    monthlyCredits: 2500,
    includedTools: ["AI Doubts", "AI Notes", "AI Mock Tests", "AI Roadmaps", "Institute AI Tools"],
    maxSingleUseCredits: 75,
    bestFor: "Growing institute with regular AI usage",
    guardrail: "Daily usage reports and owner visibility."
  },
  {
    id: "pro",
    name: "Pro AI",
    monthlyCredits: 10000,
    includedTools: ["All AI Hub tools", "VANI read-only search from Part 69", "AI admission/follow-up tools later"],
    maxSingleUseCredits: 200,
    bestFor: "Large institute / multi-batch setup",
    guardrail: "Plan-wise limit + anomaly flag foundation."
  },
  {
    id: "enterprise",
    name: "Enterprise AI",
    monthlyCredits: 50000,
    includedTools: ["Custom AI limits", "Priority VANI roadmap", "Advanced analytics"],
    maxSingleUseCredits: 500,
    bestFor: "Large chain / white-label future client",
    guardrail: "Custom contract and manual approval for very high usage."
  }
];

const part68ToolCostCatalog = [
  { toolId: "ai-doubts", label: "AI Doubts", defaultCredits: 5, category: "Student Learning", route: "/ai-doubts" },
  { toolId: "ai-notes", label: "AI Notes Generator", defaultCredits: 12, category: "Content Generation", route: "/ai-notes" },
  { toolId: "ai-mock-tests", label: "AI Mock Test Generator", defaultCredits: 18, category: "Assessment", route: "/ai-mock-tests" },
  { toolId: "ai-roadmaps", label: "AI Roadmap Generator", defaultCredits: 20, category: "Planning", route: "/ai-roadmaps" },
  { toolId: "vani-ai-v1", label: "VANI AI V1 Search", defaultCredits: 2, category: "Voice AI", route: "/vani-ai", status: "coming-part69" },
  { toolId: "institute-ai-tools", label: "Institute AI Tools", defaultCredits: 25, category: "Institute Operations", route: "/ai-hub#institute-ai-tools", status: "foundation" }
];

const part68ExtraCreditPackages = [
  { id: "extra-1000", credits: 1000, label: "1,000 Extra AI Credits", suggestedPriceInr: 199, status: "purchase-request-only" },
  { id: "extra-5000", credits: 5000, label: "5,000 Extra AI Credits", suggestedPriceInr: 799, status: "purchase-request-only" },
  { id: "extra-20000", credits: 20000, label: "20,000 Extra AI Credits", suggestedPriceInr: 2499, status: "purchase-request-only" }
];

const part68Checklist = [
  "AI Credits page /ai-credits-usage open ho raha hai.",
  "Plan-wise monthly credits visible hain.",
  "Used, remaining aur reserved credits summary visible hai.",
  "AI tool cost catalog visible hai.",
  "Usage logs safe mock/MongoDB mode me list hote hain.",
  "Consume route credit limit check karta hai, external AI API call nahi karta.",
  "Extra credit purchase request foundation ready hai, real charge nahi karta.",
  "VANI AI V1 ko Part 69 se credit system ke saath connect karne ka base ready hai.",
  ".env, secret, paid AI API key, Razorpay secret ZIP me include nahi hai."
];

globalThis.NAXORA_PART68_LEDGER = globalThis.NAXORA_PART68_LEDGER || [
  {
    id: "ledger-demo-growth",
    instituteId: "demo-institute",
    instituteName: "NAXORA Demo Institute",
    planId: "growth",
    allocatedCredits: 2500,
    usedCredits: 420,
    reservedCredits: 80,
    cycleStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
    cycleEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString(),
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

globalThis.NAXORA_PART68_USAGE_LOGS = globalThis.NAXORA_PART68_USAGE_LOGS || [
  {
    id: "usage-demo-001",
    instituteId: "demo-institute",
    userRole: "teacher",
    toolId: "ai-notes",
    toolLabel: "AI Notes Generator",
    creditsUsed: 12,
    status: "recorded",
    note: "Demo AI notes usage log",
    createdAt: new Date().toISOString()
  },
  {
    id: "usage-demo-002",
    instituteId: "demo-institute",
    userRole: "student",
    toolId: "ai-doubts",
    toolLabel: "AI Doubts",
    creditsUsed: 5,
    status: "recorded",
    note: "Demo doubt solve usage log",
    createdAt: new Date().toISOString()
  }
];

globalThis.NAXORA_PART68_PURCHASE_REQUESTS = globalThis.NAXORA_PART68_PURCHASE_REQUESTS || [];

function part68CleanText(value, max = 160) {
  return String(value ?? "").replace(/[<>]/g, "").trim().slice(0, max);
}

function part68Number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function part68FindPlan(planId) {
  return part68CreditPlans.find((plan) => plan.id === part68CleanText(planId, 50)) || part68CreditPlans[0];
}

function part68FindTool(toolId) {
  return part68ToolCostCatalog.find((tool) => tool.toolId === part68CleanText(toolId, 80)) || part68ToolCostCatalog[0];
}

function part68LedgerView(row = {}) {
  const allocated = part68Number(row.allocatedCredits, 0);
  const used = part68Number(row.usedCredits, 0);
  const reserved = part68Number(row.reservedCredits, 0);
  const remaining = Math.max(allocated - used - reserved, 0);
  const usagePercent = allocated > 0 ? Math.round((used / allocated) * 100) : 0;
  return {
    id: row._id || row.id,
    instituteId: row.instituteId || "demo-institute",
    instituteName: row.instituteName || "NAXORA Institute",
    planId: row.planId || "starter",
    allocatedCredits: allocated,
    usedCredits: used,
    reservedCredits: reserved,
    remainingCredits: remaining,
    usagePercent,
    status: row.status || "active",
    cycleStart: row.cycleStart,
    cycleEnd: row.cycleEnd,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

async function part68List(collectionName, fallbackRows = [], query = {}) {
  if (mongoose.connection.readyState === 1) {
    try {
      const rows = await mongoose.connection.db.collection(collectionName).find(query).sort({ createdAt: -1 }).limit(200).toArray();
      return { mode: "mongodb", rows };
    } catch (error) {
      return { mode: "mongodb-error", rows: fallbackRows, error: error.message };
    }
  }
  return { mode: "mock", rows: fallbackRows };
}

async function part68Insert(collectionName, fallbackStore, row) {
  const doc = { ...row, createdAt: row.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
  if (mongoose.connection.readyState === 1) {
    try {
      const result = await mongoose.connection.db.collection(collectionName).insertOne(doc);
      return { mode: "mongodb", row: { ...doc, _id: result.insertedId } };
    } catch (error) {
      fallbackStore.unshift({ ...doc, id: doc.id || `mock-${Date.now()}` });
      return { mode: "mongodb-error-fallback", row: fallbackStore[0], error: error.message };
    }
  }
  fallbackStore.unshift({ ...doc, id: doc.id || `mock-${Date.now()}` });
  return { mode: "mock", row: fallbackStore[0] };
}

function part68Summary(ledgerRows = [], usageRows = []) {
  const ledgers = ledgerRows.map(part68LedgerView);
  const totals = ledgers.reduce((acc, item) => {
    acc.allocatedCredits += item.allocatedCredits;
    acc.usedCredits += item.usedCredits;
    acc.reservedCredits += item.reservedCredits;
    acc.remainingCredits += item.remainingCredits;
    return acc;
  }, { allocatedCredits: 0, usedCredits: 0, reservedCredits: 0, remainingCredits: 0 });
  const toolBreakdown = {};
  for (const log of usageRows) {
    const key = log.toolId || "unknown";
    toolBreakdown[key] = toolBreakdown[key] || { toolId: key, toolLabel: log.toolLabel || key, count: 0, creditsUsed: 0 };
    toolBreakdown[key].count += 1;
    toolBreakdown[key].creditsUsed += part68Number(log.creditsUsed, 0);
  }
  return {
    totals,
    ledgerCount: ledgers.length,
    usageLogCount: usageRows.length,
    toolBreakdown: Object.values(toolBreakdown),
    guardrails: [
      "Monthly plan limit visible",
      "Remaining credits visible before AI action",
      "High-cost action can be blocked or confirmed later",
      "VANI Part 69 usage can be counted from first version"
    ]
  };
}

app.get("/api/part68/status", (req, res) => {
  res.json({
    success: true,
    part: part68Config.part,
    status: part68Config.status,
    purpose: part68Config.purpose,
    frontend: [part68Config.aiCreditsRoute, ...part68Config.alternateRoutes],
    apiRoutes: part68Config.apiRoutes,
    safetyMode: part68Config.safetyMode,
    nextPart: part68Config.nextPart
  });
});

app.get("/api/part68/config", (req, res) => {
  res.json({ success: true, part: part68Config.part, config: part68Config, toolCostCatalog: part68ToolCostCatalog });
});

app.get("/api/part68/credit-plans", (req, res) => {
  res.json({ success: true, part: part68Config.part, plans: part68CreditPlans, toolCostCatalog: part68ToolCostCatalog });
});

app.get("/api/part68/usage-summary", async (req, res) => {
  const instituteId = part68CleanText(req.query?.instituteId || "", 80);
  const query = instituteId ? { instituteId } : {};
  const ledgers = await part68List("part68ledgers", globalThis.NAXORA_PART68_LEDGER, query);
  const logs = await part68List("part68usagelogs", globalThis.NAXORA_PART68_USAGE_LOGS, query);
  res.json({ success: true, part: part68Config.part, mode: ledgers.mode, ledgers: ledgers.rows.map(part68LedgerView), summary: part68Summary(ledgers.rows, logs.rows) });
});

app.get("/api/part68/usage-logs", async (req, res) => {
  const instituteId = part68CleanText(req.query?.instituteId || "", 80);
  const toolId = part68CleanText(req.query?.toolId || "", 80);
  const query = {};
  if (instituteId) query.instituteId = instituteId;
  if (toolId) query.toolId = toolId;
  const logs = await part68List("part68usagelogs", globalThis.NAXORA_PART68_USAGE_LOGS, query);
  res.json({ success: true, part: part68Config.part, mode: logs.mode, count: logs.rows.length, logs: logs.rows });
});

app.post("/api/part68/consume", async (req, res) => {
  const body = req.body || {};
  const instituteId = part68CleanText(body.instituteId || req.query?.instituteId || "demo-institute", 80);
  const tool = part68FindTool(body.toolId || req.query?.toolId || "ai-doubts");
  const requestedCredits = Math.max(1, part68Number(body.credits || req.query?.credits, tool.defaultCredits));
  const ledgerRows = await part68List("part68ledgers", globalThis.NAXORA_PART68_LEDGER, { instituteId });
  const activeLedger = part68LedgerView(ledgerRows.rows[0] || globalThis.NAXORA_PART68_LEDGER[0]);
  if (requestedCredits > activeLedger.remainingCredits) {
    return res.status(402).json({
      success: false,
      part: part68Config.part,
      message: "AI credits insufficient hain. Extra credits ya plan upgrade required.",
      requestedCredits,
      remainingCredits: activeLedger.remainingCredits,
      tool,
      actionMode: "blocked-before-external-ai-call"
    });
  }
  const log = {
    instituteId,
    userId: part68CleanText(body.userId || "demo-user", 80),
    userRole: part68CleanText(body.userRole || "owner", 50),
    toolId: tool.toolId,
    toolLabel: tool.label,
    creditsUsed: requestedCredits,
    status: "recorded",
    note: part68CleanText(body.note || "AI credit consumed in safe ledger mode", 240),
    requestId: `aiuse-${Date.now()}`
  };
  const inserted = await part68Insert("part68usagelogs", globalThis.NAXORA_PART68_USAGE_LOGS, log);
  res.json({ success: true, part: part68Config.part, mode: inserted.mode, message: "AI usage log recorded. External AI API call is build me run nahi hui.", remainingBefore: activeLedger.remainingCredits, creditsUsed: requestedCredits, remainingAfterEstimate: Math.max(activeLedger.remainingCredits - requestedCredits, 0), usage: inserted.row, tool });
});

app.post("/api/part68/allocate", async (req, res) => {
  const body = req.body || {};
  const plan = part68FindPlan(body.planId || "starter");
  const row = {
    id: `ledger-${Date.now()}`,
    instituteId: part68CleanText(body.instituteId || "demo-institute", 80),
    instituteName: part68CleanText(body.instituteName || "NAXORA Institute", 120),
    planId: plan.id,
    allocatedCredits: part68Number(body.allocatedCredits, plan.monthlyCredits),
    usedCredits: part68Number(body.usedCredits, 0),
    reservedCredits: part68Number(body.reservedCredits, 0),
    cycleStart: body.cycleStart || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
    cycleEnd: body.cycleEnd || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString(),
    status: "active"
  };
  const inserted = await part68Insert("part68ledgers", globalThis.NAXORA_PART68_LEDGER, row);
  res.json({ success: true, part: part68Config.part, mode: inserted.mode, message: "AI credits allocated safely.", ledger: part68LedgerView(inserted.row), plan });
});

app.post("/api/part68/reset-cycle", (req, res) => {
  res.json({
    success: true,
    part: part68Config.part,
    message: "Cycle reset foundation ready hai. Production me owner/admin confirmation + subscription status check ke baad monthly reset run hoga.",
    actionMode: "preview-only",
    nextSteps: ["Subscription active verify", "Old cycle export", "New cycle allocate", "Owner notification"]
  });
});

app.get("/api/part68/extra-credit-packages", (req, res) => {
  res.json({ success: true, part: part68Config.part, packages: part68ExtraCreditPackages, note: "Real payment capture Part 66/Razorpay live keys ke saath connect hoga. Is route me charge nahi hota." });
});

app.post("/api/part68/purchase-request", async (req, res) => {
  const body = req.body || {};
  const pack = part68ExtraCreditPackages.find((item) => item.id === part68CleanText(body.packageId || "", 80)) || part68ExtraCreditPackages[0];
  const row = {
    id: `credit-request-${Date.now()}`,
    instituteId: part68CleanText(body.instituteId || "demo-institute", 80),
    instituteName: part68CleanText(body.instituteName || "NAXORA Institute", 120),
    packageId: pack.id,
    credits: pack.credits,
    suggestedPriceInr: pack.suggestedPriceInr,
    status: "requested",
    contactPhone: part68CleanText(body.contactPhone || "", 20),
    note: part68CleanText(body.note || "Extra AI credits request", 240)
  };
  const inserted = await part68Insert("part68purchaserequests", globalThis.NAXORA_PART68_PURCHASE_REQUESTS, row);
  res.json({ success: true, part: part68Config.part, mode: inserted.mode, message: "Extra credit purchase request saved. Real payment charge nahi hua.", request: inserted.row, package: pack });
});

app.get("/api/part68/reports", async (req, res) => {
  const ledgers = await part68List("part68ledgers", globalThis.NAXORA_PART68_LEDGER, {});
  const logs = await part68List("part68usagelogs", globalThis.NAXORA_PART68_USAGE_LOGS, {});
  res.json({ success: true, part: part68Config.part, mode: ledgers.mode, reportType: "ai-usage-cost-control", summary: part68Summary(ledgers.rows, logs.rows), ledgers: ledgers.rows.map(part68LedgerView), recentLogs: logs.rows.slice(0, 20) });
});

app.get("/api/part68/checklist", (req, res) => {
  res.json({ success: true, part: part68Config.part, checklist: part68Checklist });
});

app.get("/api/part68/export", async (req, res) => {
  const ledgers = await part68List("part68ledgers", globalThis.NAXORA_PART68_LEDGER, {});
  const logs = await part68List("part68usagelogs", globalThis.NAXORA_PART68_USAGE_LOGS, {});
  res.json({ success: true, part: part68Config.part, exportedAt: new Date().toISOString(), config: part68Config, plans: part68CreditPlans, toolCostCatalog: part68ToolCostCatalog, extraCreditPackages: part68ExtraCreditPackages, ledgers: ledgers.rows.map(part68LedgerView), usageLogs: logs.rows, summary: part68Summary(ledgers.rows, logs.rows), checklist: part68Checklist });
});

app.get("/api/part68/demo", async (req, res) => {
  const ledgers = await part68List("part68ledgers", globalThis.NAXORA_PART68_LEDGER, {});
  const logs = await part68List("part68usagelogs", globalThis.NAXORA_PART68_USAGE_LOGS, {});
  res.json({ success: true, part: part68Config.part, demoTitle: "AI Credits and Usage Demo", plans: part68CreditPlans, toolCostCatalog: part68ToolCostCatalog, ledgers: ledgers.rows.map(part68LedgerView), usageLogs: logs.rows, summary: part68Summary(ledgers.rows, logs.rows), nextPart: part68Config.nextPart });
});
// ================= END PART 68 =================

// ================= PART 69: VANI AI V1 - READ-ONLY VOICE SEARCH =================
// Part 69 ka goal: VANI ko AI Hub ke andar se working read-only assistant banana.
// VANI V1 sirf search/read karegi: students, fees, attendance, batches aur reports.
// Save/edit/delete/action Part 70+ me confirmation ke saath aayega.
const part69Config = {
  part: "Part 69 - VANI AI V1",
  status: "active",
  purpose: "Owner ke liye read-only voice/text search: students, fees, attendance, batches aur reports.",
  frontendRoute: "/vani-ai-v1",
  alternateRoutes: ["/vani-ai", "/vani-assistant", "/vani", "/voice-search", "/vani-search"],
  apiRoutes: [
    "/api/part69/status",
    "/api/part69/config",
    "/api/part69/commands",
    "/api/part69/search",
    "/api/part69/voice-search",
    "/api/part69/history",
    "/api/part69/credit-preview",
    "/api/part69/checklist",
    "/api/part69/export",
    "/api/part69/demo"
  ],
  safetyMode: "Read-only mode. VANI V1 data save, edit, delete, payment, message-send ya irreversible action nahi karti.",
  aiHubDecision: "VANI ko AI Features / AI Hub ke andar rakha gaya hai. Part 67 me card visible tha; Part 69 me working read-only search start hai.",
  previousPart: "Part 68 - AI Credits and Usage",
  nextPart: "Part 70 - VANI AI V2 voice form filling"
};

const part69CommandCatalog = [
  {
    target: "students",
    title: "Student Search",
    examples: ["Rahul student search karo", "Class 10 ke students dikhao", "Aman ka profile dikhao"],
    keywords: ["student", "students", "bachcha", "baccha", "vidyarthi", "profile", "class", "course"],
    route: "/students"
  },
  {
    target: "fees",
    title: "Fees Search",
    examples: ["Pending fees list dikhao", "Rahul ka fee status", "Aaj ki collection report"],
    keywords: ["fee", "fees", "pending", "paid", "collection", "payment", "dues", "due"],
    route: "/fees"
  },
  {
    target: "attendance",
    title: "Attendance Search",
    examples: ["Aaj absent students dikhao", "Class 10 attendance report", "Rahul ki attendance"],
    keywords: ["attendance", "present", "absent", "hazri", "haazri", "attendance report"],
    route: "/attendance"
  },
  {
    target: "batches",
    title: "Batch Search",
    examples: ["JEE Foundation batch dikhao", "Aaj ke batches", "Batch A students"],
    keywords: ["batch", "batches", "class schedule", "course", "timing", "teacher"],
    route: "/batches"
  },
  {
    target: "reports",
    title: "Reports Search",
    examples: ["Weekly report kholo", "Revenue report", "Student performance report"],
    keywords: ["report", "reports", "summary", "analytics", "performance", "revenue", "weekly"],
    route: "/reports"
  }
];

const part69Checklist = [
  "VANI page /vani-ai-v1 open ho raha hai.",
  "AI Hub se VANI card /vani-ai par working page kholta hai.",
  "Voice button browser Speech Recognition available ho to command capture karta hai.",
  "Text command box Hindi/Hinglish query accept karta hai.",
  "Student, fees, attendance, batch aur reports target detect hote hain.",
  "Search result read-only response deta hai; save/edit/delete action nahi hota.",
  "Credit preview Part 68 ke saath compatible hai.",
  "History safe mode me recent VANI commands dikhata hai.",
  ".env, secret, AI API key, Razorpay key ZIP me include nahi hai."
];

const part69DemoData = {
  students: [
    { id: "NX-STU-1001", name: "Rahul Sharma", className: "Class 10", course: "Maths + Science", batch: "Evening Batch A", phoneMasked: "98******21", status: "active" },
    { id: "NX-STU-1002", name: "Aman Verma", className: "Class 12", course: "JEE Foundation", batch: "Morning Batch J1", phoneMasked: "99******44", status: "active" },
    { id: "NX-STU-1003", name: "Priya Singh", className: "Class 11", course: "NEET Foundation", batch: "Afternoon Batch N1", phoneMasked: "97******80", status: "active" }
  ],
  fees: [
    { id: "FEE-001", studentName: "Rahul Sharma", totalFee: 25000, paid: 15000, pending: 10000, dueDate: "2026-07-25", status: "pending" },
    { id: "FEE-002", studentName: "Aman Verma", totalFee: 40000, paid: 40000, pending: 0, dueDate: "2026-07-15", status: "paid" },
    { id: "FEE-003", studentName: "Priya Singh", totalFee: 38000, paid: 20000, pending: 18000, dueDate: "2026-07-30", status: "pending" }
  ],
  attendance: [
    { id: "ATT-001", date: "2026-07-14", studentName: "Rahul Sharma", batch: "Evening Batch A", status: "present", percentage: 88 },
    { id: "ATT-002", date: "2026-07-14", studentName: "Aman Verma", batch: "Morning Batch J1", status: "absent", percentage: 76 },
    { id: "ATT-003", date: "2026-07-14", studentName: "Priya Singh", batch: "Afternoon Batch N1", status: "present", percentage: 92 }
  ],
  batches: [
    { id: "BAT-001", name: "Evening Batch A", course: "Maths + Science", teacher: "Mr. Kapoor", timing: "5:00 PM - 7:00 PM", students: 28, status: "active" },
    { id: "BAT-002", name: "Morning Batch J1", course: "JEE Foundation", teacher: "Ms. Iyer", timing: "7:00 AM - 9:00 AM", students: 34, status: "active" },
    { id: "BAT-003", name: "Afternoon Batch N1", course: "NEET Foundation", teacher: "Dr. Mehta", timing: "3:00 PM - 5:00 PM", students: 31, status: "active" }
  ],
  reports: [
    { id: "REP-001", title: "Weekly Attendance Summary", type: "attendance", summary: "Overall attendance 86%. 4 students need follow-up.", route: "/reports" },
    { id: "REP-002", title: "Pending Fees Summary", type: "fees", summary: "₹28,000 pending across 2 demo students.", route: "/fees" },
    { id: "REP-003", title: "Batch Performance Snapshot", type: "performance", summary: "NEET Foundation batch performing strongest this week.", route: "/progress" }
  ]
};

globalThis.NAXORA_PART69_HISTORY = globalThis.NAXORA_PART69_HISTORY || [];

function part69CleanText(value, max = 180) {
  return String(value ?? "").replace(/[<>]/g, "").trim().slice(0, max);
}

function part69Lower(value) {
  return part69CleanText(value, 300).toLowerCase();
}

function part69DetectTarget(command = "") {
  const text = part69Lower(command);
  const scores = part69CommandCatalog.map((item) => {
    const score = item.keywords.reduce((count, keyword) => text.includes(keyword.toLowerCase()) ? count + 1 : count, 0);
    return { ...item, score };
  }).sort((a, b) => b.score - a.score);
  return scores[0]?.score > 0 ? scores[0] : part69CommandCatalog[0];
}

function part69ExtractQuery(command = "", target = "students") {
  let text = part69CleanText(command, 180);
  const removeWords = ["dikhao", "batao", "search", "karo", "kholo", "list", "show", "find", "vani", "please", "ka", "ki", "ke"];
  const targetWords = part69CommandCatalog.find((item) => item.target === target)?.keywords || [];
  for (const word of [...removeWords, ...targetWords]) {
    text = text.replace(new RegExp(`\\b${word.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\b`, "gi"), " ");
  }
  return text.replace(/\s+/g, " ").trim();
}

function part69Mask(value = "") {
  const text = String(value || "");
  if (text.length <= 4) return text;
  return `${text.slice(0, 2)}******${text.slice(-2)}`;
}

function part69SafeRow(row = {}, target = "students") {
  if (target === "students") {
    return {
      id: row._id || row.id || row.studentId || row.admissionNo || "student-row",
      name: row.name || row.studentName || row.fullName || "Student",
      className: row.className || row.class || row.standard || row.grade || "Not set",
      course: row.course || row.courseName || "Not set",
      batch: row.batch || row.batchName || "Not assigned",
      phoneMasked: row.phoneMasked || part69Mask(row.phone || row.mobile || row.parentPhone || ""),
      status: row.status || "active"
    };
  }
  if (target === "fees") {
    const totalFee = Number(row.totalFee || row.amount || row.feeAmount || 0);
    const paid = Number(row.paid || row.paidAmount || 0);
    const pending = Number(row.pending || row.pendingAmount || Math.max(totalFee - paid, 0));
    return {
      id: row._id || row.id || "fee-row",
      studentName: row.studentName || row.name || "Student",
      totalFee,
      paid,
      pending,
      dueDate: row.dueDate || row.nextDueDate || "Not set",
      status: row.status || (pending > 0 ? "pending" : "paid")
    };
  }
  if (target === "attendance") {
    return {
      id: row._id || row.id || "attendance-row",
      date: row.date || row.attendanceDate || "Not set",
      studentName: row.studentName || row.name || "Student",
      batch: row.batch || row.batchName || "Not set",
      status: row.status || row.attendanceStatus || "not-marked",
      percentage: row.percentage || row.attendancePercentage || null
    };
  }
  if (target === "batches") {
    return {
      id: row._id || row.id || "batch-row",
      name: row.name || row.batchName || "Batch",
      course: row.course || row.courseName || "Not set",
      teacher: row.teacher || row.teacherName || "Not assigned",
      timing: row.timing || row.schedule || "Not set",
      students: row.students || row.studentCount || 0,
      status: row.status || "active"
    };
  }
  return {
    id: row._id || row.id || "report-row",
    title: row.title || row.name || "Report",
    type: row.type || row.reportType || "summary",
    summary: row.summary || row.description || "Report summary available.",
    route: row.route || "/reports"
  };
}

function part69Matches(row = {}, query = "") {
  const q = part69Lower(query);
  if (!q) return true;
  return part69Lower(JSON.stringify(row)).includes(q);
}

async function part69CollectionRows(target = "students", query = "") {
  const collectionMap = {
    students: ["students", "part56enrolments"],
    fees: ["fees", "payments", "part66payments"],
    attendance: ["attendances", "attendance", "part64attendance"],
    batches: ["batches", "courses"],
    reports: ["reports", "part68usagelogs", "part63funnel"]
  };

  // Security: public VANI API demo data return karti hai. Real DB search ko future protected route me hard-enable karenge.
  // Isse beta/live public URL par private student data accidentally expose nahi hota.
  const allowRealDbSearch = String(process.env.VANI_REAL_DB_SEARCH || "false").toLowerCase() === "true";
  if (!allowRealDbSearch || mongoose.connection.readyState !== 1) {
    const rows = (part69DemoData[target] || []).filter((row) => part69Matches(row, query));
    return { mode: allowRealDbSearch ? "mock-db-not-connected" : "safe-demo", rows };
  }

  const names = collectionMap[target] || [target];
  const collected = [];
  for (const name of names) {
    try {
      const regex = query ? new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : null;
      const mongoQuery = regex ? { $or: [{ name: regex }, { studentName: regex }, { title: regex }, { course: regex }, { batch: regex }, { status: regex }] } : {};
      const rows = await mongoose.connection.db.collection(name).find(mongoQuery).limit(10).toArray();
      collected.push(...rows);
      if (collected.length >= 10) break;
    } catch {
      // collection missing ho to ignore, fallback neeche.
    }
  }
  if (!collected.length) {
    return { mode: "mongodb-empty-fallback-demo", rows: (part69DemoData[target] || []).filter((row) => part69Matches(row, query)) };
  }
  return { mode: "mongodb", rows: collected.slice(0, 10) };
}

async function part69RunSearch(commandInput = "") {
  const command = part69CleanText(commandInput || "students search", 220);
  const detected = part69DetectTarget(command);
  const query = part69ExtractQuery(command, detected.target);
  const data = await part69CollectionRows(detected.target, query);
  const results = data.rows.map((row) => part69SafeRow(row, detected.target));
  const responseText = results.length
    ? `VANI ne ${detected.title} me ${results.length} read-only result nikale.`
    : `VANI ko ${detected.title} me matching result nahi mila. Query thodi simple karke try karo.`;
  const historyRow = {
    id: `vani-${Date.now()}`,
    command,
    target: detected.target,
    query,
    resultCount: results.length,
    mode: data.mode,
    readOnly: true,
    createdAt: new Date().toISOString()
  };
  globalThis.NAXORA_PART69_HISTORY.unshift(historyRow);
  globalThis.NAXORA_PART69_HISTORY = globalThis.NAXORA_PART69_HISTORY.slice(0, 50);
  return { detectedTarget: detected, query, mode: data.mode, results, responseText, history: historyRow };
}

app.get("/api/part69/status", (req, res) => {
  res.json({
    success: true,
    part: part69Config.part,
    status: part69Config.status,
    purpose: part69Config.purpose,
    frontend: [part69Config.frontendRoute, ...part69Config.alternateRoutes],
    apiRoutes: part69Config.apiRoutes,
    safetyMode: part69Config.safetyMode,
    aiHubDecision: part69Config.aiHubDecision,
    nextPart: part69Config.nextPart
  });
});

app.get("/api/part69/config", (req, res) => {
  res.json({ success: true, part: part69Config.part, config: part69Config, commandCatalog: part69CommandCatalog });
});

app.get("/api/part69/commands", (req, res) => {
  res.json({ success: true, part: part69Config.part, commands: part69CommandCatalog });
});

app.get("/api/part69/search", async (req, res) => {
  const command = req.query?.q || req.query?.command || "students search";
  const result = await part69RunSearch(command);
  res.json({ success: true, part: part69Config.part, readOnly: true, ...result });
});

app.post("/api/part69/search", async (req, res) => {
  const command = req.body?.command || req.body?.q || "students search";
  const result = await part69RunSearch(command);
  res.json({ success: true, part: part69Config.part, readOnly: true, ...result });
});

app.post("/api/part69/voice-search", async (req, res) => {
  const transcript = req.body?.transcript || req.body?.command || "pending fees dikhao";
  const result = await part69RunSearch(transcript);
  res.json({ success: true, part: part69Config.part, inputType: "voice-transcript", readOnly: true, ...result });
});

app.get("/api/part69/history", (req, res) => {
  res.json({ success: true, part: part69Config.part, count: globalThis.NAXORA_PART69_HISTORY.length, history: globalThis.NAXORA_PART69_HISTORY });
});

app.get("/api/part69/credit-preview", (req, res) => {
  res.json({
    success: true,
    part: part69Config.part,
    toolId: "vani-ai-v1",
    defaultCreditsPerSearch: 2,
    connectedToPart68: true,
    note: "Part 68 me VANI AI V1 Search credit catalog ready tha. Is build me preview hai; hard credit deduction later protected flow me hoga."
  });
});

app.get("/api/part69/checklist", (req, res) => {
  res.json({ success: true, part: part69Config.part, checklist: part69Checklist });
});

app.get("/api/part69/export", async (req, res) => {
  res.json({
    success: true,
    part: part69Config.part,
    exportedAt: new Date().toISOString(),
    config: part69Config,
    commands: part69CommandCatalog,
    demoData: part69DemoData,
    history: globalThis.NAXORA_PART69_HISTORY,
    checklist: part69Checklist
  });
});

app.get("/api/part69/demo", async (req, res) => {
  const samples = [];
  for (const command of ["Rahul student search karo", "pending fees dikhao", "aaj absent students dikhao", "JEE batch dikhao", "weekly report kholo"]) {
    samples.push(await part69RunSearch(command));
  }
  res.json({ success: true, part: part69Config.part, demoTitle: "VANI AI V1 Read-only Search Demo", samples, checklist: part69Checklist });
});
// ================= END PART 69 =================



// ================= PART 70: VANI AI V2 - VOICE FORM FILLING =================
// Part 70 ka goal: VANI ko Hindi/Hinglish voice/text input se form draft fill karna sikhana.
// Safety rule: VANI save se pehle confirmation maangti hai. Direct edit/delete/payment/message-send nahi hota.
const part70Config = {
  part: "Part 70 - VANI AI V2",
  status: "active",
  purpose: "Hindi/Hinglish voice form filling with confirmation before save and activity history.",
  frontendRoute: "/vani-ai-v2",
  alternateRoutes: ["/vani-ai", "/vani-assistant", "/vani", "/voice-form", "/vani-form-fill"],
  apiRoutes: [
    "/api/part70/status",
    "/api/part70/config",
    "/api/part70/form-targets",
    "/api/part70/parse",
    "/api/part70/voice-form",
    "/api/part70/drafts",
    "/api/part70/confirm-save",
    "/api/part70/cancel",
    "/api/part70/activity",
    "/api/part70/credit-preview",
    "/api/part70/checklist",
    "/api/part70/export",
    "/api/part70/demo"
  ],
  safetyMode: "Confirmation-first mode. VANI form fill karegi, preview dikhayegi, phir confirmed=true ke baad safe VANI draft/action record save hoga.",
  aiHubDecision: "VANI AI Features / AI Hub ke andar hi rahegi. Part 69 read-only search tha; Part 70 voice form filling hai.",
  previousPart: "Part 69 - VANI AI V1 read-only search",
  nextPart: "Part 71 - AI Admission Copilot"
};

const part70FormTargets = [
  {
    id: "student_enrolment",
    title: "Student Enrolment Draft",
    description: "New student/admission form ke basic fields voice se fill karna.",
    example: "New student add karo naam Rahul Sharma class 10 course Maths Science batch Evening parent Sunita phone 9876543210 fee plan monthly",
    requiredFields: ["studentName", "className", "course", "parentPhone"],
    optionalFields: ["batch", "parentName", "feePlan", "note"],
    safeDestination: "part70_vani_form_drafts"
  },
  {
    id: "enquiry_lead",
    title: "Admission Enquiry Draft",
    description: "New enquiry/lead ko CRM ke liye draft banana.",
    example: "Enquiry banao student Aman parent Rakesh phone 9876543210 course JEE preferred timing evening source website",
    requiredFields: ["studentName", "parentPhone", "courseInterest"],
    optionalFields: ["parentName", "preferredTiming", "source", "priority", "note"],
    safeDestination: "part70_vani_form_drafts"
  },
  {
    id: "fee_record",
    title: "Fee Record Draft",
    description: "Fee entry ka draft fill karna, final payment collection nahi.",
    example: "Fee record banao Rahul ne 5000 cash pay kiya pending 10000 due date 25 July",
    requiredFields: ["studentName", "amount"],
    optionalFields: ["mode", "pending", "dueDate", "note"],
    safeDestination: "part70_vani_form_drafts"
  },
  {
    id: "attendance_record",
    title: "Attendance Draft",
    description: "Attendance entry ka draft banana.",
    example: "Attendance mark karo Rahul present batch Evening A date today",
    requiredFields: ["studentName", "attendanceStatus"],
    optionalFields: ["batch", "date", "note"],
    safeDestination: "part70_vani_form_drafts"
  },
  {
    id: "live_class",
    title: "Live Class Draft",
    description: "Live class schedule ka draft banana.",
    example: "Live class schedule karo JEE batch subject Physics teacher Mehta time 5 PM meeting link zoom dot us",
    requiredFields: ["batch", "subject"],
    optionalFields: ["teacherName", "scheduledTime", "meetingLink", "note"],
    safeDestination: "part70_vani_form_drafts"
  }
];

const part70Checklist = [
  "VANI AI V2 page /vani-ai-v2 open ho raha hai.",
  "VANI AI latest route /vani-ai ab V2 form filling page kholta hai, aur /vani-ai-v1 old read-only search ke liye available hai.",
  "Hindi/Hinglish transcript se form type detect hota hai.",
  "Student, enquiry, fee, attendance aur live class drafts supported hain.",
  "Parse route preview/draft banata hai, direct save nahi karta.",
  "Confirm-save route confirmed=true ke bina save nahi karta.",
  "Activity history me parse, save aur cancel events record hote hain.",
  "Main production collections me direct write nahi hota; safe VANI draft/action collection use hoti hai.",
  "AI Hub me VANI AI Assistant ka latest route active hai.",
  ".env, secret, AI API key, Razorpay key ZIP me include nahi hai."
];

globalThis.NAXORA_PART70_DRAFTS = globalThis.NAXORA_PART70_DRAFTS || {};
globalThis.NAXORA_PART70_ACTIVITY = globalThis.NAXORA_PART70_ACTIVITY || [];
globalThis.NAXORA_PART70_SAVED_FORMS = globalThis.NAXORA_PART70_SAVED_FORMS || [];

function part70CleanText(value, max = 240) {
  return String(value ?? "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}

function part70Lower(value) {
  return part70CleanText(value, 500).toLowerCase();
}

function part70DbReady() {
  return Boolean(mongoose.connection && mongoose.connection.readyState === 1 && mongoose.connection.db);
}

function part70Activity(type, payload = {}) {
  const row = {
    id: `vani70-activity-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
    type,
    ...payload,
    createdAt: new Date().toISOString()
  };
  globalThis.NAXORA_PART70_ACTIVITY.unshift(row);
  globalThis.NAXORA_PART70_ACTIVITY = globalThis.NAXORA_PART70_ACTIVITY.slice(0, 100);
  return row;
}

function part70DetectFormType(transcript = "", requestedType = "") {
  const manual = part70FormTargets.find((item) => item.id === requestedType);
  if (manual) return manual;
  const t = part70Lower(transcript);
  if (/(fee|fees|payment|paid|pay|collection|pending|dues|due)/i.test(t)) return part70FormTargets.find((x) => x.id === "fee_record");
  if (/(attendance|present|absent|hazri|haazri|mark)/i.test(t)) return part70FormTargets.find((x) => x.id === "attendance_record");
  if (/(live class|class schedule|meeting|zoom|meet|recording|teacher|subject)/i.test(t)) return part70FormTargets.find((x) => x.id === "live_class");
  if (/(enquiry|lead|callback|follow.?up|interested|source|website|walk.?in)/i.test(t)) return part70FormTargets.find((x) => x.id === "enquiry_lead");
  return part70FormTargets.find((x) => x.id === "student_enrolment");
}

function part70First(regex, text, fallback = "") {
  const match = text.match(regex);
  return match && match[1] ? part70CleanText(match[1], 120) : fallback;
}

function part70ExtractPhone(text = "") {
  const match = text.replace(/[\s-]/g, "").match(/(?:\+91)?([6-9]\d{9})/);
  return match ? match[1] : "";
}

function part70ExtractAmount(text = "") {
  const match = text.match(/(?:₹|rs\.?|inr|amount|paid|pay|fee)?\s*(\d{3,7})(?:\s*rupees?)?/i);
  return match ? Number(match[1]) : null;
}

function part70ExtractCourse(text = "") {
  const courseFromLabel = part70First(/(?:course|subject|for)\s+(?:is|hai|=|:)?\s*([a-z0-9 +/&.-]{2,50})(?=\s+(?:batch|parent|phone|class|timing|time|source|priority|fee|teacher|$))/i, text);
  if (courseFromLabel) return courseFromLabel;
  const known = text.match(/(JEE|NEET|Maths?\s*\+?\s*Science|Maths?|Science|Physics|Chemistry|Biology|English|Commerce|Foundation|Coding)/i);
  return known ? part70CleanText(known[1], 80) : "";
}

function part70ExtractName(text = "") {
  const labelName = part70First(/(?:student\s+name|naam|name)\s+(?:is|hai|=|:)?\s*([a-zA-Z ]{2,40})(?=\s+(?:class|course|batch|parent|phone|fee|paid|present|absent|$))/i, text);
  if (labelName) return labelName;
  const afterStudent = part70First(/(?:student|bachcha|baccha)\s+([a-zA-Z ]{2,40})(?=\s+(?:class|course|batch|parent|phone|fee|paid|present|absent|$))/i, text);
  if (afterStudent && !/add|banao|create|search|mark|record/i.test(afterStudent)) return afterStudent;
  const firstCapitalWords = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/);
  return firstCapitalWords ? part70CleanText(firstCapitalWords[1], 80) : "";
}

function part70ParseTranscript(transcript = "", requestedType = "") {
  const command = part70CleanText(transcript, 600);
  const type = part70DetectFormType(command, requestedType);
  const lower = part70Lower(command);
  const phone = part70ExtractPhone(command);
  const amount = part70ExtractAmount(command);
  const common = {
    studentName: part70ExtractName(command),
    parentPhone: phone,
    phone,
    className: part70First(/class\s*([0-9]{1,2}|[a-zA-Z0-9 -]{2,20})/i, command),
    course: part70ExtractCourse(command),
    courseInterest: part70ExtractCourse(command),
    batch: part70First(/batch\s+(?:is|hai|=|:)?\s*([a-zA-Z0-9 -]{1,40})(?=\s+(?:parent|phone|course|class|teacher|time|date|$))/i, command),
    parentName: part70First(/(?:parent|father|mother|guardian)\s+(?:name\s*)?(?:is|hai|=|:)?\s*([a-zA-Z ]{2,40})(?=\s+(?:phone|mobile|course|class|batch|$))/i, command),
    preferredTiming: part70First(/(?:preferred\s+timing|timing|time)\s+(?:is|hai|=|:)?\s*([a-zA-Z0-9: .-]{2,40})(?=\s+(?:source|phone|course|batch|$))/i, command),
    source: part70First(/source\s+(?:is|hai|=|:)?\s*([a-zA-Z0-9 -]{2,30})(?=\s+(?:priority|phone|course|$))/i, command),
    priority: lower.includes("hot") ? "hot" : lower.includes("cold") ? "cold" : lower.includes("warm") ? "warm" : "normal",
    feePlan: lower.includes("monthly") ? "monthly" : lower.includes("yearly") || lower.includes("annual") ? "yearly" : lower.includes("installment") ? "installment" : "",
    amount,
    pending: part70First(/pending\s+(?:is|hai|=|:)?\s*(\d{3,7})/i, command),
    mode: lower.includes("cash") ? "cash" : lower.includes("upi") ? "upi" : lower.includes("card") ? "card" : lower.includes("bank") ? "bank" : "",
    dueDate: part70First(/due\s+(?:date\s*)?(?:is|hai|=|:)?\s*([a-zA-Z0-9 -]{2,30})(?=\s+(?:note|$))/i, command),
    attendanceStatus: lower.includes("absent") ? "absent" : lower.includes("present") ? "present" : "",
    date: lower.includes("today") || lower.includes("aaj") ? new Date().toISOString().slice(0, 10) : part70First(/date\s+(?:is|hai|=|:)?\s*([a-zA-Z0-9 -]{2,30})(?=\s+(?:note|$))/i, command),
    subject: part70First(/subject\s+(?:is|hai|=|:)?\s*([a-zA-Z0-9 +/&.-]{2,40})(?=\s+(?:teacher|time|meeting|batch|$))/i, command) || part70ExtractCourse(command),
    teacherName: part70First(/teacher\s+(?:is|hai|=|:)?\s*([a-zA-Z .]{2,40})(?=\s+(?:time|meeting|batch|subject|$))/i, command),
    scheduledTime: part70First(/(?:schedule|time|at)\s+(?:is|hai|=|:)?\s*([0-9]{1,2}(?::[0-9]{2})?\s*(?:am|pm)?|[a-zA-Z]+\s+[0-9]{1,2}\s*(?:am|pm)?)(?=\s+(?:meeting|link|teacher|$))/i, command),
    meetingLink: part70First(/(?:meeting\s+link|link)\s+(?:is|hai|=|:)?\s*(https?:\/\/\S+|[a-zA-Z0-9 ./:_-]{4,80})/i, command),
    note: command
  };

  let fields = {};
  if (type.id === "student_enrolment") {
    fields = { studentName: common.studentName, className: common.className, course: common.course, batch: common.batch, parentName: common.parentName, parentPhone: common.parentPhone, feePlan: common.feePlan, note: common.note };
  } else if (type.id === "enquiry_lead") {
    fields = { studentName: common.studentName, parentName: common.parentName, parentPhone: common.parentPhone, courseInterest: common.courseInterest, preferredTiming: common.preferredTiming, source: common.source || "VANI", priority: common.priority, note: common.note };
  } else if (type.id === "fee_record") {
    fields = { studentName: common.studentName, amount: common.amount, mode: common.mode || "unknown", pending: common.pending, dueDate: common.dueDate, note: common.note };
  } else if (type.id === "attendance_record") {
    fields = { studentName: common.studentName, attendanceStatus: common.attendanceStatus, batch: common.batch, date: common.date || new Date().toISOString().slice(0, 10), note: common.note };
  } else if (type.id === "live_class") {
    fields = { batch: common.batch, subject: common.subject, teacherName: common.teacherName, scheduledTime: common.scheduledTime, meetingLink: common.meetingLink, note: common.note };
  }

  const missingFields = type.requiredFields.filter((field) => !fields[field]);
  const filledCount = Object.values(fields).filter((value) => value !== "" && value !== null && value !== undefined).length;
  const confidence = Math.max(35, Math.min(96, Math.round((filledCount / Math.max(Object.keys(fields).length, 1)) * 100)));
  const draft = {
    draftId: `vani70-draft-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
    formType: type.id,
    formTitle: type.title,
    command,
    fields,
    missingFields,
    confidence,
    requiresConfirmation: true,
    actionMode: "preview-only-until-confirmed",
    safetyNote: "Save se pehle user confirmation zaroori hai. Main module data direct edit/delete nahi hota.",
    createdAt: new Date().toISOString()
  };
  globalThis.NAXORA_PART70_DRAFTS[draft.draftId] = draft;
  part70Activity("draft_created", { draftId: draft.draftId, formType: draft.formType, missingFields, confidence });
  return draft;
}

async function part70SaveConfirmedDraft(draft, meta = {}) {
  const row = {
    ...draft,
    confirmed: true,
    confirmedAt: new Date().toISOString(),
    confirmedBy: part70CleanText(meta.confirmedBy || "demo-user", 100),
    reviewStatus: "saved_to_vani_review_queue",
    productionNote: "Part 70 VANI safe draft/action record. Route-by-route main module write Part 70 audit ke baad enable kiya jayega."
  };
  if (part70DbReady()) {
    try {
      const inserted = await mongoose.connection.db.collection("part70vaniformdrafts").insertOne(row);
      part70Activity("draft_saved", { draftId: draft.draftId, formType: draft.formType, mode: "mongodb", mongoId: String(inserted.insertedId) });
      return { mode: "mongodb", saved: { ...row, _id: inserted.insertedId } };
    } catch (error) {
      part70Activity("draft_save_fallback", { draftId: draft.draftId, error: error.message });
    }
  }
  globalThis.NAXORA_PART70_SAVED_FORMS.unshift(row);
  globalThis.NAXORA_PART70_SAVED_FORMS = globalThis.NAXORA_PART70_SAVED_FORMS.slice(0, 100);
  part70Activity("draft_saved", { draftId: draft.draftId, formType: draft.formType, mode: "mock-memory" });
  return { mode: "mock-memory", saved: row };
}

app.get("/api/part70/status", (req, res) => {
  res.json({
    success: true,
    part: part70Config.part,
    status: part70Config.status,
    purpose: part70Config.purpose,
    frontend: [part70Config.frontendRoute, ...part70Config.alternateRoutes],
    apiRoutes: part70Config.apiRoutes,
    safetyMode: part70Config.safetyMode,
    aiHubDecision: part70Config.aiHubDecision,
    currentVersionPlan: "Part 53–78 = NAXORA OS 1.0 completion. Part 79–110 = NAXORA OS 2.0 development.",
    previousPart: part70Config.previousPart,
    nextPart: part70Config.nextPart
  });
});

app.get("/api/part70/config", (req, res) => {
  res.json({ success: true, part: part70Config.part, config: part70Config, formTargets: part70FormTargets });
});

app.get("/api/part70/form-targets", (req, res) => {
  res.json({ success: true, part: part70Config.part, formTargets: part70FormTargets });
});

app.post("/api/part70/parse", (req, res) => {
  const transcript = req.body?.transcript || req.body?.command || req.body?.text || "New student add karo naam Rahul class 10 course Maths parent phone 9876543210";
  const formType = req.body?.formType || "";
  const draft = part70ParseTranscript(transcript, formType);
  res.json({ success: true, part: part70Config.part, mode: "preview", message: "VANI ne form draft fill kar diya. Save ke liye confirmation required hai.", draft });
});

app.post("/api/part70/voice-form", (req, res) => {
  const transcript = req.body?.transcript || req.body?.command || "Enquiry banao student Aman phone 9876543210 course JEE timing evening";
  const formType = req.body?.formType || "";
  const draft = part70ParseTranscript(transcript, formType);
  res.json({ success: true, part: part70Config.part, inputType: "voice-transcript", mode: "preview", message: "Voice transcript se form draft ready hai. Confirm-save ke bina data final save nahi hoga.", draft });
});

app.get("/api/part70/drafts", (req, res) => {
  const drafts = Object.values(globalThis.NAXORA_PART70_DRAFTS).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 50);
  res.json({ success: true, part: part70Config.part, count: drafts.length, drafts });
});

app.post("/api/part70/confirm-save", async (req, res) => {
  const draftId = part70CleanText(req.body?.draftId || "", 120);
  const confirmed = req.body?.confirmed === true || req.body?.confirm === true || req.body?.confirmation === "yes";
  const draft = globalThis.NAXORA_PART70_DRAFTS[draftId];
  if (!draft) {
    return res.status(404).json({ success: false, part: part70Config.part, message: "Draft nahi mila. Pehle /api/part70/parse se draft banao." });
  }
  if (!confirmed) {
    part70Activity("draft_save_blocked", { draftId, reason: "confirmation_missing" });
    return res.status(400).json({ success: false, part: part70Config.part, message: "Confirmation missing hai. Save ke liye confirmed=true bhejo.", draft });
  }
  const result = await part70SaveConfirmedDraft(draft, { confirmedBy: req.body?.confirmedBy || req.body?.userName });
  delete globalThis.NAXORA_PART70_DRAFTS[draftId];
  res.json({ success: true, part: part70Config.part, message: "Confirmed VANI form draft safe review queue me save ho gaya.", ...result });
});

app.post("/api/part70/cancel", (req, res) => {
  const draftId = part70CleanText(req.body?.draftId || "", 120);
  const existed = Boolean(globalThis.NAXORA_PART70_DRAFTS[draftId]);
  if (existed) delete globalThis.NAXORA_PART70_DRAFTS[draftId];
  part70Activity("draft_cancelled", { draftId, existed });
  res.json({ success: true, part: part70Config.part, draftId, cancelled: existed });
});

app.get("/api/part70/activity", (req, res) => {
  res.json({ success: true, part: part70Config.part, count: globalThis.NAXORA_PART70_ACTIVITY.length, activity: globalThis.NAXORA_PART70_ACTIVITY });
});

app.get("/api/part70/credit-preview", (req, res) => {
  res.json({
    success: true,
    part: part70Config.part,
    toolId: "vani-ai-v2-form-filling",
    estimatedCreditsPerDraft: 4,
    estimatedCreditsPerConfirmSave: 1,
    connectedToPart68: true,
    note: "Part 68 AI credits foundation ke saath compatible. Is part me hard credit deduction nahi ki gayi."
  });
});

app.get("/api/part70/checklist", (req, res) => {
  res.json({ success: true, part: part70Config.part, checklist: part70Checklist });
});

app.get("/api/part70/export", (req, res) => {
  res.json({
    success: true,
    part: part70Config.part,
    exportedAt: new Date().toISOString(),
    config: part70Config,
    formTargets: part70FormTargets,
    drafts: Object.values(globalThis.NAXORA_PART70_DRAFTS),
    savedForms: globalThis.NAXORA_PART70_SAVED_FORMS,
    activity: globalThis.NAXORA_PART70_ACTIVITY,
    checklist: part70Checklist
  });
});

app.get("/api/part70/demo", (req, res) => {
  const samples = [
    part70ParseTranscript("New student add karo naam Rahul Sharma class 10 course Maths Science batch Evening parent Sunita phone 9876543210 fee plan monthly", "student_enrolment"),
    part70ParseTranscript("Enquiry banao student Aman parent Rakesh phone 9876543211 course JEE preferred timing evening source website", "enquiry_lead"),
    part70ParseTranscript("Fee record banao Priya ne 5000 cash pay kiya pending 10000 due date 25 July", "fee_record"),
    part70ParseTranscript("Attendance mark karo Rahul present batch Evening A date today", "attendance_record")
  ];
  res.json({ success: true, part: part70Config.part, demoTitle: "VANI AI V2 Voice Form Filling Demo", samples, checklist: part70Checklist });
});
// ================= END PART 70 =================

// ================= PART 71: AI ADMISSION COPILOT =================
// Part 71 ka goal: counsellor/receptionist/owner ko admission enquiries convert karne me AI help dena.
// Safety rule: AI Copilot draft/suggestion/priority banata hai; WhatsApp/SMS/email send ya admission convert direct nahi karta.
const part71Config = {
  part: "Part 71 - AI Admission Copilot",
  status: "active",
  purpose: "Admission enquiries ke liye reply drafts, follow-up suggestions, course recommendations, lead priority aur conversation support.",
  frontendRoute: "/ai-admission-copilot",
  alternateRoutes: ["/admission-copilot", "/admission-ai", "/ai-counsellor", "/copilot-admission"],
  apiRoutes: [
    "/api/part71/status",
    "/api/part71/config",
    "/api/part71/features",
    "/api/part71/roles",
    "/api/part71/lead-context",
    "/api/part71/reply-draft",
    "/api/part71/followup-suggestions",
    "/api/part71/course-recommendations",
    "/api/part71/lead-priority",
    "/api/part71/conversation-support",
    "/api/part71/vani/command",
    "/api/part71/activity",
    "/api/part71/checklist",
    "/api/part71/export",
    "/api/part71/demo"
  ],
  connectedParts: [
    "Part 58 Enquiry and Follow-Up CRM",
    "Part 60 Request Callback / Send Enquiry",
    "Part 63 Discovery and Leads Integration",
    "Part 65 Communication Hub safe templates",
    "Part 67 AI Hub",
    "Part 68 AI Credits",
    "Part 69/70 VANI"
  ],
  safetyMode: "Draft-first mode. AI Copilot message draft, lead score aur suggestions banata hai; send/discount/refund/delete/export jaise actions explicit confirmation aur permission ke bina nahi hote.",
  vaniDecision: "VANI AI Hub ke andar rahegi aur Part 71 admission copilot commands ko permission + confirmation + audit log ke saath handle karegi.",
  previousPart: "Part 70 - VANI AI V2 voice form filling",
  nextPart: "Part 72 - AI Fee and Attendance Assistant"
};

const part71Features = [
  {
    id: "reply-drafts",
    title: "Enquiry Reply Drafts",
    problemSolved: "Counsellor ko har enquiry ke liye baar-baar same WhatsApp/email message manually type nahi karna padega.",
    ownerBenefit: "Lead response speed improve hoti hai aur admission conversion chances badhte hain.",
    instituteBenefit: "Professional, consistent aur respectful replies ready milte hain.",
    teacherBenefit: "Teacher ko course/demo context clean mil sakta hai.",
    studentBenefit: "Student/parent ko fast aur clear answer milta hai.",
    parentBenefit: "Parent ko polite reply, timing aur next step quickly milta hai."
  },
  {
    id: "followup-suggestions",
    title: "Follow-Up Suggestions",
    problemSolved: "Interested lead ko kab aur kis message se follow-up karna hai, ye miss nahi hota.",
    ownerBenefit: "Admissions pipeline visible aur organized hoti hai.",
    instituteBenefit: "Reception/counsellor ka daily follow-up work structured hota hai.",
    teacherBenefit: "Demo class request timely teacher tak pahunch sakti hai.",
    studentBenefit: "Student ko timely callback/demo reminder milta hai.",
    parentBenefit: "Parent ko follow-up ke liye clear next step milta hai."
  },
  {
    id: "course-recommendations",
    title: "Course Recommendations",
    problemSolved: "Wrong course suggest hone se confusion aur drop-off hota hai; copilot basic profile ke hisaab se options recommend karta hai.",
    ownerBenefit: "Correct course positioning se conversion improve ho sakta hai.",
    instituteBenefit: "Counsellor ko consistent guidance milti hai.",
    teacherBenefit: "Student right batch/course me aata hai.",
    studentBenefit: "Student ko goal ke according suitable course options milte hain.",
    parentBenefit: "Parent ko course choice samajhne me help milti hai."
  },
  {
    id: "lead-priority",
    title: "Lead Priority",
    problemSolved: "Hot leads lost ho jaate hain jab sab enquiries same priority dikhti hain.",
    ownerBenefit: "High-intent leads par jaldi action hota hai.",
    instituteBenefit: "Counsellor time better use karta hai.",
    teacherBenefit: "Demo-ready leads pehle schedule hote hain.",
    studentBenefit: "Interested student ko jaldi response milta hai.",
    parentBenefit: "Parent ka callback wait time kam hota hai."
  },
  {
    id: "conversation-support",
    title: "Admission Conversation Support",
    problemSolved: "New counsellor ko call/script/objection handling me help chahiye hoti hai.",
    ownerBenefit: "Training dependency kam hoti hai.",
    instituteBenefit: "Sales conversation quality improve hoti hai.",
    teacherBenefit: "Academic questions teacher ko escalate karne ka clean suggestion milta hai.",
    studentBenefit: "Student ko relevant explanation milti hai.",
    parentBenefit: "Parent ke fee, timing, result aur safety questions ka structured answer milta hai."
  }
];

const part71RolePermissions = {
  owner: {
    label: "Institute Owner",
    allowed: ["view_all_leads", "draft_reply", "set_priority", "view_analytics", "approve_sensitive", "export_summary"],
    sensitiveVerification: true
  },
  branch_manager: {
    label: "Branch Manager",
    allowed: ["view_branch_leads", "draft_reply", "set_priority", "view_branch_analytics"],
    sensitiveVerification: true,
    scope: "assigned_branches_only"
  },
  receptionist: {
    label: "Receptionist/Counsellor",
    allowed: ["view_assigned_leads", "draft_reply", "followup_suggestion", "course_recommendation", "conversation_support"],
    sensitiveVerification: false
  },
  counsellor: {
    label: "Receptionist/Counsellor",
    allowed: ["view_assigned_leads", "draft_reply", "followup_suggestion", "course_recommendation", "conversation_support", "set_priority_suggestion"],
    sensitiveVerification: false
  },
  teacher: {
    label: "Teacher",
    allowed: ["view_demo_context", "course_recommendation_view"],
    sensitiveVerification: false,
    scope: "assigned_batches_only"
  },
  accountant: {
    label: "Accountant",
    allowed: ["view_fee_context_limited"],
    sensitiveVerification: true
  },
  student: {
    label: "Student",
    allowed: ["view_own_admission_guidance"],
    sensitiveVerification: false,
    scope: "own_data_only"
  },
  parent: {
    label: "Parent",
    allowed: ["view_child_admission_guidance"],
    sensitiveVerification: false,
    scope: "linked_child_only"
  },
  naxora_super_admin: {
    label: "NAXORA Super Admin",
    allowed: ["platform_support_logged", "view_system_health"],
    sensitiveVerification: true,
    scope: "logged_technical_support_not_unrestricted_private_data"
  }
};

const part71Checklist = [
  "AI Admission Copilot page /ai-admission-copilot open ho raha hai.",
  "/api/part71/status success true return karta hai.",
  "Reply draft API lead ke naam/course/parent contact ke basis par polite draft banata hai.",
  "Follow-up suggestion API next action, timing aur reminder text return karta hai.",
  "Course recommendation API student goal/class/interest ke basis par options return karta hai.",
  "Lead priority API hot/warm/cold score explain karta hai, bina guessing ke missing details batata hai.",
  "Conversation support API counsellor ko respectful Hinglish guidance deta hai.",
  "VANI command endpoint missing details politely poochta hai aur sensitive info public me loudly bolne se bachne ka rule return karta hai.",
  "Role permissions owner/branch_manager/counsellor/teacher/student/parent ke hisaab se scoped hain.",
  "AI Copilot direct WhatsApp/SMS/email send nahi karta; sirf draft/queue-ready content banata hai.",
  "Activity/audit log me generated suggestions save hote hain.",
  ".env, secrets, API keys aur passwords ZIP me include nahi hain."
];

globalThis.NAXORA_PART71_ACTIVITY = globalThis.NAXORA_PART71_ACTIVITY || [];
globalThis.NAXORA_PART71_DRAFTS = globalThis.NAXORA_PART71_DRAFTS || [];

function part71CleanText(value, max = 500) {
  return String(value ?? "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}

function part71DbReady() {
  return Boolean(mongoose.connection && mongoose.connection.readyState === 1 && mongoose.connection.db);
}

function part71Role(role = "counsellor") {
  const key = part71CleanText(role, 60).toLowerCase().replace(/\s+/g, "_") || "counsellor";
  return part71RolePermissions[key] ? key : "counsellor";
}

function part71Can(role, permission) {
  const resolved = part71Role(role);
  const allowed = part71RolePermissions[resolved]?.allowed || [];
  return allowed.includes(permission) || allowed.includes("approve_sensitive") || allowed.includes("platform_support_logged");
}

async function part71Log(type, payload = {}) {
  const row = {
    id: `part71-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    type,
    ...payload,
    createdAt: new Date().toISOString()
  };
  globalThis.NAXORA_PART71_ACTIVITY.unshift(row);
  globalThis.NAXORA_PART71_ACTIVITY = globalThis.NAXORA_PART71_ACTIVITY.slice(0, 200);
  if (part71DbReady()) {
    try {
      await mongoose.connection.db.collection("part71admissioncopilotlogs").insertOne(row);
    } catch (error) {
      // Logging fallback intentionally silent so user-facing flow never crashes because of audit DB write.
    }
  }
  return row;
}

function part71NormalizeLead(raw = {}) {
  const lead = raw.lead && typeof raw.lead === "object" ? raw.lead : raw;
  return {
    leadId: part71CleanText(lead.leadId || lead.id || lead._id || `lead-${Date.now()}`, 80),
    studentName: part71CleanText(lead.studentName || lead.name || lead.student || "", 90),
    parentName: part71CleanText(lead.parentName || lead.guardianName || "", 90),
    parentPhone: part71CleanText(lead.parentPhone || lead.phone || lead.mobile || "", 30),
    email: part71CleanText(lead.email || "", 120),
    className: part71CleanText(lead.className || lead.class || lead.level || "", 60),
    courseInterest: part71CleanText(lead.courseInterest || lead.course || lead.interest || "", 120),
    preferredTiming: part71CleanText(lead.preferredTiming || lead.timing || lead.time || "", 120),
    city: part71CleanText(lead.city || lead.location || "", 120),
    source: part71CleanText(lead.source || "NAXORA Discovery", 80),
    status: part71CleanText(lead.status || "new", 50),
    message: part71CleanText(lead.message || lead.note || "", 500),
    goal: part71CleanText(lead.goal || lead.examGoal || lead.target || "", 120),
    budget: part71CleanText(lead.budget || "", 80),
    consentAccepted: lead.consentAccepted === true || lead.consent === true || String(lead.consentAccepted || lead.consent || "").toLowerCase() === "true"
  };
}

function part71MissingLeadFields(lead) {
  const required = [
    ["studentName", "student ka naam"],
    ["parentPhone", "parent/guardian phone number"],
    ["courseInterest", "course interest"],
    ["className", "class/level"]
  ];
  return required.filter(([key]) => !lead[key]).map(([, label]) => label);
}

function part71Priority(leadInput = {}) {
  const lead = part71NormalizeLead(leadInput);
  let score = 25;
  const reasons = [];
  if (lead.parentPhone) { score += 15; reasons.push("parent contact available"); }
  if (lead.courseInterest) { score += 15; reasons.push("course interest clear"); }
  if (lead.preferredTiming) { score += 10; reasons.push("preferred timing shared"); }
  if (lead.consentAccepted) { score += 10; reasons.push("consent accepted"); }
  if (/demo|visit|admission|join|urgent|today|kal|tomorrow|fees|batch/i.test(`${lead.message} ${lead.status}`)) {
    score += 20;
    reasons.push("high-intent words detected");
  }
  if (/website|nearby|compare|public profile|discovery/i.test(lead.source)) {
    score += 5;
    reasons.push("discovery/public-profile source");
  }
  const missing = part71MissingLeadFields(lead);
  if (missing.length) {
    score -= Math.min(20, missing.length * 5);
    reasons.push(`missing details: ${missing.join(", ")}`);
  }
  score = Math.max(0, Math.min(100, score));
  const priority = score >= 75 ? "hot" : score >= 45 ? "warm" : "cold";
  const nextAction = priority === "hot"
    ? "10-30 minutes ke andar callback/demo slot confirm karo."
    : priority === "warm"
      ? "Same day polite follow-up bhejo aur missing details collect karo."
      : "Nurture message bhejo, course info share karo, aur 24-48 hours follow-up set karo.";
  return { lead, score, priority, reasons, missingFields: missing, nextAction };
}

function part71CourseRecommendations(profileInput = {}) {
  const lead = part71NormalizeLead(profileInput);
  const text = `${lead.className} ${lead.courseInterest} ${lead.goal} ${lead.message}`.toLowerCase();
  const recommendations = [];
  if (/jee|engineering|physics|math/i.test(text)) {
    recommendations.push({ course: "JEE Foundation / JEE Target Batch", reason: "Student ne JEE/engineering/physics-maths interest show kiya.", suggestedNextStep: "Diagnostic test + demo class schedule karo." });
  }
  if (/neet|medical|biology|bio/i.test(text)) {
    recommendations.push({ course: "NEET Foundation / NEET Target Batch", reason: "Medical/biology interest detect hua.", suggestedNextStep: "Biology + Chemistry demo class recommend karo." });
  }
  if (/10|class 10|board|cbse|science|math/i.test(text)) {
    recommendations.push({ course: "Class 10 Board Excellence", reason: "Class 10/board/science-maths context mila.", suggestedNextStep: "Board syllabus + weekly test plan explain karo." });
  }
  if (/spoken|english|communication/i.test(text)) {
    recommendations.push({ course: "Spoken English / Communication Skills", reason: "English/communication interest detect hua.", suggestedNextStep: "Level check + trial class offer karo." });
  }
  if (!recommendations.length) {
    recommendations.push({ course: "Foundation / Counselling Required", reason: "Course goal clear nahi hai; pehle student class, goal aur current level confirm karo.", suggestedNextStep: "Parent/student se 3 details poochho: class, target exam, preferred timing." });
  }
  return { lead, recommendations: recommendations.slice(0, 3), missingFields: part71MissingLeadFields(lead) };
}

function part71ReplyDraft(leadInput = {}, channel = "whatsapp") {
  const lead = part71NormalizeLead(leadInput);
  const missing = part71MissingLeadFields(lead);
  const student = lead.studentName || "student";
  const course = lead.courseInterest || "aapke interested course";
  const parentGreeting = lead.parentName ? `Namaste ${lead.parentName} ji,` : "Namaste Sir/Mam,";
  const timingLine = lead.preferredTiming ? `Aapka preferred timing ${lead.preferredTiming} note kar liya hai.` : "Aap apna preferred callback/demo timing share kar dijiye.";
  const missingLine = missing.length ? `Bas ye details confirm kar dijiye: ${missing.join(", ")}.` : "Aapki basic enquiry details complete hain.";
  const whatsapp = `${parentGreeting}\n\nNAXORA Institute OS se message hai. ${student} ke liye ${course} enquiry receive ho gayi hai. ${timingLine}\n\n${missingLine}\n\nKya hum aapko free counselling/demo class ke liye call kar sakte hain?`;
  const sms = `NAXORA: ${student} ki ${course} enquiry receive ho gayi. ${missing.length ? "Please confirm: " + missing.join(", ") : "Our team will contact you."}`.slice(0, 300);
  const email = {
    subject: `Enquiry received for ${student} - ${course}`,
    body: `${parentGreeting}\n\nThank you for your enquiry for ${student}. We have received your interest in ${course}.\n\n${timingLine}\n${missingLine}\n\nOur counsellor will contact you with course details, batch timings and demo options.\n\nRegards,\nNAXORA Institute OS`
  };
  return {
    lead,
    channel,
    drafts: { whatsapp, sms, email },
    missingFields: missing,
    sendMode: "draft_only_not_sent",
    requiresConsentBeforeSending: true,
    sensitiveDataRule: "Fees/financial/private details public speaker par loudly nahi bolni; screen par privately show karni."
  };
}

function part71FollowupSuggestions(leadInput = {}) {
  const priority = part71Priority(leadInput);
  const { lead } = priority;
  const suggestions = [
    {
      step: 1,
      title: priority.priority === "hot" ? "Immediate callback" : "Polite first follow-up",
      dueIn: priority.priority === "hot" ? "10-30 minutes" : "same day",
      script: part71ReplyDraft(lead, "whatsapp").drafts.whatsapp
    },
    {
      step: 2,
      title: "Demo / counselling offer",
      dueIn: "next working slot",
      script: `Namaste ${lead.parentName || "Sir/Mam"}, ${lead.studentName || "student"} ke liye ${lead.courseInterest || "course"} demo/counselling slot available hai. Kya aap ${lead.preferredTiming || "today evening"} comfortable hain?`
    },
    {
      step: 3,
      title: "Missing details collection",
      dueIn: "before final admission call",
      script: priority.missingFields.length ? `Please confirm: ${priority.missingFields.join(", ")}.` : "All basic details available. Admission counsellor can proceed to demo/fee explanation."
    }
  ];
  return { lead, priority: priority.priority, score: priority.score, nextAction: priority.nextAction, suggestions };
}

function part71ConversationSupport(message = "", leadInput = {}) {
  const lead = part71NormalizeLead(leadInput);
  const msg = part71CleanText(message, 800).toLowerCase();
  const answers = [];
  if (/fee|fees|discount|payment|installment|installment|emi/i.test(msg)) {
    answers.push("Fee/discount ke liye exact amount loudly speaker par na bolo. Parent ko private screen/official message me plan explain karo. Discount owner approval ke bina final mat karo.");
  }
  if (/demo|trial|class/i.test(msg)) {
    answers.push("Demo class ke liye course, class level, preferred timing aur parent contact confirm karo. Teacher availability check karke slot suggest karo.");
  }
  if (/result|teacher|faculty|quality/i.test(msg)) {
    answers.push("Teacher/results ke claims sirf verified institute profile ke basis par bolo. Unsupported guarantee mat do.");
  }
  if (/not interested|busy|later|baad/i.test(msg)) {
    answers.push("Lead ko pressure mat karo. Polite nurture message bhejo aur consent ke saath future follow-up schedule karo.");
  }
  if (!answers.length) {
    answers.push("Parent/student ki requirement politely repeat karo, missing details poochho, aur next step: counselling call, demo class ya course brochure suggest karo.");
  }
  return {
    lead,
    incomingMessage: part71CleanText(message, 800),
    suggestedResponse: answers.join(" "),
    missingFields: part71MissingLeadFields(lead),
    escalation: /refund|delete|export|discount|subscription|private|financial/i.test(msg) ? "owner_verification_required" : "normal_counsellor_support",
    tone: "respectful-hinglish"
  };
}

function part71VaniResponse(command = "", context = {}) {
  const role = part71Role(context.role || context.userRole || "counsellor");
  const cmd = part71CleanText(command || context.command || "", 800);
  const lead = part71NormalizeLead(context.lead || context);
  const lower = cmd.toLowerCase();
  const sensitive = /(discount|refund|delete|remove|export|subscription|payment change|fee change)/i.test(lower);
  if (sensitive && !part71RolePermissions[role]?.sensitiveVerification) {
    return {
      allowed: false,
      role,
      action: "blocked_sensitive_action",
      message: "Ye sensitive action hai. Owner verification ke bina VANI isko execute nahi karegi.",
      requiresOwnerVerification: true,
      preview: null
    };
  }
  if (!cmd) {
    return { allowed: true, role, action: "ask_missing_command", message: "Aap bataiye VANI admission copilot se kya karwana hai: reply draft, lead priority, course recommendation ya follow-up?" };
  }
  let action = "conversation_support";
  let preview = part71ConversationSupport(cmd, lead);
  if (/reply|message|whatsapp|email|sms|draft/i.test(lower)) {
    action = "reply_draft";
    preview = part71ReplyDraft(lead, "whatsapp");
  } else if (/priority|hot|warm|cold|score/i.test(lower)) {
    action = "lead_priority";
    preview = part71Priority(lead);
  } else if (/course|recommend|batch|suggest/i.test(lower)) {
    action = "course_recommendation";
    preview = part71CourseRecommendations(lead);
  } else if (/follow|callback|reminder|next/i.test(lower)) {
    action = "followup_suggestion";
    preview = part71FollowupSuggestions(lead);
  }
  const missing = part71MissingLeadFields(lead);
  return {
    allowed: true,
    role,
    action,
    message: missing.length ? `Mujhe ye details chahiye: ${missing.join(", ")}. Main guess nahi karungi.` : "Preview ready hai. Create/send/update se pehle explicit confirmation required rahegi.",
    preview,
    requiresConfirmationBeforeExecution: true,
    speakerPrivacyRule: "Private phone, fees, payment, parent contact aur personal info ko public speaker par loudly read na karein; screen par private preview dikhayein."
  };
}

app.get("/api/part71/status", (req, res) => {
  res.json({
    success: true,
    part: part71Config.part,
    status: part71Config.status,
    purpose: part71Config.purpose,
    frontend: [part71Config.frontendRoute, ...part71Config.alternateRoutes],
    apiRoutes: part71Config.apiRoutes,
    connectedParts: part71Config.connectedParts,
    safetyMode: part71Config.safetyMode,
    vaniDecision: part71Config.vaniDecision,
    currentVersionPlan: "Part 53–78 = NAXORA OS 1.0 completion. Part 79–110 = NAXORA OS 2.0 development.",
    previousPart: part71Config.previousPart,
    nextPart: part71Config.nextPart
  });
});

app.get("/api/part71/config", (req, res) => {
  res.json({ success: true, part: part71Config.part, config: part71Config, roles: part71RolePermissions });
});

app.get("/api/part71/features", (req, res) => {
  res.json({ success: true, part: part71Config.part, count: part71Features.length, features: part71Features });
});

app.get("/api/part71/roles", (req, res) => {
  res.json({ success: true, part: part71Config.part, roles: part71RolePermissions });
});

app.get("/api/part71/lead-context", async (req, res) => {
  const leadId = part71CleanText(req.query.leadId || "demo-lead-001", 80);
  const demoLead = part71NormalizeLead({
    leadId,
    studentName: req.query.studentName || "Aman Sharma",
    parentName: req.query.parentName || "Rakesh Sharma",
    parentPhone: req.query.phone || "9876543210",
    className: req.query.className || "10",
    courseInterest: req.query.course || "JEE Foundation",
    preferredTiming: req.query.timing || "Evening",
    city: req.query.city || "Delhi",
    source: req.query.source || "Nearby Institutes",
    message: req.query.message || "Parent wants demo class and fee details.",
    consentAccepted: true
  });
  await part71Log("lead_context_viewed", { leadId, mode: "demo-or-query" });
  res.json({ success: true, part: part71Config.part, lead: demoLead, note: "Real CRM lead lookup can be connected route-by-route after Part 58/60 collection audit." });
});

app.post("/api/part71/reply-draft", async (req, res) => {
  const role = part71Role(req.body?.role || "counsellor");
  if (!part71Can(role, "draft_reply")) return res.status(403).json({ success: false, part: part71Config.part, message: "Is role ko reply draft permission nahi hai.", role });
  const result = part71ReplyDraft(req.body?.lead || req.body || {}, req.body?.channel || "whatsapp");
  await part71Log("reply_draft_created", { role, leadId: result.lead.leadId, missingFields: result.missingFields, sendMode: result.sendMode });
  res.json({ success: true, part: part71Config.part, role, result });
});

app.post("/api/part71/followup-suggestions", async (req, res) => {
  const role = part71Role(req.body?.role || "counsellor");
  if (!part71Can(role, "followup_suggestion") && !part71Can(role, "draft_reply")) return res.status(403).json({ success: false, part: part71Config.part, message: "Is role ko follow-up suggestion permission nahi hai.", role });
  const result = part71FollowupSuggestions(req.body?.lead || req.body || {});
  await part71Log("followup_suggestions_created", { role, leadId: result.lead.leadId, priority: result.priority, score: result.score });
  res.json({ success: true, part: part71Config.part, role, result });
});

app.post("/api/part71/course-recommendations", async (req, res) => {
  const role = part71Role(req.body?.role || "counsellor");
  if (!part71Can(role, "course_recommendation") && !part71Can(role, "course_recommendation_view") && !part71Can(role, "draft_reply")) return res.status(403).json({ success: false, part: part71Config.part, message: "Is role ko course recommendation permission nahi hai.", role });
  const result = part71CourseRecommendations(req.body?.lead || req.body?.student || req.body || {});
  await part71Log("course_recommendations_created", { role, leadId: result.lead.leadId, count: result.recommendations.length });
  res.json({ success: true, part: part71Config.part, role, result });
});

app.post("/api/part71/lead-priority", async (req, res) => {
  const role = part71Role(req.body?.role || "counsellor");
  if (!part71Can(role, "set_priority") && !part71Can(role, "set_priority_suggestion") && !part71Can(role, "draft_reply")) return res.status(403).json({ success: false, part: part71Config.part, message: "Is role ko lead priority permission nahi hai.", role });
  const result = part71Priority(req.body?.lead || req.body || {});
  await part71Log("lead_priority_scored", { role, leadId: result.lead.leadId, priority: result.priority, score: result.score });
  res.json({ success: true, part: part71Config.part, role, result });
});

app.post("/api/part71/conversation-support", async (req, res) => {
  const role = part71Role(req.body?.role || "counsellor");
  if (!part71Can(role, "conversation_support") && !part71Can(role, "draft_reply")) return res.status(403).json({ success: false, part: part71Config.part, message: "Is role ko conversation support permission nahi hai.", role });
  const result = part71ConversationSupport(req.body?.message || req.body?.text || "Parent fee and demo class pooch raha hai", req.body?.lead || req.body || {});
  await part71Log("conversation_support_created", { role, leadId: result.lead.leadId, escalation: result.escalation });
  res.json({ success: true, part: part71Config.part, role, result });
});

app.post("/api/part71/vani/command", async (req, res) => {
  const result = part71VaniResponse(req.body?.command || req.body?.transcript || req.body?.text || "reply draft banao", req.body || {});
  await part71Log("vani_admission_command", { role: result.role, action: result.action, allowed: result.allowed, requiresConfirmation: result.requiresConfirmationBeforeExecution });
  res.status(result.allowed === false ? 403 : 200).json({ success: result.allowed !== false, part: part71Config.part, result });
});

app.get("/api/part71/activity", (req, res) => {
  res.json({ success: true, part: part71Config.part, count: globalThis.NAXORA_PART71_ACTIVITY.length, activity: globalThis.NAXORA_PART71_ACTIVITY });
});

app.get("/api/part71/checklist", (req, res) => {
  res.json({ success: true, part: part71Config.part, checklist: part71Checklist });
});

app.get("/api/part71/export", (req, res) => {
  res.json({
    success: true,
    part: part71Config.part,
    exportedAt: new Date().toISOString(),
    config: part71Config,
    features: part71Features,
    roles: part71RolePermissions,
    activity: globalThis.NAXORA_PART71_ACTIVITY,
    checklist: part71Checklist,
    limitation: "External AI model, WhatsApp/SMS/email real send, and final admission conversion are intentionally not executed in Part 71."
  });
});

app.get("/api/part71/demo", async (req, res) => {
  const lead = part71NormalizeLead({
    leadId: "demo-part71-001",
    studentName: "Aman Sharma",
    parentName: "Rakesh Sharma",
    parentPhone: "9876543210",
    className: "10",
    courseInterest: "JEE Foundation",
    preferredTiming: "Evening",
    city: "Delhi",
    source: "Compare Institutes",
    message: "Parent wants demo class, fee details and batch timing.",
    consentAccepted: true
  });
  const demo = {
    lead,
    priority: part71Priority(lead),
    replyDraft: part71ReplyDraft(lead),
    followups: part71FollowupSuggestions(lead),
    courses: part71CourseRecommendations(lead),
    conversation: part71ConversationSupport("Parent fee and demo class pooch raha hai", lead),
    vani: part71VaniResponse("VANI, is enquiry ke liye reply draft aur priority batao", { role: "counsellor", lead })
  };
  await part71Log("demo_generated", { leadId: lead.leadId });
  res.json({ success: true, part: part71Config.part, demoTitle: "AI Admission Copilot Demo", demo, checklist: part71Checklist });
});
// ================= END PART 71 =================

// Same-server frontend hosting for Render/Railway/VPS deployment.
app.use("/landing", express.static(frontendPath));

// /app is still available for local/dev compatibility, but sensitive internal pages are blocked in production.
app.use("/app", (req, res, next) => {
  const requestedFile = path.basename(req.path || "");
  if (isProduction && internalPageFiles.has(requestedFile) && !wantsInternalAccess(req)) {
    return res.status(404).send("Private NAXORA internal page. Login/admin access required.");
  }
  return next();
}, express.static(frontendPath));

app.get(/^\/app(?!\/api).*/, (req, res) => {
  if (isProduction && !wantsInternalAccess(req)) {
    return res.redirect("/login");
  }
  res.sendFile(path.join(frontendPath, "index.html"));
});



// ================= PART 52: LIVE CLEAN ROUTE FIX FOR ALL MODULE PAGES =================
// Render live URL par /progress.html, /fees.html jaise old sidebar links 404 de rahe the.
// Is fix me har normal module page ko clean route (/progress) aur old .html redirect dono milte hain.
const modulePageRoutes = {
  "/dashboard": "dashboard.html",
  "/students": "students.html",
  "/student": "students.html",
  "/parents": "parents.html",
  "/parent": "parents.html",
  "/progress": "progress.html",
  "/teachers": "teachers.html",
  "/staff": "staff.html",
  "/batches": "batches.html",
  "/online-batches": "online-batches.html",
  "/attendance": "attendance.html",
  "/fees": "fees.html",
  "/finance": "finance.html",
  "/doubts": "doubts.html",
  "/ai-doubts": "doubts.html",
  "/ai-notes": "ai-notes.html",
  "/ai-mock-tests": "ai-mock-tests.html",
  "/ai-roadmaps": "ai-roadmaps.html",
  "/live-classes": "live-classes-completion.html",
  "/notifications": "notifications.html",
  "/email-notifications": "email-notifications.html",
  "/assignments": "assignments.html",
  "/tests": "tests.html",
  "/test-builder": "test-builder.html",
  "/question-bank": "question-bank.html",
  "/timetable": "timetable.html",
  "/branches": "branches.html",
  "/enquiries": "enquiries.html",
  "/followups": "followups.html",
  "/discovery": "discovery.html",
  "/subscriptions": "subscriptions.html",
  "/payments": "payments.html",
  "/security": "security.html",
  "/settings": "settings.html",
  "/theme": "theme.html",
  "/reports": "reports.html",
  "/announcements": "announcements.html",
  "/certificates": "certificates.html",
  "/library": "library.html",
  "/profile": "dashboard.html",
  "/admin": "super-admin.html",
  "/super-admin": "super-admin.html",
  "/admin-analytics": "admin-analytics.html",
  "/landing": "landing.html",
  "/system-audit": "system-audit.html",
  "/audit": "system-audit.html",
  "/branding": "branding.html",
  "/brand": "branding.html",
  "/role-permissions": "role-permissions.html",
  "/permissions": "role-permissions.html",
  "/smart-enrolment": "smart-enrolment.html",
  "/enrolment": "smart-enrolment.html",
  "/admission": "smart-enrolment.html",
  "/admissions": "smart-enrolment.html",
  "/student-parent-portal": "student-parent-portal.html",
  "/student-portal": "student-parent-portal.html",
  "/parent-portal": "student-parent-portal.html",
  "/portal": "student-parent-portal.html",
  "/enquiry-followup-crm": "enquiry-followup-crm.html",
  "/enquiry-crm": "enquiry-followup-crm.html",
  "/followup-crm": "enquiry-followup-crm.html",
  "/admission-crm": "enquiry-followup-crm.html",
  "/public-institute-profile": "public-institute-profile.html",
  "/institute-profile-public": "public-institute-profile.html",
  "/public-profile": "public-institute-profile.html",
  "/institute-showcase": "public-institute-profile.html",
  "/request-callback": "request-callback.html",
  "/send-enquiry": "request-callback.html",
  "/callback": "request-callback.html",
  "/institute-enquiry": "request-callback.html",
  "/nearby-institutes": "nearby-institutes.html",
  "/nearby": "nearby-institutes.html",
  "/institutes-near-me": "nearby-institutes.html",
  "/local-institutes": "nearby-institutes.html",
  "/compare-institutes": "compare-institutes.html",
  "/compare": "compare-institutes.html",
  "/institute-comparison": "compare-institutes.html",
  "/compare-coaching": "compare-institutes.html",
  "/discovery-leads-integration": "discovery-leads-integration.html",
  "/discovery-journey": "discovery-leads-integration.html",
  "/admission-journey": "discovery-leads-integration.html",
  "/lead-integration": "discovery-leads-integration.html",
  "/live-classes-completion": "live-classes-completion.html",
  "/online-classroom": "live-classes-completion.html",
  "/live-classroom": "live-classes-completion.html",
  "/classroom-live": "live-classes-completion.html",
  "/payments-subscriptions": "payments-subscriptions.html",
  "/subscription-payments": "payments-subscriptions.html",
  "/billing": "payments-subscriptions.html",
  "/invoices": "payments-subscriptions.html",
  "/renewals": "payments-subscriptions.html",
  "/ai-hub": "ai-hub.html",
  "/ai-features": "ai-hub.html",
  "/ai-tools": "ai-hub.html",
  "/vani-ai": "vani-ai-v2.html",
  "/vani-assistant": "vani-ai-v2.html",
  "/vani-ai-v2": "vani-ai-v2.html",
  "/vani": "vani-ai-v2.html",
  "/voice-form": "vani-ai-v2.html",
  "/vani-form-fill": "vani-ai-v2.html",
  "/vani-ai-v1": "vani-ai-v1.html",
  "/voice-search": "vani-ai-v1.html",
  "/vani-search": "vani-ai-v1.html",
  "/ai-credits-usage": "ai-credits-usage.html",
  "/ai-credits": "ai-credits-usage.html",
  "/ai-usage": "ai-credits-usage.html",
  "/credits": "ai-credits-usage.html",
  "/ai-admission-copilot": "ai-admission-copilot.html",
  "/admission-copilot": "ai-admission-copilot.html",
  "/admission-ai": "ai-admission-copilot.html",
  "/ai-counsellor": "ai-admission-copilot.html",
  "/copilot-admission": "ai-admission-copilot.html"
};

for (const [route, fileName] of Object.entries(modulePageRoutes)) {
  app.get(route, (req, res) => sendFileSafe(res, fileName));
  app.get(`${route}.html`, (req, res) => res.redirect(302, route));
}

// Safety fallback: jo normal frontend .html file exist karti hai aur internal nahi hai,
// usko clean route par redirect/send kar do. Internal debug/demo pages production me hidden rahenge.
app.get(/^\/[a-z0-9-]+\.html$/i, (req, res, next) => {
  const requestedFile = path.basename(req.path);
  if (isProduction && internalPageFiles.has(requestedFile) && !wantsInternalAccess(req)) {
    return res.status(404).send("Private NAXORA internal page. Login/admin access required.");
  }
  const cleanPath = req.path.replace(/\.html$/i, "");
  const knownFile = Object.values(modulePageRoutes).includes(requestedFile);
  if (knownFile) return res.redirect(302, cleanPath);
  return next();
});

app.get("/api/part52/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 52 - Live Clean Route Fix",
    status: "active",
    purpose: "All frontend module pages now work with clean URLs and old .html links redirect safely.",
    examples: ["/progress", "/progress.html -> /progress", "/fees", "/teachers", "/live-classes"],
    productionSafe: true
  });
});
// ================= END PART 52 =================

app.use(notFound);
app.use(errorHandler);

const port = Number(process.env.PORT) || 5000;

await connectDB();

const server = app.listen(port, () => {
  console.log("✅ PART 59 PUBLIC INSTITUTE PROFILE ACTIVE");
  console.log("✅ All routes Part 1 to Part 71 loaded + AI Admission Copilot");
  console.log("✅ AI Notes route active: /api/ai-notes");
  console.log("✅ AI Mock Tests route active: /api/ai-mock-tests");
  console.log("✅ AI Roadmaps route active: /api/ai-roadmaps");
  console.log("✅ Notifications route active: /api/notifications");
  console.log("✅ Notification config active: /api/notifications/config");
  console.log("✅ Email Notifications route active: /api/email-notifications");
  console.log("✅ Email config active: /api/email-notifications/config");
  console.log("✅ Mobile responsive polish active: /api/mobile-polish/status");
  console.log("✅ Theme system active: /api/theme/status");
  console.log("✅ Student discovery route active: /api/discovery/search");
  console.log("✅ Institute listing route active: /api/discovery/my-listings");
  console.log("✅ Discovery leads route active: /api/discovery/my-leads");
  console.log("✅ Live Classes route active: /api/live-classes");
  console.log("✅ Live Class Comments route active: /api/live-classes/:id/comments");
  console.log("✅ Live Class Subscription route active: /api/live-classes/subscriptions");
  console.log("✅ Online Batch Access route active: /api/online-batches");
  console.log("✅ Online Batch Enrollment route active: /api/online-batches/:id/enrollments");
  console.log("✅ Batch access checker active: /api/online-batches/:id/check-access");
  console.log("✅ Route debug active: /api/route-check");
  console.log("✅ Landing routes active: /api/landing/status");
  console.log("✅ Animation routes active: /api/animations/status");
  console.log("✅ Integrated status active: /api/integrated-status");
  console.log("✅ Admin Analytics route active: /api/admin-analytics");
  console.log("✅ Admin Analytics status active: /api/admin-analytics/status");
  console.log("✅ System debug active: /api/system/debug");
  console.log("✅ Demo data seeder active: /api/demo-data/seed");
  console.log("✅ Features registry active: /api/features");
  console.log("✅ Sales Demo Mode active: /api/demo-mode/status");
  console.log("✅ Demo personas active: /api/demo-mode/personas");
  console.log("✅ Demo mode frontend: /app/demo-mode.html");
  console.log("✅ Client Pitch Dashboard active: /api/client-pitch/status");
  console.log("✅ Client Pitch frontend: /app/client-pitch.html");
  console.log("✅ Deployment status active: /api/deployment/status");
  console.log("✅ Deployment frontend: /app/deployment.html");
  console.log("✅ Razorpay Final status active: /api/razorpay-final/status");
  console.log("✅ Razorpay Final frontend: /app/razorpay-final.html");
  console.log("✅ Final Testing status active: /api/final-testing/status");
  console.log("✅ Final Testing frontend: /app/final-testing.html");
  console.log("✅ Launch Package active: /api/launch-package/status");
  console.log("✅ Public route policy active: /api/public-route-policy/status");
  console.log("✅ Final secure status active: /api/part51/status");
  console.log("✅ Part 53 audit active: /api/part53/run");
  console.log("✅ System audit frontend: /system-audit");
  console.log("✅ Part 54 branding active: /api/part54/status");
  console.log("✅ Part 55 role permissions active: /api/part55/status");
  console.log("✅ Part 56 smart enrolment active: /api/part56/status");
  console.log("✅ Smart enrolment frontend: /smart-enrolment");
  console.log("✅ Part 57 student-parent portal active: /api/part57/status");
  console.log("✅ Student/Parent portal frontend: /student-parent-portal");
  console.log("✅ Part 58 enquiry CRM active: /api/part58/status");
  console.log("✅ Enquiry Follow-up CRM frontend: /enquiry-followup-crm");
  console.log("✅ Part 59 public institute profile active: /api/part59/status");
  console.log("✅ Public institute profile frontend: /public-institute-profile");
  console.log("✅ Part 60 request callback active: /api/part60/status + /request-callback");
  console.log("✅ Part 61 nearby institutes active: /api/part61/status + /nearby-institutes");
  console.log("✅ Part 62 compare institutes active: /api/part62/status + /compare-institutes");
  console.log("✅ Part 63 discovery leads integration active: /api/part63/status + /discovery-leads-integration");
  console.log("✅ Part 64 live classes completion active: /api/part64/status + /live-classes-completion");
  console.log("✅ Part 65 communication hub active: /api/part65/status + /communication-hub");
  console.log("✅ Part 66 payments/subscriptions active: /api/part66/status + /payments-subscriptions");
  console.log("✅ Part 67 AI Hub active: /api/part67/status + /ai-hub + VANI card");
  console.log("✅ Part 68 AI Credits and Usage active: /api/part68/status + /ai-credits-usage");
  console.log("✅ Part 69 VANI AI V1 active: /api/part69/status + /vani-ai-v1");
  console.log("✅ Part 70 VANI AI V2 active: /api/part70/status + /vani-ai-v2");
  console.log("✅ Part 71 AI Admission Copilot active: /api/part71/status + /ai-admission-copilot");
  console.log("✅ Branding guide frontend: /branding");
  console.log("✅ Launch Package frontend: /app/launch-package.html");
  console.log("✅ Frontend static hosting available at /app");
  console.log("🛡️ Security headers, validation, rate-limit and safe errors active");
  console.log(`🚀 NAXORA Institute OS: http://localhost:${port}`);
});

const shutdown = (signal) => {
  console.log(`
${signal} received. Closing server safely...`);
  server.close(() => process.exit(0));
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
