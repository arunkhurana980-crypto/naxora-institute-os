import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const files = [
  "backend/src/part13610-final-role-vani-runtime.js",
  "backend/.env.part13610.example",
  "frontend/naxora-final-role-vani.html",
  "frontend/naxora-final-role-vani.css",
  "frontend/naxora-final-role-vani.js",
  "backend/src/server.js",
  "backend/src/part119-unified-app-shell.js",
];
let failed = false;
function check(ok, label) {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
  if (!ok) failed = true;
}
for (const rel of files) {
  const file = path.join(root, rel);
  check(fs.existsSync(file), `${rel} exists`);
  if (fs.existsSync(file) && rel.endsWith(".js")) {
    const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    check(result.status === 0, `${rel} syntax`);
    if (result.status !== 0) console.error(result.stderr || result.stdout);
  }
}
if (!failed) {
  const runtime = fs.readFileSync(path.join(root, files[0]), "utf8");
  const server = fs.readFileSync(path.join(root, "backend/src/server.js"), "utf8");
  const shell = fs.readFileSync(path.join(root, "backend/src/part119-unified-app-shell.js"), "utf8");
  const checks = [
    [server.includes("PART 136.10 FINAL ROLE DASHBOARD EARLY ROUTES START"), "Early role workspace routes"],
    [server.includes("registerPart13610FinalRuntime({ app });"), "Final runtime registration"],
    [shell.includes('key: "final-role-runtime"'), "Unified shell final role module"],
    [runtime.includes("const ACTIONS = Object.freeze"), "Action catalog"],
    [runtime.includes('"institute_owner", "teacher", "student", "parent"'), "Four-role support"],
    [runtime.includes("/api/part13610/dashboard"), "Real dashboard API"],
    [runtime.includes("/api/part13610/vani/preview"), "VANI preview API"],
    [runtime.includes("/api/part13610/vani/confirm"), "VANI confirmation API"],
    [runtime.includes("EXACT_CONFIRMATION_REQUIRED"), "Exact confirmation gate"],
    [runtime.includes("DUPLICATE_WINDOW_MS"), "Idempotency window"],
    [runtime.includes("TEACHER_CLASS_SCOPE_DENIED"), "Teacher class isolation"],
    [runtime.includes("STUDENT_ASSIGNMENT_SCOPE_DENIED"), "Student self isolation"],
    [runtime.includes("PARENT_CHILD_SCOPE_DENIED"), "Parent child isolation"],
    [runtime.includes("MONEY_MOVEMENT_BLOCKED"), "Money movement blocker"],
    [runtime.includes("SENSITIVE_DATA_BLOCKED"), "Secret blocker"],
    [runtime.includes("DESTRUCTIVE_ACTION_BLOCKED"), "Destructive blocker"],
    [runtime.includes("199900"), "Starter Monthly ₹1,999"],
    [runtime.includes("2499900"), "Starter Yearly ₹24,999"],
    [runtime.includes("399900"), "Professional Monthly ₹3,999"],
    [runtime.includes("3999900"), "Professional Yearly ₹39,999"],
    [runtime.includes("999900"), "Business Monthly ₹9,999"],
    [runtime.includes("/api/part13610/acceptance/run"), "Final acceptance run"],
    [runtime.includes("FINAL_ACCEPTED_SAFE_SCOPE"), "Fail-closed final classification"],
  ];
  for (const [ok, label] of checks) check(ok, label);
}
process.exit(failed ? 1 : 0);
