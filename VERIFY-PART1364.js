import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const root=path.dirname(fileURLToPath(import.meta.url));
const files=[
  "backend/src/server.js",
  "backend/src/part1364-simple-owner-access.js",
  "frontend/naxora-common-login.html",
  "frontend/naxora-owner-access.html",
  "frontend/naxora-owner-access.css",
  "frontend/naxora-owner-access.js",
];
let failed=false;
for(const rel of files){
  const file=path.join(root,rel),exists=fs.existsSync(file);
  console.log(`${exists?"PASS":"FAIL"} ${rel} exists`);
  if(!exists){failed=true;continue}
  if(rel.endsWith(".js")){
    const result=spawnSync(process.execPath,["--check",file],{encoding:"utf8"}),ok=result.status===0;
    console.log(`${ok?"PASS":"FAIL"} ${rel} syntax`);
    if(!ok){console.error(result.stderr||result.stdout);failed=true}
  }
}
if(!failed){
  const server=fs.readFileSync(path.join(root,"backend/src/server.js"),"utf8");
  const backend=fs.readFileSync(path.join(root,"backend/src/part1364-simple-owner-access.js"),"utf8");
  const login=fs.readFileSync(path.join(root,"frontend/naxora-common-login.html"),"utf8");
  const html=fs.readFileSync(path.join(root,"frontend/naxora-owner-access.html"),"utf8");
  const js=fs.readFileSync(path.join(root,"frontend/naxora-owner-access.js"),"utf8");
  const checks=[
    [server.includes("PART 136.4 — SIMPLE OWNER SIGNUP AND LOGIN"),"Server Part 136.4 marker"],
    [server.includes("registerPart1364SimpleOwnerAccess({ app });"),"Server registration"],
    [login.includes('href="/owner-login"'),"Common Login Owner Sign In link"],
    [login.includes('href="/create-institute"'),"Common Login Create Institute link"],
    [!login.includes('/naxora-part1361-common-login-bridge.js'),"Old bootstrap bridge removed"],
    [backend.includes("/api/part1364/owner/signup"),"Owner signup API"],
    [backend.includes("/api/part1364/owner/login"),"Owner login API"],
    [backend.includes("ownerLoginNeedsInstituteId: false"),"Owner Institute ID not required"],
    [backend.includes("Part1364OwnerDirectory"),"Owner directory"],
    [backend.includes("Part1364InstituteProfile"),"Institute profile"],
    [backend.includes('role: "institute_owner"'),"Owner role"],
    [backend.includes('passwordHashing: "scrypt-v1"'),"Scrypt policy"],
    [backend.includes("emailVerificationIncluded: false"),"Honest verification boundary"],
    [html.includes("Institute ID nahi"),"Simple Owner UI"],
    [js.includes("/api/part1364/owner/login"),"Frontend login API"],
    [js.includes("/api/part1364/owner/signup"),"Frontend signup API"],
  ];
  for(const [ok,label] of checks){console.log(`${ok?"PASS":"FAIL"} ${label}`);if(!ok)failed=true}
}
process.exit(failed?1:0);
