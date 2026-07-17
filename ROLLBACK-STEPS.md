# Rollback Steps — Part 124

```powershell
node .\ROLLBACK-PART124.js
node --check .\backend\src\server.js
```

Rollback:
- removes Part 124 route registration,
- restores Part 119 Parent route to `/parent-app`,
- removes Role Scope Manager,
- removes Branch/Accountant/Counsellor/Staff workspace modules,
- removes Part 124 VANI aliases.

Scope assignments and audit records are not deleted automatically.
