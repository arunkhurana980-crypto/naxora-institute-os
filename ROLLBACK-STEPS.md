# Rollback Steps — Part 119

```powershell
node .\ROLLBACK-PART119.js
node --check .\backend\src\server.js
```

Then optionally remove Part 119 backend/frontend files.

After commit:

```powershell
git revert <part-119-commit-sha>
git push
```

Deploy the reverted commit. Existing legacy module routes remain unchanged.
