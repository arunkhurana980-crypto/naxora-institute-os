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
  "backend/src/part127-final-acceptance-freeze.js",
  "backend/src/part130-vani-academic-operations.js",
  "backend/src/part131-vani-fees-finance-operations.js",
  "backend/src/part132-vani-admissions-crm-operations.js",
  "backend/src/part133-vani-communication-notifications.js",
  "backend/src/part134-vani-reports-exports.js",
  "backend/src/part135-vani-conversational-workflow-engine.js",
  "backend/src/part136-final-all-role-vani-acceptance.js",
  "frontend/naxora-vani-acceptance.html",
  "frontend/naxora-vani-acceptance.css",
  "frontend/naxora-vani-acceptance.js",
  "frontend/naxora-part136-vani-button-coverage.js",
];
const marker="// ================= PART 136 — FINAL ALL ROLE VANI ACCEPTANCE =================";
const registration=`${marker}
const { registerPart136FinalAllRoleVaniAcceptance } = await import("./part136-final-all-role-vani-acceptance.js");
registerPart136FinalAllRoleVaniAcceptance({ app });`;
const moduleStart="  // PART 136 FINAL VANI ACCEPTANCE MODULE START";
const moduleEnd="  // PART 136 FINAL VANI ACCEPTANCE MODULE END";
const moduleBlock=`${moduleStart}
  { key: "vani-acceptance", label: "VANI Final Acceptance", description: "All-role runtime evidence, scope-denial proof, completed workflows, feature-button coverage and safe-scope sale-ready gate.", category: "AI & VANI", route: "/vani-acceptance", icon: "verified", roles: ["institute_owner", "branch_manager", "teacher", "student", "parent", "accountant", "counsellor", "staff"], alwaysAvailable: true, order: 326 },
${moduleEnd}`;
const aliasStart="  // PART 136 FINAL VANI ACCEPTANCE ALIASES START";
const aliasEnd="  // PART 136 FINAL VANI ACCEPTANCE ALIASES END";
const aliasBlock=`${aliasStart}
  "vani acceptance": "vani-acceptance",
  "final vani acceptance": "vani-acceptance",
  "sale ready gate": "vani-acceptance",
  "vani certification": "vani-acceptance",
  "all role test": "vani-acceptance",
  "part 136": "vani-acceptance",
${aliasEnd}`;
function fail(message){console.error(`\nPART 136 APPLY FAILED: ${message}\n`);process.exit(1)}
function check(file){return spawnSync(process.execPath,["--check",file],{encoding:"utf8"})}
function removeBetween(source,start,end){const a=start.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),b=end.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");return source.replace(new RegExp(`\\s*${a}[\\s\\S]*?${b}\\s*`,"g"),"\n")}
function registrationEnd(source,call){const index=source.indexOf(call);return index<0?-1:index+call.length}
function notFoundIndex(source){let index=source.indexOf("app.use(notFound);");if(index<0)index=source.indexOf("app.use(notFound)");if(index<0){const codeIndex=Math.max(source.indexOf('"ROUTE_NOT_FOUND"'),source.indexOf("'ROUTE_NOT_FOUND'"));index=codeIndex>=0?source.lastIndexOf("app.use(",codeIndex):-1}return index}

