import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root=path.dirname(fileURLToPath(import.meta.url));
const serverPath=path.join(root,"backend/src/server.js");
const shellPath=path.join(root,"backend/src/part119-unified-app-shell.js");
const htmlPath=path.join(root,"frontend/naxora-unified-app.html");
const marker="// ================= PART 132 — VANI ADMISSIONS CRM OPERATIONS =================";
const moduleStart="  // PART 132 VANI ADMISSIONS CRM MODULE START";
const moduleEnd="  // PART 132 VANI ADMISSIONS CRM MODULE END";
const aliasStart="  // PART 132 VANI ADMISSIONS CRM ALIASES START";
const aliasEnd="  // PART 132 VANI ADMISSIONS CRM ALIASES END";
function removeBetween(source,start,end){const a=start.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),b=end.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");return source.replace(new RegExp(`\\s*${a}[\\s\\S]*?${b}\\s*`,"g"),"\n")}
const original={server:fs.readFileSync(serverPath,"utf8"),shell:fs.readFileSync(shellPath,"utf8"),html:fs.readFileSync(htmlPath,"utf8")};
const escaped=marker.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
const server=original.server.replace(new RegExp(`\\n*${escaped}\\nconst \\{ registerPart132VaniAdmissionsCrmOperations \\} = await import\\("\\.\\/part132-vani-admissions-crm-operations\\.js"\\);\\nregisterPart132VaniAdmissionsCrmOperations\\(\\{ app \\}\\);\\n*`,"g"),"\n\n");
let shell=removeBetween(original.shell,moduleStart,moduleEnd);shell=removeBetween(shell,aliasStart,aliasEnd);
let html=original.html.replace(/\s*<article><strong>132<\/strong><span>VANI CRM<\/span><\/article>/g,"").replace("Part 132 VANI Admissions and CRM active hai: Leads, Counsellor assignment, Follow-ups, Admission conversion, document checklist aur pipeline summary.","Part 131 VANI fees and finance operations active hain: fee structures, Student fees, invoices, manual receipts, due lists, reminders aur finance summaries.").replace("Part 132 • operations + master-data + bulk import + academics + finance + 12 CRM actions","Part 131 • operational + master-data + bulk import + academics + 12 finance actions").replace(/\s*<script src="\/naxora-part132-global-vani-bridge\.js"><\/script>/g,"");
fs.writeFileSync(serverPath,server,"utf8");fs.writeFileSync(shellPath,shell,"utf8");fs.writeFileSync(htmlPath,html,"utf8");
for(const file of [serverPath,shellPath]){const result=spawnSync(process.execPath,["--check",file],{encoding:"utf8"});if(result.status!==0){fs.writeFileSync(serverPath,original.server,"utf8");fs.writeFileSync(shellPath,original.shell,"utf8");fs.writeFileSync(htmlPath,original.html,"utf8");console.error("Part 132 rollback syntax failed; originals restored.");process.exit(1)}}
console.log("Part 132 registration, module, aliases, bridge and progress removed.");
