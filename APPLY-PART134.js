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
  "backend/src/part130-vani-academic-operations.js",
  "backend/src/part131-vani-fees-finance-operations.js",
  "backend/src/part132-vani-admissions-crm-operations.js",
  "backend/src/part133-vani-communication-notifications.js",
  "backend/src/part134-vani-reports-exports.js",
  "frontend/naxora-reports-vani.html",
  "frontend/naxora-reports-vani.css",
  "frontend/naxora-reports-vani.js",
  "frontend/naxora-part134-global-vani-bridge.js",
];
const marker="// ================= PART 134 — VANI REPORTS EXPORTS =================";
const registration=`${marker}
const { registerPart134VaniReportsExports } = await import("./part134-vani-reports-exports.js");
registerPart134VaniReportsExports({ app });`;
const moduleStart="  // PART 134 VANI REPORTS EXPORTS MODULE START";
const moduleEnd="  // PART 134 VANI REPORTS EXPORTS MODULE END";
const moduleBlock=`${moduleStart}
  { key: "reports-vani", label: "VANI Reports & Exports", description: "Executive, Branch, Attendance, Academic, Finance, CRM, Communication and Student 360 reports with CSV, JSON and print-ready HTML exports.", category: "AI & VANI", route: "/reports-vani", icon: "chart", roles: ["institute_owner", "branch_manager", "teacher", "student", "parent", "accountant", "counsellor", "staff"], alwaysAvailable: true, order: 324 },
${moduleEnd}`;
const aliasStart="  // PART 134 VANI REPORTS EXPORTS ALIASES START";
const aliasEnd="  // PART 134 VANI REPORTS EXPORTS ALIASES END";
const aliasBlock=`${aliasStart}
  "reports vani": "reports-vani",
  reports: "reports-vani",
  exports: "reports-vani",
  "executive overview": "reports-vani",
  "branch overview": "reports-vani",
  "attendance report": "reports-vani",
  "academic report": "reports-vani",
  "finance report": "reports-vani",
  "crm report": "reports-vani",
  "communication report": "reports-vani",
  "student 360": "reports-vani",
  "part 134": "reports-vani",
${aliasEnd}`;

function fail(message){console.error(`\nPART 134 APPLY FAILED: ${message}\n`);process.exit(1)}
function check(file){return spawnSync(process.execPath,["--check",file],{encoding:"utf8"})}
function removeBetween(source,start,end){const a=start.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),b=end.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");return source.replace(new RegExp(`\\s*${a}[\\s\\S]*?${b}\\s*`,"g"),"\n")}
function registrationEnd(source,call){const index=source.indexOf(call);return index<0?-1:index+call.length}
function notFoundIndex(source){let index=source.indexOf("app.use(notFound);");if(index<0)index=source.indexOf("app.use(notFound)");if(index<0){const codeIndex=Math.max(source.indexOf('"ROUTE_NOT_FOUND"'),source.indexOf("'ROUTE_NOT_FOUND'"));index=codeIndex>=0?source.lastIndexOf("app.use(",codeIndex):-1}return index}

for(const rel of required)if(!fs.existsSync(path.join(root,rel)))fail(`Required file missing: ${rel}`);
for(const file of [serverPath,shellPath]){const result=check(file);if(result.status!==0)fail(`${path.relative(root,file)} syntax is broken before Part 134.\n${result.stderr||result.stdout}`)}

const original={server:fs.readFileSync(serverPath,"utf8"),shell:fs.readFileSync(shellPath,"utf8"),html:fs.readFileSync(htmlPath,"utf8")};
let server=original.server;
const escaped=marker.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
server=server.replace(new RegExp(`\\n*${escaped}\\nconst \\{ registerPart134VaniReportsExports \\} = await import\\("\\.\\/part134-vani-reports-exports\\.js"\\);\\nregisterPart134VaniReportsExports\\(\\{ app \\}\\);\\n*`,"g"),"\n\n");
const part133End=registrationEnd(server,"registerPart133VaniCommunicationNotifications({ app });");
if(part133End<0)fail("Part 133 registration call not found. Apply and verify Part 133 first.");
server=`${server.slice(0,part133End)}\n\n${registration}${server.slice(part133End)}`;

