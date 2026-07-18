import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(root, "backend/src/server.js");
const appHtmlPath = path.join(root, "frontend/naxora-unified-app.html");
const bridgePath = path.join(root, "frontend/naxora-part1365-owner-session-bridge.js");

const SERVER_START = "// PART 136.5 OWNER APP EARLY ROUTE START";
const SERVER_END = "// PART 136.5 OWNER APP EARLY ROUTE END";
const HTML_START = "  <!-- PART 136.5 OWNER SESSION BRIDGE START -->";
const HTML_END = "  <!-- PART 136.5 OWNER SESSION BRIDGE END -->";

const serverBlock = `${SERVER_START}
const part1365FrontendDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../frontend"
);

app.get(["/app", "/app/"], (req, res) => {
  res.set({
    "Cache-Control": "no-store, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin",
    "X-Frame-Options": "SAMEORIGIN"
  });
  return res.sendFile(path.join(part1365FrontendDir, "naxora-unified-app.html"));
});

app.get("/app/index.html", (req, res) => {
  return res.redirect(302, "/app");
});

app.get("/api/part1365/status", (req, res) => {
  res.set("Cache-Control", "no-store");
  return res.json({
    success: true,
    part: "136.5",
    status: "owner_app_route_and_session_fix_active",
    ownerLoginUrl: "/owner-login",
    ownerSignupUrl: "/create-institute",
    ownerLoginNeedsInstituteId: false,
    appUrl: "/app",
    appTrailingSlashSupported: true,
    appServesUnifiedShellEarly: true,
    oldPublicLoginAtAppBlocked: true,
    ownerSessionBridgeActive: true,
    part119NavigationUsed: true,
    part136VaniModulesRemainAvailable: true
  });
});
${SERVER_END}`;

const htmlBlock = `${HTML_START}
  <script src="/naxora-part1365-owner-session-bridge.js?v=1365"></script>
${HTML_END}`;

function fail(message) {
  console.error(`\nPART 136.5 APPLY FAILED: ${message}\n`);
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

function syntaxCheck(file) {
  return spawnSync(process.execPath, ["--check", file], {
    encoding: "utf8",
  });
}

for (const file of [serverPath, appHtmlPath, bridgePath]) {
  if (!fs.existsSync(file)) {
    fail(`Required file missing: ${path.relative(root, file)}`);
  }
}

for (const file of [serverPath, bridgePath]) {
  const result = syntaxCheck(file);
  if (result.status !== 0) {
    fail(`${path.relative(root, file)} syntax failed before apply.\n${result.stderr || result.stdout}`);
  }
}

const originalServer = fs.readFileSync(serverPath, "utf8");
const originalHtml = fs.readFileSync(appHtmlPath, "utf8");

let server = removeBetween(originalServer, SERVER_START, SERVER_END);
const appAnchorPatterns = [
  /const\s+app\s*=\s*express\s*\(\s*\)\s*;/,
  /let\s+app\s*=\s*express\s*\(\s*\)\s*;/,
  /var\s+app\s*=\s*express\s*\(\s*\)\s*;/,
];

let appAnchor = null;
for (const pattern of appAnchorPatterns) {
  const match = pattern.exec(server);
  if (match) {
    appAnchor = {
      index: match.index,
      end: match.index + match[0].length,
    };
    break;
  }
}

if (!appAnchor) {
  fail("Express app initialization not found.");
}

server =
  server.slice(0, appAnchor.end) +
  `\n\n${serverBlock}` +
  server.slice(appAnchor.end);

let html = removeBetween(originalHtml, HTML_START, HTML_END);

html = html.replace(
  /\s*<script src="\/naxora-part1365-owner-session-bridge\.js(?:\?[^"]*)?"><\/script>/g,
  ""
);

const sessionAnchorRegex =
  /(\s*<script src="\/naxora-common-session\.js(?:\?[^"]*)?"><\/script>)/;

if (!sessionAnchorRegex.test(html)) {
  fs.writeFileSync(serverPath, originalServer, "utf8");
  fail("Unified app common-session script anchor not found.");
}

html = html.replace(sessionAnchorRegex, `\n${htmlBlock}$1`);

html = html.replace(
  /(src|href)="(\/naxora-[^"?]+\.(?:js|css))(?:\?[^"]*)?"/g,
  '$1="$2?v=1365"'
);

fs.writeFileSync(serverPath, server, "utf8");
fs.writeFileSync(appHtmlPath, html, "utf8");

const serverCheck = syntaxCheck(serverPath);
const bridgeCheck = syntaxCheck(bridgePath);

if (serverCheck.status !== 0 || bridgeCheck.status !== 0) {
  fs.writeFileSync(serverPath, originalServer, "utf8");
  fs.writeFileSync(appHtmlPath, originalHtml, "utf8");
  fail(
    `Syntax failed after integration; original files restored.\n${serverCheck.stderr || ""}\n${bridgeCheck.stderr || ""}`
  );
}

const finalServer = fs.readFileSync(serverPath, "utf8");
const finalHtml = fs.readFileSync(appHtmlPath, "utf8");

const appInitPosition = Math.min(
  ...[
    "const app = express();",
    "const app=express();",
    "let app = express();",
    "var app = express();",
  ]
    .map(value => finalServer.indexOf(value))
    .filter(value => value >= 0)
);

const earlyRoutePosition = finalServer.indexOf(SERVER_START);
const oldPublicLoginPosition = finalServer.indexOf(
  'app.get("/login", (req, res) => sendFileSafe'
);
const part119Position = finalServer.indexOf(
  "PART 119 — UNIFIED APP SHELL"
);

const bridgeCount =
  (finalHtml.match(/naxora-part1365-owner-session-bridge\.js/g) || []).length;

const valid =
  appInitPosition >= 0 &&
  earlyRoutePosition > appInitPosition &&
  (oldPublicLoginPosition < 0 || earlyRoutePosition < oldPublicLoginPosition) &&
  (part119Position < 0 || earlyRoutePosition < part119Position) &&
  finalServer.includes('app.get(["/app", "/app/"]') &&
  finalServer.includes("naxora-unified-app.html") &&
  bridgeCount === 1 &&
  finalHtml.includes('naxora-part1365-owner-session-bridge.js?v=1365') &&
  finalHtml.includes('naxora-unified-app.js?v=1365');

if (!valid) {
  fs.writeFileSync(serverPath, originalServer, "utf8");
  fs.writeFileSync(appHtmlPath, originalHtml, "utf8");
  fail("Part 136.5 integration verification failed; original files restored.");
}

console.log("\nPART 136.5 APPLIED SUCCESSFULLY");
console.log("/app early unified-shell route: PASS");
console.log("/app/ trailing-slash route: PASS");
console.log("Old public login route priority blocked: PASS");
console.log("Owner session → Part 119 bridge: PASS");
console.log("Unified app cache-busting: PASS");
console.log("server.js syntax: PASS");
console.log("Session bridge syntax: PASS");
console.log("Next: node .\\VERIFY-PART1365.js\n");
