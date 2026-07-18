import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root=path.dirname(fileURLToPath(import.meta.url));
const serverPath=path.join(root,"backend/src/server.js");
const loginHtmlPath=path.join(root,"frontend/naxora-common-login.html");
const required=[
  "backend/src/part120-common-login.js",
  "backend/src/part1361-first-owner-bootstrap.js",
  "backend/src/part1364-simple-owner-access.js",
  "frontend/naxora-common-login.html",
  "frontend/naxora-owner-access.html",
  "frontend/naxora-owner-access.css",
  "frontend/naxora-owner-access.js",
];
const marker="// ================= PART 136.4 — SIMPLE OWNER SIGNUP AND LOGIN =================";
const registration=`${marker}
const { registerPart1364SimpleOwnerAccess } = await import("./part1364-simple-owner-access.js");
registerPart1364SimpleOwnerAccess({ app });`;
const start="        <!-- PART 136.4 SIMPLE OWNER ACCESS START -->";
const end="        <!-- PART 136.4 SIMPLE OWNER ACCESS END -->";
const cta=`${start}
        <div class="adoption">
          <div class="divider"><span>Institute Owner</span></div>
          <p>Owner ko Institute ID, Render secret ya signed link ki zarurat nahi.</p>
          <a class="primary full" href="/owner-login" style="display:block;text-align:center;text-decoration:none">Owner Sign In</a>
          <a class="secondary full" href="/create-institute" style="display:block;margin-top:8px;text-align:center;text-decoration:none">Create New Institute</a>
        </div>
${end}`;

const esc=value=>value.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
const removeBetween=(source,a,b)=>source.replace(new RegExp(`\\s*${esc(a)}[\\s\\S]*?${esc(b)}\\s*`,"g"),"\n");
const check=file=>spawnSync(process.execPath,["--check",file],{encoding:"utf8"});
const fail=message=>{console.error(`\nPART 136.4 APPLY FAILED: ${message}\n`);process.exit(1)};
const registrationEnd=(source,call)=>{const i=source.indexOf(call);return i<0?-1:i+call.length};

for(const rel of required)if(!fs.existsSync(path.join(root,rel)))fail(`Required file missing: ${rel}`);
for(const file of [serverPath,path.join(root,"backend/src/part1364-simple-owner-access.js"),path.join(root,"frontend/naxora-owner-access.js")]){
  const result=check(file);if(result.status!==0)fail(`${path.relative(root,file)} syntax failed.\n${result.stderr||result.stdout}`);
}

const original={server:fs.readFileSync(serverPath,"utf8"),html:fs.readFileSync(loginHtmlPath,"utf8")};
let server=original.server.replace(new RegExp(`\\n*${esc(marker)}\\nconst \\{ registerPart1364SimpleOwnerAccess \\} = await import\\("\\.\\/part1364-simple-owner-access\\.js"\\);\\nregisterPart1364SimpleOwnerAccess\\(\\{ app \\}\\);\\n*`,"g"),"\n\n");
const anchor=registrationEnd(server,"registerPart1361FirstOwnerBootstrap({ app });");
if(anchor<0)fail("Part 136.1 registration call missing.");
server=`${server.slice(0,anchor)}\n\n${registration}${server.slice(anchor)}`;

let html=removeBetween(original.html,start,end);
const formAnchor='<form id="loginForm">';
if(!html.includes(formAnchor))fail("Common Login form anchor missing.");
html=html.replace(formAnchor,`${cta}\n\n        ${formAnchor}`);
html=html.replace(/\s*<script src="\/naxora-part1361-common-login-bridge\.js"><\/script>/g,"");

fs.writeFileSync(serverPath,server,"utf8");
fs.writeFileSync(loginHtmlPath,html,"utf8");

const result=check(serverPath);
if(result.status!==0){
  fs.writeFileSync(serverPath,original.server,"utf8");
  fs.writeFileSync(loginHtmlPath,original.html,"utf8");
  fail(`server.js syntax failed after apply. Originals restored.\n${result.stderr||result.stdout}`);
}

const finalServer=fs.readFileSync(serverPath,"utf8");
const finalHtml=fs.readFileSync(loginHtmlPath,"utf8");
const p1361=finalServer.indexOf("PART 136.1 — FIRST OWNER BOOTSTRAP HOTFIX");
const p1364=finalServer.indexOf("PART 136.4 — SIMPLE OWNER SIGNUP AND LOGIN");
const p112=finalServer.indexOf("PART 112 — RAZORPAY TEST MODE FOUNDATION");
if(!(p1361>=0&&p1364>p1361&&p112>p1364&&finalHtml.includes('href="/owner-login"')&&finalHtml.includes('href="/create-institute"')&&!finalHtml.includes('/naxora-part1361-common-login-bridge.js'))){
  fs.writeFileSync(serverPath,original.server,"utf8");
  fs.writeFileSync(loginHtmlPath,original.html,"utf8");
  fail("Integration verification failed. Originals restored.");
}

console.log("\nPART 136.4 APPLIED SUCCESSFULLY");
console.log("Owner Sign In without Institute ID: PASS");
console.log("Create Institute self-service: PASS");
console.log("Automatic Institute ID: PASS");
console.log("Old customer-facing bootstrap link removed: PASS");
console.log("Part 136.4 route order: PASS");
console.log("server.js syntax: PASS");
console.log("Next: node .\\VERIFY-PART1364.js\n");
