# Deployment Steps — Part 116

```powershell
node --check .\backend\src\server.js
node .\APPLY-PART116.js
node .\VERIFY-PART116.js
git status
git add .
git commit -m "Add Part 116 Subscription Feature Access Control"
git push
```

Render build remains:

```bash
cd backend && npm install --no-audit --no-fund --legacy-peer-deps
```

Render start remains:

```bash
cd backend && node src/server.js
```

Render → Manual Deploy → Clear build cache & deploy.

## Smoke tests
1. `/api/part116/status`
2. `/api/part116/catalog`
3. `/subscription-access-control`
4. Load access as owner.
5. Compare teacher/student/parent navigation.
6. Check Starter, Business and V3 features.
7. Confirm direct gated API denies unauthorized role/plan.
8. Recalculate after Part 115 status changes.
