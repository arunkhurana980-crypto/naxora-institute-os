# Deployment Steps — Part 131

```powershell
node .\VERIFY-PART130.js
node --check .\backend\src\server.js
node .\APPLY-PART131.js
node .\VERIFY-PART131.js
git status
git add .
git commit -m "Add Part 131 VANI Fees and Finance Operations"
git push
```

Render:

```text
Manual Deploy
→ Clear build cache & deploy
```

After deployment:

- `/api/part131/status`
- `/finance-vani`
- `/app`
