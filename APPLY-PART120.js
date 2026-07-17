import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(root, "backend", "src", "server.js");
const shellBackendPath = path.join(root, "backend", "src", "part119-unified-app-shell.js");
const shellHtmlPath = path.join(root, "frontend", "naxora-unified-app.html");
const requiredModules = [
  ["backend/src/part112-razorpay-foundation.js", "Part 112"],
  ["backend/src/part113-subscription-plans.js", "Part 113"],
  ["backend/src/part114-customer-checkout-subscription.js", "Part 114"],
  ["backend/src/part115-razorpay-webhooks.js", "Part 115"],
  ["backend/src/part116-subscription-access-control.js", "Part 116"],
  ["backend/src/part117-vani-subscription-manager.js", "Part 117"],
  ["backend/src/part118-razorpay-live-readiness.js", "Part 118"],
  ["backend/src/part119-unified-app-shell.js", "Part 119"],
  ["backend/src/part120-common-login.js", "Part 120"],
];
const previousMarkers = [
  "PART 112 — RAZORPAY TEST MODE FOUNDATION",
  "PART 113 — NAXORA SUBSCRIPTION PLANS",
  "PART 114 — CUSTOMER CHECKOUT AND SUBSCRIPTION ACTIVATION",
  "PART 115 — SECURE RAZORPAY WEBHOOKS AND STATUS SYNC",
  "PART 116 — SUBSCRIPTION FEATURE ACCESS CONTROL",
  "PART 117 — VANI SUBSCRIPTION MANAGER",
  "PART 118 — RAZORPAY LIVE READINESS AND CONTROLLED LAUNCH",
  "PART 119 — UNIFIED SINGLE APP SHELL",
];
const marker = "// ================= PART 120 — COMMON LOGIN JWT AND ROLE ROUTING =================";
const block = `${marker}\nconst { registerPart120CommonLogin } = await import("./part120-common-login.js");\nregisterPart120CommonLogin({ app });`;

function fail(message) {
  console.error(`\nPART 120 APPLY FAILED: ${message}\n`);
  process.exit(1);
}
function syntaxCheck(file) {
  return spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
}
function find404(source) {
  let index = source.indexOf("app.use(notFound);");
  if (index < 0) index = source.indexOf("app.use(notFound)");
  if (index < 0) {
    const codeIndex = Math.max(source.indexOf('"ROUTE_NOT_FOUND"'), source.indexOf("'ROUTE_NOT_FOUND'"));
    index = codeIndex >= 0 ? source.lastIndexOf("app.use(", codeIndex) : -1;
  }
  return index;
}

if (!fs.existsSync(serverPath)) fail("backend/src/server.js missing.");
for (const [rel, label] of requiredModules) {
  if (!fs.existsSync(path.join(root, rel))) fail(`${label} backend module missing: ${rel}`);
}
if (!fs.existsSync(shellHtmlPath)) fail("Part 119 unified app HTML missing.");

const originals = {
  server: fs.readFileSync(serverPath, "utf8"),
  shellBackend: fs.readFileSync(shellBackendPath, "utf8"),
  shellHtml: fs.readFileSync(shellHtmlPath, "utf8"),
};
const precheck = syntaxCheck(serverPath);
if (precheck.status !== 0) {
  fail(`Existing server.js syntax broken hai. Installer ne koi change nahi kiya.\n${precheck.stderr || precheck.stdout}`);
}

let server = originals.server;
const part112Anchor = server.indexOf("// ================= PART 112 — RAZORPAY TEST MODE FOUNDATION =================");
if (part112Anchor < 0) fail("Part 112 registration anchor not found.");
const p404 = find404(server);
if (p404 < 0) fail("Express 404/notFound handler anchor not found.");
for (const previousMarker of previousMarkers) {
  const pos = server.indexOf(previousMarker);
  if (pos < 0) fail(`${previousMarker} registration missing.`);
  if (pos > p404) fail(`${previousMarker} abhi 404 handler ke baad hai.`);
}

const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const oldBlock = new RegExp(`\\n*${escaped}\\nconst \\{ registerPart120CommonLogin \\} = await import\\("\\.\\/part120-common-login\\.js"\\);\\nregisterPart120CommonLogin\\(\\{ app \\}\\);\\n*`, "g");
server = server.replace(oldBlock, "\n\n");
const insertion = server.indexOf("// ================= PART 112 — RAZORPAY TEST MODE FOUNDATION =================");
server = `${server.slice(0, insertion)}${block}\n\n${server.slice(insertion)}`;

let shellBackend = originals.shellBackend
  .replace("commonLoginIntegrated: false,", "commonLoginIntegrated: true,")
  .replace("commonLoginTargetPart: 120,", "commonLoginTargetPart: null,")
  .replace("commonLoginPendingPart120: true,", "commonLoginPendingPart120: false,")
  .replace("commonLoginReady: false,", "commonLoginReady: true,");

let shellHtml = originals.shellHtml;
if (!shellHtml.includes('/naxora-common-session.js')) {
  shellHtml = shellHtml.replace(
    '<script src="/naxora-unified-app.js"></script>',
    '<script src="/naxora-common-session.js"></script>\n  <script src="/naxora-unified-app.js"></script>'
  );
}
shellHtml = shellHtml
  .replace("Common login Part 120 me isi screen ke saath connect hoga.", "Common login active hai; sign in ke baad role-safe modules automatically load honge.")
  .replace("Connect Existing Login", "Account Session");

fs.writeFileSync(serverPath, server, "utf8");
fs.writeFileSync(shellBackendPath, shellBackend, "utf8");
fs.writeFileSync(shellHtmlPath, shellHtml, "utf8");

const checks = [
  [serverPath, originals.server],
  [shellBackendPath, originals.shellBackend],
];
for (const [file, original] of checks) {
  const check = syntaxCheck(file);
  if (check.status !== 0) {
    fs.writeFileSync(serverPath, originals.server, "utf8");
    fs.writeFileSync(shellBackendPath, originals.shellBackend, "utf8");
    fs.writeFileSync(shellHtmlPath, originals.shellHtml, "utf8");
    fail(`Syntax check failed. Original Part 119 files restored.\n${check.stderr || check.stdout}`);
  }
}

const finalServer = fs.readFileSync(serverPath, "utf8");
const p120 = finalServer.indexOf(marker);
const p112 = finalServer.indexOf("PART 112 — RAZORPAY TEST MODE FOUNDATION");
const final404 = find404(finalServer);
if (!(p120 >= 0 && p112 >= 0 && p120 < p112 && p112 < final404)) {
  fs.writeFileSync(serverPath, originals.server, "utf8");
  fs.writeFileSync(shellBackendPath, originals.shellBackend, "utf8");
  fs.writeFileSync(shellHtmlPath, originals.shellHtml, "utf8");
  fail("Part 120 security-middleware route order verification failed. Original files restored.");
}

console.log("\nPART 120 APPLIED SUCCESSFULLY");
console.log("Part 120 registered before Part 112–119 routes: PASS");
console.log("Part 119 common-login integration updated: PASS");
console.log("server.js syntax: PASS");
console.log("Next: node .\\VERIFY-PART120.js\n");
