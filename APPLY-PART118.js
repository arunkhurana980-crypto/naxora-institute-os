import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(root, "backend", "src", "server.js");
const requiredModules = [
  ["backend/src/part112-razorpay-foundation.js", "Part 112"],
  ["backend/src/part113-subscription-plans.js", "Part 113"],
  ["backend/src/part114-customer-checkout-subscription.js", "Part 114"],
  ["backend/src/part115-razorpay-webhooks.js", "Part 115"],
  ["backend/src/part116-subscription-access-control.js", "Part 116"],
  ["backend/src/part117-vani-subscription-manager.js", "Part 117"],
  ["backend/src/part118-razorpay-live-readiness.js", "Part 118"],
];
const previousMarkers = [
  "PART 112 — RAZORPAY TEST MODE FOUNDATION",
  "PART 113 — NAXORA SUBSCRIPTION PLANS",
  "PART 114 — CUSTOMER CHECKOUT AND SUBSCRIPTION ACTIVATION",
  "PART 115 — SECURE RAZORPAY WEBHOOKS AND STATUS SYNC",
  "PART 116 — SUBSCRIPTION FEATURE ACCESS CONTROL",
  "PART 117 — VANI SUBSCRIPTION MANAGER",
];
const marker = "// ================= PART 118 — RAZORPAY LIVE READINESS AND CONTROLLED LAUNCH =================";
const block = `${marker}\nconst { registerPart118LiveReadiness } = await import("./part118-razorpay-live-readiness.js");\nregisterPart118LiveReadiness({ app });`;

function fail(message) {
  console.error(`\nPART 118 APPLY FAILED: ${message}\n`);
  process.exit(1);
}
function syntaxCheck(file) {
  return spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
}
function find404(source) {
  let index = source.indexOf("app.use(notFound);");
  if (index < 0) index = source.indexOf("app.use(notFound)");
  if (index < 0) {
    const codeIndex = Math.max(source.indexOf('"ROUTE_NOT_FOUND"'), source.indexOf("'ROUTE_NOT_FOUND'"));
    index = codeIndex >= 0 ? source.lastIndexOf("app.use(", codeIndex) : -1;
  }
  return index;
}

if (!fs.existsSync(serverPath)) fail("backend/src/server.js missing.");
for (const [rel, label] of requiredModules) {
  if (!fs.existsSync(path.join(root, rel))) fail(`${label} backend module missing: ${rel}`);
}
const original = fs.readFileSync(serverPath, "utf8");
const precheck = syntaxCheck(serverPath);
if (precheck.status !== 0) {
  fail(`Existing server.js syntax broken hai. Installer ne koi change nahi kiya.\n${precheck.stderr || precheck.stdout}`);
}
let notFoundIndex = find404(original);
if (notFoundIndex < 0) fail("Express 404/notFound handler anchor not found.");
for (const previousMarker of previousMarkers) {
  const pos = original.indexOf(previousMarker);
  if (pos < 0) fail(`${previousMarker} registration missing.`);
  if (pos > notFoundIndex) fail(`${previousMarker} abhi 404 handler ke baad hai.`);
}
const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const oldBlock = new RegExp(`\\n*${escaped}\\nconst \\{ registerPart118LiveReadiness \\} = await import\\("\\.\\/part118-razorpay-live-readiness\\.js"\\);\\nregisterPart118LiveReadiness\\(\\{ app \\}\\);\\n*`, "g");
const cleaned = original.replace(oldBlock, "\n\n");
notFoundIndex = find404(cleaned);
if (notFoundIndex < 0) fail("Safe insertion anchor not found.");
fs.writeFileSync(serverPath, `${cleaned.slice(0, notFoundIndex)}\n\n${block}\n\n${cleaned.slice(notFoundIndex)}`, "utf8");
const postcheck = syntaxCheck(serverPath);
if (postcheck.status !== 0) {
  fs.writeFileSync(serverPath, original, "utf8");
  fail(`Part 118 syntax check failed. Original server.js restored.\n${postcheck.stderr || postcheck.stdout}`);
}
const finalSource = fs.readFileSync(serverPath, "utf8");
if (!(finalSource.indexOf(marker) >= 0 && finalSource.indexOf(marker) < find404(finalSource))) {
  fs.writeFileSync(serverPath, original, "utf8");
  fail("Part 118 route-order verification failed. Original server.js restored.");
}
console.log("\nPART 118 APPLIED SUCCESSFULLY");
console.log("Part 118 registered before 404 handler: PASS");
console.log("server.js syntax: PASS");
console.log("Next: node .\\VERIFY-PART118.js\n");
