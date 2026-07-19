import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(root, "frontend/naxora-final-role-vani.html");
const jsPath = path.join(root, "frontend/naxora-final-role-vani.js");
const cssPath = path.join(root, "frontend/naxora-final-role-vani.css");
const runtimePath = path.join(
  root,
  "backend/src/part13610-final-role-vani-runtime.js"
);

function fail(message) {
  console.error(`\nPART 136.12 APPLY FAILED: ${message}\n`);
  process.exit(1);
}
function syntax(file) {
  return spawnSync(process.execPath, ["--check", file], {
    encoding: "utf8",
  });
}

for (const file of [htmlPath, jsPath, cssPath, runtimePath]) {
  if (!fs.existsSync(file)) {
    fail(`Required file missing: ${path.relative(root, file)}`);
  }
}

let html = fs.readFileSync(htmlPath, "utf8");
html = html
  .replace(/naxora-final-role-vani\.css\?v=\d+/g,
    "naxora-final-role-vani.css?v=13612")
  .replace(/naxora-final-role-vani\.js\?v=\d+/g,
    "naxora-final-role-vani.js?v=13612");
fs.writeFileSync(htmlPath, html, "utf8");

const jsResult = syntax(jsPath);
const runtimeResult = syntax(runtimePath);
if (jsResult.status !== 0 || runtimeResult.status !== 0) {
  fail(
    `Syntax check failed.\n${jsResult.stderr || ""}\n${
      runtimeResult.stderr || ""
    }`
  );
}

const js = fs.readFileSync(jsPath, "utf8");
const css = fs.readFileSync(cssPath, "utf8");
const runtime = fs.readFileSync(runtimePath, "utf8");
const valid =
  html.includes("naxora-final-role-vani.css?v=13612") &&
  html.includes("naxora-final-role-vani.js?v=13612") &&
  html.includes('id="clearCommandBtn"') &&
  js.includes("Command box optional hai") &&
  js.includes('clearMessage("interpretResult")') &&
  js.includes("clearCommandBtn") &&
  css.includes(".message.info") &&
  runtime.includes(
    '"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"'
  );

if (!valid) {
  fail("Part 136.12 final validation failed.");
}

console.log("\nPART 136.12 APPLIED SUCCESSFULLY");
console.log("Final Role VANI cache version 13612: PASS");
console.log("CSS/JS no-store delivery: PASS");
console.log("Empty command guidance: PASS");
console.log("Stale error clear on action selection: PASS");
console.log("Clear command message button: PASS");
console.log("Next: node .\\VERIFY-PART13612.js\n");
