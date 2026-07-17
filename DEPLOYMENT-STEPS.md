# Deployment Steps — Part 118

## Local

```powershell
node --check .\backend\src\server.js
node .\APPLY-PART118.js
node .\VERIFY-PART118.js
git status
git add .
git commit -m "Add Part 118 Razorpay Live Readiness and Controlled Launch"
git push
```

## Render
Keep existing build/start commands.

Add private variables from `.env.part118.example`, but keep:

```env
RAZORPAY_MODE=test
NAXORA_RAZORPAY_LIVE_LAUNCHED=false
```

until all readiness checks and adult merchant approval are complete.

Render → Manual Deploy → Clear build cache & deploy.

## Smoke tests
1. `/api/part118/status`
2. `/razorpay-live-readiness`
3. Save non-sensitive evidence.
4. Confirm pending checks.
5. Configure Live keys privately.
6. Run read-only provider probe.
7. Create launch preview.
8. Test wrong confirmation and wrong owner secret.
9. Approve launch.
10. Review manual switch and rollback plan.
