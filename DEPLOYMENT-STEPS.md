# Deployment Steps — Part 121

```powershell
node --check .\backend\src\server.js
node .\APPLY-PART121.js
node .\VERIFY-PART121.js
git status
git add .
git commit -m "Add Part 121 Owner Module Consolidation"
git push
```

Render build and start commands remain unchanged.

Render → Manual Deploy → Clear build cache & deploy.

## Smoke tests
1. `/api/part121/status`
2. Login through `/login` as Owner.
3. Open `/app`.
4. Open Owner Workspace.
5. Confirm plan/account/billing summaries.
6. Open Account Access.
7. Open Fees and Subscription modules.
8. Try a Business/V3 module without entitlement.
9. Ask VANI for owner summary.
10. Ask VANI to open Account Access.
