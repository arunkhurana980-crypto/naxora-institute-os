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
  "frontend/customer-subscription-checkout.html",
  "frontend/customer-subscription-checkout.css",
  "frontend/customer-subscription-checkout.js",
];
let failed = false;
for (const rel of required) {
  const ok = fs.existsSync(path.join(root, rel));
  console.log(`${ok ? "PASS" : "FAIL"} ${rel}`);
  if (!ok) failed = true;
}
if (!fs.existsSync(serverPath)) process.exit(1);
const check = spawnSync(process.execPath, ["--check", serverPath], { encoding: "utf8" });
console.log(`${check.status === 0 ? "PASS" : "FAIL"} server.js syntax`);
if (check.status !== 0) { console.error(check.stderr || check.stdout); failed = true; }
const source = fs.readFileSync(serverPath, "utf8");
const p112 = source.indexOf("PART 112 — RAZORPAY TEST MODE FOUNDATION");
const p113 = source.indexOf("PART 113 — NAXORA SUBSCRIPTION PLANS");
const p114 = source.indexOf("PART 114 — CUSTOMER CHECKOUT AND SUBSCRIPTION ACTIVATION");
let p404 = source.indexOf("app.use(notFound);");
if (p404 < 0) p404 = source.indexOf("app.use(notFound)");
if (p404 < 0) {
  const routeCodeIndex = Math.max(source.indexOf('"ROUTE_NOT_FOUND"'), source.indexOf("'ROUTE_NOT_FOUND'"));
  p404 = routeCodeIndex >= 0 ? source.lastIndexOf("app.use(", routeCodeIndex) : -1;
}
for (const [ok, label] of [
  [p112 >= 0 && p112 < p404, "Part 112 before 404 handler"],
  [p113 >= 0 && p113 < p404, "Part 113 before 404 handler"],
  [p114 >= 0 && p114 < p404, "Part 114 before 404 handler"],
]) {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
  if (!ok) failed = true;
}
process.exit(failed ? 1 : 0);
