# Rollback Steps — Part 114

Run:

```powershell
node .\ROLLBACK-PART114.js
node --check .\backend\src\server.js
```

Then optionally remove the new Part 114 backend/frontend files.

After commit:

```powershell
git revert <part-114-commit-sha>
git push
```

Render the reverted commit.

Razorpay Test Subscriptions already created at the provider remain Test Dashboard records. App rollback does not claim to delete them.
