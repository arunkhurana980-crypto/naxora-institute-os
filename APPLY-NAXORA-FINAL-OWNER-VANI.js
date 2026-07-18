import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

function run(script) {
  const scriptPath = path.join(root, script);
  if (!fs.existsSync(scriptPath)) {
    console.error(`FINAL APPLY FAILED: ${script} missing.`);
    process.exit(1);
  }

  console.log(`\n================ ${script} ================`);
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: root,
    encoding: "utf8",
    stdio: "inherit",
  });

  if (result.status !== 0) {
    console.error(`\nFINAL APPLY FAILED while running ${script}.\n`);
    process.exit(result.status || 1);
  }
}

console.log("\nNAXORA FINAL OWNER LOGIN + UNIFIED APP INSTALL STARTED");

run("APPLY-PART1364.js");
run("VERIFY-PART1364.js");
run("APPLY-PART1365.js");
run("VERIFY-PART1365.js");
run("VERIFY-NAXORA-FINAL-OWNER-VANI.js");

console.log("\n====================================================");
console.log("NAXORA FINAL OWNER LOGIN + UNIFIED APP APPLIED");
console.log("Simple Owner signup: PASS");
console.log("Owner login without Institute ID: PASS");
console.log("Owner session handoff: PASS");
console.log("/app and /app/ unified shell: PASS");
console.log("Old public login at /app blocked: PASS");
console.log("VANI unified-shell markers: PASS");
console.log("====================================================\n");
