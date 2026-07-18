import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root=path.dirname(fileURLToPath(import.meta.url));
const serverPath=path.join(root,"backend/src/server.js");
const loginHtmlPath=path.join(root,"frontend/naxora-common-login.html");
const enginePath=path.join(root,"backend/src/part1361-first-owner-bootstrap.js");
const required=[
  "backend/src/part1361-first-owner-bootstrap.js",
  "backend/.env.part1361.example",
  "frontend/naxora-owner-bootstrap.html",
  "frontend/naxora-owner-bootstrap.css",
  "frontend/naxora-owner-bootstrap.js",
  "frontend/naxora-part1361-common-login-bridge.js",
];
let failed=false;
for(const rel of required){
  const ok=fs.existsSync(path.join(root,rel));
  console.log(`${ok?"PASS":"FAIL"} ${rel}`);
  if(!ok)failed=true;
}
for(const file of [
  serverPath,
  enginePath,
  path.join(root,"frontend/naxora-owner-bootstrap.js"),
  path.join(root,"frontend/naxora-part1361-common-login-bridge.js"),
]){
  const result=spawnSync(process.execPath,["--check",file],{encoding:"utf8"});
  const ok=result.status===0;
  console.log(`${ok?"PASS":"FAIL"} ${path.relative(root,file)} syntax`);
  if(!ok){console.error(result.stderr||result.stdout);failed=true}
}
const server=fs.readFileSync(serverPath,"utf8");
const loginHtml=fs.readFileSync(loginHtmlPath,"utf8");
const engine=fs.readFileSync(enginePath,"utf8");
const routeStart=server.indexOf("PART 136.1 COMMON LOGIN ROUTE FIX START");
const part120=server.indexOf("PART 120 — COMMON LOGIN");
const p136=server.indexOf("PART 136 — FINAL ALL ROLE VANI ACCEPTANCE");
const p1361=server.indexOf("PART 136.1 — FIRST OWNER BOOTSTRAP HOTFIX");
const p112=server.indexOf("PART 112 — RAZORPAY TEST MODE FOUNDATION");
const checks=[
  [routeStart>=0,"Early /login route fix exists"],
  [part120<0||routeStart<part120,"/login fix loads before Part 120 and legacy routes"],
  [server.includes('res.redirect(302, "/common-login")'),"/login redirects to Common Login"],
  [p136>=0&&p1361>p136&&p112>p1361,"Part 136 → Part 136.1 → Parts 112–119 order"],
  [loginHtml.includes("/naxora-part1361-common-login-bridge.js"),"Common Login bootstrap link bridge exists"],
  [engine.includes('"/owner-bootstrap"'),"Owner Bootstrap page route exists"],
  [engine.includes("/api/part1361/bootstrap/preview"),"Bootstrap preview API exists"],
  [engine.includes("/api/part1361/bootstrap/confirm"),"Bootstrap confirm API exists"],
  [engine.includes("NAXORA_OWNER_BOOTSTRAP_SECRET"),"Private bootstrap secret required"],
  [engine.includes("minimumBootstrapSecretLength: 24"),"Minimum secret length policy exists"],
  [engine.includes("passwordStoredInPreview: false"),"Password not stored in preview"],
  [engine.includes("confirmationDigest"),"Exact confirmation digest exists"],
  [engine.includes("BOOTSTRAP_LOCK_KEY"),"One-time bootstrap lock exists"],
  [engine.includes('role: "institute_owner"'),"Owner role creation exists"],
  [engine.includes("instituteId: identity.instituteId"),"Owner JWT includes instituteId"],
  [engine.includes('authSource: "part120"'),"Owner token uses Part 120 auth source"],
  [engine.includes("bootstrapSecretReturned: false"),"Bootstrap secret is not returned"],
  [engine.includes("passwordReturned: false"),"Password is not returned"],
  [engine.includes("additionalInstituteProvisioningIncluded: false"),"One-time first Owner boundary exists"],
];
for(const [ok,label] of checks){
  console.log(`${ok?"PASS":"FAIL"} ${label}`);
  if(!ok)failed=true;
}
process.exit(failed?1:0);
