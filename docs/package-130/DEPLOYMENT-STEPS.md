# Deployment Steps — Part 130

```powershell
node .\VERIFY-PART129.js
node --check .\backend\src\server.js
node .\APPLY-PART130.js
node .\VERIFY-PART130.js
git status
git add .
git commit -m "Add Part 130 VANI Academic Operations"
git push
```

Render: **Manual Deploy → Clear build cache & deploy**.

After deploy:

- `/api/part130/status`
- `/academic-vani`
- `/app`
