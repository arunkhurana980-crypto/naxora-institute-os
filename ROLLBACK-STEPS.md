# Rollback Steps — Part 115

Run:

```powershell
node .\ROLLBACK-PART115.js
node --check .\backend\src\server.js
```

Then optionally remove Part 115 backend/frontend files.

After commit:

```powershell
git revert <part-115-commit-sha>
git push
```

Deploy the reverted commit.

Also disable or delete the Test webhook in Razorpay Dashboard if the endpoint is rolled back. Existing MongoDB event ledgers remain historical records unless manually removed through a separately verified data-maintenance process.
