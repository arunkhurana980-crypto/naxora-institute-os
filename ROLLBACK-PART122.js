import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(root, "backend", "src", "server.js");
const shellBackendPath = path.join(root, "backend", "src", "part119-unified-app-shell.js");
const marker = "// ================= PART 122 — TEACHER MODULE CONSOLIDATION =================";
const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const pattern = new RegExp(`\\n*${escaped}\\nconst \\{ registerPart122TeacherConsolidation \\} = await import\\("\\.\\/part122-teacher-consolidation\\.js"\\);\\nregisterPart122TeacherConsolidation\\(\\{ app \\}\\);\\n*`, "g");

const originals = {
  server: fs.readFileSync(serverPath, "utf8"),
  shell: fs.readFileSync(shellBackendPath, "utf8"),
};

const server = originals.server.replace(pattern, "\n\n");
const shell = originals.shell
  .replace('label: "Teacher Workspace",', 'label: "Teacher App",')
  .replace(
    'description: "Unified classes, attendance, reports, live classroom, AI notes and teacher workflows.",',
    'description: "Classes, attendance, assignments, notes and teacher workflows.",'
  )
  .replace('route: "/teacher-workspace",', 'route: "/teacher-app",')
  .replace('  "teacher workspace": "teacher-app",\n', "");

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

console.log("Part 122 registration and Part 119 Teacher Workspace patch removed.");
