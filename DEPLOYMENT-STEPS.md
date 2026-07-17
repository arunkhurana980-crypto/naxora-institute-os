# Deployment Steps — Part 113

## Local commands
Run one command at a time. Terminal prompt must start with `PS ...>` and not `>>`.

```powershell
node --check .\backend\src\server.js
node .\APPLY-PART113.js
node .\VERIFY-PART113.js
git status
git add .
git commit -m "Add Part 113 NAXORA Subscription Plans"
git push
```

## Render
Build command remains:

```bash
cd backend && npm install --no-audit --no-fund --legacy-peer-deps
```

Start command remains:

```bash
cd backend && node src/server.js
```

Use the Part 112 Test environment variables. Do not add Live keys.

Render → Manual Deploy → Clear build cache & deploy.

## Smoke tests
1. Status API.
2. Templates API.
3. Owner readiness.
4. Create a low-value Test Plan preview after deciding a test price.
5. Confirm exact text.
6. Verify Plan ID starts with `plan_`.
7. Verify no payment/customer subscription was created.
