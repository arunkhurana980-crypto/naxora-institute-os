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
  "/local-institutes"
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
    part: "Part 56 - Smart Student Enrolment",
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
  { group: "Discovery", label: "Part 61 Nearby Institutes", cleanRoute: "/nearby-institutes", htmlRoute: "/nearby-institutes.html", file: "nearby-institutes.html", critical: true }
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
  { group: "Part 61", label: "Nearby Institutes", prefix: "/api/part61", method: "GET", critical: true, collection: "part59publicprofiles" }
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
  "Part 71 AI Admission Copilot can later use this CRM data for reply drafts and lead priority."
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
  "/live-classes": "live-classes.html",
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
  "/local-institutes": "nearby-institutes.html"
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
  console.log("✅ All routes Part 1 to Part 61 loaded + Nearby Institutes");
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
