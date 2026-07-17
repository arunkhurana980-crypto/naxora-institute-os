# Deployment Steps — Part 117

## Local

```powershell
node --check .\backend\src\server.js
node .\APPLY-PART117.js
node .\VERIFY-PART117.js
git status
git add .
git commit -m "Add Part 117 VANI Subscription Manager"
git push
```

## Render
Build remains:

```bash
cd backend && npm install --no-audit --no-fund --legacy-peer-deps
```

Start remains:

```bash
cd backend && node src/server.js
```

Add privately:

```env
NAXORA_OWNER_ACTION_SECRET=<long private random value>
```

Keep:

```env
RAZORPAY_MODE=test
```

Render → Manual Deploy → Clear build cache & deploy.

## Smoke tests
1. `/api/part117/status`
2. `/vani-subscription-manager`
3. Load owner Subscriptions.
4. Preview a state-compatible Test action.
5. Try wrong confirmation.
6. Try wrong owner verification.
7. Execute correct Test action.
8. Check action history.
9. Check Part 115 webhook status.
10. Recalculate Part 116 access.
