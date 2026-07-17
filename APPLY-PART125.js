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
];

const marker = "// ================= PART 125 — GLOBAL VANI MULTI STEP ACTIONS =================";
const block = `${marker}\nconst { registerPart125GlobalVaniActions } = await import("./part125-global-vani-actions.js");\nregisterPart125GlobalVaniActions({ app });`;

const moduleStart = "  // PART 125 GLOBAL VANI ACTION MODULE START";
const moduleEnd = "  // PART 125 GLOBAL VANI ACTION MODULE END";
const aliasStart = "  // PART 125 GLOBAL VANI ACTION ALIASES START";
const aliasEnd = "  // PART 125 GLOBAL VANI ACTION ALIASES END";
const moduleBlock = `${moduleStart}
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
${moduleEnd}
`;
const aliasBlock = `${aliasStart}
  "vani actions": "vani-actions",
  "global vani": "vani-actions",
  "attendance mark": "vani-actions",
  "fee reminder": "vani-actions",
  "admission follow up": "vani-actions",
  "assignment create": "vani-actions",
  "assignment submit": "vani-actions",
  "message send": "vani-actions",
  "branch task": "vani-actions",
${aliasEnd}
`;

function fail(message) {
  console.error(`\nPART 125 APPLY FAILED: ${message}\n`);
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
function registrationEnd(source, functionCall) {
  const index = source.indexOf(functionCall);
  return index < 0 ? -1 : index + functionCall.length;
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
  new RegExp(`\\n*${escapedMarker}\\nconst \\{ registerPart125GlobalVaniActions \\} = await import\\("\\.\\/part125-global-vani-actions\\.js"\\);\\nregisterPart125GlobalVaniActions\\(\\{ app \\}\\);\\n*`, "g"),
  "\n\n"
);
const part124End = registrationEnd(server, "registerPart124RoleConsolidation({ app });");
if (part124End < 0) fail("Part 124 registration block not found. Corrected Part 124 v2 apply/verify first.");
server = `${server.slice(0, part124End)}\n\n${block}${server.slice(part124End)}`;

let shell = removeBetween(originals.shell, moduleStart, moduleEnd);
shell = removeBetween(shell, aliasStart, aliasEnd);

const aliasAnchor = shell.indexOf("const COMMAND_ALIASES = Object.freeze({");
if (aliasAnchor < 0) fail("Part 119 COMMAND_ALIASES anchor not found.");
const moduleArrayEnd = shell.lastIndexOf("]);", aliasAnchor);
if (moduleArrayEnd < 0) fail("Part 119 MODULES array end not found.");
shell = `${shell.slice(0, moduleArrayEnd)}${moduleBlock}${shell.slice(moduleArrayEnd)}`;

const aliasObjectEnd = shell.indexOf("});", aliasAnchor);
if (aliasObjectEnd < 0) fail("Part 119 COMMAND_ALIASES object end not found.");
shell = `${shell.slice(0, aliasObjectEnd)}${aliasBlock}${shell.slice(aliasObjectEnd)}`;

let html = originals.html.replace(
  /\s*<script src="\/naxora-part125-global-vani-bridge\.js"><\/script>\s*/g,
  "\n  "
);
const unifiedScript = '<script src="/naxora-unified-app.js"></script>';
if (!html.includes(unifiedScript)) fail("Unified app script anchor not found.");
html = html.replace(
  unifiedScript,
  `${unifiedScript}\n  <script src="/naxora-part125-global-vani-bridge.js"></script>`
);
html = html
  .replace("Part 119 navigation mode", "Part 125 action + navigation mode")
  .replace(
    "Namaste. Module ka naam bolkar “kholo” kahiye, jaise “VANI, fees kholo”.",
    "Namaste. Module kholne ke saath attendance, fee reminder, admission follow-up, assignment aur message actions ka preview bhi bana sakti hoon."
  )
  .replace(
    "Current boundary:</strong> Part 119 VANI modules search/open karegi. Admission, fees, attendance, CRM aur other multi-step work Part 125 me global orchestration ke saath connect hoga.",
    "Current boundary:</strong> Part 125 preview, exact confirmation aur canonical execution active hai. Native module/provider delivery Part 126 adapters se complete hogi."
  );

fs.writeFileSync(serverPath, server, "utf8");
fs.writeFileSync(shellBackendPath, shell, "utf8");
fs.writeFileSync(shellHtmlPath, html, "utf8");

for (const file of [
  serverPath,
  shellBackendPath,
  path.join(root, "backend/src/part125-global-vani-actions.js"),
  path.join(root, "frontend/naxora-vani-actions.js"),
  path.join(root, "frontend/naxora-part125-global-vani-bridge.js"),
]) {
  const check = syntaxCheck(file);
  if (check.status !== 0) {
    fs.writeFileSync(serverPath, originals.server, "utf8");
    fs.writeFileSync(shellBackendPath, originals.shell, "utf8");
    fs.writeFileSync(shellHtmlPath, originals.html, "utf8");
    fail(`Part 125 syntax check failed. Original files restored.\n${check.stderr || check.stdout}`);
  }
}

const finalServer = fs.readFileSync(serverPath, "utf8");
const p124 = finalServer.indexOf("PART 124 — PARENT STAFF AND BRANCH ROLE CONSOLIDATION");
const p125 = finalServer.indexOf("PART 125 — GLOBAL VANI MULTI STEP ACTIONS");
const p112 = finalServer.indexOf("PART 112 — RAZORPAY TEST MODE FOUNDATION");
const p404 = find404(finalServer);
const finalShell = fs.readFileSync(shellBackendPath, "utf8");
const finalHtml = fs.readFileSync(shellHtmlPath, "utf8");
const shellOk =
  finalShell.includes('key: "vani-actions"') &&
  finalShell.includes('route: "/vani-actions"') &&
  finalShell.includes('"attendance mark": "vani-actions"') &&
  finalHtml.includes('/naxora-part125-global-vani-bridge.js');

if (!(p124 >= 0 && p125 > p124 && p112 > p125 && p404 > p112 && shellOk)) {
  fs.writeFileSync(serverPath, originals.server, "utf8");
  fs.writeFileSync(shellBackendPath, originals.shell, "utf8");
  fs.writeFileSync(shellHtmlPath, originals.html, "utf8");
  fail("Part 125 integration verification failed. Original files restored.");
}

console.log("\nPART 125 APPLIED SUCCESSFULLY");
console.log("Part 125 registered after Part 124: PASS");
console.log("Part 125 registered before Parts 112–119 routes: PASS");
console.log("Part 119 Global VANI Actions module added: PASS");
console.log("Part 119 Global VANI bridge added: PASS");
console.log("server.js syntax: PASS");
console.log("Next: node .\\VERIFY-PART125.js\n");
