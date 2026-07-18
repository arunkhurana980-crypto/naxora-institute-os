import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

for (const script of ["ROLLBACK-PART1365.js", "ROLLBACK-PART1364.js"]) {
  if (!fs.existsSync(path.join(root, script))) {
    console.error(`Missing rollback script: ${script}`);
    process.exit(1);
  }

  const result = spawnSync(process.execPath, [path.join(root, script)], {
    cwd: root,
    stdio: "inherit",
  });

  if (result.status !== 0) process.exit(result.status || 1);
}

console.log("Final Owner/VANI launch fixes rolled back.");
console.log("MongoDB Owner and Institute records were not deleted.");
