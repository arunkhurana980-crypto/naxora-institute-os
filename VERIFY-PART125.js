import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(root, "backend", "src", "server.js");
const shellBackendPath = path.join(root, "backend", "src", "part119-unified-app-shell.js");
const shellHtmlPath = path.join(root, "frontend", "naxora-unified-app.html");

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
  "backend/src/part125-global-vani-actions.js",
  "frontend/naxora-unified-app.html",
  "frontend/naxora-vani-actions.html",
  "frontend/naxora-vani-actions.css",
  "frontend/naxora-vani-actions.js",
  "frontend/naxora-part125-global-vani-bridge.js",
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
  path.join(root, "backend/src/part125-global-vani-actions.js"),
  path.join(root, "frontend/naxora-vani-actions.js"),
  path.join(root, "frontend/naxora-part125-global-vani-bridge.js"),
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
const markers = [
  "PART 120 — COMMON LOGIN JWT AND ROLE ROUTING",
  "PART 121 — OWNER MODULE CONSOLIDATION",
  "PART 122 — TEACHER MODULE CONSOLIDATION",
  "PART 123 — STUDENT MODULE CONSOLIDATION",
  "PART 124 — PARENT STAFF AND BRANCH ROLE CONSOLIDATION",
  "PART 125 — GLOBAL VANI MULTI STEP ACTIONS",
  "PART 112 — RAZORPAY TEST MODE FOUNDATION",
].map((marker) => source.indexOf(marker));
const orderOk =
  markers.every((position) => position >= 0) &&
  markers.slice(1).every((position, index) => position > markers[index]) &&
  p404 > markers[markers.length - 1];
console.log(`${orderOk ? "PASS" : "FAIL"} Part 120 → 121 → 122 → 123 → 124 → 125 → Parts 112–119 → 404 order`);
if (!orderOk) failed = true;

const shell = fs.readFileSync(shellBackendPath, "utf8");
const html = fs.readFileSync(shellHtmlPath, "utf8");
for (const [test, label] of [
  [shell.includes('key: "vani-actions"'), "Part 119 Global VANI Actions module exists"],
  [shell.includes('route: "/vani-actions"'), "Global VANI Actions route mapped"],
  [shell.includes('"attendance mark": "vani-actions"'), "Attendance action alias exists"],
  [shell.includes('"fee reminder": "vani-actions"'), "Fee reminder alias exists"],
  [html.includes('/naxora-part125-global-vani-bridge.js'), "Unified shell Part 125 bridge installed"],
]) {
  console.log(`${test ? "PASS" : "FAIL"} ${label}`);
  if (!test) failed = true;
}

process.exit(failed ? 1 : 0);
