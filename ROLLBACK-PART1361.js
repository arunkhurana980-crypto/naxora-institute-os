import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root=path.dirname(fileURLToPath(import.meta.url));
const serverPath=path.join(root,"backend/src/server.js");
const loginHtmlPath=path.join(root,"frontend/naxora-common-login.html");
const routeStart="// PART 136.1 COMMON LOGIN ROUTE FIX START";
const routeEnd="// PART 136.1 COMMON LOGIN ROUTE FIX END";
const registrationMarker="// ================= PART 136.1 — FIRST OWNER BOOTSTRAP HOTFIX =================";
function escapeRegex(value){return value.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}
function removeBetween(source,start,end){
  return source.replace(
    new RegExp(`\\s*${escapeRegex(start)}[\\s\\S]*?${escapeRegex(end)}\\s*`,"g"),
    "\n"
  );
}
const original={
  server:fs.readFileSync(serverPath,"utf8"),
  loginHtml:fs.readFileSync(loginHtmlPath,"utf8"),
};
let server=removeBetween(original.server,routeStart,routeEnd);
server=server.replace(
  new RegExp(
    `\\n*${escapeRegex(registrationMarker)}\\nconst \\{ registerPart1361FirstOwnerBootstrap \\} = await import\\("\\.\\/part1361-first-owner-bootstrap\\.js"\\);\\nregisterPart1361FirstOwnerBootstrap\\(\\{ app \\}\\);\\n*`,
    "g"
  ),
  "\n\n"
);
const loginHtml=original.loginHtml.replace(
  /\s*<script src="\/naxora-part1361-common-login-bridge\.js"><\/script>/g,
  ""
);
fs.writeFileSync(serverPath,server,"utf8");
fs.writeFileSync(loginHtmlPath,loginHtml,"utf8");
const result=spawnSync(process.execPath,["--check",serverPath],{encoding:"utf8"});
if(result.status!==0){
  fs.writeFileSync(serverPath,original.server,"utf8");
  fs.writeFileSync(loginHtmlPath,original.loginHtml,"utf8");
  console.error("Part 136.1 rollback syntax failed; originals restored.");
  process.exit(1);
}
console.log("Part 136.1 route fix, registration and Common Login bridge removed.");
console.log("MongoDB Owner/bootstrap records were not deleted.");
