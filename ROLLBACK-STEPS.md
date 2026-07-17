# Rollback Steps — Part 126

```powershell
node .\ROLLBACK-PART126.js
node --check .\backend\src\server.js
```

Rollback removes route/shell integration. Existing native records, notifications, delivery attempts and audits are not deleted.
