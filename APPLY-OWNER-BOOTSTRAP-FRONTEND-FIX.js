import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(root, "frontend/naxora-owner-bootstrap.html");
const jsPath = path.join(root, "frontend/naxora-owner-bootstrap.js");
const backupDir = path.join(root, ".owner-bootstrap-frontend-fix-backup");

function fail(message) {
  console.error(`\nOWNER BOOTSTRAP FRONTEND FIX FAILED: ${message}\n`);
  process.exit(1);
}

for (const file of [htmlPath, jsPath]) {
  if (!fs.existsSync(file)) fail(`Missing file: ${path.relative(root, file)}`);
}

const syntax = spawnSync(process.execPath, ["--check", jsPath], { encoding: "utf8" });
if (syntax.status !== 0) fail(syntax.stderr || syntax.stdout);

const js = fs.readFileSync(jsPath, "utf8");
for (const required of ["TICKET_KEY", "x-naxora-bootstrap-ticket", "history.replaceState", 'b.textContent="Ticket"']) {
  if (!js.includes(required)) fail(`Latest signed-ticket frontend marker missing: ${required}`);
}

fs.mkdirSync(backupDir, { recursive: true });
const htmlBackup = path.join(backupDir, "naxora-owner-bootstrap.html");
if (!fs.existsSync(htmlBackup)) fs.copyFileSync(htmlPath, htmlBackup);

let html = fs.readFileSync(htmlPath, "utf8");
html = html.replace(
  /<script\s+src=["']\/naxora-owner-bootstrap\.js(?:\?[^"']*)?["']\s*><\/script>/gi,
  '<script src="/naxora-owner-bootstrap.js?v=13631-final"></script>'
);

if (!html.includes('/naxora-owner-bootstrap.js?v=13631-final')) {
  if (!html.includes("</body>")) fail("Closing </body> not found.");
  html = html.replace(
    "</body>",
    '  <script src="/naxora-owner-bootstrap.js?v=13631-final"></script>\n</body>'
  );
}

fs.writeFileSync(htmlPath, html, "utf8");

const finalHtml = fs.readFileSync(htmlPath, "utf8");
if (!finalHtml.includes('/naxora-owner-bootstrap.js?v=13631-final')) {
  fs.copyFileSync(htmlBackup, htmlPath);
  fail("Cache-busted script URL was not saved. Original HTML restored.");
}

console.log("\nOWNER BOOTSTRAP FRONTEND FIX APPLIED SUCCESSFULLY");
console.log("Latest signed-ticket JavaScript: PASS");
console.log("Cache-busted script URL: PASS");
console.log("Ticket URL cleanup code: PASS");
console.log("Ticket mode UI code: PASS\n");
