import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(root, "backend", "src", "server.js");
const required = [
  "backend/src/part112-razorpay-foundation.js",
  "backend/src/part113-subscription-plans.js",
  "backend/src/part114-customer-checkout-subscription.js",
  "backend/src/part115-razorpay-webhooks.js",
  "backend/src/part116-subscription-access-control.js",
  "backend/src/part117-vani-subscription-manager.js",
  "backend/src/part118-razorpay-live-readiness.js",
  "frontend/razorpay-live-readiness.html",
  "frontend/razorpay-live-readiness.css",
  "frontend/razorpay-live-readiness.js",
];
let failed = false;
for (const rel of required) {
  const ok = fs.existsSync(path.join(root, rel));
  console.log(`${ok ? "PASS" : "FAIL"} ${rel}`);
  if (!ok) failed = true;
}
if (!fs.existsSync(serverPath)) process.exit(1);
const syntax = spawnSync(process.execPath, ["--check", serverPath], { encoding: "utf8" });
console.log(`${syntax.status === 0 ? "PASS" : "FAIL"} server.js syntax`);
if (syntax.status !== 0) {
  console.error(syntax.stderr || syntax.stdout);
  failed = true;
}
const source = fs.readFileSync(serverPath, "utf8");
let p404 = source.indexOf("app.use(notFound);");
if (p404 < 0) p404 = source.indexOf("app.use(notFound)");
if (p404 < 0) {
  const codeIndex = Math.max(source.indexOf('"ROUTE_NOT_FOUND"'), source.indexOf("'ROUTE_NOT_FOUND'"));
  p404 = codeIndex >= 0 ? source.lastIndexOf("app.use(", codeIndex) : -1;
}
const markers = [
  ["PART 112 — RAZORPAY TEST MODE FOUNDATION", "Part 112"],
  ["PART 113 — NAXORA SUBSCRIPTION PLANS", "Part 113"],
  ["PART 114 — CUSTOMER CHECKOUT AND SUBSCRIPTION ACTIVATION", "Part 114"],
  ["PART 115 — SECURE RAZORPAY WEBHOOKS AND STATUS SYNC", "Part 115"],
  ["PART 116 — SUBSCRIPTION FEATURE ACCESS CONTROL", "Part 116"],
  ["PART 117 — VANI SUBSCRIPTION MANAGER", "Part 117"],
  ["PART 118 — RAZORPAY LIVE READINESS AND CONTROLLED LAUNCH", "Part 118"],
];
console.log(`${p404 >= 0 ? "PASS" : "FAIL"} 404 handler found`);
if (p404 < 0) failed = true;
for (const [marker, label] of markers) {
  const pos = source.indexOf(marker);
  const ok = pos >= 0 && p404 >= 0 && pos < p404;
  console.log(`${ok ? "PASS" : "FAIL"} ${label} before 404 handler`);
  if (!ok) failed = true;
}
process.exit(failed ? 1 : 0);
