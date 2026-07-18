import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root=path.dirname(fileURLToPath(import.meta.url));
const serverPath=path.join(root,"backend/src/server.js");
const shellPath=path.join(root,"backend/src/part119-unified-app-shell.js");
const htmlPath=path.join(root,"frontend/naxora-unified-app.html");
const required=[
  "backend/src/part134-vani-reports-exports.js",
  "backend/.env.part134.example",
  "frontend/naxora-reports-vani.html",
  "frontend/naxora-reports-vani.css",
  "frontend/naxora-reports-vani.js",
  "frontend/naxora-part134-global-vani-bridge.js",
];
let failed=false;
for(const rel of required){const ok=fs.existsSync(path.join(root,rel));console.log(`${ok?"PASS":"FAIL"} ${rel}`);if(!ok)failed=true}
for(const file of [serverPath,shellPath,path.join(root,"backend/src/part134-vani-reports-exports.js")]){
  const result=spawnSync(process.execPath,["--check",file],{encoding:"utf8"});
  const ok=result.status===0;
  console.log(`${ok?"PASS":"FAIL"} ${path.relative(root,file)} syntax`);
  if(!ok){console.error(result.stderr||result.stdout);failed=true}
}
const source=fs.readFileSync(serverPath,"utf8");
let p404=source.indexOf("app.use(notFound);");
if(p404<0)p404=source.indexOf("app.use(notFound)");
if(p404<0){const codeIndex=Math.max(source.indexOf('"ROUTE_NOT_FOUND"'),source.indexOf("'ROUTE_NOT_FOUND'"));p404=codeIndex>=0?source.lastIndexOf("app.use(",codeIndex):-1}
const markers=["PART 120 — COMMON LOGIN JWT AND ROLE ROUTING","PART 121 — OWNER MODULE CONSOLIDATION","PART 122 — TEACHER MODULE CONSOLIDATION","PART 123 — STUDENT MODULE CONSOLIDATION","PART 124 — PARENT STAFF AND BRANCH ROLE CONSOLIDATION","PART 125 — GLOBAL VANI MULTI STEP ACTIONS","PART 126 — NATIVE ADAPTERS AND CROSS MODULE E2E","PART 127 — FINAL DEMO ACCEPTANCE AND PROJECT FREEZE","PART 128 — VANI MASTER DATA ACTIONS","PART 129 — VANI BULK CSV JSON IMPORT","PART 130 — VANI ACADEMIC OPERATIONS","PART 131 — VANI FEES FINANCE OPERATIONS","PART 132 — VANI ADMISSIONS CRM OPERATIONS","PART 133 — VANI COMMUNICATION NOTIFICATIONS","PART 134 — VANI REPORTS EXPORTS","PART 112 — RAZORPAY TEST MODE FOUNDATION"];
const positions=markers.map(marker=>source.indexOf(marker));
const orderOk=positions.every(position=>position>=0)&&positions.slice(1).every((position,index)=>position>positions[index])&&p404>positions[positions.length-1];
console.log(`${orderOk?"PASS":"FAIL"} Part 120 → ... → 133 → 134 → Parts 112–119 → 404 order`);
if(!orderOk)failed=true;

const shell=fs.readFileSync(shellPath,"utf8");
const html=fs.readFileSync(htmlPath,"utf8");
for(const [ok,label] of [
  [shell.includes('key: "reports-vani"'),"Part 119 VANI Reports & Exports module exists"],
  [shell.includes('route: "/reports-vani"'),"Reports VANI route mapped"],
  [shell.includes('"student 360": "reports-vani"'),"Student 360 alias exists"],
  [shell.includes('"part 134": "reports-vani"'),"Part 134 alias exists"],
  [html.includes('/naxora-part134-global-vani-bridge.js'),"Global VANI Part 134 bridge exists"],
  [html.indexOf('/naxora-part134-global-vani-bridge.js')<html.indexOf('/naxora-part133-global-vani-bridge.js'),"Part 134 bridge loads before Part 133 bridge"],
  [html.includes("<strong>134</strong><span>VANI reports</span>"),"Unified app Part 134 progress exists"],
  [html.includes("Part 134 • operations + master-data + bulk import + academics + finance + CRM + communication + 12 reports actions"),"Unified app Part 134 capability label exists"],
]){
  console.log(`${ok?"PASS":"FAIL"} ${label}`);
  if(!ok)failed=true;
}
process.exit(failed?1:0);
