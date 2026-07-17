import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const required = [
  "backend/src/server.js",
  "backend/src/part112-razorpay-foundation.js",
  "backend/src/part113-subscription-plans.js",
  "frontend/naxora-subscription-plans.html",
  "frontend/naxora-subscription-plans.css",
  "frontend/naxora-subscription-plans.js",
];
let failed = false;
for (const rel of required) {
  const exists = fs.existsSync(path.join(root, rel));
  console.log(`${exists ? "PASS" : "FAIL"} ${rel}`);
  if (!exists) failed = true;
}
const serverPath = path.join(root, "backend/src/server.js");
if (fs.existsSync(serverPath)) {
  const check = spawnSync(process.execPath, ["--check", serverPath], { encoding: "utf8" });
  console.log(`${check.status === 0 ? "PASS" : "FAIL"} server.js syntax`);
  if (check.status !== 0) { console.error(check.stderr || check.stdout); failed = true; }
  const source = fs.readFileSync(serverPath, "utf8");
  const marker = source.includes("PART 113 — NAXORA SUBSCRIPTION PLANS");
  console.log(`${marker ? "PASS" : "FAIL"} Part 113 bootstrap marker`);
  if (!marker) failed = true;
}
process.exit(failed ? 1 : 0);
