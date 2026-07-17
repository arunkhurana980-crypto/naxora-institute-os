import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(root, "backend", "src", "server.js");
const marker = "// ================= PART 117 — VANI SUBSCRIPTION MANAGER =================";
const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const pattern = new RegExp(`\\n*${escaped}\\nconst \\{ registerPart117VaniSubscriptionManager \\} = await import\\("\\.\\/part117-vani-subscription-manager\\.js"\\);\\nregisterPart117VaniSubscriptionManager\\(\\{ app \\}\\);\\n*`, "g");

if (!fs.existsSync(serverPath)) process.exit(1);
const original = fs.readFileSync(serverPath, "utf8");
const updated = original.replace(pattern, "\n\n");
if (updated === original) {
  console.log("Part 117 registration not found. No change made.");
  process.exit(0);
}
fs.writeFileSync(serverPath, updated, "utf8");
const check = spawnSync(process.execPath, ["--check", serverPath], { encoding: "utf8" });
if (check.status !== 0) {
  fs.writeFileSync(serverPath, original, "utf8");
  console.error("Rollback syntax failed; original server.js restored.");
  process.exit(1);
}
console.log("Part 117 registration removed successfully.");
