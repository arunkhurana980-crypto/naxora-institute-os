# Deployment

```powershell
node .\VERIFY-PART134.js
node --check .\backend\src\server.js
node .\APPLY-PART135.js
node .\VERIFY-PART135.js
git status
git add .
git commit -m "Add Part 135 VANI Conversational Workflow Engine"
git push
```

Render: Manual Deploy → Clear build cache & deploy.

Test `/api/part135/status`, `/api/part135/native-catalog`, `/workflow-vani`, `/app`.
