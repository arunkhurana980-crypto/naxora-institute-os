import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(root, "backend", "src", "server.js");
const pattern = /\n*\/\/ ================= PART 113 — NAXORA SUBSCRIPTION PLANS =================\nconst \{ registerPart113SubscriptionPlans \} = await import\("\.\/part113-subscription-plans\.js"\);\nregisterPart113SubscriptionPlans\(\{ app \}\);\n*/g;

if (!fs.existsSync(serverPath)) {
  console.error("server.js not found.");
  process.exit(1);
}
const original = fs.readFileSync(serverPath, "utf8");
const updated = original.replace(pattern, "\n\n");
if (updated === original) {
  console.log("Part 113 bootstrap not found. No change made.");
  process.exit(0);
}
fs.writeFileSync(serverPath, updated, "utf8");
const check = spawnSync(process.execPath, ["--check", serverPath], { encoding: "utf8" });
if (check.status !== 0) {
  fs.writeFileSync(serverPath, original, "utf8");
  console.error("Rollback syntax failed; original file restored.");
  process.exit(1);
}
console.log("Part 113 bootstrap removed successfully.");
