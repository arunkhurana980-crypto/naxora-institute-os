# START HERE — Part 114

## Exact name
**Part 114 — Customer Checkout and Subscription Activation (Test Mode)**

## Before installing
Part 112 and Part 113 routes must work after the route-order hotfix.

Open these first:
- `/api/part112/status`
- `/api/part113/status`
- `/api/part113/templates`

They must return Part JSON, not `ROUTE_NOT_FOUND`.

You also need at least one Part 113 plan with:
- status `provider_created`
- Razorpay Plan ID beginning with `plan_`

## Install
Extract ZIP and copy all files into the project root.

Run one command at a time:

```powershell
node --check .\backend\src\server.js
node .\APPLY-PART114.js
node .\VERIFY-PART114.js
```

Expected:
- Part 114 applied successfully.
- Part 112 before 404 handler PASS.
- Part 113 before 404 handler PASS.
- Part 114 before 404 handler PASS.
- server.js syntax PASS.

## Git

```powershell
git status
git add .
git commit -m "Add Part 114 Customer Checkout and Subscription Activation"
git push
```

Render → Manual Deploy → Clear build cache & deploy.

## Test URLs
- `/api/part114/status`
- `/api/part114/security-policy`
- `/api/part114/demo`
- `/subscription-checkout`

## Part boundary
Part 114 creates a Razorpay **Test Subscription**, opens Razorpay Standard Checkout, verifies the returned signature on the server and records provider status.

It does not:
- enable Live Mode,
- unlock paid features,
- treat browser success alone as authoritative,
- process recurring webhook events,
- allow refunds/cancellation.

Part 115 adds authoritative webhook status sync. Part 116 connects active subscription status to feature access.
