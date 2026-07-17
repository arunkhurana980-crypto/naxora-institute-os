# Rollback Steps — Part 121

```powershell
node .\ROLLBACK-PART121.js
node --check .\backend\src\server.js
```

Rollback:
- removes Part 121 registration,
- changes Part 119 owner route back to `/institute-owner-app`,
- removes Account Access from Part 119 module catalogue,
- removes the Part 119 VANI account-manager alias.

Part 121 audit records are not deleted.
