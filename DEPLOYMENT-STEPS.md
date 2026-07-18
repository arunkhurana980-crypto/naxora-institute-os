# Deployment Steps — Part 136

```powershell
node .\VERIFY-PART135.js
node --check .\backend\src\server.js
node .\APPLY-PART136.js
node .\VERIFY-PART136.js
git status
git add .
git commit -m "Add Part 136 Final All Role VANI Acceptance"
git push
```

Render:

```text
Manual Deploy
→ Clear build cache & deploy
```

After deployment:

- `/api/part136/status`
- `/api/part136/acceptance-matrix`
- `/vani-acceptance`
- `/app`
