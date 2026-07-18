import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(root, "frontend/naxora-owner-bootstrap.html");
const jsPath = path.join(root, "frontend/naxora-owner-bootstrap.js");
let failed = false;

for (const file of [htmlPath, jsPath]) {
  const exists = fs.existsSync(file);
  console.log(`${exists ? "PASS" : "FAIL"} ${path.relative(root, file)} exists`);
  if (!exists) failed = true;
}

if (fs.existsSync(jsPath)) {
  const syntax = spawnSync(process.execPath, ["--check", jsPath], { encoding: "utf8" });
  const ok = syntax.status === 0;
  console.log(`${ok ? "PASS" : "FAIL"} frontend JavaScript syntax`);
  if (!ok) failed = true;
}

if (!failed) {
  const html = fs.readFileSync(htmlPath, "utf8");
  const js = fs.readFileSync(jsPath, "utf8");
  const checks = [
    [html.includes('/naxora-owner-bootstrap.js?v=13631-final'), "Cache-busted script URL"],
    [js.includes("TICKET_KEY"), "Signed-ticket frontend"],
    [js.includes("x-naxora-bootstrap-ticket"), "Ticket request header"],
    [js.includes("history.replaceState"), "Ticket removed from address bar"],
    [js.includes('b.textContent="Ticket"'), "Secret field switches to Ticket mode"],
  ];
  for (const [ok, label] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
    if (!ok) failed = true;
  }
}

process.exit(failed ? 1 : 0);
