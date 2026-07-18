import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(root, "backend/src/server.js");
const shellPath = path.join(root, "backend/src/part119-unified-app-shell.js");
const htmlPath = path.join(root, "frontend/naxora-unified-app.html");
const required = [
  "backend/src/part120-common-login.js",
  "backend/src/part124-role-consolidation.js",
  "backend/src/part128-vani-master-data-actions.js",
  "backend/src/part129-vani-bulk-import.js",
  "frontend/naxora-bulk-import-vani.html",
  "frontend/naxora-bulk-import-vani.css",
  "frontend/naxora-bulk-import-vani.js",
  "frontend/naxora-part129-global-vani-bridge.js",
];
const marker = "// ================= PART 129 — VANI BULK CSV JSON IMPORT =================";
const registration = `${marker}\nconst { registerPart129VaniBulkImport } = await import("./part129-vani-bulk-import.js");\nregisterPart129VaniBulkImport({ app });`;
const moduleStart = "  // PART 129 VANI BULK IMPORT MODULE START";
const moduleEnd = "  // PART 129 VANI BULK IMPORT MODULE END";
const moduleBlock = `${moduleStart}\n  { key: "bulk-import-vani", label: "VANI Bulk Import", description: "CSV/JSON mapping, duplicate validation, confirmed import and rollback.", category: "AI & VANI", route: "/bulk-import-vani", icon: "manage", roles: OWNER_ONLY_ROLES, alwaysAvailable: true, order: 319 },\n${moduleEnd}`;
const aliasStart = "  // PART 129 VANI BULK IMPORT ALIASES START";
const aliasEnd = "  // PART 129 VANI BULK IMPORT ALIASES END";
const aliasBlock = `${aliasStart}\n  "bulk import": "bulk-import-vani",\n  "csv import": "bulk-import-vani",\n  "json import": "bulk-import-vani",\n  "excel import": "bulk-import-vani",\n  "upload data": "bulk-import-vani",\n  "import students": "bulk-import-vani",\n  "import teachers": "bulk-import-vani",\n  "part 129": "bulk-import-vani",\n${aliasEnd}`;

function fail(message) { console.error(`\nPART 129 APPLY FAILED: ${message}\n`); process.exit(1); }
function check(file) { return spawnSync(process.execPath, ["--check", file], { encoding: "utf8" }); }
function removeBetween(source, start, end) {
  const a = start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const b = end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.replace(new RegExp(`\\s*${a}[\\s\\S]*?${b}\\s*`, "g"), "\n");
}
function registrationEnd(source, call) { const index = source.indexOf(call); return index < 0 ? -1 : index + call.length; }
function notFoundIndex(source) { let index = source.indexOf("app.use(notFound);"); if (index < 0) index = source.indexOf("app.use(notFound)"); return index; }

for (const rel of required) if (!fs.existsSync(path.join(root, rel))) fail(`Required file missing: ${rel}`);
for (const file of [serverPath, shellPath]) {
  const result = check(file);
  if (result.status !== 0) fail(`${path.relative(root, file)} syntax is broken before Part 129.`);
}
const original = {
  server: fs.readFileSync(serverPath, "utf8"),
  shell: fs.readFileSync(shellPath, "utf8"),
  html: fs.readFileSync(htmlPath, "utf8"),
};
let server = original.server;
const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
server = server.replace(new RegExp(`\\n*${escaped}\\nconst \\{ registerPart129VaniBulkImport \\} = await import\\("\\.\\/part129-vani-bulk-import\\.js"\\);\\nregisterPart129VaniBulkImport\\(\\{ app \\}\\);\\n*`, "g"), "\n\n");
const part128End = registrationEnd(server, "registerPart128VaniMasterDataActions({ app });");
if (part128End < 0) fail("Part 128 registration call not found. Apply and verify Part 128 first.");
server = `${server.slice(0, part128End)}\n\n${registration}${server.slice(part128End)}`;

let shell = removeBetween(original.shell, moduleStart, moduleEnd);
shell = removeBetween(shell, aliasStart, aliasEnd);
const moduleAnchor = "  // PART 128 VANI MASTER DATA MODULE END";
const aliasAnchor = "  // PART 128 VANI MASTER DATA ALIASES END";
if (!shell.includes(moduleAnchor)) fail("Part 128 shell module marker missing.");
if (!shell.includes(aliasAnchor)) fail("Part 128 shell alias marker missing.");
shell = shell.replace(moduleAnchor, `${moduleAnchor}\n${moduleBlock}`);
shell = shell.replace(aliasAnchor, `${aliasAnchor}\n${aliasBlock}`);

