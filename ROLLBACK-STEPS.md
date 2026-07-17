# Rollback Steps — Part 123

```powershell
node .\ROLLBACK-PART123.js
node --check .\backend\src\server.js
```

Rollback:
- removes Part 123 registration,
- changes Part 119 Student route back to `/student-app`,
- restores the old Student App label/description,
- removes the Student Workspace VANI alias.

Part 123 audit records are not deleted.
