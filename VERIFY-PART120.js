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
  "frontend/naxora-unified-app.html",
  "frontend/naxora-common-login.html",
  "frontend/naxora-change-password.html",
  "frontend/naxora-account-access-manager.html",
  "frontend/naxora-common-auth.css",
  "frontend/naxora-common-login.js",
  "frontend/naxora-change-password.js",
  "frontend/naxora-common-session.js",
  "frontend/naxora-account-access-manager.js",
];
let failed = false;
for (const rel of required) {
  const ok = fs.existsSync(path.join(root, rel));
  console.log(`${ok ? "PASS" : "FAIL"} ${rel}`);
  if (!ok) failed = true;
}
for (const file of [serverPath, shellBackendPath]) {
  const syntax = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  console.log(`${syntax.status === 0 ? "PASS" : "FAIL"} ${path.relative(root, file)} syntax`);
  if (syntax.status !== 0) {
    console.error(syntax.stderr || syntax.stdout);
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
const p112 = source.indexOf("PART 112 — RAZORPAY TEST MODE FOUNDATION");
console.log(`${p120 >= 0 && p112 >= 0 && p120 < p112 ? "PASS" : "FAIL"} Part 120 before Part 112 security-sensitive routes`);
if (!(p120 >= 0 && p112 >= 0 && p120 < p112)) failed = true;

for (const [marker, label] of [
  ["PART 112 — RAZORPAY TEST MODE FOUNDATION", "Part 112"],
  ["PART 113 — NAXORA SUBSCRIPTION PLANS", "Part 113"],
  ["PART 114 — CUSTOMER CHECKOUT AND SUBSCRIPTION ACTIVATION", "Part 114"],
  ["PART 115 — SECURE RAZORPAY WEBHOOKS AND STATUS SYNC", "Part 115"],
  ["PART 116 — SUBSCRIPTION FEATURE ACCESS CONTROL", "Part 116"],
  ["PART 117 — VANI SUBSCRIPTION MANAGER", "Part 117"],
  ["PART 118 — RAZORPAY LIVE READINESS AND CONTROLLED LAUNCH", "Part 118"],
  ["PART 119 — UNIFIED SINGLE APP SHELL", "Part 119"],
]) {
  const pos = source.indexOf(marker);
  const ok = pos >= 0 && p404 >= 0 && pos < p404;
  console.log(`${ok ? "PASS" : "FAIL"} ${label} before 404 handler`);
  if (!ok) failed = true;
}

const shellBackend = fs.readFileSync(shellBackendPath, "utf8");
const shellHtml = fs.readFileSync(shellHtmlPath, "utf8");
const backendPatched = shellBackend.includes("commonLoginIntegrated: true") &&
  shellBackend.includes("commonLoginReady: true");
const htmlPatched = shellHtml.includes('/naxora-common-session.js');
console.log(`${backendPatched ? "PASS" : "FAIL"} Part 119 reports common login active`);
console.log(`${htmlPatched ? "PASS" : "FAIL"} Unified app common-session guard installed`);
if (!backendPatched || !htmlPatched) failed = true;

process.exit(failed ? 1 : 0);
