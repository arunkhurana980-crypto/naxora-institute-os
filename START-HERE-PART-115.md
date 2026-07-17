# START HERE — Part 115

## Exact name
**Part 115 — Secure Razorpay Webhooks and Subscription Status Sync**

## Before installing
Confirm Parts 112–114 routes work:
- `/api/part112/status`
- `/api/part113/status`
- `/api/part114/status`

They must not return `ROUTE_NOT_FOUND`.

Part 114 must be committed and its backend module must exist.

## Install
Extract ZIP and copy all files into the live project root.

Run one command at a time:

```powershell
node --check .\backend\src\server.js
node .\APPLY-PART115.js
node .\VERIFY-PART115.js
```

Expected:
- Part 115 applied successfully.
- Parts 112–115 before 404 handler PASS.
- server.js syntax PASS.

## Git

```powershell
git status
git add .
git commit -m "Add Part 115 Secure Razorpay Webhooks and Status Sync"
git push
```

Render → Manual Deploy → Clear build cache & deploy.

## Render Environment
Use the same separate webhook secret in two places only:
1. Render `RAZORPAY_WEBHOOK_SECRET`.
2. Razorpay Dashboard Test Mode webhook Secret field.

Do not use or reveal the API Key Secret as the webhook secret.

## Test URLs
- `/api/part115/status`
- `/api/part115/security-policy`
- `/api/part115/demo`
- `/webhook-monitor`

## Webhook URL

```text
https://naxora-institute-os.onrender.com/api/part115/webhooks/razorpay
```

The webhook endpoint is public for Razorpay server-to-server delivery, but every request must pass signature verification.
