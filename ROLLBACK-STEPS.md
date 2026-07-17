# Rollback Steps — Part 120

```powershell
node .\ROLLBACK-PART120.js
node --check .\backend\src\server.js
```

This removes Part 120 route registration and the Part 119 common-session script.

It does not delete existing `Part120UnifiedIdentity` or auth audit records. Existing old role logins remain available.

After commit:

```powershell
git revert <part-120-commit-sha>
git push
```
