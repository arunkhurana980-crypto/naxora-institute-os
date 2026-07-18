# Deploy Part 134

```powershell
node .\VERIFY-PART133.js
node --check .\backend\src\server.js
node .\APPLY-PART134.js
node .\VERIFY-PART134.js
git status
git add .
git commit -m "Add Part 134 VANI Reports and Exports"
git push
```

Render:
```text
Manual Deploy
→ Clear build cache & deploy
```

Links:
- `/app`
- `/reports-vani`
- `/api/part134/status`
