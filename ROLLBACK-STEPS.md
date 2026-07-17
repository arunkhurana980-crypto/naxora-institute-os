# Rollback Steps — Part 122

```powershell
node .\ROLLBACK-PART122.js
node --check .\backend\src\server.js
```

Rollback:
- removes Part 122 registration,
- changes Part 119 Teacher route back to `/teacher-app`,
- restores the old Teacher App label/description,
- removes the Part 119 Teacher Workspace VANI alias.

Part 122 audit records are not deleted.
