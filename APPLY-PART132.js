import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root=path.dirname(fileURLToPath(import.meta.url));
const serverPath=path.join(root,"backend/src/server.js");
const shellPath=path.join(root,"backend/src/part119-unified-app-shell.js");
const htmlPath=path.join(root,"frontend/naxora-unified-app.html");
const required=[
  "backend/src/part120-common-login.js",
  "backend/src/part124-role-consolidation.js",
  "backend/src/part128-vani-master-data-actions.js",
  "backend/src/part131-vani-fees-finance-operations.js",
  "backend/src/part132-vani-admissions-crm-operations.js",
  "frontend/naxora-crm-vani.html",
  "frontend/naxora-crm-vani.css",
  "frontend/naxora-crm-vani.js",
  "frontend/naxora-part132-global-vani-bridge.js",
];
const marker="// ================= PART 132 — VANI ADMISSIONS CRM OPERATIONS =================";
const registration=`${marker}
const { registerPart132VaniAdmissionsCrmOperations } = await import("./part132-vani-admissions-crm-operations.js");
registerPart132VaniAdmissionsCrmOperations({ app });`;
const moduleStart="  // PART 132 VANI ADMISSIONS CRM MODULE START";
const moduleEnd="  // PART 132 VANI ADMISSIONS CRM MODULE END";
const moduleBlock=`${moduleStart}
  { key: "crm-vani", label: "VANI Admissions & CRM", description: "Enquiries, Leads, Counsellor assignment, Follow-ups, Admissions and document checklist.", category: "AI & VANI", route: "/crm-vani", icon: "growth", roles: ["institute_owner", "branch_manager", "counsellor", "staff"], alwaysAvailable: true, order: 322 },
${moduleEnd}`;
const aliasStart="  // PART 132 VANI ADMISSIONS CRM ALIASES START";
const aliasEnd="  // PART 132 VANI ADMISSIONS CRM ALIASES END";
const aliasBlock=`${aliasStart}
  "admissions crm": "crm-vani",
  "crm vani": "crm-vani",
  leads: "crm-vani",
  enquiries: "crm-vani",
  inquiries: "crm-vani",
  "lead follow up": "crm-vani",
  "admission conversion": "crm-vani",
  "document checklist": "crm-vani",
  "crm pipeline": "crm-vani",
  "part 132": "crm-vani",
${aliasEnd}`;
function fail(message){console.error(`\nPART 132 APPLY FAILED: ${message}\n`);process.exit(1)}
function check(file){return spawnSync(process.execPath,["--check",file],{encoding:"utf8"})}
function removeBetween(source,start,end){const a=start.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),b=end.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");return source.replace(new RegExp(`\\s*${a}[\\s\\S]*?${b}\\s*`,"g"),"\n")}
function registrationEnd(source,call){const index=source.indexOf(call);return index<0?-1:index+call.length}
function notFoundIndex(source){let index=source.indexOf("app.use(notFound);");if(index<0)index=source.indexOf("app.use(notFound)");if(index<0){const codeIndex=Math.max(source.indexOf('"ROUTE_NOT_FOUND"'),source.indexOf("'ROUTE_NOT_FOUND'"));index=codeIndex>=0?source.lastIndexOf("app.use(",codeIndex):-1}return index}
for(const rel of required)if(!fs.existsSync(path.join(root,rel)))fail(`Required file missing: ${rel}`);
for(const file of [serverPath,shellPath]){const result=check(file);if(result.status!==0)fail(`${path.relative(root,file)} syntax is broken before Part 132.\n${result.stderr||result.stdout}`)}
const original={server:fs.readFileSync(serverPath,"utf8"),shell:fs.readFileSync(shellPath,"utf8"),html:fs.readFileSync(htmlPath,"utf8")};
let server=original.server;const escaped=marker.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");server=server.replace(new RegExp(`\\n*${escaped}\\nconst \\{ registerPart132VaniAdmissionsCrmOperations \\} = await import\\("\\.\\/part132-vani-admissions-crm-operations\\.js"\\);\\nregisterPart132VaniAdmissionsCrmOperations\\(\\{ app \\}\\);\\n*`,"g"),"\n\n");
const part131End=registrationEnd(server,"registerPart131VaniFeesFinanceOperations({ app });");if(part131End<0)fail("Part 131 registration call not found. Apply and verify Part 131 first.");server=`${server.slice(0,part131End)}\n\n${registration}${server.slice(part131End)}`;
let shell=removeBetween(original.shell,moduleStart,moduleEnd);shell=removeBetween(shell,aliasStart,aliasEnd);const moduleAnchor="  // PART 131 VANI FEES FINANCE MODULE END",aliasAnchor="  // PART 131 VANI FEES FINANCE ALIASES END";if(!shell.includes(moduleAnchor))fail("Part 131 shell module marker missing.");if(!shell.includes(aliasAnchor))fail("Part 131 shell alias marker missing.");shell=shell.replace(moduleAnchor,`${moduleAnchor}\n${moduleBlock}`);shell=shell.replace(aliasAnchor,`${aliasAnchor}\n${aliasBlock}`);
let html=original.html.replace(/\s*<article><strong>132<\/strong><span>.*?<\/span><\/article>/g,"");if(!html.includes("<strong>132</strong><span>VANI CRM</span>")){const anchor=/(<article><strong>131<\/strong><span>.*?<\/span><\/article>)/;if(!anchor.test(html))fail("Part 131 progress card missing.");html=html.replace(anchor,`$1\n            <article><strong>132</strong><span>VANI CRM</span></article>`)}
html=html.replace(/Part 131 VANI fees and finance operations active hain: fee structures, Student fees, invoices, manual receipts, due lists, reminders aur finance summaries\./g,"Part 132 VANI Admissions and CRM active hai: Leads, Counsellor assignment, Follow-ups, Admission conversion, document checklist aur pipeline summary.").replace(/Part 131 • operational \+ master-data \+ bulk import \+ academics \+ 12 finance actions/g,"Part 132 • operations + master-data + bulk import + academics + finance + 12 CRM actions");
if(!html.includes("/naxora-part132-global-vani-bridge.js")){const bridgeAnchor='<script src="/naxora-part131-global-vani-bridge.js"></script>';if(!html.includes(bridgeAnchor))fail("Part 131 Global VANI bridge anchor missing.");html=html.replace(bridgeAnchor,'<script src="/naxora-part132-global-vani-bridge.js"></script>\n  '+bridgeAnchor)}
fs.writeFileSync(serverPath,server,"utf8");fs.writeFileSync(shellPath,shell,"utf8");fs.writeFileSync(htmlPath,html,"utf8");for(const file of [serverPath,shellPath]){const result=check(file);if(result.status!==0){fs.writeFileSync(serverPath,original.server,"utf8");fs.writeFileSync(shellPath,original.shell,"utf8");fs.writeFileSync(htmlPath,original.html,"utf8");fail(`Syntax check failed after Part 132 integration. Originals restored.\n${result.stderr||result.stdout}`)}}
const finalServer=fs.readFileSync(serverPath,"utf8"),finalShell=fs.readFileSync(shellPath,"utf8"),finalHtml=fs.readFileSync(htmlPath,"utf8");const p131=finalServer.indexOf("PART 131 — VANI FEES FINANCE OPERATIONS"),p132=finalServer.indexOf("PART 132 — VANI ADMISSIONS CRM OPERATIONS"),p112=finalServer.indexOf("PART 112 — RAZORPAY TEST MODE FOUNDATION"),p404=notFoundIndex(finalServer);const valid=p131>=0&&p132>p131&&p112>p132&&p404>p112&&finalShell.includes('key: "crm-vani"')&&finalShell.includes('"part 132": "crm-vani"')&&finalHtml.includes('/naxora-part132-global-vani-bridge.js')&&finalHtml.indexOf('/naxora-part132-global-vani-bridge.js')<finalHtml.indexOf('/naxora-part131-global-vani-bridge.js')&&finalHtml.includes("<strong>132</strong><span>VANI CRM</span>");if(!valid){fs.writeFileSync(serverPath,original.server,"utf8");fs.writeFileSync(shellPath,original.shell,"utf8");fs.writeFileSync(htmlPath,original.html,"utf8");fail("Part 132 integration verification failed. Originals restored.")}
console.log("\nPART 132 APPLIED SUCCESSFULLY");console.log("Part 132 registered after Part 131: PASS");console.log("Part 132 registered before Parts 112–119 routes: PASS");console.log("Part 119 VANI Admissions & CRM module added: PASS");console.log("Part 119 CRM aliases added: PASS");console.log("Global VANI Part 132 bridge added before Part 131 bridge: PASS");console.log("Unified app Part 132 progress and boundary updated: PASS");console.log("server.js syntax: PASS");console.log("Next: node .\\VERIFY-PART132.js\n");
