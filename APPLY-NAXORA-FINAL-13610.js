import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const scripts = [
  "APPLY-PART128.js",
  "APPLY-PART129.js",
  "APPLY-PART130.js",
  "APPLY-PART131.js",
  "APPLY-PART132.js",
  "APPLY-PART133.js",
  "APPLY-PART134.js",
  "APPLY-PART135.js",
  "APPLY-PART136.js",
  "APPLY-NAXORA-FINAL-OWNER-VANI.js",
  "APPLY-PART1366.js",
  "APPLY-PART13610.js",
  "APPLY-PART13611.js",
  "APPLY-PART13612.js",
];

console.log("\nNAXORA FINAL 136.10 ONE-ZIP INSTALL STARTED");

for (const script of scripts) {
  const file = path.join(root, script);
  if (!fs.existsSync(file)) {
    console.error(`Missing installer: ${script}`);
    process.exit(1);
  }
  console.log(`\n================ ${script} ================`);
  const result = spawnSync(process.execPath, [file], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    console.error(`\nFINAL INSTALL STOPPED AT ${script}\n`);
    process.exit(result.status || 1);
  }
}

for (const script of [
  "VERIFY-PART128.js",
  "VERIFY-PART129.js",
  "VERIFY-PART130.js",
  "VERIFY-PART131.js",
  "VERIFY-PART132.js",
  "VERIFY-PART133.js",
  "VERIFY-PART134.js",
  "VERIFY-PART135.js",
  "VERIFY-PART136.js",
  "VERIFY-NAXORA-FINAL-OWNER-VANI.js",
  "VERIFY-PART1366.js",
  "VERIFY-PART13610.js",
  "VERIFY-PART13611.js",
  "VERIFY-PART13612.js",
  "VERIFY-NAXORA-FINAL-13610.js",
]) {
  const file = path.join(root, script);
  if (!fs.existsSync(file)) {
    console.error(`Missing verifier: ${script}`);
    process.exit(1);
  }
  console.log(`\n================ ${script} ================`);
  const result = spawnSync(process.execPath, [file], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    console.error(`\nFINAL VERIFICATION STOPPED AT ${script}\n`);
    process.exit(result.status || 1);
  }
}

console.log("\n======================================================");
console.log("NAXORA FINAL 136.10 ONE-ZIP APPLIED AND VERIFIED");
console.log("Parts 128–136: PASS");
console.log("Simple Owner login and Unified App: PASS");
console.log("Razorpay Live Subscription Bridge: PASS");
console.log("Four-role dashboards and VANI runtime: PASS");
console.log("Pricing validation and fail-closed acceptance: PASS");
console.log("Embedded modules and single contextual VANI: PASS");
console.log("Final Role VANI cache and command UX: PASS");
console.log("======================================================\n");
