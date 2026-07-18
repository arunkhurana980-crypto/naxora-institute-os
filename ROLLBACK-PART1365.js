import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(root, "backend/src/server.js");
const htmlPath = path.join(root, "frontend/naxora-unified-app.html");

const SERVER_START = "// PART 136.5 OWNER APP EARLY ROUTE START";
const SERVER_END = "// PART 136.5 OWNER APP EARLY ROUTE END";
const HTML_START = "  <!-- PART 136.5 OWNER SESSION BRIDGE START -->";
const HTML_END = "  <!-- PART 136.5 OWNER SESSION BRIDGE END -->";

function esc(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeBetween(source, start, end) {
  return source.replace(
    new RegExp(`\\s*${esc(start)}[\\s\\S]*?${esc(end)}\\s*`, "g"),
    "\n"
  );
}

let server = fs.readFileSync(serverPath, "utf8");
let html = fs.readFileSync(htmlPath, "utf8");

server = removeBetween(server, SERVER_START, SERVER_END);
html = removeBetween(html, HTML_START, HTML_END);
html = html.replace(
  /\s*<script src="\/naxora-part1365-owner-session-bridge\.js(?:\?[^"]*)?"><\/script>/g,
  ""
);
html = html.replace(
  /(src|href)="(\/naxora-[^"?]+\.(?:js|css))\?v=1365"/g,
  '$1="$2"'
);

fs.writeFileSync(serverPath, server, "utf8");
fs.writeFileSync(htmlPath, html, "utf8");

const result = spawnSync(process.execPath, ["--check", serverPath], {
  encoding: "utf8",
});

if (result.status !== 0) {
  console.error(result.stderr || result.stdout);
  process.exit(1);
}

console.log("Part 136.5 early app route and session bridge removed.");
console.log("Owner/Institute MongoDB records were not changed.");
