# Rollback Steps — Part 125

```powershell
node .\ROLLBACK-PART125.js
node --check .\backend\src\server.js
```

Rollback removes:
- Part 125 registration.
- Global VANI Actions shell module.
- Part 125 aliases.
- Part 119 VANI bridge.

It does not delete canonical action, outbox or audit records.
