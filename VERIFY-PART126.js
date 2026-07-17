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
  "backend/src/part126-native-e2e-integration.js",
  "frontend/naxora-integration-centre.html",
  "frontend/naxora-integration-centre.css",
  "frontend/naxora-integration-centre.js",
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
  path.join(root, "backend/src/part126-native-e2e-integration.js"),
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
  "PART 126 — NATIVE ADAPTERS AND CROSS MODULE E2E",
  "PART 112 — RAZORPAY TEST MODE FOUNDATION",
];
const positions = markers.map((marker) => source.indexOf(marker));
const orderOk =
  positions.every((position) => position >= 0) &&
  positions.slice(1).every((position, index) => position > positions[index]) &&
  p404 > positions[positions.length - 1];

console.log(`${orderOk ? "PASS" : "FAIL"} Part 120 → 121 → 122 → 123 → 124 → 125 → 126 → Parts 112–119 → 404 order`);
if (!orderOk) failed = true;

const shell = fs.readFileSync(shellBackendPath, "utf8");
const html = fs.readFileSync(shellHtmlPath, "utf8");
for (const [test, label] of [
  [shell.includes('key: "integration-centre"'), "Part 119 Integration & Notifications module exists"],
  [shell.includes('route: "/integration-centre"'), "Integration Centre route mapped"],
  [shell.includes('"native adapters": "integration-centre"'), "Native adapters alias exists"],
  [shell.includes('"e2e health": "integration-centre"'), "E2E health alias exists"],
  [html.includes("<strong>126</strong><span>Native E2E</span>"), "Unified app Part 126 progress exists"],
  [html.includes("Part 126 native action + navigation mode"), "Global VANI Part 126 mode label exists"],
]) {
  console.log(`${test ? "PASS" : "FAIL"} ${label}`);
  if (!test) failed = true;
}

process.exit(failed ? 1 : 0);