let html = original.html.replace(/\s*<article><strong>129<\/strong><span>.*?<\/span><\/article>/g, "");
if (!html.includes("<strong>129</strong><span>VANI bulk import</span>")) {
  const anchor = /(<article><strong>128<\/strong><span>.*?<\/span><\/article>)/;
  if (!anchor.test(html)) fail("Part 128 progress card missing in unified app HTML.");
  html = html.replace(anchor, `$1\n            <article><strong>129</strong><span>VANI bulk import</span></article>`);
}
html = html
  .replace(/Part 128 VANI master-data actions active hain\. Bulk import Part 129 me hoga\./g, "Part 129 VANI CSV/JSON bulk import active hai: mapping, validation, duplicate control, confirmed execution aur rollback.")
  .replace(/Part 128 • 9 operational \+ 14 master-data VANI actions/g, "Part 129 • 9 operational + 14 master-data + CSV/JSON bulk import");
if (!html.includes("/naxora-part129-global-vani-bridge.js")) {
  const bridgeAnchor = '<script src="/naxora-part128-global-vani-bridge.js"></script>';
  if (!html.includes(bridgeAnchor)) fail("Part 128 Global VANI bridge anchor missing.");
  html = html.replace(bridgeAnchor, '<script src="/naxora-part129-global-vani-bridge.js"></script>\n  ' + bridgeAnchor);
}

fs.writeFileSync(serverPath, server, "utf8");
fs.writeFileSync(shellPath, shell, "utf8");
fs.writeFileSync(htmlPath, html, "utf8");
for (const file of [serverPath, shellPath]) {
  const result = check(file);
  if (result.status !== 0) {
    fs.writeFileSync(serverPath, original.server, "utf8");
    fs.writeFileSync(shellPath, original.shell, "utf8");
    fs.writeFileSync(htmlPath, original.html, "utf8");
    fail(`Syntax check failed after Part 129 integration. Originals restored.\n${result.stderr || result.stdout}`);
  }
}
const finalServer = fs.readFileSync(serverPath, "utf8");
const finalShell = fs.readFileSync(shellPath, "utf8");
const finalHtml = fs.readFileSync(htmlPath, "utf8");
const p128 = finalServer.indexOf("PART 128 — VANI MASTER DATA ACTIONS");
const p129 = finalServer.indexOf("PART 129 — VANI BULK CSV JSON IMPORT");
const p112 = finalServer.indexOf("PART 112 — RAZORPAY TEST MODE FOUNDATION");
const p404 = notFoundIndex(finalServer);
const valid = p128 >= 0 && p129 > p128 && p112 > p129 && p404 > p112 &&
  finalShell.includes('key: "bulk-import-vani"') &&
  finalShell.includes('"part 129": "bulk-import-vani"') &&
  finalHtml.includes('/naxora-part129-global-vani-bridge.js') &&
  finalHtml.indexOf('/naxora-part129-global-vani-bridge.js') < finalHtml.indexOf('/naxora-part128-global-vani-bridge.js') &&
  finalHtml.includes("<strong>129</strong><span>VANI bulk import</span>");
if (!valid) {
  fs.writeFileSync(serverPath, original.server, "utf8");
  fs.writeFileSync(shellPath, original.shell, "utf8");
  fs.writeFileSync(htmlPath, original.html, "utf8");
  fail("Integration verification failed. Originals restored.");
}
console.log("\nPART 129 APPLIED SUCCESSFULLY");
console.log("Part 129 registered after Part 128: PASS");
console.log("Part 129 registered before Parts 112–119 routes: PASS");
console.log("Part 119 VANI Bulk Import module added: PASS");
console.log("Part 119 bulk-import aliases added: PASS");
console.log("Global VANI Part 129 bridge added before Part 128 bridge: PASS");
console.log("Unified app Part 129 progress and boundary updated: PASS");
console.log("server.js syntax: PASS");
console.log("Next: node .\\VERIFY-PART129.js\n");
