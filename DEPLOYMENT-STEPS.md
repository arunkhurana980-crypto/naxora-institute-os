# Deployment

```powershell
node .\VERIFY-PART127.js
node .\APPLY-PART128.js
node .\VERIFY-PART128.js
git status
git add .
git commit -m "Add Part 128 VANI Master Data Actions"
git push
```

Render: Clear build cache & deploy.

URLs: `/app`, `/master-data-vani`, `/api/part128/status`.
