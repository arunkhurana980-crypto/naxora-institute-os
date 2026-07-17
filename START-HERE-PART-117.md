# START HERE — Part 117

## Exact name
**Part 117 — VANI Subscription Manager**

## What it does
Owner can:
- read Subscription status,
- create pause/resume/cancel/plan-change previews,
- review access impact,
- enter exact confirmation,
- complete private owner verification,
- execute Razorpay Test Mode actions,
- wait for Part 115 verified webhook,
- recalculate Part 116 access.

## Before installing
These routes must work:
- `/api/part112/status`
- `/api/part113/status`
- `/api/part114/status`
- `/api/part115/status`
- `/api/part116/status`

GitHub/local project must contain the Part 116 backend module and server registration.

## Install
Extract ZIP and copy all files into the live project root.

Run one command at a time:

```powershell
node --check .\backend\src\server.js
node .\APPLY-PART117.js
node .\VERIFY-PART117.js
```

Expected:
- Part 117 applied successfully.
- Parts 112–117 before 404 handler PASS.
- server.js syntax PASS.

## Git

```powershell
git status
git add .
git commit -m "Add Part 117 VANI Subscription Manager"
git push
```

Render → Manual Deploy → Clear build cache & deploy.

## Render Environment
Add a separate private owner-verification value:

```env
NAXORA_OWNER_ACTION_SECRET=<long private random value>
```

Set it with the adult legal merchant account holder. Do not put it in GitHub, chat, screenshots or VANI.

## Test URLs
- `/api/part117/status`
- `/api/part117/security-policy`
- `/api/part117/demo`
- `/vani-subscription-manager`

## Boundary
Part 117 executes only Razorpay Test Mode actions. Live subscription management remains locked until Part 118.
