# Deployment Steps — Part 119

## Local

```powershell
node --check .\backend\src\server.js
node .\APPLY-PART119.js
node .\VERIFY-PART119.js
git status
git add .
git commit -m "Add Part 119 Unified Single App Shell"
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

Render → Manual Deploy → Clear build cache & deploy.

## Smoke test
1. Open `/api/part119/status`.
2. Open `/app`.
3. Sign in through an existing role page.
4. Return to `/app`.
5. Press Connect Existing Login.
6. Confirm role navigation.
7. Open at least three allowed modules.
8. Try a denied module through VANI.
9. Test mobile layout.
