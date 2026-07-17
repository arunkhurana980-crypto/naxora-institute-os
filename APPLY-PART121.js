import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(root, "backend", "src", "server.js");
const shellBackendPath = path.join(root, "backend", "src", "part119-unified-app-shell.js");
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
];
const marker = "// ================= PART 121 — OWNER MODULE CONSOLIDATION =================";
const block = `${marker}\nconst { registerPart121OwnerConsolidation } = await import("./part121-owner-consolidation.js");\nregisterPart121OwnerConsolidation({ app });`;

function fail(message) {
  console.error(`\nPART 121 APPLY FAILED: ${message}\n`);
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
function findPartBlockEnd(source, partMarker) {
  const markerIndex = source.indexOf(partMarker);
  if (markerIndex < 0) return -1;
  const registrationEnd = source.indexOf("registerPart120CommonLogin({ app });", markerIndex);
  if (registrationEnd < 0) return -1;
  return registrationEnd + "registerPart120CommonLogin({ app });".length;
}

for (const [rel, label] of requiredModules) {
  if (!fs.existsSync(path.join(root, rel))) fail(`${label} backend module missing: ${rel}`);
}
if (!fs.existsSync(serverPath)) fail("backend/src/server.js missing.");
if (!fs.existsSync(shellBackendPath)) fail("Part 119 shell backend missing.");

const originals = {
  server: fs.readFileSync(serverPath, "utf8"),
  shellBackend: fs.readFileSync(shellBackendPath, "utf8"),
};
for (const file of [serverPath, shellBackendPath]) {
  const check = syntaxCheck(file);
  if (check.status !== 0) fail(`Existing ${path.relative(root, file)} syntax broken hai. Installer ne koi change nahi kiya.\n${check.stderr || check.stdout}`);
}

let server = originals.server;
const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const oldBlock = new RegExp(`\\n*${escaped}\\nconst \\{ registerPart121OwnerConsolidation \\} = await import\\("\\.\\/part121-owner-consolidation\\.js"\\);\\nregisterPart121OwnerConsolidation\\(\\{ app \\}\\);\\n*`, "g");
server = server.replace(oldBlock, "\n\n");
const part120End = findPartBlockEnd(server, "PART 120 — COMMON LOGIN JWT AND ROLE ROUTING");
if (part120End < 0) fail("Part 120 registration block not found.");
server = `${server.slice(0, part120End)}\n\n${block}${server.slice(part120End)}`;

let shell = originals.shellBackend;
shell = shell
  .replace('label: "Institute Owner",', 'label: "Owner Workspace",')
  .replace('description: "Owner operations, institute overview and administrative controls.",', 'description: "Unified owner overview, account access, institute operations and business controls.",')
  .replace('route: "/institute-owner-app",', 'route: "/owner-workspace",');

if (!shell.includes('key: "account-access"')) {
  const anchor = `  {\n    key: "teacher-app",`;
  const index = shell.indexOf(anchor);
  if (index < 0) fail("Part 119 teacher-app insertion anchor not found.");
  const accountModule = `  {\n    key: "account-access",\n    label: "Account Access",\n    description: "Create, disable and reset unified role accounts.",\n    category: "Role Apps",\n    route: "/account-access-manager",\n    icon: "lock",\n    roles: OWNER_ONLY_ROLES,\n    order: 25,\n  },\n`;
  shell = `${shell.slice(0, index)}${accountModule}${shell.slice(index)}`;
}
if (!shell.includes('"account manager": "account-access"')) {
  shell = shell.replace(
    '  owner: "owner-dashboard",',
    '  owner: "owner-dashboard",\n  accounts: "account-access",\n  "account manager": "account-access",'
  );
}

fs.writeFileSync(serverPath, server, "utf8");
fs.writeFileSync(shellBackendPath, shell, "utf8");

for (const file of [serverPath, shellBackendPath]) {
  const check = syntaxCheck(file);
  if (check.status !== 0) {
    fs.writeFileSync(serverPath, originals.server, "utf8");
    fs.writeFileSync(shellBackendPath, originals.shellBackend, "utf8");
    fail(`Part 121 syntax check failed. Original files restored.\n${check.stderr || check.stdout}`);
  }
}

const finalServer = fs.readFileSync(serverPath, "utf8");
const p120 = finalServer.indexOf("PART 120 — COMMON LOGIN JWT AND ROLE ROUTING");
const p121 = finalServer.indexOf("PART 121 — OWNER MODULE CONSOLIDATION");
const p112 = finalServer.indexOf("PART 112 — RAZORPAY TEST MODE FOUNDATION");
const p404 = find404(finalServer);
const finalShell = fs.readFileSync(shellBackendPath, "utf8");
const shellOk = finalShell.includes('key: "owner-dashboard"') &&
  finalShell.includes('route: "/owner-workspace"') &&
  finalShell.includes('key: "account-access"');

if (!(p120 >= 0 && p121 > p120 && p112 > p121 && p404 > p112 && shellOk)) {
  fs.writeFileSync(serverPath, originals.server, "utf8");
  fs.writeFileSync(shellBackendPath, originals.shellBackend, "utf8");
  fail("Part 121 integration verification failed. Original files restored.");
}

console.log("\nPART 121 APPLIED SUCCESSFULLY");
console.log("Part 121 registered after Part 120 security middleware: PASS");
console.log("Part 121 registered before Parts 112–119 routes: PASS");
console.log("Part 119 owner route changed to /owner-workspace: PASS");
console.log("Part 119 Account Access module added: PASS");
console.log("server.js syntax: PASS");
console.log("Next: node .\\VERIFY-PART121.js\n");
