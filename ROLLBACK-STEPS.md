# Rollback Steps — Part 113

Run:

```powershell
node .\ROLLBACK-PART113.js
node --check .\backend\src\server.js
```

Then remove Part 113 new files if required.

After commit, preferred rollback:

```powershell
git revert <part-113-commit-sha>
git push
```

Deploy the reverted commit through Render.

Razorpay provider Plans already created cannot be removed by this code. Rollback removes NAXORA Part 113 app integration only.
