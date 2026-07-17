# START HERE — Part 118

## Exact name
**Part 118 — Razorpay Live Readiness and Controlled Launch**

## Important
Part 118 does not secretly enable real money. It creates:
- adult merchant readiness checklist,
- website/policy checks,
- Live credential checks,
- read-only provider probe,
- exact owner approval,
- manual launch instructions,
- rollback approval.

KYC identity and bank documents must stay in Razorpay Dashboard. Do not upload them to NAXORA.

## Before installing
Parts 112–117 must be present and registered before the Express 404 handler.

## Install

```powershell
node --check .\backend\src\server.js
node .\APPLY-PART118.js
node .\VERIFY-PART118.js
```

## Git

```powershell
git status
git add .
git commit -m "Add Part 118 Razorpay Live Readiness and Controlled Launch"
git push
```

Render → Manual Deploy → Clear build cache & deploy.

## Test URLs
- `/api/part118/status`
- `/api/part118/requirements`
- `/api/part118/security-policy`
- `/razorpay-live-readiness`

## Honest boundary
Part 118 approves a supervised manual launch. It does not edit Render environment automatically. Keep `NAXORA_RAZORPAY_LIVE_LAUNCHED=false` until the adult legal merchant owner completes Razorpay account/website approval and all blocking checks pass.
