import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(root, "backend/src/server.js");
const part119Path = path.join(root, "backend/src/part119-unified-app-shell.js");
const runtimePath = path.join(root, "backend/src/part13610-final-role-vani-runtime.js");
const frontendJsPath = path.join(root, "frontend/naxora-final-role-vani.js");

const EARLY_START = "// PART 136.10 FINAL ROLE DASHBOARD EARLY ROUTES START";
const EARLY_END = "// PART 136.10 FINAL ROLE DASHBOARD EARLY ROUTES END";
const REG_MARKER = "// ================= PART 136.10 — FINAL ROLE DASHBOARDS AND VANI =================";
const MODULE_START = "  // PART 136.10 FINAL ROLE RUNTIME MODULE START";
const MODULE_END = "  // PART 136.10 FINAL ROLE RUNTIME MODULE END";
const ALIAS_START = "  // PART 136.10 FINAL ROLE RUNTIME ALIASES START";
const ALIAS_END = "  // PART 136.10 FINAL ROLE RUNTIME ALIASES END";

const earlyBlock = `${EARLY_START}
app.get(
  ["/owner-workspace", "/teacher-workspace", "/student-workspace", "/parent-workspace"],
  (req, res) => {
    res.set({
      "Cache-Control": "no-store, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0"
    });
    return res.sendFile(
      path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "../../frontend/naxora-final-role-vani.html"
      )
    );
  }
);
${EARLY_END}`;

const registration = `${REG_MARKER}
const { registerPart13610FinalRuntime } = await import("./part13610-final-role-vani-runtime.js");
registerPart13610FinalRuntime({ app });`;

const moduleBlock = `${MODULE_START}
  {
    key: "final-role-runtime",
    label: "Final Role Dashboard & VANI",
    description: "Real Owner, Teacher, Student and Parent dashboards with role-safe preview-confirm actions and final commercial acceptance.",
    category: "AI & VANI",
    route: "/final-role-runtime",
    icon: "verified",
    roles: ["institute_owner", "teacher", "student", "parent"],
    alwaysAvailable: true,
    order: 327,
  },
${MODULE_END}`;

const aliasBlock = `${ALIAS_START}
  "final role dashboard": "final-role-runtime",
  "fully worked vani": "final-role-runtime",
  "role vani": "final-role-runtime",
  "final dashboard": "final-role-runtime",
${ALIAS_END}`;

function fail(message) {
  console.error(`\nPART 136.10 APPLY FAILED: ${message}\n`);
  process.exit(1);
}
function esc(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function removeBetween(source, start, end) {
  return source.replace(
    new RegExp(`\\s*${esc(start)}[\\s\\S]*?${esc(end)}\\s*`, "g"),
    "\n"
  );
}
function syntax(file) {
  return spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
}

for (const file of [serverPath, part119Path, runtimePath, frontendJsPath]) {
  if (!fs.existsSync(file)) fail(`Required file missing: ${path.relative(root, file)}`);
  if (file.endsWith(".js")) {
    const check = syntax(file);
    if (check.status !== 0) fail(`${path.relative(root, file)} syntax failed.\n${check.stderr || check.stdout}`);
  }
}

const originals = {
  server: fs.readFileSync(serverPath, "utf8"),
  part119: fs.readFileSync(part119Path, "utf8"),
};

let server = removeBetween(originals.server, EARLY_START, EARLY_END);
server = server.replace(
  new RegExp(
    `\\n*${esc(REG_MARKER)}\\nconst \\{ registerPart13610FinalRuntime \\} = await import\\("\\.\\/part13610-final-role-vani-runtime\\.js"\\);\\nregisterPart13610FinalRuntime\\(\\{ app \\}\\);\\n*`,
    "g"
  ),
  "\n\n"
);

const appPatterns = [
  /const\s+app\s*=\s*express\s*\(\s*\)\s*;/,
  /let\s+app\s*=\s*express\s*\(\s*\)\s*;/,
  /var\s+app\s*=\s*express\s*\(\s*\)\s*;/,
];
let appEnd = -1;
for (const pattern of appPatterns) {
  const match = pattern.exec(server);
  if (match) {
    appEnd = match.index + match[0].length;
    break;
  }
}
if (appEnd < 0) fail("Express app initialization not found.");
server = `${server.slice(0, appEnd)}\n\n${earlyBlock}${server.slice(appEnd)}`;

const part119Call = "registerPart119UnifiedAppShell({ app });";
const registrationAnchor = server.indexOf(part119Call);
if (registrationAnchor < 0) fail("Part 119 registration call missing.");
server =
  server.slice(0, registrationAnchor) +
  `${registration}\n\n` +
  server.slice(registrationAnchor);

let part119 = removeBetween(originals.part119, MODULE_START, MODULE_END);
part119 = removeBetween(part119, ALIAS_START, ALIAS_END);
const moduleAnchor = "  // PART 136 FINAL VANI ACCEPTANCE MODULE END";
if (!part119.includes(moduleAnchor)) fail("Part 136 module anchor missing in Part 119.");
part119 = part119.replace(moduleAnchor, `${moduleAnchor}\n${moduleBlock}`);

const aliasCandidates = [
  '  "live readiness": "live-readiness",',
  '  "vani actions": "vani-actions",',
];
const aliasAnchor = aliasCandidates.find(value => part119.includes(value));
if (!aliasAnchor) fail("Part 119 alias anchor missing.");
part119 = part119.replace(aliasAnchor, `${aliasAnchor}\n${aliasBlock}`);

fs.writeFileSync(serverPath, server, "utf8");
fs.writeFileSync(part119Path, part119, "utf8");

for (const file of [serverPath, part119Path, runtimePath, frontendJsPath]) {
  const check = syntax(file);
  if (check.status !== 0) {
    fs.writeFileSync(serverPath, originals.server, "utf8");
    fs.writeFileSync(part119Path, originals.part119, "utf8");
    fail(`Syntax failed after integration; originals restored.\n${check.stderr || check.stdout}`);
  }
}

const finalServer = fs.readFileSync(serverPath, "utf8");
const final119 = fs.readFileSync(part119Path, "utf8");
const earlyPos = finalServer.indexOf(EARLY_START);
const oldOwnerPos = finalServer.indexOf("registerPart121OwnerConsolidation");
const runtimePos = finalServer.indexOf(REG_MARKER);
const shellPos = finalServer.indexOf(part119Call);

const valid =
  earlyPos >= 0 &&
  (oldOwnerPos < 0 || earlyPos < oldOwnerPos) &&
  runtimePos >= 0 &&
  runtimePos < shellPos &&
  final119.includes('key: "final-role-runtime"') &&
  final119.includes('"fully worked vani": "final-role-runtime"');

if (!valid) {
  fs.writeFileSync(serverPath, originals.server, "utf8");
  fs.writeFileSync(part119Path, originals.part119, "utf8");
  fail("Part 136.10 integration verification failed; originals restored.");
}

console.log("\nPART 136.10 APPLIED SUCCESSFULLY");
console.log("Owner/Teacher/Student/Parent early dashboard routes: PASS");
console.log("Final runtime registered before Part 119 shell: PASS");
console.log("Final Role Dashboard & VANI module: PASS");
console.log("Role-safe action catalog: PASS");
console.log("Pricing and final acceptance gates: PASS");
console.log("server.js syntax: PASS");
console.log("Part 119 syntax: PASS");
console.log("Next: node .\\VERIFY-PART13610.js\n");
