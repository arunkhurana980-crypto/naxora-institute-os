# START HERE — Part 128

**Part 128 — VANI Master Data Actions**

Adds 14 Owner-only master-data actions for Branch, Course, Batch/Class, Teacher, Student, Parent linking and Staff scopes.

```powershell
node .\VERIFY-PART127.js
node --check .\backend\src\server.js
node .\APPLY-PART128.js
node .\VERIFY-PART128.js
```

Then:

```powershell
git status
git add .
git commit -m "Add Part 128 VANI Master Data Actions"
git push
```
