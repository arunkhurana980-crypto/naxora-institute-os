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
  "frontend/naxora-student-workspace.html",
  "frontend/naxora-student-workspace.css",
  "frontend/naxora-student-workspace.js",
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
  path.join(root, "backend/src/part123-student-consolidation.js"),
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

const p120 = source.indexOf("PART 120 — COMMON LOGIN JWT AND ROLE ROUTING");
const p121 = source.indexOf("PART 121 — OWNER MODULE CONSOLIDATION");
const p122 = source.indexOf("PART 122 — TEACHER MODULE CONSOLIDATION");
const p123 = source.indexOf("PART 123 — STUDENT MODULE CONSOLIDATION");
const p112 = source.indexOf("PART 112 — RAZORPAY TEST MODE FOUNDATION");

const orderOk =
  p120 >= 0 &&
  p121 > p120 &&
  p122 > p121 &&
  p123 > p122 &&
  p112 > p123 &&
  p404 > p112;

console.log(`${orderOk ? "PASS" : "FAIL"} Part 120 → 121 → 122 → 123 → Parts 112–119 → 404 order`);
if (!orderOk) failed = true;

const shell = fs.readFileSync(shellBackendPath, "utf8");
for (const [test, label] of [
  [shell.includes('route: "/student-workspace"'), "Part 119 student route uses /student-workspace"],
  [shell.includes('label: "Student Workspace"'), "Part 119 Student Workspace label exists"],
  [shell.includes('"student workspace": "student-app"'), "Part 119 VANI Student Workspace alias exists"],
]) {
  console.log(`${test ? "PASS" : "FAIL"} ${label}`);
  if (!test) failed = true;
}

process.exit(failed ? 1 : 0);
