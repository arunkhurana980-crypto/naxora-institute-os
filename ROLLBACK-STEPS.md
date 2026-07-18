# Part 133 Rollback

```powershell
node .\ROLLBACK-PART133.js
node --check .\backend\src\server.js
```

Rollback removes code registration, module, aliases, bridge and progress text. It does not delete MongoDB communication records or pending schedule records.
