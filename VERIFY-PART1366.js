import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const files = [
  "backend/src/part1366-live-subscription-revenue.js",
  "backend/.env.part1366.example",
  "frontend/naxora-live-subscriptions.html",
  "frontend/naxora-live-subscriptions.css",
  "frontend/naxora-live-subscriptions.js",
  "backend/src/part116-subscription-access-control.js",
  "backend/src/part119-unified-app-shell.js",
  "backend/src/server.js",
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
    const result = spawnSync(process.execPath, ["--check", file], {
      encoding: "utf8",
    });
    check(result.status === 0, `${rel} syntax`);
    if (result.status !== 0) {
      console.error(result.stderr || result.stdout);
    }
  }
}

if (!failed) {
  const engine = fs.readFileSync(
    path.join(root, "backend/src/part1366-live-subscription-revenue.js"),
    "utf8"
  );
  const server = fs.readFileSync(
    path.join(root, "backend/src/server.js"),
    "utf8"
  );
  const part116 = fs.readFileSync(
    path.join(root, "backend/src/part116-subscription-access-control.js"),
    "utf8"
  );
  const part119 = fs.readFileSync(
    path.join(root, "backend/src/part119-unified-app-shell.js"),
    "utf8"
  );
  const frontend = fs.readFileSync(
    path.join(root, "frontend/naxora-live-subscriptions.js"),
    "utf8"
  );

  const checks = [
    [server.includes("PART 136.6 — LIVE SUBSCRIPTION REVENUE BRIDGE"), "Server Part 136.6 registration"],
    [server.includes("registerPart1366LiveSubscriptionRevenue({ app });"), "Live revenue engine loaded"],
    [engine.includes("RAZORPAY_LIVE_KEY_ID"), "Live Key ID environment"],
    [engine.includes("RAZORPAY_LIVE_KEY_SECRET"), "Live Key Secret environment"],
    [engine.includes("RAZORPAY_LIVE_WEBHOOK_SECRET"), "Separate Live webhook secret"],
    [engine.includes("NAXORA_ADULT_MERCHANT_APPROVED"), "Adult merchant gate"],
    [engine.includes("NAXORA_SETTLEMENT_BANK_CONFIRMED"), "Settlement bank gate"],
    [engine.includes("NAXORA_RAZORPAY_LIVE_LAUNCHED"), "Controlled launch flag"],
    [engine.includes("/api/part1366/subscription/create"), "Live Subscription create API"],
    [engine.includes("/api/part1366/subscription/verify"), "Server checkout signature API"],
    [engine.includes("/api/part1366/webhooks/razorpay-live"), "Separate Live webhook endpoint"],
    [engine.includes("`${paymentId}|${record.razorpaySubscriptionId}`"), "Stored Subscription signature input"],
    [engine.includes("req.rawBody"), "Raw webhook body verification"],
    [engine.includes("Part1366LiveWebhookEvent"), "Webhook event idempotency model"],
    [engine.includes("EXISTING_SUBSCRIPTION_BLOCKS_NEW_BILLING"), "Duplicate commercial billing blocker"],
    [engine.includes("refundsFromNaxoraBlocked: true"), "Refund automation blocked"],
    [engine.includes("manualMoneyTransferFromNaxoraBlocked: true"), "Manual transfer blocked"],
    [engine.includes("status: ACTIVE_STATUS"), "Only active status unlocks"],
    [part116.includes("activeLiveSubscriptions"), "Part 116 reads Live evidence"],
    [part116.includes("part1366_live_verified_webhook"), "Part 116 Live source"],
    [part119.includes('key: "live-subscriptions"'), "Unified Live Subscriptions module"],
    [part119.includes('"razorpay live": "live-subscriptions"'), "VANI navigation alias"],
    [frontend.includes("new Razorpay(options)"), "Razorpay Checkout frontend"],
    [frontend.includes("/api/part1366/subscription/verify"), "Frontend server verification"],
  ];

  for (const [ok, label] of checks) check(ok, label);
}

process.exit(failed ? 1 : 0);
