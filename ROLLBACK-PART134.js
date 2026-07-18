import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root=path.dirname(fileURLToPath(import.meta.url));
const serverPath=path.join(root,"backend/src/server.js");
const shellPath=path.join(root,"backend/src/part119-unified-app-shell.js");
const htmlPath=path.join(root,"frontend/naxora-unified-app.html");
const marker="// ================= PART 134 — VANI REPORTS EXPORTS =================";
const moduleStart="  // PART 134 VANI REPORTS EXPORTS MODULE START";
const moduleEnd="  // PART 134 VANI REPORTS EXPORTS MODULE END";
const aliasStart="  // PART 134 VANI REPORTS EXPORTS ALIASES START";
const aliasEnd="  // PART 134 VANI REPORTS EXPORTS ALIASES END";
function removeBetween(source,start,end){const a=start.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),b=end.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");return source.replace(new RegExp(`\\s*${a}[\\s\\S]*?${b}\\s*`,"g"),"\n")}
const original={server:fs.readFileSync(serverPath,"utf8"),shell:fs.readFileSync(shellPath,"utf8"),html:fs.readFileSync(htmlPath,"utf8")};
const escaped=marker.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
const server=original.server.replace(new RegExp(`\\n*${escaped}\\nconst \\{ registerPart134VaniReportsExports \\} = await import\\("\\.\\/part134-vani-reports-exports\\.js"\\);\\nregisterPart134VaniReportsExports\\(\\{ app \\}\\);\\n*`,"g"),"\n\n");
let shell=removeBetween(original.shell,moduleStart,moduleEnd);
shell=removeBetween(shell,aliasStart,aliasEnd);
let html=original.html
  .replace(/\s*<article><strong>134<\/strong><span>VANI reports<\/span><\/article>/g,"")
  .replace("Part 134 VANI Reports and Exports active hai: Executive, Branch, Attendance, Academic, Finance, CRM, Communication aur Student 360 reports with CSV, JSON and print-ready HTML exports.","Part 133 VANI Communication active hai: Templates, Notices, role-safe Messages, scheduled Notifications, consent, Inbox aur delivery tracking.")
  .replace("Part 134 • operations + master-data + bulk import + academics + finance + CRM + communication + 12 reports actions","Part 133 • operations + master-data + bulk import + academics + finance + CRM + 12 communication actions")
  .replace(/\s*<script src="\/naxora-part134-global-vani-bridge\.js"><\/script>/g,"");
fs.writeFileSync(serverPath,server,"utf8");
fs.writeFileSync(shellPath,shell,"utf8");
fs.writeFileSync(htmlPath,html,"utf8");
for(const file of [serverPath,shellPath]){
  const result=spawnSync(process.execPath,["--check",file],{encoding:"utf8"});
  if(result.status!==0){
    fs.writeFileSync(serverPath,original.server,"utf8");
    fs.writeFileSync(shellPath,original.shell,"utf8");
    fs.writeFileSync(htmlPath,original.html,"utf8");
    console.error("Part 134 rollback syntax failed; originals restored.");
    process.exit(1);
  }
}
console.log("Part 134 registration, module, aliases, bridge and progress removed.");
