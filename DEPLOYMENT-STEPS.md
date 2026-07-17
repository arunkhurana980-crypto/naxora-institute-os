# Deployment Steps — Part 125

First verify corrected Part 124:

```powershell
node .\VERIFY-PART124.js
```

Then:

```powershell
node --check .\backend\src\server.js
node .\APPLY-PART125.js
node .\VERIFY-PART125.js
git status
git add .
git commit -m "Add Part 125 Global VANI Multi Step Actions"
git push
```

Render build/start commands stay unchanged.

```text
Manual Deploy
→ Clear build cache & deploy
```

## Smoke tests
1. `/api/part125/status`
2. `/api/part125/catalog`
3. Login through `/login`.
4. Open `/app`.
5. Open Global VANI Actions.
6. Create an allowed preview.
7. Enter a wrong confirmation.
8. Enter exact confirmation.
9. Execute.
10. Confirm `executed_pending_adapter` until Part 126 is installed.
