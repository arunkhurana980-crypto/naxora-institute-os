import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(root, "backend", "src", "server.js");
const files = [
  "backend/src/part112-razorpay-foundation.js",
  "backend/src/part113-subscription-plans.js",
  "frontend/razorpay-test-mode-foundation.html",
  "frontend/naxora-subscription-plans.html",
];
let failed = false;

for (const rel of files) {
  const exists = fs.existsSync(path.join(root, rel));
  console.log(`${exists ? "PASS" : "FAIL"} ${rel}`);
  if (!exists) failed = true;
}

if (!fs.existsSync(serverPath)) {
  console.log("FAIL backend/src/server.js");
  process.exit(1);
}

const check = spawnSync(process.execPath, ["--check", serverPath], { encoding: "utf8" });
console.log(`${check.status === 0 ? "PASS" : "FAIL"} server.js syntax`);
if (check.status !== 0) {
  console.error(check.stderr || check.stdout);
  failed = true;
}

const source = fs.readFileSync(serverPath, "utf8");
const p112 = source.indexOf("PART 112 — RAZORPAY TEST MODE FOUNDATION");
const p113 = source.indexOf("PART 113 — NAXORA SUBSCRIPTION PLANS");
let p404 = source.indexOf("app.use(notFound);");
if (p404 < 0) p404 = source.indexOf("app.use(notFound)");
if (p404 < 0) {
  const codeIndex = Math.max(source.indexOf('"ROUTE_NOT_FOUND"'), source.indexOf("'ROUTE_NOT_FOUND'"));
  p404 = codeIndex >= 0 ? source.lastIndexOf("app.use(", codeIndex) : -1;
}

const checks = [
  [p112 >= 0, "Part 112 registration exists"],
  [p113 >= 0, "Part 113 registration exists"],
  [p404 >= 0, "404 handler found"],
  [p112 >= 0 && p404 >= 0 && p112 < p404, "Part 112 registered before 404 handler"],
  [p113 >= 0 && p404 >= 0 && p113 < p404, "Part 113 registered before 404 handler"],
];
for (const [ok, label] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
  if (!ok) failed = true;
}

process.exit(failed ? 1 : 0);
