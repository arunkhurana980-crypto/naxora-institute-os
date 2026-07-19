import { spawnSync } from "node:child_process";
const result = spawnSync(process.execPath, ["APPLY-NAXORA-FINAL-13610.js"], {
  cwd: process.cwd(),
  stdio: "inherit",
});
process.exit(result.status || 0);
