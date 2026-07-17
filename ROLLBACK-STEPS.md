# Rollback Steps — Part 116

```powershell
node .\ROLLBACK-PART116.js
node --check .\backend\src\server.js
```

Then optionally remove Part 116 files.

After commit:

```powershell
git revert <part-116-commit-sha>
git push
```

Rollback does not cancel Razorpay Plans or Subscriptions and does not delete Part 115 webhook history.
