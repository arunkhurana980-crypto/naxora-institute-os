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
  ["backend/src/part124-role-consolidation.js", "Part 124"],
];

const marker = "// ================= PART 124 — PARENT STAFF AND BRANCH ROLE CONSOLIDATION =================";
const block = `${marker}\nconst { registerPart124RoleConsolidation } = await import("./part124-role-consolidation.js");\nregisterPart124RoleConsolidation({ app });`;

const shellModuleStart = "  // PART 124 ROLE WORKSPACE MODULES START";
const shellModuleEnd = "  // PART 124 ROLE WORKSPACE MODULES END";
const shellAliasStart = "  // PART 124 ROLE WORKSPACE ALIASES START";
const shellAliasEnd = "  // PART 124 ROLE WORKSPACE ALIASES END";

const addedModules = `${shellModuleStart}
  {
    key: "role-scope-manager",
    label: "Role Scope Manager",
    description: "Assign child, branch and explicit institute-wide role scopes.",
    category: "Role Apps",
    route: "/role-scope-manager",
    icon: "lock",
    roles: OWNER_ONLY_ROLES,
    order: 26,
  },
  {
    key: "branch-workspace",
    label: "Branch Workspace",
    description: "Unified branch operations, students, attendance and reports.",
    category: "Role Apps",
    route: "/branch-workspace",
    icon: "branches",
    roles: ["institute_owner", "branch_manager"],
    order: 55,
  },
  {
    key: "accountant-workspace",
    label: "Accountant Workspace",
    description: "Unified fees, receipts, invoices and finance reports.",
    category: "Role Apps",
    route: "/accountant-workspace",
    icon: "wallet",
    roles: ["institute_owner", "accountant"],
    order: 56,
  },
  {
    key: "counsellor-workspace",
    label: "Counsellor Workspace",
    description: "Unified leads, enquiries, admissions and follow-up.",
    category: "Role Apps",
    route: "/counsellor-workspace",
    icon: "support",
    roles: ["institute_owner", "counsellor"],
    order: 57,
  },
  {
    key: "staff-workspace",
    label: "Staff Workspace",
    description: "Unified assigned operations, attendance and staff tasks.",
    category: "Role Apps",
    route: "/staff-workspace",
    icon: "building",
    roles: ["institute_owner", "staff"],
    order: 58,
  },
${shellModuleEnd}
`;

const addedAliases = `${shellAliasStart}
  "role scope": "role-scope-manager",
  "scope manager": "role-scope-manager",
  "branch workspace": "branch-workspace",
  accountant: "accountant-workspace",
  accounts: "accountant-workspace",
  counsellor: "counsellor-workspace",
  counselor: "counsellor-workspace",
  "staff workspace": "staff-workspace",
${shellAliasEnd}
`;

function fail(message) {
  console.error(`\nPART 124 APPLY FAILED: ${message}\n`);
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
const oldBlock = new RegExp(`\\n*${escaped}\\nconst \\{ registerPart124RoleConsolidation \\} = await import\\("\\.\\/part124-role-consolidation\\.js"\\);\\nregisterPart124RoleConsolidation\\(\\{ app \\}\\);\\n*`, "g");
server = server.replace(oldBlock, "\n\n");

const part123End = registrationEnd(server, "registerPart123StudentConsolidation({ app });");
if (part123End < 0) fail("Part 123 registration block not found.");
server = `${server.slice(0, part123End)}\n\n${block}${server.slice(part123End)}`;

let shell = removeBetween(originals.shell, shellModuleStart, shellModuleEnd);
shell = removeBetween(shell, shellAliasStart, shellAliasEnd);

shell = shell
  .replace('label: "Parent App",', 'label: "Parent Workspace",')
  .replace(
    'description: "Child progress, attendance, fees and safe parent updates.",',
    'description: "Unified child progress, attendance, fee context and Parent VANI.",'
  )
  .replace('route: "/parent-app",', 'route: "/parent-workspace",');

const moduleAnchor = `  {\n    key: "students",`;
const moduleIndex = shell.indexOf(moduleAnchor);
if (moduleIndex < 0) fail("Part 119 Student-list module insertion anchor not found.");
shell = `${shell.slice(0, moduleIndex)}${addedModules}${shell.slice(moduleIndex)}`;

const aliasAnchor = `  attendance: "attendance",`;
const aliasIndex = shell.indexOf(aliasAnchor);
if (aliasIndex < 0) fail("Part 119 command alias insertion anchor not found.");
shell = `${shell.slice(0, aliasIndex)}${addedAliases}${shell.slice(aliasIndex)}`;

if (!shell.includes('"parent workspace": "parent-app"')) {
  shell = shell.replace(
    '  parent: "parent-app",',
    '  parent: "parent-app",\n  "parent workspace": "parent-app",'
  );
}

fs.writeFileSync(serverPath, server, "utf8");
fs.writeFileSync(shellBackendPath, shell, "utf8");

for (const file of [serverPath, shellBackendPath]) {
  const check = syntaxCheck(file);
  if (check.status !== 0) {
    fs.writeFileSync(serverPath, originals.server, "utf8");
    fs.writeFileSync(shellBackendPath, originals.shell, "utf8");
    fail(`Part 124 syntax check failed. Original files restored.\n${check.stderr || check.stdout}`);
  }
}

const finalServer = fs.readFileSync(serverPath, "utf8");
const p120 = finalServer.indexOf("PART 120 — COMMON LOGIN JWT AND ROLE ROUTING");
const p121 = finalServer.indexOf("PART 121 — OWNER MODULE CONSOLIDATION");
const p122 = finalServer.indexOf("PART 122 — TEACHER MODULE CONSOLIDATION");
const p123 = finalServer.indexOf("PART 123 — STUDENT MODULE CONSOLIDATION");
const p124 = finalServer.indexOf("PART 124 — PARENT STAFF AND BRANCH ROLE CONSOLIDATION");
const p112 = finalServer.indexOf("PART 112 — RAZORPAY TEST MODE FOUNDATION");
const p404 = find404(finalServer);
const finalShell = fs.readFileSync(shellBackendPath, "utf8");

const shellOk =
  finalShell.includes('route: "/parent-workspace"') &&
  finalShell.includes('key: "role-scope-manager"') &&
  finalShell.includes('key: "branch-workspace"') &&
  finalShell.includes('key: "accountant-workspace"') &&
  finalShell.includes('key: "counsellor-workspace"') &&
  finalShell.includes('key: "staff-workspace"');

if (!(p120 >= 0 && p121 > p120 && p122 > p121 && p123 > p122 && p124 > p123 && p112 > p124 && p404 > p112 && shellOk)) {
  fs.writeFileSync(serverPath, originals.server, "utf8");
  fs.writeFileSync(shellBackendPath, originals.shell, "utf8");
  fail("Part 124 integration verification failed. Original files restored.");
}

console.log("\nPART 124 APPLIED SUCCESSFULLY");
console.log("Part 124 registered after Part 123: PASS");
console.log("Part 124 registered before Parts 112–119 routes: PASS");
console.log("Part 119 Parent route changed to /parent-workspace: PASS");
console.log("Branch, Accountant, Counsellor and Staff workspaces added: PASS");
console.log("Role Scope Manager added: PASS");
console.log("server.js syntax: PASS");
console.log("Next: node .\\VERIFY-PART124.js\n");
