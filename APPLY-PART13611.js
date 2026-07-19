import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const securityPath = path.join(root, "backend/src/middleware/securityMiddleware.js");
const shellHtmlPath = path.join(root, "frontend/naxora-unified-app.html");
const shellJsPath = path.join(root, "frontend/naxora-unified-app.js");
const coveragePath = path.join(root, "frontend/naxora-part136-vani-button-coverage.js");

const FRAME_MARKER = "/* PART 136.11 FRAME HEALTH START */";
const FRAME_FUNCTIONS = `${FRAME_MARKER}
function showNaxoraFrameProblem(route, message) {
  const loader = $("frameLoader");
  const frame = $("moduleFrame");
  frame.hidden = true;
  loader.hidden = false;
  loader.innerHTML = "";
  const text = document.createElement("div");
  text.textContent = message || "Module shell ke andar load nahi hui. Direct mode available hai.";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "secondary";
  button.style.marginTop = "12px";
  button.textContent = "Open Module Direct";
  button.addEventListener("click", () => {
    if (route) window.open(route, "_blank", "noopener,noreferrer");
  });
  loader.append(text, button);
}
function inspectNaxoraFrame(route = "") {
  const frame = $("moduleFrame");
  try {
    const doc = frame.contentDocument;
    if (!doc || !doc.body) throw new Error("FRAME_DOCUMENT_UNAVAILABLE");
    const text = String(doc.body.innerText || "");
    if (/refused to connect|x-frame-options|blocked by response/i.test(text)) {
      throw new Error("FRAME_BLOCKED");
    }
    clearTimeout(window.__naxoraFrameTimer);
    frame.hidden = false;
    $("frameLoader").hidden = true;
  } catch {
    showNaxoraFrameProblem(
      route,
      "Secure module embed block hui. Open Module Direct use karein aur Part 136.11 status check karein."
    );
  }
}
/* PART 136.11 FRAME HEALTH END */`;

function fail(message) {
  console.error(`\nPART 136.11 APPLY FAILED: ${message}\n`);
  process.exit(1);
}
function syntax(file) {
  return spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
}

for (const file of [securityPath, shellHtmlPath, shellJsPath, coveragePath]) {
  if (!fs.existsSync(file)) fail(`Required file missing: ${path.relative(root, file)}`);
}

const originals = {
  security: fs.readFileSync(securityPath, "utf8"),
  html: fs.readFileSync(shellHtmlPath, "utf8"),
  js: fs.readFileSync(shellJsPath, "utf8"),
};

let security = originals.security;
security = security.replace(
  /res\.setHeader\("X-Frame-Options",\s*"DENY"\);/,
  'res.setHeader("X-Frame-Options", "SAMEORIGIN");'
);
if (!security.includes("frame-ancestors 'self'")) {
  security = security.replace(
    'res.setHeader("X-Frame-Options", "SAMEORIGIN");',
    'res.setHeader("X-Frame-Options", "SAMEORIGIN");\n  res.setHeader("Content-Security-Policy", "frame-ancestors \'self\'");'
  );
}
security = security.replace(
  /res\.setHeader\("Permissions-Policy",\s*"[^"]*"\);/,
  'res.setHeader("Permissions-Policy", "camera=(), microphone=(self), geolocation=()");'
);

if (
  !security.includes('X-Frame-Options", "SAMEORIGIN"') ||
  !security.includes("frame-ancestors 'self'") ||
  !security.includes("microphone=(self)")
) fail("Security header patch could not be verified.");

let html = originals.html;
html = html.replace(/\?v=1365/g, "?v=13611");
html = html.replace(/\?v=13610/g, "?v=13611");
if (!/id="moduleFrame"[\s\S]*?\ballow=/.test(html)) {
  html = html.replace(
    /(<iframe[\s\S]*?id="moduleFrame"[\s\S]*?referrerpolicy="same-origin")/,
    `$1\n              allow="microphone 'self'"`
  );
}
if (!html.includes(`allow="microphone 'self'"`)) fail("Iframe microphone policy patch failed.");

