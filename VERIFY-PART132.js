import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root=path.dirname(fileURLToPath(import.meta.url));
const serverPath=path.join(root,"backend/src/server.js");
const shellPath=path.join(root,"backend/src/part119-unified-app-shell.js");
const htmlPath=path.join(root,"frontend/naxora-unified-app.html");
const required=[
  "backend/src/part132-vani-admissions-crm-operations.js",
  "backend/.env.part132.example",
  "frontend/naxora-crm-vani.html",
  "frontend/naxora-crm-vani.css",
  "frontend/naxora-crm-vani.js",
  "frontend/naxora-part132-global-vani-bridge.js",
];
let failed=false;
for(const rel of required){const ok=fs.existsSync(path.join(root,rel));console.log(`${ok?"PASS":"FAIL"} ${rel}`);if(!ok)failed=true}
for(const file of [serverPath,shellPath,path.join(root,"backend/src/part132-vani-admissions-crm-operations.js")]){const result=spawnSync(process.execPath,["--check",file],{encoding:"utf8"});const ok=result.status===0;console.log(`${ok?"PASS":"FAIL"} ${path.relative(root,file)} syntax`);if(!ok){console.error(result.stderr||result.stdout);failed=true}}
const source=fs.readFileSync(serverPath,"utf8");let p404=source.indexOf("app.use(notFound);");if(p404<0)p404=source.indexOf("app.use(notFound)");if(p404<0){const codeIndex=Math.max(source.indexOf('"ROUTE_NOT_FOUND"'),source.indexOf("'ROUTE_NOT_FOUND'"));p404=codeIndex>=0?source.lastIndexOf("app.use(",codeIndex):-1}
const markers=["PART 120 — COMMON LOGIN JWT AND ROLE ROUTING","PART 121 — OWNER MODULE CONSOLIDATION","PART 122 — TEACHER MODULE CONSOLIDATION","PART 123 — STUDENT MODULE CONSOLIDATION","PART 124 — PARENT STAFF AND BRANCH ROLE CONSOLIDATION","PART 125 — GLOBAL VANI MULTI STEP ACTIONS","PART 126 — NATIVE ADAPTERS AND CROSS MODULE E2E","PART 127 — FINAL DEMO ACCEPTANCE AND PROJECT FREEZE","PART 128 — VANI MASTER DATA ACTIONS","PART 129 — VANI BULK CSV JSON IMPORT","PART 130 — VANI ACADEMIC OPERATIONS","PART 131 — VANI FEES FINANCE OPERATIONS","PART 132 — VANI ADMISSIONS CRM OPERATIONS","PART 112 — RAZORPAY TEST MODE FOUNDATION"];
const positions=markers.map(marker=>source.indexOf(marker));const orderOk=positions.every(position=>position>=0)&&positions.slice(1).every((position,index)=>position>positions[index])&&p404>positions[positions.length-1];console.log(`${orderOk?"PASS":"FAIL"} Part 120 → ... → 131 → 132 → Parts 112–119 → 404 order`);if(!orderOk)failed=true;
const shell=fs.readFileSync(shellPath,"utf8"),html=fs.readFileSync(htmlPath,"utf8");
for(const [ok,label] of [
  [shell.includes('key: "crm-vani"'),"Part 119 VANI Admissions & CRM module exists"],
  [shell.includes('route: "/crm-vani"'),"CRM VANI route mapped"],
  [shell.includes('"admissions crm": "crm-vani"'),"Admissions CRM alias exists"],
  [shell.includes('"part 132": "crm-vani"'),"Part 132 alias exists"],
  [html.includes('/naxora-part132-global-vani-bridge.js'),"Global VANI Part 132 bridge exists"],
  [html.indexOf('/naxora-part132-global-vani-bridge.js')<html.indexOf('/naxora-part131-global-vani-bridge.js'),"Part 132 bridge loads before Part 131 bridge"],
  [html.includes("<strong>132</strong><span>VANI CRM</span>"),"Unified app Part 132 progress exists"],
  [html.includes("Part 132 • operations + master-data + bulk import + academics + finance + 12 CRM actions"),"Unified app Part 132 capability label exists"],
]){console.log(`${ok?"PASS":"FAIL"} ${label}`);if(!ok)failed=true}
process.exit(failed?1:0);
