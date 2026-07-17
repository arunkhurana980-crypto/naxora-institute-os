# Deployment Steps — Part 115

## Local

```powershell
node --check .\backend\src\server.js
node .\APPLY-PART115.js
node .\VERIFY-PART115.js
git status
git add .
git commit -m "Add Part 115 Secure Razorpay Webhooks and Status Sync"
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

Required private environment values:

```env
RAZORPAY_MODE=test
RAZORPAY_KEY_ID=<test key id>
RAZORPAY_KEY_SECRET=<test api key secret>
RAZORPAY_WEBHOOK_SECRET=<separate webhook secret>
NAXORA_PUBLIC_BASE_URL=https://naxora-institute-os.onrender.com
```

Render → Manual Deploy → Clear build cache & deploy.

## After deploy
1. Check `/api/part115/status`.
2. Open `/webhook-monitor` as owner.
3. Copy webhook URL.
4. Configure Razorpay Dashboard Test Mode webhook.
5. Select all Part 115 Subscription events.
6. Complete a Part 114 Test Subscription/charge scenario.
7. Check event ledger and sync states.