for(const rel of required)if(!fs.existsSync(path.join(root,rel)))fail(`Required file missing: ${rel}`);
for(const file of [serverPath,shellPath]){const result=check(file);if(result.status!==0)fail(`${path.relative(root,file)} syntax is broken before Part 136.\n${result.stderr||result.stdout}`)}
const original={server:fs.readFileSync(serverPath,"utf8"),shell:fs.readFileSync(shellPath,"utf8"),html:fs.readFileSync(htmlPath,"utf8")};
let server=original.server;const escaped=marker.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");server=server.replace(new RegExp(`\\n*${escaped}\\nconst \\{ registerPart136FinalAllRoleVaniAcceptance \\} = await import\\("\\.\\/part136-final-all-role-vani-acceptance\\.js"\\);\\nregisterPart136FinalAllRoleVaniAcceptance\\(\\{ app \\}\\);\\n*`,"g"),"\n\n");
const part135End=registrationEnd(server,"registerPart135VaniConversationalWorkflowEngine({ app });");if(part135End<0)fail("Part 135 registration call not found. Apply and verify Part 135 first.");server=`${server.slice(0,part135End)}\n\n${registration}${server.slice(part135End)}`;
let shell=removeBetween(original.shell,moduleStart,moduleEnd);shell=removeBetween(shell,aliasStart,aliasEnd);const moduleAnchor="  // PART 135 VANI WORKFLOW ENGINE MODULE END",aliasAnchor="  // PART 135 VANI WORKFLOW ENGINE ALIASES END";if(!shell.includes(moduleAnchor))fail("Part 135 shell module marker missing.");if(!shell.includes(aliasAnchor))fail("Part 135 shell alias marker missing.");shell=shell.replace(moduleAnchor,`${moduleAnchor}\n${moduleBlock}`);shell=shell.replace(aliasAnchor,`${aliasAnchor}\n${aliasBlock}`);
let html=original.html.replace(/\s*<article><strong>136<\/strong><span>.*?<\/span><\/article>/g,"");if(!html.includes("<strong>136</strong><span>Final VANI acceptance</span>")){const anchor=/(<article><strong>135<\/strong><span>.*?<\/span><\/article>)/;if(!anchor.test(html))fail("Part 135 progress card missing.");html=html.replace(anchor,`$1\n            <article><strong>136</strong><span>Final VANI acceptance</span></article>`)}
html=html.replace(/Part 135 VANI Conversational Workflow Engine active hai: multi-turn clarification, dependency-aware plans, native previews, exact confirmations, pause\/resume aur failure-safe execution\./g,"Part 136 Final VANI Acceptance gate active hai: 60-action catalog, eight-role tests, scope isolation, completed workflows, every-feature VANI buttons and desktop/mobile runtime evidence.").replace(/Part 135 • Parts 130–134 native workflow orchestration \+ secure Parts 128–129 handoff/g,"Part 136 • final planned acceptance • sale-ready only after every required gate passes");
if(!html.includes("/naxora-part136-vani-button-coverage.js")){const bridgeAnchor='<script src="/naxora-part135-global-vani-bridge.js"></script>';if(!html.includes(bridgeAnchor))fail("Part 135 Global VANI bridge anchor missing.");html=html.replace(bridgeAnchor,'<script src="/naxora-part136-vani-button-coverage.js"></script>\n  '+bridgeAnchor)}
fs.writeFileSync(serverPath,server,"utf8");fs.writeFileSync(shellPath,shell,"utf8");fs.writeFileSync(htmlPath,html,"utf8");
for(const file of [serverPath,shellPath]){const result=check(file);if(result.status!==0){fs.writeFileSync(serverPath,original.server,"utf8");fs.writeFileSync(shellPath,original.shell,"utf8");fs.writeFileSync(htmlPath,original.html,"utf8");fail(`Syntax check failed after Part 136 integration. Originals restored.\n${result.stderr||result.stdout}`)}}
const finalServer=fs.readFileSync(serverPath,"utf8"),finalShell=fs.readFileSync(shellPath,"utf8"),finalHtml=fs.readFileSync(htmlPath,"utf8");const p135=finalServer.indexOf("PART 135 — VANI CONVERSATIONAL WORKFLOW ENGINE"),p136=finalServer.indexOf("PART 136 — FINAL ALL ROLE VANI ACCEPTANCE"),p112=finalServer.indexOf("PART 112 — RAZORPAY TEST MODE FOUNDATION"),p404=notFoundIndex(finalServer);const valid=p135>=0&&p136>p135&&p112>p136&&p404>p112&&finalShell.includes('key: "vani-acceptance"')&&finalShell.includes('"part 136": "vani-acceptance"')&&finalHtml.includes('/naxora-part136-vani-button-coverage.js')&&finalHtml.indexOf('/naxora-part136-vani-button-coverage.js')<finalHtml.indexOf('/naxora-part135-global-vani-bridge.js')&&finalHtml.includes("<strong>136</strong><span>Final VANI acceptance</span>");if(!valid){fs.writeFileSync(serverPath,original.server,"utf8");fs.writeFileSync(shellPath,original.shell,"utf8");fs.writeFileSync(htmlPath,original.html,"utf8");fail("Part 136 integration verification failed. Originals restored.")}
console.log("\nPART 136 APPLIED SUCCESSFULLY");console.log("Part 136 registered after Part 135: PASS");console.log("Part 136 registered before Parts 112–119 routes: PASS");console.log("Part 119 Final VANI Acceptance module added: PASS");console.log("Part 119 Part 136 aliases added: PASS");console.log("Every-feature VANI button coverage bridge added before Part 135 bridge: PASS");console.log("Unified app Part 136 final-gate progress updated: PASS");console.log("server.js syntax: PASS");console.log("Next: node .\\VERIFY-PART136.js\n");
