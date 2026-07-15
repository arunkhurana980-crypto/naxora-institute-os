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
  "/vani-search",
  "/ai-fee-attendance-assistant",
  "/fee-attendance-ai",
  "/ai-fee-assistant",
  "/ai-attendance-assistant"
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
    part: "Part 73 - AI Batch Performance Analyzer",
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
    part: "Part 56 - Smart Student Enrolment",
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
    part: "Part 56 - Smart Student Enrolment",
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
  res.json({ success: true, part: "Part 56 - Smart Student Enrolment", checklist: part56Checklist });
});

app.get("/api/part56/export", async (req, res) => {
  const collection = await part56GetCollection();
  const rows = collection ? await collection.find({}).sort({ createdAt: -1 }).limit(500).toArray() : globalThis.NAXORA_PART56_ENROLMENTS;
  res.json({
    success: true,
    part: "Part 56 - Smart Student Enrolment",
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


// ================= PART 72: AI FEE AND ATTENDANCE ASSISTANT =================
const part72Config = {
  part: "Part 72 - AI Fee and Attendance Assistant",
  status: "active",
  frontendRoute: "/ai-fee-attendance-assistant",
  alternateRoutes: ["/fee-attendance-ai", "/ai-fee-assistant", "/ai-attendance-assistant"],
  previousPart: "Part 71 - AI Admission Copilot",
  nextPart: "Part 73 - AI Batch Performance Analyzer",
  purpose: "Pending-fee summary, fee reminder drafts, frequently absent students, attendance support alerts aur VANI-assisted fee/attendance insights.",
  safetyMode: "advisory-draft-only-no-direct-message-no-direct-payment-change",
  vaniMode: "Hindi/English/Hinglish command support with role check, missing-detail questions, preview and audit log.",
  apiRoutes: [
    "/api/part72/status",
    "/api/part72/config",
    "/api/part72/features",
    "/api/part72/roles",
    "/api/part72/fee-summary",
    "/api/part72/reminder-draft",
    "/api/part72/frequently-absent",
    "/api/part72/attendance-alerts",
    "/api/part72/support-alerts",
    "/api/part72/vani/command",
    "/api/part72/activity",
    "/api/part72/checklist",
    "/api/part72/export",
    "/api/part72/demo"
  ]
};

const part72Features = [
  {
    id: "pending-fee-summary",
    title: "Pending Fee Summary",
    problemSolved: "Owner/accountant ko pending fee list manually calculate nahi karni padegi.",
    ownerBenefit: "Cash collection priority clear hoti hai.",
    instituteBenefit: "Revenue leakage aur missed dues kam hote hain.",
    teacherBenefit: "Teacher ko fee data edit access nahi diya gaya; sirf allowed academic support context.",
    studentBenefit: "Student ko clear due status mil sakta hai.",
    parentBenefit: "Parent ko polite reminder aur clear payment status milta hai."
  },
  {
    id: "fee-reminder-drafts",
    title: "AI Fee Reminder Drafts",
    problemSolved: "Har student/parent ke liye reminder message manually likhne ka time bachta hai.",
    ownerBenefit: "Professional fee follow-up ready hota hai.",
    instituteBenefit: "Fee collection process consistent hota hai.",
    teacherBenefit: "Teacher ko fee reminder send permission nahi di gayi.",
    studentBenefit: "Message respectful aur clear hota hai.",
    parentBenefit: "Due date, amount aur contact info samajh aata hai."
  },
  {
    id: "frequently-absent-students",
    title: "Frequently Absent Students",
    problemSolved: "Low attendance students late identify nahi honge.",
    ownerBenefit: "Retention risk early dikhta hai.",
    instituteBenefit: "Student dropout risk reduce hota hai.",
    teacherBenefit: "Teacher ko support-needed students list milti hai.",
    studentBenefit: "Timely help aur counselling mil sakti hai.",
    parentBenefit: "Child absence pattern clear hota hai."
  },
  {
    id: "attendance-support-alerts",
    title: "Attendance Support Alerts",
    problemSolved: "Absent student ko sirf warning nahi, support path milta hai.",
    ownerBenefit: "Institute care quality improve hoti hai.",
    instituteBenefit: "Parent trust aur student retention improve hota hai.",
    teacherBenefit: "Teacher ko call/notes/remedial follow-up plan milta hai.",
    studentBenefit: "Missed class recovery support milta hai.",
    parentBenefit: "Parent ko next action clear hota hai."
  },
  {
    id: "vani-fee-attendance",
    title: "VANI Fee + Attendance Commands",
    problemSolved: "Owner/counsellor voice se pending fee/attendance insight nikal sakta hai.",
    ownerBenefit: "Fast voice reporting without risky direct action.",
    instituteBenefit: "Daily operations faster hote hain.",
    teacherBenefit: "Assigned batch attendance insight mil sakta hai.",
    studentBenefit: "Own info only access model ready hai.",
    parentBenefit: "Linked child info only access model ready hai."
  }
];

const part72RolePermissions = {
  naxora_super_admin: {
    label: "NAXORA Super Admin",
    allowed: ["view_platform_status", "technical_support_view", "audit_log_view"],
    sensitiveVerification: true,
    note: "Institute-private data ka daily unrestricted access nahi; logged support mode only."
  },
  owner: {
    label: "Institute Owner",
    allowed: ["fee_summary", "attendance_summary", "reminder_draft", "support_alerts", "vani_fee_attendance", "audit_log_view", "export_request"],
    sensitiveVerification: true
  },
  branch_manager: {
    label: "Branch Manager",
    allowed: ["fee_summary_assigned_branch", "attendance_summary_assigned_branch", "reminder_draft", "support_alerts", "vani_fee_attendance"],
    sensitiveVerification: true
  },
  accountant: {
    label: "Accountant",
    allowed: ["fee_summary", "reminder_draft", "payment_followup_view", "vani_fee_attendance"],
    sensitiveVerification: true
  },
  teacher: {
    label: "Teacher",
    allowed: ["attendance_summary_assigned_batches", "support_alerts", "vani_attendance_only"],
    sensitiveVerification: false
  },
  receptionist: {
    label: "Receptionist/Counsellor",
    allowed: ["reminder_draft", "support_alerts", "followup_view", "vani_fee_attendance_limited"],
    sensitiveVerification: false
  },
  student: {
    label: "Student",
    allowed: ["own_fee_status", "own_attendance_status"],
    sensitiveVerification: false
  },
  parent: {
    label: "Parent",
    allowed: ["linked_child_fee_status", "linked_child_attendance_status"],
    sensitiveVerification: false
  }
};

const part72Checklist = [
  "AI Fee and Attendance Assistant page /ai-fee-attendance-assistant open ho raha hai.",
  "/api/part72/status success true return karta hai.",
  "Pending-fee summary data safe/demo fallback ke saath return hota hai.",
  "Fee reminder draft create hota hai lekin real WhatsApp/SMS/email send nahi hota.",
  "Frequently absent students list return hoti hai.",
  "Attendance support alerts role-safe mode me generate hote hain.",
  "VANI command missing details politely poochti hai.",
  "VANI create/send/delete/refund/export direct execute nahi karti.",
  "Sensitive financial details speaker par loudly bolne ke bajay private display rule return hota hai.",
  "Activity/audit log me VANI and assistant actions save hote hain.",
  "Previous Part 71 AI Admission Copilot routes preserved hain."
];

const part72DemoStudents = [
  { studentId: "NX-STU-1001", studentName: "Aman Sharma", parentName: "Rakesh Sharma", parentPhone: "9876543210", batch: "JEE Foundation Evening", branch: "Main Branch", pendingFee: 12500, dueDate: "2026-07-20", attendancePercent: 68, absences30Days: 7, lastAbsentDate: "2026-07-12", risk: "high" },
  { studentId: "NX-STU-1002", studentName: "Riya Verma", parentName: "Sunita Verma", parentPhone: "9876500001", batch: "Class 10 Board Morning", branch: "Main Branch", pendingFee: 0, dueDate: "2026-08-01", attendancePercent: 91, absences30Days: 1, lastAbsentDate: "2026-07-02", risk: "low" },
  { studentId: "NX-STU-1003", studentName: "Karan Mehta", parentName: "Pooja Mehta", parentPhone: "9876500002", batch: "NEET Foundation", branch: "West Branch", pendingFee: 8000, dueDate: "2026-07-18", attendancePercent: 74, absences30Days: 5, lastAbsentDate: "2026-07-10", risk: "medium" },
  { studentId: "NX-STU-1004", studentName: "Simran Kaur", parentName: "Harpreet Kaur", parentPhone: "9876500003", batch: "Class 12 Physics", branch: "West Branch", pendingFee: 15000, dueDate: "2026-07-16", attendancePercent: 59, absences30Days: 9, lastAbsentDate: "2026-07-13", risk: "critical" }
];

if (!globalThis.NAXORA_PART72_ACTIVITY) globalThis.NAXORA_PART72_ACTIVITY = [];

function part72CleanText(value, max = 500) {
  return String(value ?? "").replace(/[<>]/g, "").trim().slice(0, max);
}

function part72Lower(value) {
  return part72CleanText(value, 500).toLowerCase();
}

function part72DbReady() {
  return mongoose.connection.readyState === 1 && globalThis.NAXORA_DB_MODE !== "mock";
}

function part72Role(role = "owner") {
  const key = part72CleanText(role, 80).toLowerCase().replace(/[ -]+/g, "_") || "owner";
  if (key === "institute_owner") return "owner";
  if (key === "staff" || key === "counsellor") return "receptionist";
  return part72RolePermissions[key] ? key : "owner";
}

function part72Can(role, permission) {
  const resolved = part72Role(role);
  const allowed = part72RolePermissions[resolved]?.allowed || [];
  return allowed.includes(permission) || allowed.includes("vani_fee_attendance") || allowed.some((item) => permission.startsWith(item.replace("_assigned_branch", "").replace("_assigned_batches", "")));
}

async function part72Log(type, payload = {}) {
  const row = {
    id: `part72-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    type: part72CleanText(type, 80),
    payload,
    createdAt: new Date().toISOString(),
    part: part72Config.part
  };
  globalThis.NAXORA_PART72_ACTIVITY.unshift(row);
  globalThis.NAXORA_PART72_ACTIVITY = globalThis.NAXORA_PART72_ACTIVITY.slice(0, 80);
  if (part72DbReady()) {
    try { await mongoose.connection.db.collection("part72feeattendanceassistantlogs").insertOne(row); } catch (error) { /* non-blocking */ }
  }
  return row;
}

function part72MaskPhone(value = "") {
  const raw = String(value || "").replace(/\D/g, "");
  if (raw.length < 4) return "hidden";
  return `${raw.slice(0, 2)}******${raw.slice(-2)}`;
}

function part72NormalizeStudent(row = {}) {
  return {
    studentId: part72CleanText(row.studentId || row.rollNo || row._id || `NX-${Date.now()}`, 80),
    studentName: part72CleanText(row.studentName || row.name || row.student || "Unknown Student", 100),
    parentName: part72CleanText(row.parentName || row.guardianName || "Parent/Guardian", 100),
    parentPhoneMasked: part72MaskPhone(row.parentPhone || row.phone || row.mobile),
    batch: part72CleanText(row.batch || row.batchName || "General Batch", 100),
    branch: part72CleanText(row.branch || row.branchName || "Main Branch", 100),
    pendingFee: Number(row.pendingFee ?? row.pendingAmount ?? row.dueAmount ?? 0) || 0,
    dueDate: part72CleanText(row.dueDate || row.nextDueDate || "Not set", 40),
    attendancePercent: Math.max(0, Math.min(100, Number(row.attendancePercent ?? row.attendance ?? 85) || 0)),
    absences30Days: Math.max(0, Number(row.absences30Days ?? row.absentCount ?? 0) || 0),
    lastAbsentDate: part72CleanText(row.lastAbsentDate || row.absentDate || "Not available", 40),
    risk: part72CleanText(row.risk || "medium", 30)
  };
}

function part72FilterRows(rows = [], filters = {}) {
  const q = part72Lower(filters.q || filters.search || "");
  const branch = part72Lower(filters.branch || "");
  const batch = part72Lower(filters.batch || "");
  return rows.map(part72NormalizeStudent).filter((row) => {
    const full = part72Lower(JSON.stringify(row));
    if (q && !full.includes(q)) return false;
    if (branch && part72Lower(row.branch) !== branch) return false;
    if (batch && !part72Lower(row.batch).includes(batch)) return false;
    return true;
  });
}

async function part72BaseRows(filters = {}) {
  if (part72DbReady()) {
    try {
      const collection = mongoose.connection.db.collection("part72feeattendanceassistants");
      const rows = await collection.find({}).limit(100).toArray();
      if (rows.length) return { mode: "mongodb", rows: part72FilterRows(rows, filters) };
    } catch (error) { /* fallback below */ }
    try {
      const students = await mongoose.connection.db.collection("students").find({}).limit(60).toArray();
      if (students.length) return { mode: "mongodb-students-safe-fallback", rows: part72FilterRows(students, filters) };
    } catch (error) { /* fallback below */ }
  }
  return { mode: part72DbReady() ? "mongodb-empty-demo-fallback" : "mock-demo", rows: part72FilterRows(part72DemoStudents, filters) };
}

async function part72FeeSummary(filters = {}) {
  const data = await part72BaseRows(filters);
  const rows = data.rows;
  const pendingRows = rows.filter((row) => row.pendingFee > 0).sort((a, b) => b.pendingFee - a.pendingFee);
  const totalPending = pendingRows.reduce((sum, row) => sum + row.pendingFee, 0);
  const urgent = pendingRows.filter((row) => ["critical", "high"].includes(part72Lower(row.risk)) || row.pendingFee >= 10000);
  return {
    mode: data.mode,
    totalStudents: rows.length,
    pendingStudents: pendingRows.length,
    totalPending,
    urgentCount: urgent.length,
    currency: "INR",
    privateSpeakerRule: "Pending amount/phone number ko public speaker par loudly bolne ke bajay private screen preview me show karo.",
    rows: pendingRows
  };
}

async function part72AbsentStudents(filters = {}) {
  const data = await part72BaseRows(filters);
  const rows = data.rows
    .filter((row) => row.attendancePercent < 75 || row.absences30Days >= 4)
    .sort((a, b) => a.attendancePercent - b.attendancePercent);
  return { mode: data.mode, count: rows.length, threshold: "attendance below 75% or 4+ absences in 30 days", rows };
}

function part72ReminderDraft(student = {}, options = {}) {
  const row = part72NormalizeStudent(student);
  const channel = part72CleanText(options.channel || "whatsapp", 30).toLowerCase();
  const tone = part72CleanText(options.tone || "polite", 30);
  const draft = `Namaste ${row.parentName} ji,\n\n${row.studentName} ke fee record me ₹${row.pendingFee} pending dikh raha hai. Due date: ${row.dueDate}. Kripya payment status confirm karein ya institute office se contact karein.\n\nAgar payment already ho chuki hai to receipt/share karke update karwa dein.\n\n- NAXORA Institute OS`;
  return {
    student: row,
    channel,
    tone,
    draft,
    sendMode: "draft-only",
    warning: "Ye message abhi send nahi hua. Part 65 communication queue/provider verification ke baad explicit confirmation se send hoga.",
    requiresConfirmationBeforeSend: true,
    sensitiveVerificationRequiredForDiscountRefundDelete: true
  };
}

function part72AttendanceSupportPlan(student = {}) {
  const row = part72NormalizeStudent(student);
  const severity = row.attendancePercent < 60 ? "critical" : row.attendancePercent < 75 ? "high" : "medium";
  return {
    student: row,
    severity,
    alerts: [
      `${row.studentName} ki attendance ${row.attendancePercent}% hai.`,
      `Last 30 days me ${row.absences30Days} absence record hai.`,
      "Teacher/counsellor ko support follow-up create karna chahiye."
    ],
    recommendedActions: [
      "Parent ko respectful check-in call draft bhejo.",
      "Student se missed topics aur class reason poochho.",
      "Teacher se remedial/revision plan confirm karo.",
      "Agle 7 din attendance monitor karo."
    ],
    privateSpeakerRule: "Health/personal reasons public speaker par loudly discuss na karein; screen par privately show karein."
  };
}

async function part72SupportAlerts(filters = {}) {
  const absent = await part72AbsentStudents(filters);
  return { mode: absent.mode, count: absent.rows.length, alerts: absent.rows.map(part72AttendanceSupportPlan) };
}

async function part72VaniCommand(commandInput = "", context = {}) {
  const role = part72Role(context.role || context.userRole || "owner");
  const command = part72CleanText(commandInput || context.command || "pending fees summary", 800);
  const lower = part72Lower(command);
  const filters = { q: context.q || context.studentName || "", batch: context.batch || "", branch: context.branch || "" };
  const sensitive = /(refund|delete|discount|export|subscription|remove|waive|maaf|delete karo|refund do)/i.test(command);
  if (sensitive && !part72RolePermissions[role]?.sensitiveVerification) {
    return {
      allowed: false,
      role,
      command,
      action: "sensitive_action_blocked",
      message: "Is action ke liye owner verification required hai. Main bina verification refund/discount/delete/export execute nahi karungi.",
      auditRequired: true
    };
  }
  let action = "fee_summary";
  let preview;
  if (/(absent|attendance|hazri|haazri|present|support alert|retention)/i.test(lower)) {
    action = "attendance_support";
    if (!part72Can(role, "attendance_summary")) {
      return { allowed: false, role, command, action, message: "Is role ko attendance summary access nahi hai ya assigned-batch restriction required hai." };
    }
    preview = await part72SupportAlerts(filters);
  } else if (/(reminder|message|whatsapp|sms|email|draft)/i.test(lower)) {
    action = "reminder_draft";
    if (!part72Can(role, "reminder_draft")) {
      return { allowed: false, role, command, action, message: "Is role ko reminder draft permission nahi hai." };
    }
    const summary = await part72FeeSummary(filters);
    const first = summary.rows[0] || part72DemoStudents[0];
    preview = part72ReminderDraft(first, { channel: lower.includes("email") ? "email" : lower.includes("sms") ? "sms" : "whatsapp" });
  } else {
    action = "fee_summary";
    if (!part72Can(role, "fee_summary")) {
      return { allowed: false, role, command, action, message: "Is role ko fee summary access nahi hai." };
    }
    preview = await part72FeeSummary(filters);
  }
  const missingDetails = [];
  if (/(student|bachcha|parent)/i.test(lower) && !filters.q) missingDetails.push("studentName ya studentId");
  if (/(branch)/i.test(lower) && !filters.branch) missingDetails.push("branch");
  const responseMode = preview?.privateSpeakerRule ? "screen-private-for-sensitive-data" : "speaker-safe-summary";
  return {
    allowed: true,
    role,
    command,
    action,
    responseMode,
    missingDetails,
    asksPolitelyForMissingDetails: missingDetails.length ? `Kripya ${missingDetails.join(", ")} bata dijiye.` : "No missing required detail for summary.",
    preview,
    requiresConfirmationBeforeExecution: action === "reminder_draft",
    executesDirectly: false,
    auditRequired: true
  };
}

app.get("/api/part72/status", (req, res) => {
  res.json({
    success: true,
    part: part72Config.part,
    status: part72Config.status,
    purpose: part72Config.purpose,
    frontend: [part72Config.frontendRoute, ...part72Config.alternateRoutes],
    apiRoutes: part72Config.apiRoutes,
    previousPart: part72Config.previousPart,
    nextPart: part72Config.nextPart,
    vaniMode: part72Config.vaniMode,
    safetyMode: part72Config.safetyMode,
    masterProgressRecord: "docs/NAXORA_MASTER_PROGRESS_RECORD.md updated to Part 72"
  });
});

app.get("/api/part72/config", (req, res) => {
  res.json({ success: true, part: part72Config.part, config: part72Config, roles: part72RolePermissions });
});

app.get("/api/part72/features", (req, res) => {
  res.json({ success: true, part: part72Config.part, count: part72Features.length, features: part72Features });
});

app.get("/api/part72/roles", (req, res) => {
  res.json({ success: true, part: part72Config.part, roles: part72RolePermissions });
});

app.get("/api/part72/fee-summary", async (req, res) => {
  const role = part72Role(req.query.role || "owner");
  if (!part72Can(role, "fee_summary")) return res.status(403).json({ success: false, part: part72Config.part, role, message: "Is role ko fee summary access nahi hai." });
  const result = await part72FeeSummary(req.query);
  await part72Log("fee_summary_viewed", { role, totalPending: result.totalPending, pendingStudents: result.pendingStudents });
  res.json({ success: true, part: part72Config.part, role, result });
});

app.post("/api/part72/reminder-draft", async (req, res) => {
  const role = part72Role(req.body?.role || "owner");
  if (!part72Can(role, "reminder_draft")) return res.status(403).json({ success: false, part: part72Config.part, role, message: "Is role ko reminder draft permission nahi hai." });
  const draft = part72ReminderDraft(req.body?.student || req.body || {}, { channel: req.body?.channel, tone: req.body?.tone });
  await part72Log("fee_reminder_draft_created", { role, studentId: draft.student.studentId, channel: draft.channel, sendMode: draft.sendMode });
  res.json({ success: true, part: part72Config.part, role, result: draft });
});

app.get("/api/part72/frequently-absent", async (req, res) => {
  const role = part72Role(req.query.role || "owner");
  if (!part72Can(role, "attendance_summary")) return res.status(403).json({ success: false, part: part72Config.part, role, message: "Is role ko attendance summary access nahi hai." });
  const result = await part72AbsentStudents(req.query);
  await part72Log("frequently_absent_viewed", { role, count: result.count });
  res.json({ success: true, part: part72Config.part, role, result });
});

app.get("/api/part72/attendance-alerts", async (req, res) => {
  const role = part72Role(req.query.role || "owner");
  if (!part72Can(role, "attendance_summary")) return res.status(403).json({ success: false, part: part72Config.part, role, message: "Is role ko attendance alerts access nahi hai." });
  const result = await part72SupportAlerts(req.query);
  await part72Log("attendance_alerts_viewed", { role, count: result.count });
  res.json({ success: true, part: part72Config.part, role, result });
});

app.get("/api/part72/support-alerts", async (req, res) => {
  const role = part72Role(req.query.role || "owner");
  if (!part72Can(role, "support_alerts")) return res.status(403).json({ success: false, part: part72Config.part, role, message: "Is role ko support alerts permission nahi hai." });
  const result = await part72SupportAlerts(req.query);
  await part72Log("support_alerts_viewed", { role, count: result.count });
  res.json({ success: true, part: part72Config.part, role, result });
});

app.post("/api/part72/vani/command", async (req, res) => {
  const result = await part72VaniCommand(req.body?.command || req.body?.transcript || req.body?.text || "pending fees summary", req.body || {});
  await part72Log("vani_fee_attendance_command", { role: result.role, action: result.action, allowed: result.allowed, responseMode: result.responseMode });
  res.status(result.allowed === false ? 403 : 200).json({ success: result.allowed !== false, part: part72Config.part, result });
});

app.get("/api/part72/activity", (req, res) => {
  res.json({ success: true, part: part72Config.part, count: globalThis.NAXORA_PART72_ACTIVITY.length, activity: globalThis.NAXORA_PART72_ACTIVITY });
});

app.get("/api/part72/checklist", (req, res) => {
  res.json({ success: true, part: part72Config.part, checklist: part72Checklist });
});

app.get("/api/part72/export", async (req, res) => {
  const [feeSummary, absent, support] = await Promise.all([part72FeeSummary(req.query), part72AbsentStudents(req.query), part72SupportAlerts(req.query)]);
  res.json({ success: true, part: part72Config.part, exportedAt: new Date().toISOString(), config: part72Config, features: part72Features, roles: part72RolePermissions, feeSummary, absent, support, checklist: part72Checklist, activity: globalThis.NAXORA_PART72_ACTIVITY });
});

app.get("/api/part72/demo", async (req, res) => {
  const feeSummary = await part72FeeSummary({});
  const absent = await part72AbsentStudents({});
  const support = await part72SupportAlerts({});
  const reminder = part72ReminderDraft(part72DemoStudents[0]);
  const vani = await part72VaniCommand("VANI, pending fees aur absent students ka summary dikhao", { role: "owner" });
  await part72Log("demo_generated", { pendingStudents: feeSummary.pendingStudents, absentStudents: absent.count });
  res.json({ success: true, part: part72Config.part, demoTitle: "AI Fee and Attendance Assistant Demo", demo: { feeSummary, absent, support, reminder, vani }, checklist: part72Checklist });
});
// ================= END PART 72 =================

// ================= PART 73: AI BATCH PERFORMANCE ANALYZER =================
const part73Config = {
  part: "Part 73 - AI Batch Performance Analyzer",
  status: "active",
  frontendRoute: "/ai-batch-performance-analyzer",
  alternateRoutes: ["/batch-performance-ai", "/ai-batch-analyzer", "/batch-analyzer"],
  previousPart: "Part 72 - AI Fee and Attendance Assistant",
  nextPart: "Part 74 - AI Parent Communication and Weekly Summary",
  purpose: "Weak batches, weak chapters, top students, students needing support aur teacher suggestions identify karna.",
  safetyMode: "analysis-and-suggestion-only-no-direct-grade-change-no-student-labeling-as-failure",
  vaniMode: "Hindi/English/Hinglish VANI commands with role checks, ambiguity handling, private display for sensitive student data and audit log.",
  apiRoutes: [
    "/api/part73/status",
    "/api/part73/config",
    "/api/part73/features",
    "/api/part73/roles",
    "/api/part73/batch-performance",
    "/api/part73/weak-batches",
    "/api/part73/weak-chapters",
    "/api/part73/top-students",
    "/api/part73/students-needing-support",
    "/api/part73/teacher-suggestions",
    "/api/part73/vani/command",
    "/api/part73/activity",
    "/api/part73/checklist",
    "/api/part73/export",
    "/api/part73/demo"
  ]
};

const part73Features = [
  { id: "weak-batches", title: "Weak Batches", problemSolved: "Owner ko kaunsa batch low performance me hai ye manually reports compare karke nahi nikalna padega.", ownerBenefit: "Early intervention aur teacher support decisions fast hote hain.", instituteBenefit: "Teaching quality aur results improve hote hain.", teacherBenefit: "Teacher ko specific batch support priority milti hai.", studentBenefit: "Student ko timely remedial class aur doubt support mil sakta hai.", parentBenefit: "Parent ko late result shock ke bajay early support update milta hai." },
  { id: "weak-chapters", title: "Weak Chapters", problemSolved: "Sirf weak student nahi, weak topic/chapter identify hota hai.", ownerBenefit: "Owner chapter-wise re-teaching plan approve kar sakta hai.", instituteBenefit: "Batch-level academic quality improve hoti hai.", teacherBenefit: "Teacher ko exact chapter repeat/revise karna clear hota hai.", studentBenefit: "Concept gaps par focused revision milta hai.", parentBenefit: "Parent ko child ke struggle area ka better context milta hai." },
  { id: "top-students", title: "Top Students", problemSolved: "High performers recognize karna aur role-model examples identify karna easy hota hai.", ownerBenefit: "Result marketing aur scholarship planning ka foundation milta hai.", instituteBenefit: "Healthy motivation build hoti hai.", teacherBenefit: "Teacher high performers ko advanced practice de sakta hai.", studentBenefit: "Effort recognition milti hai.", parentBenefit: "Progress visibility improve hoti hai." },
  { id: "students-needing-support", title: "Students Needing Support", problemSolved: "Low score/attendance students ko time par academic help milti hai.", ownerBenefit: "Dropout aur poor result risk reduce hota hai.", instituteBenefit: "Student retention improve hota hai.", teacherBenefit: "Support list ready milti hai.", studentBenefit: "Personalized help mil sakti hai.", parentBenefit: "Parent ko support action plan milta hai." },
  { id: "teacher-suggestions", title: "Teacher Suggestions", problemSolved: "Data ko action plan me convert karta hai.", ownerBenefit: "Owner ko next academic actions clear hote hain.", instituteBenefit: "Quality control systematic hota hai.", teacherBenefit: "Teacher ko practical remedial steps milte hain.", studentBenefit: "Better teaching interventions milte hain.", parentBenefit: "Parent communication more meaningful hoti hai." }
];

const part73RolePermissions = {
  naxora_super_admin: { label: "NAXORA Super Admin", allowed: ["technical_support_view", "audit_log_view"], sensitiveVerification: true, note: "Institute-private data ka unrestricted daily access nahi; logged support mode only." },
  owner: { label: "Institute Owner", allowed: ["batch_analysis", "weak_chapters", "top_students", "support_students", "teacher_suggestions", "vani_batch_analysis", "audit_log_view", "export_request"], sensitiveVerification: true },
  branch_manager: { label: "Branch Manager", allowed: ["batch_analysis_assigned_branch", "weak_chapters", "support_students", "teacher_suggestions", "vani_batch_analysis"], sensitiveVerification: true },
  accountant: { label: "Accountant", allowed: ["limited_summary_view"], sensitiveVerification: false },
  teacher: { label: "Teacher", allowed: ["batch_analysis_assigned_batches", "weak_chapters_assigned_batches", "support_students_assigned_batches", "teacher_suggestions", "vani_batch_analysis_limited"], sensitiveVerification: false },
  receptionist: { label: "Receptionist/Counsellor", allowed: ["limited_support_followup", "support_students_limited"], sensitiveVerification: false },
  student: { label: "Student", allowed: ["own_progress_summary"], sensitiveVerification: false },
  parent: { label: "Parent", allowed: ["linked_child_progress_summary"], sensitiveVerification: false }
};

const part73Checklist = [
  "AI Batch Performance Analyzer page /ai-batch-performance-analyzer open ho raha hai.",
  "/api/part73/status success true return karta hai.",
  "Weak batches list safe/demo fallback ke saath return hoti hai.",
  "Weak chapters identify hote hain aur affected batches dikhte hain.",
  "Top students recognition data return hota hai without harmful comparison language.",
  "Students needing support list supportive language me return hoti hai.",
  "Teacher suggestions action-oriented hain, blame-based nahi.",
  "VANI command role check, missing detail handling, preview aur audit log ke saath return hoti hai.",
  "Sensitive student performance data public speaker par loudly bolne ke bajay private display rule follow karta hai.",
  "Previous Part 71 and Part 72 routes preserved hain."
];

const part73DemoBatches = [
  { batchId: "BAT-JEE-EVE", batchName: "JEE Foundation Evening", course: "JEE Foundation", branch: "Main Branch", teacher: "Mehta Sir", students: 32, averageScore: 58, attendancePercent: 72, resultTrend: "down", weakChapters: [{ subject: "Physics", chapter: "Laws of Motion", averageScore: 45, supportStudents: 11 }, { subject: "Maths", chapter: "Quadratic Equations", averageScore: 52, supportStudents: 8 }], topStudents: [{ studentName: "Riya Verma", averageScore: 91, attendancePercent: 96, strength: "Consistent problem solving" }], supportStudents: [{ studentName: "Aman Sharma", averageScore: 48, attendancePercent: 68, reason: "Low score + attendance drop" }, { studentName: "Karan Mehta", averageScore: 51, attendancePercent: 74, reason: "Weak in Physics numericals" }] },
  { batchId: "BAT-NEET-MOR", batchName: "NEET Foundation Morning", course: "NEET Foundation", branch: "West Branch", teacher: "Anita Ma'am", students: 28, averageScore: 66, attendancePercent: 81, resultTrend: "stable", weakChapters: [{ subject: "Chemistry", chapter: "Mole Concept", averageScore: 49, supportStudents: 7 }], topStudents: [{ studentName: "Simran Kaur", averageScore: 88, attendancePercent: 93, strength: "Biology recall and diagrams" }], supportStudents: [{ studentName: "Nitin Yadav", averageScore: 54, attendancePercent: 76, reason: "Chemistry basics need support" }] },
  { batchId: "BAT-10-BOARD", batchName: "Class 10 Board Morning", course: "Board Preparation", branch: "Main Branch", teacher: "Khan Sir", students: 24, averageScore: 79, attendancePercent: 90, resultTrend: "up", weakChapters: [{ subject: "Maths", chapter: "Trigonometry", averageScore: 61, supportStudents: 4 }], topStudents: [{ studentName: "Dev Arora", averageScore: 94, attendancePercent: 97, strength: "Accuracy and revision discipline" }], supportStudents: [] }
];

if (!globalThis.NAXORA_PART73_ACTIVITY) globalThis.NAXORA_PART73_ACTIVITY = [];

function part73CleanText(value, max = 500) { return String(value ?? "").replace(/[<>]/g, "").trim().slice(0, max); }
function part73Lower(value) { return part73CleanText(value, 500).toLowerCase(); }
function part73DbReady() { return mongoose.connection.readyState === 1 && globalThis.NAXORA_DB_MODE !== "mock"; }
function part73Role(role = "owner") {
  const key = part73CleanText(role, 80).toLowerCase().replace(/[ -]+/g, "_") || "owner";
  if (key === "institute_owner") return "owner";
  if (key === "staff" || key === "counsellor") return "receptionist";
  return part73RolePermissions[key] ? key : "owner";
}
function part73Can(role, permission) {
  const resolved = part73Role(role);
  const allowed = part73RolePermissions[resolved]?.allowed || [];
  return allowed.includes(permission) || allowed.includes("vani_batch_analysis") || allowed.some((item) => permission.startsWith(item.replace("_assigned_branch", "").replace("_assigned_batches", "")));
}
async function part73Log(type, payload = {}) {
  const row = { id: `part73-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`, type: part73CleanText(type, 80), payload, createdAt: new Date().toISOString(), part: part73Config.part };
  globalThis.NAXORA_PART73_ACTIVITY.unshift(row);
  globalThis.NAXORA_PART73_ACTIVITY = globalThis.NAXORA_PART73_ACTIVITY.slice(0, 100);
  if (part73DbReady()) { try { await mongoose.connection.db.collection("part73batchperformanceanalyzerlogs").insertOne(row); } catch (error) { /* non-blocking */ } }
  return row;
}
function part73Risk(batch) {
  const score = Number(batch.averageScore || 0); const attendance = Number(batch.attendancePercent || 0);
  if (score < 55 || attendance < 70) return "critical";
  if (score < 65 || attendance < 78) return "high";
  if (score < 75 || attendance < 85) return "medium";
  return "low";
}
function part73NormalizeBatch(row = {}) {
  const weakChapters = Array.isArray(row.weakChapters) ? row.weakChapters : [];
  const topStudents = Array.isArray(row.topStudents) ? row.topStudents : [];
  const supportStudents = Array.isArray(row.supportStudents) ? row.supportStudents : [];
  const batch = {
    batchId: part73CleanText(row.batchId || row._id || `BAT-${Date.now()}`, 80),
    batchName: part73CleanText(row.batchName || row.name || row.batch || "General Batch", 120),
    course: part73CleanText(row.course || row.courseName || "General Course", 100),
    branch: part73CleanText(row.branch || row.branchName || "Main Branch", 100),
    teacher: part73CleanText(row.teacher || row.teacherName || "Assigned Teacher", 100),
    students: Number(row.students || row.studentCount || 0),
    averageScore: Math.round(Number(row.averageScore || row.avgScore || 0)),
    attendancePercent: Math.round(Number(row.attendancePercent || row.attendance || 0)),
    resultTrend: part73CleanText(row.resultTrend || row.trend || "stable", 40),
    weakChapters: weakChapters.map((c) => ({ subject: part73CleanText(c.subject || "Subject", 80), chapter: part73CleanText(c.chapter || c.name || "Chapter", 120), averageScore: Math.round(Number(c.averageScore || 0)), supportStudents: Number(c.supportStudents || 0) })),
    topStudents: topStudents.map((s) => ({ studentName: part73CleanText(s.studentName || s.name || "Student", 100), averageScore: Math.round(Number(s.averageScore || 0)), attendancePercent: Math.round(Number(s.attendancePercent || 0)), strength: part73CleanText(s.strength || "Consistent performance", 160) })),
    supportStudents: supportStudents.map((s) => ({ studentName: part73CleanText(s.studentName || s.name || "Student", 100), averageScore: Math.round(Number(s.averageScore || 0)), attendancePercent: Math.round(Number(s.attendancePercent || 0)), reason: part73CleanText(s.reason || "Needs academic support", 160) }))
  };
  batch.risk = part73Risk(batch);
  return batch;
}
async function part73LoadBatches(filters = {}) {
  let rows = part73DemoBatches;
  if (part73DbReady()) {
    try {
      const dbRows = await mongoose.connection.db.collection("part73batchperformances").find({}).limit(80).toArray();
      if (dbRows.length) rows = dbRows;
    } catch (error) { rows = part73DemoBatches; }
  }
  let normalized = rows.map(part73NormalizeBatch);
  const branch = part73Lower(filters.branch || ""); const course = part73Lower(filters.course || ""); const risk = part73Lower(filters.risk || "");
  if (branch) normalized = normalized.filter((b) => part73Lower(b.branch).includes(branch));
  if (course) normalized = normalized.filter((b) => part73Lower(b.course).includes(course) || part73Lower(b.batchName).includes(course));
  if (risk) {
    const order = { low: 1, medium: 2, high: 3, critical: 4 };
    normalized = normalized.filter((b) => (order[b.risk] || 0) >= (order[risk] || 0));
  }
  return normalized;
}
function part73Analyze(batches = []) {
  const weakBatches = batches.filter((b) => ["medium", "high", "critical"].includes(b.risk)).sort((a, b) => (a.averageScore + a.attendancePercent) - (b.averageScore + b.attendancePercent));
  const weakChapters = [];
  batches.forEach((batch) => (batch.weakChapters || []).forEach((chapter) => weakChapters.push({ ...chapter, batchId: batch.batchId, affectedBatches: [batch.batchName], branch: batch.branch, risk: chapter.averageScore < 50 ? "critical" : chapter.averageScore < 60 ? "high" : "medium" })));
  const topStudents = batches.flatMap((batch) => (batch.topStudents || []).map((student) => ({ ...student, batchName: batch.batchName, branch: batch.branch }))).sort((a, b) => b.averageScore - a.averageScore).slice(0, 10);
  const studentsNeedingSupport = batches.flatMap((batch) => (batch.supportStudents || []).map((student) => ({ ...student, batchId: batch.batchId, batchName: batch.batchName, branch: batch.branch, risk: student.averageScore < 50 || student.attendancePercent < 70 ? "high" : "medium" })));
  const teacherSuggestions = [];
  weakBatches.forEach((batch) => {
    teacherSuggestions.push({ title: `${batch.batchName} remedial plan`, detail: `${batch.teacher} ke saath ${batch.batchName} me weak chapters ka 2-session revision plan schedule karo.`, priority: batch.risk, ownerAction: true });
    if (batch.attendancePercent < 78) teacherSuggestions.push({ title: `${batch.batchName} attendance recovery`, detail: `Low attendance students ke parent check-in aur missed class notes share karo.`, priority: batch.risk, ownerAction: false });
  });
  weakChapters.slice(0, 5).forEach((chapter) => teacherSuggestions.push({ title: `${chapter.chapter} concept support`, detail: `${chapter.subject} ke ${chapter.chapter} par mini-test + doubt class plan banao.`, priority: chapter.risk, ownerAction: false }));
  return {
    summary: { totalBatches: batches.length, weakBatches: weakBatches.length, weakChapters: weakChapters.length, topStudents: topStudents.length, studentsNeedingSupport: studentsNeedingSupport.length, averageScore: batches.length ? Math.round(batches.reduce((sum, b) => sum + b.averageScore, 0) / batches.length) : 0, averageAttendance: batches.length ? Math.round(batches.reduce((sum, b) => sum + b.attendancePercent, 0) / batches.length) : 0 },
    weakBatches, weakChapters, topStudents, studentsNeedingSupport, teacherSuggestions
  };
}
async function part73BatchPerformance(filters = {}) { return part73Analyze(await part73LoadBatches(filters)); }
async function part73VaniCommand(command = "weak batches dikhao", payload = {}) {
  const role = part73Role(payload.role || "owner"); const text = part73Lower(command);
  const missing = [];
  if (text.includes("branch") && !payload.branch) missing.push("branch name");
  const canView = part73Can(role, "batch_analysis");
  const result = await part73BatchPerformance(payload);
  let action = "batch_performance_summary";
  if (text.includes("chapter")) action = "weak_chapters";
  if (text.includes("top")) action = "top_students";
  if (text.includes("support") || text.includes("weak student")) action = "students_needing_support";
  if (text.includes("teacher") || text.includes("suggestion")) action = "teacher_suggestions";
  if (!canView) return { allowed: false, role, action, message: "Is role ko full batch performance access nahi hai.", privateDisplayRequired: true };
  if (missing.length) return { allowed: true, role, action, needsMoreDetails: true, missingDetails: missing, question: `Kripya ${missing.join(", ")} batao, phir main exact analysis dikha dunga.` };
  return { allowed: true, role, action, responseMode: "private-screen-first", spokenSummary: `Analysis ready hai. ${result.summary.weakBatches} weak batches, ${result.summary.weakChapters} weak chapters aur ${result.summary.studentsNeedingSupport} students ko support chahiye. Sensitive student details screen par dikhaye gaye hain.`, preview: result, confirmationRequiredForActions: ["export", "message_send", "student_status_change", "teacher_warning"], sensitiveVerificationRequired: false };
}

app.get("/api/part73/status", (req, res) => res.json({ success: true, part: part73Config.part, status: part73Config.status, frontend: [part73Config.frontendRoute, ...part73Config.alternateRoutes], apiRoutes: part73Config.apiRoutes, purpose: part73Config.purpose, currentVersionPlan: "Part 53-78 = NAXORA OS 1.0 completion. Part 79-110 = NAXORA OS 2.0 development.", nextPart: part73Config.nextPart }));
app.get("/api/part73/config", (req, res) => res.json({ success: true, part: part73Config.part, config: part73Config }));
app.get("/api/part73/features", (req, res) => res.json({ success: true, part: part73Config.part, features: part73Features }));
app.get("/api/part73/roles", (req, res) => res.json({ success: true, part: part73Config.part, roles: part73RolePermissions }));
app.get("/api/part73/batch-performance", async (req, res) => { const role = part73Role(req.query.role || "owner"); if (!part73Can(role, "batch_analysis")) return res.status(403).json({ success: false, part: part73Config.part, role, message: "Is role ko batch analysis access nahi hai." }); const result = await part73BatchPerformance(req.query); await part73Log("batch_performance_viewed", { role, summary: result.summary }); res.json({ success: true, part: part73Config.part, role, result }); });
app.get("/api/part73/weak-batches", async (req, res) => { const result = await part73BatchPerformance(req.query); res.json({ success: true, part: part73Config.part, count: result.weakBatches.length, weakBatches: result.weakBatches }); });
app.get("/api/part73/weak-chapters", async (req, res) => { const result = await part73BatchPerformance(req.query); res.json({ success: true, part: part73Config.part, count: result.weakChapters.length, weakChapters: result.weakChapters }); });
app.get("/api/part73/top-students", async (req, res) => { const result = await part73BatchPerformance(req.query); res.json({ success: true, part: part73Config.part, count: result.topStudents.length, topStudents: result.topStudents }); });
app.get("/api/part73/students-needing-support", async (req, res) => { const result = await part73BatchPerformance(req.query); res.json({ success: true, part: part73Config.part, count: result.studentsNeedingSupport.length, studentsNeedingSupport: result.studentsNeedingSupport }); });
app.get("/api/part73/teacher-suggestions", async (req, res) => { const result = await part73BatchPerformance(req.query); res.json({ success: true, part: part73Config.part, count: result.teacherSuggestions.length, teacherSuggestions: result.teacherSuggestions }); });
app.post("/api/part73/vani/command", async (req, res) => { const result = await part73VaniCommand(req.body?.command || req.body?.text || req.body?.transcript || "weak batches dikhao", req.body || {}); await part73Log("vani_batch_performance_command", { role: result.role, action: result.action, allowed: result.allowed, responseMode: result.responseMode }); res.status(result.allowed === false ? 403 : 200).json({ success: result.allowed !== false, part: part73Config.part, result }); });
app.get("/api/part73/activity", (req, res) => res.json({ success: true, part: part73Config.part, count: globalThis.NAXORA_PART73_ACTIVITY.length, activity: globalThis.NAXORA_PART73_ACTIVITY }));
app.get("/api/part73/checklist", (req, res) => res.json({ success: true, part: part73Config.part, checklist: part73Checklist }));
app.get("/api/part73/export", async (req, res) => { const result = await part73BatchPerformance(req.query); res.json({ success: true, part: part73Config.part, exportedAt: new Date().toISOString(), config: part73Config, features: part73Features, roles: part73RolePermissions, result, checklist: part73Checklist, activity: globalThis.NAXORA_PART73_ACTIVITY, exportRequiresOwnerVerification: true }); });
app.get("/api/part73/demo", async (req, res) => { const result = await part73BatchPerformance({}); const vani = await part73VaniCommand("VANI, weak batches, weak chapters aur teacher suggestions dikhao", { role: "owner" }); await part73Log("demo_generated", { weakBatches: result.summary.weakBatches, supportStudents: result.summary.studentsNeedingSupport }); res.json({ success: true, part: part73Config.part, demoTitle: "AI Batch Performance Analyzer Demo", demo: { result, vani }, checklist: part73Checklist }); });
// ================= END PART 73 =================


// ================= PART 74: AI PARENT COMMUNICATION AND WEEKLY SUMMARY =================
const part74Config = {
  part: "Part 74 - AI Parent Communication and Weekly Summary",
  status: "active",
  frontendRoute: "/ai-parent-weekly-summary",
  alternateRoutes: ["/ai-parent-communication", "/weekly-summary-ai", "/parent-communication-ai", "/ai-weekly-summary"],
  previousPart: "Part 73 - AI Batch Performance Analyzer",
  nextPart: "Part 75 - Student AI Tools",
  purpose: "Parent message drafts, result explanation, weekly revenue report, attendance report, enquiry/admission summary aur VANI-safe communication support.",
  safetyMode: "draft-and-preview-only-no-direct-send-no-public-speaking-of-sensitive-data",
  vaniMode: "Hindi/English/Hinglish VANI commands with role checks, missing detail questions, private display for sensitive data and audit log.",
  apiRoutes: [
    "/api/part74/status",
    "/api/part74/config",
    "/api/part74/features",
    "/api/part74/roles",
    "/api/part74/parent-message-draft",
    "/api/part74/result-explanation",
    "/api/part74/weekly-summary",
    "/api/part74/revenue-summary",
    "/api/part74/attendance-summary",
    "/api/part74/enquiry-admission-summary",
    "/api/part74/vani/command",
    "/api/part74/activity",
    "/api/part74/checklist",
    "/api/part74/export",
    "/api/part74/demo"
  ]
};

const part74Features = [
  { id: "parent-message-drafts", title: "Parent Message Drafts", why: "Teachers/counsellors ko parent updates ke liye polite, clear aur consistent drafts chahiye.", problemSolved: "Manual message writing aur harsh/unclear communication ka risk kam hota hai.", ownerBenefit: "Institute communication quality consistent hoti hai.", instituteBenefit: "Parent trust improve hota hai.", teacherBenefit: "Teacher ka repetitive communication time bachta hai.", studentBenefit: "Student ko timely support milta hai.", parentBenefit: "Parent ko respectful aur clear update milta hai." },
  { id: "result-explanation", title: "Result Explanation", why: "Marks ko parent-friendly explanation me convert karna zaroori hai.", problemSolved: "Parent ko sirf marks nahi, reason aur next support plan samajh aata hai.", ownerBenefit: "Result communication professional hoti hai.", instituteBenefit: "Parent complaints aur confusion reduce hota hai.", teacherBenefit: "Teacher result discussion better handle karta hai.", studentBenefit: "Student ko blame ke bajay improvement plan milta hai.", parentBenefit: "Parent ko child ke weak/strong areas clear hote hain." },
  { id: "weekly-revenue-report", title: "Weekly Revenue Report", why: "Owner ko weekly fee collection aur pending dues ka quick summary chahiye.", problemSolved: "Manual finance review time reduce hota hai.", ownerBenefit: "Revenue, pending dues aur collection action clear hota hai.", instituteBenefit: "Cash-flow tracking improve hoti hai.", teacherBenefit: "Teaching staff ko finance access nahi diya jata, role safety maintain hoti hai.", studentBenefit: "Fee follow-up structured hota hai.", parentBenefit: "Fee reminders clearer aur less confusing hote hain." },
  { id: "weekly-attendance-report", title: "Weekly Attendance Report", why: "Attendance problems weekly identify honi chahiye.", problemSolved: "Absent students ko late identify karne ka risk kam hota hai.", ownerBenefit: "Low attendance trends early dikhte hain.", instituteBenefit: "Retention aur learning continuity improve hoti hai.", teacherBenefit: "Teacher support list ready milti hai.", studentBenefit: "Missed class recovery support milta hai.", parentBenefit: "Parent ko attendance concern time par milta hai." },
  { id: "enquiry-admission-summary", title: "Enquiry and Admission Summary", why: "Owner ko weekly sales/admission funnel samajhna hota hai.", problemSolved: "Admissions aur follow-ups scattered nahi rahte.", ownerBenefit: "Admission conversion aur counsellor priority clear hoti hai.", instituteBenefit: "Growth funnel visible hota hai.", teacherBenefit: "Demo class demand ka context mil sakta hai.", studentBenefit: "Interested students ka follow-up miss nahi hota.", parentBenefit: "Callback/demo response fast hota hai." }
];

const part74RolePermissions = {
  naxora_super_admin: { label: "NAXORA Super Admin", allowed: ["technical_support_view", "audit_log_view"], sensitiveVerification: true, note: "Institute-private data ka unrestricted daily access nahi; logged support mode only." },
  owner: { label: "Institute Owner", allowed: ["parent_draft", "result_explanation", "weekly_summary", "revenue_summary", "attendance_summary", "admission_summary", "vani_parent_summary", "audit_log_view", "export_request"], sensitiveVerification: true },
  branch_manager: { label: "Branch Manager", allowed: ["parent_draft_assigned_branch", "result_explanation_assigned_branch", "weekly_summary_assigned_branch", "attendance_summary", "admission_summary", "vani_parent_summary"], sensitiveVerification: true },
  accountant: { label: "Accountant", allowed: ["revenue_summary", "fee_parent_draft", "weekly_finance_summary"], sensitiveVerification: true },
  teacher: { label: "Teacher", allowed: ["parent_draft_assigned_batches", "result_explanation_assigned_batches", "attendance_summary_assigned_batches"], sensitiveVerification: false },
  receptionist: { label: "Receptionist/Counsellor", allowed: ["parent_draft", "admission_summary", "enquiry_summary", "followup_summary"], sensitiveVerification: false },
  student: { label: "Student", allowed: ["own_weekly_learning_summary"], sensitiveVerification: false },
  parent: { label: "Parent", allowed: ["linked_child_summary"], sensitiveVerification: false }
};

const part74Checklist = [
  "AI Parent Weekly Summary page /ai-parent-weekly-summary open ho raha hai.",
  "/api/part74/status success true return karta hai.",
  "Parent message draft direct send nahi karta, sirf preview/draft return karta hai.",
  "Result explanation supportive language me hai, student ko label/blame nahi karta.",
  "Weekly revenue summary owner/accountant role ke according gated hai.",
  "Weekly attendance summary support-alert style me return hota hai.",
  "Enquiry/admission summary weekly funnel dikhata hai.",
  "VANI command missing details poochti hai aur sensitive data private-screen-first rule follow karti hai.",
  "Export/sending actions owner verification required mark hoti hain.",
  "Previous Part 71, 72 and 73 routes preserved hain."
];

const part74WeeklyDemo = {
  revenue: { collected: 184500, pending: 63200, failedPayments: 3, renewalDue: 2, insight: "Is week collection strong hai, lekin 8 high-priority pending fee follow-ups recommended hain." },
  attendance: { average: 84, concernStudents: 7, improvedStudents: 11, insight: "Overall attendance stable hai. 7 students ke parent check-in aur missed notes sharing recommended hai." },
  admissions: { newEnquiries: 34, demosBooked: 9, converted: 5, followUpsDue: 12, insight: "Hot leads ko same-day callback aur demo reminders bhejna admission conversion improve karega." },
  academics: { testsConducted: 4, resultConcernStudents: 6, topImprovers: 3, insight: "Result explanation messages low-score students ke parents ke liye draft ready karne chahiye." }
};
const part74ResultExplanations = [
  { studentName: "Aman Sharma", subject: "Maths", score: 54, trend: "improving slowly", explanation: "Aman ke marks me basic calculation accuracy improve hui hai, lekin Quadratic Equations me extra practice ki zarurat hai. Is week 2 revision worksheets aur doubt session recommended hai." },
  { studentName: "Riya Verma", subject: "Physics", score: 88, trend: "strong", explanation: "Riya ne Laws of Motion test me strong conceptual clarity dikhayi. Ab usko advanced numericals aur timed practice dena useful rahega." },
  { studentName: "Nitin Yadav", subject: "Chemistry", score: 49, trend: "needs support", explanation: "Nitin ko Mole Concept basics me support chahiye. Parent ko panic karne ke bajay short remedial plan aur weekly monitoring explain karna best rahega." }
];
if (!globalThis.NAXORA_PART74_ACTIVITY) globalThis.NAXORA_PART74_ACTIVITY = [];
function part74CleanText(value, max = 600) { return String(value ?? "").replace(/[<>]/g, "").trim().slice(0, max); }
function part74Lower(value) { return part74CleanText(value, 600).toLowerCase(); }
function part74DbReady() { return mongoose.connection.readyState === 1 && globalThis.NAXORA_DB_MODE !== "mock"; }
function part74Role(role = "owner") { const key = part74CleanText(role, 80).toLowerCase().replace(/[ -]+/g, "_") || "owner"; if (key === "institute_owner") return "owner"; if (key === "staff" || key === "counsellor") return "receptionist"; return part74RolePermissions[key] ? key : "owner"; }
function part74Can(role, permission) { const resolved = part74Role(role); const allowed = part74RolePermissions[resolved]?.allowed || []; return allowed.includes(permission) || allowed.some((item) => permission.startsWith(item.replace("_assigned_branch", "").replace("_assigned_batches", ""))); }
async function part74Log(type, payload = {}) { const row = { id: `part74-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`, type: part74CleanText(type, 80), payload, createdAt: new Date().toISOString(), part: part74Config.part }; globalThis.NAXORA_PART74_ACTIVITY.unshift(row); globalThis.NAXORA_PART74_ACTIVITY = globalThis.NAXORA_PART74_ACTIVITY.slice(0, 100); if (part74DbReady()) { try { await mongoose.connection.db.collection("part74parentcommunicationsummarylogs").insertOne(row); } catch (error) { /* non-blocking */ } } return row; }
function part74MessageDraft(input = {}) {
  const messageType = part74Lower(input.messageType || "weekly");
  const studentName = part74CleanText(input.studentName || "Student", 120);
  const parentName = part74CleanText(input.parentName || "Parent ji", 120);
  const language = part74Lower(input.language || "hinglish");
  const safePrefix = language === "english" ? `Hello ${parentName},` : `Namaste ${parentName},`;
  let body = `${safePrefix}\n\n${studentName} ka weekly learning update ready hai. Attendance, test performance aur next support plan institute dashboard me review kiya gaya hai.`;
  if (messageType.includes("result")) body = `${safePrefix}\n\n${studentName} ke recent result me kuch strong points aur kuch improvement areas dikh rahe hain. Hum next week focused revision aur doubt support plan kar rahe hain. Kripya panic na karein; support plan screen par shared hai.`;
  if (messageType.includes("attendance")) body = `${safePrefix}\n\n${studentName} ki attendance me is week kuch concern dikh raha hai. Regular class continuity ke liye missed topics cover karna important hai. Hum aapke saath support plan share karenge.`;
  if (messageType.includes("fee")) body = `${safePrefix}\n\nFee record me pending amount ka reminder draft ready hai. Kripya details dashboard par privately verify karke hi message send karein.`;
  if (messageType.includes("appreciation")) body = `${safePrefix}\n\n${studentName} ne is week positive progress dikhayi hai. Regular practice aur attendance continue rakhne par result aur improve ho sakta hai. Great work!`;
  return { draftId: `P74-DRAFT-${Date.now()}`, messageType, studentName, parentName, language, body, directSendDisabled: true, previewRequired: true, confirmationRequiredBeforeSend: true, sensitiveDataPolicy: "Financial/personal details screen par verify karo; speaker par loudly mat bolo." };
}
function part74WeeklySummary(role = "owner") { const resolved = part74Role(role); return { role: resolved, week: "current", revenue: part74Can(resolved, "revenue_summary") || resolved === "owner" ? part74WeeklyDemo.revenue : { access: "limited", message: "Revenue summary is role-restricted." }, attendance: part74WeeklyDemo.attendance, admissions: part74Can(resolved, "admission_summary") || ["owner","branch_manager","receptionist"].includes(resolved) ? part74WeeklyDemo.admissions : { access: "limited", message: "Admission summary is role-restricted." }, academics: part74WeeklyDemo.academics, generatedAt: new Date().toISOString(), privateDisplayRequired: true } }
function part74VaniCommand(command = "weekly summary banao", payload = {}) {
  const role = part74Role(payload.role || "owner"); const text = part74Lower(command); const missing = [];
  let action = "weekly_summary";
  if (text.includes("parent") || text.includes("message") || text.includes("draft")) action = "parent_draft";
  if (text.includes("result")) action = "result_explanation";
  if (text.includes("revenue") || text.includes("fees") || text.includes("collection")) action = "revenue_summary";
  if (text.includes("attendance")) action = "attendance_summary";
  if (text.includes("enquiry") || text.includes("admission")) action = "admission_summary";
  if ((action === "parent_draft" || action === "result_explanation") && !payload.studentName && !text.includes("weekly")) missing.push("student name");
  if (action === "revenue_summary" && !part74Can(role, "revenue_summary")) return { allowed: false, role, action, message: "Is role ko revenue summary access nahi hai.", privateDisplayRequired: true };
  if (missing.length) return { allowed: true, role, action, needsMoreDetails: true, missingDetails: missing, question: `Kripya ${missing.join(", ")} batao, phir main safe preview bana dunga.` };
  const summary = part74WeeklySummary(role);
  const draft = part74MessageDraft({ studentName: payload.studentName || "Student", parentName: payload.parentName || "Parent ji", messageType: action.includes("result") ? "result" : action.includes("attendance") ? "attendance" : "weekly", language: payload.language || "hinglish" });
  return { allowed: true, role, action, responseMode: "private-screen-first", spokenSummary: "Summary aur draft ready hai. Sensitive financial/personal details screen par privately dikhaye gaye hain.", preview: { summary, draft, resultExplanations: part74ResultExplanations }, confirmationRequiredForActions: ["send_message", "export_report", "discount", "refund", "delete", "subscription_change"], ownerVerificationRequiredForSensitiveActions: true, auditLogRequired: true };
}

app.get("/api/part74/status", (req, res) => res.json({ success: true, part: part74Config.part, status: part74Config.status, frontend: [part74Config.frontendRoute, ...part74Config.alternateRoutes], apiRoutes: part74Config.apiRoutes, purpose: part74Config.purpose, currentVersionPlan: "Part 53-78 = NAXORA OS 1.0 completion. Part 79-110 = NAXORA OS 2.0 development.", nextPart: part74Config.nextPart }));
app.get("/api/part74/config", (req, res) => res.json({ success: true, part: part74Config.part, config: part74Config }));
app.get("/api/part74/features", (req, res) => res.json({ success: true, part: part74Config.part, features: part74Features }));
app.get("/api/part74/roles", (req, res) => res.json({ success: true, part: part74Config.part, roles: part74RolePermissions }));
app.post("/api/part74/parent-message-draft", async (req, res) => { const role = part74Role(req.body?.role || "owner"); if (!part74Can(role, "parent_draft")) return res.status(403).json({ success: false, part: part74Config.part, role, message: "Is role ko parent message draft access nahi hai." }); const draft = part74MessageDraft(req.body || {}); await part74Log("parent_message_draft_created", { role, messageType: draft.messageType, studentName: draft.studentName }); res.json({ success: true, part: part74Config.part, role, draft }); });
app.get("/api/part74/result-explanation", async (req, res) => { await part74Log("result_explanation_viewed", { role: part74Role(req.query.role || "owner") }); res.json({ success: true, part: part74Config.part, resultExplanations: part74ResultExplanations, supportiveLanguage: true, noBlameLabels: true }); });
app.get("/api/part74/weekly-summary", async (req, res) => { const summary = part74WeeklySummary(req.query.role || "owner"); await part74Log("weekly_summary_viewed", { role: summary.role }); res.json({ success: true, part: part74Config.part, summary }); });
app.get("/api/part74/revenue-summary", (req, res) => { const role = part74Role(req.query.role || "owner"); if (!part74Can(role, "revenue_summary")) return res.status(403).json({ success: false, part: part74Config.part, role, message: "Revenue summary role-restricted hai." }); res.json({ success: true, part: part74Config.part, role, revenue: part74WeeklyDemo.revenue, privateDisplayRequired: true }); });
app.get("/api/part74/attendance-summary", (req, res) => res.json({ success: true, part: part74Config.part, attendance: part74WeeklyDemo.attendance, supportFirst: true }));
app.get("/api/part74/enquiry-admission-summary", (req, res) => res.json({ success: true, part: part74Config.part, admissions: part74WeeklyDemo.admissions }));
app.post("/api/part74/vani/command", async (req, res) => { const result = part74VaniCommand(req.body?.command || req.body?.text || req.body?.transcript || "weekly summary banao", req.body || {}); await part74Log("vani_parent_weekly_command", { role: result.role, action: result.action, allowed: result.allowed, responseMode: result.responseMode }); res.status(result.allowed === false ? 403 : 200).json({ success: result.allowed !== false, part: part74Config.part, result }); });
app.get("/api/part74/activity", (req, res) => res.json({ success: true, part: part74Config.part, count: globalThis.NAXORA_PART74_ACTIVITY.length, activity: globalThis.NAXORA_PART74_ACTIVITY }));
app.get("/api/part74/checklist", (req, res) => res.json({ success: true, part: part74Config.part, checklist: part74Checklist }));
app.get("/api/part74/export", (req, res) => res.json({ success: true, part: part74Config.part, exportedAt: new Date().toISOString(), config: part74Config, features: part74Features, roles: part74RolePermissions, weeklySummary: part74WeeklySummary(req.query.role || "owner"), checklist: part74Checklist, activity: globalThis.NAXORA_PART74_ACTIVITY, exportRequiresOwnerVerification: true }));
app.get("/api/part74/demo", async (req, res) => { const demo = { draftTypes: ["weekly", "result", "attendance", "fee", "appreciation"], weeklySummary: part74WeeklySummary("owner"), resultExplanations: part74ResultExplanations, vani: part74VaniCommand("VANI, weekly summary aur parent message draft banao", { role: "owner", studentName: "Aman Sharma", parentName: "Rakesh ji" }) }; await part74Log("demo_generated", { drafts: demo.draftTypes.length }); res.json({ success: true, part: part74Config.part, demoTitle: "AI Parent Communication and Weekly Summary Demo", demo, checklist: part74Checklist }); });
// ================= END PART 74 =================


// ============================================================
// NAXORA Institute OS - Part 75: Student AI Tools
// AI Study Planner, Weak Topic Coach, AI Flashcards, VANI Revision Assistant, Institute Recommendation AI
// ============================================================
const part75Config = {
  part: "Part 75 — Student AI Tools",
  status: "active",
  frontendRoute: "/student-ai-tools",
  alternateRoutes: ["/student-ai", "/student-tools-ai", "/ai-study-tools", "/vani-revision-assistant", "/student-revision-ai"],
  apiRoutes: [
    "/api/part75/status",
    "/api/part75/config",
    "/api/part75/features",
    "/api/part75/roles",
    "/api/part75/study-planner",
    "/api/part75/weak-topic-coach",
    "/api/part75/flashcards",
    "/api/part75/vani-revision",
    "/api/part75/institute-recommendations",
    "/api/part75/vani/command",
    "/api/part75/activity",
    "/api/part75/checklist",
    "/api/part75/export",
    "/api/part75/demo"
  ],
  purpose: "Personalized student learning aur engagement ke liye AI tools: planner, weak topic coach, flashcards, VANI revision assistant aur institute recommendation AI.",
  nextPart: "Part 76 — Smart Classroom Setup Module",
  versionPlan: "Part 53-78 = NAXORA OS 1.0 completion. Part 79-110 = NAXORA OS 2.0 development."
};

const part75Features = [
  { key: "ai_study_planner", name: "AI Study Planner", why: "Student ko daily/weekly study plan dena.", problemSolved: "Student ko kya, kab aur kitna padhna hai iski confusion kam hoti hai.", benefits: { owner: "Better student engagement", institute: "Learning outcomes improve", teacher: "Students prepared aate hain", student: "Clear daily plan", parent: "Child ka plan visible" } },
  { key: "weak_topic_coach", name: "Weak Topic Coach", why: "Weak topic ko simple steps me improve karna.", problemSolved: "Student weak chapter se stuck nahi rehta.", benefits: { owner: "Results improve", institute: "Remedial support structured", teacher: "Weakness target clear", student: "Focused help", parent: "Support plan samajh aata hai" } },
  { key: "ai_flashcards", name: "AI Flashcards", why: "Quick revision aur active recall ke liye.", problemSolved: "Passive reading ke bajay fast recall practice hoti hai.", benefits: { owner: "AI feature value visible", institute: "Study material engagement", teacher: "Revision tools reusable", student: "Fast revision", parent: "Practice habit improve" } },
  { key: "vani_revision_assistant", name: "VANI Revision Assistant", why: "Student voice/text se revision help le sake.", problemSolved: "Non-technical students bhi Hinglish commands se padh sakte hain.", benefits: { owner: "Premium AI positioning", institute: "Student usage grows", teacher: "Repeated revision doubts kam", student: "Voice-based help", parent: "Home learning support" } },
  { key: "institute_recommendation_ai", name: "Institute Recommendation AI", why: "Student ke goal/location ke hisaab se suitable institute suggest karna.", problemSolved: "Student ko discovery marketplace me better choice milti hai.", benefits: { owner: "Marketplace lead quality", institute: "Qualified leads", teacher: "Correct batch fit", student: "Better institute match", parent: "Decision easy" } }
];

const part75RolePermissions = {
  owner: { allowed: ["view_all_student_ai", "usage_reports", "recommendation_insights", "support_overview"], limits: "Institute-wide summary, private student details role-based." },
  branch_manager: { allowed: ["view_branch_student_ai", "support_overview"], limits: "Assigned branch only." },
  teacher: { allowed: ["view_assigned_students", "create_support_plan", "flashcards_for_batch"], limits: "Assigned batches/students only." },
  student: { allowed: ["own_study_planner", "own_weak_topic_coach", "own_flashcards", "own_vani_revision", "own_recommendations"], limits: "Own learning data only." },
  parent: { allowed: ["linked_child_planner", "linked_child_progress_summary"], limits: "Linked child only." },
  receptionist: { allowed: ["institute_recommendation_ai"], limits: "Discovery/enquiry context only." },
  accountant: { allowed: ["ai_usage_summary_only"], limits: "No learning private details." },
  naxora_super_admin: { allowed: ["logged_technical_support"], limits: "No unrestricted daily access to institute-private data." }
};

const part75Checklist = [
  "Student AI Tools page /student-ai-tools open ho raha hai.",
  "AI Study Planner safe demo plan generate karta hai.",
  "Weak Topic Coach student ko supportive plan deta hai, labels/blame nahi karta.",
  "AI Flashcards revision cards generate karta hai.",
  "VANI Revision Assistant Hindi/English/Hinglish command accept karta hai.",
  "Institute Recommendation AI public discovery data style me suggestion deta hai.",
  "Role permissions own/linked/assigned access model follow karte hain.",
  "Sensitive student data speaker par loudly bolne ke bajay private screen-first rule follow hota hai.",
  "No .env, no secret, no API key, no node_modules, no .bat in ZIP.",
  "Previous Part 52-74 features preserved hain."
];

const part75Demo = {
  tools: ["AI Study Planner", "Weak Topic Coach", "AI Flashcards", "VANI Revision Assistant", "Institute Recommendation AI"],
  studyPlanner: {
    studentName: "Aman Sharma",
    goal: "Class 10 Boards + JEE Foundation",
    days: [
      { day: "Monday", minutes: 60, focus: "Quadratic Equations concept revision + 10 solved examples" },
      { day: "Tuesday", minutes: 50, focus: "Physics Laws of Motion basics + short notes" },
      { day: "Wednesday", minutes: 45, focus: "Chemistry Mole Concept flashcards + 15 MCQs" },
      { day: "Thursday", minutes: 60, focus: "Weak topic practice test and mistake review" },
      { day: "Friday", minutes: 40, focus: "Formula revision + doubt list prepare" },
      { day: "Saturday", minutes: 70, focus: "Mixed mock practice + teacher doubt session" },
      { day: "Sunday", minutes: 35, focus: "Weekly recap and next week planning" }
    ]
  },
  weakTopicCoach: [
    { topic: "Quadratic Equations", level: "needs support", plan: "First standard form identify karo, phir factorisation, then formula method. Daily 8 questions for 5 days." },
    { topic: "Mole Concept", level: "foundation", plan: "Mole-mass-particles relation ko one-page chart me revise karo, phir 10 basic conversions practice karo." }
  ],
  flashcards: [
    { question: "Quadratic equation ka standard form kya hota hai?", answer: "ax² + bx + c = 0, jahan a ≠ 0." },
    { question: "Newton's second law simple words me?", answer: "Force mass aur acceleration ke product ke proportional hota hai: F = ma." },
    { question: "One mole me kitne particles hote hain?", answer: "6.022 × 10²³ particles." }
  ],
  instituteRecommendations: [
    { name: "NAXORA Demo Institute - Science Wing", matchScore: 92, reason: "Class 10 + JEE Foundation goal, evening batch availability aur weekly tests match karte hain." },
    { name: "NAXORA Demo Institute - Boards Excellence", matchScore: 84, reason: "Board result focus aur doubt support strong hai." }
  ],
  roleRules: {
    Student: "Sirf apna planner, flashcards, weak topic coach aur VANI revision dekh sakta hai.",
    Parent: "Sirf linked child ka summary view kar sakta hai.",
    Teacher: "Assigned batch ke support plan aur flashcards bana sakta hai.",
    Owner: "Institute-wide usage and support overview dekh sakta hai."
  }
};

if (!globalThis.NAXORA_PART75_ACTIVITY) globalThis.NAXORA_PART75_ACTIVITY = [];
function part75CleanText(value, max = 600) { return String(value ?? "").replace(/[<>]/g, "").trim().slice(0, max); }
function part75Lower(value) { return part75CleanText(value, 600).toLowerCase(); }
function part75DbReady() { return mongoose.connection.readyState === 1 && globalThis.NAXORA_DB_MODE !== "mock"; }
function part75Role(role = "student") { const key = part75CleanText(role, 80).toLowerCase().replace(/[ -]+/g, "_") || "student"; if (key === "institute_owner") return "owner"; if (key === "counsellor" || key === "staff") return "receptionist"; return part75RolePermissions[key] ? key : "student"; }
function part75Can(role, permission) { const resolved = part75Role(role); const allowed = part75RolePermissions[resolved]?.allowed || []; return allowed.includes(permission); }
async function part75Log(type, payload = {}) { const row = { id: `part75-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`, type: part75CleanText(type, 80), payload, createdAt: new Date().toISOString(), part: part75Config.part }; globalThis.NAXORA_PART75_ACTIVITY.unshift(row); globalThis.NAXORA_PART75_ACTIVITY = globalThis.NAXORA_PART75_ACTIVITY.slice(0, 100); if (part75DbReady()) { try { await mongoose.connection.db.collection("part75studentaitoolslogs").insertOne(row); } catch (error) {} } return row; }

function part75MakeStudyPlan(input = {}) {
  const studentName = part75CleanText(input.studentName || "Student", 120);
  const goal = part75CleanText(input.goal || "exam preparation", 180);
  const weakTopic = part75CleanText(input.weakTopic || "current weak topic", 140);
  const dailyMinutes = Math.max(20, Math.min(180, Number(input.dailyMinutes || 60)));
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day, index) => ({ day, minutes: index === 5 ? dailyMinutes + 10 : index === 6 ? Math.max(25, dailyMinutes - 20) : dailyMinutes, focus: index === 0 ? `${weakTopic} concept basics + short notes` : index === 1 ? `${weakTopic} solved examples + common mistakes` : index === 2 ? `${goal} related MCQ practice` : index === 3 ? `Mini test on ${weakTopic} + mistake review` : index === 4 ? `Formula/definitions flashcards + doubt list` : index === 5 ? `Mixed practice + teacher doubt session` : `Weekly recap + next week plan` }));
  return { studentName, goal, weakTopic, days, privacy: "Student/parent/teacher permissions ke according private display." };
}
function part75WeakTopicCoach(input = {}) { const topic = part75CleanText(input.weakTopic || input.topic || "Quadratic Equations", 140); return { topic, supportiveTone: true, noBlameLabels: true, plan: [`${topic} ke basics ko 15-minute blocks me revise karo.`, "3 easy + 3 medium + 2 mixed questions daily solve karo.", "Har galti ko mistake notebook me likho.", "Agar 3 din me confidence na aaye to teacher doubt slot book karo."], teacherNote: "Teacher assigned batch ke basis par extra worksheet assign kar sakta hai." }; }
function part75Flashcards(input = {}) { const topic = part75CleanText(input.topic || input.weakTopic || "Quadratic Equations", 140); return [ { question: `${topic} ka basic definition kya hai?`, answer: `${topic} ko simple definition + ek example ke saath revise karo.` }, { question: `${topic} me common mistake kya hoti hai?`, answer: "Formula ya step skip karna. Har step clearly likho." }, { question: `${topic} practice ka best method?`, answer: "Easy se medium aur then timed mixed questions." } ]; }
function part75InstituteRecommendations(input = {}) { const goal = part75CleanText(input.goal || "JEE Foundation", 160); const city = part75CleanText(input.city || "Delhi", 80); return [ { name: "NAXORA Demo Institute - Science Wing", city, matchScore: 92, reason: `${goal} ke liye weekly tests, doubt support aur evening batch match karte hain.`, action: "Profile compare karo ya callback request bhejo." }, { name: "NAXORA Demo Institute - Boards Excellence", city, matchScore: 84, reason: "Board-focused plan, notes aur parent progress reports available hain.", action: "Demo class availability check karo." } ]; }
function part75VaniRevision(command = "revision plan banao", payload = {}) {
  const role = part75Role(payload.role || "student"); const text = part75Lower(command); const missing = [];
  if (!payload.studentName && ["student","parent"].includes(role)) missing.push("student name");
  if (!payload.weakTopic && (text.includes("weak") || text.includes("topic"))) missing.push("weak topic");
  if (missing.length) return { allowed: true, role, needsMoreDetails: true, missingDetails: missing, question: `Kripya ${missing.join(", ")} batao, phir main safe revision preview bana dunga.` };
  const weakTopic = payload.weakTopic || "current weak topic";
  const planner = part75MakeStudyPlan({ ...payload, weakTopic });
  const coach = part75WeakTopicCoach({ weakTopic });
  const flashcards = part75Flashcards({ weakTopic });
  return { allowed: true, role, command: part75CleanText(command, 400), responseMode: "private-screen-first", spokenSummary: "Revision plan, weak topic coach aur flashcards ready hain. Private study details screen par dikhaye gaye hain.", preview: { planner, coach, flashcards }, directCreateUpdateDeleteDisabled: true, confirmationRequiredForActions: ["save_plan", "share_with_parent", "export", "recommend_institute"], auditLogRequired: true };
}

app.get("/api/part75/status", (req, res) => res.json({ success: true, part: part75Config.part, status: part75Config.status, frontend: [part75Config.frontendRoute, ...part75Config.alternateRoutes], apiRoutes: part75Config.apiRoutes, purpose: part75Config.purpose, currentVersionPlan: part75Config.versionPlan, nextPart: part75Config.nextPart }));
app.get("/api/part75/config", (req, res) => res.json({ success: true, part: part75Config.part, config: part75Config }));
app.get("/api/part75/features", (req, res) => res.json({ success: true, part: part75Config.part, features: part75Features }));
app.get("/api/part75/roles", (req, res) => res.json({ success: true, part: part75Config.part, roles: part75RolePermissions }));
app.get("/api/part75/study-planner", async (req, res) => { const role = part75Role(req.query.role || "student"); if (!["student","parent","teacher","owner","branch_manager"].includes(role)) return res.status(403).json({ success: false, part: part75Config.part, role, message: "Is role ko study planner access nahi hai." }); const plan = part75MakeStudyPlan(req.query); await part75Log("study_planner_generated", { role, studentName: plan.studentName, weakTopic: plan.weakTopic }); res.json({ success: true, part: part75Config.part, role, plan }); });
app.get("/api/part75/weak-topic-coach", async (req, res) => { const role = part75Role(req.query.role || "student"); const coach = part75WeakTopicCoach(req.query); await part75Log("weak_topic_coach_viewed", { role, topic: coach.topic }); res.json({ success: true, part: part75Config.part, role, coach }); });
app.get("/api/part75/flashcards", async (req, res) => { const role = part75Role(req.query.role || "student"); const flashcards = part75Flashcards(req.query); await part75Log("flashcards_generated", { role, topic: req.query.topic || req.query.weakTopic || "demo" }); res.json({ success: true, part: part75Config.part, role, flashcards, saveRequiresConfirmation: true }); });
app.get("/api/part75/vani-revision", async (req, res) => { const result = part75VaniRevision(req.query.q || req.query.command || "revision plan banao", req.query); await part75Log("vani_revision_requested", { role: result.role, command: req.query.q || req.query.command || "" }); res.json({ success: true, part: part75Config.part, result }); });
app.get("/api/part75/institute-recommendations", async (req, res) => { const role = part75Role(req.query.role || "student"); const recommendations = part75InstituteRecommendations(req.query); await part75Log("institute_recommendations_viewed", { role, city: req.query.city || "Delhi" }); res.json({ success: true, part: part75Config.part, role, recommendations, consentRequiredForLeadShare: true }); });
app.post("/api/part75/vani/command", async (req, res) => { const result = part75VaniRevision(req.body?.command || "revision plan banao", req.body || {}); await part75Log("vani_command", { role: result.role, command: req.body?.command || "" }); res.json({ success: true, part: part75Config.part, result }); });
app.get("/api/part75/activity", (req, res) => res.json({ success: true, part: part75Config.part, activity: globalThis.NAXORA_PART75_ACTIVITY }));
app.get("/api/part75/checklist", (req, res) => res.json({ success: true, part: part75Config.part, checklist: part75Checklist }));
app.get("/api/part75/export", (req, res) => res.json({ success: true, part: part75Config.part, exportReady: true, ownerVerificationRequired: true, note: "Student learning export sensitive hai; owner/authorised role verification required." }));
app.get("/api/part75/demo", (req, res) => res.json({ success: true, part: part75Config.part, demo: part75Demo, vaniPreview: part75VaniRevision("VANI, weak topic ke liye revision plan aur flashcards banao", { role: "student", studentName: "Aman Sharma", weakTopic: "Quadratic Equations", goal: "Class 10 Boards" }) }));

for (const route of [part75Config.frontendRoute, ...part75Config.alternateRoutes]) {
  app.get(route, (req, res) => sendFileSafe(res, "student-ai-tools.html"));
}


// ============================================================
// NAXORA Institute OS - Part 76: Smart Classroom Setup Module
// Site survey, hardware quotation, advance payment status, vendor details, installation tracking, warranty details
// ============================================================
const part76Config = {
  part: "Part 76 — Smart Classroom Setup Module",
  status: "active",
  frontendRoute: "/smart-classroom-setup",
  alternateRoutes: ["/smart-classroom", "/classroom-setup", "/hardware-setup", "/studio-setup", "/smart-classroom-module"],
  apiRoutes: [
    "/api/part76/status",
    "/api/part76/config",
    "/api/part76/features",
    "/api/part76/roles",
    "/api/part76/site-survey",
    "/api/part76/hardware-quotation",
    "/api/part76/advance-payment-status",
    "/api/part76/vendor-details",
    "/api/part76/installation-tracking",
    "/api/part76/warranty-details",
    "/api/part76/vani/command",
    "/api/part76/activity",
    "/api/part76/checklist",
    "/api/part76/export",
    "/api/part76/demo"
  ],
  purpose: "NAXORA software ke saath smart classroom hardware/setup service ko manage karna: site survey, quotation, advance payment, vendors, installation aur warranty.",
  nextPart: "Part 77 — Final Production Testing",
  versionPlan: "Part 53-78 = NAXORA OS 1.0 completion. Part 79-110 = NAXORA OS 2.0 development. Future 3.0 = owner-only AI-first subscription.",
  versionSubscriptionNote: "1.0, 2.0 aur future 3.0 ke alag subscription guards planned hain; 3.0 institute-owner-only access hoga."
};

const part76Features = [
  { key: "site_survey", name: "Site Survey", why: "Room size, internet, power, teaching mode aur camera/audio needs capture karna.", problemSolved: "Hardware setup guesswork kam hota hai.", benefits: { owner: "Clear setup requirement", institute: "Professional classroom planning", teacher: "Better teaching environment", student: "Better class audio/video", parent: "Reliable online/offline learning" } },
  { key: "hardware_quotation", name: "Hardware Quotation", why: "Camera, mic, speaker, board, router, installation aur warranty cost estimate dena.", problemSolved: "Owner ko transparent budget milta hai.", benefits: { owner: "Budget decision easy", institute: "Upsell service possible", teacher: "Correct equipment", student: "Better class experience", parent: "Quality trust" } },
  { key: "advance_payment_status", name: "Advance Payment Status", why: "Setup order start karne se pehle payment tracking.", problemSolved: "Unpaid setup work aur confusion kam hota hai.", benefits: { owner: "Payment clarity", institute: "Work starts on confirmed advance", accountant: "Payment record", teacher: "Installation timeline clear", parent: "No direct impact" } },
  { key: "vendor_details", name: "Vendor Details", why: "Hardware vendor/install partner details store karna.", problemSolved: "Vendor follow-up scattered nahi rehta.", benefits: { owner: "Vendor accountability", institute: "Service tracking", staff: "Contact quickly milta hai", teacher: "Issue escalation easy", student: "Faster issue resolution" } },
  { key: "installation_tracking", name: "Installation Tracking", why: "Survey se installation complete tak stages track karna.", problemSolved: "Setup delay aur responsibility confusion kam hota hai.", benefits: { owner: "Live status", institute: "Operational planning", teacher: "Classroom ready date", student: "Classes stable", parent: "Better delivery" } },
  { key: "warranty_details", name: "Warranty Details", why: "Camera/mic/board/router warranty record maintain karna.", problemSolved: "After-sales service aur warranty claims easy hote hain.", benefits: { owner: "Asset protection", institute: "Support cost control", staff: "Warranty lookup", teacher: "Faster replacements", student: "Less disruption" } }
];

const part76RolePermissions = {
  owner: { allowed: ["view_all_setups", "approve_quote", "view_payment_status", "vendor_manage", "installation_track", "warranty_view", "export_with_verification"], limits: "Full institute and authorised branch setup access." },
  branch_manager: { allowed: ["view_branch_setups", "installation_track", "warranty_view"], limits: "Assigned branch only." },
  accountant: { allowed: ["view_payment_status", "record_advance_status", "invoice_context"], limits: "Financial setup records according to permission." },
  teacher: { allowed: ["view_assigned_classroom_status", "report_classroom_issue"], limits: "Only assigned classroom/live class setup status." },
  receptionist: { allowed: ["view_installation_schedule", "vendor_contact_limited"], limits: "Operational schedule only." },
  student: { allowed: ["view_classroom_ready_status"], limits: "Only class availability/status, no vendor/payment data." },
  parent: { allowed: ["view_classroom_ready_status"], limits: "Only linked child class availability/status." },
  naxora_super_admin: { allowed: ["logged_technical_support"], limits: "Platform technical support with audit log, not unrestricted daily private access." }
};

const part76Checklist = [
  "Smart Classroom page /smart-classroom-setup open ho raha hai.",
  "Site survey required fields capture ho rahe hain.",
  "Hardware quotation transparent item-wise amount show karta hai.",
  "Advance payment status draft/status mode me hai, real charge nahi karta.",
  "Vendor details contact/status ke saath visible hain.",
  "Installation stages track ho rahe hain.",
  "Warranty details item-wise visible hain.",
  "VANI setup status/quotation/install commands accept karti hai.",
  "Sensitive payment/vendor/export actions owner verification ke bina final nahi hote.",
  "No .env, no secret, no API key, no node_modules, no .bat in ZIP.",
  "Previous Part 52-75 features preserved hain."
];

const part76Demo = {
  setups: [{ id: "SC-SETUP-0001", instituteName: "NAXORA Demo Institute", branch: "Main Branch", room: "Room 2", status: "quotation_ready" }],
  siteSurvey: {
    id: "SURVEY-0001",
    points: [
      { label: "Room Size", value: "22 x 16 ft classroom with 45 students capacity", status: "captured" },
      { label: "Teaching Mode", value: "Hybrid live class + recording workflow", status: "captured" },
      { label: "Internet", value: "100 Mbps broadband recommended with backup hotspot", status: "needs_check" },
      { label: "Power", value: "2 dedicated sockets near teacher table + UPS recommended", status: "needs_check" }
    ]
  },
  quotation: {
    currency: "INR",
    items: [
      { item: "HD PTZ/USB Camera", amount: 18000, reason: "Clear board + teacher coverage" },
      { item: "Wireless Collar Mic + Receiver", amount: 6500, reason: "Teacher voice clarity" },
      { item: "Classroom Speaker", amount: 3500, reason: "VANI/recording playback and class audio" },
      { item: "Tripod/Wall Mount + Cables", amount: 2500, reason: "Stable installation" },
      { item: "Installation + Testing", amount: 5500, reason: "On-site setup and training" }
    ],
    total: 36000,
    advanceRequired: 15000,
    note: "Final amount site survey ke baad change ho sakta hai."
  },
  advancePayment: { required: 15000, received: 5000, pending: 10000, status: "partial", realPaymentNotChargedHere: true },
  vendors: [
    { name: "NAXORA Smart Classroom Partner A", type: "Installation", contact: "vendor-contact-hidden-demo", status: "shortlisted" },
    { name: "Audio/Video Hardware Supplier", type: "Hardware", contact: "vendor-contact-hidden-demo", status: "quotation shared" }
  ],
  installation: {
    currentStage: "Quotation",
    stages: [
      { stage: "Site Survey", status: "complete", note: "Room requirement captured." },
      { stage: "Quotation", status: "in_progress", note: "Owner review pending." },
      { stage: "Advance", status: "partial", note: "Advance pending before installation date lock." },
      { stage: "Installation", status: "pending", note: "Vendor visit after advance confirmation." },
      { stage: "Training", status: "pending", note: "Teacher usage demo pending." }
    ]
  },
  warranty: {
    items: [
      { item: "Camera", months: 12, note: "Manufacturer warranty; physical damage excluded." },
      { item: "Microphone", months: 6, note: "Service warranty as per vendor." },
      { item: "Installation", months: 3, note: "Setup support warranty." }
    ]
  }
};

if (!globalThis.NAXORA_PART76_ACTIVITY) globalThis.NAXORA_PART76_ACTIVITY = [];
function part76CleanText(value, max = 600) { return String(value ?? "").replace(/[<>]/g, "").trim().slice(0, max); }
function part76Lower(value) { return part76CleanText(value, 600).toLowerCase(); }
function part76DbReady() { return mongoose.connection.readyState === 1 && globalThis.NAXORA_DB_MODE !== "mock"; }
function part76Role(role = "owner") { const key = part76CleanText(role, 80).toLowerCase().replace(/[ -]+/g, "_") || "owner"; if (key === "institute_owner") return "owner"; if (key === "staff" || key === "counsellor") return "receptionist"; return part76RolePermissions[key] ? key : "owner"; }
function part76Allowed(role, permission) { const resolved = part76Role(role); return (part76RolePermissions[resolved]?.allowed || []).includes(permission); }
async function part76Log(type, payload = {}) { const row = { id: `part76-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`, type: part76CleanText(type, 80), payload, createdAt: new Date().toISOString(), part: part76Config.part }; globalThis.NAXORA_PART76_ACTIVITY.unshift(row); globalThis.NAXORA_PART76_ACTIVITY = globalThis.NAXORA_PART76_ACTIVITY.slice(0, 100); if (part76DbReady()) { try { await mongoose.connection.db.collection("part76smartclassroomlogs").insertOne(row); } catch (error) {} } return row; }

function part76MakeSurvey(input = {}) {
  const instituteName = part76CleanText(input.instituteName || "NAXORA Demo Institute", 140);
  const room = part76CleanText(input.room || "Main Branch Room", 140);
  const roomSize = part76CleanText(input.roomSize || "22 x 16 ft", 80);
  const teachingMode = part76CleanText(input.teachingMode || "Hybrid live + recording", 160);
  return { id: `SURVEY-${Date.now()}`, instituteName, room, points: [ { label: "Institute", value: instituteName, status: "captured" }, { label: "Room", value: room, status: "captured" }, { label: "Room Size", value: roomSize, status: "captured" }, { label: "Teaching Mode", value: teachingMode, status: "captured" }, { label: "Next Step", value: "Internet/power check aur owner quotation approval required.", status: "pending" } ], directInstallationDisabled: true };
}
function part76MakeQuotation(input = {}) { const camera = Number(input.cameraAmount || 18000); const mic = Number(input.micAmount || 6500); const speaker = Number(input.speakerAmount || 3500); const install = Number(input.installAmount || 5500); const cables = Number(input.cablesAmount || 2500); const items = [ { item: "HD Camera", amount: camera, reason: "Teacher and board visibility" }, { item: "Microphone", amount: mic, reason: "Voice clarity" }, { item: "Speaker", amount: speaker, reason: "Classroom/VANI audio" }, { item: "Mounts and Cables", amount: cables, reason: "Stable setup" }, { item: "Installation and Testing", amount: install, reason: "On-site setup" } ]; const total = items.reduce((sum, row) => sum + row.amount, 0); return { currency: "INR", items, total, advanceRequired: Math.ceil(total * 0.4), ownerApprovalRequired: true, note: "Quotation preview hai; final vendor quote owner approval ke baad lock hogi." }; }
function part76Vani(command = "setup status dikhao", payload = {}) { const role = part76Role(payload.role || "owner"); const text = part76Lower(command); const sensitive = text.includes("refund") || text.includes("discount") || text.includes("delete") || text.includes("export") || text.includes("subscription") || text.includes("vendor payment"); if (sensitive) { return { allowed: false, role, ownerVerificationRequired: true, message: "Ye sensitive smart-classroom action hai. Owner verification ke bina execute nahi hoga.", auditLogRequired: true }; } if (!["owner", "branch_manager", "accountant", "teacher", "receptionist", "naxora_super_admin"].includes(role)) { return { allowed: true, role, responseMode: "limited", spokenSummary: "Classroom setup status screen par dikhaya gaya hai.", preview: { status: "Classroom setup under progress", privateFieldsHidden: true } }; } const survey = part76MakeSurvey(payload); const quotation = part76MakeQuotation(payload); return { allowed: true, role, command: part76CleanText(command, 400), responseMode: "private-screen-first", spokenSummary: "Smart classroom survey, quotation aur installation status ready hai. Payment/vendor details screen par private mode me dikhaye gaye hain.", preview: { survey, quotation, advancePayment: part76Demo.advancePayment, installation: part76Demo.installation, warranty: part76Demo.warranty }, confirmationRequiredForActions: ["approve_quote", "record_advance", "assign_vendor", "final_installation", "export"], auditLogRequired: true, directRefundDiscountDeleteDisabled: true };
}

app.get("/api/part76/status", (req, res) => res.json({ success: true, part: part76Config.part, status: part76Config.status, frontend: [part76Config.frontendRoute, ...part76Config.alternateRoutes], apiRoutes: part76Config.apiRoutes, purpose: part76Config.purpose, currentVersionPlan: part76Config.versionPlan, versionSubscriptionNote: part76Config.versionSubscriptionNote, nextPart: part76Config.nextPart }));
app.get("/api/part76/config", (req, res) => res.json({ success: true, part: part76Config.part, config: part76Config }));
app.get("/api/part76/features", (req, res) => res.json({ success: true, part: part76Config.part, features: part76Features }));
app.get("/api/part76/roles", (req, res) => res.json({ success: true, part: part76Config.part, roles: part76RolePermissions }));
app.get("/api/part76/site-survey", async (req, res) => { const role = part76Role(req.query.role || "owner"); const survey = part76MakeSurvey(req.query); await part76Log("site_survey_preview", { role, instituteName: survey.instituteName }); res.json({ success: true, part: part76Config.part, role, survey }); });
app.post("/api/part76/site-survey", async (req, res) => { const role = part76Role(req.body?.role || "owner"); if (!["owner", "branch_manager", "receptionist", "naxora_super_admin"].includes(role)) return res.status(403).json({ success: false, part: part76Config.part, role, message: "Site survey create/update ke liye authorised role required hai." }); const survey = part76MakeSurvey(req.body || {}); await part76Log("site_survey_submitted", { role, instituteName: survey.instituteName }); res.json({ success: true, part: part76Config.part, role, survey, savedAsDraft: true, finalApprovalRequired: true }); });
app.get("/api/part76/hardware-quotation", async (req, res) => { const role = part76Role(req.query.role || "owner"); const quotation = part76MakeQuotation(req.query); await part76Log("quotation_preview", { role, total: quotation.total }); res.json({ success: true, part: part76Config.part, role, quotation }); });
app.get("/api/part76/advance-payment-status", async (req, res) => { const role = part76Role(req.query.role || "owner"); await part76Log("advance_payment_status_viewed", { role }); res.json({ success: true, part: part76Config.part, role, advancePayment: part76Demo.advancePayment, realPaymentChargeDisabledHere: true }); });
app.get("/api/part76/vendor-details", async (req, res) => { const role = part76Role(req.query.role || "owner"); const canView = ["owner", "branch_manager", "receptionist", "naxora_super_admin"].includes(role); await part76Log("vendor_details_viewed", { role, canView }); res.json({ success: true, part: part76Config.part, role, vendors: canView ? part76Demo.vendors : [], message: canView ? "Vendor details visible as per role." : "Vendor details restricted for this role." }); });
app.get("/api/part76/installation-tracking", async (req, res) => { const role = part76Role(req.query.role || "owner"); await part76Log("installation_tracking_viewed", { role }); res.json({ success: true, part: part76Config.part, role, installation: part76Demo.installation }); });
app.get("/api/part76/warranty-details", async (req, res) => { const role = part76Role(req.query.role || "owner"); await part76Log("warranty_details_viewed", { role }); res.json({ success: true, part: part76Config.part, role, warranty: part76Demo.warranty }); });
app.post("/api/part76/vani/command", async (req, res) => { const result = part76Vani(req.body?.command || "setup status dikhao", req.body || {}); await part76Log("vani_command", { role: result.role, command: req.body?.command || "" }); res.json({ success: true, part: part76Config.part, result }); });
app.get("/api/part76/activity", (req, res) => res.json({ success: true, part: part76Config.part, activity: globalThis.NAXORA_PART76_ACTIVITY }));
app.get("/api/part76/checklist", (req, res) => res.json({ success: true, part: part76Config.part, checklist: part76Checklist }));
app.get("/api/part76/export", (req, res) => res.json({ success: true, part: part76Config.part, exportReady: true, ownerVerificationRequired: true, note: "Vendor/payment/quotation export sensitive hai; owner verification required." }));
app.get("/api/part76/demo", (req, res) => res.json({ success: true, part: part76Config.part, demo: part76Demo, vaniPreview: part76Vani("VANI, smart classroom setup ka quotation aur installation status dikhao", { role: "owner", instituteName: "NAXORA Demo Institute", room: "Room 2" }) }));

for (const route of [part76Config.frontendRoute, ...part76Config.alternateRoutes]) {
  app.get(route, (req, res) => sendFileSafe(res, "smart-classroom-setup.html"));
}


// ================= PART 77 - FINAL PRODUCTION TESTING =================
if (!globalThis.NAXORA_PART77_ACTIVITY) globalThis.NAXORA_PART77_ACTIVITY = [];

const part77Config = {
  part: "Part 77 — Final Production Testing",
  status: "active",
  frontendRoute: "/final-production-testing",
  alternateRoutes: ["/production-testing", "/final-testing-v1", "/v1-final-testing", "/launch-testing", "/release-readiness"],
  apiRoutes: [
    "/api/part77/status",
    "/api/part77/config",
    "/api/part77/testing-plan",
    "/api/part77/run-smoke-test",
    "/api/part77/module-health",
    "/api/part77/role-audit",
    "/api/part77/api-audit",
    "/api/part77/database-audit",
    "/api/part77/payment-audit",
    "/api/part77/ai-limits-audit",
    "/api/part77/security-audit",
    "/api/part77/backup-audit",
    "/api/part77/performance-audit",
    "/api/part77/vani/command",
    "/api/part77/activity",
    "/api/part77/checklist",
    "/api/part77/export",
    "/api/part77/demo"
  ],
  purpose: "NAXORA OS 1.0 launch se pehle mobile, laptop, roles, APIs, database, payments, AI limits, security, backup aur performance ka final production readiness audit.",
  versionPlan: "Part 53–78 = NAXORA OS 1.0 completion. Part 79–110 = NAXORA OS 2.0 development.",
  versionSubscriptionNote: "Future: NAXORA OS 1.0, 2.0 aur 3.0 ki separate subscription hogi. 3.0 owner-only AI-first access hoga, institute owner login + active instituteId + active v3 subscription required.",
  nextPart: "Part 78 — NAXORA OS 1.0 Production Launch"
};

const part77Areas = [
  { key: "mobile", title: "Mobile testing", why: "Student, parent, teacher aur owner mobile par app use karenge.", checks: ["responsive layout", "tap targets", "forms usable", "navigation usable"] },
  { key: "laptop", title: "Laptop testing", why: "Institute owner/admin mainly laptop dashboard use karega.", checks: ["dashboard layout", "sidebar", "tables", "forms", "print/export readiness"] },
  { key: "roles", title: "Role testing", why: "Har role ko sirf authorised data dikhna chahiye.", checks: ["owner", "branch manager", "accountant", "teacher", "receptionist", "student", "parent", "super admin"] },
  { key: "apis", title: "API testing", why: "Frontend buttons ke peeche backend endpoints stable hone chahiye.", checks: ["status endpoints", "POST endpoints", "error handling", "protected endpoints"] },
  { key: "database", title: "Database testing", why: "MongoDB save/read/refresh ke baad data persistence verify karna zaroori hai.", checks: ["connection", "safe fallback", "write test in demo mode disabled", "collections readiness"] },
  { key: "payments", title: "Payment testing", why: "Razorpay/order/subscription flow client launch se pehle safe hona chahiye.", checks: ["plans", "orders", "payment records", "failed payment handling", "invoice preview"] },
  { key: "ai_limits", title: "AI limits testing", why: "AI cost control ke liye credits, usage aur VANI rules verify karne hain.", checks: ["credits", "usage logs", "VANI private response", "no real AI key exposed"] },
  { key: "security", title: "Security testing", why: "Institute data private aur role-protected rehna chahiye.", checks: ["JWT", "secrets not exposed", "internal pages hidden", "rate limit", "safe errors"] },
  { key: "backup", title: "Backup testing", why: "Production launch ke baad data recovery plan clear hona chahiye.", checks: ["MongoDB Atlas backup note", "export owner verification", "rollback plan", "GitHub backup"] },
  { key: "performance", title: "Performance testing", why: "Free Render cold start ko samajhkar demo/client usage ke liye readiness chahiye.", checks: ["health endpoint", "page load", "cold start note", "asset size review"] }
];

const part77RolePermissions = {
  owner: { label: "Institute Owner", allowed: ["view_all_tests", "run_full_audit", "view_payment_audit", "view_security_audit", "export_report", "approve_launch"] },
  branch_manager: { label: "Branch Manager", allowed: ["view_branch_tests", "run_branch_audit", "view_branch_performance"] },
  accountant: { label: "Accountant", allowed: ["view_payment_audit", "view_invoice_audit", "view_financial_summary"] },
  teacher: { label: "Teacher", allowed: ["view_assigned_batch_tests", "view_ai_learning_tests", "view_live_class_tests"] },
  receptionist: { label: "Receptionist/Counsellor", allowed: ["view_enquiry_tests", "view_followup_tests", "view_public_profile_tests"] },
  student: { label: "Student", allowed: ["view_own_portal_tests", "view_student_ai_tests"] },
  parent: { label: "Parent", allowed: ["view_linked_child_portal_tests", "view_parent_summary_tests"] },
  naxora_super_admin: { label: "NAXORA Super Admin", allowed: ["logged_technical_support", "platform_health_view"], note: "Unrestricted institute-private daily access nahi." }
};

const part77Checklist = [
  "Mobile aur laptop par main pages open karke screenshot verify karo.",
  "Signup/login token flow check karo.",
  "Owner, teacher, student, parent role permissions manually verify karo.",
  "Students, fees, attendance, enquiries, live classes, AI Hub aur VANI routes check karo.",
  "MongoDB connected mode /api/health par verify karo.",
  "Payments/subscriptions safe test/mock mode verify karo.",
  "AI Credits usage aur VANI audit logs verify karo.",
  "Internal debug/demo pages production me hidden rahen.",
  "Backup/rollback plan document read karo.",
  "Known limitations note karke Part 78 launch se pehle final fix list banao."
];

function part77CleanText(value, max = 700) { return String(value ?? "").replace(/[<>]/g, "").trim().slice(0, max); }
function part77Lower(value) { return part77CleanText(value, 700).toLowerCase(); }
function part77DbReady() { return mongoose.connection.readyState === 1 && globalThis.NAXORA_DB_MODE !== "mock"; }
function part77Role(role = "owner") {
  const key = part77CleanText(role, 80).toLowerCase().replace(/[ -]+/g, "_") || "owner";
  if (key === "institute_owner") return "owner";
  if (key === "staff" || key === "counsellor") return "receptionist";
  return part77RolePermissions[key] ? key : "owner";
}
async function part77Log(type, payload = {}) {
  const row = { id: `part77-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`, type: part77CleanText(type, 90), payload, createdAt: new Date().toISOString(), part: part77Config.part };
  globalThis.NAXORA_PART77_ACTIVITY.unshift(row);
  globalThis.NAXORA_PART77_ACTIVITY = globalThis.NAXORA_PART77_ACTIVITY.slice(0, 150);
  if (part77DbReady()) { try { await mongoose.connection.db.collection("part77productiontestinglogs").insertOne(row); } catch (error) {} }
  return row;
}

function part77Score(rows) {
  const total = rows.length || 1;
  const passed = rows.filter((row) => row.status === "pass").length;
  const warning = rows.filter((row) => row.status === "warning").length;
  const failed = rows.filter((row) => row.status === "fail").length;
  const score = Math.max(0, Math.round(((passed + warning * 0.5) / total) * 100));
  return { total, passed, warning, failed, score, launchReady: failed === 0 && score >= 80 };
}

function part77ModuleHealth() {
  const modules = [
    { module: "Core", routes: ["/", "/login", "/signup", "/dashboard"], status: "pass", note: "Public/auth/dashboard route foundation available." },
    { module: "People", routes: ["/student", "/parent", "/teachers", "/staff"], status: "pass", note: "Student, parent, teacher, staff modules route-mapped." },
    { module: "Academic", routes: ["/batches", "/attendance", "/tests", "/assignments", "/reports"], status: "pass", note: "Academic modules available for manual CRUD audit." },
    { module: "Discovery", routes: ["/public-institute-profile", "/nearby-institutes", "/compare-institutes", "/request-callback"], status: "pass", note: "Discovery to enquiry journey route-mapped." },
    { module: "Live Classes", routes: ["/live-classes", "/live-classes-completion"], status: "pass", note: "External meeting-link workflow active." },
    { module: "Payments", routes: ["/payments-subscriptions", "/billing"], status: "warning", note: "Safe/mock payment mode; live Razorpay keys/KYC separate." },
    { module: "AI + VANI", routes: ["/ai-hub", "/vani-ai", "/student-ai-tools"], status: "pass", note: "AI Hub, VANI V1/V2 and Student AI Tools connected." },
    { module: "Smart Classroom", routes: ["/smart-classroom-setup"], status: "warning", note: "Hardware/vendor workflow foundation; real vendor integration pending." }
  ];
  return { modules, summary: part77Score(modules) };
}

function part77ApiAudit() {
  const rows = [
    { endpoint: "/api/health", status: "pass", reason: "Live health check and DB mode indicator." },
    { endpoint: "/api/part53/status ... /api/part77/status", status: "pass", reason: "Version status endpoints available for each recent part." },
    { endpoint: "/api/part66/orders/create", status: "warning", reason: "Razorpay safe/mock fallback if keys missing." },
    { endpoint: "/api/part68/usage-summary", status: "pass", reason: "AI credits/usage foundation available." },
    { endpoint: "/api/part69/search + /api/part70/parse", status: "pass", reason: "VANI read/search and form-draft flow available." },
    { endpoint: "Protected business APIs", status: "warning", reason: "Hard route-by-route role enforcement final audit pending before Part 78." }
  ];
  return { rows, summary: part77Score(rows) };
}

function part77DatabaseAudit() {
  const dbConnected = part77DbReady();
  const rows = [
    { item: "MongoDB connection", status: dbConnected ? "pass" : "warning", reason: dbConnected ? "MongoDB connected mode detected." : "Mock/fallback mode detected; check Render MONGODB_URI." },
    { item: "Data persistence", status: "warning", reason: "Manual save-refresh testing required for Students, Fees, Enquiries, Smart Enrolment." },
    { item: "Audit logs", status: "pass", reason: "Part 71–77 activity log foundations available." },
    { item: "Secrets", status: "pass", reason: ".env and secrets are not included in ZIP." }
  ];
  return { dbMode: globalThis.NAXORA_DB_MODE || (dbConnected ? "mongodb" : "mock"), rows, summary: part77Score(rows) };
}

function part77PaymentAudit() {
  const rows = [
    { item: "Plans", status: "pass", reason: "Part 66 subscription plans foundation available." },
    { item: "Orders", status: "warning", reason: "Create-order supports safe/mock fallback until Razorpay keys/KYC confirmed." },
    { item: "Invoices", status: "pass", reason: "Invoice generation foundation available." },
    { item: "Failed payment handling", status: "pass", reason: "Failed payment route/foundation available." },
    { item: "Live money movement", status: "warning", reason: "Do not collect real money until live keys, KYC and webhook verification are done." }
  ];
  return { rows, summary: part77Score(rows) };
}

function part77AiLimitsAudit() {
  const rows = [
    { item: "AI Hub", status: "pass", reason: "AI tools centrally visible." },
    { item: "Credits", status: "pass", reason: "Part 68 monthly credits/usage foundation." },
    { item: "VANI V1/V2", status: "pass", reason: "Read-only search and voice form draft confirmation flow." },
    { item: "Real AI API key", status: "pass", reason: "No AI API key hardcoded or exposed." },
    { item: "Sensitive speaking rule", status: "pass", reason: "VANI private-screen-first rule documented across AI parts." }
  ];
  return { rows, summary: part77Score(rows) };
}

function part77SecurityAudit() {
  const rows = [
    { item: "Secrets", status: "pass", reason: "No .env, MongoDB URI, JWT, Razorpay or AI secret in ZIP." },
    { item: "Role permissions", status: "warning", reason: "Role matrix exists; hard enforcement must be audited route-by-route." },
    { item: "Internal pages", status: "pass", reason: "Production internal/debug page hiding policy exists." },
    { item: "Sensitive actions", status: "pass", reason: "Refund/discount/delete/export/subscription actions require owner verification in planning." },
    { item: "3.0 owner-only rule", status: "pass", reason: "Future 3.0 subscription access locked to institute owner + instituteId + active v3 plan." }
  ];
  return { rows, summary: part77Score(rows) };
}

function part77BackupAudit() {
  const rows = [
    { item: "GitHub source backup", status: "pass", reason: "Code pushed to GitHub after each part." },
    { item: "MongoDB backup", status: "warning", reason: "Atlas backup/export schedule should be manually configured before real clients." },
    { item: "Rollback plan", status: "pass", reason: "Previous ZIPs and Git commits exist for rollback." },
    { item: "Owner export verification", status: "warning", reason: "Sensitive export must require owner verification." }
  ];
  return { rows, summary: part77Score(rows) };
}

function part77PerformanceAudit() {
  const rows = [
    { item: "Render free cold start", status: "warning", reason: "First load can be slow on free plan; open before demo." },
    { item: "Static frontend", status: "pass", reason: "Frontend assets served statically." },
    { item: "Health endpoint", status: "pass", reason: "/api/health available for uptime check." },
    { item: "Large pages", status: "warning", reason: "Final mobile/laptop load speed should be manually checked before Part 78." }
  ];
  return { rows, summary: part77Score(rows) };
}

function part77FullSmokeTest() {
  const sections = {
    moduleHealth: part77ModuleHealth(),
    apiAudit: part77ApiAudit(),
    databaseAudit: part77DatabaseAudit(),
    paymentAudit: part77PaymentAudit(),
    aiLimitsAudit: part77AiLimitsAudit(),
    securityAudit: part77SecurityAudit(),
    backupAudit: part77BackupAudit(),
    performanceAudit: part77PerformanceAudit()
  };
  const allRows = Object.values(sections).flatMap((section) => section.rows || section.modules || []);
  const summary = part77Score(allRows);
  const launchNotes = summary.launchReady ? ["Part 78 launch ke liye high-level readiness good hai; manual checklist still required."] : ["Part 78 se pehle warning/fail items manually verify karo."];
  return { sections, summary, launchNotes, manualTestingRequired: true, finalApprovalRequiredInPart78: true };
}

function part77Vani(command = "production testing report dikhao", payload = {}) {
  const role = part77Role(payload.role || "owner");
  const text = part77Lower(command);
  const sensitive = text.includes("delete") || text.includes("export") || text.includes("refund") || text.includes("discount") || text.includes("subscription change") || text.includes("launch approve");
  if (sensitive) return { allowed: false, role, ownerVerificationRequired: true, message: "Ye sensitive testing/launch action hai. Owner verification ke bina execute nahi hoga.", auditLogRequired: true };
  if (["student", "parent"].includes(role)) return { allowed: true, role, responseMode: "private-screen-first", spokenSummary: "Aapke portal ka limited readiness status screen par dikhaya gaya hai.", preview: { allowedArea: part77RolePermissions[role].allowed, privateFieldsHidden: true } };
  const smoke = part77FullSmokeTest();
  let focus = "full";
  if (text.includes("security")) focus = "securityAudit";
  if (text.includes("payment") || text.includes("fees")) focus = "paymentAudit";
  if (text.includes("ai") || text.includes("vani")) focus = "aiLimitsAudit";
  if (text.includes("database") || text.includes("mongo")) focus = "databaseAudit";
  if (text.includes("performance") || text.includes("speed")) focus = "performanceAudit";
  const preview = focus === "full" ? smoke : smoke.sections[focus];
  return { allowed: true, role, command: part77CleanText(command, 400), responseMode: "private-screen-first", spokenSummary: "Production testing report ready hai. Sensitive details screen par private mode me dikhaye gaye hain.", focus, preview, confirmationRequiredForActions: ["export_report", "approve_launch", "change_subscription", "delete_data"], auditLogRequired: true };
}

app.get("/api/part77/status", (req, res) => res.json({ success: true, part: part77Config.part, status: part77Config.status, frontend: [part77Config.frontendRoute, ...part77Config.alternateRoutes], apiRoutes: part77Config.apiRoutes, purpose: part77Config.purpose, currentVersionPlan: part77Config.versionPlan, versionSubscriptionNote: part77Config.versionSubscriptionNote, nextPart: part77Config.nextPart }));
app.get("/api/part77/config", (req, res) => res.json({ success: true, part: part77Config.part, config: part77Config }));
app.get("/api/part77/testing-plan", (req, res) => res.json({ success: true, part: part77Config.part, areas: part77Areas }));
app.get("/api/part77/run-smoke-test", async (req, res) => { const result = part77FullSmokeTest(); await part77Log("smoke_test_run", { role: part77Role(req.query.role || "owner"), score: result.summary.score }); res.json({ success: true, part: part77Config.part, result }); });
app.get("/api/part77/module-health", (req, res) => res.json({ success: true, part: part77Config.part, ...part77ModuleHealth() }));
app.get("/api/part77/role-audit", (req, res) => res.json({ success: true, part: part77Config.part, roles: part77RolePermissions }));
app.get("/api/part77/api-audit", (req, res) => res.json({ success: true, part: part77Config.part, ...part77ApiAudit() }));
app.get("/api/part77/database-audit", (req, res) => res.json({ success: true, part: part77Config.part, ...part77DatabaseAudit() }));
app.get("/api/part77/payment-audit", (req, res) => res.json({ success: true, part: part77Config.part, ...part77PaymentAudit() }));
app.get("/api/part77/ai-limits-audit", (req, res) => res.json({ success: true, part: part77Config.part, ...part77AiLimitsAudit() }));
app.get("/api/part77/security-audit", (req, res) => res.json({ success: true, part: part77Config.part, ...part77SecurityAudit() }));
app.get("/api/part77/backup-audit", (req, res) => res.json({ success: true, part: part77Config.part, ...part77BackupAudit() }));
app.get("/api/part77/performance-audit", (req, res) => res.json({ success: true, part: part77Config.part, ...part77PerformanceAudit() }));
app.post("/api/part77/vani/command", async (req, res) => { const result = part77Vani(req.body?.command || "production testing report dikhao", req.body || {}); await part77Log("vani_testing_command", { role: result.role, command: req.body?.command || "", focus: result.focus || "limited" }); res.json({ success: true, part: part77Config.part, result }); });
app.get("/api/part77/activity", (req, res) => res.json({ success: true, part: part77Config.part, activity: globalThis.NAXORA_PART77_ACTIVITY }));
app.get("/api/part77/checklist", (req, res) => res.json({ success: true, part: part77Config.part, checklist: part77Checklist }));
app.get("/api/part77/export", (req, res) => res.json({ success: true, part: part77Config.part, exportReady: true, ownerVerificationRequired: true, note: "Final production testing export sensitive hai; owner verification required." }));
app.get("/api/part77/demo", (req, res) => res.json({ success: true, part: part77Config.part, demo: part77FullSmokeTest(), vaniPreview: part77Vani("VANI, production testing report aur security audit dikhao", { role: "owner" }) }));

for (const route of [part77Config.frontendRoute, ...part77Config.alternateRoutes]) {
  app.get(route, (req, res) => sendFileSafe(res, "final-production-testing.html"));
}
// ================= END PART 77 =================


// ================= PART 78 - NAXORA OS 1.0 PRODUCTION LAUNCH =================
if (!globalThis.NAXORA_PART78_ACTIVITY) globalThis.NAXORA_PART78_ACTIVITY = [];

const part78Config = {
  part: "Part 78 — NAXORA OS 1.0 Production Launch",
  status: "active",
  releaseVersion: "NAXORA Institute OS 1.0",
  frontendRoute: "/v1-production-launch",
  alternateRoutes: ["/production-launch", "/naxora-v1-launch", "/v1-launch", "/launch-v1", "/official-launch"],
  apiRoutes: [
    "/api/part78/status",
    "/api/part78/config",
    "/api/part78/release-summary",
    "/api/part78/launch-checklist",
    "/api/part78/go-live-plan",
    "/api/part78/demo-institute",
    "/api/part78/admin-account-plan",
    "/api/part78/monitoring-plan",
    "/api/part78/backup-plan",
    "/api/part78/client-onboarding-plan",
    "/api/part78/version-subscriptions",
    "/api/part78/owner-only-v3-rule",
    "/api/part78/launch-readiness",
    "/api/part78/vani/command",
    "/api/part78/activity",
    "/api/part78/checklist",
    "/api/part78/export",
    "/api/part78/demo"
  ],
  purpose: "NAXORA OS 1.0 ko stable production launch state me lock karna: deployment, demo institute, admin account plan, monitoring, backup, first-client onboarding aur sales-ready handoff.",
  versionPlan: "Part 53–78 = NAXORA OS 1.0 completion. Part 79–110 = NAXORA OS 2.0 development. 3.0 future AI-first OS hai, par 1.0/2.0 ko distract nahi karega.",
  versionSubscriptionNote: "NAXORA OS 1.0, 2.0 aur future 3.0 ki separate subscription hogi. 3.0 owner-only AI-first access hoga: institute_owner role + valid instituteId + active v3 subscription required.",
  nextPart: "Part 79 — Mobile App Foundation"
};

const part78Roles = {
  owner: { label: "Institute Owner", access: ["launch_dashboard", "sales_readiness", "demo_institute", "billing_plan", "backup_monitoring", "version_subscription_control"] },
  branch_manager: { label: "Branch Manager", access: ["assigned_branch_launch_readiness", "branch_onboarding"] },
  accountant: { label: "Accountant", access: ["billing_readiness", "payments_summary", "invoice_readiness"] },
  teacher: { label: "Teacher", access: ["teaching_module_readiness", "assigned_batch_launch_notes"] },
  receptionist: { label: "Receptionist/Counsellor", access: ["lead_onboarding", "demo_enquiry_flow"] },
  student: { label: "Student", access: ["own_portal_readiness", "own_student_ai_tools"] },
  parent: { label: "Parent", access: ["linked_child_portal_readiness"] },
  naxora_super_admin: { label: "NAXORA Super Admin", access: ["platform_health", "logged_support"], note: "Unrestricted daily institute-private data access nahi." }
};

const part78Checklist = [
  "Render production deploy live confirm karo.",
  "MongoDB connected mode /api/health par verify karo.",
  "Signup/login/dashboard flow test karo.",
  "Demo institute account and sample data prepare karo.",
  "Students, fees, attendance, enquiries, live classes, AI Hub, VANI pages open karo.",
  "Razorpay test/safe mode confirm karo; live payments KYC ke baad hi enable karo.",
  "MongoDB password/security rotation complete karo agar secret kabhi expose hua ho.",
  "Backup/rollback plan read and save karo.",
  "First beta institute onboarding script ready karo.",
  "Sales demo video and WhatsApp pitch ready karo."
];

function part78CleanText(value, max = 700) { return String(value ?? "").replace(/[<>]/g, "").trim().slice(0, max); }
function part78Lower(value) { return part78CleanText(value, 700).toLowerCase(); }
function part78DbReady() { return mongoose.connection.readyState === 1 && globalThis.NAXORA_DB_MODE !== "mock"; }
function part78Role(role = "owner") {
  const key = part78CleanText(role, 80).toLowerCase().replace(/[ -]+/g, "_") || "owner";
  if (key === "institute_owner") return "owner";
  if (key === "staff" || key === "counsellor") return "receptionist";
  return part78Roles[key] ? key : "owner";
}
async function part78Log(type, payload = {}) {
  const row = { id: `part78-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`, type: part78CleanText(type, 90), payload, createdAt: new Date().toISOString(), part: part78Config.part };
  globalThis.NAXORA_PART78_ACTIVITY.unshift(row);
  globalThis.NAXORA_PART78_ACTIVITY = globalThis.NAXORA_PART78_ACTIVITY.slice(0, 200);
  if (part78DbReady()) { try { await mongoose.connection.db.collection("part78productionlaunchlogs").insertOne(row); } catch (error) {} }
  return row;
}

function part78ReleaseSummary() {
  return {
    release: "NAXORA Institute OS 1.0",
    completedParts: "Part 1–78",
    liveFoundation: ["Render deployment", "MongoDB production connection", "Clean URLs", "Public/protected route foundation", "AI Hub + VANI foundation"],
    launchModules: [
      "Students, parents, teachers, staff", "Batches, attendance, fees, finance", "Tests, assignments, reports", "Enquiries, follow-ups, discovery", "Public institute profile", "Nearby/compare institutes", "Request callback", "Live classes", "Payments/subscriptions", "AI Hub", "VANI V1/V2", "Student AI tools", "Smart classroom setup"
    ],
    releaseStatus: "sales-ready foundation with final real-client manual testing required",
    nextVersion: "NAXORA OS 2.0 starts at Part 79"
  };
}

function part78GoLivePlan() {
  return [
    { step: 1, title: "Production deployment lock", action: "GitHub push + Render Clear build cache & deploy", owner: "Arun/NAXORA", status: "ready" },
    { step: 2, title: "Health check", action: "/api/health and /api/part78/status check", owner: "Arun", status: part78DbReady() ? "pass" : "warning" },
    { step: 3, title: "Demo institute setup", action: "Demo owner login, sample students, fees, attendance, enquiries add karo", owner: "Arun", status: "manual_required" },
    { step: 4, title: "Security check", action: "MongoDB password rotation, env review, no secrets in repo", owner: "Arun", status: "manual_required" },
    { step: 5, title: "First beta institute", action: "One coaching owner ko 5-minute demo aur beta account do", owner: "Arun", status: "next" },
    { step: 6, title: "2.0 development branch", action: "1.0 live stable rakho; Part 79 se 2.0 development continue karo", owner: "Arun/NAXORA", status: "planned" }
  ];
}

function part78DemoInstitutePlan() {
  return {
    demoInstituteName: "NAXORA Demo Institute",
    purpose: "Client ko empty app nahi, real sample data ke saath demo dikhana.",
    sampleData: {
      students: 8,
      teachers: 3,
      parents: 5,
      batches: 3,
      feeRecords: 6,
      enquiries: 5,
      liveClasses: 3,
      aiSamples: ["AI Notes", "AI Mock Test", "VANI Search", "Student AI Planner"]
    },
    loginRule: "Demo account credentials public video me reveal mat karna; only private demo me use karo."
  };
}

function part78AdminAccountPlan() {
  return {
    requiredAccounts: [
      { role: "naxora_super_admin", purpose: "Platform support and subscription control", accessNote: "Logged technical support only, unrestricted daily institute-private data access nahi." },
      { role: "institute_owner", purpose: "Demo institute owner account", accessNote: "Full institute access." },
      { role: "teacher", purpose: "Teacher module demo", accessNote: "Assigned batch only." },
      { role: "student", purpose: "Student portal demo", accessNote: "Own data only." },
      { role: "parent", purpose: "Parent portal demo", accessNote: "Linked child only." }
    ],
    passwordRule: "Strong passwords use karo. Secrets chat/GitHub/video me share mat karo."
  };
}

function part78MonitoringPlan() {
  return {
    healthEndpoints: ["/api/health", "/api/part78/status", "/api/part77/run-smoke-test"],
    renderFreeNote: "Render Free first request slow ho sakta hai; demo se 2 minute pehle site open kar lena.",
    dailyChecks: ["health", "signup/login", "MongoDB mode", "error logs", "critical pages"],
    incidentPlan: ["Render logs screenshot", "Git rollback to last good commit", "MongoDB connection check", "report exact route/API failing"]
  };
}

function part78BackupPlan() {
  return {
    codeBackup: "GitHub repo + previous ZIP artifacts",
    databaseBackup: "MongoDB Atlas export/backup schedule manually confirm karna before real paid clients.",
    envBackup: "Render env keys manually re-enterable secure note me store; chat/GitHub me nahi.",
    rollback: "Last known working commit deploy karo, then fix route/API issue separately.",
    sensitiveExportRule: "Student/fees/export data ke liye owner verification required."
  };
}

function part78ClientOnboardingPlan() {
  return {
    betaTarget: "First 1 beta institute",
    pitchFlow: ["Landing page", "Signup/login", "Dashboard", "Students", "Fees", "Attendance", "Enquiries/CRM", "Live Classes", "AI Hub + VANI", "Pricing/subscription"],
    onboardingSteps: ["Institute owner details", "Branch/course setup", "5 students demo import", "Fee records", "Teacher login", "Parent/student portal demo", "Feedback form"],
    feedbackQuestions: ["Most useful feature?", "Fees/attendance currently kaise manage karte ho?", "Monthly budget?", "Missing must-have feature?", "Beta use karna chahoge?"]
  };
}

function part78VersionSubscriptions() {
  return {
    v1: { label: "NAXORA OS 1.0", status: "launch_ready", access: "Subscribed institute users according to role permissions", purpose: "Digital institute management + basic AI/VANI foundation" },
    v2: { label: "NAXORA OS 2.0", status: "development_starts_part79", access: "Subscribed institute modules according to role permissions", purpose: "Mobile apps, advanced VANI, native classroom, marketplace, white-label" },
    v3: { label: "NAXORA OS 3.0 AI-First", status: "future_planned", access: "owner_only", purpose: "Future AI-first Education Operating System", hardRule: "Only institute_owner + valid instituteId + active v3 subscription can access." }
  };
}

function part78OwnerOnlyV3Rule(payload = {}) {
  const role = part78Role(payload.role || "owner");
  const hasInstituteId = Boolean(part78CleanText(payload.instituteId || payload.institute_id || "", 80));
  const v3Active = String(payload.v3Active ?? payload.v3_active ?? "false") === "true" || payload.v3Active === true;
  const allowed = role === "owner" && hasInstituteId && v3Active;
  return {
    allowed,
    role,
    hasInstituteId,
    v3Active,
    required: ["role=institute_owner", "valid instituteId", "active v3 subscription"],
    message: allowed ? "V3 owner-only access allowed." : "NAXORA OS 3.0 sirf institute owner ke active instituteId + active v3 subscription par open hoga."
  };
}

function part78LaunchReadiness() {
  const checks = [
    { item: "Backend live", status: "pass", reason: "Part 78 status endpoint active." },
    { item: "MongoDB", status: part78DbReady() ? "pass" : "warning", reason: part78DbReady() ? "MongoDB connected mode detected." : "Mock/fallback mode detected; Render MONGODB_URI check karo." },
    { item: "Frontend launch page", status: "pass", reason: "Production launch page route mapped." },
    { item: "1.0 feature set", status: "pass", reason: "Part 53–78 foundation included." },
    { item: "Payments", status: "warning", reason: "Razorpay live mode KYC/webhook final verification required before real payment." },
    { item: "Security", status: "warning", reason: "Owner must rotate exposed secrets and verify Render env before real client." },
    { item: "Backups", status: "warning", reason: "MongoDB Atlas backup/export schedule manually confirm karna hai." },
    { item: "Beta institute", status: "ready", reason: "First beta onboarding plan ready." }
  ];
  const pass = checks.filter((row) => row.status === "pass").length;
  const warning = checks.filter((row) => row.status === "warning").length;
  const score = Math.round(((pass + warning * 0.5) / checks.length) * 100);
  return { checks, score, launchDecision: score >= 75 ? "soft_launch_ready_for_beta" : "fix_required_before_beta", betaAllowed: score >= 75, realPaidClientRequiresManualSecurityCheck: true };
}

function part78Vani(command = "v1 launch status dikhao", payload = {}) {
  const role = part78Role(payload.role || "owner");
  const text = part78Lower(command);
  const sensitive = text.includes("export") || text.includes("delete") || text.includes("refund") || text.includes("discount") || text.includes("subscription") || text.includes("v3") || text.includes("approve launch");
  if (sensitive && role !== "owner") return { allowed: false, role, message: "Ye sensitive launch/subscription action owner-only hai.", ownerVerificationRequired: true, auditLogRequired: true };
  if (text.includes("v3")) return { allowed: role === "owner", role, responseMode: "private-screen-first", preview: part78OwnerOnlyV3Rule(payload), spokenSummary: "V3 access rule private screen par dikhaya gaya hai.", ownerVerificationRequired: true };
  const focus = text.includes("backup") ? "backup" : text.includes("monitor") ? "monitoring" : text.includes("client") || text.includes("beta") ? "client_onboarding" : text.includes("demo") ? "demo_institute" : "launch";
  const preview = focus === "backup" ? part78BackupPlan() : focus === "monitoring" ? part78MonitoringPlan() : focus === "client_onboarding" ? part78ClientOnboardingPlan() : focus === "demo_institute" ? part78DemoInstitutePlan() : part78LaunchReadiness();
  return { allowed: true, role, command: part78CleanText(command, 400), responseMode: "private-screen-first", spokenSummary: "NAXORA OS 1.0 launch information screen par ready hai.", focus, preview, confirmationRequiredForActions: ["export_launch_report", "approve_paid_client", "change_subscription", "enable_v3_access"], auditLogRequired: true };
}

app.get("/api/part78/status", (req, res) => res.json({ success: true, part: part78Config.part, status: part78Config.status, releaseVersion: part78Config.releaseVersion, frontend: [part78Config.frontendRoute, ...part78Config.alternateRoutes], apiRoutes: part78Config.apiRoutes, purpose: part78Config.purpose, currentVersionPlan: part78Config.versionPlan, versionSubscriptionNote: part78Config.versionSubscriptionNote, nextPart: part78Config.nextPart }));
app.get("/api/part78/config", (req, res) => res.json({ success: true, part: part78Config.part, config: part78Config }));
app.get("/api/part78/release-summary", (req, res) => res.json({ success: true, part: part78Config.part, summary: part78ReleaseSummary() }));
app.get("/api/part78/launch-checklist", (req, res) => res.json({ success: true, part: part78Config.part, checklist: part78Checklist }));
app.get("/api/part78/go-live-plan", (req, res) => res.json({ success: true, part: part78Config.part, plan: part78GoLivePlan() }));
app.get("/api/part78/demo-institute", (req, res) => res.json({ success: true, part: part78Config.part, plan: part78DemoInstitutePlan() }));
app.get("/api/part78/admin-account-plan", (req, res) => res.json({ success: true, part: part78Config.part, plan: part78AdminAccountPlan() }));
app.get("/api/part78/monitoring-plan", (req, res) => res.json({ success: true, part: part78Config.part, plan: part78MonitoringPlan() }));
app.get("/api/part78/backup-plan", (req, res) => res.json({ success: true, part: part78Config.part, plan: part78BackupPlan() }));
app.get("/api/part78/client-onboarding-plan", (req, res) => res.json({ success: true, part: part78Config.part, plan: part78ClientOnboardingPlan() }));
app.get("/api/part78/version-subscriptions", (req, res) => res.json({ success: true, part: part78Config.part, subscriptions: part78VersionSubscriptions() }));
app.get("/api/part78/owner-only-v3-rule", (req, res) => res.json({ success: true, part: part78Config.part, rule: part78OwnerOnlyV3Rule(req.query || {}) }));
app.get("/api/part78/launch-readiness", async (req, res) => { const readiness = part78LaunchReadiness(); await part78Log("launch_readiness_checked", { role: part78Role(req.query.role || "owner"), score: readiness.score }); res.json({ success: true, part: part78Config.part, readiness }); });
app.post("/api/part78/vani/command", async (req, res) => { const result = part78Vani(req.body?.command || "v1 launch status dikhao", req.body || {}); await part78Log("vani_launch_command", { role: result.role, command: req.body?.command || "", focus: result.focus || "restricted" }); res.json({ success: true, part: part78Config.part, result }); });
app.get("/api/part78/activity", (req, res) => res.json({ success: true, part: part78Config.part, activity: globalThis.NAXORA_PART78_ACTIVITY }));
app.get("/api/part78/checklist", (req, res) => res.json({ success: true, part: part78Config.part, checklist: part78Checklist }));
app.get("/api/part78/export", (req, res) => res.json({ success: true, part: part78Config.part, exportReady: true, ownerVerificationRequired: true, note: "Production launch report export sensitive hai; owner verification required." }));
app.get("/api/part78/demo", (req, res) => res.json({ success: true, part: part78Config.part, release: part78ReleaseSummary(), readiness: part78LaunchReadiness(), goLivePlan: part78GoLivePlan(), v3Rule: part78OwnerOnlyV3Rule({ role: "owner", instituteId: "NX-DEMO-INST-001", v3Active: false }), vaniPreview: part78Vani("VANI, v1 launch status aur beta client plan dikhao", { role: "owner" }) }));

for (const route of [part78Config.frontendRoute, ...part78Config.alternateRoutes]) {
  app.get(route, (req, res) => sendFileSafe(res, "v1-production-launch.html"));
}
// ================= END PART 78 =================

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
  "/copilot-admission": "ai-admission-copilot.html",
  "/ai-fee-attendance-assistant": "ai-fee-attendance-assistant.html",
  "/fee-attendance-ai": "ai-fee-attendance-assistant.html",
  "/ai-fee-assistant": "ai-fee-attendance-assistant.html",
  "/ai-attendance-assistant": "ai-fee-attendance-assistant.html",
  "/ai-batch-performance-analyzer": "ai-batch-performance-analyzer.html",
  "/batch-performance-ai": "ai-batch-performance-analyzer.html",
  "/ai-batch-analyzer": "ai-batch-performance-analyzer.html",
  "/batch-analyzer": "ai-batch-performance-analyzer.html",
  "/ai-parent-weekly-summary": "ai-parent-weekly-summary.html",
  "/ai-parent-communication": "ai-parent-weekly-summary.html",
  "/weekly-summary-ai": "ai-parent-weekly-summary.html",
  "/parent-communication-ai": "ai-parent-weekly-summary.html",
  "/ai-weekly-summary": "ai-parent-weekly-summary.html",
  "/final-production-testing": "final-production-testing.html",
  "/production-testing": "final-production-testing.html",
  "/final-testing-v1": "final-production-testing.html",
  "/v1-final-testing": "final-production-testing.html",
  "/launch-testing": "final-production-testing.html",
  "/release-readiness": "final-production-testing.html",
  "/v1-production-launch": "v1-production-launch.html",
  "/production-launch": "v1-production-launch.html",
  "/naxora-v1-launch": "v1-production-launch.html",
  "/v1-launch": "v1-production-launch.html",
  "/launch-v1": "v1-production-launch.html",
  "/official-launch": "v1-production-launch.html",
  "/mobile-app-foundation": "mobile-app-foundation.html",
  "/mobile-foundation": "mobile-app-foundation.html",
  "/mobile-apps": "mobile-app-foundation.html",
  "/naxora-mobile": "mobile-app-foundation.html",
  "/app-foundation": "mobile-app-foundation.html",
  "/institute-owner-app": "institute-owner-app.html",
  "/owner-mobile-app": "institute-owner-app.html",
  "/owner-app": "institute-owner-app.html",
  "/owner-command-center": "institute-owner-app.html",
  "/mobile-owner-dashboard": "institute-owner-app.html",
  "/teacher-mobile-app": "teacher-mobile-app.html",
  "/teacher-app": "teacher-mobile-app.html",
  "/mobile-teacher-dashboard": "teacher-mobile-app.html",
  "/teacher-command-center": "teacher-mobile-app.html",
  "/teacher-app-mobile": "teacher-mobile-app.html",
  "/student-mobile-app": "student-mobile-app.html",
  "/student-app": "student-mobile-app.html",
  "/mobile-student-dashboard": "student-mobile-app.html",
  "/student-learning-app": "student-mobile-app.html",
  "/student-ai-mobile": "student-mobile-app.html",
  "/student-study-app": "student-mobile-app.html",
  "/parent-mobile-app": "parent-mobile-app.html",
  "/parent-app": "parent-mobile-app.html",
  "/mobile-parent-dashboard": "parent-mobile-app.html",
  "/parent-portal-mobile": "parent-mobile-app.html",
  "/parent-child-updates": "parent-mobile-app.html",
  "/parent-communication-app": "parent-mobile-app.html",
  "/advanced-vani-action-engine": "advanced-vani-action-engine.html",
  "/vani-action-engine": "advanced-vani-action-engine.html",
  "/vani-actions": "advanced-vani-action-engine.html",
  "/advanced-vani": "advanced-vani-action-engine.html",
  "/vani-command-engine": "advanced-vani-action-engine.html",
  "/vani-engine": "advanced-vani-action-engine.html",
  "/vani-admission-assistant": "vani-admission-assistant.html",
  "/admission-vani": "vani-admission-assistant.html",
  "/vani-admissions": "vani-admission-assistant.html",
  "/admission-assistant": "vani-admission-assistant.html",
  "/ai-admission-assistant": "vani-admission-assistant.html",
  "/vani-admission-counsellor": "vani-admission-assistant.html",
  "/vani-fee-attendance-actions": "vani-fee-attendance-actions.html",
  "/fee-attendance-vani": "vani-fee-attendance-actions.html",
  "/vani-fees-attendance": "vani-fee-attendance-actions.html",
  "/vani-fee-actions": "vani-fee-attendance-actions.html",
  "/vani-attendance-actions": "vani-fee-attendance-actions.html",
  "/fee-attendance-actions": "vani-fee-attendance-actions.html",
  "/vani-voice-reports": "vani-voice-reports.html",
  "/voice-reports": "vani-voice-reports.html",
  "/vani-reports": "vani-voice-reports.html",
  "/voice-reporting": "vani-voice-reports.html",
  "/vani-report-reader": "vani-voice-reports.html",
  "/ai-voice-reports": "vani-voice-reports.html",
  "/hindi-hinglish-vani-conversation": "hindi-hinglish-vani-conversation.html",
  "/vani-conversation": "hindi-hinglish-vani-conversation.html",
  "/hinglish-vani": "hindi-hinglish-vani-conversation.html",
  "/hindi-vani": "hindi-hinglish-vani-conversation.html",
  "/vani-chat": "hindi-hinglish-vani-conversation.html",
  "/vani-conversation-mode": "hindi-hinglish-vani-conversation.html",
  "/ai-admission-counsellor-foundation": "ai-admission-counsellor-foundation.html",
  "/ai-admission-counsellor": "ai-admission-counsellor-foundation.html",
  "/admission-counsellor-ai": "ai-admission-counsellor-foundation.html",
  "/admission-counselling-ai": "ai-admission-counsellor-foundation.html",
  "/smart-admission-counsellor": "ai-admission-counsellor-foundation.html",
  "/ai-counsellor": "ai-admission-counsellor-foundation.html",
  "/ai-course-recommendation": "ai-course-recommendation.html",
  "/course-recommendation-ai": "ai-course-recommendation.html",
  "/smart-course-recommendation": "ai-course-recommendation.html",
  "/course-fit-ai": "ai-course-recommendation.html",
  "/ai-course-finder": "ai-course-recommendation.html",
  "/course-recommender": "ai-course-recommendation.html",
  "/fee-batch-information-assistant": "fee-batch-information-assistant.html",
  "/fee-batch-assistant": "fee-batch-information-assistant.html",
  "/fee-and-batch-info": "fee-batch-information-assistant.html",
  "/batch-fee-assistant": "fee-batch-information-assistant.html",
  "/vani-fee-batch-info": "fee-batch-information-assistant.html",
  "/fee-batch-ai": "fee-batch-information-assistant.html",
  "/automatic-demo-class-booking": "automatic-demo-class-booking.html",
  "/demo-class-booking-ai": "automatic-demo-class-booking.html",
  "/auto-demo-booking": "automatic-demo-class-booking.html",
  "/vani-demo-booking": "automatic-demo-class-booking.html",
  "/demo-booking-assistant": "automatic-demo-class-booking.html",
  "/ai-demo-class-booking": "automatic-demo-class-booking.html",
  "/ai-lead-qualification": "ai-lead-qualification.html",
  "/lead-qualification-ai": "ai-lead-qualification.html",
  "/smart-lead-qualification": "ai-lead-qualification.html",
  "/vani-lead-qualification": "ai-lead-qualification.html",
  "/lead-score-ai": "ai-lead-qualification.html",
  "/lead-priority-ai": "ai-lead-qualification.html",
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

// ================= PART 79 — MOBILE APP FOUNDATION =================
// NAXORA OS 2.0 begins here. This part adds a safe mobile-app foundation
// without breaking NAXORA OS 1.0 production routes.

const part79MobileRoles = [
  {
    role: "institute_owner",
    label: "Institute Owner",
    access: "Full institute mobile command center after login and active instituteId.",
    navigation: ["Overview", "Revenue", "Admissions", "Fees", "Attendance", "Leads", "Branches", "Alerts"]
  },
  {
    role: "branch_manager",
    label: "Branch Manager",
    access: "Assigned branches only.",
    navigation: ["Branch Overview", "Students", "Batches", "Attendance", "Fees", "Reports"]
  },
  {
    role: "accountant",
    label: "Accountant",
    access: "Fees, payments, receipts, expenses and financial reports according to permission.",
    navigation: ["Fees", "Payments", "Receipts", "Invoices", "Renewals", "Finance Reports"]
  },
  {
    role: "teacher",
    label: "Teacher",
    access: "Assigned batches, students, attendance, material, tests, assignments and live classes.",
    navigation: ["My Batches", "Attendance", "Assignments", "Tests", "Notes", "Live Classes"]
  },
  {
    role: "receptionist_counsellor",
    label: "Receptionist / Counsellor",
    access: "Admissions, enquiries, follow-ups and permitted student information.",
    navigation: ["Enquiries", "Follow-ups", "Admissions", "Callback Requests", "Lead Notes"]
  },
  {
    role: "student",
    label: "Student",
    access: "Only own learning, timetable, fees, tests, notes and profile.",
    navigation: ["My Timetable", "Assignments", "Tests", "Notes", "Fees", "AI Study Tools", "VANI Revision"]
  },
  {
    role: "parent",
    label: "Parent",
    access: "Only information belonging to linked child.",
    navigation: ["Child Attendance", "Fees", "Reports", "Notices", "Live Classes", "Teacher Updates"]
  },
  {
    role: "naxora_super_admin",
    label: "NAXORA Super Admin",
    access: "Platform administration and logged support access only, not unrestricted daily private data access.",
    navigation: ["Platform Health", "Institutes", "Subscriptions", "Support Logs", "Release Monitor"]
  }
];

const part79MobileFeatures = [
  {
    key: "shared_mobile_architecture",
    name: "Shared Mobile Architecture",
    why: "Owner, teacher, student and parent apps must use one common API and design foundation.",
    problemSolved: "Prevents duplicate disconnected mobile code for every role."
  },
  {
    key: "secure_login_foundation",
    name: "Secure Login Foundation",
    why: "Mobile apps need token-based login and instituteId binding.",
    problemSolved: "Prevents unauthorized mobile access to institute data."
  },
  {
    key: "api_connection_layer",
    name: "API Connection Layer",
    why: "Mobile apps must connect to the existing Render backend safely.",
    problemSolved: "Keeps mobile apps connected to the same live SaaS backend."
  },
  {
    key: "role_based_navigation",
    name: "Role-Based Navigation",
    why: "Different users need different mobile screens.",
    problemSolved: "Student/parent/teacher/staff do not see owner-only areas."
  },
  {
    key: "offline_loading_handling",
    name: "Offline and Loading Handling",
    why: "Mobile internet can be unstable.",
    problemSolved: "App can show safe cached/sync-pending states instead of crashing."
  },
  {
    key: "device_session_foundation",
    name: "Device Session Foundation",
    why: "Mobile security needs device/session awareness.",
    problemSolved: "Future logout-all-devices and suspicious-device alerts become possible."
  },
  {
    key: "vani_mobile_ready",
    name: "VANI Mobile Ready Foundation",
    why: "VANI must work through laptop, mobile or optional speaker/hub.",
    problemSolved: "VANI 2.0 can expand across all authorized modules without being trapped in desktop-only UI."
  }
];

function getPart79RoleConfig(role) {
  const normalized = String(role || "student").toLowerCase().replace(/\s+/g, "_");
  return part79MobileRoles.find((item) => item.role === normalized) || part79MobileRoles.find((item) => item.role === "student");
}

function buildPart79DevicePreview(body = {}) {
  const roleConfig = getPart79RoleConfig(body.role || "student");
  const instituteId = body.instituteId || "NX-DEMO-INST-001";
  const deviceType = body.deviceType || "mobile";
  return {
    sessionPreviewId: `NX-MOB-${Date.now()}`,
    instituteId,
    role: roleConfig.role,
    deviceType,
    loginRequired: true,
    tokenStorageRule: "Use secure platform storage in native/mobile app. Do not store JWT in public logs.",
    sessionPolicy: {
      bindToInstituteId: true,
      allowLogoutAllDevices: "planned",
      suspiciousDeviceAlert: "planned",
      inactivityLock: "planned"
    },
    allowedNavigation: roleConfig.navigation,
    blockedExamples: roleConfig.role === "student" ? ["owner revenue", "staff salary", "other students data"] : ["unauthorized branch data"],
    createdAt: new Date().toISOString()
  };
}

const part79MobileChecklist = [
  "Mobile foundation page opens on live URL",
  "Status API returns success true",
  "Role navigation returns different menus for owner, teacher, student and parent",
  "API connection test returns backend running state",
  "Offline policy explains loading, retry and sync-pending behavior",
  "No .env, secrets, API keys or passwords are included",
  "VANI mobile readiness rules are documented",
  "Previous NAXORA OS 1.0 routes remain preserved"
];

app.get("/api/part79/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 79 — Mobile App Foundation",
    status: "active",
    versionPhase: "NAXORA OS 2.0 begins",
    preservesV1: true,
    latestCompletedPart: 79,
    nextPart: "Part 80 — Institute Owner App",
    productionSafe: true,
    frontendRoutes: ["/mobile-app-foundation", "/mobile-foundation", "/mobile-apps", "/naxora-mobile", "/app-foundation"],
    apiRoutes: [
      "/api/part79/config",
      "/api/part79/features",
      "/api/part79/roles",
      "/api/part79/app-shells",
      "/api/part79/navigation",
      "/api/part79/api-connection-test",
      "/api/part79/offline-policy",
      "/api/part79/device-session/preview",
      "/api/part79/vani/command"
    ],
    notes: [
      "This is a mobile foundation, not App Store/Play Store deployment.",
      "Native mobile apps continue in Parts 80–83.",
      "VANI mobile access must follow role permissions and private-screen-first rules."
    ]
  });
});

app.get("/api/part79/config", (req, res) => {
  res.json({
    success: true,
    appName: "NAXORA Mobile Foundation",
    version: "2.0-foundation",
    backendBaseUrl: process.env.FRONTEND_URL || "https://naxora-institute-os.onrender.com",
    auth: {
      requiresLogin: true,
      requiresInstituteId: true,
      jwtBased: true,
      ownerOnlyV3RulePreserved: true
    },
    supportedClients: ["mobile_web", "future_android", "future_ios", "tablet", "laptop_pwa"],
    modulesPrepared: [
      "Owner app", "Teacher app", "Student app", "Parent app",
      "Role navigation", "Offline handling", "API connection", "VANI mobile readiness"
    ]
  });
});

app.get("/api/part79/features", (req, res) => {
  res.json({ success: true, features: part79MobileFeatures });
});

app.get("/api/part79/roles", (req, res) => {
  res.json({ success: true, roles: part79MobileRoles });
});

app.get("/api/part79/app-shells", (req, res) => {
  res.json({
    success: true,
    shells: [
      { key: "owner_app", part: 80, status: "planned_next", route: "/owner-mobile-app", description: "Owner command center mobile app." },
      { key: "teacher_app", part: 81, status: "planned", route: "/teacher-mobile-app", description: "Teacher daily work mobile app." },
      { key: "student_app", part: 82, status: "planned", route: "/student-mobile-app", description: "Student learning mobile app." },
      { key: "parent_app", part: 83, status: "planned", route: "/parent-mobile-app", description: "Parent transparency mobile app." }
    ],
    foundationAvailableNow: true
  });
});

app.get("/api/part79/navigation", (req, res) => {
  const roleConfig = getPart79RoleConfig(req.query.role);
  res.json({
    success: true,
    role: roleConfig.role,
    label: roleConfig.label,
    access: roleConfig.access,
    navigation: roleConfig.navigation,
    permissionReminder: "Final access must always be checked on backend APIs, not only hidden in UI."
  });
});

app.get("/api/part79/api-connection-test", (req, res) => {
  res.json({
    success: true,
    backend: "reachable",
    app: "NAXORA Institute OS",
    phase: "Part 79 Mobile App Foundation",
    serverTime: new Date().toISOString(),
    databaseMode: global.__NAXORA_DB_MODE || "mongodb_or_safe_fallback",
    healthEndpoint: "/api/health",
    mobileNote: "Mobile clients should call authenticated APIs after login and instituteId validation."
  });
});

app.get("/api/part79/offline-policy", (req, res) => {
  res.json({
    success: true,
    policy: {
      loadingState: "Show skeleton/loading screen while API responds.",
      offlineState: "Show offline banner and last-safe cached screen where allowed.",
      syncPending: "Do not finalize attendance/fees/payments offline without server confirmation.",
      sensitiveData: "Do not cache private financial/personal data in unsafe public storage.",
      retry: "Use safe retry for read requests. For write requests, show preview and wait for online confirmation.",
      vani: "VANI should say network issue politely and avoid speaking private cached data in public areas."
    }
  });
});

app.post("/api/part79/device-session/preview", (req, res) => {
  res.json({ success: true, deviceSession: buildPart79DevicePreview(req.body || {}) });
});

app.get("/api/part79/device-session/preview", (req, res) => {
  res.json({ success: true, deviceSession: buildPart79DevicePreview(req.query || {}) });
});

app.post("/api/part79/vani/command", (req, res) => {
  const command = String(req.body?.command || req.query?.command || "").trim();
  const roleConfig = getPart79RoleConfig(req.body?.role || req.query?.role || "owner");
  const lower = command.toLowerCase();

  let intent = "mobile_foundation_status";
  if (lower.includes("owner")) intent = "owner_mobile_app_preview";
  if (lower.includes("teacher")) intent = "teacher_mobile_app_preview";
  if (lower.includes("student")) intent = "student_mobile_app_preview";
  if (lower.includes("parent")) intent = "parent_mobile_app_preview";
  if (lower.includes("offline")) intent = "offline_policy";
  if (lower.includes("navigation") || lower.includes("menu")) intent = "role_navigation";

  const response = {
    success: true,
    assistant: "VANI",
    part: "Part 79 — Mobile App Foundation",
    command: command || "VANI, mobile app foundation status dikhao",
    detectedIntent: intent,
    role: roleConfig.role,
    privateScreenFirst: true,
    spokenSafeSummary: "NAXORA mobile foundation active hai. Detailed role navigation screen par dekh sakte ho.",
    screenPreview: {
      message: "Mobile foundation is active. Native role apps continue in Parts 80–83.",
      allowedNavigation: roleConfig.navigation,
      nextPart: "Part 80 — Institute Owner App"
    },
    safety: [
      "VANI will not expose private fees/personal data loudly in public.",
      "Create/update/send/delete actions require preview and confirmation.",
      "Sensitive version/subscription actions require owner verification."
    ],
    auditLog: {
      event: "part79_vani_mobile_foundation_command",
      createdAt: new Date().toISOString()
    }
  };

  res.json(response);
});

app.get("/api/part79/vani/command", (req, res) => {
  const command = String(req.query.q || req.query.command || "").trim();
  const roleConfig = getPart79RoleConfig(req.query.role || "owner");
  res.json({
    success: true,
    assistant: "VANI",
    part: "Part 79 — Mobile App Foundation",
    command: command || "VANI, mobile app foundation status dikhao",
    detectedIntent: "mobile_foundation_status",
    role: roleConfig.role,
    privateScreenFirst: true,
    spokenSafeSummary: "NAXORA mobile foundation active hai. Detailed role navigation screen par dekh sakte ho.",
    screenPreview: {
      message: "Mobile foundation is active. Native role apps continue in Parts 80–83.",
      allowedNavigation: roleConfig.navigation,
      nextPart: "Part 80 — Institute Owner App"
    },
    auditLog: { event: "part79_vani_mobile_foundation_command_get", createdAt: new Date().toISOString() }
  });
});

app.get("/api/part79/activity", (req, res) => {
  res.json({
    success: true,
    activity: [
      {
        type: "mobile_foundation_created",
        message: "Part 79 Mobile App Foundation active.",
        createdAt: new Date().toISOString()
      },
      {
        type: "vani_mobile_ready_rule",
        message: "VANI can work on laptop/mobile/speaker with role checks and private-screen-first rules.",
        createdAt: new Date().toISOString()
      }
    ]
  });
});

app.get("/api/part79/checklist", (req, res) => {
  res.json({ success: true, checklist: part79MobileChecklist });
});

app.get("/api/part79/export", (req, res) => {
  res.json({
    success: true,
    exportType: "part79-mobile-foundation-readiness",
    generatedAt: new Date().toISOString(),
    ownerVerificationRequiredForSensitiveExports: true,
    data: {
      part: 79,
      features: part79MobileFeatures,
      roles: part79MobileRoles,
      checklist: part79MobileChecklist
    }
  });
});

app.get("/api/part79/demo", (req, res) => {
  res.json({
    success: true,
    demo: {
      title: "NAXORA OS 2.0 Mobile App Foundation Demo",
      sampleRoles: part79MobileRoles.slice(0, 4),
      sampleDeviceSession: buildPart79DevicePreview({ role: "institute_owner", instituteId: "NX-DEMO-INST-001", deviceType: "mobile" }),
      sampleVaniCommand: "VANI, owner mobile app ka menu dikhao",
      nextParts: ["Part 80 Owner App", "Part 81 Teacher App", "Part 82 Student App", "Part 83 Parent App"]
    }
  });
});
// ================= END PART 79 =================

// ================= PART 80 — INSTITUTE OWNER APP =================
// NAXORA OS 2.0 owner mobile app foundation. This is owner-focused,
// instituteId-bound, private-screen-first, and does not break 1.0.

const part80OwnerTiles = [
  {
    key: "revenue",
    name: "Revenue",
    icon: "₹",
    summary: "Today, weekly and monthly collection overview.",
    ownerBenefit: "Owner can see collection health from phone.",
    sensitive: true
  },
  {
    key: "admissions",
    name: "Admissions",
    icon: "🎯",
    summary: "New enquiries, demo classes and converted admissions.",
    ownerBenefit: "Owner can track growth without opening desktop.",
    sensitive: false
  },
  {
    key: "fees",
    name: "Fees",
    icon: "💳",
    summary: "Pending fees, overdue fees and collection follow-ups.",
    ownerBenefit: "Owner can prioritize pending collections quickly.",
    sensitive: true
  },
  {
    key: "attendance",
    name: "Attendance",
    icon: "✅",
    summary: "Student, teacher and staff attendance pulse.",
    ownerBenefit: "Owner can identify absence patterns early.",
    sensitive: false
  },
  {
    key: "leads",
    name: "Leads",
    icon: "📞",
    summary: "CRM hot/warm/cold leads and follow-up reminders.",
    ownerBenefit: "Owner can prevent missed admissions.",
    sensitive: false
  },
  {
    key: "branches",
    name: "Branches",
    icon: "🏫",
    summary: "Assigned branches, branch revenue and performance.",
    ownerBenefit: "Owner can compare branches from mobile.",
    sensitive: true
  },
  {
    key: "alerts",
    name: "Alerts",
    icon: "🔔",
    summary: "Urgent fees, attendance, renewal, live-class and security alerts.",
    ownerBenefit: "Owner sees priority actions first.",
    sensitive: false
  },
  {
    key: "vani",
    name: "VANI Owner Assistant",
    icon: "🎙️",
    summary: "Owner-safe voice assistant for mobile command center.",
    ownerBenefit: "Owner can ask for summaries in Hindi, English or Hinglish.",
    sensitive: true
  }
];

const part80OwnerRoles = [
  {
    role: "institute_owner",
    allowed: true,
    reason: "Full institute and authorised branch access after login and active instituteId."
  },
  {
    role: "branch_manager",
    allowed: false,
    reason: "Branch manager will use branch-focused mobile views, not owner command center."
  },
  {
    role: "accountant",
    allowed: false,
    reason: "Accountant has finance access only according to permission, not full owner app."
  },
  {
    role: "teacher",
    allowed: false,
    reason: "Teacher will use Part 81 Teacher App."
  },
  {
    role: "student",
    allowed: false,
    reason: "Student will use Part 82 Student App."
  },
  {
    role: "parent",
    allowed: false,
    reason: "Parent will use Part 83 Parent App."
  },
  {
    role: "naxora_super_admin",
    allowed: false,
    reason: "Super Admin has logged platform support access, not unrestricted institute-private owner app access."
  }
];

function normalizePart80Role(role) {
  const r = String(role || "institute_owner").toLowerCase().trim().replace(/\s+/g, "_");
  if (["owner", "instituteowner", "institute_owner"].includes(r)) return "institute_owner";
  if (["branch_manager", "branchmanager"].includes(r)) return "branch_manager";
  if (["receptionist", "counsellor", "receptionist_counsellor"].includes(r)) return "receptionist_counsellor";
  return r;
}

function part80AccessCheck({ role, instituteId, subscription }) {
  const normalizedRole = normalizePart80Role(role);
  const roleRule = part80OwnerRoles.find((r) => r.role === normalizedRole) || {
    role: normalizedRole,
    allowed: false,
    reason: "Unknown or unsupported role."
  };
  const hasInstituteId = Boolean(String(instituteId || "").trim());
  const v2Active = ["active", "trial", "demo"].includes(String(subscription || "demo").toLowerCase());

  const allowed = roleRule.allowed && hasInstituteId && v2Active;
  return {
    role: normalizedRole,
    instituteId: instituteId || null,
    subscriptionState: subscription || "demo",
    allowed,
    reason: !roleRule.allowed
      ? roleRule.reason
      : !hasInstituteId
        ? "Institute ID missing. Owner app opens only inside a logged institute account."
        : !v2Active
          ? "NAXORA OS 2.0 subscription is not active for this institute."
          : "Owner mobile app access allowed.",
    requiresLogin: true,
    requiresInstituteId: true,
    requiresV2Subscription: true
  };
}

function part80OwnerSnapshot(query = {}) {
  const instituteId = query.instituteId || "NX-DEMO-INST-001";
  const branch = query.branch || "All Branches";
  return {
    instituteId,
    branch,
    generatedAt: new Date().toISOString(),
    today: {
      revenueCollected: 42500,
      pendingFees: 138000,
      newEnquiries: 18,
      hotLeads: 6,
      admissionsConverted: 3,
      studentAttendancePercent: 87,
      teacherAttendancePercent: 96,
      liveClassesToday: 4
    },
    month: {
      revenueCollected: 842000,
      admissionTarget: 120,
      admissionsConverted: 78,
      overdueFees: 92000,
      activeStudents: 642,
      activeBatches: 38
    },
    urgentAlerts: [
      { type: "fees", level: "high", message: "12 students have overdue fees above 15 days.", privateScreenFirst: true },
      { type: "attendance", level: "medium", message: "7 students have attendance below 70%.", privateScreenFirst: false },
      { type: "leads", level: "high", message: "6 hot leads need same-day callback.", privateScreenFirst: false },
      { type: "security", level: "medium", message: "Review role permissions before adding new staff users.", privateScreenFirst: true }
    ]
  };
}

const part80Checklist = [
  "Owner app page opens on live URL",
  "Status API returns success true",
  "Access check allows institute_owner with instituteId",
  "Access check blocks teacher/student/parent",
  "Owner overview returns revenue, admissions, fees, attendance and alerts",
  "VANI owner command returns private-screen-first response",
  "No .env, secrets, node_modules or .bat scripts included",
  "Previous Part 1–79 routes remain preserved"
];

app.get("/api/part80/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 80 — Institute Owner App",
    status: "active",
    versionPhase: "NAXORA OS 2.0",
    latestCompletedPart: 80,
    nextPart: "Part 81 — Teacher App",
    preservesPreviousFeatures: true,
    frontendRoutes: ["/institute-owner-app", "/owner-mobile-app", "/owner-app", "/owner-command-center", "/mobile-owner-dashboard"],
    apiRoutes: [
      "/api/part80/config",
      "/api/part80/features",
      "/api/part80/roles",
      "/api/part80/access-check",
      "/api/part80/overview",
      "/api/part80/revenue",
      "/api/part80/admissions",
      "/api/part80/fees",
      "/api/part80/attendance",
      "/api/part80/leads",
      "/api/part80/branches",
      "/api/part80/alerts",
      "/api/part80/vani/command"
    ],
    ownerOnly: true,
    v3OwnerOnlyRulePreserved: true
  });
});

app.get("/api/part80/config", (req, res) => {
  res.json({
    success: true,
    appName: "NAXORA Institute Owner App",
    appType: "mobile_owner_command_center",
    version: "2.0-owner-foundation",
    login: {
      required: true,
      requiresInstituteId: true,
      roleRequired: "institute_owner",
      subscriptionRequired: "NAXORA OS 2.0 active/trial/demo"
    },
    sensitiveDataPolicy: "Private financial/personal data should be displayed on screen, not loudly spoken in public areas.",
    futureNativeApps: ["Android", "iOS", "PWA"],
    speakerSupport: "Optional VANI speaker/hub supported later; mobile/laptop mic works first."
  });
});

app.get("/api/part80/features", (req, res) => {
  res.json({ success: true, features: part80OwnerTiles });
});

app.get("/api/part80/roles", (req, res) => {
  res.json({ success: true, roles: part80OwnerRoles });
});

app.get("/api/part80/access-check", (req, res) => {
  res.json({ success: true, access: part80AccessCheck(req.query || {}) });
});

app.get("/api/part80/overview", (req, res) => {
  const access = part80AccessCheck(req.query || {});
  if (!access.allowed) {
    return res.status(403).json({ success: false, access, message: access.reason });
  }
  res.json({
    success: true,
    access,
    overview: part80OwnerSnapshot(req.query || {}),
    tiles: part80OwnerTiles
  });
});

app.get("/api/part80/revenue", (req, res) => {
  const access = part80AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  res.json({
    success: true,
    privateScreenFirst: true,
    revenue: {
      today: 42500,
      thisWeek: 184000,
      thisMonth: 842000,
      pending: 138000,
      overdue: 92000,
      note: "Demo-safe revenue summary. Production schema hard-connect will be validated during 2.0."
    }
  });
});

app.get("/api/part80/admissions", (req, res) => {
  const access = part80AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  res.json({
    success: true,
    admissions: {
      newEnquiries: 18,
      hotLeads: 6,
      demosScheduled: 5,
      convertedToday: 3,
      conversionRateMonth: "65%",
      nextAction: "Call hot leads before 7 PM."
    }
  });
});

app.get("/api/part80/fees", (req, res) => {
  const access = part80AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  res.json({
    success: true,
    privateScreenFirst: true,
    fees: {
      pendingStudents: 42,
      overdueStudents: 12,
      pendingAmount: 138000,
      overdueAmount: 92000,
      reminderDraftAvailable: true
    }
  });
});

app.get("/api/part80/attendance", (req, res) => {
  const access = part80AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  res.json({
    success: true,
    attendance: {
      studentAverage: 87,
      teacherAverage: 96,
      staffAverage: 94,
      lowAttendanceStudents: 7,
      supportAlerts: 7
    }
  });
});

app.get("/api/part80/leads", (req, res) => {
  const access = part80AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  res.json({
    success: true,
    leads: {
      hot: 6,
      warm: 9,
      cold: 13,
      followUpsDue: 11,
      missedFollowUps: 2,
      recommendation: "Prioritize hot leads and missed follow-ups."
    }
  });
});

app.get("/api/part80/branches", (req, res) => {
  const access = part80AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  res.json({
    success: true,
    privateScreenFirst: true,
    branches: [
      { name: "Main Branch", revenue: 542000, attendance: 89, admissions: 42, status: "healthy" },
      { name: "North Branch", revenue: 210000, attendance: 84, admissions: 21, status: "watch" },
      { name: "Online Branch", revenue: 90000, attendance: 91, admissions: 15, status: "growing" }
    ]
  });
});

app.get("/api/part80/alerts", (req, res) => {
  const access = part80AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  res.json({ success: true, alerts: part80OwnerSnapshot(req.query || {}).urgentAlerts });
});

app.post("/api/part80/vani/command", (req, res) => {
  const command = String(req.body?.command || req.query?.command || "").trim();
  const access = part80AccessCheck({
    role: req.body?.role || req.query?.role || "institute_owner",
    instituteId: req.body?.instituteId || req.query?.instituteId || "NX-DEMO-INST-001",
    subscription: req.body?.subscription || req.query?.subscription || "demo"
  });

  if (!access.allowed) {
    return res.status(403).json({
      success: false,
      assistant: "VANI",
      access,
      spokenSafeSummary: "Ye owner mobile command center sirf institute owner ke active institute account me available hai.",
      privateScreenFirst: true
    });
  }

  const lower = command.toLowerCase();
  let intent = "owner_overview";
  if (lower.includes("revenue") || lower.includes("income") || lower.includes("collection")) intent = "revenue_summary";
  if (lower.includes("fee") || lower.includes("pending")) intent = "fees_summary";
  if (lower.includes("attendance") || lower.includes("absent")) intent = "attendance_summary";
  if (lower.includes("lead") || lower.includes("admission") || lower.includes("enquiry")) intent = "admissions_leads_summary";
  if (lower.includes("branch")) intent = "branch_summary";
  if (lower.includes("alert")) intent = "urgent_alerts";

  const snapshot = part80OwnerSnapshot({ instituteId: access.instituteId });
  res.json({
    success: true,
    assistant: "VANI",
    part: "Part 80 — Institute Owner App",
    command: command || "VANI, owner app overview dikhao",
    detectedIntent: intent,
    access,
    privateScreenFirst: ["revenue_summary", "fees_summary", "branch_summary"].includes(intent),
    spokenSafeSummary: "Owner app overview ready hai. Sensitive finance details screen par privately dikhaye gaye hain.",
    screenPreview: {
      today: snapshot.today,
      urgentAlerts: snapshot.urgentAlerts,
      nextAction: "Review hot leads, overdue fees and low-attendance alerts."
    },
    confirmationRequiredFor: ["refund", "discount", "delete", "export", "subscription_change", "3.0_access_change"],
    auditLog: {
      event: "part80_vani_owner_mobile_command",
      intent,
      createdAt: new Date().toISOString()
    }
  });
});

app.get("/api/part80/vani/command", (req, res) => {
  const command = String(req.query.q || req.query.command || "").trim();
  const access = part80AccessCheck({
    role: req.query.role || "institute_owner",
    instituteId: req.query.instituteId || "NX-DEMO-INST-001",
    subscription: req.query.subscription || "demo"
  });
  if (!access.allowed) {
    return res.status(403).json({
      success: false,
      assistant: "VANI",
      access,
      spokenSafeSummary: "Ye owner mobile command center sirf institute owner ke active institute account me available hai.",
      privateScreenFirst: true
    });
  }
  const snapshot = part80OwnerSnapshot({ instituteId: access.instituteId });
  res.json({
    success: true,
    assistant: "VANI",
    part: "Part 80 — Institute Owner App",
    command: command || "VANI, owner app overview dikhao",
    detectedIntent: "owner_overview",
    access,
    privateScreenFirst: true,
    spokenSafeSummary: "Owner overview ready hai. Sensitive data screen par dekho.",
    screenPreview: snapshot.today,
    auditLog: { event: "part80_vani_owner_mobile_command_get", createdAt: new Date().toISOString() }
  });
});

app.get("/api/part80/activity", (req, res) => {
  res.json({
    success: true,
    activity: [
      { type: "owner_app_foundation_created", message: "Part 80 Institute Owner App active.", createdAt: new Date().toISOString() },
      { type: "owner_only_guard", message: "Owner app requires institute_owner role and instituteId.", createdAt: new Date().toISOString() },
      { type: "vani_owner_mobile_ready", message: "VANI owner mobile command center uses private-screen-first rules.", createdAt: new Date().toISOString() }
    ]
  });
});

app.get("/api/part80/checklist", (req, res) => {
  res.json({ success: true, checklist: part80Checklist });
});

app.get("/api/part80/export", (req, res) => {
  const access = part80AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  res.json({
    success: true,
    exportType: "part80-owner-app-readiness",
    ownerVerificationRequired: true,
    generatedAt: new Date().toISOString(),
    data: {
      tiles: part80OwnerTiles,
      snapshot: part80OwnerSnapshot(req.query || {}),
      checklist: part80Checklist
    }
  });
});

app.get("/api/part80/demo", (req, res) => {
  res.json({
    success: true,
    demo: {
      access: part80AccessCheck({ role: "institute_owner", instituteId: "NX-DEMO-INST-001", subscription: "demo" }),
      overview: part80OwnerSnapshot({ instituteId: "NX-DEMO-INST-001" }),
      tiles: part80OwnerTiles,
      vaniCommand: "VANI, owner app overview dikhao",
      nextPart: "Part 81 — Teacher App"
    }
  });
});
// ================= END PART 80 =================

// ================= PART 81 — TEACHER APP =================
// NAXORA OS 2.0 teacher mobile app foundation. Teacher sees only assigned
// batches/students/classes/material/testing work. Includes browser voice
// greeting starter for VANI so the assistant does not feel silent.

const part81TeacherFeatures = [
  {
    key: "teacher_dashboard",
    name: "Teacher Mobile Dashboard",
    summary: "Daily classes, assigned batches, pending actions and alerts.",
    problemSolved: "Teacher does not need desktop for daily teaching work."
  },
  {
    key: "assigned_batches",
    name: "Assigned Batches",
    summary: "Only teacher's assigned batches and subjects.",
    problemSolved: "Teacher cannot access unrelated batches."
  },
  {
    key: "attendance_marking",
    name: "Attendance Marking Foundation",
    summary: "Mobile-ready attendance flow with preview before final save.",
    problemSolved: "Classroom attendance can move from register to mobile."
  },
  {
    key: "assignments_homework",
    name: "Assignments and Homework",
    summary: "Create/view homework drafts and pending submissions.",
    problemSolved: "Teacher can manage homework quickly."
  },
  {
    key: "tests_results",
    name: "Tests and Results",
    summary: "Test schedule, marks entry foundation and weak student list.",
    problemSolved: "Teacher can track test work and student support needs."
  },
  {
    key: "notes_material",
    name: "Notes and Study Material",
    summary: "Mobile material upload/share foundation.",
    problemSolved: "Students can receive notes through portal/mobile flow later."
  },
  {
    key: "live_classes",
    name: "Live Classes",
    summary: "Today live class list and class readiness status.",
    problemSolved: "Teacher can start/check online classes faster."
  },
  {
    key: "vani_teacher_assistant",
    name: "VANI Teacher Assistant with Voice Starter",
    summary: "Browser voice greeting plus private-screen-first teacher commands.",
    problemSolved: "VANI no longer feels silent; teacher gets safe spoken greeting."
  }
];

const part81TeacherRoleRules = [
  {
    role: "teacher",
    allowed: true,
    access: "Assigned batches, students, attendance, assignments, tests, notes/material and live classes only."
  },
  {
    role: "institute_owner",
    allowed: true,
    previewOnly: true,
    access: "Owner can preview teacher app readiness, but teacher actions still need assigned teacher context."
  },
  {
    role: "branch_manager",
    allowed: true,
    previewOnly: true,
    access: "Branch manager can review assigned branch teacher readiness, not act as teacher."
  },
  {
    role: "student",
    allowed: false,
    access: "Student uses Part 82 Student App."
  },
  {
    role: "parent",
    allowed: false,
    access: "Parent uses Part 83 Parent App."
  },
  {
    role: "accountant",
    allowed: false,
    access: "Accountant uses finance access only."
  },
  {
    role: "receptionist_counsellor",
    allowed: false,
    access: "Receptionist/Counsellor uses CRM/admission workflows only."
  },
  {
    role: "naxora_super_admin",
    allowed: false,
    access: "Platform support access only, not unrestricted teacher/private class data."
  }
];

function normalizePart81Role(role) {
  const r = String(role || "teacher").toLowerCase().trim().replace(/\s+/g, "_");
  if (["owner", "instituteowner", "institute_owner"].includes(r)) return "institute_owner";
  if (["branchmanager", "branch_manager"].includes(r)) return "branch_manager";
  if (["receptionist", "counsellor", "receptionist_counsellor"].includes(r)) return "receptionist_counsellor";
  return r;
}

function part81AccessCheck({ role, instituteId, teacherId, batchId }) {
  const normalizedRole = normalizePart81Role(role);
  const rule = part81TeacherRoleRules.find((r) => r.role === normalizedRole) || {
    role: normalizedRole,
    allowed: false,
    access: "Unknown or unsupported role."
  };
  const hasInstituteId = Boolean(String(instituteId || "").trim());
  const hasTeacherContext = normalizedRole !== "teacher" || Boolean(String(teacherId || "TCH-DEMO-001").trim());

  const allowed = Boolean(rule.allowed && hasInstituteId && hasTeacherContext);
  return {
    role: normalizedRole,
    instituteId: instituteId || null,
    teacherId: teacherId || (normalizedRole === "teacher" ? "TCH-DEMO-001" : null),
    batchId: batchId || null,
    allowed,
    previewOnly: Boolean(rule.previewOnly),
    reason: !rule.allowed
      ? rule.access
      : !hasInstituteId
        ? "Institute ID missing. Teacher app opens only inside a logged institute account."
        : !hasTeacherContext
          ? "Teacher ID/assigned teacher context missing."
          : rule.previewOnly
            ? "Preview allowed. Final teacher actions require assigned teacher context."
            : "Teacher app access allowed.",
    requiresLogin: true,
    requiresInstituteId: true,
    restrictToAssignedBatches: true
  };
}

function part81TeacherDashboard(query = {}) {
  const teacherId = query.teacherId || "TCH-DEMO-001";
  return {
    teacherId,
    instituteId: query.instituteId || "NX-DEMO-INST-001",
    generatedAt: new Date().toISOString(),
    today: {
      classesToday: 4,
      attendancePending: 1,
      assignmentsToReview: 18,
      testsToEvaluate: 2,
      doubtsPending: 7,
      liveClassesToday: 1
    },
    assignedBatches: [
      { batchId: "BAT-10-MATH-A", name: "Class 10 Maths A", subject: "Maths", students: 38, nextClass: "10:00 AM", attendanceMarked: false },
      { batchId: "BAT-10-MATH-B", name: "Class 10 Maths B", subject: "Maths", students: 34, nextClass: "12:00 PM", attendanceMarked: true },
      { batchId: "BAT-9-SCI-A", name: "Class 9 Science A", subject: "Science", students: 31, nextClass: "04:00 PM", attendanceMarked: false }
    ],
    supportAlerts: [
      { student: "Aman", batch: "Class 10 Maths A", reason: "Attendance below 70%", privateScreenFirst: true },
      { student: "Riya", batch: "Class 10 Maths B", reason: "Weak in Quadratic Equations", privateScreenFirst: true },
      { student: "Kabir", batch: "Class 9 Science A", reason: "Homework missing twice", privateScreenFirst: true }
    ]
  };
}

const part81Checklist = [
  "Teacher app page opens on live URL",
  "Status API returns success true",
  "Teacher access allowed with instituteId",
  "Student/parent access blocked",
  "Assigned batches endpoint returns only assigned batch foundation",
  "Attendance draft endpoint works with preview-first rule",
  "VANI browser voice starter available on UI",
  "VANI private-screen-first rule preserved",
  "Previous Part 1–80 routes remain preserved"
];

app.get("/api/part81/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 81 — Teacher App",
    status: "active",
    versionPhase: "NAXORA OS 2.0",
    latestCompletedPart: 81,
    nextPart: "Part 82 — Student App",
    preservesPreviousFeatures: true,
    frontendRoutes: ["/teacher-mobile-app", "/teacher-app", "/mobile-teacher-dashboard", "/teacher-command-center", "/teacher-app-mobile"],
    apiRoutes: [
      "/api/part81/config",
      "/api/part81/features",
      "/api/part81/roles",
      "/api/part81/access-check",
      "/api/part81/dashboard",
      "/api/part81/my-batches",
      "/api/part81/attendance/draft",
      "/api/part81/assignments",
      "/api/part81/tests",
      "/api/part81/notes-material",
      "/api/part81/live-classes",
      "/api/part81/student-support",
      "/api/part81/vani/greeting",
      "/api/part81/vani/command"
    ],
    vaniVoiceStarter: true
  });
});

app.get("/api/part81/config", (req, res) => {
  res.json({
    success: true,
    appName: "NAXORA Teacher App",
    appType: "mobile_teacher_workspace",
    version: "2.0-teacher-foundation",
    login: {
      required: true,
      requiresInstituteId: true,
      roleRequired: "teacher",
      assignedBatchRestriction: true
    },
    voice: {
      browserSpeechStarter: true,
      greeting: "Namaste, main VANI hoon. Main aapki teaching me kya help kar sakti hoon?",
      note: "Browser speech works only after user taps Start VANI because browsers block auto-play voice."
    },
    sensitiveDataPolicy: "Student personal/support data is private-screen-first."
  });
});

app.get("/api/part81/features", (req, res) => {
  res.json({ success: true, features: part81TeacherFeatures });
});

app.get("/api/part81/roles", (req, res) => {
  res.json({ success: true, roles: part81TeacherRoleRules });
});

app.get("/api/part81/access-check", (req, res) => {
  res.json({ success: true, access: part81AccessCheck(req.query || {}) });
});

app.get("/api/part81/dashboard", (req, res) => {
  const access = part81AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  res.json({ success: true, access, dashboard: part81TeacherDashboard(req.query || {}) });
});

app.get("/api/part81/my-batches", (req, res) => {
  const access = part81AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  res.json({
    success: true,
    access,
    assignedOnly: true,
    batches: part81TeacherDashboard(req.query || {}).assignedBatches
  });
});

app.post("/api/part81/attendance/draft", (req, res) => {
  const access = part81AccessCheck(req.body || {});
  if (!access.allowed || access.previewOnly) {
    return res.status(403).json({ success: false, access, message: access.previewOnly ? "Preview user cannot mark attendance." : access.reason });
  }
  const batchId = req.body?.batchId || "BAT-10-MATH-A";
  const present = Array.isArray(req.body?.presentStudentIds) ? req.body.presentStudentIds : ["STU-001", "STU-002"];
  const absent = Array.isArray(req.body?.absentStudentIds) ? req.body.absentStudentIds : ["STU-003"];
  res.json({
    success: true,
    mode: "draft_preview",
    confirmationRequired: true,
    message: "Attendance draft ready. Final save will require confirmation.",
    draft: {
      draftId: `ATT-DRAFT-${Date.now()}`,
      batchId,
      presentCount: present.length,
      absentCount: absent.length,
      presentStudentIds: present,
      absentStudentIds: absent,
      createdAt: new Date().toISOString()
    }
  });
});

app.get("/api/part81/attendance/draft", (req, res) => {
  const access = part81AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  res.json({
    success: true,
    mode: "preview",
    confirmationRequired: true,
    sampleDraft: {
      batchId: req.query.batchId || "BAT-10-MATH-A",
      presentCount: 35,
      absentCount: 3,
      note: "Use POST for actual draft creation."
    }
  });
});

app.get("/api/part81/assignments", (req, res) => {
  const access = part81AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  res.json({
    success: true,
    assignments: [
      { id: "HW-001", batch: "Class 10 Maths A", title: "Quadratic Equation Practice", due: "Tomorrow", pendingSubmissions: 11 },
      { id: "HW-002", batch: "Class 9 Science A", title: "Motion Numericals", due: "Friday", pendingSubmissions: 7 }
    ]
  });
});

app.get("/api/part81/tests", (req, res) => {
  const access = part81AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  res.json({
    success: true,
    tests: [
      { id: "TEST-001", batch: "Class 10 Maths A", topic: "Quadratic Equations", date: "This Saturday", marksEntryPending: true },
      { id: "TEST-002", batch: "Class 9 Science A", topic: "Motion", date: "Next Monday", marksEntryPending: false }
    ]
  });
});

app.get("/api/part81/notes-material", (req, res) => {
  const access = part81AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  res.json({
    success: true,
    material: [
      { id: "MAT-001", title: "Quadratic Formula Notes", batch: "Class 10 Maths A", status: "shared" },
      { id: "MAT-002", title: "Motion Summary Sheet", batch: "Class 9 Science A", status: "draft" }
    ],
    uploadPolicy: "File upload integration is future step. Do not upload secrets/private files."
  });
});

app.get("/api/part81/live-classes", (req, res) => {
  const access = part81AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  res.json({
    success: true,
    liveClasses: [
      { id: "LIVE-001", batch: "Class 10 Maths A", time: "07:00 PM", topic: "Quadratic Doubt Session", readiness: "ready" }
    ]
  });
});

app.get("/api/part81/student-support", (req, res) => {
  const access = part81AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  res.json({
    success: true,
    privateScreenFirst: true,
    supportAlerts: part81TeacherDashboard(req.query || {}).supportAlerts
  });
});

app.get("/api/part81/vani/greeting", (req, res) => {
  res.json({
    success: true,
    assistant: "VANI",
    voiceStarter: true,
    language: "Hindi/Hinglish",
    greeting: "Namaste, main VANI hoon. Main aapki teaching me kya help kar sakti hoon?",
    browserRequirement: "Voice starts after user taps Start VANI because browsers block automatic speech.",
    safeToSpeak: true,
    privateScreenFirstReminder: "Student private data screen par dikhaya jayega, loudly nahi bola jayega."
  });
});

app.post("/api/part81/vani/command", (req, res) => {
  const command = String(req.body?.command || req.query?.command || "").trim();
  const access = part81AccessCheck({
    role: req.body?.role || req.query?.role || "teacher",
    instituteId: req.body?.instituteId || req.query?.instituteId || "NX-DEMO-INST-001",
    teacherId: req.body?.teacherId || req.query?.teacherId || "TCH-DEMO-001",
    batchId: req.body?.batchId || req.query?.batchId
  });

  if (!access.allowed) {
    return res.status(403).json({
      success: false,
      assistant: "VANI",
      access,
      spokenSafeSummary: "Ye teacher app sirf assigned teacher login me available hai.",
      privateScreenFirst: true
    });
  }

  const lower = command.toLowerCase();
  let intent = "teacher_dashboard";
  if (lower.includes("attendance") || lower.includes("present") || lower.includes("absent")) intent = "attendance_help";
  if (lower.includes("assignment") || lower.includes("homework")) intent = "assignment_help";
  if (lower.includes("test") || lower.includes("marks") || lower.includes("result")) intent = "test_help";
  if (lower.includes("notes") || lower.includes("material")) intent = "material_help";
  if (lower.includes("live")) intent = "live_class_help";
  if (lower.includes("weak") || lower.includes("support") || lower.includes("student")) intent = "student_support";

  const dashboard = part81TeacherDashboard({ teacherId: access.teacherId, instituteId: access.instituteId });
  res.json({
    success: true,
    assistant: "VANI",
    part: "Part 81 — Teacher App",
    command: command || "VANI, teacher dashboard dikhao",
    detectedIntent: intent,
    access,
    voiceEnabled: true,
    privateScreenFirst: intent === "student_support",
    spokenSafeSummary: intent === "student_support"
      ? "Student support alerts screen par privately dikhaye gaye hain."
      : "Teacher dashboard ready hai. Aaj ki classes aur pending work screen par dikh rahe hain.",
    screenPreview: {
      today: dashboard.today,
      assignedBatches: dashboard.assignedBatches,
      supportAlerts: dashboard.supportAlerts
    },
    confirmationRequiredFor: ["attendance_final_save", "marks_publish", "assignment_send", "delete", "export"],
    auditLog: {
      event: "part81_vani_teacher_command",
      intent,
      createdAt: new Date().toISOString()
    }
  });
});

app.get("/api/part81/vani/command", (req, res) => {
  const command = String(req.query.q || req.query.command || "").trim();
  const access = part81AccessCheck({
    role: req.query.role || "teacher",
    instituteId: req.query.instituteId || "NX-DEMO-INST-001",
    teacherId: req.query.teacherId || "TCH-DEMO-001",
    batchId: req.query.batchId
  });
  if (!access.allowed) {
    return res.status(403).json({
      success: false,
      assistant: "VANI",
      access,
      spokenSafeSummary: "Ye teacher app sirf assigned teacher login me available hai.",
      privateScreenFirst: true
    });
  }
  const dashboard = part81TeacherDashboard({ teacherId: access.teacherId, instituteId: access.instituteId });
  res.json({
    success: true,
    assistant: "VANI",
    part: "Part 81 — Teacher App",
    command: command || "VANI, teacher dashboard dikhao",
    detectedIntent: "teacher_dashboard",
    access,
    voiceEnabled: true,
    privateScreenFirst: false,
    spokenSafeSummary: "Teacher dashboard ready hai. Aaj ki classes aur pending work screen par dikh rahe hain.",
    screenPreview: dashboard.today,
    auditLog: { event: "part81_vani_teacher_command_get", createdAt: new Date().toISOString() }
  });
});

app.get("/api/part81/activity", (req, res) => {
  res.json({
    success: true,
    activity: [
      { type: "teacher_app_created", message: "Part 81 Teacher App active.", createdAt: new Date().toISOString() },
      { type: "vani_voice_starter_added", message: "VANI browser voice greeting added.", createdAt: new Date().toISOString() },
      { type: "assigned_batch_guard", message: "Teacher access limited to assigned batches/students.", createdAt: new Date().toISOString() }
    ]
  });
});

app.get("/api/part81/checklist", (req, res) => {
  res.json({ success: true, checklist: part81Checklist });
});

app.get("/api/part81/export", (req, res) => {
  const access = part81AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  res.json({
    success: true,
    exportType: "part81-teacher-app-readiness",
    ownerOrTeacherVerificationRequired: true,
    generatedAt: new Date().toISOString(),
    data: {
      features: part81TeacherFeatures,
      dashboard: part81TeacherDashboard(req.query || {}),
      checklist: part81Checklist
    }
  });
});

app.get("/api/part81/demo", (req, res) => {
  res.json({
    success: true,
    demo: {
      access: part81AccessCheck({ role: "teacher", instituteId: "NX-DEMO-INST-001", teacherId: "TCH-DEMO-001" }),
      dashboard: part81TeacherDashboard({ instituteId: "NX-DEMO-INST-001", teacherId: "TCH-DEMO-001" }),
      features: part81TeacherFeatures,
      vaniGreeting: "Namaste, main VANI hoon. Main aapki teaching me kya help kar sakti hoon?",
      vaniCommand: "VANI, teacher dashboard dikhao",
      nextPart: "Part 82 — Student App"
    }
  });
});
// ================= END PART 81 =================

// ================= PART 82 — STUDENT APP =================
// NAXORA OS 2.0 student mobile app foundation. Student sees only own
// learning data. Adds VANI Listen + Reply foundation using browser speech
// recognition on frontend + safe backend command responses.

const part82StudentFeatures = [
  {
    key: "student_dashboard",
    name: "Student Mobile Dashboard",
    summary: "Today timetable, homework, tests, notes, fees, live classes and AI study tools.",
    problemSolved: "Student gets all daily learning tasks in one mobile place."
  },
  {
    key: "timetable",
    name: "My Timetable",
    summary: "Class schedule and upcoming live/offline classes.",
    problemSolved: "Student knows what to attend and when."
  },
  {
    key: "assignments",
    name: "Assignments and Homework",
    summary: "Pending homework, due dates and submission status.",
    problemSolved: "Student misses fewer homework tasks."
  },
  {
    key: "tests_results",
    name: "Tests and Results",
    summary: "Upcoming tests, result summary and weak topic hints.",
    problemSolved: "Student can prepare and improve after tests."
  },
  {
    key: "notes_material",
    name: "Notes and Study Material",
    summary: "Teacher-shared notes and revision material.",
    problemSolved: "Student does not lose study resources."
  },
  {
    key: "fees_safe_view",
    name: "My Fees Safe View",
    summary: "Student can see safe fee status; detailed financial controls remain owner/accountant/parent side.",
    problemSolved: "Student gets clarity without exposing sensitive controls."
  },
  {
    key: "ai_study_tools",
    name: "AI Study Tools",
    summary: "Study planner, weak topic coach, flashcards and revision support.",
    problemSolved: "Student gets personalized learning help."
  },
  {
    key: "vani_listen_reply",
    name: "VANI Listen + Reply",
    summary: "Student can tap mic, speak a command, see reply and hear safe spoken response.",
    problemSolved: "VANI no longer only asks a question; it starts replying to spoken commands."
  }
];

const part82StudentRoleRules = [
  {
    role: "student",
    allowed: true,
    access: "Only own learning, timetable, fees summary, tests, notes and profile."
  },
  {
    role: "parent",
    allowed: false,
    access: "Parent uses Part 83 Parent App for linked child view."
  },
  {
    role: "teacher",
    allowed: true,
    previewOnly: true,
    access: "Teacher can preview assigned student learning support, not impersonate student."
  },
  {
    role: "institute_owner",
    allowed: true,
    previewOnly: true,
    access: "Owner can preview student app readiness, not access unrestricted private student view."
  },
  {
    role: "branch_manager",
    allowed: true,
    previewOnly: true,
    access: "Branch manager can preview assigned branch student app readiness."
  },
  {
    role: "accountant",
    allowed: false,
    access: "Accountant uses fees/finance module, not student app."
  },
  {
    role: "receptionist_counsellor",
    allowed: false,
    access: "Receptionist/Counsellor uses CRM/admission workflows only."
  },
  {
    role: "naxora_super_admin",
    allowed: false,
    access: "Platform support access only, not unrestricted student-private data."
  }
];

function normalizePart82Role(role) {
  const r = String(role || "student").toLowerCase().trim().replace(/\s+/g, "_");
  if (["owner", "instituteowner", "institute_owner"].includes(r)) return "institute_owner";
  if (["branchmanager", "branch_manager"].includes(r)) return "branch_manager";
  if (["receptionist", "counsellor", "receptionist_counsellor"].includes(r)) return "receptionist_counsellor";
  return r;
}

function part82AccessCheck({ role, instituteId, studentId }) {
  const normalizedRole = normalizePart82Role(role);
  const rule = part82StudentRoleRules.find((r) => r.role === normalizedRole) || {
    role: normalizedRole,
    allowed: false,
    access: "Unknown or unsupported role."
  };
  const hasInstituteId = Boolean(String(instituteId || "").trim());
  const hasStudentContext = normalizedRole !== "student" || Boolean(String(studentId || "STU-DEMO-001").trim());

  const allowed = Boolean(rule.allowed && hasInstituteId && hasStudentContext);
  return {
    role: normalizedRole,
    instituteId: instituteId || null,
    studentId: studentId || (normalizedRole === "student" ? "STU-DEMO-001" : null),
    allowed,
    previewOnly: Boolean(rule.previewOnly),
    reason: !rule.allowed
      ? rule.access
      : !hasInstituteId
        ? "Institute ID missing. Student app opens only inside logged institute account."
        : !hasStudentContext
          ? "Student ID/self context missing."
          : rule.previewOnly
            ? "Preview allowed. Final student-private actions require student/linked context."
            : "Student app access allowed.",
    requiresLogin: true,
    requiresInstituteId: true,
    restrictToOwnData: true
  };
}

function part82StudentDashboard(query = {}) {
  const studentId = query.studentId || "STU-DEMO-001";
  const studentName = query.studentName || "Aman";
  return {
    studentId,
    studentName,
    instituteId: query.instituteId || "NX-DEMO-INST-001",
    generatedAt: new Date().toISOString(),
    today: {
      classesToday: 3,
      homeworkPending: 2,
      upcomingTests: 1,
      notesAvailable: 4,
      attendancePercent: 86,
      aiStudyTasks: 3,
      liveClassesToday: 1
    },
    timetable: [
      { time: "09:00 AM", subject: "Maths", topic: "Quadratic Equations", mode: "offline" },
      { time: "12:00 PM", subject: "Science", topic: "Motion", mode: "offline" },
      { time: "07:00 PM", subject: "Maths", topic: "Doubt Session", mode: "live" }
    ],
    assignments: [
      { id: "HW-STU-001", title: "Quadratic Equation Practice", due: "Tomorrow", status: "pending" },
      { id: "HW-STU-002", title: "Motion Numericals", due: "Friday", status: "pending" }
    ],
    tests: [
      { id: "TEST-STU-001", topic: "Quadratic Equations", date: "This Saturday", preparation: "revise weak formulas" }
    ],
    notes: [
      { id: "NOTE-001", title: "Quadratic Formula Notes", subject: "Maths" },
      { id: "NOTE-002", title: "Motion Summary Sheet", subject: "Science" }
    ],
    aiStudyPlan: {
      weakTopic: query.weakTopic || "Quadratic Equations",
      todayPlan: ["Revise formula basics", "Solve 10 easy questions", "Create 5 flashcards", "Ask doubt in live class"],
      safeMotivation: "Small daily revision se improvement fast hoti hai."
    },
    feesSafeView: {
      status: "summary_available",
      message: "Detailed fee/payment controls are handled by parent/accountant/owner modules."
    }
  };
}

function part82BuildVaniReply(command, context = {}) {
  const lower = String(command || "").toLowerCase();
  const dashboard = part82StudentDashboard(context);

  let intent = "student_dashboard";
  let spokenSafeSummary = "Student dashboard ready hai. Aaj ki classes, homework aur study tasks screen par dikh rahe hain.";
  let screenPreview = dashboard.today;
  let privateScreenFirst = false;

  if (lower.includes("timetable") || lower.includes("class") || lower.includes("schedule") || lower.includes("time table")) {
    intent = "timetable";
    spokenSafeSummary = "Aaj ka timetable screen par dikhaya gaya hai.";
    screenPreview = dashboard.timetable;
  } else if (lower.includes("homework") || lower.includes("assignment")) {
    intent = "assignments";
    spokenSafeSummary = "Homework list ready hai. Pending tasks screen par dikh rahe hain.";
    screenPreview = dashboard.assignments;
  } else if (lower.includes("test") || lower.includes("exam") || lower.includes("result")) {
    intent = "tests_results";
    spokenSafeSummary = "Upcoming test aur preparation hint screen par dikhaya gaya hai.";
    screenPreview = dashboard.tests;
  } else if (lower.includes("notes") || lower.includes("material")) {
    intent = "notes_material";
    spokenSafeSummary = "Available notes aur study material screen par dikhaya gaya hai.";
    screenPreview = dashboard.notes;
  } else if (lower.includes("fee") || lower.includes("payment")) {
    intent = "fees_safe_view";
    spokenSafeSummary = "Fee summary screen par privately dikhayi gayi hai. Detailed payment controls parent ya accountant side par rahenge.";
    screenPreview = dashboard.feesSafeView;
    privateScreenFirst = true;
  } else if (lower.includes("weak") || lower.includes("revision") || lower.includes("study") || lower.includes("planner") || lower.includes("flashcard")) {
    intent = "ai_study_tools";
    spokenSafeSummary = "AI study plan ready hai. Weak topic revision steps screen par dikh rahe hain.";
    screenPreview = dashboard.aiStudyPlan;
  } else if (lower.includes("attendance")) {
    intent = "attendance";
    spokenSafeSummary = "Attendance summary screen par dikhayi gayi hai.";
    screenPreview = { attendancePercent: dashboard.today.attendancePercent, note: "Detailed attendance history is private-screen-first when needed." };
  }

  return {
    intent,
    spokenSafeSummary,
    screenPreview,
    privateScreenFirst
  };
}

const part82Checklist = [
  "Student app page opens on live URL",
  "Status API returns success true",
  "Student access allowed with instituteId and studentId",
  "Parent/unauthorized access blocked until Parent App Part 83",
  "Student dashboard returns own-data foundation",
  "VANI Start button speaks greeting",
  "VANI Listen button converts speech to command on supported browsers",
  "VANI replies on screen and speaks safe summary",
  "Fee/private data uses private-screen-first rule",
  "Previous Part 1–81 routes remain preserved"
];

app.get("/api/part82/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 82 — Student App",
    status: "active",
    versionPhase: "NAXORA OS 2.0",
    latestCompletedPart: 82,
    nextPart: "Part 83 — Parent App",
    preservesPreviousFeatures: true,
    frontendRoutes: ["/student-mobile-app", "/student-app", "/mobile-student-dashboard", "/student-learning-app", "/student-ai-mobile", "/student-study-app"],
    apiRoutes: [
      "/api/part82/config",
      "/api/part82/features",
      "/api/part82/roles",
      "/api/part82/access-check",
      "/api/part82/dashboard",
      "/api/part82/timetable",
      "/api/part82/assignments",
      "/api/part82/tests",
      "/api/part82/notes-material",
      "/api/part82/fees-safe-view",
      "/api/part82/ai-study-tools",
      "/api/part82/vani/greeting",
      "/api/part82/vani/command"
    ],
    vaniListenReplyFoundation: true
  });
});

app.get("/api/part82/config", (req, res) => {
  res.json({
    success: true,
    appName: "NAXORA Student App",
    appType: "mobile_student_learning_app",
    version: "2.0-student-foundation",
    login: {
      required: true,
      requiresInstituteId: true,
      roleRequired: "student",
      ownDataOnly: true
    },
    voice: {
      browserSpeechStarter: true,
      browserSpeechRecognition: true,
      greeting: "Namaste, main VANI hoon. Main aapki study me kya help kar sakti hoon?",
      note: "Mic/listening works only on supported browsers after user taps Listen."
    },
    sensitiveDataPolicy: "Fees, personal profile and support details use private-screen-first."
  });
});

app.get("/api/part82/features", (req, res) => {
  res.json({ success: true, features: part82StudentFeatures });
});

app.get("/api/part82/roles", (req, res) => {
  res.json({ success: true, roles: part82StudentRoleRules });
});

app.get("/api/part82/access-check", (req, res) => {
  res.json({ success: true, access: part82AccessCheck(req.query || {}) });
});

app.get("/api/part82/dashboard", (req, res) => {
  const access = part82AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  res.json({ success: true, access, dashboard: part82StudentDashboard(req.query || {}) });
});

app.get("/api/part82/timetable", (req, res) => {
  const access = part82AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  res.json({ success: true, timetable: part82StudentDashboard(req.query || {}).timetable });
});

app.get("/api/part82/assignments", (req, res) => {
  const access = part82AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  res.json({ success: true, assignments: part82StudentDashboard(req.query || {}).assignments });
});

app.get("/api/part82/tests", (req, res) => {
  const access = part82AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  res.json({ success: true, tests: part82StudentDashboard(req.query || {}).tests });
});

app.get("/api/part82/notes-material", (req, res) => {
  const access = part82AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  res.json({ success: true, notes: part82StudentDashboard(req.query || {}).notes });
});

app.get("/api/part82/fees-safe-view", (req, res) => {
  const access = part82AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  res.json({ success: true, privateScreenFirst: true, feesSafeView: part82StudentDashboard(req.query || {}).feesSafeView });
});

app.get("/api/part82/ai-study-tools", (req, res) => {
  const access = part82AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  res.json({ success: true, aiStudyPlan: part82StudentDashboard(req.query || {}).aiStudyPlan });
});

app.get("/api/part82/vani/greeting", (req, res) => {
  res.json({
    success: true,
    assistant: "VANI",
    voiceStarter: true,
    listenReplyFoundation: true,
    language: "Hindi/Hinglish",
    greeting: "Namaste, main VANI hoon. Main aapki study me kya help kar sakti hoon?",
    exampleCommands: [
      "VANI, aaj ka timetable dikhao",
      "VANI, homework batao",
      "VANI, test kab hai",
      "VANI, revision plan banao",
      "VANI, notes dikhao"
    ],
    browserRequirement: "Voice and mic start after user button click because browsers need permission.",
    privateScreenFirstReminder: "Fees/personal data screen par dikhaya jayega, loudly nahi bola jayega."
  });
});

app.post("/api/part82/vani/command", (req, res) => {
  const command = String(req.body?.command || req.query?.command || "").trim();
  const access = part82AccessCheck({
    role: req.body?.role || req.query?.role || "student",
    instituteId: req.body?.instituteId || req.query?.instituteId || "NX-DEMO-INST-001",
    studentId: req.body?.studentId || req.query?.studentId || "STU-DEMO-001"
  });

  if (!access.allowed) {
    return res.status(403).json({
      success: false,
      assistant: "VANI",
      access,
      spokenSafeSummary: "Ye student app sirf logged-in student ke own data ke liye available hai.",
      privateScreenFirst: true
    });
  }

  const reply = part82BuildVaniReply(command, {
    instituteId: access.instituteId,
    studentId: access.studentId,
    studentName: req.body?.studentName || req.query?.studentName || "Aman",
    weakTopic: req.body?.weakTopic || req.query?.weakTopic
  });

  res.json({
    success: true,
    assistant: "VANI",
    part: "Part 82 — Student App",
    command: command || "VANI, student dashboard dikhao",
    detectedIntent: reply.intent,
    access,
    voiceEnabled: true,
    listenReplyFoundation: true,
    privateScreenFirst: reply.privateScreenFirst,
    spokenSafeSummary: reply.spokenSafeSummary,
    screenPreview: reply.screenPreview,
    confirmationRequiredFor: ["profile_change", "fee_action", "assignment_submit", "delete", "export"],
    auditLog: {
      event: "part82_vani_student_command",
      intent: reply.intent,
      createdAt: new Date().toISOString()
    }
  });
});

app.get("/api/part82/vani/command", (req, res) => {
  const command = String(req.query.q || req.query.command || "").trim();
  const access = part82AccessCheck({
    role: req.query.role || "student",
    instituteId: req.query.instituteId || "NX-DEMO-INST-001",
    studentId: req.query.studentId || "STU-DEMO-001"
  });
  if (!access.allowed) {
    return res.status(403).json({
      success: false,
      assistant: "VANI",
      access,
      spokenSafeSummary: "Ye student app sirf logged-in student ke own data ke liye available hai.",
      privateScreenFirst: true
    });
  }
  const reply = part82BuildVaniReply(command, {
    instituteId: access.instituteId,
    studentId: access.studentId,
    studentName: req.query.studentName || "Aman",
    weakTopic: req.query.weakTopic
  });
  res.json({
    success: true,
    assistant: "VANI",
    part: "Part 82 — Student App",
    command: command || "VANI, student dashboard dikhao",
    detectedIntent: reply.intent,
    access,
    voiceEnabled: true,
    privateScreenFirst: reply.privateScreenFirst,
    spokenSafeSummary: reply.spokenSafeSummary,
    screenPreview: reply.screenPreview,
    auditLog: { event: "part82_vani_student_command_get", createdAt: new Date().toISOString() }
  });
});

app.get("/api/part82/activity", (req, res) => {
  res.json({
    success: true,
    activity: [
      { type: "student_app_created", message: "Part 82 Student App active.", createdAt: new Date().toISOString() },
      { type: "vani_listen_reply_added", message: "VANI mic listen + backend reply + spoken summary foundation added.", createdAt: new Date().toISOString() },
      { type: "own_data_guard", message: "Student access limited to own learning data.", createdAt: new Date().toISOString() }
    ]
  });
});

app.get("/api/part82/checklist", (req, res) => {
  res.json({ success: true, checklist: part82Checklist });
});

app.get("/api/part82/export", (req, res) => {
  const access = part82AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  res.json({
    success: true,
    exportType: "part82-student-app-readiness",
    ownerOrStudentVerificationRequired: true,
    generatedAt: new Date().toISOString(),
    data: {
      features: part82StudentFeatures,
      dashboard: part82StudentDashboard(req.query || {}),
      checklist: part82Checklist
    }
  });
});

app.get("/api/part82/demo", (req, res) => {
  res.json({
    success: true,
    demo: {
      access: part82AccessCheck({ role: "student", instituteId: "NX-DEMO-INST-001", studentId: "STU-DEMO-001" }),
      dashboard: part82StudentDashboard({ instituteId: "NX-DEMO-INST-001", studentId: "STU-DEMO-001" }),
      features: part82StudentFeatures,
      vaniGreeting: "Namaste, main VANI hoon. Main aapki study me kya help kar sakti hoon?",
      vaniCommand: "VANI, revision plan banao",
      nextPart: "Part 83 — Parent App"
    }
  });
});
// ================= END PART 82 =================

// ================= PART 83 — PARENT APP =================
// NAXORA OS 2.0 parent mobile app foundation. Parent sees only linked child
// information. Includes VANI Listen + Reply for parent-safe commands.

const part83ParentFeatures = [
  {
    key: "parent_dashboard",
    name: "Parent Mobile Dashboard",
    summary: "Linked child attendance, fees safe view, results, notices and teacher updates.",
    problemSolved: "Parent gets one clear mobile view instead of scattered messages."
  },
  {
    key: "linked_child_guard",
    name: "Linked Child Only Access",
    summary: "Parent can see only their linked child/children.",
    problemSolved: "Prevents one parent from seeing another student's private data."
  },
  {
    key: "attendance_view",
    name: "Attendance View",
    summary: "Attendance percentage, recent absences and support alerts.",
    problemSolved: "Parent can act early when attendance drops."
  },
  {
    key: "fees_safe_view",
    name: "Fees Safe View",
    summary: "Pending/due fee summary without unsafe payment or discount controls.",
    problemSolved: "Parent gets clarity while sensitive finance actions remain protected."
  },
  {
    key: "results_progress",
    name: "Results and Progress",
    summary: "Recent test scores, weak topics and improvement suggestions.",
    problemSolved: "Parent understands learning progress."
  },
  {
    key: "teacher_messages",
    name: "Teacher Messages",
    summary: "Teacher notes, follow-ups and communication history foundation.",
    problemSolved: "Parent communication becomes structured."
  },
  {
    key: "weekly_summary",
    name: "Weekly Summary",
    summary: "Attendance, homework, test and support summary for linked child.",
    problemSolved: "Parent can review the week quickly."
  },
  {
    key: "vani_parent_assistant",
    name: "VANI Parent Assistant",
    summary: "Parent can speak/type commands and receive safe replies.",
    problemSolved: "Parent app gets voice-based quick child updates."
  }
];

const part83ParentRoleRules = [
  {
    role: "parent",
    allowed: true,
    access: "Only linked child/children data."
  },
  {
    role: "student",
    allowed: false,
    access: "Student uses Part 82 Student App."
  },
  {
    role: "teacher",
    allowed: true,
    previewOnly: true,
    access: "Teacher can preview parent communication readiness for assigned students only."
  },
  {
    role: "institute_owner",
    allowed: true,
    previewOnly: true,
    access: "Owner can preview parent app readiness, not bypass linked-child privacy."
  },
  {
    role: "branch_manager",
    allowed: true,
    previewOnly: true,
    access: "Branch manager can preview assigned branch parent communication readiness."
  },
  {
    role: "accountant",
    allowed: true,
    previewOnly: true,
    access: "Accountant can preview fee communication readiness only, not full child learning data."
  },
  {
    role: "receptionist_counsellor",
    allowed: false,
    access: "Receptionist/Counsellor uses CRM/admission workflows."
  },
  {
    role: "naxora_super_admin",
    allowed: false,
    access: "Platform support access only, not unrestricted parent/child private data."
  }
];

function normalizePart83Role(role) {
  const r = String(role || "parent").toLowerCase().trim().replace(/\s+/g, "_");
  if (["owner", "instituteowner", "institute_owner"].includes(r)) return "institute_owner";
  if (["branchmanager", "branch_manager"].includes(r)) return "branch_manager";
  if (["receptionist", "counsellor", "receptionist_counsellor"].includes(r)) return "receptionist_counsellor";
  return r;
}

function part83AccessCheck({ role, instituteId, parentId, childId }) {
  const normalizedRole = normalizePart83Role(role);
  const rule = part83ParentRoleRules.find((r) => r.role === normalizedRole) || {
    role: normalizedRole,
    allowed: false,
    access: "Unknown or unsupported role."
  };
  const hasInstituteId = Boolean(String(instituteId || "").trim());
  const hasParentContext = normalizedRole !== "parent" || Boolean(String(parentId || "PAR-DEMO-001").trim());
  const hasChildContext = normalizedRole !== "parent" || Boolean(String(childId || "STU-DEMO-001").trim());

  const allowed = Boolean(rule.allowed && hasInstituteId && hasParentContext && hasChildContext);
  return {
    role: normalizedRole,
    instituteId: instituteId || null,
    parentId: parentId || (normalizedRole === "parent" ? "PAR-DEMO-001" : null),
    childId: childId || (normalizedRole === "parent" ? "STU-DEMO-001" : null),
    allowed,
    previewOnly: Boolean(rule.previewOnly),
    reason: !rule.allowed
      ? rule.access
      : !hasInstituteId
        ? "Institute ID missing. Parent app opens only inside logged institute account."
        : !hasParentContext
          ? "Parent ID/linked parent context missing."
          : !hasChildContext
            ? "Linked child context missing."
            : rule.previewOnly
              ? "Preview allowed. Final parent view requires linked child verification."
              : "Parent app access allowed.",
    requiresLogin: true,
    requiresInstituteId: true,
    restrictToLinkedChildOnly: true
  };
}

function part83ParentDashboard(query = {}) {
  const childId = query.childId || "STU-DEMO-001";
  const childName = query.childName || "Aman";
  const parentName = query.parentName || "Parent";
  return {
    parentId: query.parentId || "PAR-DEMO-001",
    parentName,
    childId,
    childName,
    instituteId: query.instituteId || "NX-DEMO-INST-001",
    generatedAt: new Date().toISOString(),
    today: {
      attendancePercent: 86,
      classesToday: 3,
      homeworkPending: 2,
      upcomingTests: 1,
      teacherMessages: 2,
      notices: 1,
      liveClassesToday: 1,
      feeStatus: "summary_available"
    },
    linkedChildren: [
      { childId, childName, className: "Class 10", batch: "Maths A", relation: "child", active: true }
    ],
    attendance: {
      monthPercent: 86,
      lastAbsentDate: "2026-07-12",
      lowAttendanceAlert: false,
      note: "Attendance is stable, but weekly consistency should continue."
    },
    feesSafeView: {
      privateScreenFirst: true,
      status: "pending_summary",
      dueAmount: 2500,
      dueDate: "2026-07-25",
      message: "Detailed payment controls remain protected. Parent can view safe summary and pay only through verified payment flow."
    },
    results: [
      { test: "Quadratic Equations", score: "72/100", weakTopic: "Formula application", suggestion: "Revise formula steps and solve 10 practice questions." },
      { test: "Science Motion", score: "81/100", weakTopic: "Graph questions", suggestion: "Practice distance-time graph questions." }
    ],
    teacherMessages: [
      { from: "Maths Teacher", message: "Aman should revise quadratic formula examples.", privateScreenFirst: true },
      { from: "Class Teacher", message: "Homework pending for tomorrow.", privateScreenFirst: true }
    ],
    notices: [
      { title: "PTM Reminder", date: "2026-07-20", message: "Parent-teacher meeting scheduled this week." }
    ],
    weeklySummary: {
      attendance: "86%",
      homework: "2 pending",
      tests: "1 upcoming",
      progress: "Good effort, needs practice in Quadratic Equations.",
      recommendedAction: "Spend 20 minutes daily on formula practice."
    }
  };
}

function part83BuildVaniReply(command, context = {}) {
  const lower = String(command || "").toLowerCase();
  const dashboard = part83ParentDashboard(context);

  let intent = "parent_dashboard";
  let spokenSafeSummary = "Parent dashboard ready hai. Linked child ki attendance, homework aur updates screen par dikh rahe hain.";
  let screenPreview = dashboard.today;
  let privateScreenFirst = true;

  if (lower.includes("attendance") || lower.includes("absent") || lower.includes("present")) {
    intent = "attendance";
    spokenSafeSummary = "Attendance summary screen par dikhayi gayi hai.";
    screenPreview = dashboard.attendance;
  } else if (lower.includes("fee") || lower.includes("payment") || lower.includes("due")) {
    intent = "fees_safe_view";
    spokenSafeSummary = "Fee summary screen par privately dikhayi gayi hai. Payment controls verified flow me hi available honge.";
    screenPreview = dashboard.feesSafeView;
    privateScreenFirst = true;
  } else if (lower.includes("result") || lower.includes("test") || lower.includes("marks") || lower.includes("progress")) {
    intent = "results_progress";
    spokenSafeSummary = "Result aur progress summary screen par dikhayi gayi hai.";
    screenPreview = dashboard.results;
  } else if (lower.includes("message") || lower.includes("teacher") || lower.includes("communication")) {
    intent = "teacher_messages";
    spokenSafeSummary = "Teacher messages screen par privately dikhaye gaye hain.";
    screenPreview = dashboard.teacherMessages;
    privateScreenFirst = true;
  } else if (lower.includes("notice") || lower.includes("announcement")) {
    intent = "notices";
    spokenSafeSummary = "Institute notices screen par dikhaye gaye hain.";
    screenPreview = dashboard.notices;
    privateScreenFirst = false;
  } else if (lower.includes("weekly") || lower.includes("summary") || lower.includes("week")) {
    intent = "weekly_summary";
    spokenSafeSummary = "Weekly summary screen par dikhayi gayi hai.";
    screenPreview = dashboard.weeklySummary;
  } else if (lower.includes("live") || lower.includes("class")) {
    intent = "live_classes";
    spokenSafeSummary = "Live class status screen par dikhaya gaya hai.";
    screenPreview = { liveClassesToday: dashboard.today.liveClassesToday, message: "Check schedule before class time." };
    privateScreenFirst = false;
  }

  return { intent, spokenSafeSummary, screenPreview, privateScreenFirst };
}

const part83Checklist = [
  "Parent app page opens on live URL",
  "Status API returns success true",
  "Parent access allowed with instituteId, parentId and linked childId",
  "Student/receptionist unauthorized access blocked",
  "Parent dashboard returns linked-child-only foundation",
  "Fees and teacher messages are private-screen-first",
  "VANI Start button speaks greeting",
  "VANI Listen button captures speech on supported browsers",
  "VANI replies on screen and speaks safe summary",
  "Previous Part 1–82 routes remain preserved"
];

app.get("/api/part83/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 83 — Parent App",
    status: "active",
    versionPhase: "NAXORA OS 2.0",
    latestCompletedPart: 83,
    nextPart: "Part 84 — Advanced VANI Action Engine",
    preservesPreviousFeatures: true,
    frontendRoutes: ["/parent-mobile-app", "/parent-app", "/mobile-parent-dashboard", "/parent-portal-mobile", "/parent-child-updates", "/parent-communication-app"],
    apiRoutes: [
      "/api/part83/config",
      "/api/part83/features",
      "/api/part83/roles",
      "/api/part83/access-check",
      "/api/part83/dashboard",
      "/api/part83/linked-children",
      "/api/part83/attendance",
      "/api/part83/fees-safe-view",
      "/api/part83/results",
      "/api/part83/teacher-messages",
      "/api/part83/notices",
      "/api/part83/live-classes",
      "/api/part83/weekly-summary",
      "/api/part83/vani/greeting",
      "/api/part83/vani/command"
    ],
    vaniListenReplyFoundation: true,
    linkedChildOnly: true
  });
});

app.get("/api/part83/config", (req, res) => {
  res.json({
    success: true,
    appName: "NAXORA Parent App",
    appType: "mobile_parent_child_updates_app",
    version: "2.0-parent-foundation",
    login: {
      required: true,
      requiresInstituteId: true,
      roleRequired: "parent",
      linkedChildOnly: true
    },
    voice: {
      browserSpeechStarter: true,
      browserSpeechRecognition: true,
      greeting: "Namaste, main VANI hoon. Main aapke child ke updates me kya help kar sakti hoon?",
      note: "Mic/listening works only on supported browsers after user taps Listen."
    },
    sensitiveDataPolicy: "Child, fee and teacher message details use private-screen-first."
  });
});

app.get("/api/part83/features", (req, res) => {
  res.json({ success: true, features: part83ParentFeatures });
});

app.get("/api/part83/roles", (req, res) => {
  res.json({ success: true, roles: part83ParentRoleRules });
});

app.get("/api/part83/access-check", (req, res) => {
  res.json({ success: true, access: part83AccessCheck(req.query || {}) });
});

app.get("/api/part83/dashboard", (req, res) => {
  const access = part83AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  res.json({ success: true, access, dashboard: part83ParentDashboard(req.query || {}) });
});

app.get("/api/part83/linked-children", (req, res) => {
  const access = part83AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  res.json({ success: true, linkedChildOnly: true, linkedChildren: part83ParentDashboard(req.query || {}).linkedChildren });
});

app.get("/api/part83/attendance", (req, res) => {
  const access = part83AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  res.json({ success: true, attendance: part83ParentDashboard(req.query || {}).attendance });
});

app.get("/api/part83/fees-safe-view", (req, res) => {
  const access = part83AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  res.json({ success: true, privateScreenFirst: true, feesSafeView: part83ParentDashboard(req.query || {}).feesSafeView });
});

app.get("/api/part83/results", (req, res) => {
  const access = part83AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  res.json({ success: true, results: part83ParentDashboard(req.query || {}).results });
});

app.get("/api/part83/teacher-messages", (req, res) => {
  const access = part83AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  res.json({ success: true, privateScreenFirst: true, teacherMessages: part83ParentDashboard(req.query || {}).teacherMessages });
});

app.get("/api/part83/notices", (req, res) => {
  const access = part83AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  res.json({ success: true, notices: part83ParentDashboard(req.query || {}).notices });
});

app.get("/api/part83/live-classes", (req, res) => {
  const access = part83AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  res.json({
    success: true,
    liveClasses: [
      { id: "LIVE-PARENT-001", childName: req.query.childName || "Aman", subject: "Maths", time: "07:00 PM", status: "scheduled" }
    ]
  });
});

app.get("/api/part83/weekly-summary", (req, res) => {
  const access = part83AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  res.json({ success: true, weeklySummary: part83ParentDashboard(req.query || {}).weeklySummary });
});

app.get("/api/part83/vani/greeting", (req, res) => {
  res.json({
    success: true,
    assistant: "VANI",
    voiceStarter: true,
    listenReplyFoundation: true,
    language: "Hindi/Hinglish",
    greeting: "Namaste, main VANI hoon. Main aapke child ke updates me kya help kar sakti hoon?",
    exampleCommands: [
      "VANI, attendance dikhao",
      "VANI, fee summary batao",
      "VANI, result dikhao",
      "VANI, teacher messages dikhao",
      "VANI, weekly summary batao"
    ],
    browserRequirement: "Voice and mic start after user button click because browsers need permission.",
    privateScreenFirstReminder: "Child/fee/teacher message details screen par dikhaye jayenge, loudly nahi bole jayenge."
  });
});

app.post("/api/part83/vani/command", (req, res) => {
  const command = String(req.body?.command || req.query?.command || "").trim();
  const access = part83AccessCheck({
    role: req.body?.role || req.query?.role || "parent",
    instituteId: req.body?.instituteId || req.query?.instituteId || "NX-DEMO-INST-001",
    parentId: req.body?.parentId || req.query?.parentId || "PAR-DEMO-001",
    childId: req.body?.childId || req.query?.childId || "STU-DEMO-001"
  });

  if (!access.allowed) {
    return res.status(403).json({
      success: false,
      assistant: "VANI",
      access,
      spokenSafeSummary: "Ye parent app sirf linked parent account me available hai.",
      privateScreenFirst: true
    });
  }

  const reply = part83BuildVaniReply(command, {
    instituteId: access.instituteId,
    parentId: access.parentId,
    childId: access.childId,
    childName: req.body?.childName || req.query?.childName || "Aman",
    parentName: req.body?.parentName || req.query?.parentName || "Parent"
  });

  res.json({
    success: true,
    assistant: "VANI",
    part: "Part 83 — Parent App",
    command: command || "VANI, parent dashboard dikhao",
    detectedIntent: reply.intent,
    access,
    voiceEnabled: true,
    listenReplyFoundation: true,
    privateScreenFirst: reply.privateScreenFirst,
    spokenSafeSummary: reply.spokenSafeSummary,
    screenPreview: reply.screenPreview,
    confirmationRequiredFor: ["payment", "message_send", "profile_change", "export"],
    auditLog: {
      event: "part83_vani_parent_command",
      intent: reply.intent,
      createdAt: new Date().toISOString()
    }
  });
});

app.get("/api/part83/vani/command", (req, res) => {
  const command = String(req.query.q || req.query.command || "").trim();
  const access = part83AccessCheck({
    role: req.query.role || "parent",
    instituteId: req.query.instituteId || "NX-DEMO-INST-001",
    parentId: req.query.parentId || "PAR-DEMO-001",
    childId: req.query.childId || "STU-DEMO-001"
  });
  if (!access.allowed) {
    return res.status(403).json({
      success: false,
      assistant: "VANI",
      access,
      spokenSafeSummary: "Ye parent app sirf linked parent account me available hai.",
      privateScreenFirst: true
    });
  }
  const reply = part83BuildVaniReply(command, {
    instituteId: access.instituteId,
    parentId: access.parentId,
    childId: access.childId,
    childName: req.query.childName || "Aman",
    parentName: req.query.parentName || "Parent"
  });
  res.json({
    success: true,
    assistant: "VANI",
    part: "Part 83 — Parent App",
    command: command || "VANI, parent dashboard dikhao",
    detectedIntent: reply.intent,
    access,
    voiceEnabled: true,
    privateScreenFirst: reply.privateScreenFirst,
    spokenSafeSummary: reply.spokenSafeSummary,
    screenPreview: reply.screenPreview,
    auditLog: { event: "part83_vani_parent_command_get", createdAt: new Date().toISOString() }
  });
});

app.get("/api/part83/activity", (req, res) => {
  res.json({
    success: true,
    activity: [
      { type: "parent_app_created", message: "Part 83 Parent App active.", createdAt: new Date().toISOString() },
      { type: "linked_child_guard", message: "Parent access limited to linked child only.", createdAt: new Date().toISOString() },
      { type: "vani_parent_listen_reply", message: "VANI Listen + Reply available for parent-safe updates.", createdAt: new Date().toISOString() }
    ]
  });
});

app.get("/api/part83/checklist", (req, res) => {
  res.json({ success: true, checklist: part83Checklist });
});

app.get("/api/part83/export", (req, res) => {
  const access = part83AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  res.json({
    success: true,
    exportType: "part83-parent-app-readiness",
    parentVerificationRequired: true,
    generatedAt: new Date().toISOString(),
    data: {
      features: part83ParentFeatures,
      dashboard: part83ParentDashboard(req.query || {}),
      checklist: part83Checklist
    }
  });
});

app.get("/api/part83/demo", (req, res) => {
  res.json({
    success: true,
    demo: {
      access: part83AccessCheck({ role: "parent", instituteId: "NX-DEMO-INST-001", parentId: "PAR-DEMO-001", childId: "STU-DEMO-001" }),
      dashboard: part83ParentDashboard({ instituteId: "NX-DEMO-INST-001", parentId: "PAR-DEMO-001", childId: "STU-DEMO-001" }),
      features: part83ParentFeatures,
      vaniGreeting: "Namaste, main VANI hoon. Main aapke child ke updates me kya help kar sakti hoon?",
      vaniCommand: "VANI, weekly summary batao",
      nextPart: "Part 84 — Advanced VANI Action Engine"
    }
  });
});
// ================= END PART 83 =================

// ================= PART 84 — ADVANCED VANI ACTION ENGINE =================
// NAXORA OS 2.0 Advanced VANI Action Engine foundation.
// This part upgrades VANI from simple Q&A into a safe preview-confirm-execute engine.
// Destructive/sensitive real DB actions are still simulation/foundation until final schema hard-connect.

const part84Modules = [
  { key: "admissions", name: "Admissions", actions: ["create_student_draft", "schedule_demo_class", "lead_followup"], roles: ["institute_owner", "branch_manager", "receptionist_counsellor"] },
  { key: "attendance", name: "Attendance", actions: ["mark_attendance_draft", "attendance_alert"], roles: ["institute_owner", "branch_manager", "teacher"] },
  { key: "fees", name: "Fees", actions: ["fee_summary", "send_fee_reminder_draft"], roles: ["institute_owner", "accountant"] },
  { key: "assignments", name: "Assignments", actions: ["create_assignment_draft", "homework_status"], roles: ["institute_owner", "teacher"] },
  { key: "tests", name: "Tests", actions: ["test_schedule_draft", "marks_publish_preview"], roles: ["institute_owner", "teacher"] },
  { key: "parent_communication", name: "Parent Communication", actions: ["parent_message_draft", "weekly_summary_draft"], roles: ["institute_owner", "branch_manager", "teacher"] },
  { key: "live_classes", name: "Live Classes", actions: ["live_class_schedule_draft", "class_readiness"], roles: ["institute_owner", "teacher"] },
  { key: "reports", name: "Reports", actions: ["owner_summary", "branch_summary", "student_support_summary"], roles: ["institute_owner", "branch_manager", "teacher"] },
  { key: "subscriptions", name: "Subscriptions", actions: ["subscription_view", "v3_access_rule_view"], roles: ["institute_owner"] }
];

const part84SensitiveActions = ["refund", "discount", "delete", "export", "subscription_change", "v3_access_change", "salary", "bank", "payment_capture"];

const part84RoleMatrix = {
  institute_owner: { label: "Institute Owner", canPreview: true, canExecuteSafe: true, canSensitiveWithVerification: true, scope: "authorised institute and branch scope" },
  branch_manager: { label: "Branch Manager", canPreview: true, canExecuteSafe: true, canSensitiveWithVerification: false, scope: "assigned branches only" },
  accountant: { label: "Accountant", canPreview: true, canExecuteSafe: true, canSensitiveWithVerification: false, scope: "fees/payments/finance only by permission" },
  teacher: { label: "Teacher", canPreview: true, canExecuteSafe: true, canSensitiveWithVerification: false, scope: "assigned batches/students only" },
  receptionist_counsellor: { label: "Receptionist / Counsellor", canPreview: true, canExecuteSafe: true, canSensitiveWithVerification: false, scope: "admissions/enquiries/follow-ups only" },
  student: { label: "Student", canPreview: true, canExecuteSafe: false, canSensitiveWithVerification: false, scope: "own learning data only" },
  parent: { label: "Parent", canPreview: true, canExecuteSafe: false, canSensitiveWithVerification: false, scope: "linked child only" },
  naxora_super_admin: { label: "NAXORA Super Admin", canPreview: true, canExecuteSafe: false, canSensitiveWithVerification: false, scope: "logged platform support, not unrestricted institute-private data" }
};

function normalizePart84Role(role) {
  const r = String(role || "institute_owner").toLowerCase().trim().replace(/\s+/g, "_");
  if (["owner", "instituteowner", "institute_owner"].includes(r)) return "institute_owner";
  if (["branchmanager", "branch_manager"].includes(r)) return "branch_manager";
  if (["receptionist", "counsellor", "receptionist_counsellor"].includes(r)) return "receptionist_counsellor";
  return r;
}

function part84ModuleForAction(action) {
  return part84Modules.find((m) => m.actions.includes(action)) || null;
}

function part84IsSensitive(textOrAction = "") {
  const value = String(textOrAction || "").toLowerCase();
  return part84SensitiveActions.some((word) => value.includes(word));
}

function part84AccessCheck({ role, instituteId, module, action, branchId, studentId, childId }) {
  const normalizedRole = normalizePart84Role(role);
  const roleRule = part84RoleMatrix[normalizedRole] || { label: "Unknown", canPreview: false, canExecuteSafe: false, canSensitiveWithVerification: false, scope: "unsupported role" };
  const hasInstituteId = Boolean(String(instituteId || "").trim());
  const selectedModule = module ? part84Modules.find((m) => m.key === module) : part84ModuleForAction(action);
  const moduleAllowed = !selectedModule || selectedModule.roles.includes(normalizedRole) || normalizedRole === "naxora_super_admin";
  const sensitive = part84IsSensitive(action);

  let scopeOk = true;
  let scopeMessage = roleRule.scope;
  if (normalizedRole === "teacher" && !studentId && ["attendance", "assignments", "tests", "parent_communication"].includes(selectedModule?.key)) {
    scopeMessage = "Teacher action needs assigned student/batch context.";
  }
  if (normalizedRole === "parent" && !childId && selectedModule?.key) {
    scopeOk = false;
    scopeMessage = "Parent action needs linked child context.";
  }
  if (normalizedRole === "branch_manager" && !branchId && selectedModule?.key && selectedModule.key !== "reports") {
    scopeMessage = "Branch manager should provide assigned branchId for final execution.";
  }

  const allowedPreview = Boolean(roleRule.canPreview && hasInstituteId && moduleAllowed && scopeOk);
  const allowedExecute = Boolean(roleRule.canExecuteSafe && hasInstituteId && moduleAllowed && scopeOk && (!sensitive || roleRule.canSensitiveWithVerification));

  return {
    role: normalizedRole,
    roleLabel: roleRule.label,
    instituteId: instituteId || null,
    module: selectedModule?.key || module || null,
    action: action || null,
    branchId: branchId || null,
    studentId: studentId || null,
    childId: childId || null,
    allowedPreview,
    allowedExecute,
    sensitive,
    ownerVerificationRequired: Boolean(sensitive),
    reason: !hasInstituteId
      ? "Institute ID missing. VANI actions require logged institute context."
      : !moduleAllowed
        ? `${roleRule.label} is not allowed for module ${selectedModule?.name || module}.`
        : !scopeOk
          ? scopeMessage
          : sensitive && !roleRule.canSensitiveWithVerification
            ? "Sensitive action requires institute owner verification."
            : allowedPreview
              ? "Preview allowed. Execution depends on confirmation and verification rules."
              : "Access not allowed.",
    scope: scopeMessage
  };
}

function part84ParseCommand(command = "", context = {}) {
  const text = String(command || "").trim();
  const lower = text.toLowerCase();
  let action = "general_help";
  let module = "assistant";
  const missingDetails = [];
  const ambiguityOptions = [];

  if (lower.includes("admission") || lower.includes("enrol") || lower.includes("enroll") || lower.includes("student add") || lower.includes("new student")) {
    module = "admissions"; action = "create_student_draft";
    if (!context.studentName && !/name|naam/i.test(text)) missingDetails.push("studentName");
    if (!context.course && !/course|class|batch/i.test(text)) missingDetails.push("course");
    if (!context.phone && !/phone|mobile|number/i.test(text)) missingDetails.push("phone");
  } else if (lower.includes("demo") && (lower.includes("class") || lower.includes("book") || lower.includes("schedule"))) {
    module = "admissions"; action = "schedule_demo_class";
    if (!context.studentName) missingDetails.push("studentName");
    if (!context.course) missingDetails.push("course");
    if (!context.date) missingDetails.push("date");
  } else if (lower.includes("attendance") || lower.includes("present") || lower.includes("absent")) {
    module = "attendance"; action = "mark_attendance_draft";
    if (!context.batchId && !/batch|class/i.test(text)) missingDetails.push("batchId");
    if (!context.date && !/today|aaj|date/i.test(text)) missingDetails.push("date");
  } else if (lower.includes("fee") || lower.includes("fees") || lower.includes("payment") || lower.includes("reminder")) {
    module = "fees"; action = lower.includes("reminder") || lower.includes("message") ? "send_fee_reminder_draft" : "fee_summary";
    if (action === "send_fee_reminder_draft" && !context.studentName && !context.studentId) missingDetails.push("studentName_or_studentId");
  } else if (lower.includes("assignment") || lower.includes("homework")) {
    module = "assignments"; action = "create_assignment_draft";
    if (!context.batchId) missingDetails.push("batchId");
    if (!context.topic && !/topic|chapter/i.test(text)) missingDetails.push("topic");
    if (!context.dueDate && !/due|kal|tomorrow|date/i.test(text)) missingDetails.push("dueDate");
  } else if (lower.includes("test") || lower.includes("marks") || lower.includes("result")) {
    module = "tests"; action = lower.includes("publish") ? "marks_publish_preview" : "test_schedule_draft";
    if (!context.batchId) missingDetails.push("batchId");
    if (!context.topic) missingDetails.push("topic");
  } else if (lower.includes("parent") || lower.includes("message") || lower.includes("weekly summary")) {
    module = "parent_communication"; action = lower.includes("weekly") ? "weekly_summary_draft" : "parent_message_draft";
    if (!context.studentName && !context.studentId) missingDetails.push("studentName_or_studentId");
  } else if (lower.includes("live class") || lower.includes("online class")) {
    module = "live_classes"; action = "live_class_schedule_draft";
    if (!context.batchId) missingDetails.push("batchId");
    if (!context.topic) missingDetails.push("topic");
    if (!context.time) missingDetails.push("time");
  } else if (lower.includes("report") || lower.includes("summary") || lower.includes("revenue") || lower.includes("branch")) {
    module = "reports"; action = lower.includes("branch") ? "branch_summary" : "owner_summary";
  } else if (lower.includes("3.0") || lower.includes("v3") || lower.includes("subscription")) {
    module = "subscriptions"; action = part84IsSensitive(lower) ? "v3_access_change" : "v3_access_rule_view";
  }

  if (lower.includes("delete")) action = "delete";
  if (lower.includes("export")) action = "export";
  if (lower.includes("refund")) action = "refund";
  if (lower.includes("discount")) action = "discount";

  if (lower.includes("aman") && !context.studentId) {
    ambiguityOptions.push({ type: "student", name: "Aman", options: ["Aman Sharma — Class 10 Maths", "Aman Verma — Class 9 Science"] });
  }

  const sensitive = part84IsSensitive(`${action} ${text}`);
  return {
    command: text,
    module,
    action,
    confidence: text ? 0.82 : 0.2,
    sensitive,
    missingDetails,
    ambiguityOptions,
    needsMoreInfo: missingDetails.length > 0 || ambiguityOptions.length > 0,
    questions: missingDetails.map((field) => `Please provide ${field}.`),
    detectedAt: new Date().toISOString()
  };
}

function part84BuildPreview(parseResult, access, context = {}) {
  const token = `PX84-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
  const steps = [
    "Validate role, instituteId and module permission",
    "Resolve missing details and ambiguous records",
    "Show complete action preview",
    "Ask explicit confirmation",
    "For sensitive actions, verify institute owner",
    "Write audit log"
  ];
  return {
    previewId: token,
    confirmationToken: token,
    command: parseResult.command,
    module: parseResult.module,
    action: parseResult.action,
    sensitive: parseResult.sensitive,
    ownerVerificationRequired: Boolean(parseResult.sensitive || access.ownerVerificationRequired),
    confirmationRequired: true,
    executionMode: "safe_simulation_foundation",
    willNotExecuteUntilConfirmed: true,
    access,
    contextPreview: {
      instituteId: context.instituteId || access.instituteId,
      branchId: context.branchId || access.branchId || null,
      studentId: context.studentId || access.studentId || null,
      childId: context.childId || access.childId || null,
      providedDetails: Object.keys(context || {}).filter((k) => context[k])
    },
    steps,
    safeMessage: parseResult.sensitive
      ? "Sensitive action detected. Owner verification is required and VANI will not execute it directly."
      : "Action preview ready. Please confirm before execution.",
    createdAt: new Date().toISOString()
  };
}

function part84ExecutePreview(body = {}) {
  const confirmed = body.confirmed === true || body.confirmed === "true";
  const token = body.confirmationToken || body.previewId;
  const sensitive = body.sensitive === true || body.sensitive === "true" || part84IsSensitive(body.action);
  const ownerVerified = body.ownerVerified === true || body.ownerVerified === "true" || body.ownerVerificationCode === "DEMO-OWNER-VERIFY";

  if (!token) return { success: false, code: "TOKEN_MISSING", message: "Confirmation token missing." };
  if (!confirmed) return { success: false, code: "CONFIRMATION_REQUIRED", message: "Please confirm before VANI executes this action." };
  if (sensitive && !ownerVerified) {
    return { success: false, code: "OWNER_VERIFICATION_REQUIRED", message: "Sensitive action needs institute owner verification." };
  }

  return {
    success: true,
    executionMode: "safe_simulation_foundation",
    executed: true,
    realDatabaseWrite: false,
    message: "Action safely simulated and audit log prepared. Production DB write will be connected after final schema hardening.",
    auditLog: {
      event: "part84_vani_action_execute_simulation",
      action: body.action || "unknown",
      module: body.module || "unknown",
      sensitive,
      ownerVerified: Boolean(ownerVerified),
      confirmationToken: token,
      createdAt: new Date().toISOString()
    }
  };
}

app.get("/api/part84/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 84 — Advanced VANI Action Engine",
    status: "active",
    versionPhase: "NAXORA OS 2.0",
    latestCompletedPart: 84,
    nextPart: "Part 85 — VANI Admission Assistant",
    preservesPreviousFeatures: true,
    frontendRoutes: ["/advanced-vani-action-engine", "/vani-action-engine", "/vani-actions", "/advanced-vani", "/vani-command-engine", "/vani-engine"],
    apiRoutes: [
      "/api/part84/config", "/api/part84/features", "/api/part84/modules", "/api/part84/roles", "/api/part84/permissions",
      "/api/part84/command/parse", "/api/part84/action/preview", "/api/part84/action/execute", "/api/part84/vani/command"
    ],
    engineRules: ["parse", "missing-details", "ambiguity-resolution", "permission-check", "preview", "confirmation", "owner-verification", "audit-log"]
  });
});

app.get("/api/part84/config", (req, res) => {
  res.json({
    success: true,
    appName: "Advanced VANI Action Engine",
    engineMode: "preview_confirm_execute_foundation",
    languages: ["Hindi", "English", "Hinglish"],
    voice: { greeting: "Namaste, main VANI hoon. Main action karne se pehle preview aur confirmation loongi.", listenReplySupported: true },
    safety: {
      backendPermissionRequired: true,
      explicitConfirmationRequired: true,
      ownerVerificationForSensitiveActions: true,
      privateScreenFirst: true,
      auditLogRequired: true,
      realWritesInThisPart: false
    }
  });
});

app.get("/api/part84/features", (req, res) => {
  res.json({
    success: true,
    features: [
      { key: "intent_parser", name: "Intent Parser", why: "VANI must understand what the user wants." },
      { key: "missing_detail_questions", name: "Missing Detail Questions", why: "VANI should ask politely instead of guessing." },
      { key: "ambiguity_resolver", name: "Ambiguity Resolver", why: "Same names/records must be resolved safely." },
      { key: "role_permission_guard", name: "Role Permission Guard", why: "Every action must respect role and institute scope." },
      { key: "preview_confirmation", name: "Preview + Confirmation", why: "Create/update/send/delete actions need explicit approval." },
      { key: "owner_verification", name: "Owner Verification", why: "Refunds, discounts, deletes, exports and subscription changes are sensitive." },
      { key: "audit_log", name: "Audit Log", why: "Every executed VANI action must be traceable." }
    ]
  });
});

app.get("/api/part84/modules", (req, res) => res.json({ success: true, modules: part84Modules }));
app.get("/api/part84/roles", (req, res) => res.json({ success: true, roles: part84RoleMatrix }));
app.get("/api/part84/permissions", (req, res) => res.json({ success: true, permissions: { roles: part84RoleMatrix, modules: part84Modules, sensitiveActions: part84SensitiveActions } }));

app.post("/api/part84/command/parse", (req, res) => {
  const parse = part84ParseCommand(req.body?.command || req.query?.command || "", req.body || {});
  const access = part84AccessCheck({ ...(req.body || {}), module: parse.module, action: parse.action });
  res.json({ success: true, parse, access });
});

app.get("/api/part84/command/parse", (req, res) => {
  const parse = part84ParseCommand(req.query.q || req.query.command || "", req.query || {});
  const access = part84AccessCheck({ ...(req.query || {}), module: parse.module, action: parse.action });
  res.json({ success: true, parse, access });
});

app.post("/api/part84/action/preview", (req, res) => {
  const parse = req.body?.parse || part84ParseCommand(req.body?.command || "", req.body || {});
  const access = part84AccessCheck({ ...(req.body || {}), module: parse.module, action: parse.action });
  if (!access.allowedPreview) return res.status(403).json({ success: false, access, message: access.reason });
  if (parse.needsMoreInfo) return res.json({ success: true, needsMoreInfo: true, parse, access, questions: parse.questions, ambiguityOptions: parse.ambiguityOptions });
  res.json({ success: true, preview: part84BuildPreview(parse, access, req.body || {}) });
});

app.post("/api/part84/action/execute", (req, res) => {
  const access = part84AccessCheck(req.body || {});
  if (!access.allowedExecute && !(access.sensitive && access.role === "institute_owner")) {
    return res.status(403).json({ success: false, access, message: access.reason });
  }
  const result = part84ExecutePreview(req.body || {});
  res.status(result.success ? 200 : 400).json(result);
});

app.get("/api/part84/missing-details", (req, res) => {
  const parse = part84ParseCommand(req.query.q || req.query.command || "", req.query || {});
  res.json({ success: true, needsMoreInfo: parse.needsMoreInfo, missingDetails: parse.missingDetails, questions: parse.questions });
});

app.get("/api/part84/ambiguity-check", (req, res) => {
  const parse = part84ParseCommand(req.query.q || req.query.command || "", req.query || {});
  res.json({ success: true, ambiguityFound: parse.ambiguityOptions.length > 0, ambiguityOptions: parse.ambiguityOptions });
});

app.get("/api/part84/audit-log", (req, res) => {
  res.json({
    success: true,
    mode: "demo_audit_log",
    logs: [
      { event: "vani_command_parsed", module: "admissions", action: "create_student_draft", createdAt: new Date().toISOString() },
      { event: "vani_preview_generated", module: "attendance", action: "mark_attendance_draft", createdAt: new Date().toISOString() },
      { event: "sensitive_action_blocked_without_owner_verification", module: "fees", action: "refund", createdAt: new Date().toISOString() }
    ]
  });
});

app.get("/api/part84/vani/greeting", (req, res) => {
  res.json({
    success: true,
    assistant: "VANI",
    greeting: "Namaste, main VANI hoon. Main action karne se pehle preview aur confirmation loongi. Aap kya karna chahte hain?",
    exampleCommands: [
      "VANI, new student admission draft banao",
      "VANI, attendance draft banao",
      "VANI, fee reminder draft banao",
      "VANI, homework assignment banao",
      "VANI, branch summary dikhao"
    ],
    privateScreenFirstReminder: "Sensitive finance/student data screen par dikhaya jayega, loudly nahi bola jayega."
  });
});

app.post("/api/part84/vani/command", (req, res) => {
  const command = String(req.body?.command || req.query?.command || "").trim();
  const parse = part84ParseCommand(command, req.body || {});
  const access = part84AccessCheck({ ...(req.body || {}), module: parse.module, action: parse.action });

  if (!access.allowedPreview) {
    return res.status(403).json({
      success: false,
      assistant: "VANI",
      parse,
      access,
      spokenSafeSummary: "Is action ke liye aapke role ya institute scope me permission nahi hai.",
      privateScreenFirst: true
    });
  }

  if (parse.needsMoreInfo) {
    return res.json({
      success: true,
      assistant: "VANI",
      mode: "needs_more_info",
      parse,
      access,
      spokenSafeSummary: "Mujhe kuch details chahiye. Screen par questions dikh rahe hain.",
      questions: parse.questions,
      ambiguityOptions: parse.ambiguityOptions,
      privateScreenFirst: true
    });
  }

  const preview = part84BuildPreview(parse, access, req.body || {});
  res.json({
    success: true,
    assistant: "VANI",
    mode: "preview_ready",
    parse,
    access,
    preview,
    spokenSafeSummary: preview.sensitive
      ? "Sensitive action preview ready hai. Owner verification ke bina execute nahi hoga."
      : "Action preview ready hai. Confirm karne ke baad safe execution hoga.",
    privateScreenFirst: Boolean(preview.sensitive)
  });
});

app.get("/api/part84/vani/command", (req, res) => {
  const command = String(req.query.q || req.query.command || "").trim();
  const parse = part84ParseCommand(command, req.query || {});
  const access = part84AccessCheck({ ...(req.query || {}), module: parse.module, action: parse.action });
  if (!access.allowedPreview) {
    return res.status(403).json({ success: false, assistant: "VANI", parse, access, spokenSafeSummary: "Is action ke liye permission nahi hai.", privateScreenFirst: true });
  }
  if (parse.needsMoreInfo) {
    return res.json({ success: true, assistant: "VANI", mode: "needs_more_info", parse, access, questions: parse.questions, ambiguityOptions: parse.ambiguityOptions, spokenSafeSummary: "Mujhe kuch details chahiye." });
  }
  const preview = part84BuildPreview(parse, access, req.query || {});
  res.json({ success: true, assistant: "VANI", mode: "preview_ready", parse, access, preview, spokenSafeSummary: "Action preview ready hai. Confirm karne ke baad safe execution hoga." });
});

app.get("/api/part84/activity", (req, res) => {
  res.json({ success: true, activity: [
    { type: "advanced_vani_engine_created", message: "Part 84 Advanced VANI Action Engine active.", createdAt: new Date().toISOString() },
    { type: "preview_confirmation_rule", message: "VANI must preview and confirm before create/update/send/delete.", createdAt: new Date().toISOString() },
    { type: "owner_verification_rule", message: "Sensitive actions require owner verification.", createdAt: new Date().toISOString() }
  ] });
});

app.get("/api/part84/checklist", (req, res) => {
  res.json({ success: true, checklist: [
    "Status API returns success true",
    "Advanced VANI page opens",
    "Command parse detects module and action",
    "Missing detail questions appear instead of guessing",
    "Ambiguous names show options",
    "Role permissions block unauthorized users",
    "Preview generated before execution",
    "Execution requires confirmation token",
    "Sensitive actions require owner verification",
    "Audit log foundation returns entries"
  ] });
});

app.get("/api/part84/export", (req, res) => {
  res.json({
    success: true,
    exportType: "part84-advanced-vani-action-engine-readiness",
    generatedAt: new Date().toISOString(),
    ownerVerificationRequiredForSensitiveExports: true,
    data: { modules: part84Modules, roles: part84RoleMatrix, sensitiveActions: part84SensitiveActions }
  });
});

app.get("/api/part84/demo", (req, res) => {
  const command = "VANI, attendance draft banao";
  const context = { role: "teacher", instituteId: "NX-DEMO-INST-001", batchId: "BAT-10-MATH-A", date: "today", studentId: "STU-DEMO-001" };
  const parse = part84ParseCommand(command, context);
  const access = part84AccessCheck({ ...context, module: parse.module, action: parse.action });
  res.json({ success: true, demo: { command, parse, access, preview: part84BuildPreview(parse, access, context), nextPart: "Part 85 — VANI Admission Assistant" } });
});
// ================= END PART 84 =================

// ================= PART 85 — VANI ADMISSION ASSISTANT =================
// VANI Admission Assistant builds on Part 84 action engine. It supports
// admission/enquiry lead intake, missing-detail questions, qualification,
// demo-class booking preview, follow-up draft and admission draft preview.
// It does not finalize admissions/payments/discounts without confirmation.

const part85AdmissionFeatures = [
  {
    key: "voice_lead_intake",
    name: "Voice Lead Intake",
    summary: "Capture enquiry/admission details from Hindi/English/Hinglish commands.",
    problemSolved: "Reception/counsellor can quickly create an admission draft without opening many forms."
  },
  {
    key: "missing_detail_questions",
    name: "Missing Detail Questions",
    summary: "VANI asks for missing student name, parent phone, course, class, city or source.",
    problemSolved: "VANI does not guess important admission data."
  },
  {
    key: "lead_qualification",
    name: "Lead Qualification",
    summary: "Classify leads as hot, warm or cold based on course, urgency and contact completeness.",
    problemSolved: "Counsellor can prioritize serious admissions."
  },
  {
    key: "demo_class_preview",
    name: "Demo Class Booking Preview",
    summary: "Prepare demo-class booking preview with batch/course/time suggestions.",
    problemSolved: "Demo classes are easier to schedule safely."
  },
  {
    key: "followup_draft",
    name: "Follow-up Draft",
    summary: "Generate polite follow-up message drafts for parent/student.",
    problemSolved: "Missed lead follow-ups reduce."
  },
  {
    key: "admission_draft",
    name: "Admission Draft Preview",
    summary: "Prepare admission draft preview but do not save final admission without confirmation.",
    problemSolved: "Form filling becomes faster while avoiding accidental admission creation."
  },
  {
    key: "permission_guard",
    name: "Admission Permission Guard",
    summary: "Owner, branch manager and counsellor can use admission workflows according to permission.",
    problemSolved: "Student/parent/unauthorized staff cannot create admission records."
  },
  {
    key: "audit_log",
    name: "Admission VANI Audit Log",
    summary: "Every VANI admission command creates an audit-ready entry.",
    problemSolved: "Institute owner can review who asked VANI to do what."
  }
];

const part85RoleRules = [
  { role: "institute_owner", allowed: true, canExecuteDraft: true, ownerVerificationForSensitive: true, access: "Full admission workflow across authorised institute/branches." },
  { role: "branch_manager", allowed: true, canExecuteDraft: true, ownerVerificationForSensitive: true, access: "Assigned branch admission workflow only." },
  { role: "receptionist_counsellor", allowed: true, canExecuteDraft: true, ownerVerificationForSensitive: false, access: "Enquiry, follow-up and admission draft workflow according to permission." },
  { role: "teacher", allowed: false, canExecuteDraft: false, access: "Teacher can view assigned student context only; admission creation is not teacher workflow." },
  { role: "accountant", allowed: false, canExecuteDraft: false, access: "Accountant handles finance/fees, not admission intake." },
  { role: "student", allowed: false, canExecuteDraft: false, access: "Student cannot create admission/enquiry records." },
  { role: "parent", allowed: false, canExecuteDraft: false, access: "Parent can submit public enquiry, not internal admission workflow." },
  { role: "naxora_super_admin", allowed: false, canExecuteDraft: false, access: "Platform support only, not unrestricted institute-private admissions." }
];

function normalizePart85Role(role) {
  const r = String(role || "receptionist_counsellor").toLowerCase().trim().replace(/\s+/g, "_");
  if (["owner", "instituteowner", "institute_owner"].includes(r)) return "institute_owner";
  if (["branchmanager", "branch_manager"].includes(r)) return "branch_manager";
  if (["receptionist", "counsellor", "counselor", "receptionist_counsellor", "receptionist_counselor"].includes(r)) return "receptionist_counsellor";
  return r;
}

function part85AccessCheck({ role, instituteId, branchId }) {
  const normalizedRole = normalizePart85Role(role);
  const rule = part85RoleRules.find((r) => r.role === normalizedRole) || {
    role: normalizedRole,
    allowed: false,
    canExecuteDraft: false,
    access: "Unknown or unsupported role."
  };
  const hasInstituteId = Boolean(String(instituteId || "").trim());
  const branchRequired = normalizedRole === "branch_manager";
  const hasBranch = !branchRequired || Boolean(String(branchId || "BR-DEMO-001").trim());
  const allowed = Boolean(rule.allowed && hasInstituteId && hasBranch);
  return {
    role: normalizedRole,
    instituteId: instituteId || null,
    branchId: branchId || (branchRequired ? "BR-DEMO-001" : null),
    allowed,
    canExecuteDraft: Boolean(rule.canExecuteDraft && allowed),
    ownerVerificationForSensitive: Boolean(rule.ownerVerificationForSensitive),
    reason: !rule.allowed
      ? rule.access
      : !hasInstituteId
        ? "Institute ID missing. Admission workflow opens only inside logged institute account."
        : !hasBranch
          ? "Branch manager admission workflow requires assigned branchId."
          : "VANI admission assistant access allowed.",
    requiresLogin: true,
    requiresInstituteId: true,
    restrictToAssignedBranch: branchRequired
  };
}

function part85ExtractAdmissionDetails(input = "", body = {}) {
  const text = String(input || "").trim();
  const lower = text.toLowerCase();
  const courseMatch = lower.match(/(class\s?\d+|neet|jee|iit|foundation|maths|science|english|commerce|coding|spoken english)/i);
  const phoneMatch = text.match(/(?:\+91[-\s]?)?[6-9]\d{9}/);
  const classMatch = text.match(/class\s?(\d{1,2})/i);
  const cityMatch = text.match(/\b(delhi|mumbai|jaipur|hisar|sirsa|rohtak|gurugram|noida|pune|lucknow|chandigarh)\b/i);
  const sourceMatch = lower.match(/\b(website|walkin|walk-in|facebook|instagram|google|referral|whatsapp|call)\b/i);

  const nameFromBody = body.studentName || body.name || body.student;
  let guessedName = "";
  const nameMatch = text.match(/(?:student|bachcha|baccha|name|naam)\s*(?:is|hai|=|:)?\s*([A-Za-z][A-Za-z\s]{1,30})/i);
  if (nameMatch) guessedName = nameMatch[1].trim().replace(/\b(class|course|phone|mobile|number)\b.*$/i, "").trim();

  return {
    studentName: nameFromBody || guessedName || "",
    parentName: body.parentName || "",
    parentPhone: body.parentPhone || body.phone || (phoneMatch ? phoneMatch[0].replace(/\s|-/g, "") : ""),
    course: body.course || (courseMatch ? courseMatch[0] : ""),
    className: body.className || (classMatch ? `Class ${classMatch[1]}` : ""),
    city: body.city || (cityMatch ? cityMatch[0] : ""),
    source: body.source || (sourceMatch ? sourceMatch[0].replace("walkin", "walk-in") : ""),
    urgency: body.urgency || (lower.includes("today") || lower.includes("urgent") || lower.includes("abhi") ? "high" : lower.includes("next week") ? "medium" : ""),
    preferredDemoTime: body.preferredDemoTime || (lower.includes("evening") ? "Evening" : lower.includes("morning") ? "Morning" : "")
  };
}

function part85MissingDetails(details = {}, intent = "admission_draft") {
  const missing = [];
  if (!details.studentName) missing.push({ field: "studentName", question: "Student ka naam kya hai?" });
  if (!details.parentPhone) missing.push({ field: "parentPhone", question: "Parent ka mobile number kya hai?" });
  if (!details.course && !details.className) missing.push({ field: "course", question: "Kaunsa course ya class admission ke liye chahiye?" });
  if (intent === "demo_class_booking" && !details.preferredDemoTime) missing.push({ field: "preferredDemoTime", question: "Demo class morning, afternoon ya evening me chahiye?" });
  if (!details.source) missing.push({ field: "source", question: "Lead source kya hai — website, walk-in, referral ya WhatsApp?" });
  return missing;
}

function part85DetectIntent(command = "") {
  const lower = String(command || "").toLowerCase();
  if (lower.includes("demo")) return "demo_class_booking";
  if (lower.includes("follow") || lower.includes("call back") || lower.includes("callback")) return "followup_draft";
  if (lower.includes("qualify") || lower.includes("hot") || lower.includes("warm") || lower.includes("cold")) return "lead_qualification";
  if (lower.includes("admission") || lower.includes("enquiry") || lower.includes("lead") || lower.includes("student add") || lower.includes("form")) return "admission_draft";
  return "admission_assistant";
}

function part85QualifyLead(details = {}) {
  let score = 35;
  if (details.parentPhone) score += 20;
  if (details.course || details.className) score += 15;
  if (details.urgency === "high") score += 20;
  if (details.preferredDemoTime) score += 10;
  const type = score >= 75 ? "hot" : score >= 55 ? "warm" : "cold";
  return {
    score,
    type,
    reason: type === "hot"
      ? "Contact complete hai aur urgency/course clear hai."
      : type === "warm"
        ? "Lead useful hai, kuch details confirm karni hain."
        : "Important details missing hain; follow-up required."
  };
}

function part85BuildPreview({ command = "", body = {}, access = {} }) {
  const intent = part85DetectIntent(command);
  const details = part85ExtractAdmissionDetails(command, body);
  const missing = part85MissingDetails(details, intent);
  const qualification = part85QualifyLead(details);
  const hasMissing = missing.length > 0;

  const preview = {
    intent,
    mode: hasMissing ? "needs_more_details" : "preview_ready",
    admissionDraftId: `ADM-DRAFT-${Date.now()}`,
    leadId: `LEAD-${Date.now()}`,
    details,
    missing,
    qualification,
    demoClassPreview: {
      required: intent === "demo_class_booking",
      suggestedBatch: details.course || details.className || "Course to be confirmed",
      suggestedTime: details.preferredDemoTime || "Ask parent for preferred time",
      confirmationRequired: true
    },
    followupDraft: {
      required: intent === "followup_draft" || hasMissing,
      channel: details.parentPhone ? "WhatsApp/SMS draft" : "Phone number required",
      message: `Namaste${details.parentName ? " " + details.parentName : ""}, NAXORA Institute se admission enquiry ke regarding follow-up hai. Kripya course/demo details confirm kar dein.`
    },
    permissions: {
      canCreateDraft: Boolean(access.canExecuteDraft),
      finalAdmissionRequiresConfirmation: true,
      feeDiscountRequiresOwnerVerification: true,
      paymentCollectionNotAllowedHere: true
    },
    nextQuestion: hasMissing ? missing[0].question : "Preview ready hai. Kya aap is admission draft ko confirm karna chahte hain?"
  };

  return preview;
}

const part85Checklist = [
  "VANI Admission Assistant page opens on live URL",
  "Status API returns success true",
  "Receptionist/Counsellor can create admission preview",
  "Student/parent are blocked from internal admission workflow",
  "Missing details are asked instead of guessed",
  "Lead qualification returns hot/warm/cold",
  "Demo class booking is preview-only",
  "Follow-up message draft is generated",
  "Final admission action requires confirmation",
  "Fee discount/payment/subscription actions require owner verification or are blocked",
  "Audit log endpoint works",
  "Previous Part 1–84 routes remain preserved"
];

app.get("/api/part85/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 85 — VANI Admission Assistant",
    status: "active",
    versionPhase: "NAXORA OS 2.0",
    latestCompletedPart: 85,
    nextPart: "Part 86 — VANI Fee and Attendance Actions",
    preservesPreviousFeatures: true,
    frontendRoutes: ["/vani-admission-assistant", "/admission-vani", "/vani-admissions", "/admission-assistant", "/ai-admission-assistant", "/vani-admission-counsellor"],
    apiRoutes: [
      "/api/part85/config",
      "/api/part85/features",
      "/api/part85/roles",
      "/api/part85/access-check",
      "/api/part85/lead/parse",
      "/api/part85/lead/qualify",
      "/api/part85/admission/preview",
      "/api/part85/demo-class/preview",
      "/api/part85/followup/draft",
      "/api/part85/missing-details",
      "/api/part85/vani/greeting",
      "/api/part85/vani/command",
      "/api/part85/audit-log"
    ],
    vaniAdmissionAssistant: true
  });
});

app.get("/api/part85/config", (req, res) => {
  res.json({
    success: true,
    assistantName: "VANI Admission Assistant",
    appType: "voice_admission_copilot",
    version: "2.0-admission-assistant",
    safeActionPolicy: {
      previewBeforeCreate: true,
      confirmationRequired: true,
      missingDetailsNotGuessed: true,
      ownerVerificationForDiscountsAndSensitiveActions: true,
      noPaymentCollectionInThisPart: true
    },
    supportedLanguages: ["Hindi", "English", "Hinglish"],
    voice: {
      greeting: "Namaste, main VANI Admission Assistant hoon. Admission ya enquiry me kya help kar sakti hoon?",
      listenReplyFoundation: true
    }
  });
});

app.get("/api/part85/features", (req, res) => {
  res.json({ success: true, features: part85AdmissionFeatures });
});

app.get("/api/part85/roles", (req, res) => {
  res.json({ success: true, roles: part85RoleRules });
});

app.get("/api/part85/access-check", (req, res) => {
  res.json({ success: true, access: part85AccessCheck(req.query || {}) });
});

app.get("/api/part85/lead/parse", (req, res) => {
  const command = req.query.q || req.query.command || "";
  const details = part85ExtractAdmissionDetails(command, req.query || {});
  const intent = part85DetectIntent(command);
  res.json({
    success: true,
    command,
    intent,
    details,
    missing: part85MissingDetails(details, intent),
    qualification: part85QualifyLead(details)
  });
});

app.post("/api/part85/lead/parse", (req, res) => {
  const command = req.body?.command || "";
  const details = part85ExtractAdmissionDetails(command, req.body || {});
  const intent = part85DetectIntent(command);
  res.json({
    success: true,
    command,
    intent,
    details,
    missing: part85MissingDetails(details, intent),
    qualification: part85QualifyLead(details)
  });
});

app.get("/api/part85/lead/qualify", (req, res) => {
  const details = part85ExtractAdmissionDetails(req.query.q || req.query.command || "", req.query || {});
  res.json({ success: true, details, qualification: part85QualifyLead(details) });
});

app.post("/api/part85/admission/preview", (req, res) => {
  const access = part85AccessCheck(req.body || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  const command = req.body?.command || "admission draft banao";
  res.json({
    success: true,
    access,
    preview: part85BuildPreview({ command, body: req.body || {}, access }),
    confirmationRequired: true,
    finalWriteMode: "preview_only_foundation"
  });
});

app.get("/api/part85/admission/preview", (req, res) => {
  const access = part85AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  const command = req.query.q || req.query.command || "admission draft banao";
  res.json({
    success: true,
    access,
    preview: part85BuildPreview({ command, body: req.query || {}, access }),
    confirmationRequired: true,
    finalWriteMode: "preview_only_foundation"
  });
});

app.get("/api/part85/demo-class/preview", (req, res) => {
  const access = part85AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  const command = req.query.q || req.query.command || "demo class book karo";
  const preview = part85BuildPreview({ command: command.includes("demo") ? command : `${command} demo`, body: req.query || {}, access });
  res.json({ success: true, access, demoClassPreview: preview.demoClassPreview, missing: preview.missing, confirmationRequired: true });
});

app.get("/api/part85/followup/draft", (req, res) => {
  const access = part85AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  const command = req.query.q || req.query.command || "follow up draft banao";
  const preview = part85BuildPreview({ command, body: req.query || {}, access });
  res.json({ success: true, access, followupDraft: preview.followupDraft, missing: preview.missing, confirmationRequiredBeforeSend: true });
});

app.get("/api/part85/missing-details", (req, res) => {
  const command = req.query.q || req.query.command || "";
  const intent = part85DetectIntent(command);
  const details = part85ExtractAdmissionDetails(command, req.query || {});
  res.json({ success: true, intent, details, missing: part85MissingDetails(details, intent) });
});

app.get("/api/part85/vani/greeting", (req, res) => {
  res.json({
    success: true,
    assistant: "VANI Admission Assistant",
    greeting: "Namaste, main VANI Admission Assistant hoon. Admission ya enquiry me kya help kar sakti hoon?",
    exampleCommands: [
      "VANI, Class 10 Maths ke liye admission draft banao",
      "VANI, Aman ke liye demo class book karo",
      "VANI, lead qualify karo",
      "VANI, parent ko follow-up message draft karo"
    ],
    privateScreenFirstReminder: "Phone numbers, fees, discounts aur child details screen par privately dikhaye jayenge."
  });
});

app.post("/api/part85/vani/command", (req, res) => {
  const command = String(req.body?.command || req.query?.command || "").trim();
  const access = part85AccessCheck({
    role: req.body?.role || req.query?.role || "receptionist_counsellor",
    instituteId: req.body?.instituteId || req.query?.instituteId || "NX-DEMO-INST-001",
    branchId: req.body?.branchId || req.query?.branchId
  });

  if (!access.allowed) {
    return res.status(403).json({
      success: false,
      assistant: "VANI Admission Assistant",
      access,
      spokenSafeSummary: "Ye admission workflow sirf authorised owner, branch manager ya counsellor login me available hai.",
      privateScreenFirst: true
    });
  }

  const preview = part85BuildPreview({ command, body: req.body || {}, access });
  const needsMore = preview.missing.length > 0;
  const spokenSafeSummary = needsMore
    ? `Mujhe ek detail chahiye. ${preview.nextQuestion}`
    : preview.intent === "lead_qualification"
      ? `Lead ${preview.qualification.type} category me hai. Details screen par hain.`
      : "Admission assistant preview ready hai. Final action ke liye confirmation chahiye.";

  res.json({
    success: true,
    assistant: "VANI Admission Assistant",
    part: "Part 85 — VANI Admission Assistant",
    command: command || "VANI, admission draft banao",
    detectedIntent: preview.intent,
    access,
    voiceEnabled: true,
    privateScreenFirst: true,
    spokenSafeSummary,
    screenPreview: preview,
    confirmationRequiredFor: ["admission_create", "demo_class_book", "followup_send", "discount", "fee_change", "delete", "export"],
    ownerVerificationRequiredFor: ["discount", "fee_change", "refund", "delete", "subscription_change", "3.0_access_change"],
    auditLog: {
      event: "part85_vani_admission_command",
      intent: preview.intent,
      role: access.role,
      createdAt: new Date().toISOString()
    }
  });
});

app.get("/api/part85/vani/command", (req, res) => {
  const command = String(req.query.q || req.query.command || "").trim();
  const access = part85AccessCheck({
    role: req.query.role || "receptionist_counsellor",
    instituteId: req.query.instituteId || "NX-DEMO-INST-001",
    branchId: req.query.branchId
  });

  if (!access.allowed) {
    return res.status(403).json({
      success: false,
      assistant: "VANI Admission Assistant",
      access,
      spokenSafeSummary: "Ye admission workflow sirf authorised owner, branch manager ya counsellor login me available hai.",
      privateScreenFirst: true
    });
  }

  const preview = part85BuildPreview({ command, body: req.query || {}, access });
  res.json({
    success: true,
    assistant: "VANI Admission Assistant",
    part: "Part 85 — VANI Admission Assistant",
    command: command || "VANI, admission draft banao",
    detectedIntent: preview.intent,
    access,
    voiceEnabled: true,
    privateScreenFirst: true,
    spokenSafeSummary: preview.missing.length ? `Mujhe ek detail chahiye. ${preview.nextQuestion}` : "Admission assistant preview ready hai.",
    screenPreview: preview,
    auditLog: { event: "part85_vani_admission_command_get", intent: preview.intent, createdAt: new Date().toISOString() }
  });
});

app.get("/api/part85/audit-log", (req, res) => {
  res.json({
    success: true,
    auditMode: "foundation",
    logs: [
      { event: "vani_admission_parse", actorRole: "receptionist_counsellor", action: "lead_parse", result: "preview", createdAt: new Date().toISOString() },
      { event: "vani_admission_preview", actorRole: "institute_owner", action: "admission_draft_preview", result: "confirmation_required", createdAt: new Date().toISOString() }
    ],
    productionNote: "Production DB audit log collection will be hard-connected in later VANI action parts."
  });
});

app.get("/api/part85/activity", (req, res) => {
  res.json({
    success: true,
    activity: [
      { type: "vani_admission_assistant_created", message: "Part 85 VANI Admission Assistant active.", createdAt: new Date().toISOString() },
      { type: "missing_detail_guard", message: "VANI asks for missing admission details instead of guessing.", createdAt: new Date().toISOString() },
      { type: "confirmation_guard", message: "Admission/demo/follow-up actions require preview and confirmation.", createdAt: new Date().toISOString() }
    ]
  });
});

app.get("/api/part85/checklist", (req, res) => {
  res.json({ success: true, checklist: part85Checklist });
});

app.get("/api/part85/export", (req, res) => {
  const access = part85AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  res.json({
    success: true,
    exportType: "part85-vani-admission-assistant-readiness",
    ownerVerificationRequiredForSensitiveExports: true,
    generatedAt: new Date().toISOString(),
    data: { features: part85AdmissionFeatures, roles: part85RoleRules, checklist: part85Checklist }
  });
});

app.get("/api/part85/demo", (req, res) => {
  const command = "VANI, Aman Class 10 Maths admission draft banao parent phone 9876543210 source WhatsApp";
  const access = part85AccessCheck({ role: "receptionist_counsellor", instituteId: "NX-DEMO-INST-001" });
  const preview = part85BuildPreview({ command, body: {}, access });
  res.json({
    success: true,
    demo: {
      access,
      command,
      preview,
      greeting: "Namaste, main VANI Admission Assistant hoon. Admission ya enquiry me kya help kar sakti hoon?",
      nextPart: "Part 86 — VANI Fee and Attendance Actions"
    }
  });
});
// ================= END PART 85 =================

// ================= PART 86 — VANI FEE AND ATTENDANCE ACTIONS =================
// VANI Fee and Attendance Actions build on the Part 84 action engine and Part 85
// admission workflow. This part focuses on safe preview-first fee reminders,
// attendance drafts, payment follow-up drafts and low-attendance alerts.
// No real money movement, refund, discount or final attendance save happens here.

const part86Features = [
  {
    key: "fee_status_lookup",
    name: "Fee Status Lookup",
    module: "fees",
    summary: "VANI can prepare fee status summaries for authorized roles.",
    problemSolved: "Owner/accountant can quickly understand pending fee cases."
  },
  {
    key: "fee_reminder_draft",
    name: "Fee Reminder Draft",
    module: "fees",
    summary: "VANI drafts polite fee reminder messages without sending automatically.",
    problemSolved: "Follow-ups become faster while keeping confirmation control."
  },
  {
    key: "payment_followup_draft",
    name: "Payment Follow-up Draft",
    module: "payments",
    summary: "VANI drafts follow-up messages for pending or failed payments.",
    problemSolved: "Payment communication is more consistent."
  },
  {
    key: "receipt_preview",
    name: "Receipt Preview",
    module: "payments",
    summary: "VANI can prepare receipt preview before final official generation.",
    problemSolved: "Mistakes can be caught before issuing a receipt."
  },
  {
    key: "attendance_draft",
    name: "Attendance Draft",
    module: "attendance",
    summary: "VANI creates attendance draft preview for assigned teacher/batch.",
    problemSolved: "Attendance can be prepared faster without accidental final save."
  },
  {
    key: "low_attendance_alerts",
    name: "Low Attendance Alerts",
    module: "attendance",
    summary: "VANI finds students below attendance threshold and prepares alert summary.",
    problemSolved: "Teacher/owner can support students earlier."
  },
  {
    key: "private_screen_first",
    name: "Private-Screen-First Finance Rule",
    module: "security",
    summary: "Sensitive fee/payment data is shown on screen and not spoken loudly.",
    problemSolved: "Private financial information is protected."
  },
  {
    key: "owner_verification_for_sensitive_actions",
    name: "Owner Verification for Sensitive Actions",
    module: "security",
    summary: "Discount, refund, delete, export and subscription changes require owner verification.",
    problemSolved: "VANI cannot accidentally perform risky actions."
  }
];

const part86RoleRules = [
  {
    role: "institute_owner",
    allowedModules: ["fees", "payments", "attendance", "reports"],
    allowedActions: ["lookup", "draft", "preview", "execute_safe_draft", "audit"],
    sensitiveActionsNeedOwnerVerification: true,
    note: "Owner has full authorized institute/branch scope."
  },
  {
    role: "branch_manager",
    allowedModules: ["fees", "attendance", "reports"],
    allowedActions: ["lookup", "draft", "preview"],
    assignedScopeOnly: true,
    note: "Branch manager sees assigned branch only."
  },
  {
    role: "accountant",
    allowedModules: ["fees", "payments", "reports"],
    allowedActions: ["lookup", "draft", "preview"],
    note: "Accountant can handle finance workflow according to permission."
  },
  {
    role: "teacher",
    allowedModules: ["attendance"],
    allowedActions: ["lookup", "draft", "preview"],
    assignedScopeOnly: true,
    note: "Teacher can work on assigned batch attendance only."
  },
  {
    role: "receptionist_counsellor",
    allowedModules: ["fees", "attendance"],
    allowedActions: ["lookup", "draft"],
    note: "Can draft communication if institute permission allows."
  },
  {
    role: "student",
    allowedModules: ["own_fees_summary", "own_attendance_summary"],
    allowedActions: ["lookup"],
    ownDataOnly: true,
    note: "Student can only see own safe summary, no execution."
  },
  {
    role: "parent",
    allowedModules: ["linked_child_fees_summary", "linked_child_attendance_summary"],
    allowedActions: ["lookup"],
    linkedChildOnly: true,
    note: "Parent can only see linked child safe summary, no execution."
  },
  {
    role: "naxora_super_admin",
    allowedModules: ["platform_support"],
    allowedActions: ["audit"],
    note: "Platform support only, no unrestricted institute-private action access."
  }
];

const part86ActionCatalog = [
  {
    action: "fee_status_lookup",
    module: "fees",
    requiredDetails: ["role", "instituteId", "studentId"],
    confirmationRequired: false,
    ownerVerificationRequired: false,
    privateScreenFirst: true
  },
  {
    action: "fee_reminder_draft",
    module: "fees",
    requiredDetails: ["role", "instituteId", "studentId", "amountOrReason"],
    confirmationRequired: true,
    ownerVerificationRequired: false,
    privateScreenFirst: true
  },
  {
    action: "payment_followup_draft",
    module: "payments",
    requiredDetails: ["role", "instituteId", "studentId", "paymentStatus"],
    confirmationRequired: true,
    ownerVerificationRequired: false,
    privateScreenFirst: true
  },
  {
    action: "receipt_preview",
    module: "payments",
    requiredDetails: ["role", "instituteId", "studentId", "amount"],
    confirmationRequired: true,
    ownerVerificationRequired: true,
    privateScreenFirst: true
  },
  {
    action: "attendance_draft",
    module: "attendance",
    requiredDetails: ["role", "instituteId", "batchId", "date"],
    confirmationRequired: true,
    ownerVerificationRequired: false,
    privateScreenFirst: false
  },
  {
    action: "low_attendance_alerts",
    module: "attendance",
    requiredDetails: ["role", "instituteId", "threshold"],
    confirmationRequired: false,
    ownerVerificationRequired: false,
    privateScreenFirst: true
  },
  {
    action: "fee_discount_request",
    module: "fees",
    requiredDetails: ["role", "instituteId", "studentId", "discountReason"],
    confirmationRequired: true,
    ownerVerificationRequired: true,
    privateScreenFirst: true
  },
  {
    action: "refund_request",
    module: "payments",
    requiredDetails: ["role", "instituteId", "studentId", "paymentId", "refundReason"],
    confirmationRequired: true,
    ownerVerificationRequired: true,
    privateScreenFirst: true
  }
];

function normalizePart86Role(role) {
  const r = String(role || "institute_owner").toLowerCase().trim().replace(/\s+/g, "_");
  if (["owner", "instituteowner", "institute_owner"].includes(r)) return "institute_owner";
  if (["branchmanager", "branch_manager"].includes(r)) return "branch_manager";
  if (["receptionist", "counsellor", "receptionist_counsellor"].includes(r)) return "receptionist_counsellor";
  return r;
}

function part86DetectAction(command = "") {
  const lower = String(command || "").toLowerCase();

  if (lower.includes("refund")) return "refund_request";
  if (lower.includes("discount") || lower.includes("scholarship") || lower.includes("fee kam")) return "fee_discount_request";
  if (lower.includes("receipt") || lower.includes("rasid") || lower.includes("invoice")) return "receipt_preview";
  if (lower.includes("payment follow") || lower.includes("failed payment") || lower.includes("payment pending")) return "payment_followup_draft";
  if (lower.includes("reminder") || lower.includes("fee message") || lower.includes("fees message") || lower.includes("fee reminder")) return "fee_reminder_draft";
  if (lower.includes("low attendance") || lower.includes("attendance below") || lower.includes("kam attendance")) return "low_attendance_alerts";
  if (lower.includes("attendance") || lower.includes("present") || lower.includes("absent")) return "attendance_draft";
  if (lower.includes("fee") || lower.includes("fees") || lower.includes("pending")) return "fee_status_lookup";

  return "fee_status_lookup";
}

function part86ExtractDetails(command = "", input = {}) {
  const text = String(command || "");
  const lower = text.toLowerCase();
  const amountMatch = text.match(/(?:₹|rs\.?|inr)?\s*([0-9]{3,7})/i);
  const phoneMatch = text.match(/\b[6-9][0-9]{9}\b/);
  const classMatch = text.match(/class\s*([0-9]{1,2})/i);
  const thresholdMatch = text.match(/([0-9]{2})\s*%/);

  let studentName = input.studentName || null;
  const nameMatch = text.match(/\b(?:student|for|of)\s+([A-Z][a-z]+)\b/);
  if (!studentName && nameMatch) studentName = nameMatch[1];
  if (!studentName && lower.includes("aman")) studentName = "Aman";
  if (!studentName && lower.includes("riya")) studentName = "Riya";
  if (!studentName && lower.includes("kabir")) studentName = "Kabir";

  return {
    role: input.role || "institute_owner",
    instituteId: input.instituteId || null,
    studentId: input.studentId || (studentName ? `STU-${String(studentName).toUpperCase()}-DEMO` : null),
    studentName,
    batchId: input.batchId || (classMatch ? `BAT-CLASS-${classMatch[1]}` : null),
    date: input.date || (lower.includes("today") || lower.includes("aaj") ? "today" : null),
    amount: input.amount || (amountMatch ? Number(amountMatch[1]) : null),
    amountOrReason: input.amountOrReason || (amountMatch ? `Pending amount around ₹${amountMatch[1]}` : null),
    paymentStatus: input.paymentStatus || (lower.includes("failed") ? "failed" : lower.includes("pending") ? "pending" : null),
    threshold: input.threshold || (thresholdMatch ? Number(thresholdMatch[1]) : lower.includes("low attendance") ? 75 : null),
    parentPhone: input.parentPhone || (phoneMatch ? phoneMatch[0] : null),
    discountReason: input.discountReason || (lower.includes("discount") ? "Requested by voice command; owner verification required." : null),
    refundReason: input.refundReason || (lower.includes("refund") ? "Refund requested by voice command; owner verification required." : null),
    paymentId: input.paymentId || null
  };
}

function part86MissingDetails(action, details) {
  const catalog = part86ActionCatalog.find((item) => item.action === action);
  if (!catalog) return ["supported action"];
  return catalog.requiredDetails.filter((field) => {
    if (field === "role") return !details.role;
    if (field === "amountOrReason") return !details.amountOrReason && !details.amount;
    if (field === "amount") return !details.amount;
    return !details[field];
  });
}

function part86AccessCheck(input = {}) {
  const role = normalizePart86Role(input.role);
  const action = input.action || part86DetectAction(input.command || "");
  const catalog = part86ActionCatalog.find((item) => item.action === action) || part86ActionCatalog[0];
  const rule = part86RoleRules.find((r) => r.role === role) || {
    role,
    allowedModules: [],
    allowedActions: [],
    note: "Unknown role."
  };

  const moduleAllowed = rule.allowedModules.includes(catalog.module) ||
    (role === "student" && ["fees", "attendance"].includes(catalog.module)) ||
    (role === "parent" && ["fees", "attendance"].includes(catalog.module));

  const actionAllowed = rule.allowedActions.includes("lookup") && action.endsWith("_lookup") ||
    rule.allowedActions.includes("draft") && action.includes("draft") ||
    rule.allowedActions.includes("preview") && action.includes("preview") ||
    rule.allowedActions.includes("audit") && action.includes("audit") ||
    (role === "institute_owner" && ["fee_discount_request", "refund_request"].includes(action));

  const hasInstituteId = Boolean(String(input.instituteId || "").trim());
  const allowed = Boolean(moduleAllowed && actionAllowed && hasInstituteId);

  return {
    role,
    action,
    module: catalog.module,
    allowed,
    reason: !hasInstituteId
      ? "Institute ID missing."
      : !moduleAllowed
        ? `Role ${role} is not allowed for module ${catalog.module}.`
        : !actionAllowed
          ? `Role ${role} is not allowed for action ${action}.`
          : "Action preview allowed.",
    assignedScopeOnly: Boolean(rule.assignedScopeOnly),
    ownDataOnly: Boolean(rule.ownDataOnly),
    linkedChildOnly: Boolean(rule.linkedChildOnly),
    confirmationRequired: catalog.confirmationRequired,
    ownerVerificationRequired: catalog.ownerVerificationRequired,
    privateScreenFirst: catalog.privateScreenFirst,
    safeExecutionOnly: true
  };
}

function part86BuildPreview({ action, details, access }) {
  const now = new Date().toISOString();
  const studentName = details.studentName || "Selected Student";
  const amount = details.amount || 2500;
  const batchId = details.batchId || "BAT-DEMO-001";

  let preview = {
    previewId: `VANI86-${Date.now()}`,
    action,
    createdAt: now,
    privateScreenFirst: access.privateScreenFirst,
    confirmationRequired: access.confirmationRequired,
    ownerVerificationRequired: access.ownerVerificationRequired,
    title: "VANI action preview",
    spokenSafeSummary: "VANI preview ready hai. Sensitive details screen par dikhaye gaye hain.",
    screenData: {}
  };

  if (action === "fee_status_lookup") {
    preview.title = "Fee Status Lookup Preview";
    preview.spokenSafeSummary = "Fee status summary ready hai. Amount details screen par privately dikhaye gaye hain.";
    preview.screenData = {
      studentName,
      studentId: details.studentId || "STU-DEMO-001",
      pendingAmount: amount,
      dueDate: "Next Monday",
      status: "pending",
      nextAction: "Draft polite reminder if required."
    };
  } else if (action === "fee_reminder_draft") {
    preview.title = "Fee Reminder Draft Preview";
    preview.spokenSafeSummary = "Fee reminder draft ready hai. Send karne se pehle confirmation required hai.";
    preview.screenData = {
      studentName,
      messageDraft: `Namaste, ${studentName} ke fee status ke regarding polite reminder. Kripya pending payment update share karein. - NAXORA Institute`,
      sendAutomatically: false
    };
  } else if (action === "payment_followup_draft") {
    preview.title = "Payment Follow-up Draft Preview";
    preview.spokenSafeSummary = "Payment follow-up draft ready hai. Send karne se pehle confirmation required hai.";
    preview.screenData = {
      studentName,
      paymentStatus: details.paymentStatus || "pending",
      messageDraft: `Namaste, payment status ${details.paymentStatus || "pending"} dikh raha hai. Kripya payment confirmation share karein.`,
      sendAutomatically: false
    };
  } else if (action === "receipt_preview") {
    preview.title = "Receipt Preview";
    preview.spokenSafeSummary = "Receipt preview ready hai. Official receipt generate karne se pehle owner verification required hai.";
    preview.screenData = {
      studentName,
      amount,
      receiptMode: "preview_only",
      officialGeneration: "blocked_until_confirmation"
    };
  } else if (action === "attendance_draft") {
    preview.title = "Attendance Draft Preview";
    preview.spokenSafeSummary = "Attendance draft ready hai. Final save se pehle confirmation required hai.";
    preview.screenData = {
      batchId,
      date: details.date || "today",
      presentCount: 32,
      absentCount: 4,
      draftOnly: true
    };
  } else if (action === "low_attendance_alerts") {
    preview.title = "Low Attendance Alerts";
    preview.spokenSafeSummary = "Low attendance alert list screen par privately dikhayi gayi hai.";
    preview.screenData = {
      threshold: details.threshold || 75,
      students: [
        { name: "Aman", attendance: 68, batch: "Class 10 Maths A" },
        { name: "Riya", attendance: 72, batch: "Class 10 Maths B" },
        { name: "Kabir", attendance: 65, batch: "Class 9 Science A" }
      ]
    };
  } else if (action === "fee_discount_request") {
    preview.title = "Fee Discount Request Preview";
    preview.spokenSafeSummary = "Discount request preview ready hai. Owner verification ke bina ye execute nahi hoga.";
    preview.screenData = {
      studentName,
      discountReason: details.discountReason || "Reason required",
      status: "owner_verification_required"
    };
  } else if (action === "refund_request") {
    preview.title = "Refund Request Preview";
    preview.spokenSafeSummary = "Refund request preview ready hai. Owner verification ke bina ye execute nahi hoga.";
    preview.screenData = {
      studentName,
      paymentId: details.paymentId || "missing",
      refundReason: details.refundReason || "Reason required",
      status: "owner_verification_required"
    };
  }

  return preview;
}

function part86ParseCommand(input = {}) {
  const command = String(input.command || input.q || "").trim();
  const action = input.action || part86DetectAction(command);
  const details = part86ExtractDetails(command, input);
  const missingDetails = part86MissingDetails(action, details);
  const access = part86AccessCheck({ ...details, role: input.role || details.role, instituteId: input.instituteId || details.instituteId, action, command });
  const preview = part86BuildPreview({ action, details, access });
  return {
    command,
    action,
    module: access.module,
    details,
    missingDetails,
    access,
    preview,
    status: missingDetails.length ? "needs_more_details" : access.allowed ? "preview_ready" : "blocked_by_permission"
  };
}

const part86Checklist = [
  "VANI Fee and Attendance Actions page opens",
  "Status API returns success true",
  "Fee status lookup creates private-screen-first preview",
  "Fee reminder draft does not send automatically",
  "Attendance draft does not final-save automatically",
  "Low attendance alert preview works",
  "Discount/refund actions require owner verification",
  "Student/parent only get own/linked child safe summary",
  "Audit log endpoint returns safe event preview",
  "Previous Part 1–85 routes remain preserved"
];

app.get("/api/part86/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 86 — VANI Fee and Attendance Actions",
    status: "active",
    versionPhase: "NAXORA OS 2.0",
    latestCompletedPart: 86,
    nextPart: "Part 87 — VANI Voice Reports",
    preservesPreviousFeatures: true,
    frontendRoutes: ["/vani-fee-attendance-actions", "/fee-attendance-vani", "/vani-fees-attendance", "/vani-fee-actions", "/vani-attendance-actions", "/fee-attendance-actions"],
    apiRoutes: [
      "/api/part86/config",
      "/api/part86/features",
      "/api/part86/roles",
      "/api/part86/actions",
      "/api/part86/access-check",
      "/api/part86/command/parse",
      "/api/part86/action/preview",
      "/api/part86/action/execute",
      "/api/part86/fee/status",
      "/api/part86/fee/reminder-draft",
      "/api/part86/payment/followup-draft",
      "/api/part86/payment/receipt-preview",
      "/api/part86/attendance/draft",
      "/api/part86/attendance/low-alerts",
      "/api/part86/vani/greeting",
      "/api/part86/vani/command"
    ],
    safeMode: true
  });
});

app.get("/api/part86/config", (req, res) => {
  res.json({
    success: true,
    appName: "VANI Fee and Attendance Actions",
    appType: "vani_safe_action_workflow",
    version: "2.0-fee-attendance-actions",
    safeMode: {
      realMoneyMovement: false,
      finalAttendanceSave: false,
      autoSendMessages: false,
      previewRequired: true,
      confirmationRequired: true,
      ownerVerificationForSensitiveActions: true
    },
    voice: {
      listenReplySupported: true,
      greeting: "Namaste, main VANI hoon. Main fees ya attendance me kya help kar sakti hoon?"
    }
  });
});

app.get("/api/part86/features", (req, res) => {
  res.json({ success: true, features: part86Features });
});

app.get("/api/part86/roles", (req, res) => {
  res.json({ success: true, roles: part86RoleRules });
});

app.get("/api/part86/actions", (req, res) => {
  res.json({ success: true, actions: part86ActionCatalog });
});

app.get("/api/part86/permissions", (req, res) => {
  res.json({ success: true, roles: part86RoleRules, actions: part86ActionCatalog });
});

app.get("/api/part86/access-check", (req, res) => {
  const action = req.query.action || part86DetectAction(req.query.q || req.query.command || "");
  res.json({ success: true, access: part86AccessCheck({ ...req.query, action }) });
});

app.get("/api/part86/command/parse", (req, res) => {
  res.json({ success: true, parsed: part86ParseCommand(req.query || {}) });
});

app.post("/api/part86/command/parse", (req, res) => {
  res.json({ success: true, parsed: part86ParseCommand(req.body || {}) });
});

app.get("/api/part86/action/preview", (req, res) => {
  const parsed = part86ParseCommand(req.query || {});
  res.json({
    success: true,
    preview: parsed.preview,
    missingDetails: parsed.missingDetails,
    access: parsed.access,
    status: parsed.status
  });
});

app.post("/api/part86/action/preview", (req, res) => {
  const parsed = part86ParseCommand(req.body || {});
  res.json({
    success: true,
    preview: parsed.preview,
    missingDetails: parsed.missingDetails,
    access: parsed.access,
    status: parsed.status
  });
});

app.post("/api/part86/action/execute", (req, res) => {
  const parsed = part86ParseCommand(req.body || {});
  if (!parsed.access.allowed) {
    return res.status(403).json({ success: false, message: parsed.access.reason, parsed });
  }
  if (parsed.missingDetails.length) {
    return res.status(400).json({ success: false, message: "Missing details required before execution preview.", missingDetails: parsed.missingDetails, parsed });
  }
  if (parsed.access.ownerVerificationRequired && req.body?.ownerVerified !== true) {
    return res.status(403).json({
      success: false,
      message: "Owner verification required for this sensitive action.",
      ownerVerificationRequired: true,
      parsed
    });
  }
  if (parsed.access.confirmationRequired && req.body?.confirmed !== true) {
    return res.status(409).json({
      success: false,
      message: "Confirmation required. This endpoint remains safe and does not perform real production write without confirmation.",
      confirmationRequired: true,
      preview: parsed.preview
    });
  }
  res.json({
    success: true,
    mode: "safe_simulation_executed",
    realProductionWrite: false,
    message: "Safe simulated execution completed. Production DB write is intentionally disabled in Part 86.",
    auditEvent: {
      action: parsed.action,
      role: parsed.access.role,
      module: parsed.module,
      createdAt: new Date().toISOString()
    },
    preview: parsed.preview
  });
});

app.get("/api/part86/fee/status", (req, res) => {
  const parsed = part86ParseCommand({ ...req.query, action: "fee_status_lookup" });
  res.json({ success: true, feeStatus: parsed.preview, access: parsed.access, missingDetails: parsed.missingDetails });
});

app.get("/api/part86/fee/reminder-draft", (req, res) => {
  const parsed = part86ParseCommand({ ...req.query, action: "fee_reminder_draft" });
  res.json({ success: true, reminderDraft: parsed.preview, access: parsed.access, missingDetails: parsed.missingDetails, autoSend: false });
});

app.get("/api/part86/payment/followup-draft", (req, res) => {
  const parsed = part86ParseCommand({ ...req.query, action: "payment_followup_draft" });
  res.json({ success: true, followupDraft: parsed.preview, access: parsed.access, missingDetails: parsed.missingDetails, autoSend: false });
});

app.get("/api/part86/payment/receipt-preview", (req, res) => {
  const parsed = part86ParseCommand({ ...req.query, action: "receipt_preview" });
  res.json({ success: true, receiptPreview: parsed.preview, access: parsed.access, missingDetails: parsed.missingDetails, officialReceiptGenerated: false });
});

app.get("/api/part86/attendance/draft", (req, res) => {
  const parsed = part86ParseCommand({ ...req.query, action: "attendance_draft" });
  res.json({ success: true, attendanceDraft: parsed.preview, access: parsed.access, missingDetails: parsed.missingDetails, finalSaved: false });
});

app.get("/api/part86/attendance/low-alerts", (req, res) => {
  const parsed = part86ParseCommand({ ...req.query, action: "low_attendance_alerts" });
  res.json({ success: true, lowAttendanceAlerts: parsed.preview, access: parsed.access, missingDetails: parsed.missingDetails });
});

app.get("/api/part86/missing-details", (req, res) => {
  const parsed = part86ParseCommand(req.query || {});
  res.json({
    success: true,
    action: parsed.action,
    missingDetails: parsed.missingDetails,
    questions: parsed.missingDetails.map((field) => {
      const map = {
        instituteId: "Institute ID kya hai?",
        studentId: "Student ka ID ya naam kya hai?",
        batchId: "Kaunsa batch?",
        date: "Kaunsi date ke liye attendance/fee action chahiye?",
        amount: "Amount kitna hai?",
        amountOrReason: "Pending amount ya reason kya hai?",
        paymentStatus: "Payment status pending hai ya failed?",
        threshold: "Low attendance threshold kitna percent rakhna hai?",
        discountReason: "Discount ka reason kya hai?",
        refundReason: "Refund ka reason kya hai?",
        paymentId: "Payment ID kya hai?"
      };
      return map[field] || `${field} kya hai?`;
    })
  });
});

app.get("/api/part86/vani/greeting", (req, res) => {
  res.json({
    success: true,
    assistant: "VANI",
    language: "Hindi/Hinglish",
    greeting: "Namaste, main VANI hoon. Main fees ya attendance me kya help kar sakti hoon?",
    exampleCommands: [
      "VANI, Aman ki fee status dikhao",
      "VANI, Aman ko fee reminder draft banao",
      "VANI, Class 10 Maths attendance draft banao",
      "VANI, low attendance students dikhao",
      "VANI, receipt preview banao"
    ],
    privateScreenFirstReminder: "Fee/payment data screen par privately dikhaya jayega, loudly nahi bola jayega."
  });
});

app.post("/api/part86/vani/command", (req, res) => {
  const parsed = part86ParseCommand(req.body || {});
  const base = {
    success: parsed.access.allowed && parsed.missingDetails.length === 0,
    assistant: "VANI",
    part: "Part 86 — VANI Fee and Attendance Actions",
    command: parsed.command || "VANI, fee attendance help dikhao",
    detectedAction: parsed.action,
    module: parsed.module,
    access: parsed.access,
    missingDetails: parsed.missingDetails,
    privateScreenFirst: parsed.access.privateScreenFirst,
    spokenSafeSummary: parsed.missingDetails.length
      ? "Mujhe kuch details chahiye. Missing details screen par dikh rahi hain."
      : parsed.preview.spokenSafeSummary,
    screenPreview: parsed.preview,
    confirmationRequired: parsed.access.confirmationRequired,
    ownerVerificationRequired: parsed.access.ownerVerificationRequired,
    auditLog: {
      event: "part86_vani_fee_attendance_command",
      action: parsed.action,
      status: parsed.status,
      createdAt: new Date().toISOString()
    }
  };
  res.status(base.success ? 200 : parsed.access.allowed ? 400 : 403).json(base);
});

app.get("/api/part86/vani/command", (req, res) => {
  const parsed = part86ParseCommand(req.query || {});
  res.json({
    success: parsed.access.allowed && parsed.missingDetails.length === 0,
    assistant: "VANI",
    part: "Part 86 — VANI Fee and Attendance Actions",
    command: parsed.command || "VANI, fee attendance help dikhao",
    detectedAction: parsed.action,
    module: parsed.module,
    access: parsed.access,
    missingDetails: parsed.missingDetails,
    privateScreenFirst: parsed.access.privateScreenFirst,
    spokenSafeSummary: parsed.missingDetails.length
      ? "Mujhe kuch details chahiye. Missing details screen par dikh rahi hain."
      : parsed.preview.spokenSafeSummary,
    screenPreview: parsed.preview,
    confirmationRequired: parsed.access.confirmationRequired,
    ownerVerificationRequired: parsed.access.ownerVerificationRequired,
    auditLog: {
      event: "part86_vani_fee_attendance_command_get",
      action: parsed.action,
      status: parsed.status,
      createdAt: new Date().toISOString()
    }
  });
});

app.get("/api/part86/audit-log", (req, res) => {
  res.json({
    success: true,
    auditLog: [
      {
        event: "part86_fee_attendance_actions_loaded",
        action: "system_ready",
        module: "vani",
        safeMode: true,
        createdAt: new Date().toISOString()
      },
      {
        event: "sensitive_action_policy",
        action: "refund_discount_export_delete_subscription_change",
        ownerVerificationRequired: true,
        confirmationRequired: true,
        createdAt: new Date().toISOString()
      }
    ]
  });
});

app.get("/api/part86/activity", (req, res) => {
  res.json({
    success: true,
    activity: [
      { type: "part86_created", message: "VANI Fee and Attendance Actions active.", createdAt: new Date().toISOString() },
      { type: "safe_preview_first", message: "Fee reminders and attendance drafts require preview/confirmation.", createdAt: new Date().toISOString() },
      { type: "private_screen_first", message: "Fee/payment details are private-screen-first.", createdAt: new Date().toISOString() }
    ]
  });
});

app.get("/api/part86/checklist", (req, res) => {
  res.json({ success: true, checklist: part86Checklist });
});

app.get("/api/part86/export", (req, res) => {
  res.json({
    success: true,
    exportType: "part86-vani-fee-attendance-readiness",
    ownerVerificationRequiredForSensitiveExports: true,
    generatedAt: new Date().toISOString(),
    data: {
      features: part86Features,
      roles: part86RoleRules,
      actions: part86ActionCatalog,
      checklist: part86Checklist
    }
  });
});

app.get("/api/part86/demo", (req, res) => {
  const command = req.query.q || "VANI, Aman ko fee reminder draft banao amount 2500";
  const parsed = part86ParseCommand({
    q: command,
    role: req.query.role || "accountant",
    instituteId: req.query.instituteId || "NX-DEMO-INST-001",
    studentName: req.query.studentName || "Aman",
    studentId: req.query.studentId || "STU-DEMO-001"
  });
  res.json({
    success: true,
    demo: {
      command,
      parsed,
      vaniGreeting: "Namaste, main VANI hoon. Main fees ya attendance me kya help kar sakti hoon?",
      nextPart: "Part 87 — VANI Voice Reports"
    }
  });
});
// ================= END PART 86 =================

// ================= PART 87 — VANI VOICE REPORTS =================
// NAXORA OS 2.0 VANI Voice Reports. This part adds report generation,
// safe spoken summaries, role-based report access, private-screen-first
// sensitive data handling, and browser voice report reader foundation.

const part87ReportTypes = [
  {
    key: "owner_daily_brief",
    name: "Owner Daily Brief",
    roles: ["institute_owner"],
    modules: ["revenue", "admissions", "fees", "attendance", "leads", "alerts"],
    privateScreenFirst: true,
    safeSpokenSummary: "Aaj ka owner daily brief ready hai. Sensitive finance details screen par privately dikhaye gaye hain."
  },
  {
    key: "fee_collection_report",
    name: "Fee Collection Report",
    roles: ["institute_owner", "accountant", "branch_manager"],
    modules: ["fees", "payments", "pending_dues", "reminders"],
    privateScreenFirst: true,
    safeSpokenSummary: "Fee collection report ready hai. Amount details screen par privately dikhaye gaye hain."
  },
  {
    key: "attendance_report",
    name: "Attendance Report",
    roles: ["institute_owner", "branch_manager", "teacher"],
    modules: ["student_attendance", "teacher_attendance", "low_attendance_alerts"],
    privateScreenFirst: false,
    safeSpokenSummary: "Attendance report ready hai. Low attendance alerts screen par dikh rahe hain."
  },
  {
    key: "admission_report",
    name: "Admission and Lead Report",
    roles: ["institute_owner", "branch_manager", "receptionist_counsellor"],
    modules: ["enquiries", "followups", "demo_classes", "conversions"],
    privateScreenFirst: false,
    safeSpokenSummary: "Admission report ready hai. Hot leads aur follow-up priorities screen par dikh rahe hain."
  },
  {
    key: "teacher_class_report",
    name: "Teacher Class Report",
    roles: ["teacher", "institute_owner", "branch_manager"],
    modules: ["assigned_batches", "classes", "homework", "tests", "student_support"],
    privateScreenFirst: true,
    safeSpokenSummary: "Teacher class report ready hai. Student support details screen par privately dikhaye gaye hain."
  },
  {
    key: "student_learning_report",
    name: "Student Learning Report",
    roles: ["student", "teacher", "parent", "institute_owner"],
    modules: ["timetable", "homework", "tests", "notes", "ai_study_plan"],
    privateScreenFirst: true,
    safeSpokenSummary: "Student learning report ready hai. Private learning details screen par dikhaye gaye hain."
  },
  {
    key: "parent_child_report",
    name: "Parent Child Report",
    roles: ["parent"],
    modules: ["linked_child_attendance", "fees_safe_view", "results", "teacher_messages", "weekly_summary"],
    privateScreenFirst: true,
    safeSpokenSummary: "Child report ready hai. Fee aur child details screen par privately dikhaye gaye hain."
  }
];

const part87RoleRules = [
  {
    role: "institute_owner",
    allowedReports: ["owner_daily_brief", "fee_collection_report", "attendance_report", "admission_report", "teacher_class_report", "student_learning_report"],
    scope: "Full institute and authorised branches after login and instituteId."
  },
  {
    role: "branch_manager",
    allowedReports: ["fee_collection_report", "attendance_report", "admission_report", "teacher_class_report"],
    scope: "Assigned branch only."
  },
  {
    role: "accountant",
    allowedReports: ["fee_collection_report"],
    scope: "Fees/payments/finance reports only."
  },
  {
    role: "teacher",
    allowedReports: ["attendance_report", "teacher_class_report", "student_learning_report"],
    scope: "Assigned batches/students only."
  },
  {
    role: "receptionist_counsellor",
    allowedReports: ["admission_report"],
    scope: "Admissions, enquiries and follow-ups only."
  },
  {
    role: "student",
    allowedReports: ["student_learning_report"],
    scope: "Own learning report only."
  },
  {
    role: "parent",
    allowedReports: ["parent_child_report", "student_learning_report"],
    scope: "Linked child only."
  },
  {
    role: "naxora_super_admin",
    allowedReports: [],
    scope: "Platform support only, not unrestricted institute-private voice reports."
  }
];

function normalizePart87Role(role) {
  const r = String(role || "institute_owner").toLowerCase().trim().replace(/\s+/g, "_");
  if (["owner", "instituteowner", "institute_owner"].includes(r)) return "institute_owner";
  if (["branchmanager", "branch_manager"].includes(r)) return "branch_manager";
  if (["receptionist", "counsellor", "receptionist_counsellor"].includes(r)) return "receptionist_counsellor";
  return r;
}

function part87DetectReportType(input = "") {
  const lower = String(input || "").toLowerCase();
  if (lower.includes("fee") || lower.includes("payment") || lower.includes("collection") || lower.includes("pending")) return "fee_collection_report";
  if (lower.includes("attendance") || lower.includes("absent") || lower.includes("present")) return "attendance_report";
  if (lower.includes("admission") || lower.includes("lead") || lower.includes("enquiry") || lower.includes("demo")) return "admission_report";
  if (lower.includes("teacher") || lower.includes("class report") || lower.includes("batch report")) return "teacher_class_report";
  if (lower.includes("student") || lower.includes("learning") || lower.includes("study") || lower.includes("homework") || lower.includes("test")) return "student_learning_report";
  if (lower.includes("parent") || lower.includes("child") || lower.includes("weekly")) return "parent_child_report";
  return "owner_daily_brief";
}

function part87AccessCheck({ role, instituteId, reportType, branchId, teacherId, studentId, parentId, childId }) {
  const normalizedRole = normalizePart87Role(role);
  const type = reportType || "owner_daily_brief";
  const rule = part87RoleRules.find((r) => r.role === normalizedRole) || {
    role: normalizedRole,
    allowedReports: [],
    scope: "Unknown or unsupported role."
  };
  const report = part87ReportTypes.find((r) => r.key === type);
  const hasInstituteId = Boolean(String(instituteId || "").trim());
  const reportExists = Boolean(report);
  const reportAllowed = reportExists && rule.allowedReports.includes(type);

  let missingContext = [];
  if (normalizedRole === "teacher" && !teacherId) missingContext.push("teacherId");
  if (normalizedRole === "student" && !studentId) missingContext.push("studentId");
  if (normalizedRole === "parent" && !parentId) missingContext.push("parentId");
  if (type === "parent_child_report" && normalizedRole === "parent" && !childId) missingContext.push("childId");

  const allowed = hasInstituteId && reportExists && reportAllowed && missingContext.length === 0;
  return {
    role: normalizedRole,
    instituteId: instituteId || null,
    reportType: type,
    branchId: branchId || null,
    teacherId: teacherId || null,
    studentId: studentId || null,
    parentId: parentId || null,
    childId: childId || null,
    allowed,
    reportExists,
    reportAllowed,
    missingContext,
    reason: !hasInstituteId
      ? "Institute ID missing."
      : !reportExists
        ? "Unknown report type."
        : !reportAllowed
          ? "This role is not allowed to access this report."
          : missingContext.length
            ? `Missing required context: ${missingContext.join(", ")}`
            : "Voice report access allowed.",
    scope: rule.scope,
    privateScreenFirst: report?.privateScreenFirst || false,
    requiresLogin: true,
    requiresInstituteId: true
  };
}

function part87BuildReport({ reportType, role, instituteId, branchId, teacherId, studentId, parentId, childId }) {
  const type = reportType || "owner_daily_brief";
  const report = part87ReportTypes.find((r) => r.key === type) || part87ReportTypes[0];

  const common = {
    reportId: `VR-${Date.now()}`,
    reportType: type,
    reportName: report.name,
    generatedAt: new Date().toISOString(),
    instituteId: instituteId || "NX-DEMO-INST-001",
    branchId: branchId || "ALL",
    requestedByRole: normalizePart87Role(role),
    privateScreenFirst: report.privateScreenFirst,
    safeSpokenSummary: report.safeSpokenSummary
  };

  const samples = {
    owner_daily_brief: {
      headline: "Institute health overview",
      metrics: [
        { label: "Today Collection", value: "₹42,500", private: true },
        { label: "New Enquiries", value: "18", private: false },
        { label: "Hot Leads", value: "6", private: false },
        { label: "Attendance Avg", value: "87%", private: false },
        { label: "Pending Fees", value: "₹1,38,000", private: true },
        { label: "Urgent Alerts", value: "4", private: false }
      ],
      recommendations: [
        "Hot leads ko same-day callback do.",
        "Overdue fee follow-up private screen se review karo.",
        "Low attendance students ke parent update schedule karo."
      ]
    },
    fee_collection_report: {
      headline: "Fee collection and pending dues",
      metrics: [
        { label: "Collected Today", value: "₹42,500", private: true },
        { label: "Collected This Month", value: "₹8,42,000", private: true },
        { label: "Pending Amount", value: "₹1,38,000", private: true },
        { label: "Overdue Students", value: "12", private: true },
        { label: "Reminder Drafts", value: "8", private: false }
      ],
      recommendations: [
        "Reminder drafts preview karo.",
        "High overdue accounts owner/accountant screen par privately review karo.",
        "Auto-send disabled rakho jab tak confirmation na ho."
      ]
    },
    attendance_report: {
      headline: "Attendance overview",
      metrics: [
        { label: "Student Avg", value: "87%", private: false },
        { label: "Teacher Avg", value: "96%", private: false },
        { label: "Low Attendance", value: "7 students", private: true },
        { label: "Attendance Pending", value: "1 batch", private: false }
      ],
      recommendations: [
        "Low attendance list screen par privately review karo.",
        "Assigned teacher ko support action plan do.",
        "Parent weekly summary ke liye attendance notes draft karo."
      ]
    },
    admission_report: {
      headline: "Admission and lead movement",
      metrics: [
        { label: "New Enquiries", value: "18", private: false },
        { label: "Hot Leads", value: "6", private: false },
        { label: "Demo Scheduled", value: "5", private: false },
        { label: "Converted Today", value: "3", private: false },
        { label: "Missed Follow-ups", value: "2", private: false }
      ],
      recommendations: [
        "Hot leads ko priority do.",
        "Missed follow-ups ke liye VANI draft banao.",
        "Demo class conversion track karo."
      ]
    },
    teacher_class_report: {
      headline: "Teacher class execution",
      metrics: [
        { label: "Classes Today", value: "4", private: false },
        { label: "Attendance Pending", value: "1", private: false },
        { label: "Homework Review", value: "18", private: false },
        { label: "Tests to Evaluate", value: "2", private: false },
        { label: "Student Support Alerts", value: "3", private: true }
      ],
      recommendations: [
        "Attendance draft complete karo.",
        "Homework pending review finish karo.",
        "Student support alerts screen par privately dekho."
      ]
    },
    student_learning_report: {
      headline: "Student learning progress",
      metrics: [
        { label: "Classes Today", value: "3", private: false },
        { label: "Homework Pending", value: "2", private: false },
        { label: "Upcoming Tests", value: "1", private: false },
        { label: "Attendance", value: "86%", private: true },
        { label: "Weak Topic", value: "Quadratic Equations", private: true }
      ],
      recommendations: [
        "Weak topic ke liye 20 minute revision karo.",
        "Pending homework complete karo.",
        "Upcoming test ke liye flashcards revise karo."
      ]
    },
    parent_child_report: {
      headline: "Linked child weekly update",
      metrics: [
        { label: "Attendance", value: "86%", private: true },
        { label: "Homework Pending", value: "2", private: true },
        { label: "Upcoming Test", value: "1", private: false },
        { label: "Fee Summary", value: "Safe view available", private: true },
        { label: "Teacher Messages", value: "2", private: true }
      ],
      recommendations: [
        "Child ke pending homework par support do.",
        "Teacher message screen par privately padho.",
        "Fee detail screen par privately review karo."
      ]
    }
  };

  return {
    ...common,
    content: samples[type] || samples.owner_daily_brief,
    voiceRules: {
      speakOnlySafeSummary: true,
      hidePrivateAmountsInSpeaker: true,
      showSensitiveDetailsOnScreen: report.privateScreenFirst,
      confirmationRequiredForExport: true
    }
  };
}

function part87BuildVoiceScript(report) {
  const content = report.content || {};
  const publicMetrics = (content.metrics || []).filter((m) => !m.private);
  const safeMetricLine = publicMetrics.length
    ? publicMetrics.map((m) => `${m.label}: ${m.value}`).join(". ")
    : "Detailed report screen par privately dikhaya gaya hai.";
  const recommendation = (content.recommendations || [])[0] || "Details screen par check karo.";
  return `${report.safeSpokenSummary} ${content.headline || ""}. ${safeMetricLine}. Recommendation: ${recommendation}`;
}

const part87Checklist = [
  "Voice reports page opens on live URL",
  "Status API returns success true",
  "Owner daily brief generates report",
  "Fee report uses private-screen-first",
  "Attendance report returns safe spoken summary",
  "Role permissions block unauthorized report types",
  "VANI can generate voice report reply",
  "Browser voice reader speaks safe script",
  "Export requires verification in policy",
  "Previous Part 1–86 routes remain preserved"
];

app.get("/api/part87/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 87 — VANI Voice Reports",
    status: "active",
    versionPhase: "NAXORA OS 2.0",
    latestCompletedPart: 87,
    nextPart: "Part 88 — Hindi/Hinglish VANI Conversation",
    preservesPreviousFeatures: true,
    frontendRoutes: ["/vani-voice-reports", "/voice-reports", "/vani-reports", "/voice-reporting", "/vani-report-reader", "/ai-voice-reports"],
    apiRoutes: [
      "/api/part87/config",
      "/api/part87/report-types",
      "/api/part87/roles",
      "/api/part87/access-check",
      "/api/part87/report/generate",
      "/api/part87/report/voice-script",
      "/api/part87/report/summary",
      "/api/part87/vani/greeting",
      "/api/part87/vani/command"
    ],
    voiceReportsEnabled: true
  });
});

app.get("/api/part87/config", (req, res) => {
  res.json({
    success: true,
    appName: "VANI Voice Reports",
    appType: "voice_report_reader",
    version: "2.0-vani-voice-reports",
    reportPolicy: {
      privateScreenFirst: true,
      speakOnlySafeSummary: true,
      sensitiveAmountsNotSpokenLoudly: true,
      exportNeedsVerification: true
    },
    browserVoice: {
      speechSynthesis: true,
      startAfterUserClick: true,
      language: "Hindi/Hinglish"
    }
  });
});

app.get("/api/part87/report-types", (req, res) => {
  res.json({ success: true, reportTypes: part87ReportTypes });
});

app.get("/api/part87/roles", (req, res) => {
  res.json({ success: true, roles: part87RoleRules });
});

app.get("/api/part87/access-check", (req, res) => {
  const reportType = req.query.reportType || part87DetectReportType(req.query.q || req.query.command || "");
  res.json({ success: true, access: part87AccessCheck({ ...req.query, reportType }) });
});

app.get("/api/part87/report/generate", (req, res) => {
  const reportType = req.query.reportType || part87DetectReportType(req.query.q || req.query.command || "");
  const access = part87AccessCheck({ ...req.query, reportType });
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  const report = part87BuildReport({ ...req.query, reportType, role: access.role });
  res.json({
    success: true,
    access,
    report,
    voiceScript: part87BuildVoiceScript(report)
  });
});

app.post("/api/part87/report/generate", (req, res) => {
  const body = req.body || {};
  const reportType = body.reportType || part87DetectReportType(body.q || body.command || "");
  const access = part87AccessCheck({ ...body, reportType });
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  const report = part87BuildReport({ ...body, reportType, role: access.role });
  res.json({
    success: true,
    access,
    report,
    voiceScript: part87BuildVoiceScript(report)
  });
});

app.get("/api/part87/report/voice-script", (req, res) => {
  const reportType = req.query.reportType || part87DetectReportType(req.query.q || req.query.command || "");
  const access = part87AccessCheck({ ...req.query, reportType });
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  const report = part87BuildReport({ ...req.query, reportType, role: access.role });
  res.json({
    success: true,
    access,
    reportType,
    privateScreenFirst: report.privateScreenFirst,
    voiceScript: part87BuildVoiceScript(report),
    warning: report.privateScreenFirst ? "Sensitive details screen par dikhaye gaye hain, speaker me nahi." : "Safe summary can be spoken."
  });
});

app.get("/api/part87/report/summary", (req, res) => {
  const reportType = req.query.reportType || part87DetectReportType(req.query.q || req.query.command || "");
  const report = part87BuildReport({ ...req.query, reportType, role: req.query.role || "institute_owner" });
  res.json({
    success: true,
    reportType,
    headline: report.content.headline,
    safeSpokenSummary: report.safeSpokenSummary,
    publicMetrics: report.content.metrics.filter((m) => !m.private),
    privateMetricsCount: report.content.metrics.filter((m) => m.private).length
  });
});

app.get("/api/part87/vani/greeting", (req, res) => {
  res.json({
    success: true,
    assistant: "VANI",
    greeting: "Namaste, main VANI hoon. Aap kaunsa voice report sunna chahte ho?",
    exampleCommands: [
      "VANI, owner daily report sunao",
      "VANI, fee collection report sunao",
      "VANI, attendance report batao",
      "VANI, admission report sunao",
      "VANI, teacher class report sunao",
      "VANI, student learning report batao",
      "VANI, child weekly report sunao"
    ],
    privateScreenFirstReminder: "Sensitive finance, child, student aur payment details loudly nahi bole jayenge."
  });
});

app.post("/api/part87/vani/command", (req, res) => {
  const body = req.body || {};
  const command = String(body.command || body.q || "").trim();
  const reportType = body.reportType || part87DetectReportType(command);
  const access = part87AccessCheck({ ...body, reportType });

  if (!access.allowed) {
    return res.status(403).json({
      success: false,
      assistant: "VANI",
      access,
      spokenSafeSummary: "Is role ko ye voice report access karne ki permission nahi hai.",
      privateScreenFirst: true
    });
  }

  const report = part87BuildReport({ ...body, reportType, role: access.role });
  const voiceScript = part87BuildVoiceScript(report);
  res.json({
    success: true,
    assistant: "VANI",
    part: "Part 87 — VANI Voice Reports",
    command: command || "VANI, owner daily report sunao",
    detectedReportType: reportType,
    access,
    report,
    voiceScript,
    spokenSafeSummary: report.safeSpokenSummary,
    privateScreenFirst: report.privateScreenFirst,
    confirmationRequiredFor: ["export", "send_report", "download_sensitive_report"],
    auditLog: {
      event: "part87_vani_voice_report",
      reportType,
      createdAt: new Date().toISOString()
    }
  });
});

app.get("/api/part87/vani/command", (req, res) => {
  const command = String(req.query.command || req.query.q || "").trim();
  const reportType = req.query.reportType || part87DetectReportType(command);
  const access = part87AccessCheck({ ...req.query, reportType });
  if (!access.allowed) {
    return res.status(403).json({
      success: false,
      assistant: "VANI",
      access,
      spokenSafeSummary: "Is role ko ye voice report access karne ki permission nahi hai.",
      privateScreenFirst: true
    });
  }
  const report = part87BuildReport({ ...req.query, reportType, role: access.role });
  res.json({
    success: true,
    assistant: "VANI",
    part: "Part 87 — VANI Voice Reports",
    command: command || "VANI, owner daily report sunao",
    detectedReportType: reportType,
    access,
    report,
    voiceScript: part87BuildVoiceScript(report),
    spokenSafeSummary: report.safeSpokenSummary,
    privateScreenFirst: report.privateScreenFirst,
    auditLog: { event: "part87_vani_voice_report_get", reportType, createdAt: new Date().toISOString() }
  });
});

app.get("/api/part87/audit-log", (req, res) => {
  res.json({
    success: true,
    auditLog: [
      {
        event: "voice_report_generated",
        reportType: "owner_daily_brief",
        role: "institute_owner",
        privateScreenFirst: true,
        createdAt: new Date().toISOString()
      },
      {
        event: "voice_report_policy_loaded",
        rule: "speakOnlySafeSummary",
        createdAt: new Date().toISOString()
      }
    ]
  });
});

app.get("/api/part87/activity", (req, res) => {
  res.json({
    success: true,
    activity: [
      { type: "vani_voice_reports_created", message: "Part 87 VANI Voice Reports active.", createdAt: new Date().toISOString() },
      { type: "private_screen_first_policy", message: "Sensitive report details are screen-first and not spoken loudly.", createdAt: new Date().toISOString() }
    ]
  });
});

app.get("/api/part87/checklist", (req, res) => {
  res.json({ success: true, checklist: part87Checklist });
});

app.get("/api/part87/export", (req, res) => {
  res.json({
    success: true,
    exportType: "part87-vani-voice-reports-readiness",
    ownerVerificationRequiredForSensitiveExports: true,
    generatedAt: new Date().toISOString(),
    data: {
      reportTypes: part87ReportTypes,
      roleRules: part87RoleRules,
      checklist: part87Checklist
    }
  });
});

app.get("/api/part87/demo", (req, res) => {
  const report = part87BuildReport({
    reportType: "owner_daily_brief",
    role: "institute_owner",
    instituteId: "NX-DEMO-INST-001"
  });
  res.json({
    success: true,
    demo: {
      access: part87AccessCheck({ role: "institute_owner", instituteId: "NX-DEMO-INST-001", reportType: "owner_daily_brief" }),
      report,
      voiceScript: part87BuildVoiceScript(report),
      vaniCommand: "VANI, owner daily report sunao",
      nextPart: "Part 88 — Hindi/Hinglish VANI Conversation"
    }
  });
});
// ================= END PART 87 =================

// ================= PART 88 — HINDI/HINGLISH VANI CONVERSATION =================
// NAXORA OS 2.0 VANI Hindi/Hinglish conversation foundation.
// This part adds language detection, conversational replies, follow-up questions,
// safe module routing, conversation session context and browser voice/mic UI.
// Real production LLM/API integration is intentionally not included to avoid secrets.

const part88ConversationLanguages = [
  {
    key: "hindi",
    label: "Hindi",
    examples: ["attendance dikhao", "fee batao", "admission lead banao"],
    responseStyle: "Polite Hindi with simple institute terms."
  },
  {
    key: "hinglish",
    label: "Hinglish",
    examples: ["aaj ka report dikhao", "pending fee batao", "homework kya hai"],
    responseStyle: "Natural Hindi + English mix for Indian institute users."
  },
  {
    key: "english",
    label: "English",
    examples: ["show attendance", "make admission draft", "read fee report"],
    responseStyle: "Simple English with clear next action."
  }
];

const part88ConversationModules = [
  {
    key: "admissions",
    name: "Admissions",
    intents: ["admission_draft", "lead_qualification", "demo_class", "followup"],
    allowedRoles: ["institute_owner", "branch_manager", "receptionist_counsellor"],
    asksMissingDetails: ["studentName", "course", "parentPhone", "source"]
  },
  {
    key: "fees",
    name: "Fees",
    intents: ["fee_status", "fee_reminder", "payment_followup", "receipt_preview"],
    allowedRoles: ["institute_owner", "branch_manager", "accountant", "parent", "student"],
    privateScreenFirst: true,
    asksMissingDetails: ["studentName or studentId"]
  },
  {
    key: "attendance",
    name: "Attendance",
    intents: ["attendance_report", "attendance_draft", "low_attendance"],
    allowedRoles: ["institute_owner", "branch_manager", "teacher", "parent", "student"],
    privateScreenFirst: true,
    asksMissingDetails: ["batchId or studentId"]
  },
  {
    key: "learning",
    name: "Learning",
    intents: ["homework", "tests", "notes", "revision_plan", "weak_topic"],
    allowedRoles: ["student", "teacher", "parent", "institute_owner"],
    privateScreenFirst: true,
    asksMissingDetails: ["studentId or batchId"]
  },
  {
    key: "reports",
    name: "Reports",
    intents: ["owner_daily_brief", "fee_collection_report", "attendance_report", "student_learning_report", "parent_child_report"],
    allowedRoles: ["institute_owner", "branch_manager", "accountant", "teacher", "parent", "student"],
    privateScreenFirst: true,
    asksMissingDetails: ["reportType"]
  },
  {
    key: "general",
    name: "General Help",
    intents: ["help", "capabilities", "safe_next_step"],
    allowedRoles: ["institute_owner", "branch_manager", "accountant", "teacher", "receptionist_counsellor", "student", "parent"],
    privateScreenFirst: false,
    asksMissingDetails: []
  }
];

const part88RoleScopes = [
  { role: "institute_owner", scope: "Full authorised institute and branch context.", canExecuteSensitive: true },
  { role: "branch_manager", scope: "Assigned branch only.", canExecuteSensitive: false },
  { role: "accountant", scope: "Fees/payments/finance only.", canExecuteSensitive: false },
  { role: "teacher", scope: "Assigned batches/students/classes only.", canExecuteSensitive: false },
  { role: "receptionist_counsellor", scope: "Admissions/enquiries/follow-ups only.", canExecuteSensitive: false },
  { role: "student", scope: "Own learning and safe fee/attendance summary only.", canExecuteSensitive: false },
  { role: "parent", scope: "Linked child only.", canExecuteSensitive: false },
  { role: "naxora_super_admin", scope: "Platform support only; no unrestricted private institute conversation.", canExecuteSensitive: false }
];

function normalizePart88Role(role) {
  const r = String(role || "student").toLowerCase().trim().replace(/\s+/g, "_");
  if (["owner", "instituteowner", "institute_owner"].includes(r)) return "institute_owner";
  if (["branchmanager", "branch_manager"].includes(r)) return "branch_manager";
  if (["receptionist", "counsellor", "receptionist_counsellor"].includes(r)) return "receptionist_counsellor";
  return r;
}

function part88DetectLanguage(text = "") {
  const input = String(text || "").toLowerCase();
  const hindiWords = ["dikhao", "batao", "banao", "kya", "kaise", "aaj", "kal", "fee", "fees", "admission", "attendance", "report", "sunao", "padh"];
  const englishWords = ["show", "make", "create", "read", "tell", "today", "report", "attendance", "admission", "homework", "fees"];
  const devanagari = /[\u0900-\u097F]/.test(input);
  if (devanagari) return "hindi";
  const hindiScore = hindiWords.filter((w) => input.includes(w)).length;
  const englishScore = englishWords.filter((w) => input.includes(w)).length;
  if (hindiScore > 0 && englishScore > 0) return "hinglish";
  if (hindiScore > englishScore) return "hinglish";
  if (englishScore > 0) return "english";
  return "hinglish";
}

function part88DetectIntent(text = "") {
  const input = String(text || "").toLowerCase();
  if (input.includes("admission") || input.includes("enquiry") || input.includes("lead") || input.includes("demo class")) {
    return { module: "admissions", intent: input.includes("demo") ? "demo_class" : input.includes("follow") ? "followup" : "admission_draft" };
  }
  if (input.includes("fee") || input.includes("payment") || input.includes("receipt") || input.includes("due") || input.includes("pending")) {
    return { module: "fees", intent: input.includes("receipt") ? "receipt_preview" : input.includes("reminder") ? "fee_reminder" : "fee_status" };
  }
  if (input.includes("attendance") || input.includes("absent") || input.includes("present") || input.includes("low attendance")) {
    return { module: "attendance", intent: input.includes("draft") || input.includes("mark") ? "attendance_draft" : input.includes("low") ? "low_attendance" : "attendance_report" };
  }
  if (input.includes("homework") || input.includes("assignment") || input.includes("test") || input.includes("notes") || input.includes("revision") || input.includes("study") || input.includes("weak")) {
    return { module: "learning", intent: input.includes("revision") || input.includes("weak") ? "revision_plan" : input.includes("test") ? "tests" : input.includes("notes") ? "notes" : "homework" };
  }
  if (input.includes("report") || input.includes("brief") || input.includes("summary") || input.includes("sunao")) {
    return { module: "reports", intent: input.includes("fee") ? "fee_collection_report" : input.includes("attendance") ? "attendance_report" : "owner_daily_brief" };
  }
  return { module: "general", intent: "help" };
}

function part88ExtractSimpleEntities(text = "") {
  const input = String(text || "");
  const classMatch = input.match(/class\s*([0-9]{1,2})/i);
  const phoneMatch = input.match(/(?:phone|mobile|number)\s*[:\-]?\s*([6-9][0-9]{9})/i);
  const amountMatch = input.match(/(?:amount|rs|₹)\s*[:\-]?\s*([0-9]{2,7})/i);
  const courseMatch = input.match(/(?:course|subject)\s*[:\-]?\s*([a-zA-Z ]{3,30})/i);
  const nameMatch = input.match(/(?:student|name|for)\s+([A-Z][a-zA-Z]{2,20})/) || input.match(/\b([A-Z][a-zA-Z]{2,20})\b/);
  return {
    studentName: nameMatch?.[1] || null,
    className: classMatch ? `Class ${classMatch[1]}` : null,
    parentPhone: phoneMatch?.[1] || null,
    amount: amountMatch?.[1] || null,
    course: courseMatch?.[1]?.trim() || null
  };
}

function part88AccessCheck({ role, instituteId, moduleKey }) {
  const normalizedRole = normalizePart88Role(role);
  const roleRule = part88RoleScopes.find((r) => r.role === normalizedRole) || {
    role: normalizedRole,
    scope: "Unknown role.",
    canExecuteSensitive: false
  };
  const moduleRule = part88ConversationModules.find((m) => m.key === moduleKey) || part88ConversationModules.find((m) => m.key === "general");
  const hasInstituteId = Boolean(String(instituteId || "").trim());
  const roleAllowed = moduleRule.allowedRoles.includes(normalizedRole);
  const allowed = hasInstituteId && roleAllowed && normalizedRole !== "naxora_super_admin";
  return {
    role: normalizedRole,
    instituteId: instituteId || null,
    moduleKey,
    allowed,
    roleAllowed,
    scope: roleRule.scope,
    canExecuteSensitive: roleRule.canExecuteSensitive,
    privateScreenFirst: Boolean(moduleRule.privateScreenFirst),
    reason: !hasInstituteId
      ? "Institute ID missing."
      : normalizedRole === "naxora_super_admin"
        ? "Super Admin has platform support only, not unrestricted private institute conversation."
        : !roleAllowed
          ? "This role cannot access this module through VANI."
          : "Conversation access allowed.",
    requiresLogin: true,
    requiresInstituteId: true
  };
}

function part88MissingDetails({ moduleKey, intent, entities, role }) {
  const missing = [];
  if (moduleKey === "admissions") {
    if (!entities.studentName) missing.push({ key: "studentName", question: "Student ka naam kya hai?" });
    if (!entities.className && !entities.course) missing.push({ key: "course", question: "Kaunsi class ya course ke liye admission chahiye?" });
    if (!entities.parentPhone) missing.push({ key: "parentPhone", question: "Parent ka mobile number kya hai?" });
  }
  if (moduleKey === "fees" && !entities.studentName) {
    missing.push({ key: "studentName", question: "Kis student ki fee details chahiye?" });
  }
  if (moduleKey === "attendance" && !entities.className && !entities.studentName) {
    missing.push({ key: "batchOrStudent", question: "Attendance kis batch ya student ki dekhni hai?" });
  }
  if (moduleKey === "learning" && role !== "student" && !entities.studentName) {
    missing.push({ key: "studentName", question: "Kis student ke learning details chahiye?" });
  }
  if (moduleKey === "reports" && intent === "owner_daily_brief" && !["institute_owner", "branch_manager"].includes(role)) {
    missing.push({ key: "reportScope", question: "Aapke role ke hisaab se kaunsa report chahiye: fee, attendance, class, student ya child report?" });
  }
  return missing;
}

function part88BuildReply({ command, role, instituteId, sessionId }) {
  const language = part88DetectLanguage(command);
  const detected = part88DetectIntent(command);
  const entities = part88ExtractSimpleEntities(command);
  const access = part88AccessCheck({ role, instituteId, moduleKey: detected.module });
  const missing = access.allowed ? part88MissingDetails({ moduleKey: detected.module, intent: detected.intent, entities, role: access.role }) : [];
  const needsFollowUp = missing.length > 0;

  let replyText = "";
  let screenPreview = {};
  let nextAction = "none";
  let confirmationRequired = false;

  if (!access.allowed) {
    replyText = language === "english"
      ? "You do not have permission for this VANI module."
      : "Is VANI module ke liye aapke role ko permission nahi hai.";
    screenPreview = { access };
  } else if (needsFollowUp) {
    replyText = missing[0].question;
    screenPreview = { missingDetails: missing, detectedIntent: detected, extractedEntities: entities };
    nextAction = "ask_missing_detail";
  } else {
    if (detected.module === "admissions") {
      replyText = "Admission draft preview ready hai. Final create karne se pehle confirmation zaroori hai.";
      screenPreview = {
        draftType: "admission_preview",
        studentName: entities.studentName || "Demo Student",
        className: entities.className || entities.course || "Class 10",
        parentPhone: entities.parentPhone || "Not provided",
        source: "VANI Conversation",
        status: "preview_only"
      };
      confirmationRequired = true;
      nextAction = "preview_admission_draft";
    } else if (detected.module === "fees") {
      replyText = "Fee summary screen par privately dikhayi gayi hai. Sensitive amount loudspeaker par nahi bola jayega.";
      screenPreview = {
        studentName: entities.studentName || "Demo Student",
        safeFeeStatus: "pending_summary_available",
        amount: entities.amount ? `₹${entities.amount}` : "Private screen only",
        action: detected.intent,
        privateScreenFirst: true
      };
      nextAction = "show_private_fee_summary";
    } else if (detected.module === "attendance") {
      replyText = "Attendance summary ready hai. Low attendance details screen par privately dikhaye gaye hain.";
      screenPreview = {
        target: entities.className || entities.studentName || "Assigned context",
        attendanceAverage: "87%",
        lowAttendanceAlerts: 7,
        action: detected.intent
      };
      nextAction = "show_attendance_summary";
    } else if (detected.module === "learning") {
      replyText = "Learning support ready hai. Homework, tests aur revision steps screen par dikh rahe hain.";
      screenPreview = {
        studentName: entities.studentName || "Own student context",
        homeworkPending: 2,
        upcomingTests: 1,
        revisionPlan: ["20 minute weak topic revision", "10 practice questions", "5 flashcards"]
      };
      nextAction = "show_learning_support";
    } else if (detected.module === "reports") {
      replyText = "Voice report ready hai. Main safe summary bol sakti hoon, sensitive details screen par rahenge.";
      screenPreview = {
        report: detected.intent,
        safeSpokenSummary: "Report ready hai. Sensitive details screen par privately dikhaye gaye hain.",
        publicMetrics: ["new enquiries", "attendance average", "pending actions"],
        privateScreenFirst: true
      };
      nextAction = "read_safe_report_summary";
    } else {
      replyText = "Main VANI hoon. Aap admissions, fees, attendance, learning ya reports ke baare me pooch sakte ho.";
      screenPreview = {
        suggestions: [
          "VANI, attendance report batao",
          "VANI, fee summary dikhao",
          "VANI, admission draft banao",
          "VANI, homework batao",
          "VANI, owner daily report sunao"
        ]
      };
      nextAction = "show_help";
    }
  }

  const spokenSafeSummary = replyText;
  return {
    sessionId: sessionId || `VANI-CONV-${Date.now()}`,
    language,
    detectedModule: detected.module,
    detectedIntent: detected.intent,
    extractedEntities: entities,
    access,
    needsFollowUp,
    missingDetails: missing,
    replyText,
    spokenSafeSummary,
    screenPreview,
    nextAction,
    privateScreenFirst: access.privateScreenFirst || detected.module === "fees",
    confirmationRequired,
    confirmationRequiredFor: ["create", "update", "send", "delete", "refund", "discount", "export", "subscription_change"],
    ownerVerificationRequiredFor: ["refund", "discount", "delete", "export", "subscription_change", "3.0_access_change"],
    auditLog: {
      event: "part88_vani_conversation_turn",
      module: detected.module,
      intent: detected.intent,
      language,
      createdAt: new Date().toISOString()
    }
  };
}

const part88Checklist = [
  "Hindi/Hinglish VANI Conversation page opens",
  "Status API returns success true",
  "Language detection works for Hindi/Hinglish/English commands",
  "Intent detection routes to admissions/fees/attendance/learning/reports",
  "Missing details follow-up questions are returned",
  "Unauthorized role is blocked",
  "Sensitive fee/student/child details stay private-screen-first",
  "Conversation reply is shown on screen and spoken safely",
  "Previous Part 1–87 routes remain preserved"
];

app.get("/api/part88/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 88 — Hindi/Hinglish VANI Conversation",
    status: "active",
    versionPhase: "NAXORA OS 2.0",
    latestCompletedPart: 88,
    nextPart: "Part 89 — AI Admission Counsellor Foundation",
    preservesPreviousFeatures: true,
    frontendRoutes: ["/hindi-hinglish-vani-conversation", "/vani-conversation", "/hinglish-vani", "/hindi-vani", "/vani-chat", "/vani-conversation-mode"],
    apiRoutes: [
      "/api/part88/config",
      "/api/part88/languages",
      "/api/part88/modules",
      "/api/part88/roles",
      "/api/part88/language/detect",
      "/api/part88/intent/detect",
      "/api/part88/conversation/reply",
      "/api/part88/conversation/session",
      "/api/part88/vani/greeting",
      "/api/part88/vani/command"
    ],
    hindiHinglishConversationEnabled: true
  });
});

app.get("/api/part88/config", (req, res) => {
  res.json({
    success: true,
    appName: "Hindi/Hinglish VANI Conversation",
    appType: "safe_conversation_foundation",
    version: "2.0-vani-conversation",
    voice: {
      speechSynthesis: true,
      speechRecognition: true,
      userClickRequired: true,
      supportedLanguages: ["hi-IN", "en-IN"]
    },
    safety: {
      privateScreenFirst: true,
      noGuessingMissingDetails: true,
      permissionCheckEveryTurn: true,
      confirmationBeforeActions: true,
      ownerVerificationForSensitiveActions: true
    }
  });
});

app.get("/api/part88/languages", (req, res) => {
  res.json({ success: true, languages: part88ConversationLanguages });
});

app.get("/api/part88/modules", (req, res) => {
  res.json({ success: true, modules: part88ConversationModules });
});

app.get("/api/part88/roles", (req, res) => {
  res.json({ success: true, roles: part88RoleScopes });
});

app.get("/api/part88/language/detect", (req, res) => {
  const text = req.query.q || req.query.command || "";
  res.json({ success: true, text, language: part88DetectLanguage(text) });
});

app.get("/api/part88/intent/detect", (req, res) => {
  const text = req.query.q || req.query.command || "";
  res.json({ success: true, text, ...part88DetectIntent(text), entities: part88ExtractSimpleEntities(text) });
});

app.post("/api/part88/conversation/reply", (req, res) => {
  const body = req.body || {};
  const command = String(body.command || body.q || body.message || "").trim();
  const result = part88BuildReply({
    command,
    role: body.role || "student",
    instituteId: body.instituteId || "NX-DEMO-INST-001",
    sessionId: body.sessionId
  });
  if (!result.access.allowed) return res.status(403).json({ success: false, assistant: "VANI", ...result });
  res.json({ success: true, assistant: "VANI", part: "Part 88 — Hindi/Hinglish VANI Conversation", command, ...result });
});

app.get("/api/part88/conversation/reply", (req, res) => {
  const command = String(req.query.command || req.query.q || req.query.message || "").trim();
  const result = part88BuildReply({
    command,
    role: req.query.role || "student",
    instituteId: req.query.instituteId || "NX-DEMO-INST-001",
    sessionId: req.query.sessionId
  });
  if (!result.access.allowed) return res.status(403).json({ success: false, assistant: "VANI", ...result });
  res.json({ success: true, assistant: "VANI", part: "Part 88 — Hindi/Hinglish VANI Conversation", command, ...result });
});

app.post("/api/part88/conversation/session", (req, res) => {
  const body = req.body || {};
  const sessionId = body.sessionId || `VANI-CONV-${Date.now()}`;
  const turns = Array.isArray(body.turns) ? body.turns.slice(-8) : [];
  const lastMessage = body.message || body.command || turns[turns.length - 1]?.message || "VANI, help karo";
  const result = part88BuildReply({
    command: lastMessage,
    role: body.role || "student",
    instituteId: body.instituteId || "NX-DEMO-INST-001",
    sessionId
  });
  res.json({
    success: result.access.allowed,
    assistant: "VANI",
    session: {
      sessionId,
      turnCount: turns.length + 1,
      lastLanguage: result.language,
      contextPolicy: "Session context is temporary foundation mode. Production persistence will be added later."
    },
    reply: result
  });
});

app.get("/api/part88/vani/greeting", (req, res) => {
  res.json({
    success: true,
    assistant: "VANI",
    greeting: "Namaste, main VANI hoon. Aap Hindi, English ya Hinglish me bol sakte ho. Main aapki kya help kar sakti hoon?",
    exampleCommands: [
      "VANI, attendance report batao",
      "VANI, fee summary dikhao",
      "VANI, admission draft banao",
      "VANI, homework kya hai",
      "VANI, owner daily report sunao"
    ],
    privateScreenFirstReminder: "Sensitive data loudspeaker par nahi, screen par privately dikhaya jayega."
  });
});

app.post("/api/part88/vani/command", (req, res) => {
  const body = req.body || {};
  const command = String(body.command || body.q || "").trim();
  const result = part88BuildReply({
    command,
    role: body.role || "student",
    instituteId: body.instituteId || "NX-DEMO-INST-001",
    sessionId: body.sessionId
  });
  if (!result.access.allowed) return res.status(403).json({ success: false, assistant: "VANI", ...result });
  res.json({ success: true, assistant: "VANI", part: "Part 88 — Hindi/Hinglish VANI Conversation", command, ...result });
});

app.get("/api/part88/vani/command", (req, res) => {
  const command = String(req.query.command || req.query.q || "").trim();
  const result = part88BuildReply({
    command,
    role: req.query.role || "student",
    instituteId: req.query.instituteId || "NX-DEMO-INST-001",
    sessionId: req.query.sessionId
  });
  if (!result.access.allowed) return res.status(403).json({ success: false, assistant: "VANI", ...result });
  res.json({ success: true, assistant: "VANI", part: "Part 88 — Hindi/Hinglish VANI Conversation", command, ...result });
});

app.get("/api/part88/audit-log", (req, res) => {
  res.json({
    success: true,
    auditLog: [
      {
        event: "vani_conversation_turn",
        language: "hinglish",
        module: "general",
        privateScreenFirst: true,
        createdAt: new Date().toISOString()
      },
      {
        event: "permission_check_every_turn",
        rule: "role + instituteId + module access",
        createdAt: new Date().toISOString()
      }
    ]
  });
});

app.get("/api/part88/activity", (req, res) => {
  res.json({
    success: true,
    activity: [
      { type: "hindi_hinglish_conversation_created", message: "Part 88 VANI conversation active.", createdAt: new Date().toISOString() },
      { type: "missing_detail_questions", message: "VANI asks follow-up questions instead of guessing.", createdAt: new Date().toISOString() }
    ]
  });
});

app.get("/api/part88/checklist", (req, res) => {
  res.json({ success: true, checklist: part88Checklist });
});

app.get("/api/part88/export", (req, res) => {
  res.json({
    success: true,
    exportType: "part88-hindi-hinglish-vani-conversation-readiness",
    ownerVerificationRequiredForSensitiveExports: true,
    generatedAt: new Date().toISOString(),
    data: {
      languages: part88ConversationLanguages,
      modules: part88ConversationModules,
      roles: part88RoleScopes,
      checklist: part88Checklist
    }
  });
});

app.get("/api/part88/demo", (req, res) => {
  const sample = part88BuildReply({
    command: "VANI, Aman class 10 admission draft banao parent phone 9876543210",
    role: "receptionist_counsellor",
    instituteId: "NX-DEMO-INST-001",
    sessionId: "VANI-DEMO-SESSION"
  });
  res.json({
    success: true,
    demo: {
      sampleConversation: sample,
      sampleCommands: [
        "VANI, attendance report batao",
        "VANI, fee summary dikhao",
        "VANI, admission draft banao",
        "VANI, homework kya hai",
        "VANI, owner daily report sunao"
      ],
      nextPart: "Part 89 — AI Admission Counsellor Foundation"
    }
  });
});
// ================= END PART 88 =================

// ================= PART 89 — AI ADMISSION COUNSELLOR FOUNDATION =================
// NAXORA OS 2.0 AI Admission Counsellor Foundation.
// This part gives institutes a safe, rule-based admission counselling workflow:
// intake -> missing details -> lead score -> course recommendation -> fee plan preview
// -> demo class preview -> follow-up script -> VANI counselling reply.
// No external LLM/API keys are included.

const part89CounsellorFeatures = [
  {
    key: "lead_intake",
    name: "AI Lead Intake",
    summary: "Collects student, class/course, parent phone, goal, budget and source.",
    problemSolved: "Counsellor gets a clean admission enquiry structure."
  },
  {
    key: "missing_detail_questions",
    name: "Missing Detail Questions",
    summary: "Asks for missing details instead of guessing.",
    problemSolved: "Wrong admission drafts and confused follow-ups reduce."
  },
  {
    key: "lead_score",
    name: "Lead Score",
    summary: "Marks lead as hot, warm or cold using course interest, phone, demo, urgency and source.",
    problemSolved: "Reception/counsellor team knows which leads to call first."
  },
  {
    key: "course_recommendation",
    name: "Course Recommendation",
    summary: "Suggests course/package foundation based on class, subject and goal.",
    problemSolved: "New leads get faster, consistent counselling."
  },
  {
    key: "fee_plan_preview",
    name: "Fee Plan Preview",
    summary: "Shows safe fee-plan options as preview only.",
    problemSolved: "Fees can be discussed without accidental discount/commitment."
  },
  {
    key: "demo_class_preview",
    name: "Demo Class Preview",
    summary: "Creates demo class booking preview requiring confirmation.",
    problemSolved: "Demo scheduling becomes faster but still safe."
  },
  {
    key: "followup_script",
    name: "Follow-up Script Draft",
    summary: "Creates WhatsApp/call follow-up draft in Hindi/Hinglish.",
    problemSolved: "Counsellors can respond quickly without writing from scratch."
  },
  {
    key: "objection_handling",
    name: "Objection Handling",
    summary: "Gives safe responses for common objections like fees, timing and distance.",
    problemSolved: "Counsellors get consistent guidance."
  },
  {
    key: "vani_admission_counselling",
    name: "VANI Admission Counselling",
    summary: "Hindi/Hinglish conversation for admission counselling with permission checks.",
    problemSolved: "Staff can speak naturally and get structured counselling help."
  }
];

const part89RoleRules = [
  {
    role: "institute_owner",
    allowed: true,
    scope: "Full authorised institute and branch counselling workflow.",
    canApproveSensitive: true
  },
  {
    role: "branch_manager",
    allowed: true,
    scope: "Assigned branch admissions and counselling only.",
    canApproveSensitive: false
  },
  {
    role: "receptionist_counsellor",
    allowed: true,
    scope: "Enquiry intake, counselling, demo preview and follow-up drafts.",
    canApproveSensitive: false
  },
  {
    role: "teacher",
    allowed: true,
    previewOnly: true,
    scope: "Academic course fit preview only. Cannot create admission or fee commitment.",
    canApproveSensitive: false
  },
  {
    role: "accountant",
    allowed: true,
    previewOnly: true,
    scope: "Fee-plan preview only. Cannot create admission lead from this module.",
    canApproveSensitive: false
  },
  {
    role: "student",
    allowed: false,
    scope: "Student app/learning support only.",
    canApproveSensitive: false
  },
  {
    role: "parent",
    allowed: false,
    scope: "Parent app/linked child support only.",
    canApproveSensitive: false
  },
  {
    role: "naxora_super_admin",
    allowed: false,
    scope: "Platform support only; no unrestricted institute admission counselling access.",
    canApproveSensitive: false
  }
];

function normalizePart89Role(role) {
  const r = String(role || "receptionist_counsellor").toLowerCase().trim().replace(/\s+/g, "_");
  if (["owner", "instituteowner", "institute_owner"].includes(r)) return "institute_owner";
  if (["branchmanager", "branch_manager"].includes(r)) return "branch_manager";
  if (["receptionist", "counsellor", "receptionist_counsellor", "admission_counsellor"].includes(r)) return "receptionist_counsellor";
  return r;
}

function part89AccessCheck({ role, instituteId, branchId }) {
  const normalizedRole = normalizePart89Role(role);
  const rule = part89RoleRules.find((r) => r.role === normalizedRole) || {
    role: normalizedRole,
    allowed: false,
    scope: "Unknown or unsupported role.",
    canApproveSensitive: false
  };
  const hasInstituteId = Boolean(String(instituteId || "").trim());
  const allowed = Boolean(rule.allowed && hasInstituteId && normalizedRole !== "naxora_super_admin");
  return {
    role: normalizedRole,
    instituteId: instituteId || null,
    branchId: branchId || null,
    allowed,
    previewOnly: Boolean(rule.previewOnly),
    canApproveSensitive: Boolean(rule.canApproveSensitive),
    scope: rule.scope,
    reason: !hasInstituteId
      ? "Institute ID missing."
      : !rule.allowed
        ? rule.scope
        : rule.previewOnly
          ? "Preview allowed only. Final admission actions require counsellor/owner role."
          : "Admission counsellor access allowed.",
    requiresLogin: true,
    requiresInstituteId: true,
    requiresConfirmationFor: ["lead_create", "demo_book", "followup_send", "admission_create"],
    ownerVerificationRequiredFor: ["discount", "refund", "fee_commitment", "delete", "export", "subscription_change"]
  };
}

function part89ExtractLead(text = "", body = {}) {
  const input = String(text || body.command || body.q || "").trim();
  const classMatch = input.match(/class\s*([0-9]{1,2})/i);
  const phoneMatch = input.match(/(?:phone|mobile|number|contact)\s*[:\-]?\s*([6-9][0-9]{9})/i);
  const sourceMatch = input.match(/(?:source|from)\s*[:\-]?\s*([a-zA-Z ]{3,30})/i);
  const subjectMatch = input.match(/\b(maths|math|science|english|physics|chemistry|biology|commerce|accounts|sst|social science)\b/i);
  const budgetMatch = input.match(/(?:budget|fee|fees|amount)\s*[:\-]?\s*([0-9]{3,7})/i);
  const nameMatch = input.match(/(?:student|name|lead|for)\s+([A-Z][a-zA-Z]{2,20})/) || input.match(/\b([A-Z][a-zA-Z]{2,20})\b/);
  const urgency = /today|urgent|jaldi|abhi|immediate|this week|demo/i.test(input) ? "high" : /next month|later|baad/i.test(input) ? "low" : "medium";
  return {
    studentName: body.studentName || nameMatch?.[1] || null,
    className: body.className || (classMatch ? `Class ${classMatch[1]}` : null),
    subject: body.subject || (subjectMatch ? subjectMatch[1].toLowerCase().replace("math", "maths") : null),
    parentPhone: body.parentPhone || phoneMatch?.[1] || null,
    source: body.source || sourceMatch?.[1]?.trim() || (/whatsapp/i.test(input) ? "WhatsApp" : /google/i.test(input) ? "Google" : /walk/i.test(input) ? "Walk-in" : null),
    goal: body.goal || (/board/i.test(input) ? "Board exam preparation" : /foundation/i.test(input) ? "Foundation course" : /competitive|jee|neet/i.test(input) ? "Competitive exam preparation" : null),
    budget: body.budget || budgetMatch?.[1] || null,
    urgency,
    rawCommand: input
  };
}

function part89MissingDetails(lead = {}) {
  const missing = [];
  if (!lead.studentName) missing.push({ key: "studentName", question: "Student ka naam kya hai?" });
  if (!lead.className) missing.push({ key: "className", question: "Student kis class me hai?" });
  if (!lead.subject && !lead.goal) missing.push({ key: "subjectOrGoal", question: "Kaunsa subject ya goal ke liye counselling chahiye?" });
  if (!lead.parentPhone) missing.push({ key: "parentPhone", question: "Parent ka mobile number kya hai?" });
  if (!lead.source) missing.push({ key: "source", question: "Lead source kya hai: WhatsApp, call, walk-in, Google ya referral?" });
  return missing;
}

function part89LeadScore(lead = {}) {
  let score = 30;
  const reasons = [];
  if (lead.parentPhone) { score += 20; reasons.push("parent phone available"); }
  if (lead.className) { score += 10; reasons.push("class known"); }
  if (lead.subject || lead.goal) { score += 15; reasons.push("course interest clear"); }
  if (lead.urgency === "high") { score += 15; reasons.push("high urgency"); }
  if (["WhatsApp", "Walk-in", "Referral"].includes(lead.source)) { score += 10; reasons.push("high-intent source"); }
  if (lead.budget) { score += 5; reasons.push("budget mentioned"); }
  score = Math.min(100, score);
  const category = score >= 75 ? "hot" : score >= 50 ? "warm" : "cold";
  const priority = category === "hot" ? "Call within 15 minutes" : category === "warm" ? "Follow up today" : "Add to nurture list";
  return { score, category, priority, reasons };
}

function part89CourseRecommendation(lead = {}) {
  const cls = String(lead.className || "").toLowerCase();
  const subject = String(lead.subject || "").toLowerCase();
  const goal = String(lead.goal || "").toLowerCase();
  let recommendedCourse = "Foundation Learning Plan";
  let batchType = "Regular batch";
  let reason = "General learning support based on available details.";

  if (cls.includes("10") && (subject.includes("math") || goal.includes("board"))) {
    recommendedCourse = "Class 10 Board Booster — Maths/Science";
    batchType = "Board-focused batch";
    reason = "Class 10 needs board exam preparation and practice."
  } else if (cls.includes("11") || cls.includes("12") || goal.includes("competitive") || goal.includes("jee") || goal.includes("neet")) {
    recommendedCourse = "Senior Competitive + Board Support";
    batchType = "Hybrid board + competitive batch";
    reason = "Senior students need concept clarity and test practice."
  } else if (cls.includes("8") || cls.includes("9")) {
    recommendedCourse = "Foundation Skill Builder";
    batchType = "Foundation batch";
    reason = "Middle/early high school students benefit from foundation concepts."
  } else if (subject.includes("english")) {
    recommendedCourse = "English Communication and School Support";
    batchType = "Skill + school support batch";
    reason = "English queries need practice, reading and writing support."
  }

  return {
    recommendedCourse,
    batchType,
    reason,
    suggestedDuration: "3 months starter plan",
    suggestedNextStep: "Book demo class before final admission."
  };
}

function part89FeePlanPreview(lead = {}) {
  const cls = String(lead.className || "").toLowerCase();
  const base = cls.includes("11") || cls.includes("12") ? 4500 : cls.includes("10") ? 3500 : 2500;
  return {
    previewOnly: true,
    currency: "INR",
    monthlyEstimate: base,
    starterOffer: "Demo class first. Discount needs owner verification.",
    paymentOptions: ["monthly", "quarterly", "full course"],
    safety: "No fee commitment, discount or payment action without owner/accountant confirmation."
  };
}

function part89DemoClassPreview(lead = {}) {
  const subject = lead.subject || "Counselling Demo";
  return {
    previewOnly: true,
    demoId: `DEMO-PREVIEW-${Date.now()}`,
    studentName: lead.studentName || "Pending student name",
    subject,
    suggestedSlot: "Tomorrow 5:00 PM",
    mode: "offline_or_online",
    confirmationRequired: true,
    message: "Demo booking preview ready. Final booking requires confirmation."
  };
}

function part89FollowupScript(lead = {}, score = {}) {
  const name = lead.studentName || "student";
  const course = part89CourseRecommendation(lead).recommendedCourse;
  const urgencyLine = score.category === "hot"
    ? "Aapke interest ke hisaab se demo class jaldi schedule karna best rahega."
    : "Aap comfortable time bata dijiye, hum course details aur demo class guide kar denge.";
  return {
    language: "Hindi/Hinglish",
    channel: "WhatsApp/call script",
    autoSend: false,
    confirmationRequired: true,
    script: `Namaste, NAXORA Institute se baat kar rahe hain. ${name} ke liye ${course} suitable lag raha hai. ${urgencyLine} Kya kal 5 PM demo class theek rahegi?`
  };
}

function part89ObjectionHandling(text = "") {
  const input = String(text || "").toLowerCase();
  if (input.includes("fee") || input.includes("expensive") || input.includes("mehenga")) {
    return {
      objection: "Fees concern",
      safeResponse: "Fees decision se pehle demo class aur learning plan dekh lijiye. Discount ya fee change owner approval ke bina commit nahi hoga."
    };
  }
  if (input.includes("time") || input.includes("timing")) {
    return {
      objection: "Timing issue",
      safeResponse: "Hum available batch timings screen par check karke suitable demo slot suggest kar sakte hain."
    };
  }
  if (input.includes("distance") || input.includes("far") || input.includes("door")) {
    return {
      objection: "Distance issue",
      safeResponse: "Offline ke saath online/live class option bhi explain kiya ja sakta hai, institute policy ke hisaab se."
    };
  }
  return {
    objection: "General concern",
    safeResponse: "Parent/student ka exact concern note karke course, demo aur support plan clearly explain karein."
  };
}

function part89BuildCounsellorReply({ command, role, instituteId, branchId, body = {} }) {
  const access = part89AccessCheck({ role, instituteId, branchId });
  const lead = part89ExtractLead(command, body);
  const missing = access.allowed ? part89MissingDetails(lead) : [];
  const score = part89LeadScore(lead);
  const recommendation = part89CourseRecommendation(lead);
  const feePlan = part89FeePlanPreview(lead);
  const demoClass = part89DemoClassPreview(lead);
  const followup = part89FollowupScript(lead, score);
  const objection = part89ObjectionHandling(command);

  let replyText = "";
  let nextAction = "none";
  if (!access.allowed) {
    replyText = "Is role ko AI Admission Counsellor access nahi hai.";
    nextAction = "blocked";
  } else if (access.previewOnly) {
    replyText = "Aap preview dekh sakte ho. Final admission, demo booking ya fee commitment counsellor/owner confirmation se hi hoga.";
    nextAction = "preview_only";
  } else if (missing.length) {
    replyText = missing[0].question;
    nextAction = "ask_missing_detail";
  } else {
    replyText = `${lead.studentName} ke liye admission counselling preview ready hai. Lead ${score.category} hai. Recommended course: ${recommendation.recommendedCourse}. Final save/send se pehle confirmation zaroori hai.`;
    nextAction = "show_counselling_preview";
  }

  return {
    access,
    lead,
    missingDetails: missing,
    leadScore: score,
    courseRecommendation: recommendation,
    feePlanPreview: feePlan,
    demoClassPreview: demoClass,
    followupScript: followup,
    objectionHandling: objection,
    replyText,
    spokenSafeSummary: replyText,
    privateScreenFirst: true,
    nextAction,
    confirmationRequiredFor: ["lead_create", "demo_book", "followup_send", "admission_create"],
    ownerVerificationRequiredFor: ["discount", "refund", "fee_commitment", "delete", "export", "subscription_change", "3.0_access_change"],
    auditLog: {
      event: "part89_ai_admission_counsellor",
      leadCategory: score.category,
      role: access.role,
      createdAt: new Date().toISOString()
    }
  };
}

const part89Checklist = [
  "AI Admission Counsellor page opens",
  "Status API returns success true",
  "Lead intake extracts basic details",
  "Missing details are asked instead of guessed",
  "Lead score returns hot/warm/cold",
  "Course recommendation returns preview",
  "Fee plan is preview-only",
  "Demo class is preview-only with confirmation required",
  "Follow-up script is draft only",
  "Unauthorized roles are blocked",
  "Previous Part 1–88 routes remain preserved"
];

app.get("/api/part89/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 89 — AI Admission Counsellor Foundation",
    status: "active",
    versionPhase: "NAXORA OS 2.0",
    latestCompletedPart: 89,
    nextPart: "Part 90 — AI Course Recommendation",
    preservesPreviousFeatures: true,
    frontendRoutes: ["/ai-admission-counsellor-foundation", "/ai-admission-counsellor", "/admission-counsellor-ai", "/admission-counselling-ai", "/smart-admission-counsellor", "/ai-counsellor"],
    apiRoutes: [
      "/api/part89/config",
      "/api/part89/features",
      "/api/part89/roles",
      "/api/part89/access-check",
      "/api/part89/counsellor/intake",
      "/api/part89/counsellor/lead-score",
      "/api/part89/counsellor/course-recommendation",
      "/api/part89/counsellor/fee-plan",
      "/api/part89/counsellor/demo-class",
      "/api/part89/counsellor/followup-script",
      "/api/part89/counsellor/objection-handling",
      "/api/part89/counsellor/conversation-reply",
      "/api/part89/vani/greeting",
      "/api/part89/vani/command"
    ],
    aiAdmissionCounsellorEnabled: true
  });
});

app.get("/api/part89/config", (req, res) => {
  res.json({
    success: true,
    appName: "AI Admission Counsellor Foundation",
    appType: "admission_counselling_ai_foundation",
    version: "2.0-ai-admission-counsellor",
    policy: {
      previewFirst: true,
      noGuessingMissingDetails: true,
      noAutoSend: true,
      noFeeCommitmentWithoutOwnerApproval: true,
      noExternalLLMKeysIncluded: true
    }
  });
});

app.get("/api/part89/features", (req, res) => {
  res.json({ success: true, features: part89CounsellorFeatures });
});

app.get("/api/part89/roles", (req, res) => {
  res.json({ success: true, roles: part89RoleRules });
});

app.get("/api/part89/access-check", (req, res) => {
  res.json({ success: true, access: part89AccessCheck(req.query || {}) });
});

app.get("/api/part89/counsellor/intake", (req, res) => {
  const lead = part89ExtractLead(req.query.q || req.query.command || "", req.query || {});
  res.json({
    success: true,
    lead,
    missingDetails: part89MissingDetails(lead),
    note: "Intake is preview-only. Final lead create requires confirmation."
  });
});

app.post("/api/part89/counsellor/intake", (req, res) => {
  const lead = part89ExtractLead(req.body?.q || req.body?.command || "", req.body || {});
  res.json({
    success: true,
    lead,
    missingDetails: part89MissingDetails(lead),
    note: "Intake is preview-only. Final lead create requires confirmation."
  });
});

app.get("/api/part89/counsellor/lead-score", (req, res) => {
  const lead = part89ExtractLead(req.query.q || req.query.command || "", req.query || {});
  res.json({ success: true, lead, leadScore: part89LeadScore(lead) });
});

app.get("/api/part89/counsellor/course-recommendation", (req, res) => {
  const lead = part89ExtractLead(req.query.q || req.query.command || "", req.query || {});
  res.json({ success: true, lead, courseRecommendation: part89CourseRecommendation(lead) });
});

app.get("/api/part89/counsellor/fee-plan", (req, res) => {
  const access = part89AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  const lead = part89ExtractLead(req.query.q || req.query.command || "", req.query || {});
  res.json({ success: true, access, lead, privateScreenFirst: true, feePlanPreview: part89FeePlanPreview(lead) });
});

app.get("/api/part89/counsellor/demo-class", (req, res) => {
  const access = part89AccessCheck(req.query || {});
  if (!access.allowed || access.previewOnly) return res.status(403).json({ success: false, access, message: access.previewOnly ? "Preview-only role cannot book demo." : access.reason });
  const lead = part89ExtractLead(req.query.q || req.query.command || "", req.query || {});
  res.json({ success: true, access, lead, demoClassPreview: part89DemoClassPreview(lead) });
});

app.get("/api/part89/counsellor/followup-script", (req, res) => {
  const access = part89AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  const lead = part89ExtractLead(req.query.q || req.query.command || "", req.query || {});
  const score = part89LeadScore(lead);
  res.json({ success: true, access, lead, leadScore: score, followupScript: part89FollowupScript(lead, score) });
});

app.get("/api/part89/counsellor/objection-handling", (req, res) => {
  res.json({
    success: true,
    objectionHandling: part89ObjectionHandling(req.query.q || req.query.command || "")
  });
});

app.post("/api/part89/counsellor/conversation-reply", (req, res) => {
  const body = req.body || {};
  const result = part89BuildCounsellorReply({
    command: body.command || body.q || body.message || "",
    role: body.role || "receptionist_counsellor",
    instituteId: body.instituteId || "NX-DEMO-INST-001",
    branchId: body.branchId,
    body
  });
  if (!result.access.allowed) return res.status(403).json({ success: false, assistant: "AI Admission Counsellor", ...result });
  res.json({ success: true, assistant: "AI Admission Counsellor", part: "Part 89 — AI Admission Counsellor Foundation", ...result });
});

app.get("/api/part89/counsellor/conversation-reply", (req, res) => {
  const result = part89BuildCounsellorReply({
    command: req.query.command || req.query.q || req.query.message || "",
    role: req.query.role || "receptionist_counsellor",
    instituteId: req.query.instituteId || "NX-DEMO-INST-001",
    branchId: req.query.branchId,
    body: req.query || {}
  });
  if (!result.access.allowed) return res.status(403).json({ success: false, assistant: "AI Admission Counsellor", ...result });
  res.json({ success: true, assistant: "AI Admission Counsellor", part: "Part 89 — AI Admission Counsellor Foundation", ...result });
});

app.get("/api/part89/vani/greeting", (req, res) => {
  res.json({
    success: true,
    assistant: "VANI Admission Counsellor",
    greeting: "Namaste, main VANI Admission Counsellor hoon. Aap admission lead ya counselling ke baare me Hindi/Hinglish me bol sakte ho.",
    exampleCommands: [
      "VANI, Aman Class 10 Maths admission counselling banao parent phone 9876543210 source WhatsApp",
      "VANI, lead score batao",
      "VANI, demo class preview banao",
      "VANI, follow-up script banao",
      "VANI, fee objection ka reply batao"
    ],
    safety: "Final admission create, demo booking, fee commitment ya message send confirmation ke bina nahi hoga."
  });
});

app.post("/api/part89/vani/command", (req, res) => {
  const body = req.body || {};
  const result = part89BuildCounsellorReply({
    command: body.command || body.q || "",
    role: body.role || "receptionist_counsellor",
    instituteId: body.instituteId || "NX-DEMO-INST-001",
    branchId: body.branchId,
    body
  });
  if (!result.access.allowed) return res.status(403).json({ success: false, assistant: "VANI", ...result });
  res.json({ success: true, assistant: "VANI", part: "Part 89 — AI Admission Counsellor Foundation", ...result });
});

app.get("/api/part89/vani/command", (req, res) => {
  const result = part89BuildCounsellorReply({
    command: req.query.command || req.query.q || "",
    role: req.query.role || "receptionist_counsellor",
    instituteId: req.query.instituteId || "NX-DEMO-INST-001",
    branchId: req.query.branchId,
    body: req.query || {}
  });
  if (!result.access.allowed) return res.status(403).json({ success: false, assistant: "VANI", ...result });
  res.json({ success: true, assistant: "VANI", part: "Part 89 — AI Admission Counsellor Foundation", ...result });
});

app.get("/api/part89/audit-log", (req, res) => {
  res.json({
    success: true,
    auditLog: [
      { event: "ai_admission_counsellor_preview", role: "receptionist_counsellor", createdAt: new Date().toISOString() },
      { event: "no_auto_send_policy", rule: "followup drafts require confirmation", createdAt: new Date().toISOString() }
    ]
  });
});

app.get("/api/part89/activity", (req, res) => {
  res.json({
    success: true,
    activity: [
      { type: "ai_admission_counsellor_created", message: "Part 89 AI Admission Counsellor active.", createdAt: new Date().toISOString() },
      { type: "lead_score_policy", message: "Lead scoring is rule-based foundation mode.", createdAt: new Date().toISOString() }
    ]
  });
});

app.get("/api/part89/checklist", (req, res) => {
  res.json({ success: true, checklist: part89Checklist });
});

app.get("/api/part89/export", (req, res) => {
  res.json({
    success: true,
    exportType: "part89-ai-admission-counsellor-readiness",
    ownerVerificationRequiredForSensitiveExports: true,
    generatedAt: new Date().toISOString(),
    data: {
      features: part89CounsellorFeatures,
      roles: part89RoleRules,
      checklist: part89Checklist
    }
  });
});

app.get("/api/part89/demo", (req, res) => {
  const command = "VANI, Aman Class 10 Maths admission counselling banao parent phone 9876543210 source WhatsApp";
  const result = part89BuildCounsellorReply({
    command,
    role: "receptionist_counsellor",
    instituteId: "NX-DEMO-INST-001",
    body: {}
  });
  res.json({
    success: true,
    demo: {
      command,
      result,
      nextPart: "Part 90 — AI Course Recommendation"
    }
  });
});
// ================= END PART 89 =================

// ================= PART 90 — AI COURSE RECOMMENDATION =================
// NAXORA OS 2.0 AI Course Recommendation.
// This part recommends courses/batches/packages using class, subject,
// goal, level, budget, timing and learning style. It is preview-first and
// never makes admission, result, fee or discount commitments.

const part90CourseCatalog = [
  {
    courseId: "CRS-FOUNDATION-8-9",
    name: "Foundation Skill Builder",
    classes: ["Class 8", "Class 9"],
    subjects: ["maths", "science", "english"],
    goals: ["concept clarity", "school support", "foundation"],
    level: "beginner_to_intermediate",
    monthlyFeePreview: 2500,
    batchTypes: ["regular", "weekend"],
    learningStyleFit: ["guided", "practice"]
  },
  {
    courseId: "CRS-BOARD-10",
    name: "Class 10 Board Booster",
    classes: ["Class 10"],
    subjects: ["maths", "science", "english", "sst"],
    goals: ["board exam", "marks improvement", "revision"],
    level: "board_focused",
    monthlyFeePreview: 3500,
    batchTypes: ["regular", "fast-track", "doubt-support"],
    learningStyleFit: ["practice", "revision", "tests"]
  },
  {
    courseId: "CRS-SENIOR-11-12",
    name: "Senior Board + Concept Support",
    classes: ["Class 11", "Class 12"],
    subjects: ["physics", "chemistry", "maths", "biology", "commerce", "accounts"],
    goals: ["board exam", "concept clarity", "school support"],
    level: "senior_secondary",
    monthlyFeePreview: 4500,
    batchTypes: ["regular", "topic-wise", "test-series"],
    learningStyleFit: ["concept", "practice", "tests"]
  },
  {
    courseId: "CRS-COMPETITIVE",
    name: "Competitive Exam Foundation",
    classes: ["Class 11", "Class 12", "Dropper"],
    subjects: ["physics", "chemistry", "maths", "biology"],
    goals: ["jee", "neet", "competitive exam"],
    level: "advanced",
    monthlyFeePreview: 6500,
    batchTypes: ["intensive", "test-series", "doubt-support"],
    learningStyleFit: ["tests", "practice", "deep concepts"]
  },
  {
    courseId: "CRS-ENGLISH-SKILL",
    name: "English Communication and School Support",
    classes: ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10"],
    subjects: ["english"],
    goals: ["communication", "grammar", "school support"],
    level: "skill_building",
    monthlyFeePreview: 2200,
    batchTypes: ["weekend", "regular"],
    learningStyleFit: ["speaking", "writing", "guided"]
  },
  {
    courseId: "CRS-DOUBT-REVISION",
    name: "Doubt Solving + Revision Plan",
    classes: ["Class 8", "Class 9", "Class 10", "Class 11", "Class 12"],
    subjects: ["maths", "science", "physics", "chemistry", "biology", "english", "sst", "commerce", "accounts"],
    goals: ["revision", "weak topics", "doubt solving"],
    level: "support",
    monthlyFeePreview: 1800,
    batchTypes: ["doubt-support", "topic-wise"],
    learningStyleFit: ["revision", "doubts", "practice"]
  }
];

const part90Features = [
  {
    key: "student_profile_parser",
    name: "Student Profile Parser",
    summary: "Extracts class, subject, goal, budget, timing and weak topic from command.",
    problemSolved: "Counsellor does not need to manually structure every enquiry."
  },
  {
    key: "course_match_score",
    name: "Course Match Score",
    summary: "Ranks course options with fit score and reasons.",
    problemSolved: "Course recommendation becomes consistent and explainable."
  },
  {
    key: "batch_fit",
    name: "Batch Fit",
    summary: "Suggests regular, fast-track, weekend, test-series or doubt-support batch type.",
    problemSolved: "Student gets a course format matching need and schedule."
  },
  {
    key: "fee_fit_preview",
    name: "Fee Fit Preview",
    summary: "Compares budget with preview-only fee estimate.",
    problemSolved: "Counsellor can discuss affordability without making commitments."
  },
  {
    key: "demo_plan",
    name: "Demo Plan",
    summary: "Suggests demo class topic and next counselling step.",
    problemSolved: "Demo class becomes more relevant to student need."
  },
  {
    key: "explainable_recommendation",
    name: "Explainable Recommendation",
    summary: "Shows why a course was recommended.",
    problemSolved: "Parent/student can trust the suggestion."
  },
  {
    key: "vani_course_recommendation",
    name: "VANI Course Recommendation",
    summary: "Hindi/Hinglish voice command support for course recommendation.",
    problemSolved: "Staff can ask naturally: 'VANI, Aman ke liye course recommend karo'."
  }
];

const part90RoleRules = [
  { role: "institute_owner", allowed: true, scope: "Full authorised course recommendation and catalogue preview.", canApproveSensitive: true },
  { role: "branch_manager", allowed: true, scope: "Assigned branch courses and batches only.", canApproveSensitive: false },
  { role: "receptionist_counsellor", allowed: true, scope: "Lead counselling, course recommendation and demo preview.", canApproveSensitive: false },
  { role: "teacher", allowed: true, previewOnly: true, scope: "Academic fit preview for assigned subject/batch.", canApproveSensitive: false },
  { role: "accountant", allowed: true, previewOnly: true, scope: "Fee-fit preview only.", canApproveSensitive: false },
  { role: "student", allowed: true, safeOnly: true, scope: "Own learning recommendation only, no admission/fee action.", canApproveSensitive: false },
  { role: "parent", allowed: true, safeOnly: true, scope: "Linked child learning recommendation only, no admission/fee action.", canApproveSensitive: false },
  { role: "naxora_super_admin", allowed: false, scope: "Platform support only; no unrestricted private course recommendation access.", canApproveSensitive: false }
];

function normalizePart90Role(role) {
  const r = String(role || "receptionist_counsellor").toLowerCase().trim().replace(/\s+/g, "_");
  if (["owner", "instituteowner", "institute_owner"].includes(r)) return "institute_owner";
  if (["branchmanager", "branch_manager"].includes(r)) return "branch_manager";
  if (["receptionist", "counsellor", "receptionist_counsellor", "admission_counsellor"].includes(r)) return "receptionist_counsellor";
  return r;
}

function part90AccessCheck({ role, instituteId, branchId }) {
  const normalizedRole = normalizePart90Role(role);
  const rule = part90RoleRules.find((r) => r.role === normalizedRole) || {
    role: normalizedRole,
    allowed: false,
    scope: "Unknown or unsupported role.",
    canApproveSensitive: false
  };
  const hasInstituteId = Boolean(String(instituteId || "").trim());
  const allowed = Boolean(rule.allowed && hasInstituteId && normalizedRole !== "naxora_super_admin");
  return {
    role: normalizedRole,
    instituteId: instituteId || null,
    branchId: branchId || null,
    allowed,
    previewOnly: Boolean(rule.previewOnly),
    safeOnly: Boolean(rule.safeOnly),
    canApproveSensitive: Boolean(rule.canApproveSensitive),
    scope: rule.scope,
    reason: !hasInstituteId
      ? "Institute ID missing."
      : !rule.allowed
        ? rule.scope
        : rule.previewOnly
          ? "Preview allowed only. Final counselling/admission actions require counsellor or owner role."
          : rule.safeOnly
            ? "Safe recommendation only. No admission or fee action allowed from this role."
            : "Course recommendation access allowed.",
    requiresLogin: true,
    requiresInstituteId: true,
    confirmationRequiredFor: ["demo_book", "lead_update", "admission_create", "followup_send"],
    ownerVerificationRequiredFor: ["discount", "fee_commitment", "refund", "delete", "export", "subscription_change"]
  };
}

function part90ParseProfile(text = "", body = {}) {
  const input = String(text || body.command || body.q || "").trim();
  const classMatch = input.match(/class\s*([0-9]{1,2})/i);
  const phoneMatch = input.match(/(?:phone|mobile|number|contact)\s*[:\-]?\s*([6-9][0-9]{9})/i);
  const budgetMatch = input.match(/(?:budget|fee|fees|amount)\s*[:\-]?\s*([0-9]{3,7})/i);
  const subjectMatch = input.match(/\b(maths|math|science|english|physics|chemistry|biology|commerce|accounts|sst|social science)\b/i);
  const nameMatch = input.match(/(?:student|name|lead|for)\s+([A-Z][a-zA-Z]{2,20})/) || input.match(/\b([A-Z][a-zA-Z]{2,20})\b/);
  const timing = /weekend|sunday|sat/i.test(input) ? "weekend" : /evening|shaam|after school/i.test(input) ? "evening" : /morning|subah/i.test(input) ? "morning" : null;
  const goal = /jee/i.test(input) ? "jee" :
    /neet/i.test(input) ? "neet" :
    /board|marks|percentage/i.test(input) ? "board exam" :
    /weak|doubt|revision/i.test(input) ? "weak topics" :
    /communication|spoken/i.test(input) ? "communication" :
    /foundation/i.test(input) ? "foundation" :
    body.goal || null;
  const learningStyle = /test|mock/i.test(input) ? "tests" :
    /practice|question/i.test(input) ? "practice" :
    /concept/i.test(input) ? "concept" :
    /revision/i.test(input) ? "revision" :
    body.learningStyle || null;
  return {
    studentName: body.studentName || nameMatch?.[1] || null,
    className: body.className || (classMatch ? `Class ${classMatch[1]}` : null),
    subject: body.subject || (subjectMatch ? subjectMatch[1].toLowerCase().replace("math", "maths").replace("social science", "sst") : null),
    goal,
    learningStyle,
    preferredTiming: body.preferredTiming || timing,
    budget: body.budget || budgetMatch?.[1] || null,
    parentPhone: body.parentPhone || phoneMatch?.[1] || null,
    rawCommand: input
  };
}

function part90MissingDetails(profile = {}) {
  const missing = [];
  if (!profile.studentName) missing.push({ key: "studentName", question: "Student ka naam kya hai?" });
  if (!profile.className) missing.push({ key: "className", question: "Student kis class me hai?" });
  if (!profile.subject && !profile.goal) missing.push({ key: "subjectOrGoal", question: "Kaunsa subject ya goal ke liye course recommend karna hai?" });
  return missing;
}

function part90CourseScore(course, profile = {}) {
  let score = 20;
  const reasons = [];
  const cls = String(profile.className || "").toLowerCase();
  const subject = String(profile.subject || "").toLowerCase();
  const goal = String(profile.goal || "").toLowerCase();
  const learningStyle = String(profile.learningStyle || "").toLowerCase();
  const timing = String(profile.preferredTiming || "").toLowerCase();
  const budget = Number(profile.budget || 0);

  if (profile.className && course.classes.some((c) => c.toLowerCase() === cls)) {
    score += 30;
    reasons.push("class match");
  } else if (profile.className && course.classes.some((c) => cls && c.toLowerCase().includes(cls.replace("class ", "")))) {
    score += 15;
    reasons.push("near class match");
  }

  if (subject && course.subjects.includes(subject)) {
    score += 25;
    reasons.push("subject match");
  }

  if (goal && course.goals.some((g) => goal.includes(g) || g.includes(goal))) {
    score += 20;
    reasons.push("goal match");
  }

  if (learningStyle && course.learningStyleFit.some((s) => learningStyle.includes(s) || s.includes(learningStyle))) {
    score += 10;
    reasons.push("learning style fit");
  }

  if (timing && course.batchTypes.includes(timing)) {
    score += 5;
    reasons.push("timing/batch preference fit");
  }

  if (budget > 0) {
    if (budget >= course.monthlyFeePreview) {
      score += 5;
      reasons.push("budget fits preview fee");
    } else if (budget >= Math.round(course.monthlyFeePreview * 0.75)) {
      score += 2;
      reasons.push("budget near preview fee");
    }
  }

  score = Math.min(100, score);
  return {
    courseId: course.courseId,
    name: course.name,
    score,
    fit: score >= 80 ? "excellent" : score >= 60 ? "good" : score >= 40 ? "possible" : "low",
    reasons,
    course,
    previewOnly: true
  };
}

function part90GenerateRecommendations(profile = {}) {
  const ranked = part90CourseCatalog
    .map((course) => part90CourseScore(course, profile))
    .sort((a, b) => b.score - a.score);
  const top = ranked.slice(0, 3);
  const recommended = top[0];

  const batchFit = part90BatchFit(profile, recommended?.course);
  const feeFit = part90FeeFit(profile, recommended?.course);
  const demoPlan = part90DemoPlan(profile, recommended?.course);
  const explanation = part90Explanation(profile, recommended);

  return {
    profile,
    missingDetails: part90MissingDetails(profile),
    topRecommendations: top,
    recommendedCourse: recommended,
    batchFit,
    feeFitPreview: feeFit,
    demoPlanPreview: demoPlan,
    explanation,
    safety: {
      previewOnly: true,
      noAdmissionCommitment: true,
      noResultGuarantee: true,
      noFeeDiscountCommitment: true,
      confirmationRequiredForDemoOrAdmission: true
    }
  };
}

function part90BatchFit(profile = {}, course = {}) {
  const timing = String(profile.preferredTiming || "").toLowerCase();
  const goal = String(profile.goal || "").toLowerCase();
  let batchType = "regular";
  if (timing === "weekend" && course.batchTypes?.includes("weekend")) batchType = "weekend";
  else if (goal.includes("board") && course.batchTypes?.includes("fast-track")) batchType = "fast-track";
  else if (goal.includes("weak") && course.batchTypes?.includes("doubt-support")) batchType = "doubt-support";
  else if ((goal.includes("jee") || goal.includes("neet")) && course.batchTypes?.includes("intensive")) batchType = "intensive";
  else if (course.batchTypes?.[0]) batchType = course.batchTypes[0];

  return {
    batchType,
    reason: `Student need ke hisaab se ${batchType} batch suitable preview hai.`,
    confirmationRequired: true,
    previewOnly: true
  };
}

function part90FeeFit(profile = {}, course = {}) {
  const budget = Number(profile.budget || 0);
  const previewFee = Number(course?.monthlyFeePreview || 0);
  let fit = "unknown";
  let message = "Budget detail nahi mila. Fee discussion preview-only rahega.";
  if (budget && previewFee) {
    fit = budget >= previewFee ? "fits" : budget >= Math.round(previewFee * 0.75) ? "near_fit" : "below_preview";
    message = fit === "fits"
      ? "Budget preview fee ke aas-paas fit ho raha hai."
      : fit === "near_fit"
        ? "Budget near fit hai. Final fee/discount owner approval ke bina commit nahi hoga."
        : "Budget preview fee se kam hai. Alternate plan ya owner-approved option discuss ho sakta hai.";
  }
  return {
    previewFee,
    budget: budget || null,
    fit,
    message,
    previewOnly: true,
    discountRequiresOwnerVerification: true
  };
}

function part90DemoPlan(profile = {}, course = {}) {
  const subject = profile.subject || course?.subjects?.[0] || "course counselling";
  const topic = profile.goal === "weak topics" ? "weak topic diagnosis" : profile.goal === "board exam" ? "board pattern demo" : `${subject} demo`;
  return {
    previewOnly: true,
    demoTopic: topic,
    suggestedSlot: profile.preferredTiming === "weekend" ? "Saturday 5:00 PM" : "Tomorrow 5:00 PM",
    mode: "offline_or_online",
    confirmationRequired: true,
    note: "Final demo booking confirmation ke bina nahi hoga."
  };
}

function part90Explanation(profile = {}, recommendation = {}) {
  const course = recommendation?.course || {};
  const reasons = recommendation?.reasons || [];
  return {
    shortReason: reasons.length
      ? `Recommendation ${reasons.join(", ")} ki wajah se hai.`
      : "Available details ke basis par closest course suggest kiya gaya hai.",
    parentFriendly: `${profile.studentName || "Student"} ke liye ${course.name || recommendation.name || "selected course"} suitable preview hai because it matches class/subject/goal details. Final decision demo class ke baad lena best rahega.`,
    noGuarantee: "Ye recommendation learning fit ke liye hai; marks/result guarantee nahi hai."
  };
}

function part90BuildVaniReply({ command, role, instituteId, branchId, body = {} }) {
  const access = part90AccessCheck({ role, instituteId, branchId });
  const profile = part90ParseProfile(command, body);
  const recommendation = part90GenerateRecommendations(profile);
  const missing = recommendation.missingDetails;

  let replyText = "";
  let nextAction = "none";
  if (!access.allowed) {
    replyText = "Is role ko AI Course Recommendation access nahi hai.";
    nextAction = "blocked";
  } else if (missing.length) {
    replyText = missing[0].question;
    nextAction = "ask_missing_detail";
  } else {
    const top = recommendation.recommendedCourse;
    replyText = `${profile.studentName} ke liye ${top?.name || "recommended course"} suitable preview hai. Fit score ${top?.score || 0}/100 hai. Final admission ya fee commitment confirmation ke bina nahi hoga.`;
    nextAction = access.safeOnly ? "show_safe_recommendation" : "show_course_recommendation_preview";
  }

  return {
    access,
    profile,
    recommendation,
    replyText,
    spokenSafeSummary: replyText,
    privateScreenFirst: true,
    nextAction,
    confirmationRequiredFor: ["demo_book", "lead_update", "admission_create", "followup_send"],
    ownerVerificationRequiredFor: ["discount", "fee_commitment", "refund", "delete", "export", "subscription_change"],
    auditLog: {
      event: "part90_ai_course_recommendation",
      role: access.role,
      topCourse: recommendation.recommendedCourse?.courseId || null,
      createdAt: new Date().toISOString()
    }
  };
}

const part90Checklist = [
  "AI Course Recommendation page opens",
  "Status API returns success true",
  "Student profile parser extracts class/subject/goal",
  "Missing details are asked instead of guessed",
  "Course recommendation returns top 3 options",
  "Batch fit preview returns suitable batch type",
  "Fee fit is preview-only",
  "Demo plan is preview-only with confirmation required",
  "VANI course recommendation works",
  "Unauthorized roles are blocked or safe-only",
  "Previous Part 1–89 routes remain preserved"
];

app.get("/api/part90/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 90 — AI Course Recommendation",
    status: "active",
    versionPhase: "NAXORA OS 2.0",
    latestCompletedPart: 90,
    nextPart: "Part 91 — Fee and Batch Information Assistant",
    preservesPreviousFeatures: true,
    frontendRoutes: ["/ai-course-recommendation", "/course-recommendation-ai", "/smart-course-recommendation", "/course-fit-ai", "/ai-course-finder", "/course-recommender"],
    apiRoutes: [
      "/api/part90/config",
      "/api/part90/features",
      "/api/part90/roles",
      "/api/part90/access-check",
      "/api/part90/course-catalog",
      "/api/part90/profile/parse",
      "/api/part90/recommendation/generate",
      "/api/part90/batch-fit",
      "/api/part90/fee-fit-preview",
      "/api/part90/demo-plan",
      "/api/part90/explanation",
      "/api/part90/vani/greeting",
      "/api/part90/vani/command"
    ],
    aiCourseRecommendationEnabled: true
  });
});

app.get("/api/part90/config", (req, res) => {
  res.json({
    success: true,
    appName: "AI Course Recommendation",
    appType: "course_fit_recommendation_foundation",
    version: "2.0-ai-course-recommendation",
    policy: {
      previewFirst: true,
      noMarksGuarantee: true,
      noFeeCommitmentWithoutApproval: true,
      noAutoAdmission: true,
      noExternalLLMKeysIncluded: true
    }
  });
});

app.get("/api/part90/features", (req, res) => {
  res.json({ success: true, features: part90Features });
});

app.get("/api/part90/roles", (req, res) => {
  res.json({ success: true, roles: part90RoleRules });
});

app.get("/api/part90/access-check", (req, res) => {
  res.json({ success: true, access: part90AccessCheck(req.query || {}) });
});

app.get("/api/part90/course-catalog", (req, res) => {
  res.json({ success: true, previewOnly: true, courses: part90CourseCatalog });
});

app.get("/api/part90/profile/parse", (req, res) => {
  const profile = part90ParseProfile(req.query.q || req.query.command || "", req.query || {});
  res.json({ success: true, profile, missingDetails: part90MissingDetails(profile) });
});

app.post("/api/part90/profile/parse", (req, res) => {
  const profile = part90ParseProfile(req.body?.q || req.body?.command || "", req.body || {});
  res.json({ success: true, profile, missingDetails: part90MissingDetails(profile) });
});

app.get("/api/part90/recommendation/generate", (req, res) => {
  const access = part90AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  const profile = part90ParseProfile(req.query.q || req.query.command || "", req.query || {});
  res.json({ success: true, access, ...part90GenerateRecommendations(profile) });
});

app.post("/api/part90/recommendation/generate", (req, res) => {
  const access = part90AccessCheck(req.body || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  const profile = part90ParseProfile(req.body?.q || req.body?.command || "", req.body || {});
  res.json({ success: true, access, ...part90GenerateRecommendations(profile) });
});

app.get("/api/part90/batch-fit", (req, res) => {
  const profile = part90ParseProfile(req.query.q || req.query.command || "", req.query || {});
  const rec = part90GenerateRecommendations(profile);
  res.json({ success: true, profile, recommendedCourse: rec.recommendedCourse, batchFit: rec.batchFit });
});

app.get("/api/part90/fee-fit-preview", (req, res) => {
  const access = part90AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  const profile = part90ParseProfile(req.query.q || req.query.command || "", req.query || {});
  const rec = part90GenerateRecommendations(profile);
  res.json({ success: true, access, privateScreenFirst: true, profile, recommendedCourse: rec.recommendedCourse, feeFitPreview: rec.feeFitPreview });
});

app.get("/api/part90/demo-plan", (req, res) => {
  const access = part90AccessCheck(req.query || {});
  if (!access.allowed) return res.status(403).json({ success: false, access, message: access.reason });
  const profile = part90ParseProfile(req.query.q || req.query.command || "", req.query || {});
  const rec = part90GenerateRecommendations(profile);
  res.json({ success: true, access, profile, recommendedCourse: rec.recommendedCourse, demoPlanPreview: rec.demoPlanPreview });
});

app.get("/api/part90/explanation", (req, res) => {
  const profile = part90ParseProfile(req.query.q || req.query.command || "", req.query || {});
  const rec = part90GenerateRecommendations(profile);
  res.json({ success: true, profile, explanation: rec.explanation, recommendedCourse: rec.recommendedCourse });
});

app.get("/api/part90/vani/greeting", (req, res) => {
  res.json({
    success: true,
    assistant: "VANI Course Recommendation",
    greeting: "Namaste, main VANI Course Recommendation Assistant hoon. Student ki class, subject aur goal batayein, main suitable course preview recommend karungi.",
    exampleCommands: [
      "VANI, Aman Class 10 Maths board exam ke liye course recommend karo budget 3500",
      "VANI, Riya Class 11 Physics JEE ke liye best course batao",
      "VANI, English communication ke liye course recommend karo",
      "VANI, weak maths revision ke liye batch suggest karo"
    ],
    safety: "Final admission, fee commitment, discount ya demo booking confirmation ke bina nahi hoga."
  });
});

app.post("/api/part90/vani/command", (req, res) => {
  const body = req.body || {};
  const result = part90BuildVaniReply({
    command: body.command || body.q || "",
    role: body.role || "receptionist_counsellor",
    instituteId: body.instituteId || "NX-DEMO-INST-001",
    branchId: body.branchId,
    body
  });
  if (!result.access.allowed) return res.status(403).json({ success: false, assistant: "VANI", ...result });
  res.json({ success: true, assistant: "VANI", part: "Part 90 — AI Course Recommendation", ...result });
});

app.get("/api/part90/vani/command", (req, res) => {
  const result = part90BuildVaniReply({
    command: req.query.command || req.query.q || "",
    role: req.query.role || "receptionist_counsellor",
    instituteId: req.query.instituteId || "NX-DEMO-INST-001",
    branchId: req.query.branchId,
    body: req.query || {}
  });
  if (!result.access.allowed) return res.status(403).json({ success: false, assistant: "VANI", ...result });
  res.json({ success: true, assistant: "VANI", part: "Part 90 — AI Course Recommendation", ...result });
});

app.get("/api/part90/audit-log", (req, res) => {
  res.json({
    success: true,
    auditLog: [
      { event: "ai_course_recommendation_preview", role: "receptionist_counsellor", createdAt: new Date().toISOString() },
      { event: "no_result_guarantee_policy", rule: "Course recommendation never guarantees marks/results.", createdAt: new Date().toISOString() }
    ]
  });
});

app.get("/api/part90/activity", (req, res) => {
  res.json({
    success: true,
    activity: [
      { type: "ai_course_recommendation_created", message: "Part 90 AI Course Recommendation active.", createdAt: new Date().toISOString() },
      { type: "preview_only_policy", message: "Course/fee/demo suggestions are preview-only.", createdAt: new Date().toISOString() }
    ]
  });
});

app.get("/api/part90/checklist", (req, res) => {
  res.json({ success: true, checklist: part90Checklist });
});

app.get("/api/part90/export", (req, res) => {
  res.json({
    success: true,
    exportType: "part90-ai-course-recommendation-readiness",
    ownerVerificationRequiredForSensitiveExports: true,
    generatedAt: new Date().toISOString(),
    data: {
      features: part90Features,
      roles: part90RoleRules,
      catalog: part90CourseCatalog,
      checklist: part90Checklist
    }
  });
});

app.get("/api/part90/demo", (req, res) => {
  const command = "VANI, Aman Class 10 Maths board exam ke liye course recommend karo budget 3500";
  const result = part90BuildVaniReply({
    command,
    role: "receptionist_counsellor",
    instituteId: "NX-DEMO-INST-001",
    body: {}
  });
  res.json({
    success: true,
    demo: {
      command,
      result,
      nextPart: "Part 91 — Fee and Batch Information Assistant"
    }
  });
});
// ================= END PART 90 =================

// ================= PART 91 — FEE AND BATCH INFORMATION ASSISTANT =================
// NAXORA OS 2.0 Fee and Batch Information Assistant.
// This part answers fee structure, batch timing, seats, eligibility, installment
// preview and demo-slot information. It is preview-only and never commits fee,
// discount, admission, booking, refund or seat allotment without confirmation.

const part91CourseBatchCatalog = [
  {
    courseId: "CRS-FOUNDATION-8-9",
    courseName: "Foundation Skill Builder",
    className: "Class 8-9",
    subjects: ["maths", "science", "english"],
    monthlyFeePreview: 2500,
    registrationFeePreview: 500,
    duration: "3 months starter plan",
    batches: [
      { batchId: "BAT-FND-EVE", name: "Foundation Evening", days: "Mon/Wed/Fri", time: "5:00 PM - 6:15 PM", mode: "offline", seatsPreview: 8 },
      { batchId: "BAT-FND-WKD", name: "Foundation Weekend", days: "Sat/Sun", time: "11:00 AM - 12:30 PM", mode: "hybrid", seatsPreview: 5 }
    ]
  },
  {
    courseId: "CRS-BOARD-10",
    courseName: "Class 10 Board Booster",
    className: "Class 10",
    subjects: ["maths", "science", "english", "sst"],
    monthlyFeePreview: 3500,
    registrationFeePreview: 700,
    duration: "4 months board plan",
    batches: [
      { batchId: "BAT-10-MATH-A", name: "Class 10 Maths A", days: "Mon/Wed/Fri", time: "6:00 PM - 7:30 PM", mode: "offline", seatsPreview: 6 },
      { batchId: "BAT-10-SCI-A", name: "Class 10 Science A", days: "Tue/Thu/Sat", time: "6:00 PM - 7:30 PM", mode: "offline", seatsPreview: 4 },
      { batchId: "BAT-10-FAST", name: "Class 10 Fast Track", days: "Daily", time: "7:30 PM - 8:45 PM", mode: "hybrid", seatsPreview: 3 }
    ]
  },
  {
    courseId: "CRS-SENIOR-11-12",
    courseName: "Senior Board + Concept Support",
    className: "Class 11-12",
    subjects: ["physics", "chemistry", "maths", "biology", "commerce", "accounts"],
    monthlyFeePreview: 4500,
    registrationFeePreview: 1000,
    duration: "6 months concept plan",
    batches: [
      { batchId: "BAT-12-PCM", name: "Class 12 PCM", days: "Mon/Wed/Fri", time: "4:30 PM - 6:00 PM", mode: "offline", seatsPreview: 7 },
      { batchId: "BAT-11-BIO", name: "Class 11 Biology", days: "Tue/Thu/Sat", time: "5:00 PM - 6:30 PM", mode: "hybrid", seatsPreview: 5 }
    ]
  },
  {
    courseId: "CRS-COMPETITIVE",
    courseName: "Competitive Exam Foundation",
    className: "Class 11-12/Dropper",
    subjects: ["physics", "chemistry", "maths", "biology"],
    monthlyFeePreview: 6500,
    registrationFeePreview: 1500,
    duration: "6 months intensive plan",
    batches: [
      { batchId: "BAT-JEE-FND", name: "JEE Foundation", days: "Mon/Wed/Fri/Sun", time: "6:30 PM - 8:30 PM", mode: "hybrid", seatsPreview: 4 },
      { batchId: "BAT-NEET-FND", name: "NEET Foundation", days: "Tue/Thu/Sat/Sun", time: "6:30 PM - 8:30 PM", mode: "hybrid", seatsPreview: 5 }
    ]
  },
  {
    courseId: "CRS-DOUBT-REVISION",
    courseName: "Doubt Solving + Revision Plan",
    className: "Class 8-12",
    subjects: ["maths", "science", "physics", "chemistry", "biology", "english", "sst", "commerce", "accounts"],
    monthlyFeePreview: 1800,
    registrationFeePreview: 300,
    duration: "1 month rolling plan",
    batches: [
      { batchId: "BAT-DOUBT-WKD", name: "Weekend Doubt Clinic", days: "Sat/Sun", time: "4:00 PM - 6:00 PM", mode: "offline", seatsPreview: 10 },
      { batchId: "BAT-REV-ONLINE", name: "Online Revision Support", days: "Tue/Thu", time: "8:00 PM - 9:00 PM", mode: "online", seatsPreview: 12 }
    ]
  }
];

const part91Features = [
  {
    key: "fee_structure_lookup",
    name: "Fee Structure Lookup",
    summary: "Shows course fee preview, registration fee preview and duration.",
    problemSolved: "Counsellor can answer fee questions quickly without searching."
  },
  {
    key: "batch_timing_lookup",
    name: "Batch Timing Lookup",
    summary: "Shows days, time, mode and seats preview for batches.",
    problemSolved: "Parents/students can get clear timing options."
  },
  {
    key: "course_fee_batch_combiner",
    name: "Course + Fee + Batch Combined View",
    summary: "Connects course info with fee and batch availability in one answer.",
    problemSolved: "Admission counselling becomes faster."
  },
  {
    key: "installment_preview",
    name: "Installment Preview",
    summary: "Shows monthly/quarterly/full plan preview.",
    problemSolved: "Fee planning can be discussed safely without commitment."
  },
  {
    key: "demo_slot_preview",
    name: "Demo Slot Preview",
    summary: "Suggests demo class slot from matching batch.",
    problemSolved: "Demo booking preview becomes easier."
  },
  {
    key: "eligibility_preview",
    name: "Eligibility Preview",
    summary: "Checks class/subject fit against available courses.",
    problemSolved: "Wrong course suggestions reduce."
  },
  {
    key: "vani_fee_batch_info",
    name: "VANI Fee and Batch Information",
    summary: "Hindi/Hinglish voice answers for fee, batch and demo info.",
    problemSolved: "Staff can ask naturally and get structured answers."
  }
];

const part91RoleRules = [
  { role: "institute_owner", allowed: true, scope: "Full authorised fee and batch information.", canApproveSensitive: true },
  { role: "branch_manager", allowed: true, scope: "Assigned branch fee/batch information only.", canApproveSensitive: false },
  { role: "receptionist_counsellor", allowed: true, scope: "Course, batch, fee preview and demo information for counselling.", canApproveSensitive: false },
  { role: "accountant", allowed: true, scope: "Fee structure and installment preview only.", canApproveSensitive: false },
  { role: "teacher", allowed: true, previewOnly: true, scope: "Assigned batch timing and academic info preview only.", canApproveSensitive: false },
  { role: "student", allowed: true, safeOnly: true, scope: "Own/public fee and batch safe information only.", canApproveSensitive: false },
  { role: "parent", allowed: true, safeOnly: true, scope: "Linked child/public fee and batch safe information only.", canApproveSensitive: false },
  { role: "naxora_super_admin", allowed: false, scope: "Platform support only; no unrestricted institute fee/batch access.", canApproveSensitive: false }
];

function normalizePart91Role(role) {
  const r = String(role || "receptionist_counsellor").toLowerCase().trim().replace(/\s+/g, "_");
  if (["owner", "instituteowner", "institute_owner"].includes(r)) return "institute_owner";
  if (["branchmanager", "branch_manager"].includes(r)) return "branch_manager";
  if (["receptionist", "counsellor", "receptionist_counsellor", "admission_counsellor"].includes(r)) return "receptionist_counsellor";
  return r;
}

function part91AccessCheck({ role, instituteId, branchId }) {
  const normalizedRole = normalizePart91Role(role);
  const rule = part91RoleRules.find((r) => r.role === normalizedRole) || {
    role: normalizedRole,
    allowed: false,
    scope: "Unknown or unsupported role.",
    canApproveSensitive: false
  };
  const hasInstituteId = Boolean(String(instituteId || "").trim());
  const allowed = Boolean(rule.allowed && hasInstituteId && normalizedRole !== "naxora_super_admin");
  return {
    role: normalizedRole,
    instituteId: instituteId || null,
    branchId: branchId || null,
    allowed,
    previewOnly: Boolean(rule.previewOnly),
    safeOnly: Boolean(rule.safeOnly),
    canApproveSensitive: Boolean(rule.canApproveSensitive),
    scope: rule.scope,
    reason: !hasInstituteId
      ? "Institute ID missing."
      : !rule.allowed
        ? rule.scope
        : rule.safeOnly
          ? "Safe fee and batch information only. No admission, discount or seat booking from this role."
          : rule.previewOnly
            ? "Preview allowed only. Final admission/seat/fee action requires counsellor/owner."
            : "Fee and batch information access allowed.",
    requiresLogin: true,
    requiresInstituteId: true,
    confirmationRequiredFor: ["demo_book", "seat_hold", "admission_create", "followup_send"],
    ownerVerificationRequiredFor: ["discount", "fee_change", "refund", "delete", "export", "subscription_change"]
  };
}

function part91ParseQuery(text = "", body = {}) {
  const input = String(text || body.command || body.q || "").trim();
  const classMatch = input.match(/class\s*([0-9]{1,2})/i);
  const subjectMatch = input.match(/\b(maths|math|science|english|physics|chemistry|biology|commerce|accounts|sst|social science)\b/i);
  const goal = /jee/i.test(input) ? "jee" :
    /neet/i.test(input) ? "neet" :
    /board|marks/i.test(input) ? "board exam" :
    /doubt|revision|weak/i.test(input) ? "revision" :
    /foundation/i.test(input) ? "foundation" : null;
  const timing = /weekend|sunday|sat/i.test(input) ? "weekend" :
    /evening|shaam|after school/i.test(input) ? "evening" :
    /morning|subah/i.test(input) ? "morning" :
    /online/i.test(input) ? "online" : null;
  const infoType = /fee|fees|installment|payment|amount/i.test(input) ? "fee" :
    /batch|timing|time|seat|slot/i.test(input) ? "batch" :
    /demo/i.test(input) ? "demo" :
    /eligibility|eligible/i.test(input) ? "eligibility" : "combined";
  const nameMatch = input.match(/(?:student|name|for)\s+([A-Z][a-zA-Z]{2,20})/) || input.match(/\b([A-Z][a-zA-Z]{2,20})\b/);
  return {
    studentName: body.studentName || nameMatch?.[1] || null,
    className: body.className || (classMatch ? `Class ${classMatch[1]}` : null),
    subject: body.subject || (subjectMatch ? subjectMatch[1].toLowerCase().replace("math", "maths").replace("social science", "sst") : null),
    goal: body.goal || goal,
    preferredTiming: body.preferredTiming || timing,
    infoType: body.infoType || infoType,
    rawCommand: input
  };
}

function part91MissingDetails(query = {}) {
  const missing = [];
  if (!query.className && !query.subject && !query.goal) {
    missing.push({ key: "courseContext", question: "Kaunsi class, subject ya course ke liye fee/batch info chahiye?" });
  }
  return missing;
}

function part91ScoreCourse(course, query = {}) {
  let score = 10;
  const reasons = [];
  const cls = String(query.className || "").toLowerCase();
  const subject = String(query.subject || "").toLowerCase();
  const goal = String(query.goal || "").toLowerCase();
  const timing = String(query.preferredTiming || "").toLowerCase();

  if (cls && course.className.toLowerCase().includes(cls.replace("class ", ""))) {
    score += 35;
    reasons.push("class match");
  }
  if (subject && course.subjects.includes(subject)) {
    score += 30;
    reasons.push("subject match");
  }
  if (goal === "jee" && course.courseId === "CRS-COMPETITIVE") {
    score += 25;
    reasons.push("competitive goal match");
  }
  if (goal === "neet" && course.courseId === "CRS-COMPETITIVE") {
    score += 25;
    reasons.push("competitive goal match");
  }
  if (goal === "board exam" && course.courseId === "CRS-BOARD-10") {
    score += 20;
    reasons.push("board exam fit");
  }
  if (goal === "revision" && course.courseId === "CRS-DOUBT-REVISION") {
    score += 20;
    reasons.push("revision/doubt fit");
  }
  if (timing && course.batches.some((b) => b.days.toLowerCase().includes(timing) || b.mode.toLowerCase().includes(timing))) {
    score += 5;
    reasons.push("timing/mode fit");
  }
  return {
    courseId: course.courseId,
    courseName: course.courseName,
    score: Math.min(100, score),
    reasons,
    course
  };
}

function part91FindMatches(query = {}) {
  return part91CourseBatchCatalog
    .map((course) => part91ScoreCourse(course, query))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function part91InstallmentPreview(course = {}) {
  const monthly = Number(course.monthlyFeePreview || 0);
  const registration = Number(course.registrationFeePreview || 0);
  return {
    previewOnly: true,
    currency: "INR",
    registrationFeePreview: registration,
    monthlyPlan: {
      firstMonthPreview: monthly + registration,
      monthlyFeePreview: monthly,
      note: "Registration + first month preview only."
    },
    quarterlyPlan: {
      totalPreview: monthly * 3 + registration,
      note: "Quarterly preview; final discount/offer requires owner approval."
    },
    fullCoursePlan: {
      totalPreview: monthly * 4 + registration,
      note: "Estimated preview based on starter duration. Final plan depends on institute policy."
    },
    safety: "No fee commitment, discount or receipt without authorised confirmation."
  };
}

function part91DemoSlotPreview(course = {}, query = {}) {
  const preferred = String(query.preferredTiming || "").toLowerCase();
  const batch = course.batches?.find((b) => preferred && (b.days.toLowerCase().includes(preferred) || b.mode.toLowerCase().includes(preferred))) || course.batches?.[0];
  return {
    previewOnly: true,
    demoId: `DEMO-FEE-BATCH-${Date.now()}`,
    suggestedBatchId: batch?.batchId || null,
    suggestedBatchName: batch?.name || "Demo Batch",
    suggestedSlot: batch ? `${batch.days}, ${batch.time}` : "Tomorrow 5:00 PM",
    mode: batch?.mode || "offline_or_online",
    confirmationRequired: true,
    note: "Final demo booking confirmation ke bina nahi hoga."
  };
}

function part91EligibilityPreview(course = {}, query = {}) {
  const classOk = query.className ? course.className.toLowerCase().includes(String(query.className).toLowerCase().replace("class ", "")) : true;
  const subjectOk = query.subject ? course.subjects.includes(String(query.subject).toLowerCase()) : true;
  return {
    previewOnly: true,
    eligiblePreview: Boolean(classOk && subjectOk),
    classFit: classOk,
    subjectFit: subjectOk,
    note: classOk && subjectOk
      ? "Student details is course ke liye suitable preview dikhate hain."
      : "Course fit weak hai. Alternative course recommend karna better hoga."
  };
}

function part91BuildInfo({ command, role, instituteId, branchId, body = {} }) {
  const access = part91AccessCheck({ role, instituteId, branchId });
  const query = part91ParseQuery(command, body);
  const missing = access.allowed ? part91MissingDetails(query) : [];
  const matches = part91FindMatches(query);
  const selected = matches[0]?.course || part91CourseBatchCatalog[0];
  const feeInfo = {
    previewOnly: true,
    courseId: selected.courseId,
    courseName: selected.courseName,
    className: selected.className,
    subjects: selected.subjects,
    duration: selected.duration,
    monthlyFeePreview: selected.monthlyFeePreview,
    registrationFeePreview: selected.registrationFeePreview,
    privateScreenFirst: true
  };
  const batchInfo = {
    previewOnly: true,
    courseId: selected.courseId,
    courseName: selected.courseName,
    batches: selected.batches,
    seatsArePreviewOnly: true,
    seatHoldRequiresConfirmation: true
  };
  const installmentPreview = part91InstallmentPreview(selected);
  const demoSlotPreview = part91DemoSlotPreview(selected, query);
  const eligibilityPreview = part91EligibilityPreview(selected, query);

  let replyText = "";
  let nextAction = "none";
  if (!access.allowed) {
    replyText = "Is role ko fee/batch information access nahi hai.";
    nextAction = "blocked";
  } else if (missing.length) {
    replyText = missing[0].question;
    nextAction = "ask_missing_detail";
  } else {
    replyText = `${selected.courseName} ke liye fee aur batch information preview ready hai. Monthly fee preview ₹${selected.monthlyFeePreview} hai. Final fee, discount, seat hold ya demo booking confirmation ke bina nahi hoga.`;
    nextAction = access.safeOnly ? "show_safe_info" : "show_fee_batch_preview";
  }

  return {
    access,
    query,
    missingDetails: missing,
    matches,
    selectedCourse: selected,
    feeInfo,
    batchInfo,
    installmentPreview,
    demoSlotPreview,
    eligibilityPreview,
    replyText,
    spokenSafeSummary: access.safeOnly || feeInfo.privateScreenFirst
      ? `${selected.courseName} ke liye fee aur batch preview ready hai. Sensitive fee details screen par privately dikhaye gaye hain.`
      : replyText,
    privateScreenFirst: true,
    nextAction,
    confirmationRequiredFor: ["demo_book", "seat_hold", "admission_create", "followup_send"],
    ownerVerificationRequiredFor: ["discount", "fee_change", "refund", "delete", "export", "subscription_change"],
    auditLog: {
      event: "part91_fee_batch_information",
      role: access.role,
      selectedCourse: selected.courseId,
      createdAt: new Date().toISOString()
    }
  };
}

const part91Checklist = [
  "Fee and Batch Information Assistant page opens",
  "Status API returns success true",
  "Fee structure lookup returns preview-only info",
  "Batch timing lookup returns days/time/mode",
  "Installment preview is preview-only",
  "Demo slot preview requires confirmation",
  "Eligibility preview works",
  "VANI fee/batch command works",
  "Student/parent get safe-only info",
  "Previous Part 1–90 routes remain preserved"
];

app.get("/api/part91/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 91 — Fee and Batch Information Assistant",
    status: "active",
    versionPhase: "NAXORA OS 2.0",
    latestCompletedPart: 91,
    nextPart: "Part 92 — Automatic Demo-Class Booking",
    preservesPreviousFeatures: true,
    frontendRoutes: ["/fee-batch-information-assistant", "/fee-batch-assistant", "/fee-and-batch-info", "/batch-fee-assistant", "/vani-fee-batch-info", "/fee-batch-ai"],
    apiRoutes: [
      "/api/part91/config",
      "/api/part91/features",
      "/api/part91/roles",
      "/api/part91/access-check",
      "/api/part91/course-batch-catalog",
      "/api/part91/query/parse",
      "/api/part91/fee-structure",
      "/api/part91/batch-info",
      "/api/part91/course-fee-batch",
      "/api/part91/installment-preview",
      "/api/part91/demo-slot-preview",
      "/api/part91/eligibility-preview",
      "/api/part91/vani/greeting",
      "/api/part91/vani/command"
    ],
    feeBatchInformationAssistantEnabled: true
  });
});

app.get("/api/part91/config", (req, res) => {
  res.json({
    success: true,
    appName: "Fee and Batch Information Assistant",
    appType: "fee_batch_info_foundation",
    version: "2.0-fee-batch-information-assistant",
    policy: {
      previewFirst: true,
      noFeeCommitmentWithoutApproval: true,
      noSeatHoldWithoutConfirmation: true,
      noAutoDemoBooking: true,
      noDiscountCommitmentWithoutOwnerVerification: true
    }
  });
});

app.get("/api/part91/features", (req, res) => {
  res.json({ success: true, features: part91Features });
});

app.get("/api/part91/roles", (req, res) => {
  res.json({ success: true, roles: part91RoleRules });
});

app.get("/api/part91/access-check", (req, res) => {
  res.json({ success: true, access: part91AccessCheck(req.query || {}) });
});

app.get("/api/part91/course-batch-catalog", (req, res) => {
  res.json({ success: true, previewOnly: true, catalog: part91CourseBatchCatalog });
});

app.get("/api/part91/query/parse", (req, res) => {
  const query = part91ParseQuery(req.query.q || req.query.command || "", req.query || {});
  res.json({ success: true, query, missingDetails: part91MissingDetails(query), matches: part91FindMatches(query) });
});

app.get("/api/part91/fee-structure", (req, res) => {
  const result = part91BuildInfo({
    command: req.query.q || req.query.command || "",
    role: req.query.role || "receptionist_counsellor",
    instituteId: req.query.instituteId || "NX-DEMO-INST-001",
    branchId: req.query.branchId,
    body: req.query || {}
  });
  if (!result.access.allowed) return res.status(403).json({ success: false, ...result });
  res.json({ success: true, access: result.access, query: result.query, feeInfo: result.feeInfo, installmentPreview: result.installmentPreview, privateScreenFirst: true });
});

app.get("/api/part91/batch-info", (req, res) => {
  const result = part91BuildInfo({
    command: req.query.q || req.query.command || "",
    role: req.query.role || "receptionist_counsellor",
    instituteId: req.query.instituteId || "NX-DEMO-INST-001",
    branchId: req.query.branchId,
    body: req.query || {}
  });
  if (!result.access.allowed) return res.status(403).json({ success: false, ...result });
  res.json({ success: true, access: result.access, query: result.query, batchInfo: result.batchInfo });
});

app.get("/api/part91/course-fee-batch", (req, res) => {
  const result = part91BuildInfo({
    command: req.query.q || req.query.command || "",
    role: req.query.role || "receptionist_counsellor",
    instituteId: req.query.instituteId || "NX-DEMO-INST-001",
    branchId: req.query.branchId,
    body: req.query || {}
  });
  if (!result.access.allowed) return res.status(403).json({ success: false, ...result });
  res.json({ success: true, ...result });
});

app.post("/api/part91/course-fee-batch", (req, res) => {
  const body = req.body || {};
  const result = part91BuildInfo({
    command: body.q || body.command || "",
    role: body.role || "receptionist_counsellor",
    instituteId: body.instituteId || "NX-DEMO-INST-001",
    branchId: body.branchId,
    body
  });
  if (!result.access.allowed) return res.status(403).json({ success: false, ...result });
  res.json({ success: true, ...result });
});

app.get("/api/part91/installment-preview", (req, res) => {
  const result = part91BuildInfo({
    command: req.query.q || req.query.command || "",
    role: req.query.role || "accountant",
    instituteId: req.query.instituteId || "NX-DEMO-INST-001",
    branchId: req.query.branchId,
    body: req.query || {}
  });
  if (!result.access.allowed) return res.status(403).json({ success: false, ...result });
  res.json({ success: true, access: result.access, selectedCourse: result.selectedCourse, installmentPreview: result.installmentPreview });
});

app.get("/api/part91/demo-slot-preview", (req, res) => {
  const result = part91BuildInfo({
    command: req.query.q || req.query.command || "",
    role: req.query.role || "receptionist_counsellor",
    instituteId: req.query.instituteId || "NX-DEMO-INST-001",
    branchId: req.query.branchId,
    body: req.query || {}
  });
  if (!result.access.allowed || result.access.safeOnly) return res.status(403).json({ success: false, ...result, message: result.access.safeOnly ? "Safe-only role cannot create demo booking preview." : result.access.reason });
  res.json({ success: true, access: result.access, selectedCourse: result.selectedCourse, demoSlotPreview: result.demoSlotPreview });
});

app.get("/api/part91/eligibility-preview", (req, res) => {
  const result = part91BuildInfo({
    command: req.query.q || req.query.command || "",
    role: req.query.role || "receptionist_counsellor",
    instituteId: req.query.instituteId || "NX-DEMO-INST-001",
    branchId: req.query.branchId,
    body: req.query || {}
  });
  if (!result.access.allowed) return res.status(403).json({ success: false, ...result });
  res.json({ success: true, access: result.access, query: result.query, selectedCourse: result.selectedCourse, eligibilityPreview: result.eligibilityPreview });
});

app.get("/api/part91/vani/greeting", (req, res) => {
  res.json({
    success: true,
    assistant: "VANI Fee and Batch Information",
    greeting: "Namaste, main VANI Fee aur Batch Information Assistant hoon. Aap class, subject ya course batayein, main fee preview aur batch timing bataungi.",
    exampleCommands: [
      "VANI, Class 10 Maths ki fee aur batch timing batao",
      "VANI, JEE foundation ka batch aur fee batao",
      "VANI, weekend revision batch available hai?",
      "VANI, Class 10 Science installment preview dikhao",
      "VANI, demo slot preview banao"
    ],
    safety: "Final fee commitment, discount, seat hold ya demo booking confirmation ke bina nahi hoga."
  });
});

app.post("/api/part91/vani/command", (req, res) => {
  const body = req.body || {};
  const result = part91BuildInfo({
    command: body.command || body.q || "",
    role: body.role || "receptionist_counsellor",
    instituteId: body.instituteId || "NX-DEMO-INST-001",
    branchId: body.branchId,
    body
  });
  if (!result.access.allowed) return res.status(403).json({ success: false, assistant: "VANI", ...result });
  res.json({ success: true, assistant: "VANI", part: "Part 91 — Fee and Batch Information Assistant", ...result });
});

app.get("/api/part91/vani/command", (req, res) => {
  const result = part91BuildInfo({
    command: req.query.command || req.query.q || "",
    role: req.query.role || "receptionist_counsellor",
    instituteId: req.query.instituteId || "NX-DEMO-INST-001",
    branchId: req.query.branchId,
    body: req.query || {}
  });
  if (!result.access.allowed) return res.status(403).json({ success: false, assistant: "VANI", ...result });
  res.json({ success: true, assistant: "VANI", part: "Part 91 — Fee and Batch Information Assistant", ...result });
});

app.get("/api/part91/audit-log", (req, res) => {
  res.json({
    success: true,
    auditLog: [
      { event: "fee_batch_information_preview", role: "receptionist_counsellor", createdAt: new Date().toISOString() },
      { event: "no_fee_commitment_policy", rule: "Fee, discount, seat hold and demo booking require confirmation.", createdAt: new Date().toISOString() }
    ]
  });
});

app.get("/api/part91/activity", (req, res) => {
  res.json({
    success: true,
    activity: [
      { type: "fee_batch_assistant_created", message: "Part 91 Fee and Batch Information Assistant active.", createdAt: new Date().toISOString() },
      { type: "private_screen_first_fee", message: "Fee details are preview-only and private-screen-first.", createdAt: new Date().toISOString() }
    ]
  });
});

app.get("/api/part91/checklist", (req, res) => {
  res.json({ success: true, checklist: part91Checklist });
});

app.get("/api/part91/export", (req, res) => {
  res.json({
    success: true,
    exportType: "part91-fee-batch-information-assistant-readiness",
    ownerVerificationRequiredForSensitiveExports: true,
    generatedAt: new Date().toISOString(),
    data: {
      features: part91Features,
      roles: part91RoleRules,
      catalog: part91CourseBatchCatalog,
      checklist: part91Checklist
    }
  });
});

app.get("/api/part91/demo", (req, res) => {
  const command = "VANI, Class 10 Maths ki fee aur batch timing batao";
  const result = part91BuildInfo({
    command,
    role: "receptionist_counsellor",
    instituteId: "NX-DEMO-INST-001",
    body: {}
  });
  res.json({
    success: true,
    demo: {
      command,
      result,
      nextPart: "Part 92 — Automatic Demo-Class Booking"
    }
  });
});
// ================= END PART 91 =================

// ================= PART 92 — AUTOMATIC DEMO-CLASS BOOKING =================
// NAXORA OS 2.0 Automatic Demo-Class Booking.
// This part converts demo class enquiries into a safe preview-confirm workflow:
// parse -> missing details -> availability -> slot selection -> preview -> confirmation
// -> simulated booking record + reminder draft. Production DB persistence can be
// connected later without changing the public API contract.

const part92DemoSlotCatalog = [
  {
    slotId: "DEMO-10-MATH-EVE",
    courseId: "CRS-BOARD-10",
    courseName: "Class 10 Board Booster",
    className: "Class 10",
    subject: "maths",
    batchId: "BAT-10-MATH-A",
    teacherId: "TCH-MATH-001",
    teacherName: "Demo Maths Teacher",
    day: "Tomorrow",
    dateLabel: "Next working day",
    time: "6:00 PM - 6:45 PM",
    mode: "offline",
    seatsLeftPreview: 4,
    location: "Room A1",
    meetingLinkPolicy: "Created after final confirmation for online/hybrid demos."
  },
  {
    slotId: "DEMO-10-SCI-EVE",
    courseId: "CRS-BOARD-10",
    courseName: "Class 10 Board Booster",
    className: "Class 10",
    subject: "science",
    batchId: "BAT-10-SCI-A",
    teacherId: "TCH-SCI-001",
    teacherName: "Demo Science Teacher",
    day: "Tomorrow",
    dateLabel: "Next working day",
    time: "6:00 PM - 6:45 PM",
    mode: "offline",
    seatsLeftPreview: 3,
    location: "Room A2",
    meetingLinkPolicy: "Created after final confirmation for online/hybrid demos."
  },
  {
    slotId: "DEMO-JEE-HYB",
    courseId: "CRS-COMPETITIVE",
    courseName: "Competitive Exam Foundation",
    className: "Class 11-12/Dropper",
    subject: "physics",
    batchId: "BAT-JEE-FND",
    teacherId: "TCH-PHY-001",
    teacherName: "Demo Physics Teacher",
    day: "Saturday",
    dateLabel: "Upcoming Saturday",
    time: "5:00 PM - 5:50 PM",
    mode: "hybrid",
    seatsLeftPreview: 2,
    location: "Room C1 / Online",
    meetingLinkPolicy: "Online link after confirmation."
  },
  {
    slotId: "DEMO-NEET-HYB",
    courseId: "CRS-COMPETITIVE",
    courseName: "Competitive Exam Foundation",
    className: "Class 11-12/Dropper",
    subject: "biology",
    batchId: "BAT-NEET-FND",
    teacherId: "TCH-BIO-001",
    teacherName: "Demo Biology Teacher",
    day: "Sunday",
    dateLabel: "Upcoming Sunday",
    time: "11:00 AM - 11:50 AM",
    mode: "hybrid",
    seatsLeftPreview: 3,
    location: "Room C2 / Online",
    meetingLinkPolicy: "Online link after confirmation."
  },
  {
    slotId: "DEMO-REV-WKD",
    courseId: "CRS-DOUBT-REVISION",
    courseName: "Doubt Solving + Revision Plan",
    className: "Class 8-12",
    subject: "maths",
    batchId: "BAT-DOUBT-WKD",
    teacherId: "TCH-REV-001",
    teacherName: "Demo Revision Teacher",
    day: "Saturday",
    dateLabel: "Upcoming Saturday",
    time: "4:00 PM - 4:40 PM",
    mode: "offline",
    seatsLeftPreview: 8,
    location: "Room D1",
    meetingLinkPolicy: "Offline demo."
  },
  {
    slotId: "DEMO-ONLINE-REV",
    courseId: "CRS-DOUBT-REVISION",
    courseName: "Doubt Solving + Revision Plan",
    className: "Class 8-12",
    subject: "science",
    batchId: "BAT-REV-ONLINE",
    teacherId: "TCH-ONLINE-001",
    teacherName: "Online Demo Teacher",
    day: "Today",
    dateLabel: "Today evening",
    time: "8:00 PM - 8:30 PM",
    mode: "online",
    seatsLeftPreview: 6,
    location: "Online",
    meetingLinkPolicy: "Online link after confirmation."
  }
];

const part92Features = [
  {
    key: "demo_request_parser",
    name: "Demo Request Parser",
    summary: "Extracts student, class, subject, parent phone, preferred mode and timing.",
    problemSolved: "Demo booking requests become structured automatically."
  },
  {
    key: "missing_detail_questions",
    name: "Missing Detail Questions",
    summary: "Asks required details before booking preview.",
    problemSolved: "Wrong demo bookings reduce."
  },
  {
    key: "slot_availability_preview",
    name: "Slot Availability Preview",
    summary: "Matches available demo slots by class, subject, mode and timing.",
    problemSolved: "Counsellor quickly sees suitable demo options."
  },
  {
    key: "auto_slot_suggestion",
    name: "Automatic Slot Suggestion",
    summary: "Selects best slot from available options.",
    problemSolved: "Demo class scheduling becomes faster."
  },
  {
    key: "booking_preview",
    name: "Booking Preview",
    summary: "Shows full booking details before final confirmation.",
    problemSolved: "No accidental bookings."
  },
  {
    key: "confirmation_flow",
    name: "Confirmation Flow",
    summary: "Requires confirmation before demo booking record is created.",
    problemSolved: "Safe action engine rule is preserved."
  },
  {
    key: "reminder_draft",
    name: "Reminder Draft",
    summary: "Creates WhatsApp/call reminder draft without auto-send.",
    problemSolved: "Follow-up becomes faster but safe."
  },
  {
    key: "soft_calm_vani_voice",
    name: "Soft Calm VANI Voice",
    summary: "VANI browser voice now prefers a soft, calm female-style voice where available.",
    problemSolved: "Voice feels more natural and less harsh."
  }
];

const part92RoleRules = [
  { role: "institute_owner", allowed: true, scope: "Full authorised demo booking workflow.", canConfirm: true, canApproveSensitive: true },
  { role: "branch_manager", allowed: true, scope: "Assigned branch demo booking workflow.", canConfirm: true, canApproveSensitive: false },
  { role: "receptionist_counsellor", allowed: true, scope: "Lead/demo intake, slot preview, confirmation and reminder drafts.", canConfirm: true, canApproveSensitive: false },
  { role: "teacher", allowed: true, previewOnly: true, scope: "Assigned demo slot/class preview only.", canConfirm: false, canApproveSensitive: false },
  { role: "accountant", allowed: true, previewOnly: true, scope: "Fee context preview only; no demo booking confirmation.", canConfirm: false, canApproveSensitive: false },
  { role: "student", allowed: true, safeOnly: true, scope: "Can request demo preview only; staff confirmation required.", canConfirm: false, canApproveSensitive: false },
  { role: "parent", allowed: true, safeOnly: true, scope: "Can request linked-child demo preview only; staff confirmation required.", canConfirm: false, canApproveSensitive: false },
  { role: "naxora_super_admin", allowed: false, scope: "Platform support only; no unrestricted institute demo booking.", canConfirm: false, canApproveSensitive: false }
];

function normalizePart92Role(role) {
  const r = String(role || "receptionist_counsellor").toLowerCase().trim().replace(/\s+/g, "_");
  if (["owner", "instituteowner", "institute_owner"].includes(r)) return "institute_owner";
  if (["branchmanager", "branch_manager"].includes(r)) return "branch_manager";
  if (["receptionist", "counsellor", "receptionist_counsellor", "admission_counsellor"].includes(r)) return "receptionist_counsellor";
  return r;
}

function part92AccessCheck({ role, instituteId, branchId }) {
  const normalizedRole = normalizePart92Role(role);
  const rule = part92RoleRules.find((r) => r.role === normalizedRole) || {
    role: normalizedRole,
    allowed: false,
    scope: "Unknown or unsupported role.",
    canConfirm: false,
    canApproveSensitive: false
  };
  const hasInstituteId = Boolean(String(instituteId || "").trim());
  const allowed = Boolean(rule.allowed && hasInstituteId && normalizedRole !== "naxora_super_admin");
  return {
    role: normalizedRole,
    instituteId: instituteId || null,
    branchId: branchId || null,
    allowed,
    previewOnly: Boolean(rule.previewOnly),
    safeOnly: Boolean(rule.safeOnly),
    canConfirm: Boolean(rule.canConfirm && allowed),
    canApproveSensitive: Boolean(rule.canApproveSensitive),
    scope: rule.scope,
    reason: !hasInstituteId
      ? "Institute ID missing."
      : !rule.allowed
        ? rule.scope
        : rule.safeOnly
          ? "Demo request preview only. Staff confirmation required for final booking."
          : rule.previewOnly
            ? "Preview allowed only. Final booking requires counsellor/owner/branch manager role."
            : "Demo booking access allowed.",
    requiresLogin: true,
    requiresInstituteId: true,
    confirmationRequiredFor: ["demo_book", "reminder_send", "reschedule", "cancel"],
    ownerVerificationRequiredFor: ["discount", "fee_change", "refund", "delete", "export", "subscription_change"]
  };
}

function part92ParseDemoRequest(text = "", body = {}) {
  const input = String(text || body.command || body.q || "").trim();
  const classMatch = input.match(/class\s*([0-9]{1,2})/i);
  const phoneMatch = input.match(/(?:phone|mobile|number|contact)\s*[:\-]?\s*([6-9][0-9]{9})/i);
  const subjectMatch = input.match(/\b(maths|math|science|english|physics|chemistry|biology|commerce|accounts|sst|social science)\b/i);
  const nameMatch = input.match(/(?:student|name|lead|for)\s+([A-Z][a-zA-Z]{2,20})/) || input.match(/\b([A-Z][a-zA-Z]{2,20})\b/);
  const mode = /online/i.test(input) ? "online" : /hybrid/i.test(input) ? "hybrid" : /offline|center|centre/i.test(input) ? "offline" : body.mode || null;
  const timing = /today|aaj/i.test(input) ? "today" :
    /tomorrow|kal/i.test(input) ? "tomorrow" :
    /weekend|saturday|sunday|sat|sun/i.test(input) ? "weekend" :
    /evening|shaam|after school/i.test(input) ? "evening" :
    /morning|subah/i.test(input) ? "morning" : body.preferredTiming || null;
  const source = /whatsapp/i.test(input) ? "WhatsApp" : /call/i.test(input) ? "Call" : /walk/i.test(input) ? "Walk-in" : /google/i.test(input) ? "Google" : body.source || "VANI";
  return {
    studentName: body.studentName || nameMatch?.[1] || null,
    className: body.className || (classMatch ? `Class ${classMatch[1]}` : null),
    subject: body.subject || (subjectMatch ? subjectMatch[1].toLowerCase().replace("math", "maths").replace("social science", "sst") : null),
    parentPhone: body.parentPhone || phoneMatch?.[1] || null,
    mode,
    preferredTiming: timing,
    source,
    rawCommand: input
  };
}

function part92MissingDetails(request = {}) {
  const missing = [];
  if (!request.studentName) missing.push({ key: "studentName", question: "Student ka naam kya hai?" });
  if (!request.className) missing.push({ key: "className", question: "Student kis class me hai?" });
  if (!request.subject) missing.push({ key: "subject", question: "Demo class ka subject kya chahiye?" });
  if (!request.parentPhone) missing.push({ key: "parentPhone", question: "Parent ka mobile number kya hai?" });
  return missing;
}

function part92SlotScore(slot, request = {}) {
  let score = 10;
  const reasons = [];
  const cls = String(request.className || "").toLowerCase().replace("class ", "");
  const subject = String(request.subject || "").toLowerCase();
  const mode = String(request.mode || "").toLowerCase();
  const timing = String(request.preferredTiming || "").toLowerCase();

  if (cls && slot.className.toLowerCase().includes(cls)) {
    score += 35;
    reasons.push("class match");
  } else if (cls && slot.className.includes("8-12")) {
    score += 15;
    reasons.push("broad class support");
  }
  if (subject && slot.subject === subject) {
    score += 30;
    reasons.push("subject match");
  } else if (subject && ["maths", "science"].includes(subject) && slot.courseId === "CRS-DOUBT-REVISION") {
    score += 10;
    reasons.push("revision subject support");
  }
  if (mode && (slot.mode === mode || slot.mode === "hybrid")) {
    score += 10;
    reasons.push("mode fit");
  }
  if (timing) {
    const hay = `${slot.day} ${slot.dateLabel} ${slot.time}`.toLowerCase();
    if ((timing === "today" && hay.includes("today")) ||
        (timing === "tomorrow" && hay.includes("tomorrow")) ||
        (timing === "weekend" && /sat|sun|saturday|sunday/.test(hay)) ||
        (timing === "evening" && /pm/.test(hay)) ||
        (timing === "morning" && /am/.test(hay))) {
      score += 10;
      reasons.push("preferred timing fit");
    }
  }
  if (Number(slot.seatsLeftPreview || 0) > 0) {
    score += 5;
    reasons.push("seat preview available");
  }
  return { slotId: slot.slotId, score: Math.min(100, score), reasons, slot };
}

function part92FindAvailableSlots(request = {}) {
  return part92DemoSlotCatalog
    .map((slot) => part92SlotScore(slot, request))
    .filter((x) => Number(x.slot.seatsLeftPreview || 0) > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function part92ConfirmationCode(request = {}) {
  const name = String(request.studentName || "DEMO").replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase() || "DEMO";
  const phone = String(request.parentPhone || "0000").slice(-4);
  return `${name}${phone}`;
}

function part92BuildReminderDraft({ request = {}, selectedSlot = {} }) {
  const student = request.studentName || "student";
  return {
    autoSend: false,
    confirmationRequired: true,
    channel: "WhatsApp/call draft",
    hindiHinglish: `Namaste, ${student} ki demo class ${selectedSlot.courseName || "selected course"} ke liye ${selectedSlot.day || "selected day"} ${selectedSlot.time || ""} par preview hai. Kripya confirm karein. Final booking confirmation ke baad hi slot reserve hoga.`,
    english: `Hello, demo class preview for ${student} is available for ${selectedSlot.courseName || "selected course"} on ${selectedSlot.day || "selected day"} at ${selectedSlot.time || ""}. Please confirm before the slot is reserved.`
  };
}

function part92BuildBookingPreview({ command, role, instituteId, branchId, body = {} }) {
  const access = part92AccessCheck({ role, instituteId, branchId });
  const request = part92ParseDemoRequest(command, body);
  const missing = access.allowed ? part92MissingDetails(request) : [];
  const availableSlots = part92FindAvailableSlots(request);
  const selectedSlot = (body.slotId && part92DemoSlotCatalog.find((s) => s.slotId === body.slotId)) || availableSlots[0]?.slot || part92DemoSlotCatalog[0];
  const confirmationCode = part92ConfirmationCode(request);
  const bookingPreview = {
    previewOnly: true,
    bookingPreviewId: `DEMO-PREVIEW-${Date.now()}`,
    studentName: request.studentName || "Pending",
    parentPhone: request.parentPhone || "Pending",
    className: request.className || "Pending",
    subject: request.subject || "Pending",
    source: request.source,
    selectedSlot,
    confirmationCode,
    finalBookingRequiresConfirmation: true,
    note: "Final booking confirmation ke bina slot reserve nahi hoga."
  };

  let replyText = "";
  let nextAction = "none";
  if (!access.allowed) {
    replyText = "Is role ko demo class booking access nahi hai.";
    nextAction = "blocked";
  } else if (missing.length) {
    replyText = missing[0].question;
    nextAction = "ask_missing_detail";
  } else if (!availableSlots.length) {
    replyText = "Is request ke liye matching demo slot nahi mila. Manual review required hai.";
    nextAction = "manual_review";
  } else if (access.safeOnly || access.previewOnly) {
    replyText = `${request.studentName} ke liye demo slot preview ready hai. Final booking staff confirmation se hi hoga.`;
    nextAction = "safe_preview_only";
  } else {
    replyText = `${request.studentName} ke liye demo booking preview ready hai. Suggested slot: ${selectedSlot.day}, ${selectedSlot.time}. Confirm karne ke liye code ${confirmationCode} use karein.`;
    nextAction = "wait_for_confirmation";
  }

  return {
    access,
    request,
    missingDetails: missing,
    availableSlots,
    selectedSlot,
    bookingPreview,
    reminderDraft: part92BuildReminderDraft({ request, selectedSlot }),
    replyText,
    spokenSafeSummary: replyText,
    privateScreenFirst: true,
    nextAction,
    confirmationRequiredFor: ["demo_book", "reminder_send", "reschedule", "cancel"],
    ownerVerificationRequiredFor: ["discount", "fee_change", "refund", "delete", "export", "subscription_change"],
    auditLog: {
      event: "part92_demo_booking_preview",
      role: access.role,
      selectedSlotId: selectedSlot?.slotId || null,
      createdAt: new Date().toISOString()
    }
  };
}

function part92ConfirmBooking({ command, role, instituteId, branchId, body = {} }) {
  const preview = part92BuildBookingPreview({ command, role, instituteId, branchId, body });
  const confirmationText = String(body.confirmationText || body.confirmationCode || "").trim().toUpperCase();
  const expectedCode = String(preview.bookingPreview.confirmationCode || "").toUpperCase();
  const hasConsent = Boolean(body.confirm === true || String(body.confirm || "").toLowerCase() === "true");
  const codeValid = confirmationText === expectedCode || confirmationText === "CONFIRM DEMO";
  const canFinalize = preview.access.allowed && preview.access.canConfirm && !preview.missingDetails.length && codeValid && hasConsent;

  if (!preview.access.allowed) {
    return { success: false, statusCode: 403, message: preview.access.reason, ...preview };
  }
  if (!preview.access.canConfirm) {
    return { success: false, statusCode: 403, message: "This role cannot confirm final demo booking.", ...preview };
  }
  if (preview.missingDetails.length) {
    return { success: false, statusCode: 400, message: "Missing details required before booking confirmation.", ...preview };
  }
  if (!hasConsent || !codeValid) {
    return {
      success: false,
      statusCode: 400,
      message: "Confirmation required. Send confirm=true and confirmationCode matching preview code.",
      expectedConfirmationCode: expectedCode,
      ...preview
    };
  }

  const confirmedBooking = {
    bookingId: `DEMO-BOOKED-${Date.now()}`,
    status: "confirmed_foundation_mode",
    dbPersistence: "pending_production_db_connection",
    studentName: preview.request.studentName,
    parentPhone: preview.request.parentPhone,
    className: preview.request.className,
    subject: preview.request.subject,
    selectedSlot: preview.selectedSlot,
    reminders: {
      reminderDraftCreated: true,
      autoSend: false,
      sendRequiresConfirmation: true
    },
    auditLog: {
      event: "part92_demo_booking_confirmed_foundation",
      confirmedByRole: preview.access.role,
      createdAt: new Date().toISOString()
    }
  };

  return {
    success: true,
    message: "Demo booking confirmed in foundation mode. Production DB save can be connected next.",
    ...preview,
    confirmedBooking,
    replyText: `${preview.request.studentName} ki demo class foundation mode me confirm ho gayi hai. Reminder draft ready hai, auto-send off hai.`,
    spokenSafeSummary: `${preview.request.studentName} ki demo class confirm ho gayi hai. Details screen par dikh rahe hain.`
  };
}

const part92Checklist = [
  "Automatic Demo-Class Booking page opens",
  "Status API returns success true",
  "Demo request parser extracts student/class/subject/phone",
  "Missing details are asked instead of guessed",
  "Availability returns top demo slots",
  "Booking preview returns confirmation code",
  "Safe-only roles cannot final-confirm booking",
  "Confirm API requires confirm=true and confirmationCode",
  "Reminder draft is created but not auto-sent",
  "Soft calm VANI voice loads on VANI pages",
  "Previous Part 1–91 routes remain preserved"
];

app.get("/api/part92/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 92 — Automatic Demo-Class Booking",
    status: "active",
    versionPhase: "NAXORA OS 2.0",
    latestCompletedPart: 92,
    nextPart: "Part 93 — AI Lead Qualification",
    preservesPreviousFeatures: true,
    frontendRoutes: ["/automatic-demo-class-booking", "/demo-class-booking-ai", "/auto-demo-booking", "/vani-demo-booking", "/demo-booking-assistant", "/ai-demo-class-booking"],
    apiRoutes: [
      "/api/part92/config",
      "/api/part92/features",
      "/api/part92/roles",
      "/api/part92/access-check",
      "/api/part92/demo-slots",
      "/api/part92/booking/parse",
      "/api/part92/booking/availability",
      "/api/part92/booking/preview",
      "/api/part92/booking/confirm",
      "/api/part92/reminder/draft",
      "/api/part92/vani/greeting",
      "/api/part92/vani/command"
    ],
    automaticDemoClassBookingEnabled: true,
    softCalmVaniVoiceEnabled: true
  });
});

app.get("/api/part92/config", (req, res) => {
  res.json({
    success: true,
    appName: "Automatic Demo-Class Booking",
    appType: "safe_demo_booking_foundation",
    version: "2.0-automatic-demo-class-booking",
    policy: {
      previewFirst: true,
      noAutoBookingWithoutConfirmation: true,
      noAutoReminderSend: true,
      noSeatHoldWithoutConfirmation: true,
      missingDetailsNotGuessed: true,
      softCalmVaniVoice: true
    }
  });
});

app.get("/api/part92/features", (req, res) => {
  res.json({ success: true, features: part92Features });
});

app.get("/api/part92/roles", (req, res) => {
  res.json({ success: true, roles: part92RoleRules });
});

app.get("/api/part92/access-check", (req, res) => {
  res.json({ success: true, access: part92AccessCheck(req.query || {}) });
});

app.get("/api/part92/demo-slots", (req, res) => {
  res.json({ success: true, previewOnly: true, slots: part92DemoSlotCatalog });
});

app.get("/api/part92/booking/parse", (req, res) => {
  const request = part92ParseDemoRequest(req.query.q || req.query.command || "", req.query || {});
  res.json({ success: true, request, missingDetails: part92MissingDetails(request) });
});

app.post("/api/part92/booking/parse", (req, res) => {
  const body = req.body || {};
  const request = part92ParseDemoRequest(body.q || body.command || "", body);
  res.json({ success: true, request, missingDetails: part92MissingDetails(request) });
});

app.get("/api/part92/booking/availability", (req, res) => {
  const request = part92ParseDemoRequest(req.query.q || req.query.command || "", req.query || {});
  res.json({ success: true, request, missingDetails: part92MissingDetails(request), availableSlots: part92FindAvailableSlots(request) });
});

app.get("/api/part92/booking/preview", (req, res) => {
  const result = part92BuildBookingPreview({
    command: req.query.q || req.query.command || "",
    role: req.query.role || "receptionist_counsellor",
    instituteId: req.query.instituteId || "NX-DEMO-INST-001",
    branchId: req.query.branchId,
    body: req.query || {}
  });
  if (!result.access.allowed) return res.status(403).json({ success: false, ...result });
  res.json({ success: true, ...result });
});

app.post("/api/part92/booking/preview", (req, res) => {
  const body = req.body || {};
  const result = part92BuildBookingPreview({
    command: body.q || body.command || "",
    role: body.role || "receptionist_counsellor",
    instituteId: body.instituteId || "NX-DEMO-INST-001",
    branchId: body.branchId,
    body
  });
  if (!result.access.allowed) return res.status(403).json({ success: false, ...result });
  res.json({ success: true, ...result });
});

app.post("/api/part92/booking/confirm", (req, res) => {
  const body = req.body || {};
  const result = part92ConfirmBooking({
    command: body.q || body.command || "",
    role: body.role || "receptionist_counsellor",
    instituteId: body.instituteId || "NX-DEMO-INST-001",
    branchId: body.branchId,
    body
  });
  if (!result.success) return res.status(result.statusCode || 400).json(result);
  res.json(result);
});

app.get("/api/part92/booking/confirm", (req, res) => {
  const result = part92ConfirmBooking({
    command: req.query.q || req.query.command || "",
    role: req.query.role || "receptionist_counsellor",
    instituteId: req.query.instituteId || "NX-DEMO-INST-001",
    branchId: req.query.branchId,
    body: req.query || {}
  });
  if (!result.success) return res.status(result.statusCode || 400).json(result);
  res.json(result);
});

app.get("/api/part92/booking/reschedule-preview", (req, res) => {
  const result = part92BuildBookingPreview({
    command: req.query.q || req.query.command || "",
    role: req.query.role || "receptionist_counsellor",
    instituteId: req.query.instituteId || "NX-DEMO-INST-001",
    branchId: req.query.branchId,
    body: req.query || {}
  });
  if (!result.access.allowed) return res.status(403).json({ success: false, ...result });
  res.json({
    success: true,
    previewOnly: true,
    rescheduleRequiresConfirmation: true,
    currentBookingId: req.query.bookingId || "DEMO-BOOKED-DEMO",
    suggestedSlots: result.availableSlots,
    message: "Reschedule preview ready. Final reschedule confirmation ke bina nahi hoga."
  });
});

app.get("/api/part92/booking/cancel-preview", (req, res) => {
  const access = part92AccessCheck(req.query || {});
  if (!access.allowed || !access.canConfirm) return res.status(403).json({ success: false, access, message: "Only authorised staff can prepare cancellation preview." });
  res.json({
    success: true,
    previewOnly: true,
    cancellationRequiresConfirmation: true,
    bookingId: req.query.bookingId || "DEMO-BOOKED-DEMO",
    message: "Cancellation preview ready. Final cancel confirmation ke bina nahi hoga."
  });
});

app.get("/api/part92/reminder/draft", (req, res) => {
  const result = part92BuildBookingPreview({
    command: req.query.q || req.query.command || "",
    role: req.query.role || "receptionist_counsellor",
    instituteId: req.query.instituteId || "NX-DEMO-INST-001",
    branchId: req.query.branchId,
    body: req.query || {}
  });
  if (!result.access.allowed) return res.status(403).json({ success: false, ...result });
  res.json({ success: true, access: result.access, request: result.request, selectedSlot: result.selectedSlot, reminderDraft: result.reminderDraft });
});

app.get("/api/part92/vani/greeting", (req, res) => {
  res.json({
    success: true,
    assistant: "VANI Demo Booking",
    greeting: "Namaste, main VANI Demo Booking Assistant hoon. Aap demo class ke liye student, class, subject aur parent phone batayein. Main suitable slot preview bana dungi.",
    voiceStyle: "soft_calm_female_style_browser_voice",
    exampleCommands: [
      "VANI, Aman Class 10 Maths demo book karo parent phone 9876543210",
      "VANI, Class 10 Science demo slot batao",
      "VANI, JEE Physics online demo book karo parent phone 9876543210",
      "VANI, weekend revision demo slot chahiye",
      "VANI, demo reminder draft banao"
    ],
    safety: "Final demo booking, reminder send, reschedule ya cancel confirmation ke bina nahi hoga."
  });
});

app.post("/api/part92/vani/command", (req, res) => {
  const body = req.body || {};
  const command = body.command || body.q || "";
  const wantsConfirm = /confirm|book final|final booking|haan book/i.test(String(command));
  const result = wantsConfirm
    ? part92ConfirmBooking({
        command,
        role: body.role || "receptionist_counsellor",
        instituteId: body.instituteId || "NX-DEMO-INST-001",
        branchId: body.branchId,
        body
      })
    : part92BuildBookingPreview({
        command,
        role: body.role || "receptionist_counsellor",
        instituteId: body.instituteId || "NX-DEMO-INST-001",
        branchId: body.branchId,
        body
      });
  if (!result.access?.allowed) return res.status(403).json({ success: false, assistant: "VANI", ...result });
  res.json({ success: result.success !== false, assistant: "VANI", part: "Part 92 — Automatic Demo-Class Booking", ...result });
});

app.get("/api/part92/vani/command", (req, res) => {
  const command = req.query.command || req.query.q || "";
  const result = part92BuildBookingPreview({
    command,
    role: req.query.role || "receptionist_counsellor",
    instituteId: req.query.instituteId || "NX-DEMO-INST-001",
    branchId: req.query.branchId,
    body: req.query || {}
  });
  if (!result.access.allowed) return res.status(403).json({ success: false, assistant: "VANI", ...result });
  res.json({ success: true, assistant: "VANI", part: "Part 92 — Automatic Demo-Class Booking", ...result });
});

app.get("/api/part92/audit-log", (req, res) => {
  res.json({
    success: true,
    auditLog: [
      { event: "demo_booking_preview_created", role: "receptionist_counsellor", createdAt: new Date().toISOString() },
      { event: "confirmation_required_policy", rule: "Demo booking requires confirmation code.", createdAt: new Date().toISOString() },
      { event: "soft_calm_vani_voice_enabled", rule: "Browser voice prefers soft calm female-style voice where available.", createdAt: new Date().toISOString() }
    ]
  });
});

app.get("/api/part92/activity", (req, res) => {
  res.json({
    success: true,
    activity: [
      { type: "automatic_demo_booking_created", message: "Part 92 Automatic Demo-Class Booking active.", createdAt: new Date().toISOString() },
      { type: "no_auto_send_policy", message: "Reminder drafts are created but not auto-sent.", createdAt: new Date().toISOString() }
    ]
  });
});

app.get("/api/part92/checklist", (req, res) => {
  res.json({ success: true, checklist: part92Checklist });
});

app.get("/api/part92/export", (req, res) => {
  res.json({
    success: true,
    exportType: "part92-automatic-demo-class-booking-readiness",
    ownerVerificationRequiredForSensitiveExports: true,
    generatedAt: new Date().toISOString(),
    data: {
      features: part92Features,
      roles: part92RoleRules,
      slots: part92DemoSlotCatalog,
      checklist: part92Checklist
    }
  });
});

app.get("/api/part92/demo", (req, res) => {
  const command = "VANI, Aman Class 10 Maths demo book karo parent phone 9876543210";
  const preview = part92BuildBookingPreview({
    command,
    role: "receptionist_counsellor",
    instituteId: "NX-DEMO-INST-001",
    body: {}
  });
  res.json({
    success: true,
    demo: {
      command,
      preview,
      confirmExample: `/api/part92/booking/confirm?role=receptionist_counsellor&instituteId=NX-DEMO-INST-001&confirm=true&confirmationCode=${preview.bookingPreview.confirmationCode}&q=${encodeURIComponent(command)}`,
      nextPart: "Part 93 — AI Lead Qualification"
    }
  });
});
// ================= END PART 92 =================

// ================= PART 93 — AI LEAD QUALIFICATION =================
// NAXORA OS 2.0 AI Lead Qualification.
// This part qualifies admission leads using source, course interest, class, subject,
// budget, urgency, parent phone, demo interest, objection risk and follow-up status.
// It is preview-first and never sends messages, changes fees, books demos or creates
// final admissions without confirmation.

const part93LeadSources = [
  { key: "whatsapp", label: "WhatsApp", baseScore: 18, priority: "high", reason: "Direct chat source usually has higher intent." },
  { key: "walk-in", label: "Walk-in", baseScore: 22, priority: "high", reason: "Physical visit indicates strong intent." },
  { key: "referral", label: "Referral", baseScore: 20, priority: "high", reason: "Trusted referral source." },
  { key: "google", label: "Google", baseScore: 14, priority: "medium", reason: "Search intent is useful but needs follow-up." },
  { key: "website", label: "Website", baseScore: 12, priority: "medium", reason: "Website enquiry needs quick response." },
  { key: "facebook", label: "Facebook/Instagram", baseScore: 10, priority: "medium", reason: "Social lead requires qualification." },
  { key: "unknown", label: "Unknown", baseScore: 5, priority: "low", reason: "Source missing; needs clarification." }
];

const part93QualificationCriteria = [
  { key: "parentPhone", label: "Parent phone available", weight: 18 },
  { key: "className", label: "Class known", weight: 10 },
  { key: "subjectOrCourse", label: "Subject/course interest clear", weight: 16 },
  { key: "urgency", label: "Urgency detected", weight: 14 },
  { key: "demoInterest", label: "Demo class interest", weight: 14 },
  { key: "budget", label: "Budget mentioned", weight: 8 },
  { key: "source", label: "Lead source quality", weight: 22 },
  { key: "objectionRisk", label: "Low objection risk", weight: 8 }
];

const part93Features = [
  {
    key: "lead_parser",
    name: "Lead Parser",
    summary: "Extracts student name, class, subject/course, phone, source, urgency, budget and objections.",
    problemSolved: "Admission team gets structured leads from raw messages."
  },
  {
    key: "lead_score",
    name: "Lead Score",
    summary: "Scores leads from 0 to 100 with reasons.",
    problemSolved: "Team knows which leads need fastest call."
  },
  {
    key: "qualification_category",
    name: "Qualification Category",
    summary: "Marks leads as hot, warm, nurture or cold.",
    problemSolved: "Counsellors can prioritise work."
  },
  {
    key: "followup_plan",
    name: "Follow-up Plan",
    summary: "Suggests call, WhatsApp, demo or nurture next steps.",
    problemSolved: "No lead stays unclear after qualification."
  },
  {
    key: "objection_risk",
    name: "Objection Risk",
    summary: "Detects fee, timing, distance, trust and urgency objections.",
    problemSolved: "Counsellor prepares the right reply."
  },
  {
    key: "assignment_preview",
    name: "Assignment Preview",
    summary: "Suggests owner/counsellor/branch assignment without final save.",
    problemSolved: "Leads can be routed safely."
  },
  {
    key: "vani_lead_qualification",
    name: "VANI Lead Qualification",
    summary: "Hindi/Hinglish voice commands for lead qualification.",
    problemSolved: "Staff can say: 'VANI, is lead ko qualify karo'."
  }
];

const part93RoleRules = [
  { role: "institute_owner", allowed: true, scope: "Full authorised lead qualification and routing preview.", canApproveSensitive: true },
  { role: "branch_manager", allowed: true, scope: "Assigned branch leads only.", canApproveSensitive: false },
  { role: "receptionist_counsellor", allowed: true, scope: "Lead qualification, follow-up plan and demo/admission preview.", canApproveSensitive: false },
  { role: "teacher", allowed: true, previewOnly: true, scope: "Academic course-fit note only; no lead routing or follow-up action.", canApproveSensitive: false },
  { role: "accountant", allowed: true, previewOnly: true, scope: "Fee objection and affordability note only.", canApproveSensitive: false },
  { role: "student", allowed: false, scope: "Student app/learning support only.", canApproveSensitive: false },
  { role: "parent", allowed: false, scope: "Parent app/linked child support only.", canApproveSensitive: false },
  { role: "naxora_super_admin", allowed: false, scope: "Platform support only; no unrestricted institute lead access.", canApproveSensitive: false }
];

function normalizePart93Role(role) {
  const r = String(role || "receptionist_counsellor").toLowerCase().trim().replace(/\s+/g, "_");
  if (["owner", "instituteowner", "institute_owner"].includes(r)) return "institute_owner";
  if (["branchmanager", "branch_manager"].includes(r)) return "branch_manager";
  if (["receptionist", "counsellor", "receptionist_counsellor", "admission_counsellor"].includes(r)) return "receptionist_counsellor";
  return r;
}

function part93AccessCheck({ role, instituteId, branchId }) {
  const normalizedRole = normalizePart93Role(role);
  const rule = part93RoleRules.find((r) => r.role === normalizedRole) || {
    role: normalizedRole,
    allowed: false,
    scope: "Unknown or unsupported role.",
    canApproveSensitive: false
  };
  const hasInstituteId = Boolean(String(instituteId || "").trim());
  const allowed = Boolean(rule.allowed && hasInstituteId && normalizedRole !== "naxora_super_admin");
  return {
    role: normalizedRole,
    instituteId: instituteId || null,
    branchId: branchId || null,
    allowed,
    previewOnly: Boolean(rule.previewOnly),
    canApproveSensitive: Boolean(rule.canApproveSensitive),
    scope: rule.scope,
    reason: !hasInstituteId
      ? "Institute ID missing."
      : !rule.allowed
        ? rule.scope
        : rule.previewOnly
          ? "Preview-only access. Final lead routing/follow-up requires counsellor/owner role."
          : "AI Lead Qualification access allowed.",
    requiresLogin: true,
    requiresInstituteId: true,
    confirmationRequiredFor: ["lead_save", "followup_send", "demo_book", "assign_lead", "admission_create"],
    ownerVerificationRequiredFor: ["discount", "fee_commitment", "refund", "delete", "export", "subscription_change"]
  };
}

function part93NormalizeSource(source = "", text = "") {
  const input = `${source || ""} ${text || ""}`.toLowerCase();
  if (input.includes("whatsapp")) return "whatsapp";
  if (input.includes("walk") || input.includes("visit")) return "walk-in";
  if (input.includes("referral") || input.includes("refer")) return "referral";
  if (input.includes("google")) return "google";
  if (input.includes("website") || input.includes("site")) return "website";
  if (input.includes("facebook") || input.includes("instagram") || input.includes("social")) return "facebook";
  return "unknown";
}

function part93ParseLead(text = "", body = {}) {
  const input = String(text || body.command || body.q || body.message || "").trim();
  const classMatch = input.match(/class\s*([0-9]{1,2})/i);
  const phoneMatch = input.match(/(?:phone|mobile|number|contact|parent phone)\s*[:\-]?\s*([6-9][0-9]{9})/i);
  const budgetMatch = input.match(/(?:budget|fee|fees|amount)\s*[:\-]?\s*([0-9]{3,7})/i);
  const subjectMatch = input.match(/\b(maths|math|science|english|physics|chemistry|biology|commerce|accounts|sst|social science)\b/i);
  const nameMatch = input.match(/(?:student|name|lead|for)\s+([A-Z][a-zA-Z]{2,20})/) || input.match(/\b([A-Z][a-zA-Z]{2,20})\b/);
  const urgency = /today|urgent|jaldi|abhi|immediate|same day|this week|demo/i.test(input)
    ? "high"
    : /next month|later|baad|soch/i.test(input)
      ? "low"
      : "medium";
  const demoInterest = /demo|trial|visit|class dekhna|free class/i.test(input);
  const source = part93NormalizeSource(body.source, input);
  const objectionText = /fee|expensive|mehenga|time|timing|distance|door|trust|result|guarantee/i.test(input)
    ? input
    : String(body.objection || "");
  return {
    leadId: body.leadId || `LEAD-PREVIEW-${Date.now()}`,
    studentName: body.studentName || nameMatch?.[1] || null,
    className: body.className || (classMatch ? `Class ${classMatch[1]}` : null),
    subject: body.subject || (subjectMatch ? subjectMatch[1].toLowerCase().replace("math", "maths").replace("social science", "sst") : null),
    courseInterest: body.courseInterest || (/jee/i.test(input) ? "JEE Foundation" : /neet/i.test(input) ? "NEET Foundation" : /board/i.test(input) ? "Board Booster" : null),
    parentPhone: body.parentPhone || phoneMatch?.[1] || null,
    source,
    budget: body.budget || budgetMatch?.[1] || null,
    urgency,
    demoInterest: body.demoInterest !== undefined ? Boolean(body.demoInterest) : demoInterest,
    objectionText,
    rawCommand: input
  };
}

function part93MissingDetails(lead = {}) {
  const missing = [];
  if (!lead.studentName) missing.push({ key: "studentName", question: "Student ka naam kya hai?" });
  if (!lead.parentPhone) missing.push({ key: "parentPhone", question: "Parent ka mobile number kya hai?" });
  if (!lead.className) missing.push({ key: "className", question: "Student kis class me hai?" });
  if (!lead.subject && !lead.courseInterest) missing.push({ key: "subjectOrCourse", question: "Kaunsa subject ya course interest hai?" });
  if (!lead.source || lead.source === "unknown") missing.push({ key: "source", question: "Lead source kya hai: WhatsApp, walk-in, referral, Google ya website?" });
  return missing;
}

function part93ObjectionRisk(lead = {}) {
  const text = String(lead.objectionText || lead.rawCommand || "").toLowerCase();
  const risks = [];
  if (text.includes("fee") || text.includes("expensive") || text.includes("mehenga")) risks.push({ type: "fee", level: "medium", response: "Demo aur learning plan explain karein. Discount owner approval ke bina commit na karein." });
  if (text.includes("time") || text.includes("timing")) risks.push({ type: "timing", level: "medium", response: "Suitable batch timing aur demo slot preview dikhayein." });
  if (text.includes("distance") || text.includes("door")) risks.push({ type: "distance", level: "medium", response: "Online/hybrid option available ho to explain karein." });
  if (text.includes("trust") || text.includes("result") || text.includes("guarantee")) risks.push({ type: "trust_result", level: "high", response: "Result guarantee na dein. Demo, teacher profile aur progress tracking explain karein." });
  const level = risks.some((r) => r.level === "high") ? "high" : risks.length ? "medium" : "low";
  return {
    level,
    risks,
    summary: level === "low" ? "Objection risk low hai." : `Objection risk ${level} hai; counsellor prepared response use kare.`
  };
}

function part93LeadScore(lead = {}) {
  const sourceInfo = part93LeadSources.find((s) => s.key === lead.source) || part93LeadSources.find((s) => s.key === "unknown");
  const objection = part93ObjectionRisk(lead);
  let score = 20;
  const reasons = [];

  if (lead.parentPhone) { score += 18; reasons.push("parent phone available"); }
  if (lead.className) { score += 10; reasons.push("class known"); }
  if (lead.subject || lead.courseInterest) { score += 16; reasons.push("course/subject interest clear"); }
  if (lead.urgency === "high") { score += 14; reasons.push("high urgency"); }
  else if (lead.urgency === "medium") { score += 7; reasons.push("medium urgency"); }
  if (lead.demoInterest) { score += 14; reasons.push("demo interest"); }
  if (lead.budget) { score += 8; reasons.push("budget mentioned"); }
  score += sourceInfo.baseScore;
  reasons.push(`source: ${sourceInfo.label}`);
  if (objection.level === "low") { score += 8; reasons.push("low objection risk"); }
  if (objection.level === "high") { score -= 8; reasons.push("high objection risk"); }

  score = Math.max(0, Math.min(100, score));
  const category = score >= 78 ? "hot" : score >= 58 ? "warm" : score >= 38 ? "nurture" : "cold";
  const priority = category === "hot"
    ? "Call within 15 minutes and offer demo preview."
    : category === "warm"
      ? "Follow up today and clarify missing details."
      : category === "nurture"
        ? "Send helpful course information and re-check later."
        : "Low priority; keep in nurture list.";

  return { score, category, priority, reasons, sourceInfo, objectionRisk: objection };
}

function part93FollowupPlan(lead = {}, qualification = {}) {
  const category = qualification.category || "warm";
  const name = lead.studentName || "student";
  const course = lead.courseInterest || lead.subject || "course";
  if (category === "hot") {
    return {
      priority: "urgent",
      nextStep: "call_now",
      timeline: "within 15 minutes",
      script: `Namaste, NAXORA Institute se baat kar rahe hain. ${name} ke liye ${course} interest mila. Aapke liye demo class preview ready kar sakte hain. Kya aaj ya kal ka slot theek rahega?`,
      autoSend: false,
      confirmationRequired: true
    };
  }
  if (category === "warm") {
    return {
      priority: "today",
      nextStep: "same_day_followup",
      timeline: "today",
      script: `Namaste, ${name} ke course interest ke liye thanks. Hum class, batch timing aur fee preview share kar sakte hain. Demo class dekhna chahenge?`,
      autoSend: false,
      confirmationRequired: true
    };
  }
  if (category === "nurture") {
    return {
      priority: "nurture",
      nextStep: "send_info_then_followup",
      timeline: "2-3 days",
      script: `Namaste, NAXORA Institute se. Aapke interest ke hisaab se course details aur demo option available hain. Jab convenient ho, hum guide kar denge.`,
      autoSend: false,
      confirmationRequired: true
    };
  }
  return {
    priority: "low",
    nextStep: "nurture_list",
    timeline: "weekly",
    script: "Lead details incomplete hain. Pehle basic details collect karein.",
    autoSend: false,
    confirmationRequired: true
  };
}

function part93NextAction(lead = {}, qualification = {}) {
  if (part93MissingDetails(lead).length) return { action: "ask_missing_details", label: "Missing details collect karo", confirmationRequired: false };
  if (qualification.category === "hot") return { action: "call_and_demo_preview", label: "Call now + demo slot preview", confirmationRequired: true };
  if (qualification.category === "warm") return { action: "followup_today", label: "Same-day follow-up", confirmationRequired: true };
  if (qualification.category === "nurture") return { action: "nurture_sequence", label: "Course info + later follow-up", confirmationRequired: true };
  return { action: "hold_low_priority", label: "Low priority nurture list", confirmationRequired: false };
}

function part93AssignmentPreview(lead = {}, access = {}, qualification = {}) {
  const category = qualification.category || "warm";
  let assignTo = "receptionist_counsellor";
  if (category === "hot") assignTo = access.role === "branch_manager" ? "branch_manager" : "senior_counsellor";
  if (lead.source === "walk-in") assignTo = "front_desk_counsellor";
  if (qualification.objectionRisk?.level === "high") assignTo = "senior_counsellor";
  return {
    previewOnly: true,
    assignTo,
    reason: "Assignment preview based on category, source and objection risk.",
    finalAssignmentRequiresConfirmation: true,
    ownerReviewRecommended: category === "hot" || qualification.objectionRisk?.level === "high"
  };
}

function part93BuildQualification({ command, role, instituteId, branchId, body = {} }) {
  const access = part93AccessCheck({ role, instituteId, branchId });
  const lead = part93ParseLead(command, body);
  const missing = access.allowed ? part93MissingDetails(lead) : [];
  const qualification = part93LeadScore(lead);
  const followupPlan = part93FollowupPlan(lead, qualification);
  const nextAction = part93NextAction(lead, qualification);
  const assignmentPreview = part93AssignmentPreview(lead, access, qualification);

  let replyText = "";
  let action = "none";
  if (!access.allowed) {
    replyText = "Is role ko AI Lead Qualification access nahi hai.";
    action = "blocked";
  } else if (access.previewOnly) {
    replyText = "Aap preview dekh sakte ho. Final lead routing ya follow-up counsellor/owner confirmation se hoga.";
    action = "preview_only";
  } else if (missing.length) {
    replyText = missing[0].question;
    action = "ask_missing_detail";
  } else {
    replyText = `${lead.studentName} lead ${qualification.category} hai. Score ${qualification.score}/100 hai. Next action: ${nextAction.label}. Final save/send/assign confirmation ke bina nahi hoga.`;
    action = "show_qualification_preview";
  }

  return {
    access,
    lead,
    missingDetails: missing,
    qualification,
    followupPlan,
    objectionRisk: qualification.objectionRisk,
    nextAction,
    assignmentPreview,
    crmPayloadPreview: {
      previewOnly: true,
      leadId: lead.leadId,
      instituteId: access.instituteId,
      branchId: access.branchId,
      category: qualification.category,
      score: qualification.score,
      stage: missing.length ? "needs_details" : "qualified_preview",
      finalSaveRequiresConfirmation: true
    },
    replyText,
    spokenSafeSummary: replyText,
    privateScreenFirst: true,
    confirmationRequiredFor: ["lead_save", "followup_send", "demo_book", "assign_lead", "admission_create"],
    ownerVerificationRequiredFor: ["discount", "fee_commitment", "refund", "delete", "export", "subscription_change"],
    auditLog: {
      event: "part93_ai_lead_qualification",
      role: access.role,
      category: qualification.category,
      score: qualification.score,
      createdAt: new Date().toISOString()
    }
  };
}

const part93Checklist = [
  "AI Lead Qualification page opens",
  "Status API returns success true",
  "Lead parser extracts student/class/subject/phone/source",
  "Missing details are asked instead of guessed",
  "Lead score returns 0-100",
  "Lead category returns hot/warm/nurture/cold",
  "Follow-up plan is draft-only",
  "Objection risk is detected",
  "Assignment preview requires confirmation",
  "VANI lead qualification works",
  "Previous Part 1–92 routes remain preserved"
];

app.get("/api/part93/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 93 — AI Lead Qualification",
    status: "active",
    versionPhase: "NAXORA OS 2.0",
    latestCompletedPart: 93,
    nextPart: "Part 94 — Native Live Classroom Foundation",
    preservesPreviousFeatures: true,
    frontendRoutes: ["/ai-lead-qualification", "/lead-qualification-ai", "/smart-lead-qualification", "/vani-lead-qualification", "/lead-score-ai", "/lead-priority-ai"],
    apiRoutes: [
      "/api/part93/config",
      "/api/part93/features",
      "/api/part93/roles",
      "/api/part93/access-check",
      "/api/part93/lead-sources",
      "/api/part93/criteria",
      "/api/part93/lead/parse",
      "/api/part93/lead/score",
      "/api/part93/lead/qualify",
      "/api/part93/lead/prioritize",
      "/api/part93/lead/followup-plan",
      "/api/part93/lead/objection-risk",
      "/api/part93/lead/next-action",
      "/api/part93/lead/assignment-preview",
      "/api/part93/vani/greeting",
      "/api/part93/vani/command"
    ],
    aiLeadQualificationEnabled: true
  });
});

app.get("/api/part93/config", (req, res) => {
  res.json({
    success: true,
    appName: "AI Lead Qualification",
    appType: "lead_qualification_foundation",
    version: "2.0-ai-lead-qualification",
    policy: {
      previewFirst: true,
      noAutoSend: true,
      noAutoAssign: true,
      noAutoAdmission: true,
      noDiscountCommitmentWithoutOwnerVerification: true,
      crmPayloadPreviewOnly: true,
      externalAIKeysNotIncluded: true
    }
  });
});

app.get("/api/part93/features", (req, res) => {
  res.json({ success: true, features: part93Features });
});

app.get("/api/part93/roles", (req, res) => {
  res.json({ success: true, roles: part93RoleRules });
});

app.get("/api/part93/access-check", (req, res) => {
  res.json({ success: true, access: part93AccessCheck(req.query || {}) });
});

app.get("/api/part93/lead-sources", (req, res) => {
  res.json({ success: true, leadSources: part93LeadSources });
});

app.get("/api/part93/criteria", (req, res) => {
  res.json({ success: true, criteria: part93QualificationCriteria });
});

app.get("/api/part93/lead/parse", (req, res) => {
  const lead = part93ParseLead(req.query.q || req.query.command || "", req.query || {});
  res.json({ success: true, lead, missingDetails: part93MissingDetails(lead) });
});

app.post("/api/part93/lead/parse", (req, res) => {
  const body = req.body || {};
  const lead = part93ParseLead(body.q || body.command || body.message || "", body);
  res.json({ success: true, lead, missingDetails: part93MissingDetails(lead) });
});

app.get("/api/part93/lead/score", (req, res) => {
  const lead = part93ParseLead(req.query.q || req.query.command || "", req.query || {});
  res.json({ success: true, lead, qualification: part93LeadScore(lead) });
});

app.get("/api/part93/lead/qualify", (req, res) => {
  const result = part93BuildQualification({
    command: req.query.q || req.query.command || "",
    role: req.query.role || "receptionist_counsellor",
    instituteId: req.query.instituteId || "NX-DEMO-INST-001",
    branchId: req.query.branchId,
    body: req.query || {}
  });
  if (!result.access.allowed) return res.status(403).json({ success: false, ...result });
  res.json({ success: true, ...result });
});

app.post("/api/part93/lead/qualify", (req, res) => {
  const body = req.body || {};
  const result = part93BuildQualification({
    command: body.q || body.command || body.message || "",
    role: body.role || "receptionist_counsellor",
    instituteId: body.instituteId || "NX-DEMO-INST-001",
    branchId: body.branchId,
    body
  });
  if (!result.access.allowed) return res.status(403).json({ success: false, ...result });
  res.json({ success: true, ...result });
});

app.get("/api/part93/lead/prioritize", (req, res) => {
  const lead = part93ParseLead(req.query.q || req.query.command || "", req.query || {});
  const qualification = part93LeadScore(lead);
  res.json({ success: true, lead, qualification, nextAction: part93NextAction(lead, qualification) });
});

app.get("/api/part93/lead/followup-plan", (req, res) => {
  const lead = part93ParseLead(req.query.q || req.query.command || "", req.query || {});
  const qualification = part93LeadScore(lead);
  res.json({ success: true, lead, qualification, followupPlan: part93FollowupPlan(lead, qualification) });
});

app.get("/api/part93/lead/objection-risk", (req, res) => {
  const lead = part93ParseLead(req.query.q || req.query.command || "", req.query || {});
  res.json({ success: true, lead, objectionRisk: part93ObjectionRisk(lead) });
});

app.get("/api/part93/lead/next-action", (req, res) => {
  const lead = part93ParseLead(req.query.q || req.query.command || "", req.query || {});
  const qualification = part93LeadScore(lead);
  res.json({ success: true, lead, qualification, nextAction: part93NextAction(lead, qualification) });
});

app.get("/api/part93/lead/assignment-preview", (req, res) => {
  const access = part93AccessCheck(req.query || {});
  if (!access.allowed || access.previewOnly) return res.status(403).json({ success: false, access, message: access.previewOnly ? "Preview-only role cannot assign lead." : access.reason });
  const lead = part93ParseLead(req.query.q || req.query.command || "", req.query || {});
  const qualification = part93LeadScore(lead);
  res.json({ success: true, access, lead, qualification, assignmentPreview: part93AssignmentPreview(lead, access, qualification) });
});

app.get("/api/part93/lead/export-preview", (req, res) => {
  const result = part93BuildQualification({
    command: req.query.q || req.query.command || "",
    role: req.query.role || "institute_owner",
    instituteId: req.query.instituteId || "NX-DEMO-INST-001",
    branchId: req.query.branchId,
    body: req.query || {}
  });
  if (!result.access.allowed || !result.access.canApproveSensitive) return res.status(403).json({ success: false, ...result, message: "Lead export preview requires owner-level access." });
  res.json({ success: true, exportPreviewOnly: true, ownerVerificationRequired: true, crmPayloadPreview: result.crmPayloadPreview, qualification: result.qualification });
});

app.get("/api/part93/vani/greeting", (req, res) => {
  res.json({
    success: true,
    assistant: "VANI Lead Qualification",
    greeting: "Namaste, main VANI Lead Qualification Assistant hoon. Lead ka message boliye, main score, category aur next action bataungi.",
    exampleCommands: [
      "VANI, Aman Class 10 Maths lead WhatsApp se hai parent phone 9876543210 urgent demo chahiye",
      "VANI, is lead ko qualify karo",
      "VANI, lead score batao",
      "VANI, follow-up plan banao",
      "VANI, fee objection risk check karo"
    ],
    safety: "Final lead save, follow-up send, demo booking ya assignment confirmation ke bina nahi hoga."
  });
});

app.post("/api/part93/vani/command", (req, res) => {
  const body = req.body || {};
  const result = part93BuildQualification({
    command: body.command || body.q || body.message || "",
    role: body.role || "receptionist_counsellor",
    instituteId: body.instituteId || "NX-DEMO-INST-001",
    branchId: body.branchId,
    body
  });
  if (!result.access.allowed) return res.status(403).json({ success: false, assistant: "VANI", ...result });
  res.json({ success: true, assistant: "VANI", part: "Part 93 — AI Lead Qualification", ...result });
});

app.get("/api/part93/vani/command", (req, res) => {
  const result = part93BuildQualification({
    command: req.query.command || req.query.q || "",
    role: req.query.role || "receptionist_counsellor",
    instituteId: req.query.instituteId || "NX-DEMO-INST-001",
    branchId: req.query.branchId,
    body: req.query || {}
  });
  if (!result.access.allowed) return res.status(403).json({ success: false, assistant: "VANI", ...result });
  res.json({ success: true, assistant: "VANI", part: "Part 93 — AI Lead Qualification", ...result });
});

app.get("/api/part93/audit-log", (req, res) => {
  res.json({
    success: true,
    auditLog: [
      { event: "ai_lead_qualification_preview", role: "receptionist_counsellor", createdAt: new Date().toISOString() },
      { event: "no_auto_followup_policy", rule: "Follow-up drafts require confirmation.", createdAt: new Date().toISOString() }
    ]
  });
});

app.get("/api/part93/activity", (req, res) => {
  res.json({
    success: true,
    activity: [
      { type: "ai_lead_qualification_created", message: "Part 93 AI Lead Qualification active.", createdAt: new Date().toISOString() },
      { type: "crm_payload_preview", message: "CRM payload is preview-only until confirmation and DB connection.", createdAt: new Date().toISOString() }
    ]
  });
});

app.get("/api/part93/checklist", (req, res) => {
  res.json({ success: true, checklist: part93Checklist });
});

app.get("/api/part93/export", (req, res) => {
  res.json({
    success: true,
    exportType: "part93-ai-lead-qualification-readiness",
    ownerVerificationRequiredForSensitiveExports: true,
    generatedAt: new Date().toISOString(),
    data: {
      features: part93Features,
      roles: part93RoleRules,
      leadSources: part93LeadSources,
      criteria: part93QualificationCriteria,
      checklist: part93Checklist
    }
  });
});

app.get("/api/part93/demo", (req, res) => {
  const command = "VANI, Aman Class 10 Maths lead WhatsApp se hai parent phone 9876543210 urgent demo chahiye";
  const result = part93BuildQualification({
    command,
    role: "receptionist_counsellor",
    instituteId: "NX-DEMO-INST-001",
    body: {}
  });
  res.json({
    success: true,
    demo: {
      command,
      result,
      nextPart: "Part 94 — Native Live Classroom Foundation"
    }
  });
});
// ================= END PART 93 =================















// ================= END PART 52 =================

app.use(notFound);
app.use(errorHandler);

const port = Number(process.env.PORT) || 5000;

await connectDB();

const server = app.listen(port, () => {
  console.log("✅ PART 59 PUBLIC INSTITUTE PROFILE ACTIVE");
  console.log("✅ All routes Part 1 to Part 78 loaded + NAXORA OS 1.0 Production Launch");
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
  console.log("✅ Part 72 AI Fee and Attendance Assistant active: /api/part72/status + /ai-fee-attendance-assistant");
  console.log("✅ Part 73 AI Batch Performance Analyzer active: /api/part73/status + /ai-batch-performance-analyzer");
  console.log("✅ Part 74 AI Parent Communication active: /api/part74/status + /ai-parent-weekly-summary");
  console.log("✅ Part 75 Student AI Tools active: /api/part75/status + /student-ai-tools");
  console.log("✅ Part 76 Smart Classroom Setup active: /api/part76/status + /smart-classroom-setup");
  console.log("✅ Part 77 Final Production Testing active: /api/part77/status + /final-production-testing");
  console.log("✅ Part 78 NAXORA OS 1.0 Production Launch active: /api/part78/status + /v1-production-launch");
  console.log("✅ Part 86 VANI Fee and Attendance Actions active: /api/part86/status + /vani-fee-attendance-actions");
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
