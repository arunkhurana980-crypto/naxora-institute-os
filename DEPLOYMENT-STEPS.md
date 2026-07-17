# Deployment Steps — Part 126

```powershell
node .\VERIFY-PART125.js
node --check .\backend\src\server.js
node .\APPLY-PART126.js
node .\VERIFY-PART126.js
git status
git add .
git commit -m "Add Part 126 Native Adapters Notifications and Cross Module E2E"
git push
```

Render build/start commands stay unchanged.

Render → Manual Deploy → Clear build cache & deploy.
