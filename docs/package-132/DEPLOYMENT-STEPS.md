# Deployment Steps — Part 132

```powershell
node .\VERIFY-PART131.js
node --check .\backend\src\server.js
node .\APPLY-PART132.js
node .\VERIFY-PART132.js
git status
git add .
git commit -m "Add Part 132 VANI Admissions and CRM Operations"
git push
```

Render:

```text
Manual Deploy
→ Clear build cache & deploy
```

After deployment:

- `/api/part132/status`
- `/crm-vani`
- `/app`
