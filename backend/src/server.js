import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
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
  "/admin"
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

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    app: "NAXORA Institute OS",
    status: "running",
    dbMode: globalThis.NAXORA_DB_MODE || "starting",
    note: globalThis.NAXORA_DB_MODE === "mock" ? "MongoDB connect nahi hai, par backend crash-free mock mode me chal raha hai." : "MongoDB connected mode.",
    part: "Part 51 Integrated - Final Secure Route Cleanup + UI Asset Fix",
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
const modulePageRoutes = {
  "/progress": "progress.html",
  "/teachers": "teachers.html",
  "/staff": "staff.html",
  "/batches": "batches.html",
  "/online-batches": "online-batches.html",
  "/attendance": "attendance.html",
  "/fees": "fees.html",
  "/finance": "finance.html",
  "/doubts": "doubts.html",
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
  "/super-admin": "super-admin.html",
  "/admin-analytics": "admin-analytics.html"
};

for (const [route, fileName] of Object.entries(modulePageRoutes)) {
  app.get(route, (req, res) => sendFileSafe(res, fileName));
  app.get(`${route}.html`, (req, res) => res.redirect(302, route));
}

app.get("/api/part52/status", (req, res) => {
  res.json({
    success: true,
    part: "Part 52 - Live Clean Route Fix",
    status: "active"
  });
});

app.use(notFound);
app.use(errorHandler);

const port = Number(process.env.PORT) || 5000;

await connectDB();

const server = app.listen(port, () => {
  console.log("✅ PART 51 FINAL SECURE ROUTE CLEANUP + UI ASSET FIX ACTIVE");
  console.log("✅ All routes Part 1 to Part 50 loaded + Part 51 public/private route cleanup");
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
