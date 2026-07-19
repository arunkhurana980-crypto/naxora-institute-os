# Deployment Steps — Part 129

```powershell
node .\VERIFY-PART128.js
node --check .\backend\src\server.js
node .\APPLY-PART129.js
node .\VERIFY-PART129.js
git status
git add .
git commit -m "Add Part 129 VANI Bulk CSV and JSON Import"
git push
```

Render:

```text
Manual Deploy
→ Clear build cache & deploy
```

After deploy:

- `/api/part129/status`
- `/bulk-import-vani`
- `/app`
