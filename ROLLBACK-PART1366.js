import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(root, "backend/src/server.js");
const part116Path = path.join(root, "backend/src/part116-subscription-access-control.js");
const part119Path = path.join(root, "backend/src/part119-unified-app-shell.js");

const REG_MARKER = "// ================= PART 136.6 — LIVE SUBSCRIPTION REVENUE BRIDGE =================";
const MODULE_START = "  // PART 136.6 LIVE SUBSCRIPTION MODULE START";
const MODULE_END = "  // PART 136.6 LIVE SUBSCRIPTION MODULE END";
const ALIAS_START = "  // PART 136.6 LIVE SUBSCRIPTION ALIASES START";
const ALIAS_END = "  // PART 136.6 LIVE SUBSCRIPTION ALIASES END";
const ACCESS_START = "  // PART 136.6 LIVE ACCESS EVIDENCE START";
const ACCESS_END = "  // PART 136.6 LIVE ACCESS EVIDENCE END";

function esc(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function removeBetween(source, start, end) {
  return source.replace(
    new RegExp(`\\s*${esc(start)}[\\s\\S]*?${esc(end)}\\s*`, "g"),
    "\n"
  );
}

let server = fs.readFileSync(serverPath, "utf8");
server = server.replace(
  new RegExp(
    `\\n*${esc(REG_MARKER)}\\nconst \\{ registerPart1366LiveSubscriptionRevenue \\} = await import\\("\\.\\/part1366-live-subscription-revenue\\.js"\\);\\nregisterPart1366LiveSubscriptionRevenue\\(\\{ app \\}\\);\\n*`,
    "g"
  ),
  "\n\n"
);

let part119 = fs.readFileSync(part119Path, "utf8");
part119 = removeBetween(part119, MODULE_START, MODULE_END);
part119 = removeBetween(part119, ALIAS_START, ALIAS_END);

const backupPath = path.join(root, ".part1366-backup", "part116-subscription-access-control.js");
if (!fs.existsSync(backupPath)) {
  console.error("Part 116 pre-Part136.6 backup missing. Safe rollback stopped.");
  process.exit(1);
}
const part116Backup = fs.readFileSync(backupPath, "utf8");

fs.writeFileSync(serverPath, server, "utf8");
fs.writeFileSync(part119Path, part119, "utf8");
fs.writeFileSync(part116Path, part116Backup, "utf8");

for (const file of [serverPath, part116Path, part119Path]) {
  const result = spawnSync(process.execPath, ["--check", file], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    process.exit(1);
  }
}

console.log("Part 136.6 registration, module and Live access patch removed.");
console.log("MongoDB Live Subscription and webhook records were not deleted.");
