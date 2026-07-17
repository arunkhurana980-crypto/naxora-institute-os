# Deployment Steps — Part 124

```powershell
node --check .\backend\src\server.js
node .\APPLY-PART124.js
node .\VERIFY-PART124.js
git status
git add .
git commit -m "Add Part 124 Parent Staff and Branch Role Consolidation"
git push
```

Render build and start commands remain unchanged.

Render → Manual Deploy → Clear build cache & deploy.

## First setup
1. Login as Owner.
2. Open `/role-scope-manager`.
3. Assign child scope to Parent accounts.
4. Assign branch scope to Branch Managers.
5. Assign branch or explicit institute-wide scope to Accountant/Counsellor/Staff.
6. Login with each role and test `/app`.
