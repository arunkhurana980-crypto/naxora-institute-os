import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(root, "backend", "src", "server.js");
const shellBackendPath = path.join(root, "backend", "src", "part119-unified-app-shell.js");
const shellHtmlPath = path.join(root, "frontend", "naxora-unified-app.html");

const marker = "// ================= PART 127 — FINAL DEMO ACCEPTANCE AND PROJECT FREEZE =================";
const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const pattern = new RegExp(
  `\\n*${escapedMarker}\\nconst \\{ registerPart127FinalAcceptance \\} = await import\\("\\.\\/part127-final-acceptance-freeze\\.js"\\);\\nregisterPart127FinalAcceptance\\(\\{ app \\}\\);\\n*`,
  "g"
);
const moduleStart = "  // PART 127 FINAL ACCEPTANCE MODULE START";
const moduleEnd = "  // PART 127 FINAL ACCEPTANCE MODULE END";
const aliasStart = "  // PART 127 FINAL ACCEPTANCE ALIASES START";
const aliasEnd = "  // PART 127 FINAL ACCEPTANCE ALIASES END";

function removeBetween(source, start, end) {
  const escapedStart = start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedEnd = end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.replace(
    new RegExp(`\\s*${escapedStart}[\\s\\S]*?${escapedEnd}\\s*`, "g"),
    "\n"
  );
}

const originals = {
  server: fs.readFileSync(serverPath, "utf8"),
  shell: fs.readFileSync(shellBackendPath, "utf8"),
  html: fs.readFileSync(shellHtmlPath, "utf8"),
};

const server = originals.server.replace(pattern, "\n\n");
let shell = removeBetween(originals.shell, moduleStart, moduleEnd);
shell = removeBetween(shell, aliasStart, aliasEnd);

let html = originals.html
  .replace(
    "<article><strong>127</strong><span>Final Demo Freeze</span></article>",
    "<article><strong>127</strong><span>Production launch</span></article>"
  )
  .replace(
    "Part 127 final linked demo importer, Demo/Beta acceptance aur release freeze active hai. All-feature VANI automation claim nahi kiya gaya.",
    "Part 126 native adapters, in-app notifications aur provider-aware delivery active hai. Final production acceptance Part 127 me hogi."
  )
  .replace(
    "Part 127 final demo mode • 9 native VANI actions",
    "Part 126 native action + navigation mode"
  );

fs.writeFileSync(serverPath, server, "utf8");
fs.writeFileSync(shellBackendPath, shell, "utf8");
fs.writeFileSync(shellHtmlPath, html, "utf8");

for (const file of [serverPath, shellBackendPath]) {
  const check = spawnSync(process.execPath, ["--check", file], {
    encoding: "utf8",
  });
  if (check.status !== 0) {
    fs.writeFileSync(serverPath, originals.server, "utf8");
    fs.writeFileSync(shellBackendPath, originals.shell, "utf8");
    fs.writeFileSync(shellHtmlPath, originals.html, "utf8");
    console.error("Rollback syntax failed; original files restored.");
    process.exit(1);
  }
}

console.log("Part 127 registration and Part 119/HTML final integration removed.");
