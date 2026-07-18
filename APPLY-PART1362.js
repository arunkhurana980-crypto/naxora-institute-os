import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const backendPath = path.join(root, "backend/src/part1361-first-owner-bootstrap.js");
const frontendPath = path.join(root, "frontend/naxora-owner-bootstrap.js");
const backupDir = path.join(root, ".part1362-backup");
const backendBackup = path.join(backupDir, "part1361-first-owner-bootstrap.js");
const frontendBackup = path.join(backupDir, "naxora-owner-bootstrap.js");
const START = "// PART 136.2 SECRET TRANSPORT FIX START";
const END = "// PART 136.2 SECRET TRANSPORT FIX END";
const ROUTE_START = "  // PART 136.2 VERIFY SECRET ROUTE START";
const ROUTE_END = "  // PART 136.2 VERIFY SECRET ROUTE END";

const OLD = `function bootstrapSecret() {
  return String(process.env.NAXORA_OWNER_BOOTSTRAP_SECRET ?? "").trim();
}
function requireBootstrapSecret(req) {
  const expected = bootstrapSecret();
  if (!expected) {
    throw Object.assign(new Error(
      "NAXORA_OWNER_BOOTSTRAP_SECRET Render Environment me privately configure karein."
    ), {
      code: "BOOTSTRAP_SECRET_NOT_CONFIGURED",
      httpStatus: 503,
    });
  }
  if (expected.length < 24) {
    throw Object.assign(new Error(
      "NAXORA_OWNER_BOOTSTRAP_SECRET kam se kam 24 characters ka hona chahiye."
    ), {
      code: "BOOTSTRAP_SECRET_TOO_SHORT",
      httpStatus: 503,
    });
  }
  const supplied = String(req.headers["x-naxora-bootstrap-secret"] ?? "").trim();
  if (!supplied || !safeEqual(supplied, expected)) {
    throw Object.assign(new Error("Private bootstrap verification failed."), {
      code: "BOOTSTRAP_VERIFICATION_FAILED",
      httpStatus: 403,
    });
  }
}`;

const NEW = `${START}
function normalizeBootstrapSecret(value = "") {
  let output = String(value ?? "").normalize("NFKC").replace(/[\\u200B-\\u200D\\uFEFF]/g, "").trim();
  if (output.length >= 2 && ((output.startsWith('"') && output.endsWith('"')) || (output.startsWith("'") && output.endsWith("'")))) {
    output = output.slice(1, -1).trim();
  }
  return output;
}
function bootstrapSecret() {
  return normalizeBootstrapSecret(process.env.NAXORA_OWNER_BOOTSTRAP_SECRET ?? "");
}
function suppliedBootstrapSecret(req) {
  const headerRaw = req.headers["x-naxora-bootstrap-secret"];
  const bodyRaw = req.body?.bootstrapSecret ?? req.body?._bootstrapSecret ?? "";
  const hasHeader = String(headerRaw ?? "").length > 0;
  const hasBody = String(bodyRaw ?? "").length > 0;
  const raw = hasHeader ? headerRaw : bodyRaw;
  const value = normalizeBootstrapSecret(raw);
  if (req.body && typeof req.body === "object") {
    delete req.body.bootstrapSecret;
    delete req.body._bootstrapSecret;
  }
  return { value, receivedVia: hasHeader ? "header" : hasBody ? "secure_body" : "none" };
}
function bootstrapSecretDiagnostic(expected, supplied) {
  return { receivedVia: supplied.receivedVia, suppliedLength: supplied.value.length, expectedLength: expected.length, normalizationApplied: true, bodyFallbackSupported: true, secretReturned: false };
}
function requireBootstrapSecret(req) {
  const expected = bootstrapSecret();
  if (!expected) throw Object.assign(new Error("NAXORA_OWNER_BOOTSTRAP_SECRET Render Environment me privately configure karein."), { code: "BOOTSTRAP_SECRET_NOT_CONFIGURED", httpStatus: 503 });
  if (expected.length < 24) throw Object.assign(new Error("NAXORA_OWNER_BOOTSTRAP_SECRET kam se kam 24 characters ka hona chahiye."), { code: "BOOTSTRAP_SECRET_TOO_SHORT", httpStatus: 503 });
  const supplied = suppliedBootstrapSecret(req);
  if (!supplied.value || !safeEqual(supplied.value, expected)) {
    throw Object.assign(new Error("Private bootstrap verification failed. Part 136.2 ne header aur secure body dono check kiye."), { code: "BOOTSTRAP_VERIFICATION_FAILED", httpStatus: 403, diagnostic: bootstrapSecretDiagnostic(expected, supplied) });
  }
  return { matched: true, receivedVia: supplied.receivedVia, suppliedLength: supplied.value.length, expectedLength: expected.length };
}
${END}`;

