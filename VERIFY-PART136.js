import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root=path.dirname(fileURLToPath(import.meta.url));
const serverPath=path.join(root,"backend/src/server.js");
const shellPath=path.join(root,"backend/src/part119-unified-app-shell.js");
const htmlPath=path.join(root,"frontend/naxora-unified-app.html");
const enginePath=path.join(root,"backend/src/part136-final-all-role-vani-acceptance.js");
const required=[
  "backend/src/part136-final-all-role-vani-acceptance.js",
  "backend/.env.part136.example",
  "frontend/naxora-vani-acceptance.html",
  "frontend/naxora-vani-acceptance.css",
  "frontend/naxora-vani-acceptance.js",
  "frontend/naxora-part136-vani-button-coverage.js",
];
let failed=false;
for(const rel of required){const ok=fs.existsSync(path.join(root,rel));console.log(`${ok?"PASS":"FAIL"} ${rel}`);if(!ok)failed=true}
for(const file of [serverPath,shellPath,enginePath,path.join(root,"frontend/naxora-vani-acceptance.js"),path.join(root,"frontend/naxora-part136-vani-button-coverage.js")]){const result=spawnSync(process.execPath,["--check",file],{encoding:"utf8"});const ok=result.status===0;console.log(`${ok?"PASS":"FAIL"} ${path.relative(root,file)} syntax`);if(!ok){console.error(result.stderr||result.stdout);failed=true}}
const source=fs.readFileSync(serverPath,"utf8");let p404=source.indexOf("app.use(notFound);");if(p404<0)p404=source.indexOf("app.use(notFound)");if(p404<0){const codeIndex=Math.max(source.indexOf('"ROUTE_NOT_FOUND"'),source.indexOf("'ROUTE_NOT_FOUND'"));p404=codeIndex>=0?source.lastIndexOf("app.use(",codeIndex):-1}
const markers=["PART 120 — COMMON LOGIN JWT AND ROLE ROUTING","PART 121 — OWNER MODULE CONSOLIDATION","PART 122 — TEACHER MODULE CONSOLIDATION","PART 123 — STUDENT MODULE CONSOLIDATION","PART 124 — PARENT STAFF AND BRANCH ROLE CONSOLIDATION","PART 125 — GLOBAL VANI MULTI STEP ACTIONS","PART 126 — NATIVE ADAPTERS AND CROSS MODULE E2E","PART 127 — FINAL DEMO ACCEPTANCE AND PROJECT FREEZE","PART 128 — VANI MASTER DATA ACTIONS","PART 129 — VANI BULK CSV JSON IMPORT","PART 130 — VANI ACADEMIC OPERATIONS","PART 131 — VANI FEES FINANCE OPERATIONS","PART 132 — VANI ADMISSIONS CRM OPERATIONS","PART 133 — VANI COMMUNICATION NOTIFICATIONS","PART 134 — VANI REPORTS EXPORTS","PART 135 — VANI CONVERSATIONAL WORKFLOW ENGINE","PART 136 — FINAL ALL ROLE VANI ACCEPTANCE","PART 112 — RAZORPAY TEST MODE FOUNDATION"];
const positions=markers.map(marker=>source.indexOf(marker));const orderOk=positions.every(position=>position>=0)&&positions.slice(1).every((position,index)=>position>positions[index])&&p404>positions[positions.length-1];console.log(`${orderOk?"PASS":"FAIL"} Part 120 → ... → 135 → 136 → Parts 112–119 → 404 order`);if(!orderOk)failed=true;
const shell=fs.readFileSync(shellPath,"utf8"),html=fs.readFileSync(htmlPath,"utf8"),engine=fs.readFileSync(enginePath,"utf8");
const checks=[
  [shell.includes('key: "vani-acceptance"'),"Part 119 Final VANI Acceptance module exists"],
  [shell.includes('route: "/vani-acceptance"'),"Part 136 route mapped"],
  [shell.includes('"part 136": "vani-acceptance"'),"Part 136 alias exists"],
  [html.includes('/naxora-part136-vani-button-coverage.js'),"Feature VANI coverage bridge exists"],
  [html.indexOf('/naxora-part136-vani-button-coverage.js')<html.indexOf('/naxora-part135-global-vani-bridge.js'),"Part 136 coverage bridge loads before Part 135"],
  [html.includes("<strong>136</strong><span>Final VANI acceptance</span>"),"Unified app Part 136 progress exists"],
  [html.includes("Part 136 • final planned acceptance • sale-ready only after every required gate passes"),"Honest final gate label exists"],
  [engine.includes("EXPECTED_NATIVE_ACTIONS = 60"),"60 native action gate exists"],
  [engine.includes("ROLE_KEYS = ["),"Eight-role matrix exists"],
  [engine.includes("REQUIRED_SCOPE_DENIAL_ROLES"),"Scope-denial gates exist"],
  [engine.includes("REQUIRED_WORKFLOWS"),"Completed workflow evidence exists"],
  [engine.includes("desktopCoverage"),"Desktop button coverage gate exists"],
  [engine.includes("mobileCoverage"),"Mobile button coverage gate exists"],
  [engine.includes("ACCEPTANCE_GATES_NOT_PASSED"),"Fail-closed finalization exists"],
  [engine.includes("FINALIZE VANI SAFE SCOPE SALE READY"),"Exact final confirmation exists"],
  [engine.includes("nextPart: null"),"Roadmap closes at Part 136"],
  [engine.includes("directMoneyMovement: false"),"Safe money boundary exists"],
  [engine.includes("passwordOtpOwnerSecretHandling: false"),"Secret/password boundary exists"],
];
for(const [ok,label] of checks){console.log(`${ok?"PASS":"FAIL"} ${label}`);if(!ok)failed=true}
process.exit(failed?1:0);
