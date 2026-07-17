import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(root, "backend", "src", "server.js");
const part112Module = path.join(root, "backend", "src", "part112-razorpay-foundation.js");
const part113Module = path.join(root, "backend", "src", "part113-subscription-plans.js");
const part112Marker = "// ================= PART 112 — RAZORPAY TEST MODE FOUNDATION =================";
const marker = "// ================= PART 113 — NAXORA SUBSCRIPTION PLANS =================";
const block = `\n\n${marker}\nconst { registerPart113SubscriptionPlans } = await import("./part113-subscription-plans.js");\nregisterPart113SubscriptionPlans({ app });\n`;

function fail(message) {
  console.error(`\nPART 113 APPLY FAILED: ${message}\n`);
  process.exit(1);
}

if (!fs.existsSync(serverPath)) fail(`server.js not found: ${serverPath}`);
if (!fs.existsSync(part112Module)) fail("Part 112 backend module missing. Part 112 ZIP files pehle copy karo.");
if (!fs.existsSync(part113Module)) fail("Part 113 backend module missing. ZIP files dobara copy karo.");

const original = fs.readFileSync(serverPath, "utf8");
const precheck = spawnSync(process.execPath, ["--check", serverPath], { encoding: "utf8" });
if (precheck.status !== 0) {
  fail(`Existing server.js syntax already broken hai. Pehle isse fix karo; installer ne koi change nahi kiya.\n${precheck.stderr || precheck.stdout}`);
}
if (!original.includes(part112Marker)) {
  fail("Part 112 bootstrap server.js me active nahi hai. Pehle node .\\APPLY-PART112.js successful run karo.");
}
if (original.includes(marker)) {
  console.log("Part 113 bootstrap already present. No duplicate change made.");
  process.exit(0);
}

const anchors = [
  "const port = Number(process.env.PORT) || 5000;",
  "const port = process.env.PORT || 5000;",
  "await connectDB();",
];
let anchor = "";
let index = -1;
for (const candidate of anchors) {
  index = original.indexOf(candidate);
  if (index >= 0) { anchor = candidate; break; }
}
if (index < 0) fail("Safe insertion marker not found. server.js was not changed.");

const updated = `${original.slice(0, index)}${block}\n${original.slice(index)}`;
fs.writeFileSync(serverPath, updated, "utf8");
const check = spawnSync(process.execPath, ["--check", serverPath], { encoding: "utf8" });
if (check.status !== 0) {
  fs.writeFileSync(serverPath, original, "utf8");
  fail(`Part 113 syntax check failed. Original server.js restored.\n${check.stderr || check.stdout}`);
}

console.log("\nPART 113 APPLIED SUCCESSFULLY");
console.log(`Inserted before: ${anchor}`);
console.log("Syntax check: PASS");
console.log("Next: git status -> git add . -> git commit -> git push\n");
