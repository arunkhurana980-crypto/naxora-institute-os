import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const files = {
  security: "backend/src/middleware/securityMiddleware.js",
  html: "frontend/naxora-unified-app.html",
  js: "frontend/naxora-unified-app.js",
  coverage: "frontend/naxora-part136-vani-button-coverage.js",
  runtime: "backend/src/part13610-final-role-vani-runtime.js",
  runtimeUi: "frontend/naxora-final-role-vani.js",
};
let failed = false;
function check(ok, label) {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
  if (!ok) failed = true;
}
for (const rel of Object.values(files)) {
  const file = path.join(root, rel);
  check(fs.existsSync(file), `${rel} exists`);
  if (fs.existsSync(file) && rel.endsWith(".js")) {
    const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    check(result.status === 0, `${rel} syntax`);
    if (result.status !== 0) console.error(result.stderr || result.stdout);
  }
}
if (!failed) {
  const security = fs.readFileSync(path.join(root, files.security), "utf8");
  const html = fs.readFileSync(path.join(root, files.html), "utf8");
  const js = fs.readFileSync(path.join(root, files.js), "utf8");
  const coverage = fs.readFileSync(path.join(root, files.coverage), "utf8");
  const runtime = fs.readFileSync(path.join(root, files.runtime), "utf8");
  const runtimeUi = fs.readFileSync(path.join(root, files.runtimeUi), "utf8");
  const checks = [
    [security.includes('X-Frame-Options", "SAMEORIGIN"'), "Same-origin frame header"],
    [!security.includes('X-Frame-Options", "DENY"'), "Old global DENY removed"],
    [security.includes("frame-ancestors 'self'"), "CSP same-origin frame policy"],
    [security.includes("microphone=(self)"), "Same-origin microphone policy"],
    [html.includes(`allow="microphone 'self'"`), "Iframe microphone permission"],
    [html.includes("?v=13611"), "Shell asset cache bust"],
    [js.includes("PART 136.11 FRAME HEALTH START"), "Frame health fallback"],
    [js.includes("naxoraShell=1&v=13611"), "Fresh module iframe navigation"],
    [js.includes("inspectNaxoraFrame(activeModule?.route"), "Iframe load inspection"],
    [coverage.includes("part136ContextVaniBtn"), "One contextual VANI button"],
    [coverage.includes("removeOldButtons"), "Old duplicate VANI buttons removed"],
    [!coverage.includes('button.textContent="VANI"'), "Circle button injector removed"],
    [runtime.includes("COMMERCIAL_ACCEPTANCE_PENDING"), "Commercial acceptance separated"],
    [runtime.includes("ROLE_RUNTIME_EVIDENCE_PENDING"), "Runtime evidence classification"],
    [runtime.includes("runtimeAccepted"), "Runtime acceptance value"],
    [runtime.includes("commercialAccepted"), "Commercial acceptance value"],
    [runtimeUi.includes("Grey text sirf example hai"), "Empty command guidance"],
    [runtimeUi.includes("App runtime:"), "Acceptance UI clarity"],
  ];
  for (const [ok, label] of checks) check(ok, label);
}
process.exit(failed ? 1 : 0);
