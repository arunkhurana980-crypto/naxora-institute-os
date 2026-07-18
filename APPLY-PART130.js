import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(root, "backend/src/server.js");
const shellPath = path.join(root, "backend/src/part119-unified-app-shell.js");
const htmlPath = path.join(root, "frontend/naxora-unified-app.html");
const required = [
  "backend/src/part124-role-consolidation.js",
  "backend/src/part128-vani-master-data-actions.js",
  "backend/src/part129-vani-bulk-import.js",
  "backend/src/part130-vani-academic-operations.js",
  "frontend/naxora-academic-vani.html",
  "frontend/naxora-academic-vani.css",
  "frontend/naxora-academic-vani.js",
  "frontend/naxora-part130-global-vani-bridge.js",
];
const marker = "// ================= PART 130 — VANI ACADEMIC OPERATIONS =================";
const registration = `${marker}\nconst { registerPart130VaniAcademicOperations } = await import("./part130-vani-academic-operations.js");\nregisterPart130VaniAcademicOperations({ app });`;
const moduleStart = "  // PART 130 VANI ACADEMIC OPERATIONS MODULE START";
const moduleEnd = "  // PART 130 VANI ACADEMIC OPERATIONS MODULE END";
const moduleBlock = `${moduleStart}\n  { key: "academic-vani", label: "VANI Academic Operations", description: "Timetable, bulk attendance, assignments, exams, marks, results and progress.", category: "AI & VANI", route: "/academic-vani", icon: "notes", roles: ["institute_owner", "branch_manager", "teacher", "student", "parent", "staff"], alwaysAvailable: true, order: 320 },\n${moduleEnd}`;
const aliasStart = "  // PART 130 VANI ACADEMIC OPERATIONS ALIASES START";
const aliasEnd = "  // PART 130 VANI ACADEMIC OPERATIONS ALIASES END";
const aliasBlock = `${aliasStart}\n  "academic operations": "academic-vani",\n  "academic vani": "academic-vani",\n  timetable: "academic-vani",\n  "bulk attendance": "academic-vani",\n  "exam management": "academic-vani",\n  "marks entry": "academic-vani",\n  "result publish": "academic-vani",\n  "student progress": "academic-vani",\n  "part 130": "academic-vani",\n${aliasEnd}`;
function fail(message){console.error(`\nPART 130 APPLY FAILED: ${message}\n`);process.exit(1)}
function check(file){return spawnSync(process.execPath,["--check",file],{encoding:"utf8"})}
function removeBetween(source,start,end){const a=start.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),b=end.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");return source.replace(new RegExp(`\\s*${a}[\\s\\S]*?${b}\\s*`,"g"),"\n")}
function registrationEnd(source,call){const index=source.indexOf(call);return index<0?-1:index+call.length}
function notFoundIndex(source){let index=source.indexOf("app.use(notFound);");if(index<0)index=source.indexOf("app.use(notFound)");return index}
for(const rel of required)if(!fs.existsSync(path.join(root,rel)))fail(`Required file missing: ${rel}`);
for(const file of [serverPath,shellPath]){const result=check(file);if(result.status!==0)fail(`${path.relative(root,file)} syntax is broken before Part 130.`)}
const original={server:fs.readFileSync(serverPath,"utf8"),shell:fs.readFileSync(shellPath,"utf8"),html:fs.readFileSync(htmlPath,"utf8")};
let server=original.server;const escaped=marker.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");server=server.replace(new RegExp(`\\n*${escaped}\\nconst \\{ registerPart130VaniAcademicOperations \\} = await import\\("\\.\\/part130-vani-academic-operations\\.js"\\);\\nregisterPart130VaniAcademicOperations\\(\\{ app \\}\\);\\n*`,"g"),"\n\n");
const part129End=registrationEnd(server,"registerPart129VaniBulkImport({ app });");if(part129End<0)fail("Part 129 registration call not found. Apply and verify Part 129 first.");server=`${server.slice(0,part129End)}\n\n${registration}${server.slice(part129End)}`;
let shell=removeBetween(original.shell,moduleStart,moduleEnd);shell=removeBetween(shell,aliasStart,aliasEnd);const moduleAnchor="  // PART 129 VANI BULK IMPORT MODULE END",aliasAnchor="  // PART 129 VANI BULK IMPORT ALIASES END";if(!shell.includes(moduleAnchor))fail("Part 129 shell module marker missing.");if(!shell.includes(aliasAnchor))fail("Part 129 shell alias marker missing.");shell=shell.replace(moduleAnchor,`${moduleAnchor}\n${moduleBlock}`);shell=shell.replace(aliasAnchor,`${aliasAnchor}\n${aliasBlock}`);
let html=original.html.replace(/\s*<article><strong>130<\/strong><span>.*?<\/span><\/article>/g,"");if(!html.includes("<strong>130</strong><span>VANI academics</span>")){const anchor=/(<article><strong>129<\/strong><span>.*?<\/span><\/article>)/;if(!anchor.test(html))fail("Part 129 progress card missing.");html=html.replace(anchor,`$1\n            <article><strong>130</strong><span>VANI academics</span></article>`)}
html=html.replace(/Part 129 VANI CSV\/JSON bulk import active hai: mapping, validation, duplicate control, confirmed execution aur rollback\./g,"Part 130 VANI academic operations active hain: timetable, bulk attendance, assignments, exams, marks, results aur Student progress.").replace(/Part 129 • 9 operational \+ 14 master-data \+ CSV\/JSON bulk import/g,"Part 130 • 9 operational + 14 master-data + bulk import + 12 academic actions");
if(!html.includes("/naxora-part130-global-vani-bridge.js")){const bridgeAnchor='<script src="/naxora-part129-global-vani-bridge.js"></script>';if(!html.includes(bridgeAnchor))fail("Part 129 Global VANI bridge anchor missing.");html=html.replace(bridgeAnchor,'<script src="/naxora-part130-global-vani-bridge.js"></script>\n  '+bridgeAnchor)}
fs.writeFileSync(serverPath,server,"utf8");fs.writeFileSync(shellPath,shell,"utf8");fs.writeFileSync(htmlPath,html,"utf8");for(const file of [serverPath,shellPath]){const result=check(file);if(result.status!==0){fs.writeFileSync(serverPath,original.server,"utf8");fs.writeFileSync(shellPath,original.shell,"utf8");fs.writeFileSync(htmlPath,original.html,"utf8");fail(`Syntax check failed after integration. Originals restored.\n${result.stderr||result.stdout}`)}}
const finalServer=fs.readFileSync(serverPath,"utf8"),finalShell=fs.readFileSync(shellPath,"utf8"),finalHtml=fs.readFileSync(htmlPath,"utf8");const p129=finalServer.indexOf("PART 129 — VANI BULK CSV JSON IMPORT"),p130=finalServer.indexOf("PART 130 — VANI ACADEMIC OPERATIONS"),p112=finalServer.indexOf("PART 112 — RAZORPAY TEST MODE FOUNDATION"),p404=notFoundIndex(finalServer);const valid=p129>=0&&p130>p129&&p112>p130&&p404>p112&&finalShell.includes('key: "academic-vani"')&&finalShell.includes('"part 130": "academic-vani"')&&finalHtml.includes('/naxora-part130-global-vani-bridge.js')&&finalHtml.indexOf('/naxora-part130-global-vani-bridge.js')<finalHtml.indexOf('/naxora-part129-global-vani-bridge.js')&&finalHtml.includes("<strong>130</strong><span>VANI academics</span>");if(!valid){fs.writeFileSync(serverPath,original.server,"utf8");fs.writeFileSync(shellPath,original.shell,"utf8");fs.writeFileSync(htmlPath,original.html,"utf8");fail("Integration verification failed. Originals restored.")}
console.log("\nPART 130 APPLIED SUCCESSFULLY");console.log("Part 130 registered after Part 129: PASS");console.log("Part 130 registered before Parts 112–119 routes: PASS");console.log("Part 119 VANI Academic Operations module added: PASS");console.log("Part 119 academic aliases added: PASS");console.log("Global VANI Part 130 bridge added before Part 129 bridge: PASS");console.log("Unified app Part 130 progress and boundary updated: PASS");console.log("server.js syntax: PASS");console.log("Next: node .\\VERIFY-PART130.js\n");