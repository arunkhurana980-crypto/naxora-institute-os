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
  ["backend/src/part121-owner-consolidation.js", "Part 121"],
  ["backend/src/part122-teacher-consolidation.js", "Part 122"],
  ["backend/src/part123-student-consolidation.js", "Part 123"],
  ["backend/src/part124-role-consolidation.js", "Part 124"],
  ["backend/src/part125-global-vani-actions.js", "Part 125"],
  ["backend/src/part126-native-e2e-integration.js", "Part 126"],
];

const marker = "// ================= PART 126 — NATIVE ADAPTERS AND CROSS MODULE E2E =================";
const block = `${marker}
const { registerPart126NativeE2E } = await import("./part126-native-e2e-integration.js");
registerPart126NativeE2E({ app });`;

const moduleStart = "  // PART 126 INTEGRATION CENTRE MODULE START";
const moduleEnd = "  // PART 126 INTEGRATION CENTRE MODULE END";
const moduleBlock = `${moduleStart}
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
${moduleEnd}`;

const aliasStart = "  // PART 126 INTEGRATION CENTRE ALIASES START";
const aliasEnd = "  // PART 126 INTEGRATION CENTRE ALIASES END";
const aliasBlock = `${aliasStart}
  "integration centre": "integration-centre",
  integrations: "integration-centre",
  notifications: "integration-centre",
  "native adapters": "integration-centre",
  "e2e health": "integration-centre",
${aliasEnd}`;

function fail(message) {
  console.error(`\nPART 126 APPLY FAILED: ${message}\n`);
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
function registrationEnd(source, call) {
  const index = source.indexOf(call);
  return index < 0 ? -1 : index + call.length;
}
function removeBetween(source, start, end) {
  const escapedStart = start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedEnd = end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.replace(new RegExp(`\\s*${escapedStart}[\\s\\S]*?${escapedEnd}\\s*`, "g"), "\n");
}

for (const [rel, label] of requiredModules) {
  if (!fs.existsSync(path.join(root, rel))) fail(`${label} backend module missing: ${rel}`);
}
for (const file of [serverPath, shellBackendPath, shellHtmlPath]) {
  if (!fs.existsSync(file)) fail(`${path.relative(root, file)} missing.`);
}

const originals = {
  server: fs.readFileSync(serverPath, "utf8"),
  shell: fs.readFileSync(shellBackendPath, "utf8"),
  html: fs.readFileSync(shellHtmlPath, "utf8"),
};

for (const file of [serverPath, shellBackendPath]) {
  const check = syntaxCheck(file);
  if (check.status !== 0) {
    fail(`Existing ${path.relative(root, file)} syntax broken hai. Installer ne koi change nahi kiya.\n${check.stderr || check.stdout}`);
  }
}

let server = originals.server;
const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
server = server.replace(
  new RegExp(`\\n*${escapedMarker}\\nconst \\{ registerPart126NativeE2E \\} = await import\\("\\.\\/part126-native-e2e-integration\\.js"\\);\\nregisterPart126NativeE2E\\(\\{ app \\}\\);\\n*`, "g"),
  "\n\n"
);
const part125End = registrationEnd(server, "registerPart125GlobalVaniActions({ app });");
if (part125End < 0) fail("Part 125 registration block not found.");
server = `${server.slice(0, part125End)}\n\n${block}${server.slice(part125End)}`;

let shell = removeBetween(originals.shell, moduleStart, moduleEnd);
shell = removeBetween(shell, aliasStart, aliasEnd);
const moduleAnchor = "  // PART 125 GLOBAL VANI ACTION MODULE END";
const aliasAnchor = "  // PART 125 GLOBAL VANI ACTION ALIASES END";
if (!shell.includes(moduleAnchor)) fail("Part 125 module marker not found in Part 119 shell.");
if (!shell.includes(aliasAnchor)) fail("Part 125 alias marker not found in Part 119 shell.");
shell = shell.replace(moduleAnchor, `${moduleAnchor}\n${moduleBlock}`);
shell = shell.replace(aliasAnchor, `${aliasAnchor}\n${aliasBlock}`);

let html = originals.html;
if (!html.includes("<strong>126</strong><span>Native E2E</span>")) {
  html = html.replace(
    '<article><strong>125</strong><span>Global VANI actions</span></article>',
    '<article><strong>125</strong><span>Global VANI actions</span></article>\n            <article><strong>126</strong><span>Native E2E</span></article>'
  );
}
html = html
  .replace(
    "Part 125 preview, exact confirmation aur canonical execution active hai. Native module/provider delivery Part 126 adapters se complete hogi.",
    "Part 126 native adapters, in-app notifications aur provider-aware delivery active hai. Final production acceptance Part 127 me hogi."
  )
  .replace(
    "Part 125 action + navigation mode",
    "Part 126 native action + navigation mode"
  );

fs.writeFileSync(serverPath, server, "utf8");
fs.writeFileSync(shellBackendPath, shell, "utf8");
fs.writeFileSync(shellHtmlPath, html, "utf8");

for (const file of [serverPath, shellBackendPath]) {
  const check = syntaxCheck(file);
  if (check.status !== 0) {
    fs.writeFileSync(serverPath, originals.server, "utf8");
    fs.writeFileSync(shellBackendPath, originals.shell, "utf8");
    fs.writeFileSync(shellHtmlPath, originals.html, "utf8");
    fail(`Part 126 syntax check failed. Original files restored.\n${check.stderr || check.stdout}`);
  }
}

const finalServer = fs.readFileSync(serverPath, "utf8");
const p125 = finalServer.indexOf("PART 125 — GLOBAL VANI MULTI STEP ACTIONS");
const p126 = finalServer.indexOf("PART 126 — NATIVE ADAPTERS AND CROSS MODULE E2E");
const p112 = finalServer.indexOf("PART 112 — RAZORPAY TEST MODE FOUNDATION");
const p404 = find404(finalServer);
const finalShell = fs.readFileSync(shellBackendPath, "utf8");
const finalHtml = fs.readFileSync(shellHtmlPath, "utf8");

if (!(
  p125 >= 0 &&
  p126 > p125 &&
  p112 > p126 &&
  p404 > p112 &&
  finalShell.includes('key: "integration-centre"') &&
  finalShell.includes('"native adapters": "integration-centre"') &&
  finalHtml.includes("<strong>126</strong><span>Native E2E</span>")
)) {
  fs.writeFileSync(serverPath, originals.server, "utf8");
  fs.writeFileSync(shellBackendPath, originals.shell, "utf8");
  fs.writeFileSync(shellHtmlPath, originals.html, "utf8");
  fail("Part 126 integration verification failed. Original files restored.");
}

console.log("\nPART 126 APPLIED SUCCESSFULLY");
console.log("Part 126 registered after Part 125: PASS");
console.log("Part 126 registered before Parts 112–119 routes: PASS");
console.log("Part 119 Integration & Notifications module added: PASS");
console.log("Part 119 integration aliases added: PASS");
console.log("Unified app Part 126 progress updated: PASS");
console.log("server.js syntax: PASS");
console.log("Next: node .\\VERIFY-PART126.js\n");
