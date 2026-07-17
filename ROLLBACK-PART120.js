import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(root, "backend", "src", "server.js");
const shellBackendPath = path.join(root, "backend", "src", "part119-unified-app-shell.js");
const shellHtmlPath = path.join(root, "frontend", "naxora-unified-app.html");
const marker = "// ================= PART 120 — COMMON LOGIN JWT AND ROLE ROUTING =================";
const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const pattern = new RegExp(`\\n*${escaped}\\nconst \\{ registerPart120CommonLogin \\} = await import\\("\\.\\/part120-common-login\\.js"\\);\\nregisterPart120CommonLogin\\(\\{ app \\}\\);\\n*`, "g");

const originals = {
  server: fs.readFileSync(serverPath, "utf8"),
  shellBackend: fs.readFileSync(shellBackendPath, "utf8"),
  shellHtml: fs.readFileSync(shellHtmlPath, "utf8"),
};
const server = originals.server.replace(pattern, "\n\n");
const shellBackend = originals.shellBackend
  .replace("commonLoginIntegrated: true,", "commonLoginIntegrated: false,")
  .replace("commonLoginTargetPart: null,", "commonLoginTargetPart: 120,")
  .replace("commonLoginPendingPart120: false,", "commonLoginPendingPart120: true,")
  .replace("commonLoginReady: true,", "commonLoginReady: false,");
const shellHtml = originals.shellHtml
  .replace(/\s*<script src="\/naxora-common-session\.js"><\/script>\s*/g, "\n  ")
  .replace("Common login active hai; sign in ke baad role-safe modules automatically load honge.", "Common login Part 120 me isi screen ke saath connect hoga.")
  .replace("Account Session", "Connect Existing Login");

fs.writeFileSync(serverPath, server, "utf8");
fs.writeFileSync(shellBackendPath, shellBackend, "utf8");
fs.writeFileSync(shellHtmlPath, shellHtml, "utf8");

for (const file of [serverPath, shellBackendPath]) {
  const check = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (check.status !== 0) {
    fs.writeFileSync(serverPath, originals.server, "utf8");
    fs.writeFileSync(shellBackendPath, originals.shellBackend, "utf8");
    fs.writeFileSync(shellHtmlPath, originals.shellHtml, "utf8");
    console.error("Rollback syntax failed; original files restored.");
    process.exit(1);
  }
}
console.log("Part 120 registration and Part 119 login integration removed.");
