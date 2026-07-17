import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(root, "backend", "src", "server.js");
const shellBackendPath = path.join(root, "backend", "src", "part119-unified-app-shell.js");
const marker = "// ================= PART 121 — OWNER MODULE CONSOLIDATION =================";
const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const pattern = new RegExp(`\\n*${escaped}\\nconst \\{ registerPart121OwnerConsolidation \\} = await import\\("\\.\\/part121-owner-consolidation\\.js"\\);\\nregisterPart121OwnerConsolidation\\(\\{ app \\}\\);\\n*`, "g");

const originals = {
  server: fs.readFileSync(serverPath, "utf8"),
  shell: fs.readFileSync(shellBackendPath, "utf8"),
};
let server = originals.server.replace(pattern, "\n\n");
let shell = originals.shell
  .replace('label: "Owner Workspace",', 'label: "Institute Owner",')
  .replace('description: "Unified owner overview, account access, institute operations and business controls.",', 'description: "Owner operations, institute overview and administrative controls.",')
  .replace('route: "/owner-workspace",', 'route: "/institute-owner-app",')
  .replace('  accounts: "account-access",\n  "account manager": "account-access",\n', "");

shell = shell.replace(
  /\s*{\n\s*key: "account-access",[\s\S]*?order: 25,\n\s*},\n(?=\s*{\n\s*key: "teacher-app",)/,
  "\n"
);

fs.writeFileSync(serverPath, server, "utf8");
fs.writeFileSync(shellBackendPath, shell, "utf8");
for (const file of [serverPath, shellBackendPath]) {
  const check = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (check.status !== 0) {
    fs.writeFileSync(serverPath, originals.server, "utf8");
    fs.writeFileSync(shellBackendPath, originals.shell, "utf8");
    console.error("Rollback syntax failed; original files restored.");
    process.exit(1);
  }
}
console.log("Part 121 registration and Part 119 owner-workspace patch removed.");