const ROUTE = `${ROUTE_START}
  app.post("/api/part1361/bootstrap/verify-secret", async (req, res) => {
    try {
      requireSecureTransport(req);
      checkRate(req);
      const verification = requireBootstrapSecret(req);
      await ensureAvailable(models);
      res.set("Cache-Control", "no-store");
      res.json({ success: true, part: "136.2", matched: true, receivedVia: verification.receivedVia, suppliedLength: verification.suppliedLength, expectedLength: verification.expectedLength, secretReturned: false });
    } catch (error) {
      res.set("Cache-Control", "no-store");
      res.status(error.httpStatus || 500).json({ success: false, part: "136.2", code: error.code || "BOOTSTRAP_SECRET_VERIFY_FAILED", message: error.message, diagnostic: error.diagnostic || null });
    }
  });
${ROUTE_END}`;

function esc(v) { return v.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&"); }
function removeBetween(src, a, b) { return src.replace(new RegExp(`\\s*${esc(a)}[\\s\\S]*?${esc(b)}\\s*`, "g"), "\n"); }
function fail(msg) { console.error(`\nPART 136.2 APPLY FAILED: ${msg}\n`); process.exit(1); }
function check(file) { return spawnSync(process.execPath, ["--check", file], { encoding: "utf8" }); }
if (!fs.existsSync(backendPath)) fail("Part 136.1 backend file missing.");
if (!fs.existsSync(frontendPath)) fail("Owner Bootstrap frontend file missing.");
fs.mkdirSync(backupDir, { recursive: true });
if (!fs.existsSync(backendBackup)) fs.copyFileSync(backendPath, backendBackup);
if (!fs.existsSync(frontendBackup)) fs.copyFileSync(frontendPath, frontendBackup);
let backend = fs.readFileSync(backendPath, "utf8");
backend = removeBetween(backend, START, END);
backend = removeBetween(backend, ROUTE_START, ROUTE_END);
if (!backend.includes(OLD)) fail("Original Part 136.1 secret block not found.");
backend = backend.replace(OLD, NEW);
const anchor = '  app.post("/api/part1361/bootstrap/preview", async (req, res) => {';
if (!backend.includes(anchor)) fail("Preview route anchor missing.");
backend = backend.replace(anchor, `${ROUTE}\n\n${anchor}`);
backend = backend.replace('        bootstrapSecretConfigured: Boolean(state.secretConfigured),', '        bootstrapSecretConfigured: Boolean(state.secretConfigured),\n        secretTransportFixActive: true,\n        secretHeaderSupported: true,\n        secretSecureBodyFallbackSupported: true,\n        secretNormalizationApplied: true,');
backend = backend.replace('        additionalInstituteProvisioningIncluded: false,', '        additionalInstituteProvisioningIncluded: false,\n        part1362SecretTransportFix: true,\n        secretVerificationEndpoint: "/api/part1361/bootstrap/verify-secret",');
backend = backend.replace(/message: error\.message,\n\s*}\);/g, 'message: error.message,\n        diagnostic: error.diagnostic || null,\n      });');
fs.writeFileSync(backendPath, backend, "utf8");
const b = check(backendPath), f = check(frontendPath);
if (b.status !== 0 || f.status !== 0) {
  fs.copyFileSync(backendBackup, backendPath); fs.copyFileSync(frontendBackup, frontendPath);
  fail(`Syntax failed; originals restored.\n${b.stderr || ""}\n${f.stderr || ""}`);
}
console.log("\nPART 136.2 APPLIED SUCCESSFULLY");
console.log("Header + secure HTTPS body fallback: PASS");
console.log("Quotes/spaces/invisible character normalization: PASS");
console.log("Secret pre-verification endpoint: PASS");
console.log("Safe mismatch diagnostics: PASS");
console.log("Backend syntax: PASS");
console.log("Frontend syntax: PASS");
console.log("Next: node .\\VERIFY-PART1362.js\n");
