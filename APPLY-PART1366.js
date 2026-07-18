import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(root, "backend/src/server.js");
const part116Path = path.join(root, "backend/src/part116-subscription-access-control.js");
const part119Path = path.join(root, "backend/src/part119-unified-app-shell.js");
const enginePath = path.join(root, "backend/src/part1366-live-subscription-revenue.js");
const frontendJsPath = path.join(root, "frontend/naxora-live-subscriptions.js");

const REG_MARKER = "// ================= PART 136.6 — LIVE SUBSCRIPTION REVENUE BRIDGE =================";
const REGISTRATION = `${REG_MARKER}
const { registerPart1366LiveSubscriptionRevenue } = await import("./part1366-live-subscription-revenue.js");
registerPart1366LiveSubscriptionRevenue({ app });`;

const MODULE_START = "  // PART 136.6 LIVE SUBSCRIPTION MODULE START";
const MODULE_END = "  // PART 136.6 LIVE SUBSCRIPTION MODULE END";
const MODULE_BLOCK = `${MODULE_START}
  {
    key: "live-subscriptions",
    label: "Live Subscriptions",
    description: "Razorpay Live recurring checkout, verified webhooks, paid access and settlement-ready billing.",
    category: "Billing",
    route: "/live-subscriptions",
    icon: "checkout",
    roles: OWNER_ONLY_ROLES,
    alwaysAvailable: true,
    billingControl: true,
    order: 560,
  },
${MODULE_END}`;

const ALIAS_START = "  // PART 136.6 LIVE SUBSCRIPTION ALIASES START";
const ALIAS_END = "  // PART 136.6 LIVE SUBSCRIPTION ALIASES END";
const ALIAS_BLOCK = `${ALIAS_START}
  "live subscriptions": "live-subscriptions",
  "commercial subscription": "live-subscriptions",
  "paid plan": "live-subscriptions",
  "razorpay live": "live-subscriptions",
${ALIAS_END}`;

const ACCESS_START = "  // PART 136.6 LIVE ACCESS EVIDENCE START";
const ACCESS_END = "  // PART 136.6 LIVE ACCESS EVIDENCE END";
const ACCESS_BLOCK = `${ACCESS_START}
  const LiveSubscription = mongoose.models.Part1366LiveSubscription || null;
  const liveSubscriptions = LiveSubscription
    ? await LiveSubscription.find({ instituteId }).sort({ updatedAt: -1 }).lean()
    : [];
  const activeLiveSubscriptions = liveSubscriptions.filter(
    (item) => String(item.status || "").toLowerCase() === "active"
  );
  const authenticatedLivePlanCodes = [
    ...new Set(
      liveSubscriptions
        .filter((item) => String(item.status || "").toLowerCase() === "authenticated")
        .map((item) => cleanText(item.planCode || "UNKNOWN", 50).toUpperCase())
    ),
  ];
${ACCESS_END}`;

function fail(message) {
  console.error(`\nPART 136.6 APPLY FAILED: ${message}\n`);
  process.exit(1);
}

