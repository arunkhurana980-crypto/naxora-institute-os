import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(root, "backend/src/server.js");

const requiredFiles = [
  "backend/src/part1364-simple-owner-access.js",
  "frontend/naxora-owner-access.html",
  "frontend/naxora-owner-access.css",
  "frontend/naxora-owner-access.js",
  "frontend/naxora-part1365-owner-session-bridge.js",
  "frontend/naxora-unified-app.html",
  "frontend/naxora-unified-app.js",
  "backend/src/part119-unified-app-shell.js",
  "backend/src/part136-final-all-role-vani-acceptance.js",
];

let failed = false;

function pass(ok, label) {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
  if (!ok) failed = true;
}

for (const rel of requiredFiles) {
  pass(fs.existsSync(path.join(root, rel)), `${rel} exists`);
}

if (!fs.existsSync(serverPath)) {
  pass(false, "backend/src/server.js exists");
  process.exit(1);
}

for (const rel of [
  "backend/src/server.js",
  "backend/src/part1364-simple-owner-access.js",
  "frontend/naxora-owner-access.js",
  "frontend/naxora-part1365-owner-session-bridge.js",
  "frontend/naxora-unified-app.js",
  "backend/src/part119-unified-app-shell.js",
  "backend/src/part136-final-all-role-vani-acceptance.js",
]) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) continue;
  const result = spawnSync(process.execPath, ["--check", file], {
    encoding: "utf8",
  });
  pass(result.status === 0, `${rel} syntax`);
  if (result.status !== 0) console.error(result.stderr || result.stdout);
}

const server = fs.readFileSync(serverPath, "utf8");
const ownerBackend = fs.readFileSync(
  path.join(root, "backend/src/part1364-simple-owner-access.js"),
  "utf8"
);
const ownerHtml = fs.readFileSync(
  path.join(root, "frontend/naxora-owner-access.html"),
  "utf8"
);
const ownerJs = fs.readFileSync(
  path.join(root, "frontend/naxora-owner-access.js"),
  "utf8"
);
const appHtml = fs.readFileSync(
  path.join(root, "frontend/naxora-unified-app.html"),
  "utf8"
);
const part119 = fs.readFileSync(
  path.join(root, "backend/src/part119-unified-app-shell.js"),
  "utf8"
);

const appInitCandidates = [
  server.indexOf("const app = express();"),
  server.indexOf("const app=express();"),
  server.indexOf("let app = express();"),
  server.indexOf("var app = express();"),
].filter(value => value >= 0);

const appInit = appInitCandidates.length ? Math.min(...appInitCandidates) : -1;
const earlyRoute = server.indexOf("PART 136.5 OWNER APP EARLY ROUTE START");
const oldLogin = server.indexOf('app.get("/login", (req, res) => sendFileSafe');

const checks = [
  [server.includes("PART 136.4 — SIMPLE OWNER SIGNUP AND LOGIN"),
    "Part 136.4 registered"],
  [server.includes("registerPart1364SimpleOwnerAccess({ app });"),
    "Simple Owner backend loaded"],
  [ownerBackend.includes("ownerLoginNeedsInstituteId: false"),
    "Owner login does not require Institute ID"],
  [ownerBackend.includes("/api/part1364/owner/signup"),
    "Create Institute API exists"],
  [ownerBackend.includes("/api/part1364/owner/login"),
    "Owner login API exists"],
  [ownerBackend.includes("instituteIdGeneratedAutomatically: true"),
    "Institute ID auto-generation exists"],
  [ownerBackend.includes('role: "institute_owner"'),
    "Owner role JWT/session exists"],
  [ownerHtml.includes("Owner Sign In"),
    "Separate Owner Sign In UI exists"],
  [ownerHtml.includes("Create Institute Account"),
    "Separate Create Institute UI exists"],
  [ownerJs.includes("/api/part1364/owner/login"),
    "Owner login UI connected"],
  [ownerJs.includes("/api/part1364/owner/signup"),
    "Owner signup UI connected"],
  [appInit >= 0 && earlyRoute > appInit,
    "Early /app route registered after Express app init"],
  [oldLogin < 0 || earlyRoute < oldLogin,
    "Early /app route precedes old public login routes"],
  [server.includes('app.get(["/app", "/app/"]'),
    "/app and /app/ both fixed"],
  [server.includes("naxora-unified-app.html"),
    "Real unified shell served at /app"],
  [server.includes("/api/part1365/status"),
    "Part 136.5 status API exists"],
  [appHtml.includes("naxora-part1365-owner-session-bridge.js?v=1365"),
    "Owner session bridge loaded before shell"],
  [appHtml.includes("naxora-unified-app.js?v=1365"),
    "Unified app cache-busting active"],
  [part119.includes('key: "owner-dashboard"'),
    "Owner Workspace module exists"],
  [part119.includes('key: "vani-actions"'),
    "Global VANI Actions module exists"],
  [part119.includes('key: "master-data-vani"'),
    "VANI Master Data module exists"],
  [part119.includes('key: "bulk-import-vani"'),
    "VANI Bulk Import module exists"],
  [part119.includes('key: "academic-vani"'),
    "VANI Academic module exists"],
  [part119.includes('key: "finance-vani"'),
    "VANI Finance module exists"],
  [part119.includes('key: "crm-vani"'),
    "VANI CRM module exists"],
  [part119.includes('key: "communication-vani"'),
    "VANI Communication module exists"],
  [part119.includes('key: "reports-vani"'),
    "VANI Reports module exists"],
  [part119.includes('key: "workflow-vani"'),
    "VANI Workflow module exists"],
  [part119.includes('key: "vani-acceptance"'),
    "VANI Final Acceptance module exists"],
];

for (const [ok, label] of checks) pass(ok, label);

console.log("\nFINAL RUNTIME URLs");
console.log("/owner-login");
console.log("/create-institute");
console.log("/app");
console.log("/api/part1364/status");
console.log("/api/part1365/status");
console.log("/vani-acceptance");

process.exit(failed ? 1 : 0);
