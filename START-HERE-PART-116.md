# START HERE — Part 116

## Exact name
**Part 116 — Subscription Feature Access Control**

## What it does
Part 116 uses verified Part 115 subscription sync states to decide:
- base plan access,
- separate V3 AI access,
- logged-in role permission,
- allowed navigation,
- backend API access.

Only Razorpay status `active` unlocks paid features. `authenticated` means customer authorisation completed, but paid access waits until the provider state becomes `active`.

## Before installing
These routes must work:
- `/api/part112/status`
- `/api/part113/status`
- `/api/part114/status`
- `/api/part115/status`

## Install
Extract ZIP and copy all files into the live project root.

Run one command at a time:

```powershell
node --check .\backend\src\server.js
node .\APPLY-PART116.js
node .\VERIFY-PART116.js
```

Expected:
- Part 116 applied successfully.
- Parts 112–116 before 404 handler PASS.
- server.js syntax PASS.

## Git

```powershell
git status
git add .
git commit -m "Add Part 116 Subscription Feature Access Control"
git push
```

Render → Manual Deploy → Clear build cache & deploy.

## Test URLs
- `/api/part116/status`
- `/api/part116/catalog`
- `/api/part116/security-policy`
- `/subscription-access-control`

## Boundary
Part 116 provides the central access engine, backend gate and reusable frontend client. Existing Parts 52–110 will be wired into this engine during the unified app merge in Parts 119–127.