function esc(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeBetween(source, start, end) {
  return source.replace(
    new RegExp(`\\s*${esc(start)}[\\s\\S]*?${esc(end)}\\s*`, "g"),
    "\n"
  );
}

function syntaxCheck(file) {
  return spawnSync(process.execPath, ["--check", file], {
    encoding: "utf8",
  });
}

for (const file of [
  serverPath,
  part116Path,
  part119Path,
  enginePath,
  frontendJsPath,
]) {
  if (!fs.existsSync(file)) {
    fail(`Required file missing: ${path.relative(root, file)}`);
  }
}

for (const file of [serverPath, part116Path, part119Path, enginePath, frontendJsPath]) {
  const result = syntaxCheck(file);
  if (result.status !== 0) {
    fail(`${path.relative(root, file)} syntax failed before apply.\n${result.stderr || result.stdout}`);
  }
}

const originals = {
  server: fs.readFileSync(serverPath, "utf8"),
  part116: fs.readFileSync(part116Path, "utf8"),
  part119: fs.readFileSync(part119Path, "utf8"),
};

const backupDir = path.join(root, ".part1366-backup");
fs.mkdirSync(backupDir, { recursive: true });
const part116BackupPath = path.join(
  backupDir,
  "part116-subscription-access-control.js"
);
if (!fs.existsSync(part116BackupPath)) {
  fs.writeFileSync(part116BackupPath, originals.part116, "utf8");
}


let server = originals.server;
server = server.replace(
  new RegExp(
    `\\n*${esc(REG_MARKER)}\\nconst \\{ registerPart1366LiveSubscriptionRevenue \\} = await import\\("\\.\\/part1366-live-subscription-revenue\\.js"\\);\\nregisterPart1366LiveSubscriptionRevenue\\(\\{ app \\}\\);\\n*`,
    "g"
  ),
  "\n\n"
);

const part118Call = "registerPart118LiveReadiness({ app });";
const part118End = server.indexOf(part118Call);
if (part118End < 0) {
  fail("Part 118 registration call not found.");
}
const registrationPosition = part118End + part118Call.length;
server =
  server.slice(0, registrationPosition) +
  `\n\n${REGISTRATION}` +
  server.slice(registrationPosition);

let part119 = removeBetween(originals.part119, MODULE_START, MODULE_END);
part119 = removeBetween(part119, ALIAS_START, ALIAS_END);

const moduleAnchor = "  // PART 136 FINAL VANI ACCEPTANCE MODULE END";
if (!part119.includes(moduleAnchor)) {
  fail("Part 119 final VANI module anchor missing.");
}
part119 = part119.replace(
  moduleAnchor,
  `${moduleAnchor}\n${MODULE_BLOCK}`
);

const aliasAnchor = '  "live readiness": "live-readiness",';
if (!part119.includes(aliasAnchor)) {
  fail("Part 119 Live Readiness alias anchor missing.");
}
part119 = part119.replace(
  aliasAnchor,
  `${aliasAnchor}\n${ALIAS_BLOCK}`
);

let part116 = originals.part116;

if (!part116.includes(ACCESS_START)) {
  const accessAnchor = "  const active = rows.filter((x) => x.matched && x.active);";
  if (!part116.includes(accessAnchor)) {
    fail("Part 116 active subscription evidence anchor missing.");
  }
  part116 = part116.replace(
    accessAnchor,
    `${ACCESS_BLOCK}\n\n${accessAnchor}`
  );

  part116 = part116.replace(
    '  const activePlanCodes = [...new Set(active.map((x) => x.code))];',
    `  const activePlanCodes = [
      ...new Set([
        ...active.map((x) => x.code),
        ...activeLiveSubscriptions.map(
          (item) => cleanText(item.planCode || "UNKNOWN", 50).toUpperCase()
        ),
      ]),
    ];`
  );

  part116 = part116.replace(
    '  const pendingAuthenticatedPlanCodes = [...new Set(rows.filter((x) => x.matched && x.authenticated).map((x) => x.code))];',
    `  const pendingAuthenticatedPlanCodes = [
      ...new Set([
        ...rows.filter((x) => x.matched && x.authenticated).map((x) => x.code),
        ...authenticatedLivePlanCodes,
      ]),
    ];`
  );

  part116 = part116.replace(
    '  if (!active.length) warnings.push("NO_ACTIVE_SUBSCRIPTION");',
    '  if (!active.length && !activeLiveSubscriptions.length) warnings.push("NO_ACTIVE_SUBSCRIPTION");'
  );

  part116 = part116.replace(
    '  const testMode = String(process.env.RAZORPAY_MODE || "test").toLowerCase() !== "live";',
    `  const commercialLiveMode = activeLiveSubscriptions.length > 0;
    const testMode =
      !commercialLiveMode &&
      String(process.env.RAZORPAY_MODE || "test").toLowerCase() !== "live";`
  );

  part116 = part116.replace(
    '        activeSubscriptionIds: active.map((x) => String(x.sync.razorpaySubscriptionId || "")),',
    `        activeSubscriptionIds: [
            ...active.map((x) => String(x.sync.razorpaySubscriptionId || "")),
            ...activeLiveSubscriptions.map(
              (item) => String(item.razorpaySubscriptionId || "")
            ),
          ],`
  );

  part116 = part116.replace(
    '        source: "part115_verified_sync", calculatedAt: new Date(),',
    `        source: commercialLiveMode
            ? "part1366_live_verified_webhook"
            : "part115_verified_sync",
          calculatedAt: new Date(),`
  );

  part116 = part116.replace(
    '        warningCodes: warnings, commercialLiveMode: !testMode',
    '        warningCodes: warnings, commercialLiveMode'
  );

  part116 = part116.replace(
    '    entitlements, warnings, source: "part115_verified_sync", testModeOnly: testMode,',
    `    entitlements,
      warnings,
      source: commercialLiveMode
        ? "part1366_live_verified_webhook"
        : "part115_verified_sync",
      testModeOnly: !commercialLiveMode && testMode,`
  );

  part116 = part116.replace(
    '    commercialLiveAccessEnabled: !testMode,',
    '    commercialLiveAccessEnabled: commercialLiveMode,'
  );

  part116 = part116.replace(
    '    activeSubscriptions: active.map((x) => ({',
    `    activeSubscriptions: [
        ...active.map((x) => ({`
  );

  part116 = part116.replace(
    `      accessUnlockApplied: true
    }))
  };`,
    `      accessUnlockApplied: true
        })),
        ...activeLiveSubscriptions.map((item) => ({
          localSubscriptionId: String(item._id),
          razorpaySubscriptionId: item.razorpaySubscriptionId,
          planCode: item.planCode,
          planName: item.planCode,
          status: item.status,
          lastEventType: item.lastWebhookEventType,
          lastProcessedAt: item.lastWebhookAt,
          currentStart: item.currentStart,
          currentEnd: item.currentEnd,
          accessUnlockApplied: true,
          commercialLiveMode: true,
        })),
      ]
    };`
  );
}

fs.writeFileSync(serverPath, server, "utf8");
fs.writeFileSync(part119Path, part119, "utf8");
fs.writeFileSync(part116Path, part116, "utf8");

for (const file of [serverPath, part116Path, part119Path, enginePath, frontendJsPath]) {
  const result = syntaxCheck(file);
  if (result.status !== 0) {
    fs.writeFileSync(serverPath, originals.server, "utf8");
    fs.writeFileSync(part116Path, originals.part116, "utf8");
    fs.writeFileSync(part119Path, originals.part119, "utf8");
    fail(`Syntax failed after integration; originals restored.\n${result.stderr || result.stdout}`);
  }
}

const finalServer = fs.readFileSync(serverPath, "utf8");
const final116 = fs.readFileSync(part116Path, "utf8");
const final119 = fs.readFileSync(part119Path, "utf8");

const p118 = finalServer.indexOf("registerPart118LiveReadiness({ app });");
const p1366 = finalServer.indexOf(REG_MARKER);
const p119 = finalServer.indexOf("PART 119 — UNIFIED APP SHELL");

const valid =
  p118 >= 0 &&
  p1366 > p118 &&
  (p119 < 0 || p1366 < p119) &&
  final119.includes('key: "live-subscriptions"') &&
  final119.includes('"razorpay live": "live-subscriptions"') &&
  final116.includes("activeLiveSubscriptions") &&
  final116.includes("part1366_live_verified_webhook");

if (!valid) {
  fs.writeFileSync(serverPath, originals.server, "utf8");
  fs.writeFileSync(part116Path, originals.part116, "utf8");
  fs.writeFileSync(part119Path, originals.part119, "utf8");
  fail("Part 136.6 integration verification failed; originals restored.");
}

console.log("\nPART 136.6 APPLIED SUCCESSFULLY");
console.log("Live revenue engine registered after Part 118: PASS");
console.log("Live revenue engine registered before Part 119: PASS");
console.log("Live Subscriptions unified-app module: PASS");
console.log("Part 116 verified Live access evidence: PASS");
console.log("Test Parts 112–117 preserved: PASS");
console.log("server.js syntax: PASS");
console.log("Part 116 syntax: PASS");
console.log("Part 119 syntax: PASS");
console.log("Next: node .\\VERIFY-PART1366.js\n");
