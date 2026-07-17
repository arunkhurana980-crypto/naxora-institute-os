import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(projectRoot, "backend", "src", "server.js");
const part112Path = path.join(projectRoot, "backend", "src", "part112-razorpay-foundation.js");
const part113Path = path.join(projectRoot, "backend", "src", "part113-subscription-plans.js");

const marker112 = "// ================= PART 112 — RAZORPAY TEST MODE FOUNDATION =================";
const marker113 = "// ================= PART 113 — NAXORA SUBSCRIPTION PLANS =================";

const block112 = `${marker112}\nconst { registerPart112RazorpayFoundation } = await import("./part112-razorpay-foundation.js");\nregisterPart112RazorpayFoundation({ app });`;
const block113 = `${marker113}\nconst { registerPart113SubscriptionPlans } = await import("./part113-subscription-plans.js");\nregisterPart113SubscriptionPlans({ app });`;

function fail(message) {
  console.error(`\nHOTFIX FAILED: ${message}\n`);
  process.exit(1);
}

function syntaxCheck(filePath) {
  return spawnSync(process.execPath, ["--check", filePath], { encoding: "utf8" });
}

if (!fs.existsSync(serverPath)) fail(`server.js not found: ${serverPath}`);
if (!fs.existsSync(part112Path)) fail("backend/src/part112-razorpay-foundation.js missing.");
if (!fs.existsSync(part113Path)) fail("backend/src/part113-subscription-plans.js missing.");

const original = fs.readFileSync(serverPath, "utf8");
const precheck = syntaxCheck(serverPath);
if (precheck.status !== 0) {
  fail(`Existing server.js syntax broken hai. Hotfix ne koi change nahi kiya.\n${precheck.stderr || precheck.stdout}`);
}

// Remove only the known Part 112/113 registration blocks, wherever old installers placed them.
const escaped112 = marker112.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const escaped113 = marker113.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const regex112 = new RegExp(`\\n*${escaped112}\\nconst \\{ registerPart112RazorpayFoundation \\} = await import\\("\\.\\/part112-razorpay-foundation\\.js"\\);\\nregisterPart112RazorpayFoundation\\(\\{ app \\}\\);\\n*`, "g");
const regex113 = new RegExp(`\\n*${escaped113}\\nconst \\{ registerPart113SubscriptionPlans \\} = await import\\("\\.\\/part113-subscription-plans\\.js"\\);\\nregisterPart113SubscriptionPlans\\(\\{ app \\}\\);\\n*`, "g");

let cleaned = original.replace(regex112, "\n\n").replace(regex113, "\n\n");

// Routes must be registered before Express 404/notFound middleware.
let insertionIndex = cleaned.indexOf("app.use(notFound);");
let anchorName = "app.use(notFound);";

if (insertionIndex < 0) {
  insertionIndex = cleaned.indexOf("app.use(notFound)");
  anchorName = "app.use(notFound)";
}

if (insertionIndex < 0) {
  const routeNotFoundIndex = cleaned.indexOf('"ROUTE_NOT_FOUND"');
  if (routeNotFoundIndex < 0) {
    insertionIndex = cleaned.indexOf("'ROUTE_NOT_FOUND'");
  } else {
    insertionIndex = routeNotFoundIndex;
  }
  if (insertionIndex >= 0) {
    const middlewareStart = cleaned.lastIndexOf("app.use(", insertionIndex);
    if (middlewareStart >= 0) insertionIndex = middlewareStart;
    anchorName = "custom ROUTE_NOT_FOUND middleware";
  }
}

if (insertionIndex < 0) {
  insertionIndex = cleaned.indexOf("app.use(errorHandler);");
  anchorName = "app.use(errorHandler);";
}

if (insertionIndex < 0) {
  fail("404/notFound middleware anchor nahi mila. server.js unchanged hai.");
}

const registration = `\n\n// ================= NAXORA PAYMENT ROUTES — MUST STAY BEFORE 404 HANDLER =================\n${block112}\n\n${block113}\n// ================= END NAXORA PAYMENT ROUTES =================\n\n`;
const updated = `${cleaned.slice(0, insertionIndex)}${registration}${cleaned.slice(insertionIndex)}`;

fs.writeFileSync(serverPath, updated, "utf8");
const postcheck = syntaxCheck(serverPath);
if (postcheck.status !== 0) {
  fs.writeFileSync(serverPath, original, "utf8");
  fail(`Syntax check failed. Original server.js automatically restored.\n${postcheck.stderr || postcheck.stdout}`);
}

const finalSource = fs.readFileSync(serverPath, "utf8");
const pos112 = finalSource.indexOf(marker112);
const pos113 = finalSource.indexOf(marker113);
let pos404 = finalSource.indexOf("app.use(notFound);");
if (pos404 < 0) pos404 = finalSource.indexOf("app.use(notFound)");
if (pos404 < 0) {
  const codeIndex = Math.max(finalSource.indexOf('"ROUTE_NOT_FOUND"'), finalSource.indexOf("'ROUTE_NOT_FOUND'"));
  pos404 = codeIndex >= 0 ? finalSource.lastIndexOf("app.use(", codeIndex) : -1;
}

if (!(pos112 >= 0 && pos113 >= 0 && pos404 >= 0 && pos112 < pos404 && pos113 < pos404)) {
  fs.writeFileSync(serverPath, original, "utf8");
  fail("Route-order verification failed. Original server.js restored.");
}

console.log("\nPART 112/113 ROUTE ORDER HOTFIX APPLIED SUCCESSFULLY");
console.log(`Inserted before: ${anchorName}`);
console.log("Part 112 before 404 handler: PASS");
console.log("Part 113 before 404 handler: PASS");
console.log("server.js syntax: PASS");
console.log("\nNext commands:");
console.log("node .\\VERIFY-PART112-113-ROUTES.js");
console.log("git status");
console.log("git add .");
console.log('git commit -m "Fix Part 112 and 113 route registration order"');
console.log("git push\n");
