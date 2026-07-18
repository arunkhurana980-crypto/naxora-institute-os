import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const root = path.dirname(fileURLToPath(import.meta.url));
const backendPath = path.join(root, "backend/src/part1361-first-owner-bootstrap.js");
const frontendPath = path.join(root, "frontend/naxora-owner-bootstrap.js");
let failed = false;
for (const file of [backendPath, frontendPath]) {
  const exists = fs.existsSync(file); console.log(`${exists ? "PASS" : "FAIL"} ${path.relative(root,file)} exists`); if (!exists) failed = true;
  if (exists) { const r = spawnSync(process.execPath,["--check",file],{encoding:"utf8"}); console.log(`${r.status===0?"PASS":"FAIL"} ${path.relative(root,file)} syntax`); if(r.status!==0){console.error(r.stderr||r.stdout);failed=true;} }
}
if (fs.existsSync(backendPath) && fs.existsSync(frontendPath)) {
  const b=fs.readFileSync(backendPath,"utf8"), f=fs.readFileSync(frontendPath,"utf8");
  const checks=[
    [b.includes("PART 136.2 SECRET TRANSPORT FIX START"),"Backend transport patch"],
    [b.includes("/api/part1361/bootstrap/verify-secret"),"Secret verify endpoint"],
    [b.includes("req.body?.bootstrapSecret"),"Secure body fallback"],
    [b.includes("delete req.body.bootstrapSecret"),"Request-body secret cleanup"],
    [b.includes("secretTransportFixActive: true"),"Status fix flag"],
    [f.includes("bootstrapSecret: currentSecret()"),"Frontend sends secure-body fallback"],
    [f.includes("verifySecretBeforeAction"),"Frontend pre-verification"],
    [f.includes('cache: "no-store"'),"No-store requests"],
  ];
  for(const [ok,label] of checks){console.log(`${ok?"PASS":"FAIL"} ${label}`);if(!ok)failed=true;}
}
process.exit(failed?1:0);
