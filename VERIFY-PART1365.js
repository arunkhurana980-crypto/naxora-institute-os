import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(root, "backend/src/server.js");
const htmlPath = path.join(root, "frontend/naxora-unified-app.html");
const bridgePath = path.join(root, "frontend/naxora-part1365-owner-session-bridge.js");

let failed = false;

for (const file of [serverPath, htmlPath, bridgePath]) {
  const exists = fs.existsSync(file);
  console.log(`${exists ? "PASS" : "FAIL"} ${path.relative(root, file)} exists`);
  if (!exists) {
    failed = true;
    continue;
  }

  if (file.endsWith(".js")) {
    const result = spawnSync(process.execPath, ["--check", file], {
      encoding: "utf8",
    });
    const ok = result.status === 0;
    console.log(`${ok ? "PASS" : "FAIL"} ${path.relative(root, file)} syntax`);
    if (!ok) {
      console.error(result.stderr || result.stdout);
      failed = true;
    }
  }
}

if (!failed) {
  const server = fs.readFileSync(serverPath, "utf8");
  const html = fs.readFileSync(htmlPath, "utf8");
  const bridge = fs.readFileSync(bridgePath, "utf8");

  const appInitCandidates = [
    server.indexOf("const app = express();"),
    server.indexOf("const app=express();"),
    server.indexOf("let app = express();"),
    server.indexOf("var app = express();"),
  ].filter(value => value >= 0);

  const appInit = appInitCandidates.length ? Math.min(...appInitCandidates) : -1;
  const route = server.indexOf("PART 136.5 OWNER APP EARLY ROUTE START");
  const oldLogin = server.indexOf('app.get("/login", (req, res) => sendFileSafe');
  const bridgeCount =
    (html.match(/naxora-part1365-owner-session-bridge\.js/g) || []).length;

  const checks = [
    [appInit >= 0, "Express app initialization found"],
    [route > appInit, "Part 136.5 route registered immediately after app init"],
    [oldLogin < 0 || route < oldLogin, "Part 136.5 route precedes old public login routes"],
    [server.includes('app.get(["/app", "/app/"]'), "/app and /app/ both mapped"],
    [server.includes('"oldPublicLoginAtAppBlocked": true') ||
      server.includes("oldPublicLoginAtAppBlocked: true"),
      "Status reports old app login blocked"],
    [server.includes("naxora-unified-app.html"), "Real unified shell served"],
    [server.includes("/api/part1365/status"), "Part 136.5 status API exists"],
    [bridgeCount === 1, "Exactly one Owner session bridge tag"],
    [html.includes("naxora-part1365-owner-session-bridge.js?v=1365"),
      "Owner session bridge cache-busted"],
    [html.includes("naxora-unified-app.js?v=1365"),
      "Unified app JavaScript cache-busted"],
    [bridge.includes('sessionStorage.setItem("part119SessionToken", token)'),
      "Owner token bridged to Part 119"],
    [bridge.includes('sessionStorage.setItem("part119InstituteId", instituteId)'),
      "Owner Institute ID bridged to Part 119"],
    [bridge.includes("payload.instituteId"), "JWT Institute ID fallback exists"],
    [bridge.includes("tokenPresent: Boolean(token)"), "Bridge runtime status exists"],
  ];

  for (const [ok, label] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
    if (!ok) failed = true;
  }
}

process.exit(failed ? 1 : 0);
