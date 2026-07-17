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
];
const previousMarkers = [
  "PART 112 — RAZORPAY TEST MODE FOUNDATION",
  "PART 113 — NAXORA SUBSCRIPTION PLANS",
  "PART 114 — CUSTOMER CHECKOUT AND SUBSCRIPTION ACTIVATION",
];
const marker = "// ================= PART 115 — SECURE RAZORPAY WEBHOOKS AND STATUS SYNC =================";
const block = `${marker}\nconst { registerPart115RazorpayWebhooks } = await import("./part115-razorpay-webhooks.js");\nregisterPart115RazorpayWebhooks({ app });`;

function fail(message) {
  console.error(`\nPART 115 APPLY FAILED: ${message}\n`);
  process.exit(1);
}

function syntaxCheck(file) {
  return spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
}

if (!fs.existsSync(serverPath)) fail("backend/src/server.js missing.");
for (const [rel, label] of requiredModules) {
  if (!fs.existsSync(path.join(root, rel))) fail(`${label} backend module missing: ${rel}`);
}

const original = fs.readFileSync(serverPath, "utf8");
const precheck = syntaxCheck(serverPath);
if (precheck.status !== 0) fail(`Existing server.js syntax broken hai. Installer ne koi change nahi kiya.\n${precheck.stderr || precheck.stdout}`);

let notFoundIndex = original.indexOf("app.use(notFound);");
if (notFoundIndex < 0) notFoundIndex = original.indexOf("app.use(notFound)");
if (notFoundIndex < 0) {
  const codeIndex = Math.max(original.indexOf('"ROUTE_NOT_FOUND"'), original.indexOf("'ROUTE_NOT_FOUND'"));
  notFoundIndex = codeIndex >= 0 ? original.lastIndexOf("app.use(", codeIndex) : -1;
}
if (notFoundIndex < 0) fail("Express 404/notFound handler anchor not found.");

for (const previousMarker of previousMarkers) {
  const pos = original.indexOf(previousMarker);
  if (pos < 0) fail(`${previousMarker} registration missing.`);
  if (pos > notFoundIndex) fail(`${previousMarker} abhi 404 handler ke baad hai. Previous route-order fix verify karo.`);
}

const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const oldBlock = new RegExp(`\\n*${escaped}\\nconst \\{ registerPart115RazorpayWebhooks \\} = await import\\("\\.\\/part115-razorpay-webhooks\\.js"\\);\\nregisterPart115RazorpayWebhooks\\(\\{ app \\}\\);\\n*`, "g");
let cleaned = original.replace(oldBlock, "\n\n");

notFoundIndex = cleaned.indexOf("app.use(notFound);");
if (notFoundIndex < 0) notFoundIndex = cleaned.indexOf("app.use(notFound)");
if (notFoundIndex < 0) {
  const codeIndex = Math.max(cleaned.indexOf('"ROUTE_NOT_FOUND"'), cleaned.indexOf("'ROUTE_NOT_FOUND'"));
  notFoundIndex = codeIndex >= 0 ? cleaned.lastIndexOf("app.use(", codeIndex) : -1;
}
if (notFoundIndex < 0) fail("Safe insertion anchor not found.");

const updated = `${cleaned.slice(0, notFoundIndex)}\n\n${block}\n\n${cleaned.slice(notFoundIndex)}`;
fs.writeFileSync(serverPath, updated, "utf8");
const postcheck = syntaxCheck(serverPath);
if (postcheck.status !== 0) {
  fs.writeFileSync(serverPath, original, "utf8");
  fail(`Part 115 syntax check failed. Original server.js restored.\n${postcheck.stderr || postcheck.stdout}`);
}

const finalSource = fs.readFileSync(serverPath, "utf8");
const p115 = finalSource.indexOf(marker);
let p404 = finalSource.indexOf("app.use(notFound);");
if (p404 < 0) p404 = finalSource.indexOf("app.use(notFound)");
if (p404 < 0) {
  const codeIndex = Math.max(finalSource.indexOf('"ROUTE_NOT_FOUND"'), finalSource.indexOf("'ROUTE_NOT_FOUND'"));
  p404 = codeIndex >= 0 ? finalSource.lastIndexOf("app.use(", codeIndex) : -1;
}
if (!(p115 >= 0 && p404 >= 0 && p115 < p404)) {
  fs.writeFileSync(serverPath, original, "utf8");
  fail("Part 115 route-order verification failed. Original server.js restored.");
}

console.log("\nPART 115 APPLIED SUCCESSFULLY");
console.log("Part 115 registered before 404 handler: PASS");
console.log("server.js syntax: PASS");
console.log("Next: node .\\VERIFY-PART115.js\n");
