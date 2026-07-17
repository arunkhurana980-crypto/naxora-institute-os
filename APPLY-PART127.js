import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(root, "backend", "src", "server.js");
const shellBackendPath = path.join(root, "backend", "src", "part119-unified-app-shell.js");
const shellHtmlPath = path.join(root, "frontend", "naxora-unified-app.html");

const requiredModules = [
  ["backend/src/part112-razorpay-foundation.js", "Part 112"],
  ["backend/src/part113-subscription-plans.js", "Part 113"],
  ["backend/src/part114-customer-checkout-subscription.js", "Part 114"],
  ["backend/src/part115-razorpay-webhooks.js", "Part 115"],
  ["backend/src/part116-subscription-access-control.js", "Part 116"],
  ["backend/src/part117-vani-subscription-manager.js", "Part 117"],
  ["backend/src/part118-razorpay-live-readiness.js", "Part 118"],
  ["backend/src/part119-unified-app-shell.js", "Part 119"],
  ["backend/src/part120-common-login.js", "Part 120"],
  ["backend/src/part121-owner-consolidation.js", "Part 121"],
  ["backend/src/part122-teacher-consolidation.js", "Part 122"],
  ["backend/src/part123-student-consolidation.js", "Part 123"],
  ["backend/src/part124-role-consolidation.js", "Part 124"],
  ["backend/src/part125-global-vani-actions.js", "Part 125"],
  ["backend/src/part126-native-e2e-integration.js", "Part 126"],
  ["backend/src/part127-final-acceptance-freeze.js", "Part 127"],
];

const marker = "// ================= PART 127 — FINAL DEMO ACCEPTANCE AND PROJECT FREEZE =================";
const block = `${marker}
const { registerPart127FinalAcceptance } = await import("./part127-final-acceptance-freeze.js");
registerPart127FinalAcceptance({ app });`;

const moduleStart = "  // PART 127 FINAL ACCEPTANCE MODULE START";
const moduleEnd = "  // PART 127 FINAL ACCEPTANCE MODULE END";
const moduleBlock = `${moduleStart}
  {
    key: "final-acceptance",
    label: "Final Demo & Freeze",
    description: "Linked demo-data import, final acceptance, release manifest and project freeze.",
    category: "Owner Core",
    route: "/final-acceptance",
    icon: "shield",
    roles: OWNER_ONLY_ROLES,
    alwaysAvailable: true,
    order: 317,
  },
${moduleEnd}`;

const aliasStart = "  // PART 127 FINAL ACCEPTANCE ALIASES START";
const aliasEnd = "  // PART 127 FINAL ACCEPTANCE ALIASES END";
const aliasBlock = `${aliasStart}
  "final acceptance": "final-acceptance",
  "demo data": "final-acceptance",
  "demo importer": "final-acceptance",
  "project freeze": "final-acceptance",
  "part 127": "final-acceptance",
${aliasEnd}`;

function fail(message) {
  console.error(`\nPART 127 APPLY FAILED: ${message}\n`);
  process.exit(1);
}
function syntaxCheck(file) {
  return spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
}
function find404(source) {
  let index = source.indexOf("app.use(notFound);");
  if (index < 0) index = source.indexOf("app.use(notFound)");
  if (index < 0) {
    const codeIndex = Math.max(
      source.indexOf('"ROUTE_NOT_FOUND"'),
      source.indexOf("'ROUTE_NOT_FOUND'")
    );
    index = codeIndex >= 0 ? source.lastIndexOf("app.use(", codeIndex) : -1;
  }
  return index;
}
function registrationEnd(source, functionCall) {
  const index = source.indexOf(functionCall);
  return index < 0 ? -1 : index + functionCall.length;
}
function removeBetween(source, start, end) {
  const escapedStart = start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedEnd = end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.replace(
    new RegExp(`\\s*${escapedStart}[\\s\\S]*?${escapedEnd}\\s*`, "g"),
    "\n"
  );
}

for (const [rel, label] of requiredModules) {
  if (!fs.existsSync(path.join(root, rel))) {
    fail(`${label} backend module missing: ${rel}`);
  }
}
for (const file of [serverPath, shellBackendPath, shellHtmlPath]) {
  if (!fs.existsSync(file)) fail(`${path.relative(root, file)} missing.`);
}

const originals = {
  server: fs.readFileSync(serverPath, "utf8"),
  shell: fs.readFileSync(shellBackendPath, "utf8"),
  html: fs.readFileSync(shellHtmlPath, "utf8"),
};

for (const file of [serverPath, shellBackendPath]) {
  const check = syntaxCheck(file);
  if (check.status !== 0) {
    fail(
      `Existing ${path.relative(root, file)} syntax broken hai. Installer ne koi change nahi kiya.\n${check.stderr || check.stdout}`
    );
  }
}

