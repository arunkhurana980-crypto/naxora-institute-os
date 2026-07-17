import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(root, "backend", "src", "server.js");
const shellBackendPath = path.join(root, "backend", "src", "part119-unified-app-shell.js");

const marker = "// ================= PART 124 — PARENT STAFF AND BRANCH ROLE CONSOLIDATION =================";
const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const pattern = new RegExp(`\\n*${escaped}\\nconst \\{ registerPart124RoleConsolidation \\} = await import\\("\\.\\/part124-role-consolidation\\.js"\\);\\nregisterPart124RoleConsolidation\\(\\{ app \\}\\);\\n*`, "g");

const moduleStart = "  // PART 124 ROLE WORKSPACE MODULES START";
const moduleEnd = "  // PART 124 ROLE WORKSPACE MODULES END";
const aliasStart = "  // PART 124 ROLE WORKSPACE ALIASES START";
const aliasEnd = "  // PART 124 ROLE WORKSPACE ALIASES END";

function removeBetween(source, start, end) {
  const escapedStart = start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedEnd = end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.replace(new RegExp(`\\s*${escapedStart}[\\s\\S]*?${escapedEnd}\\s*`, "g"), "\n");
}

const originals = {
  server: fs.readFileSync(serverPath, "utf8"),
  shell: fs.readFileSync(shellBackendPath, "utf8"),
};

const server = originals.server.replace(pattern, "\n\n");
let shell = removeBetween(originals.shell, moduleStart, moduleEnd);
shell = removeBetween(shell, aliasStart, aliasEnd);
shell = shell
  .replace('label: "Parent Workspace",', 'label: "Parent App",')
  .replace(
    'description: "Unified child progress, attendance, fee context and Parent VANI."',
    'description: "Child progress, attendance, fees and safe parent updates.",'
  )
  .replace('route: "/parent-workspace",', 'route: "/parent-app",')
  .replace('  "parent workspace": "parent-app",\n', "");

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

console.log("Part 124 registration and Part 119 role-workspace patches removed.");
