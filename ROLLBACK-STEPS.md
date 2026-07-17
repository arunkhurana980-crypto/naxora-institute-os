# Rollback Steps — Part 117

```powershell
node .\ROLLBACK-PART117.js
node --check .\backend\src\server.js
```

Then optionally remove the Part 117 backend/frontend files.

After commit:

```powershell
git revert <part-117-commit-sha>
git push
```

Rollback removes the NAXORA manager route. It does not reverse provider actions already accepted. A cancelled Subscription cannot be restarted. Manage historical Test records in the Razorpay Test Dashboard.
