import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const required = [
  "APPLY-PART128.js","APPLY-PART129.js","APPLY-PART130.js","APPLY-PART131.js",
  "APPLY-PART132.js","APPLY-PART133.js","APPLY-PART134.js","APPLY-PART135.js",
  "APPLY-PART136.js","APPLY-NAXORA-FINAL-OWNER-VANI.js","APPLY-PART1366.js",
  "APPLY-PART13610.js","VERIFY-PART13610.js","APPLY-PART13611.js","VERIFY-PART13611.js","APPLY-PART13612.js","VERIFY-PART13612.js",
  "backend/src/part128-vani-master-data-actions.js",
  "backend/src/part129-vani-bulk-import.js",
  "backend/src/part130-vani-academic-operations.js",
  "backend/src/part131-vani-fees-finance-operations.js",
  "backend/src/part132-vani-admissions-crm-operations.js",
  "backend/src/part133-vani-communication-notifications.js",
  "backend/src/part134-vani-reports-exports.js",
  "backend/src/part135-vani-conversational-workflow-engine.js",
  "backend/src/part136-final-all-role-vani-acceptance.js",
  "backend/src/part1366-live-subscription-revenue.js",
  "backend/src/part13610-final-role-vani-runtime.js",
  "frontend/naxora-final-role-vani.html",
  "frontend/naxora-live-subscriptions.html",
  "frontend/naxora-owner-access.html",
];

let failed = false;
for (const rel of required) {
  const ok = fs.existsSync(path.join(root, rel));
  console.log(`${ok ? "PASS" : "FAIL"} ${rel}`);
  if (!ok) failed = true;
}
for (const rel of required.filter(rel => rel.endsWith(".js"))) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) continue;
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  const ok = result.status === 0;
  console.log(`${ok ? "PASS" : "FAIL"} ${rel} syntax`);
  if (!ok) {
    console.error(result.stderr || result.stdout);
    failed = true;
  }
}
console.log("\nPACKAGE GUARANTEE BOUNDARY");
console.log("Installer/static integration can PASS here.");
console.log("Live Render/MongoDB/Razorpay and all-role evidence must PASS /api/part13610/acceptance.");
process.exit(failed ? 1 : 0);
