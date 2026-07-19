# Rollback Steps — Part 129

```powershell
node .\ROLLBACK-PART129.js
node --check .\backend\src\server.js
```

Code rollback removes the Part 129 server registration, unified-app module, aliases, bridge and progress label.

It does not delete successful Part 129 imported records. Back up and review data before code rollback.
