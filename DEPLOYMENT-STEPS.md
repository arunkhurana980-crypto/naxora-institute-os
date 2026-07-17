# Deployment Steps — Part 112

## Local
After copying files into the live project root:

```bash
node APPLY-PART112.js
node --check backend/src/server.js
git status
git add .
git commit -m "Add Part 112 Razorpay Test Mode Foundation"
git push
```

## Render build
Keep existing build command:

```bash
cd backend && npm install --no-audit --no-fund --legacy-peer-deps
```

## Render start
Keep existing start command:

```bash
cd backend && node src/server.js
```

## Render Environment
Add private values inside Render only:

```env
RAZORPAY_MODE=test
RAZORPAY_KEY_ID=<test key id>
RAZORPAY_KEY_SECRET=<test key secret>
RAZORPAY_WEBHOOK_SECRET=<private random secret>
NAXORA_PUBLIC_BASE_URL=https://naxora-institute-os.onrender.com
```

## Deploy
Render → Manual Deploy → Clear build cache & deploy.

## Smoke test order
1. `/api/part112/status`
2. `/api/part112/security-policy`
3. `/razorpay-test-mode-foundation`
4. Owner readiness
5. Test connection
6. Setup preview
7. Exact Test Mode confirmation

Do not switch to Live Mode in Part 112.
