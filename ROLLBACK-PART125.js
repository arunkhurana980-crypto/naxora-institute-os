import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(root, "backend", "src", "server.js");
const shellBackendPath = path.join(root, "backend", "src", "part119-unified-app-shell.js");
const shellHtmlPath = path.join(root, "frontend", "naxora-unified-app.html");

const marker = "// ================= PART 125 — GLOBAL VANI MULTI STEP ACTIONS =================";
const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const pattern = new RegExp(`\\n*${escaped}\\nconst \\{ registerPart125GlobalVaniActions \\} = await import\\("\\.\\/part125-global-vani-actions\\.js"\\);\\nregisterPart125GlobalVaniActions\\(\\{ app \\}\\);\\n*`, "g");
const moduleStart = "  // PART 125 GLOBAL VANI ACTION MODULE START";
const moduleEnd = "  // PART 125 GLOBAL VANI ACTION MODULE END";
const aliasStart = "  // PART 125 GLOBAL VANI ACTION ALIASES START";
const aliasEnd = "  // PART 125 GLOBAL VANI ACTION ALIASES END";

function removeBetween(source, start, end) {
  const escapedStart = start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedEnd = end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.replace(new RegExp(`\\s*${escapedStart}[\\s\\S]*?${escapedEnd}\\s*`, "g"), "\n");
}

const originals = {
  server: fs.readFileSync(serverPath, "utf8"),
  shell: fs.readFileSync(shellBackendPath, "utf8"),
  html: fs.readFileSync(shellHtmlPath, "utf8"),
};

const server = originals.server.replace(pattern, "\n\n");
let shell = removeBetween(originals.shell, moduleStart, moduleEnd);
shell = removeBetween(shell, aliasStart, aliasEnd);
const html = originals.html
  .replace(/\s*<script src="\/naxora-part125-global-vani-bridge\.js"><\/script>\s*/g, "\n  ")
  .replace("Part 125 action + navigation mode", "Part 119 navigation mode")
  .replace(
    "Namaste. Module kholne ke saath attendance, fee reminder, admission follow-up, assignment aur message actions ka preview bhi bana sakti hoon.",
    "Namaste. Module ka naam bolkar “kholo” kahiye, jaise “VANI, fees kholo”."
  )
  .replace(
    "Current boundary:</strong> Part 125 preview, exact confirmation aur canonical execution active hai. Native module/provider delivery Part 126 adapters se complete hogi.",
    "Current boundary:</strong> Part 119 VANI modules search/open karegi. Admission, fees, attendance, CRM aur other multi-step work Part 125 me global orchestration ke saath connect hoga."
  );

fs.writeFileSync(serverPath, server, "utf8");
fs.writeFileSync(shellBackendPath, shell, "utf8");
fs.writeFileSync(shellHtmlPath, html, "utf8");

for (const file of [serverPath, shellBackendPath]) {
  const check = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (check.status !== 0) {
    fs.writeFileSync(serverPath, originals.server, "utf8");
    fs.writeFileSync(shellBackendPath, originals.shell, "utf8");
    fs.writeFileSync(shellHtmlPath, originals.html, "utf8");
    console.error("Rollback syntax failed; original files restored.");
    process.exit(1);
  }
}

console.log("Part 125 registration, shell module and Global VANI bridge removed.");
