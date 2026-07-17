import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(root, "backend", "src", "server.js");
const part112Path = path.join(root, "backend", "src", "part112-razorpay-foundation.js");
const part113Path = path.join(root, "backend", "src", "part113-subscription-plans.js");
const part114Path = path.join(root, "backend", "src", "part114-customer-checkout-subscription.js");

const marker112 = "// ================= PART 112 — RAZORPAY TEST MODE FOUNDATION =================";
const marker113 = "// ================= PART 113 — NAXORA SUBSCRIPTION PLANS =================";
const marker114 = "// ================= PART 114 — CUSTOMER CHECKOUT AND SUBSCRIPTION ACTIVATION =================";
const block114 = `${marker114}\nconst { registerPart114CustomerCheckout } = await import("./part114-customer-checkout-subscription.js");\nregisterPart114CustomerCheckout({ app });`;

function fail(message) {
  console.error(`\nPART 114 APPLY FAILED: ${message}\n`);
  process.exit(1);
}

function syntaxCheck(file) {
  return spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
}

for (const [file, label] of [
  [serverPath, "backend/src/server.js"],
  [part112Path, "Part 112 backend module"],
  [part113Path, "Part 113 backend module"],
  [part114Path, "Part 114 backend module"],
]) {
  if (!fs.existsSync(file)) fail(`${label} missing.`);
}

const original = fs.readFileSync(serverPath, "utf8");
const precheck = syntaxCheck(serverPath);
if (precheck.status !== 0) fail(`Existing server.js syntax broken hai. Installer ne koi change nahi kiya.\n${precheck.stderr || precheck.stdout}`);

if (!original.includes(marker112) || !original.includes(marker113)) {
  fail("Part 112/113 registration missing. Route-order hotfix aur previous parts verify karo.");
}

// Confirm previous payment routes are already before the 404 middleware.
let notFoundIndex = original.indexOf("app.use(notFound);");
if (notFoundIndex < 0) notFoundIndex = original.indexOf("app.use(notFound)");
if (notFoundIndex < 0) {
  const routeCodeIndex = Math.max(original.indexOf('"ROUTE_NOT_FOUND"'), original.indexOf("'ROUTE_NOT_FOUND'"));
  notFoundIndex = routeCodeIndex >= 0 ? original.lastIndexOf("app.use(", routeCodeIndex) : -1;
}
if (notFoundIndex < 0) fail("404/notFound middleware anchor not found.");
if (original.indexOf(marker112) > notFoundIndex || original.indexOf(marker113) > notFoundIndex) {
  fail("Part 112/113 routes abhi 404 handler ke baad hain. Pehle route-order hotfix apply karo.");
}

const escapedMarker = marker114.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const oldBlock = new RegExp(`\\n*${escapedMarker}\\nconst \\{ registerPart114CustomerCheckout \\} = await import\\("\\.\\/part114-customer-checkout-subscription\\.js"\\);\\nregisterPart114CustomerCheckout\\(\\{ app \\}\\);\\n*`, "g");
let cleaned = original.replace(oldBlock, "\n\n");

notFoundIndex = cleaned.indexOf("app.use(notFound);");
if (notFoundIndex < 0) notFoundIndex = cleaned.indexOf("app.use(notFound)");
if (notFoundIndex < 0) {
  const routeCodeIndex = Math.max(cleaned.indexOf('"ROUTE_NOT_FOUND"'), cleaned.indexOf("'ROUTE_NOT_FOUND'"));
  notFoundIndex = routeCodeIndex >= 0 ? cleaned.lastIndexOf("app.use(", routeCodeIndex) : -1;
}
if (notFoundIndex < 0) fail("Safe 404 insertion anchor not found.");

const registration = `\n\n${block114}\n\n`;
const updated = `${cleaned.slice(0, notFoundIndex)}${registration}${cleaned.slice(notFoundIndex)}`;
fs.writeFileSync(serverPath, updated, "utf8");

const postcheck = syntaxCheck(serverPath);
if (postcheck.status !== 0) {
  fs.writeFileSync(serverPath, original, "utf8");
  fail(`Part 114 syntax check failed. Original server.js restored.\n${postcheck.stderr || postcheck.stdout}`);
}

const finalSource = fs.readFileSync(serverPath, "utf8");
const p114 = finalSource.indexOf(marker114);
let p404 = finalSource.indexOf("app.use(notFound);");
if (p404 < 0) p404 = finalSource.indexOf("app.use(notFound)");
if (p404 < 0) {
  const routeCodeIndex = Math.max(finalSource.indexOf('"ROUTE_NOT_FOUND"'), finalSource.indexOf("'ROUTE_NOT_FOUND'"));
  p404 = routeCodeIndex >= 0 ? finalSource.lastIndexOf("app.use(", routeCodeIndex) : -1;
}
if (!(p114 >= 0 && p404 >= 0 && p114 < p404)) {
  fs.writeFileSync(serverPath, original, "utf8");
  fail("Part 114 route-order verification failed. Original server.js restored.");
}

console.log("\nPART 114 APPLIED SUCCESSFULLY");
console.log("Part 114 registered before 404 handler: PASS");
console.log("server.js syntax: PASS");
console.log("Next: node .\\VERIFY-PART114.js\n");