let js = originals.js;
if (!js.includes(FRAME_MARKER)) {
  const anchor = "async function openModule";
  if (!js.includes(anchor)) fail("Unified shell openModule anchor missing.");
  js = js.replace(anchor, `${FRAME_FUNCTIONS}${anchor}`);
}
const oldOpen = '$("frameLoader").hidden=false;$("moduleFrame").src=module.route;$("openDirectBtn").dataset.route=module.route;';
const newOpen = '$("frameLoader").hidden=false;$("frameLoader").textContent="Opening secure module…";$("moduleFrame").hidden=false;const frameRoute=module.route;const frameSeparator=frameRoute.includes("?")?"&":"?";$("moduleFrame").src=`${frameRoute}${frameSeparator}naxoraShell=1&v=13611`;$("openDirectBtn").dataset.route=frameRoute;clearTimeout(window.__naxoraFrameTimer);window.__naxoraFrameTimer=setTimeout(()=>inspectNaxoraFrame(frameRoute),8000);';
if (js.includes(oldOpen)) js = js.replace(oldOpen, newOpen);
else if (!js.includes("naxoraShell=1&v=13611")) fail("Unified shell frame source anchor missing.");

const oldLoad = '$("moduleFrame").addEventListener("load",()=>{$("frameLoader").hidden=true});';
const newLoad = '$("moduleFrame").addEventListener("load",()=>{clearTimeout(window.__naxoraFrameTimer);setTimeout(()=>inspectNaxoraFrame(activeModule?.route||""),80)});';
if (js.includes(oldLoad)) js = js.replace(oldLoad, newLoad);
else if (!js.includes("inspectNaxoraFrame(activeModule?.route")) fail("Unified shell load listener anchor missing.");

const oldRefresh = '$("refreshModuleBtn").addEventListener("click",()=>{if(activeModule){$("frameLoader").hidden=false;$("moduleFrame").src=activeModule.route}});';
const newRefresh = '$("refreshModuleBtn").addEventListener("click",()=>{if(activeModule)openModule(activeModule.key,{updateHash:false})});';
if (js.includes(oldRefresh)) js = js.replace(oldRefresh, newRefresh);

fs.writeFileSync(securityPath, security, "utf8");
fs.writeFileSync(shellHtmlPath, html, "utf8");
fs.writeFileSync(shellJsPath, js, "utf8");

for (const file of [securityPath, shellJsPath, coveragePath]) {
  const result = syntax(file);
  if (result.status !== 0) {
    fs.writeFileSync(securityPath, originals.security, "utf8");
    fs.writeFileSync(shellHtmlPath, originals.html, "utf8");
    fs.writeFileSync(shellJsPath, originals.js, "utf8");
    fail(`Syntax failed after Part 136.11 patch; originals restored.\n${result.stderr || result.stdout}`);
  }
}

const finalSecurity = fs.readFileSync(securityPath, "utf8");
const finalHtml = fs.readFileSync(shellHtmlPath, "utf8");
const finalJs = fs.readFileSync(shellJsPath, "utf8");
const finalCoverage = fs.readFileSync(coveragePath, "utf8");
const valid =
  finalSecurity.includes('X-Frame-Options", "SAMEORIGIN"') &&
  finalSecurity.includes("frame-ancestors 'self'") &&
  finalSecurity.includes("microphone=(self)") &&
  finalHtml.includes(`allow="microphone 'self'"`) &&
  finalHtml.includes("?v=13611") &&
  finalJs.includes(FRAME_MARKER) &&
  finalJs.includes("naxoraShell=1&v=13611") &&
  finalCoverage.includes("part136ContextVaniBtn") &&
  !finalCoverage.includes('button.textContent="VANI"');
if (!valid) {
  fs.writeFileSync(securityPath, originals.security, "utf8");
  fs.writeFileSync(shellHtmlPath, originals.html, "utf8");
  fs.writeFileSync(shellJsPath, originals.js, "utf8");
  fail("Part 136.11 final verification failed; originals restored.");
}

console.log("\nPART 136.11 APPLIED SUCCESSFULLY");
console.log("Same-origin iframe embedding: PASS");
console.log("External iframe protection remains: PASS");
console.log("VANI microphone same-origin policy: PASS");
console.log("Single contextual VANI Actions button: PASS");
console.log("Module frame direct fallback: PASS");
console.log("Cache-busted shell assets: PASS");
console.log("Next: node .\\VERIFY-PART13611.js\n");
