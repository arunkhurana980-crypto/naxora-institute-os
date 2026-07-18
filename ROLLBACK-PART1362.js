import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const root=path.dirname(fileURLToPath(import.meta.url));
const dir=path.join(root,".part1362-backup");
const files=[[path.join(dir,"part1361-first-owner-bootstrap.js"),path.join(root,"backend/src/part1361-first-owner-bootstrap.js")],[path.join(dir,"naxora-owner-bootstrap.js"),path.join(root,"frontend/naxora-owner-bootstrap.js")]];
for(const [src,dst] of files){if(!fs.existsSync(src)){console.error("Part 136.2 backup missing.");process.exit(1);}fs.copyFileSync(src,dst);const r=spawnSync(process.execPath,["--check",dst],{encoding:"utf8"});if(r.status!==0){console.error(r.stderr||r.stdout);process.exit(1);}}
console.log("Part 136.2 rolled back to Part 136.1 files.");
