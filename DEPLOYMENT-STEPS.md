# Deployment Steps — Part 114

## Local
Run one command at a time:

```powershell
node --check .\backend\src\server.js
node .\APPLY-PART114.js
node .\VERIFY-PART114.js
git status
git add .
git commit -m "Add Part 114 Customer Checkout and Subscription Activation"
git push
```

## Render
Keep existing build:

```bash
cd backend && npm install --no-audit --no-fund --legacy-peer-deps
```

Keep existing start:

```bash
cd backend && node src/server.js
```

Keep Test Mode environment variables from Part 112.

Render → Manual Deploy → Clear build cache & deploy.

## Smoke-test order
1. `/api/part112/status`
2. `/api/part113/status`
3. `/api/part114/status`
4. `/subscription-checkout`
5. Load a confirmed Part 113 Test Plan.
6. Create preview.
7. Create Test Subscription.
8. Open Test Checkout.
9. Complete test authorisation.
10. Verify server response.

Do not switch to Live Mode.
