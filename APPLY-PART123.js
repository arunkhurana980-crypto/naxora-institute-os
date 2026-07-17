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
  ["backend/src/part122-teacher-consolidation.js", "Part 122"],
  ["backend/src/part123-student-consolidation.js", "Part 123"],
];

const marker = "// ================= PART 123 — STUDENT MODULE CONSOLIDATION =================";
const block = `${marker}\nconst { registerPart123StudentConsolidation } = await import("./part123-student-consolidation.js");\nregisterPart123StudentConsolidation({ app });`;

function fail(message) {
  console.error(`\nPART 123 APPLY FAILED: ${message}\n`);
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

for (const [rel, label] of requiredModules) {
  if (!fs.existsSync(path.join(root, rel))) fail(`${label} backend module missing: ${rel}`);
}
if (!fs.existsSync(serverPath)) fail("backend/src/server.js missing.");
if (!fs.existsSync(shellBackendPath)) fail("Part 119 shell backend missing.");

const originals = {
  server: fs.readFileSync(serverPath, "utf8"),
  shell: fs.readFileSync(shellBackendPath, "utf8"),
};

for (const file of [serverPath, shellBackendPath]) {
  const check = syntaxCheck(file);
  if (check.status !== 0) {
    fail(`Existing ${path.relative(root, file)} syntax broken hai. Installer ne koi change nahi kiya.\n${check.stderr || check.stdout}`);
  }
}

let server = originals.server;
const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const oldBlock = new RegExp(`\\n*${escaped}\\nconst \\{ registerPart123StudentConsolidation \\} = await import\\("\\.\\/part123-student-consolidation\\.js"\\);\\nregisterPart123StudentConsolidation\\(\\{ app \\}\\);\\n*`, "g");
server = server.replace(oldBlock, "\n\n");

const part122End = registrationEnd(server, "registerPart122TeacherConsolidation({ app });");
if (part122End < 0) fail("Part 122 registration block not found.");
server = `${server.slice(0, part122End)}\n\n${block}${server.slice(part122End)}`;

let shell = originals.shell
  .replace('label: "Student App",', 'label: "Student Workspace",')
  .replace(
    'description: "Classes, study tools, assignments and student progress.",',
    'description: "Unified classes, assignments, attendance, learning progress, AI notes and Student VANI.",'
  )
  .replace('route: "/student-app",', 'route: "/student-workspace",');

if (!shell.includes('"student workspace": "student-app"')) {
  shell = shell.replace(
    '  student: "student-app",',
    '  student: "student-app",\n  "student workspace": "student-app",'
  );
}

fs.writeFileSync(serverPath, server, "utf8");
fs.writeFileSync(shellBackendPath, shell, "utf8");

for (const file of [serverPath, shellBackendPath]) {
  const check = syntaxCheck(file);
  if (check.status !== 0) {
    fs.writeFileSync(serverPath, originals.server, "utf8");
    fs.writeFileSync(shellBackendPath, originals.shell, "utf8");
    fail(`Part 123 syntax check failed. Original files restored.\n${check.stderr || check.stdout}`);
  }
}

const finalServer = fs.readFileSync(serverPath, "utf8");
const p120 = finalServer.indexOf("PART 120 — COMMON LOGIN JWT AND ROLE ROUTING");
const p121 = finalServer.indexOf("PART 121 — OWNER MODULE CONSOLIDATION");
const p122 = finalServer.indexOf("PART 122 — TEACHER MODULE CONSOLIDATION");
const p123 = finalServer.indexOf("PART 123 — STUDENT MODULE CONSOLIDATION");
const p112 = finalServer.indexOf("PART 112 — RAZORPAY TEST MODE FOUNDATION");
const p404 = find404(finalServer);
const finalShell = fs.readFileSync(shellBackendPath, "utf8");

const shellOk =
  finalShell.includes('key: "student-app"') &&
  finalShell.includes('route: "/student-workspace"') &&
  finalShell.includes('"student workspace": "student-app"');

if (!(p120 >= 0 && p121 > p120 && p122 > p121 && p123 > p122 && p112 > p123 && p404 > p112 && shellOk)) {
  fs.writeFileSync(serverPath, originals.server, "utf8");
  fs.writeFileSync(shellBackendPath, originals.shell, "utf8");
  fail("Part 123 integration verification failed. Original files restored.");
}

console.log("\nPART 123 APPLIED SUCCESSFULLY");
console.log("Part 123 registered after Part 122: PASS");
console.log("Part 123 registered before Parts 112–119 routes: PASS");
console.log("Part 119 student route changed to /student-workspace: PASS");
console.log("Part 119 Student Workspace VANI alias added: PASS");
console.log("server.js syntax: PASS");
console.log("Next: node .\\VERIFY-PART123.js\n");
