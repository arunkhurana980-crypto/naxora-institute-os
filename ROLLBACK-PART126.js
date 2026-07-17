import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(root, "backend", "src", "server.js");
const shellBackendPath = path.join(root, "backend", "src", "part119-unified-app-shell.js");
const shellHtmlPath = path.join(root, "frontend", "naxora-unified-app.html");

const marker = "// ================= PART 126 — NATIVE ADAPTERS AND CROSS MODULE E2E =================";
const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const pattern = new RegExp(
  `\\n*${escaped}\\nconst \\{ registerPart126NativeE2E \\} = await import\\("\\.\\/part126-native-e2e-integration\\.js"\\);\\nregisterPart126NativeE2E\\(\\{ app \\}\\);\\n*`,
  "g"
);
const moduleStart = "  // PART 126 INTEGRATION CENTRE MODULE START";
const moduleEnd = "  // PART 126 INTEGRATION CENTRE MODULE END";
const aliasStart = "  // PART 126 INTEGRATION CENTRE ALIASES START";
const aliasEnd = "  // PART 126 INTEGRATION CENTRE ALIASES END";

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
let html = originals.html
  .replace(/\s*<article><strong>126<\/strong><span>Native E2E<\/span><\/article>\s*/g, "\n")
  .replace(
    "Part 126 native adapters, in-app notifications aur provider-aware delivery active hai. Final production acceptance Part 127 me hogi.",
    "Part 125 preview, exact confirmation aur canonical execution active hai. Native module/provider delivery Part 126 adapters se complete hogi."
  )
  .replace("Part 126 native action + navigation mode", "Part 125 action + navigation mode");

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
console.log("Part 126 registration and Part 119/HTML integration removed.");
