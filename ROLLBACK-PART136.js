import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root=path.dirname(fileURLToPath(import.meta.url));
const serverPath=path.join(root,"backend/src/server.js");
const shellPath=path.join(root,"backend/src/part119-unified-app-shell.js");
const htmlPath=path.join(root,"frontend/naxora-unified-app.html");
const marker="// ================= PART 136 — FINAL ALL ROLE VANI ACCEPTANCE =================";
const moduleStart="  // PART 136 FINAL VANI ACCEPTANCE MODULE START";
const moduleEnd="  // PART 136 FINAL VANI ACCEPTANCE MODULE END";
const aliasStart="  // PART 136 FINAL VANI ACCEPTANCE ALIASES START";
const aliasEnd="  // PART 136 FINAL VANI ACCEPTANCE ALIASES END";
function removeBetween(source,start,end){const a=start.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),b=end.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");return source.replace(new RegExp(`\\s*${a}[\\s\\S]*?${b}\\s*`,"g"),"\n")}
const original={server:fs.readFileSync(serverPath,"utf8"),shell:fs.readFileSync(shellPath,"utf8"),html:fs.readFileSync(htmlPath,"utf8")};
const escaped=marker.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
const server=original.server.replace(new RegExp(`\\n*${escaped}\\nconst \\{ registerPart136FinalAllRoleVaniAcceptance \\} = await import\\("\\.\\/part136-final-all-role-vani-acceptance\\.js"\\);\\nregisterPart136FinalAllRoleVaniAcceptance\\(\\{ app \\}\\);\\n*`,"g"),"\n\n");
let shell=removeBetween(original.shell,moduleStart,moduleEnd);shell=removeBetween(shell,aliasStart,aliasEnd);
let html=original.html.replace(/\s*<article><strong>136<\/strong><span>Final VANI acceptance<\/span><\/article>/g,"").replace("Part 136 Final VANI Acceptance gate active hai: 60-action catalog, eight-role tests, scope isolation, completed workflows, every-feature VANI buttons and desktop/mobile runtime evidence.","Part 135 VANI Conversational Workflow Engine active hai: multi-turn clarification, dependency-aware plans, native previews, exact confirmations, pause/resume aur failure-safe execution.").replace("Part 136 • final planned acceptance • sale-ready only after every required gate passes","Part 135 • Parts 130–134 native workflow orchestration + secure Parts 128–129 handoff").replace(/\s*<script src="\/naxora-part136-vani-button-coverage\.js"><\/script>/g,"");
fs.writeFileSync(serverPath,server,"utf8");fs.writeFileSync(shellPath,shell,"utf8");fs.writeFileSync(htmlPath,html,"utf8");
for(const file of [serverPath,shellPath]){const result=spawnSync(process.execPath,["--check",file],{encoding:"utf8"});if(result.status!==0){fs.writeFileSync(serverPath,original.server,"utf8");fs.writeFileSync(shellPath,original.shell,"utf8");fs.writeFileSync(htmlPath,original.html,"utf8");console.error("Part 136 rollback syntax failed; originals restored.");process.exit(1)}}
console.log("Part 136 registration, module, aliases, coverage bridge and final-gate progress removed.");
