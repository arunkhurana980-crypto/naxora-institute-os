import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root=path.dirname(fileURLToPath(import.meta.url));
const serverPath=path.join(root,"backend/src/server.js");
const loginHtmlPath=path.join(root,"frontend/naxora-common-login.html");
const required=[
  "backend/src/part120-common-login.js",
  "backend/src/part136-final-all-role-vani-acceptance.js",
  "backend/src/part1361-first-owner-bootstrap.js",
  "frontend/naxora-common-login.html",
  "frontend/naxora-owner-bootstrap.html",
  "frontend/naxora-owner-bootstrap.css",
  "frontend/naxora-owner-bootstrap.js",
  "frontend/naxora-part1361-common-login-bridge.js",
];
const registrationMarker="// ================= PART 136.1 — FIRST OWNER BOOTSTRAP HOTFIX =================";
const registration=`${registrationMarker}
const { registerPart1361FirstOwnerBootstrap } = await import("./part1361-first-owner-bootstrap.js");
registerPart1361FirstOwnerBootstrap({ app });`;
const routeStart="// PART 136.1 COMMON LOGIN ROUTE FIX START";
const routeEnd="// PART 136.1 COMMON LOGIN ROUTE FIX END";
const routeBlock=`${routeStart}
app.get("/login", (req, res, next) => {
  if (String(req.query?.legacy || "") === "1") return next();
  return res.redirect(302, "/common-login");
});
${routeEnd}`;
const bridgeTag='  <script src="/naxora-part1361-common-login-bridge.js"></script>';

function fail(message){console.error(`\nPART 136.1 APPLY FAILED: ${message}\n`);process.exit(1)}
function check(file){return spawnSync(process.execPath,["--check",file],{encoding:"utf8"})}
function escapeRegex(value){return value.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}
function removeBetween(source,start,end){
  const pattern=new RegExp(`\\s*${escapeRegex(start)}[\\s\\S]*?${escapeRegex(end)}\\s*`,"g");
  return source.replace(pattern,"\n");
}
function registrationEnd(source,call){
  const index=source.indexOf(call);
  return index<0?-1:index+call.length;
}
function findAppInitializationEnd(source){
  const patterns=[
    /const\s+app\s*=\s*express\s*\(\s*\)\s*;/,
    /let\s+app\s*=\s*express\s*\(\s*\)\s*;/,
    /var\s+app\s*=\s*express\s*\(\s*\)\s*;/,
  ];
  for(const pattern of patterns){
    const match=pattern.exec(source);
    if(match)return match.index+match[0].length;
  }
  return -1;
}

for(const rel of required)if(!fs.existsSync(path.join(root,rel)))fail(`Required file missing: ${rel}`);
for(const file of [serverPath,path.join(root,"backend/src/part1361-first-owner-bootstrap.js")]){
  const result=check(file);
  if(result.status!==0)fail(`${path.relative(root,file)} syntax broken before apply.\n${result.stderr||result.stdout}`);
}
const original={
  server:fs.readFileSync(serverPath,"utf8"),
  loginHtml:fs.readFileSync(loginHtmlPath,"utf8"),
};
let server=original.server;
server=removeBetween(server,routeStart,routeEnd);
const regPattern=new RegExp(
  `\\n*${escapeRegex(registrationMarker)}\\nconst \\{ registerPart1361FirstOwnerBootstrap \\} = await import\\("\\.\\/part1361-first-owner-bootstrap\\.js"\\);\\nregisterPart1361FirstOwnerBootstrap\\(\\{ app \\}\\);\\n*`,
  "g"
);
server=server.replace(regPattern,"\n\n");

const appEnd=findAppInitializationEnd(server);
if(appEnd<0)fail("Express app initialization `const app = express();` not found.");
server=`${server.slice(0,appEnd)}\n\n${routeBlock}${server.slice(appEnd)}`;

const part136End=registrationEnd(server,"registerPart136FinalAllRoleVaniAcceptance({ app });");
if(part136End<0)fail("Part 136 registration call not found. Apply and verify Part 136 first.");
server=`${server.slice(0,part136End)}\n\n${registration}${server.slice(part136End)}`;

let loginHtml=original.loginHtml
  .replace(/\s*<script src="\/naxora-part1361-common-login-bridge\.js"><\/script>/g,"");
if(!loginHtml.includes("</body>"))fail("Common Login HTML closing body not found.");
loginHtml=loginHtml.replace("</body>",`${bridgeTag}\n</body>`);

fs.writeFileSync(serverPath,server,"utf8");
fs.writeFileSync(loginHtmlPath,loginHtml,"utf8");

const result=check(serverPath);
if(result.status!==0){
  fs.writeFileSync(serverPath,original.server,"utf8");
  fs.writeFileSync(loginHtmlPath,original.loginHtml,"utf8");
  fail(`server.js syntax failed after integration. Originals restored.\n${result.stderr||result.stdout}`);
}

const finalServer=fs.readFileSync(serverPath,"utf8");
const finalLogin=fs.readFileSync(loginHtmlPath,"utf8");
const appPosition=Math.min(
  ...["const app = express();","const app=express();","let app = express();","var app = express();"]
    .map(value=>finalServer.indexOf(value)).filter(value=>value>=0)
);
const routePosition=finalServer.indexOf(routeStart);
const oldPart120Position=finalServer.indexOf("PART 120 — COMMON LOGIN");
const p136=finalServer.indexOf("PART 136 — FINAL ALL ROLE VANI ACCEPTANCE");
const p1361=finalServer.indexOf("PART 136.1 — FIRST OWNER BOOTSTRAP HOTFIX");
const p112=finalServer.indexOf("PART 112 — RAZORPAY TEST MODE FOUNDATION");
const valid=
  routePosition>appPosition &&
  (oldPart120Position<0 || routePosition<oldPart120Position) &&
  p136>=0 && p1361>p136 && p112>p1361 &&
  finalLogin.includes("/naxora-part1361-common-login-bridge.js");
if(!valid){
  fs.writeFileSync(serverPath,original.server,"utf8");
  fs.writeFileSync(loginHtmlPath,original.loginHtml,"utf8");
  fail("Part 136.1 integration verification failed. Originals restored.");
}

console.log("\nPART 136.1 APPLIED SUCCESSFULLY");
console.log("/login early redirect to /common-login: PASS");
console.log("Part 136.1 registered after Part 136: PASS");
console.log("Part 136.1 registered before Parts 112–119 routes: PASS");
console.log("First Owner Bootstrap page and APIs added: PASS");
console.log("Common Login First Owner link bridge added: PASS");
console.log("server.js syntax: PASS");
console.log("Next: node .\\VERIFY-PART1361.js\n");
