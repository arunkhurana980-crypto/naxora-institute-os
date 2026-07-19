# Deployment Steps — Part 133

```powershell
node .\VERIFY-PART132.js
node --check .\backend\src\server.js
node .\APPLY-PART133.js
node .\VERIFY-PART133.js
git status
git add .
git commit -m "Add Part 133 VANI Communication and Notifications"
git push
```

Render: **Manual Deploy → Clear build cache & deploy**.

After deployment:
- `/api/part133/status`
- `/communication-vani`
- `/app`
