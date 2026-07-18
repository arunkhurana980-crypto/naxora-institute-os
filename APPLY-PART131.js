import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root=path.dirname(fileURLToPath(import.meta.url));
const serverPath=path.join(root,"backend/src/server.js");
const shellPath=path.join(root,"backend/src/part119-unified-app-shell.js");
const htmlPath=path.join(root,"frontend/naxora-unified-app.html");
const required=[
  "backend/src/part124-role-consolidation.js",
  "backend/src/part128-vani-master-data-actions.js",
  "backend/src/part130-vani-academic-operations.js",
  "backend/src/part131-vani-fees-finance-operations.js",
  "frontend/naxora-finance-vani.html",
  "frontend/naxora-finance-vani.css",
  "frontend/naxora-finance-vani.js",
  "frontend/naxora-part131-global-vani-bridge.js",
];
const marker="// ================= PART 131 — VANI FEES FINANCE OPERATIONS =================";
const registration=`${marker}\nconst { registerPart131VaniFeesFinanceOperations } = await import("./part131-vani-fees-finance-operations.js");\nregisterPart131VaniFeesFinanceOperations({ app });`;
const moduleStart="  // PART 131 VANI FEES FINANCE MODULE START";
const moduleEnd="  // PART 131 VANI FEES FINANCE MODULE END";
const moduleBlock=`${moduleStart}\n  { key: "finance-vani", label: "VANI Fees & Finance", description: "Fee structures, Student fees, invoices, manual receipts, dues, reminders and finance summaries.", category: "AI & VANI", route: "/finance-vani", icon: "wallet", roles: ["institute_owner", "branch_manager", "accountant", "student", "parent"], alwaysAvailable: true, order: 321 },\n${moduleEnd}`;
const aliasStart="  // PART 131 VANI FEES FINANCE ALIASES START";
const aliasEnd="  // PART 131 VANI FEES FINANCE ALIASES END";
const aliasBlock=`${aliasStart}\n  "finance operations": "finance-vani",\n  "finance vani": "finance-vani",\n  "fee structure": "finance-vani",\n  invoice: "finance-vani",\n  receipts: "finance-vani",\n  "due list": "finance-vani",\n  "fee statement": "finance-vani",\n  "finance summary": "finance-vani",\n  "part 131": "finance-vani",\n${aliasEnd}`;
function fail(message){console.error(`\nPART 131 APPLY FAILED: ${message}\n`);process.exit(1)}
function check(file){return spawnSync(process.execPath,["--check",file],{encoding:"utf8"})}
function removeBetween(source,start,end){const a=start.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),b=end.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");return source.replace(new RegExp(`\\s*${a}[\\s\\S]*?${b}\\s*`,"g"),"\n")}
function registrationEnd(source,call){const index=source.indexOf(call);return index<0?-1:index+call.length}
function notFoundIndex(source){let index=source.indexOf("app.use(notFound);");if(index<0)index=source.indexOf("app.use(notFound)");if(index<0){const codeIndex=Math.max(source.indexOf('"ROUTE_NOT_FOUND"'),source.indexOf("'ROUTE_NOT_FOUND'"));index=codeIndex>=0?source.lastIndexOf("app.use(",codeIndex):-1}return index}
for(const rel of required)if(!fs.existsSync(path.join(root,rel)))fail(`Required file missing: ${rel}`);
for(const file of [serverPath,shellPath]){const result=check(file);if(result.status!==0)fail(`${path.relative(root,file)} syntax is broken before Part 131.\n${result.stderr||result.stdout}`)}
const original={server:fs.readFileSync(serverPath,"utf8"),shell:fs.readFileSync(shellPath,"utf8"),html:fs.readFileSync(htmlPath,"utf8")};
let server=original.server;const escaped=marker.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");server=server.replace(new RegExp(`\\n*${escaped}\\nconst \\{ registerPart131VaniFeesFinanceOperations \\} = await import\\("\\.\\/part131-vani-fees-finance-operations\\.js"\\);\\nregisterPart131VaniFeesFinanceOperations\\(\\{ app \\}\\);\\n*`,"g"),"\n\n");
const part130End=registrationEnd(server,"registerPart130VaniAcademicOperations({ app });");if(part130End<0)fail("Part 130 registration call not found. Apply and verify Part 130 first.");server=`${server.slice(0,part130End)}\n\n${registration}${server.slice(part130End)}`;
let shell=removeBetween(original.shell,moduleStart,moduleEnd);shell=removeBetween(shell,aliasStart,aliasEnd);const moduleAnchor="  // PART 130 VANI ACADEMIC OPERATIONS MODULE END",aliasAnchor="  // PART 130 VANI ACADEMIC OPERATIONS ALIASES END";if(!shell.includes(moduleAnchor))fail("Part 130 shell module marker missing.");if(!shell.includes(aliasAnchor))fail("Part 130 shell alias marker missing.");shell=shell.replace(moduleAnchor,`${moduleAnchor}\n${moduleBlock}`);shell=shell.replace(aliasAnchor,`${aliasAnchor}\n${aliasBlock}`);
let html=original.html.replace(/\s*<article><strong>131<\/strong><span>.*?<\/span><\/article>/g,"");if(!html.includes("<strong>131</strong><span>VANI finance</span>")){const anchor=/(<article><strong>130<\/strong><span>.*?<\/span><\/article>)/;if(!anchor.test(html))fail("Part 130 progress card missing.");html=html.replace(anchor,`$1\n            <article><strong>131</strong><span>VANI finance</span></article>`)}
html=html.replace(/Part 130 VANI academic operations active hain: timetable, bulk attendance, assignments, exams, marks, results aur Student progress\./g,"Part 131 VANI fees and finance operations active hain: fee structures, Student fees, invoices, manual receipts, due lists, reminders aur finance summaries.").replace(/Part 130 • 9 operational \+ 14 master-data \+ bulk import \+ 12 academic actions/g,"Part 131 • operational + master-data + bulk import + academics + 12 finance actions");
if(!html.includes("/naxora-part131-global-vani-bridge.js")){const bridgeAnchor='<script src="/naxora-part130-global-vani-bridge.js"></script>';if(!html.includes(bridgeAnchor))fail("Part 130 Global VANI bridge anchor missing.");html=html.replace(bridgeAnchor,'<script src="/naxora-part131-global-vani-bridge.js"></script>\n  '+bridgeAnchor)}
fs.writeFileSync(serverPath,server,"utf8");fs.writeFileSync(shellPath,shell,"utf8");fs.writeFileSync(htmlPath,html,"utf8");for(const file of [serverPath,shellPath]){const result=check(file);if(result.status!==0){fs.writeFileSync(serverPath,original.server,"utf8");fs.writeFileSync(shellPath,original.shell,"utf8");fs.writeFileSync(htmlPath,original.html,"utf8");fail(`Syntax check failed after Part 131 integration. Originals restored.\n${result.stderr||result.stdout}`)}}
const finalServer=fs.readFileSync(serverPath,"utf8"),finalShell=fs.readFileSync(shellPath,"utf8"),finalHtml=fs.readFileSync(htmlPath,"utf8");const p130=finalServer.indexOf("PART 130 — VANI ACADEMIC OPERATIONS"),p131=finalServer.indexOf("PART 131 — VANI FEES FINANCE OPERATIONS"),p112=finalServer.indexOf("PART 112 — RAZORPAY TEST MODE FOUNDATION"),p404=notFoundIndex(finalServer);const valid=p130>=0&&p131>p130&&p112>p131&&p404>p112&&finalShell.includes('key: "finance-vani"')&&finalShell.includes('"part 131": "finance-vani"')&&finalHtml.includes('/naxora-part131-global-vani-bridge.js')&&finalHtml.indexOf('/naxora-part131-global-vani-bridge.js')<finalHtml.indexOf('/naxora-part130-global-vani-bridge.js')&&finalHtml.includes("<strong>131</strong><span>VANI finance</span>");if(!valid){fs.writeFileSync(serverPath,original.server,"utf8");fs.writeFileSync(shellPath,original.shell,"utf8");fs.writeFileSync(htmlPath,original.html,"utf8");fail("Part 131 integration verification failed. Originals restored.")}
console.log("\nPART 131 APPLIED SUCCESSFULLY");console.log("Part 131 registered after Part 130: PASS");console.log("Part 131 registered before Parts 112–119 routes: PASS");console.log("Part 119 VANI Fees & Finance module added: PASS");console.log("Part 119 finance aliases added: PASS");console.log("Global VANI Part 131 bridge added before Part 130 bridge: PASS");console.log("Unified app Part 131 progress and boundary updated: PASS");console.log("server.js syntax: PASS");console.log("Next: node .\\VERIFY-PART131.js\n");
