# Rollback

```powershell
node .\ROLLBACK-PART135.js
node --check .\backend\src\server.js
```

Rollback removes integration code but does not undo completed Parts 130–134 actions, delete conversations, or automatically cancel native previews.
