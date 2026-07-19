import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const paths = {
  html: "frontend/naxora-final-role-vani.html",
  js: "frontend/naxora-final-role-vani.js",
  css: "frontend/naxora-final-role-vani.css",
  runtime: "backend/src/part13610-final-role-vani-runtime.js",
};
let failed = false;
function check(ok, label) {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
  if (!ok) failed = true;
}
for (const rel of Object.values(paths)) {
  check(fs.existsSync(path.join(root, rel)), `${rel} exists`);
}
for (const rel of [paths.js, paths.runtime]) {
  const result = spawnSync(
    process.execPath,
    ["--check", path.join(root, rel)],
    { encoding: "utf8" }
  );
  check(result.status === 0, `${rel} syntax`);
  if (result.status !== 0) console.error(result.stderr || result.stdout);
}
if (!failed) {
  const html = fs.readFileSync(path.join(root, paths.html), "utf8");
  const js = fs.readFileSync(path.join(root, paths.js), "utf8");
  const css = fs.readFileSync(path.join(root, paths.css), "utf8");
  const runtime = fs.readFileSync(path.join(root, paths.runtime), "utf8");
  const checks = [
    [html.includes("naxora-final-role-vani.css?v=13612"), "CSS version 13612"],
    [html.includes("naxora-final-role-vani.js?v=13612"), "JS version 13612"],
    [html.includes('id="clearCommandBtn"'), "Clear message button"],
    [js.includes("Command box optional hai"), "Optional command guidance"],
    [js.includes('clearMessage("interpretResult")'), "Stale command error cleanup"],
    [js.includes("clearCommandBtn"), "Clear message handler"],
    [css.includes(".message.info"), "Information message styling"],
    [runtime.includes("no-store, no-cache, must-revalidate"), "No-store frontend delivery"],
  ];
  for (const [ok, label] of checks) check(ok, label);
}
process.exit(failed ? 1 : 0);
