import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(root, "backend", "src", "server.js");
const shellBackendPath = path.join(root, "backend", "src", "part119-unified-app-shell.js");

const required = [
  "backend/src/part112-razorpay-foundation.js",
  "backend/src/part113-subscription-plans.js",
  "backend/src/part114-customer-checkout-subscription.js",
  "backend/src/part115-razorpay-webhooks.js",
  "backend/src/part116-subscription-access-control.js",
  "backend/src/part117-vani-subscription-manager.js",
  "backend/src/part118-razorpay-live-readiness.js",
  "backend/src/part119-unified-app-shell.js",
  "backend/src/part120-common-login.js",
  "backend/src/part121-owner-consolidation.js",
  "backend/src/part122-teacher-consolidation.js",
  "backend/src/part123-student-consolidation.js",
  "backend/src/part124-role-consolidation.js",
  "frontend/naxora-role-workspace.html",
  "frontend/naxora-role-scope-manager.html",
  "frontend/naxora-role-workspace.css",
  "frontend/naxora-role-workspace.js",
  "frontend/naxora-role-scope-manager.js",
];

let failed = false;

for (const rel of required) {
  const ok = fs.existsSync(path.join(root, rel));
  console.log(`${ok ? "PASS" : "FAIL"} ${rel}`);
  if (!ok) failed = true;
}

for (const file of [
  serverPath,
  shellBackendPath,
  path.join(root, "backend/src/part124-role-consolidation.js"),
]) {
  const check = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  console.log(`${check.status === 0 ? "PASS" : "FAIL"} ${path.relative(root, file)} syntax`);
  if (check.status !== 0) {
    console.error(check.stderr || check.stdout);
    failed = true;
  }
}

const source = fs.readFileSync(serverPath, "utf8");
let p404 = source.indexOf("app.use(notFound);");
if (p404 < 0) p404 = source.indexOf("app.use(notFound)");
if (p404 < 0) {
  const codeIndex = Math.max(source.indexOf('"ROUTE_NOT_FOUND"'), source.indexOf("'ROUTE_NOT_FOUND'"));
  p404 = codeIndex >= 0 ? source.lastIndexOf("app.use(", codeIndex) : -1;
}

const positions = [
  ["PART 120 — COMMON LOGIN JWT AND ROLE ROUTING", 120],
  ["PART 121 — OWNER MODULE CONSOLIDATION", 121],
  ["PART 122 — TEACHER MODULE CONSOLIDATION", 122],
  ["PART 123 — STUDENT MODULE CONSOLIDATION", 123],
  ["PART 124 — PARENT STAFF AND BRANCH ROLE CONSOLIDATION", 124],
  ["PART 112 — RAZORPAY TEST MODE FOUNDATION", 112],
].map(([marker, part]) => ({ part, pos: source.indexOf(marker) }));

const orderOk =
  positions[0].pos >= 0 &&
  positions[1].pos > positions[0].pos &&
  positions[2].pos > positions[1].pos &&
  positions[3].pos > positions[2].pos &&
  positions[4].pos > positions[3].pos &&
  positions[5].pos > positions[4].pos &&
  p404 > positions[5].pos;

console.log(`${orderOk ? "PASS" : "FAIL"} Part 120 → 121 → 122 → 123 → 124 → Parts 112–119 → 404 order`);
if (!orderOk) failed = true;

const shell = fs.readFileSync(shellBackendPath, "utf8");
for (const [test, label] of [
  [shell.includes('route: "/parent-workspace"'), "Part 119 Parent route uses /parent-workspace"],
  [shell.includes('key: "role-scope-manager"'), "Role Scope Manager exists"],
  [shell.includes('key: "branch-workspace"'), "Branch Workspace exists"],
  [shell.includes('key: "accountant-workspace"'), "Accountant Workspace exists"],
  [shell.includes('key: "counsellor-workspace"'), "Counsellor Workspace exists"],
  [shell.includes('key: "staff-workspace"'), "Staff Workspace exists"],
  [shell.includes('"parent workspace": "parent-app"'), "Parent Workspace VANI alias exists"],
]) {
  console.log(`${test ? "PASS" : "FAIL"} ${label}`);
  if (!test) failed = true;
}

process.exit(failed ? 1 : 0);