let server = originals.server;
const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
server = server.replace(
  new RegExp(
    `\\n*${escapedMarker}\\nconst \\{ registerPart127FinalAcceptance \\} = await import\\("\\.\\/part127-final-acceptance-freeze\\.js"\\);\\nregisterPart127FinalAcceptance\\(\\{ app \\}\\);\\n*`,
    "g"
  ),
  "\n\n"
);

const part126End = registrationEnd(
  server,
  "registerPart126NativeE2E({ app });"
);
if (part126End < 0) fail("Part 126 registration block not found.");
server = `${server.slice(0, part126End)}\n\n${block}${server.slice(part126End)}`;

let shell = removeBetween(originals.shell, moduleStart, moduleEnd);
shell = removeBetween(shell, aliasStart, aliasEnd);

const part126ModuleAnchor = "  // PART 126 INTEGRATION CENTRE MODULE END";
if (!shell.includes(part126ModuleAnchor)) {
  fail("Part 126 module marker not found in Part 119 shell.");
}
shell = shell.replace(
  part126ModuleAnchor,
  `${part126ModuleAnchor}\n${moduleBlock}`
);

const part126AliasAnchor = "  // PART 126 INTEGRATION CENTRE ALIASES END";
if (!shell.includes(part126AliasAnchor)) {
  fail("Part 126 alias marker not found in Part 119 shell.");
}
shell = shell.replace(
  part126AliasAnchor,
  `${part126AliasAnchor}\n${aliasBlock}`
);

let html = originals.html;
if (/<article><strong>127<\/strong><span>.*?<\/span><\/article>/.test(html)) {
  html = html.replace(
    /<article><strong>127<\/strong><span>.*?<\/span><\/article>/,
    "<article><strong>127</strong><span>Final Demo Freeze</span></article>"
  );
} else {
  html = html.replace(
    '<article><strong>126</strong><span>Native E2E</span></article>',
    '<article><strong>126</strong><span>Native E2E</span></article>\n            <article><strong>127</strong><span>Final Demo Freeze</span></article>'
  );
}
html = html
  .replace(
    /Part 126 native adapters, in-app notifications aur provider-aware delivery active hai\. Final production acceptance Part 127 me hogi\./g,
    "Part 127 final linked demo importer, Demo/Beta acceptance aur release freeze active hai. All-feature VANI automation claim nahi kiya gaya."
  )
  .replace(
    /Part 126 native action \+ navigation mode/g,
    "Part 127 final demo mode • 9 native VANI actions"
  );

fs.writeFileSync(serverPath, server, "utf8");
fs.writeFileSync(shellBackendPath, shell, "utf8");
fs.writeFileSync(shellHtmlPath, html, "utf8");

for (const file of [serverPath, shellBackendPath]) {
  const check = syntaxCheck(file);
  if (check.status !== 0) {
    fs.writeFileSync(serverPath, originals.server, "utf8");
    fs.writeFileSync(shellBackendPath, originals.shell, "utf8");
    fs.writeFileSync(shellHtmlPath, originals.html, "utf8");
    fail(
      `Part 127 syntax check failed. Original files restored.\n${check.stderr || check.stdout}`
    );
  }
}

const finalServer = fs.readFileSync(serverPath, "utf8");
const p126 = finalServer.indexOf(
  "PART 126 — NATIVE ADAPTERS AND CROSS MODULE E2E"
);
const p127 = finalServer.indexOf(
  "PART 127 — FINAL DEMO ACCEPTANCE AND PROJECT FREEZE"
);
const p112 = finalServer.indexOf(
  "PART 112 — RAZORPAY TEST MODE FOUNDATION"
);
const p404 = find404(finalServer);
const finalShell = fs.readFileSync(shellBackendPath, "utf8");
const finalHtml = fs.readFileSync(shellHtmlPath, "utf8");

const integrationOk =
  p126 >= 0 &&
  p127 > p126 &&
  p112 > p127 &&
  p404 > p112 &&
  finalShell.includes('key: "final-acceptance"') &&
  finalShell.includes('"project freeze": "final-acceptance"') &&
  finalHtml.includes("<strong>127</strong><span>Final Demo Freeze</span>");

if (!integrationOk) {
  fs.writeFileSync(serverPath, originals.server, "utf8");
  fs.writeFileSync(shellBackendPath, originals.shell, "utf8");
  fs.writeFileSync(shellHtmlPath, originals.html, "utf8");
  fail("Part 127 integration verification failed. Original files restored.");
}

console.log("\nPART 127 APPLIED SUCCESSFULLY");
console.log("Part 127 registered after Part 126: PASS");
console.log("Part 127 registered before Parts 112–119 routes: PASS");
console.log("Part 119 Final Demo & Freeze module added: PASS");
console.log("Part 119 final acceptance aliases added: PASS");
console.log("Unified app Part 127 final status updated: PASS");
console.log("server.js syntax: PASS");
console.log("Next: node .\\VERIFY-PART127.js\n");
