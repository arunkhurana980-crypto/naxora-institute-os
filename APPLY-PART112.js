import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(root, "backend", "src", "server.js");
const modulePath = path.join(root, "backend", "src", "part112-razorpay-foundation.js");
const marker = "// ================= PART 112 — RAZORPAY TEST MODE FOUNDATION =================";
const block = `

${marker}
const { registerPart112RazorpayFoundation } = await import("./part112-razorpay-foundation.js");
registerPart112RazorpayFoundation({ app });
`;

function fail(message) {
  console.error(`\nPART 112 APPLY FAILED: ${message}\n`);
  process.exit(1);
}

if (!fs.existsSync(serverPath)) fail(`server.js not found: ${serverPath}`);
if (!fs.existsSync(modulePath)) fail(`Part 112 backend module not found: ${modulePath}`);

const original = fs.readFileSync(serverPath, "utf8");
if (original.includes(marker)) {
  console.log("Part 112 bootstrap already present. No duplicate change made.");
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
  if (index >= 0) {
    anchor = candidate;
    break;
  }
}

if (index < 0) fail("Safe insertion marker not found. server.js was not changed.");

const updated = `${original.slice(0, index)}${block}\n${original.slice(index)}`;
fs.writeFileSync(serverPath, updated, "utf8");

const check = spawnSync(process.execPath, ["--check", serverPath], { encoding: "utf8" });

if (check.status !== 0) {
  fs.writeFileSync(serverPath, original, "utf8");
  fail(`Syntax check failed. Original server.js restored.\n${check.stderr || check.stdout}`);
}

console.log("\nPART 112 APPLIED SUCCESSFULLY");
console.log(`Inserted before: ${anchor}`);
console.log("Syntax check: PASS");
console.log("Next: git status -> git add . -> git commit -> git push\n");