let shell=removeBetween(original.shell,moduleStart,moduleEnd);
shell=removeBetween(shell,aliasStart,aliasEnd);
const moduleAnchor="  // PART 133 VANI COMMUNICATION MODULE END";
const aliasAnchor="  // PART 133 VANI COMMUNICATION ALIASES END";
if(!shell.includes(moduleAnchor))fail("Part 133 shell module marker missing.");
if(!shell.includes(aliasAnchor))fail("Part 133 shell alias marker missing.");
shell=shell.replace(moduleAnchor,`${moduleAnchor}\n${moduleBlock}`);
shell=shell.replace(aliasAnchor,`${aliasAnchor}\n${aliasBlock}`);

let html=original.html.replace(/\s*<article><strong>134<\/strong><span>.*?<\/span><\/article>/g,"");
if(!html.includes("<strong>134</strong><span>VANI reports</span>")){
  const anchor=/(<article><strong>133<\/strong><span>.*?<\/span><\/article>)/;
  if(!anchor.test(html))fail("Part 133 progress card missing.");
  html=html.replace(anchor,`$1\n            <article><strong>134</strong><span>VANI reports</span></article>`);
}
html=html
  .replace(/Part 133 VANI Communication active hai: Templates, Notices, role-safe Messages, scheduled Notifications, consent, Inbox aur delivery tracking\./g,"Part 134 VANI Reports and Exports active hai: Executive, Branch, Attendance, Academic, Finance, CRM, Communication aur Student 360 reports with CSV, JSON and print-ready HTML exports.")
  .replace(/Part 133 • operations \+ master-data \+ bulk import \+ academics \+ finance \+ CRM \+ 12 communication actions/g,"Part 134 • operations + master-data + bulk import + academics + finance + CRM + communication + 12 reports actions");
if(!html.includes("/naxora-part134-global-vani-bridge.js")){
  const bridgeAnchor='<script src="/naxora-part133-global-vani-bridge.js"></script>';
  if(!html.includes(bridgeAnchor))fail("Part 133 Global VANI bridge anchor missing.");
  html=html.replace(bridgeAnchor,'<script src="/naxora-part134-global-vani-bridge.js"></script>\n  '+bridgeAnchor);
}

fs.writeFileSync(serverPath,server,"utf8");
fs.writeFileSync(shellPath,shell,"utf8");
fs.writeFileSync(htmlPath,html,"utf8");
for(const file of [serverPath,shellPath]){
  const result=check(file);
  if(result.status!==0){
    fs.writeFileSync(serverPath,original.server,"utf8");
    fs.writeFileSync(shellPath,original.shell,"utf8");
    fs.writeFileSync(htmlPath,original.html,"utf8");
    fail(`Syntax check failed after Part 134 integration. Originals restored.\n${result.stderr||result.stdout}`);
  }
}
const finalServer=fs.readFileSync(serverPath,"utf8");
const finalShell=fs.readFileSync(shellPath,"utf8");
const finalHtml=fs.readFileSync(htmlPath,"utf8");
const p133=finalServer.indexOf("PART 133 — VANI COMMUNICATION NOTIFICATIONS");
const p134=finalServer.indexOf("PART 134 — VANI REPORTS EXPORTS");
const p112=finalServer.indexOf("PART 112 — RAZORPAY TEST MODE FOUNDATION");
const p404=notFoundIndex(finalServer);
const valid=p133>=0&&p134>p133&&p112>p134&&p404>p112&&
  finalShell.includes('key: "reports-vani"')&&
  finalShell.includes('"part 134": "reports-vani"')&&
  finalHtml.includes('/naxora-part134-global-vani-bridge.js')&&
  finalHtml.indexOf('/naxora-part134-global-vani-bridge.js')<finalHtml.indexOf('/naxora-part133-global-vani-bridge.js')&&
  finalHtml.includes("<strong>134</strong><span>VANI reports</span>");
if(!valid){
  fs.writeFileSync(serverPath,original.server,"utf8");
  fs.writeFileSync(shellPath,original.shell,"utf8");
  fs.writeFileSync(htmlPath,original.html,"utf8");
  fail("Part 134 integration verification failed. Originals restored.");
}
console.log("\nPART 134 APPLIED SUCCESSFULLY");
console.log("Part 134 registered after Part 133: PASS");
console.log("Part 134 registered before Parts 112–119 routes: PASS");
console.log("Part 119 VANI Reports & Exports module added: PASS");
console.log("Part 119 reports aliases added: PASS");
console.log("Global VANI Part 134 bridge added before Part 133 bridge: PASS");
console.log("Unified app Part 134 progress and boundary updated: PASS");
console.log("server.js syntax: PASS");
console.log("Next: node .\\VERIFY-PART134.js\n");
