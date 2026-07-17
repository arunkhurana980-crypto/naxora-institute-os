# Rollback Steps — Part 127

Code rollback:

```powershell
node .\ROLLBACK-PART127.js
node --check .\backend\src\server.js
```

This removes:
- Part 127 registration,
- Final Demo & Freeze module,
- Part 127 aliases,
- Part 127 unified-app text.

It does not automatically delete imported demo data.

To remove demo data safely before code rollback:
1. Open `/final-acceptance`.
2. Use Reset Demo Preview.
3. Exact-confirm with Owner Action Secret.
4. Confirm non-demo accounts are preserved.
